import { db, admin } from '@/lib/firebaseAdmin';
import {
  solveHBLinks,
  solveHubCDN,
  solveHubDrive,
  solveHubCloudNative,
  solveGadgetsWebNative,
} from '@/lib/solvers';
// v3 FIX: TIMER_API config se import — NOT hardcoded IP
import {
  TIMER_API,
  TIMER_DOMAINS,
  LINK_TIMEOUT_MS,
  OVERALL_TIMEOUT_MS,
} from '@/lib/config';
import { getCachedLink, setCachedLink } from '@/lib/cache';
import { trackTaskProcessed } from '@/lib/analytics';

export const maxDuration = 60;

async function fetchJSON(url: string, timeoutMs = 20_000): Promise<any> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'MflixPro/3.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// FIX B: Sub-collection architecture (stream version)
// FIX TRAP 1: FieldValue.increment(1) atomic counter
// FIX TRAP 5: CONDITIONAL increment — deferred (pending) links NAHI ginenge
async function saveToFirestore(
  taskId: string | undefined,
  lid: number | string,
  linkData: any,
  result: {
    status?: string;
    finalLink?: string | null;
    error?: string | null;
    logs?: any[];
    best_button_name?: string | null;
    all_available_buttons?: any[];
  },
  extractedBy: string,
): Promise<void> {
  if (!taskId) return;

  try {
    // TIER 1: Sub-collection direct write — NO transaction, zero contention
    await db
      .collection('scraping_tasks').doc(taskId)
      .collection('results').doc(String(lid))
      .set({
        lid,
        linkUrl:               linkData.link,
        finalLink:             result.finalLink            ?? null,
        status:                result.status               ?? 'error',
        error:                 result.error                ?? null,
        logs:                  result.logs                 ?? [],
        best_button_name:      result.best_button_name     ?? null,
        all_available_buttons: result.all_available_buttons ?? [],
        extractedBy,
        solvedAt: new Date().toISOString(),
      });

    // TIER 2: Atomic counter + conditional completion check (TRAP 1 + TRAP 5 FIX)
    const taskRef = db.collection('scraping_tasks').doc(taskId);
    const effectiveStatus = result.status ?? 'error';

    // TRAP 5 FIX: sirf non-pending results increment karein
    if (effectiveStatus !== 'pending') {
      await taskRef.update({
        completedLinksCount: admin.firestore.FieldValue.increment(1),
      });
    }

    const masterSnap = await taskRef.get();
    if (!masterSnap.exists) return;

    const data         = masterSnap.data()!;
    const totalLinks   = (data.links ?? []).length;
    const completedCnt = data.completedLinksCount ?? 0;

    if (completedCnt >= totalLinks && totalLinks > 0) {
      const resultsSnap = await db
        .collection('scraping_tasks').doc(taskId)
        .collection('results').get();
      const allResults = resultsSnap.docs.map(d => d.data());
      const anySuccess = allResults.some(r => ['done', 'success'].includes(r.status ?? ''));
      await taskRef.update({
        status:      anySuccess ? 'completed' : 'failed',
        extractedBy,
        completedAt: new Date().toISOString(),
      });
    }
  } catch (e: any) {
    console.error('[Stream] DB save error:', e.message);
  }
}

// ─── POST /api/stream_solve ───────────────────────────────────────────────────
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const links: any[]   = body?.links || [];
  const taskId: string = body?.taskId;
  const extractedBy    = body?.extractedBy || 'Browser/Live';

  if (!links.length) {
    return new Response(JSON.stringify({ error: 'No links provided' }), { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder    = new TextEncoder();
      const overallStart = Date.now();

      const send = (data: any) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
        } catch { /* stream closed */ }
      };

      const processLink = async (linkData: any, lid: number | string): Promise<void> => {
        const originalUrl = linkData.link;
        let   currentLink = originalUrl;
        const logs: { msg: string; type: string }[] = [];

        const log = (msg: string, type = 'info') => {
          logs.push({ msg, type });
          send({ id: lid, msg, type });
        };

        // Phase 4: CACHE CHECK
        try {
          const cached = await getCachedLink(originalUrl);
          if (cached && cached.finalLink) {
            log('⚡ CACHE HIT — resolved in 0ms', 'success');
            await saveToFirestore(taskId, lid, linkData, {
              status: 'done', finalLink: cached.finalLink,
              best_button_name: cached.best_button_name,
              all_available_buttons: cached.all_available_buttons,
              logs: [{ msg: '⚡ CACHE HIT', type: 'success' }],
            }, extractedBy);
            send({ id: lid, status: 'done', finalLink: cached.finalLink, best_button_name: cached.best_button_name });
            send({ id: lid, status: 'finished' });
            return;
          }
        } catch { /* cache miss */ }

        let resultPayload: any;

        try {
          const solving = async () => {
            if (currentLink.includes('hubcdn.fans')) {
              log('⚡ HubCDN.fans detected — direct solve');
              const r = await solveHubCDN(currentLink);
              if (r.status === 'success') return { finalLink: r.final_link, status: 'done', logs };
              return { status: 'error', error: r.message, logs };
            }

            let loopCount = 0;
            while (loopCount < 3 && !([ 'hblinks','hubdrive','hubcdn','hubcloud','gdflix','drivehub' ].some(d => currentLink.includes(d)))) {
              if (!TIMER_DOMAINS.some(d => currentLink.includes(d)) && loopCount === 0) break;
              if (currentLink.includes('gadgetsweb')) {
                log(`🔁 GadgetsWeb native solve (loop ${loopCount + 1})`);
                const r = await solveGadgetsWebNative(currentLink);
                if (r.status === 'success') { currentLink = r.link; loopCount++; continue; }
                log(`❌ GadgetsWeb failed: ${r.message}`, 'error');
                break;
              } else {
                // v3 FIX: TIMER_API from config, suffix added here
                log(`⏱ Timer bypass via VPS (loop ${loopCount + 1})`);
                const r = await fetchJSON(`${TIMER_API}/solve?url=${encodeURIComponent(currentLink)}`, 20_000);
                if (r.status === 'success' && r.extracted_link) { currentLink = r.extracted_link; loopCount++; continue; }
                log('❌ Timer bypass failed', 'error');
                break;
              }
            }

            if (currentLink.includes('hblinks')) {
              log('🔗 HBLinks solving...');
              const r = await solveHBLinks(currentLink);
              if (r.status === 'success') currentLink = r.link;
              else return { status: 'error', error: r.message, logs };
            }

            if (currentLink.includes('hubdrive')) {
              log('💾 HubDrive solving...');
              const r = await solveHubDrive(currentLink);
              if (r.status === 'success') currentLink = r.link;
              else return { status: 'error', error: r.message, logs };
            }

            if (currentLink.includes('hubcloud') || currentLink.includes('hubcdn')) {
              log('☁️ HubCloud solving...');
              const r = await solveHubCloudNative(currentLink);
              if (r.status === 'success') {
                log(`✅ Done: ${r.best_download_link}`, 'success');
                return {
                  finalLink: r.best_download_link, status: 'done',
                  best_button_name: r.best_button_name ?? null,
                  all_available_buttons: r.all_available_buttons ?? [], logs,
                };
              }
              return { status: 'error', error: r.message, logs };
            }

            if (currentLink.includes('gdflix') || currentLink.includes('drivehub')) {
              log(`✅ Resolved: ${currentLink}`, 'success');
              return { finalLink: currentLink, status: 'done', logs };
            }

            log(`✅ Resolved: ${currentLink}`, 'success');
            return { finalLink: currentLink, status: 'done', logs };
          };

          resultPayload = await Promise.race([
            solving(),
            new Promise<any>((_, rej) =>
              setTimeout(() => rej(new Error(`Timeout ${LINK_TIMEOUT_MS / 1000}s`)), LINK_TIMEOUT_MS),
            ),
          ]);
        } catch (err: any) {
          resultPayload = { status: 'error', error: err.message, logs };
        }

        send({
          id: lid, status: resultPayload.status,
          final: resultPayload.finalLink,
          best_button_name: resultPayload.best_button_name,
        });

        try {
          await saveToFirestore(taskId, lid, linkData, resultPayload, extractedBy);
        } catch { /* non-fatal */ }

        if (resultPayload.status === 'done' && resultPayload.finalLink) {
          try {
            await setCachedLink(originalUrl, resultPayload.finalLink, 'stream_solve', {
              best_button_name: resultPayload.best_button_name,
              all_available_buttons: resultPayload.all_available_buttons,
            });
          } catch { /* non-critical */ }
        }

        send({ id: lid, status: 'finished' });
      };

      // Smart routing
      // v3 FIX: l.id use karo — links.indexOf(l) NAHI
      const timerLinks  = links.filter(l => TIMER_DOMAINS.some(d => (l.link || '').includes(d)));
      const directLinks = links.filter(l => !TIMER_DOMAINS.some(d => (l.link || '').includes(d)));

      const directPromises = directLinks.map((l: any) => processLink(l, l.id)); // FIX: l.id

      const timerPromise = (async () => {
        // INDEX-BASED loop — indexOf NAHI
        for (let i = 0; i < timerLinks.length; i++) {
          const l = timerLinks[i];
          if (Date.now() - overallStart > OVERALL_TIMEOUT_MS) break;
          await processLink(l, l.id); // FIX: l.id
        }
      })();

      await Promise.allSettled([...directPromises, timerPromise]);

      // Phase 4: Analytics
      const elapsedMs = Date.now() - overallStart;
      const doneCount = links.filter((l: any) => l.status === 'done' || l.status === 'success').length;
      try {
        await trackTaskProcessed({
          success: doneCount > 0, processingTimeMs: elapsedMs,
          linksTotal: links.length, linksDone: doneCount,
          linksFailed: links.length - doneCount, fromCache: false, solver: 'browser/stream',
        });
      } catch { /* analytics non-critical */ }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
