/**
 * GET  /api/admin/queue — List queue items with filters
 * POST /api/admin/queue — Bulk actions (retry-all, delete-completed)
 *
 * Phase 5 Admin Panel
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    const collections = ['movies_queue', 'webseries_queue'];
    let allItems: Record<string, unknown>[] = [];

    // Count per status
    const counts: Record<string, number> = { pending: 0, processing: 0, completed: 0, failed: 0 };

    for (const col of collections) {
      const snap = await db.collection(col).orderBy('addedAt', 'desc').limit(500).get();
      for (const doc of snap.docs) {
        const d = doc.data();
        const itemStatus = d.status || 'pending';
        counts[itemStatus] = (counts[itemStatus] || 0) + 1;
        allItems.push({
          id: doc.id,
          collection: col,
          type: col === 'movies_queue' ? 'movie' : 'webseries',
          url: d.url,
          status: itemStatus,
          retryCount: d.retryCount || 0,
          addedAt: d.addedAt?.toDate?.()?.toISOString() || d.addedAt || null,
          lockedAt: d.lockedAt || null,
          processedAt: d.processedAt || null,
          taskId: d.taskId || null,
        });
      }
    }

    // Filter
    if (status !== 'all') {
      allItems = allItems.filter(item => item.status === status);
    }

    // Sort by addedAt desc
    allItems.sort((a, b) => {
      const ta = new Date(a.addedAt as string || 0).getTime();
      const tb = new Date(b.addedAt as string || 0).getTime();
      return tb - ta;
    });

    return NextResponse.json({
      items: allItems.slice(0, limit),
      total: allItems.length,
      counts,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'retry-all-failed') {
      const batch = db.batch();
      let count = 0;
      for (const col of ['movies_queue', 'webseries_queue']) {
        const snap = await db.collection(col).where('status', '==', 'failed').get();
        for (const doc of snap.docs) {
          batch.update(doc.ref, { status: 'pending', retryCount: 0, lockedAt: null });
          count++;
        }
      }
      await batch.commit();
      return NextResponse.json({ success: true, retried: count });
    }

    if (action === 'delete-completed') {
      let deleted = 0;
      for (const col of ['movies_queue', 'webseries_queue']) {
        const snap = await db.collection(col).where('status', '==', 'completed').get();
        const batch = db.batch();
        for (const doc of snap.docs) { batch.delete(doc.ref); deleted++; }
        if (deleted > 0) await batch.commit();
      }
      return NextResponse.json({ success: true, deleted });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
