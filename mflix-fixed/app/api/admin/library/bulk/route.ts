import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// POST /api/admin/library/bulk — Bulk actions on tasks
// Body: { action: 'delete' | 'reprocess' | 'mark_completed' | 'mark_failed', taskIds: string[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, taskIds } = body;

    if (!action || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'action and taskIds required' }, { status: 400 });
    }

    const results: { id: string; ok: boolean; error?: string }[] = [];

    if (action === 'delete') {
      const batch = db.batch();
      for (const taskId of taskIds) {
        batch.delete(db.collection('scraping_tasks').doc(taskId));
      }
      await batch.commit();
      results.push(...taskIds.map(id => ({ id, ok: true })));

    } else if (action === 'mark_completed' || action === 'mark_failed') {
      const newStatus = action === 'mark_completed' ? 'completed' : 'failed';
      const batch = db.batch();
      for (const taskId of taskIds) {
        batch.update(db.collection('scraping_tasks').doc(taskId), {
          status:    newStatus,
          updatedAt: new Date().toISOString(),
        });
      }
      await batch.commit();
      results.push(...taskIds.map(id => ({ id, ok: true })));

    } else if (action === 'reprocess') {
      // Reset to pending so cron can re-pick
      const batch = db.batch();
      for (const taskId of taskIds) {
        batch.update(db.collection('scraping_tasks').doc(taskId), {
          status:              'pending',
          completedLinksCount: 0,
          error:               null,
          updatedAt:           new Date().toISOString(),
          links: db.collection('scraping_tasks').doc(taskId) as any, // links reset handled per-task below
        });
      }
      // Per-task: reset each link to pending
      for (const taskId of taskIds) {
        try {
          const snap = await db.collection('scraping_tasks').doc(taskId).get();
          if (snap.exists) {
            const links = (snap.data()!.links || []).map((l: any) => ({
              ...l,
              status:    'pending',
              finalLink: null,
              logs:      [{ msg: '🔄 Re-processing...', type: 'info' }],
            }));
            await db.collection('scraping_tasks').doc(taskId).update({
              status:              'pending',
              completedLinksCount: 0,
              links,
              error:               null,
              updatedAt:           new Date().toISOString(),
            });
            results.push({ id: taskId, ok: true });
          }
        } catch (e: any) {
          results.push({ id: taskId, ok: false, error: e.message });
        }
      }
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const succeeded = results.filter(r => r.ok).length;
    const failed    = results.filter(r => !r.ok).length;

    return NextResponse.json({
      ok: true,
      action,
      total:   taskIds.length,
      succeeded,
      failed,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
