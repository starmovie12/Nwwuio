/**
 * GET /api/admin/library — Task library with search, filter, pagination
 *
 * Phase 5 Admin Panel
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status  = searchParams.get('status') || 'all';
    const search  = (searchParams.get('search') || '').toLowerCase();
    const page    = parseInt(searchParams.get('page') || '0');
    const limit   = Math.min(parseInt(searchParams.get('limit') || '24'), 100);

    // Fetch all tasks (ordered by updatedAt)
    let query = db.collection('scraping_tasks').orderBy('updatedAt', 'desc').limit(1000);

    if (status !== 'all') {
      query = db.collection('scraping_tasks')
        .where('status', '==', status)
        .orderBy('updatedAt', 'desc')
        .limit(1000);
    }

    const snap = await query.get();
    let tasks = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        url: d.url || '',
        status: d.status || 'pending',
        preview: d.preview || null,
        metadata: d.metadata || null,
        links: (d.links || []).map((l: Record<string, unknown>) => ({
          name: l.name,
          link: l.link,
          finalLink: l.finalLink,
          status: l.status,
        })),
        createdAt: d.createdAt?.toDate?.()?.toISOString() || d.createdAt || null,
        updatedAt: d.updatedAt?.toDate?.()?.toISOString() || d.updatedAt || null,
      };
    });

    // Search filter
    if (search) {
      tasks = tasks.filter(t => {
        const title = (t.preview?.title || '').toLowerCase();
        const url = (t.url || '').toLowerCase();
        return title.includes(search) || url.includes(search);
      });
    }

    const total = tasks.length;
    const pagedTasks = tasks.slice(page * limit, (page + 1) * limit);

    return NextResponse.json({ tasks: pagedTasks, total, page, limit });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
