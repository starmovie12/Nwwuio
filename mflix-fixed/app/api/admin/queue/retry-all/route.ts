import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// POST /api/admin/queue/retry-all — Retry all failed queue items
export async function POST() {
  try {
    const queueCollections = ['movies_queue', 'webseries_queue'];
    let retried = 0;

    for (const col of queueCollections) {
      const snap = await db.collection(col)
        .where('status', '==', 'failed')
        .get();

      const batch = db.batch();
      for (const doc of snap.docs) {
        batch.update(doc.ref, {
          status:    'pending',
          lockedAt:  null,
          retryCount: 0,
          error:     null,
          updatedAt: new Date().toISOString(),
        });
        retried++;
      }
      if (snap.docs.length > 0) await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      retried,
      message: `${retried} failed item(s) reset to pending`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
