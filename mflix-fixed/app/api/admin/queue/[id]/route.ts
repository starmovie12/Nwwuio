/**
 * GET    /api/admin/queue/[id] — Get queue item
 * PATCH  /api/admin/queue/[id] — Update queue item (status, retryCount etc)
 * DELETE /api/admin/queue/[id] — Delete queue item
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

async function findItem(id: string) {
  for (const col of ['movies_queue', 'webseries_queue']) {
    const doc = await db.collection(col).doc(id).get();
    if (doc.exists) return { doc, col };
  }
  return null;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const found = await findItem(params.id);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item: { id: found.doc.id, ...found.doc.data() } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const found = await findItem(params.id);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const allowed = ['status', 'retryCount', 'lockedAt'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    update.updatedAt = new Date().toISOString();

    await found.doc.ref.update(update);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const found = await findItem(params.id);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await found.doc.ref.delete();
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
