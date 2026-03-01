/**
 * GET /api/admin/logs — System activity logs from Firebase
 *
 * Reads from system_logs collection (written by cron, solve_task etc)
 * Phase 5 Admin Panel
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level  = searchParams.get('level') || 'all';
    const source = searchParams.get('source') || 'all';
    const limit  = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    let query = db.collection('system_logs')
      .orderBy('timestamp', 'desc')
      .limit(limit * 2); // overfetch then filter

    const snap = await query.get();

    let logs = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        level:   d.level || 'info',
        message: d.message || '',
        source:  d.source || 'system',
        timestamp: d.timestamp?.toDate?.()?.toISOString() || d.timestamp || null,
        details: d.details || null,
      };
    });

    // Filters
    if (level !== 'all') logs = logs.filter(l => l.level === level);
    if (source !== 'all') logs = logs.filter(l => l.source === source);

    // If collection doesn't exist, generate from scraping_tasks recent activity
    if (logs.length === 0) {
      const tasksSnap = await db.collection('scraping_tasks')
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .get();

      logs = tasksSnap.docs.flatMap(doc => {
        const d = doc.data();
        const title = d.preview?.title || d.url?.split('/').pop() || doc.id;
        const entries = [];

        if (d.status === 'completed') {
          entries.push({
            id: `${doc.id}-done`,
            level: 'success',
            message: `Task completed: ${title}`,
            source: 'solve_task',
            timestamp: d.completedAt?.toDate?.()?.toISOString() || d.updatedAt?.toDate?.()?.toISOString() || null,
            details: { links: d.links?.length, url: d.url },
          });
        } else if (d.status === 'failed') {
          entries.push({
            id: `${doc.id}-fail`,
            level: 'error',
            message: `Task failed: ${title}`,
            source: 'solve_task',
            timestamp: d.updatedAt?.toDate?.()?.toISOString() || null,
            details: { error: d.error, url: d.url },
          });
        } else if (d.status === 'processing') {
          entries.push({
            id: `${doc.id}-proc`,
            level: 'info',
            message: `Processing: ${title}`,
            source: 'solve_task',
            timestamp: d.updatedAt?.toDate?.()?.toISOString() || null,
            details: { url: d.url },
          });
        }
        return entries;
      });

      logs.sort((a, b) => {
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return tb - ta;
      });

      if (level !== 'all') logs = logs.filter(l => l.level === level);
    }

    return NextResponse.json({ logs: logs.slice(0, limit) });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
