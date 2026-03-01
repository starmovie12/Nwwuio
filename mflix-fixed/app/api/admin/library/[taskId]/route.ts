/**
 * GET    /api/admin/library/[taskId] — Get task details
 * DELETE /api/admin/library/[taskId] — Delete task + subcollection
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const doc = await db.collection('scraping_tasks').doc(params.taskId).get();
    if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ task: { id: doc.id, ...doc.data() } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const taskRef = db.collection('scraping_tasks').doc(params.taskId);

    // Delete subcollection results
    const resultsSnap = await taskRef.collection('results').get();
    const batch = db.batch();
    for (const r of resultsSnap.docs) batch.delete(r.ref);
    batch.delete(taskRef);
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

// PATCH /api/admin/library/[taskId] — Update task (status, links)
export async function PATCH(req: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const body = await req.json();
    const { status, links, title } = body;

    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (status !== undefined) updateData.status = status;
    if (links  !== undefined) updateData.links  = links;
    if (title  !== undefined) {
      // Update preview title if provided
      const snap = await db.collection('scraping_tasks').doc(params.taskId).get();
      if (snap.exists) {
        const preview = snap.data()?.preview || {};
        updateData.preview = { ...preview, title };
      }
    }

    await db.collection('scraping_tasks').doc(params.taskId).update(updateData);
    return NextResponse.json({ success: true, updated: Object.keys(updateData) });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
