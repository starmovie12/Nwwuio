import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// GET /api/admin/library/export — Export all completed tasks + links as CSV
// Query: ?status=completed (default), ?format=csv|json
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'completed';
    const format = searchParams.get('format') || 'csv';

    let query = db.collection('scraping_tasks')
      .orderBy('createdAt', 'desc')
      .limit(500);

    if (status !== 'all') {
      query = db.collection('scraping_tasks')
        .where('status', '==', status)
        .orderBy('createdAt', 'desc')
        .limit(500) as any;
    }

    const snap = await query.get();

    const tasks = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id:       doc.id,
        title:    d.preview?.title || 'Unknown',
        url:      d.url || '',
        status:   d.status || '',
        quality:  d.metadata?.quality || '',
        language: d.metadata?.languages || '',
        created:  d.createdAt || '',
        links:    (d.links || []).map((l: any) => ({
          name:      l.name || '',
          finalLink: l.finalLink || '',
          status:    l.status || '',
        })),
      };
    });

    if (format === 'json') {
      return new NextResponse(JSON.stringify(tasks, null, 2), {
        headers: {
          'Content-Type':        'application/json',
          'Content-Disposition': 'attachment; filename="mflix-export.json"',
        },
      });
    }

    // CSV format
    const rows: string[] = [
      'Task ID,Title,Status,Quality,Language,Created,Link Name,Download URL,Link Status',
    ];

    for (const task of tasks) {
      if (task.links.length === 0) {
        rows.push([
          task.id, `"${task.title.replace(/"/g, '""')}"`,
          task.status, task.quality, task.language, task.created,
          '', '', '',
        ].join(','));
      } else {
        for (const link of task.links) {
          rows.push([
            task.id,
            `"${task.title.replace(/"/g, '""')}"`,
            task.status,
            task.quality,
            task.language,
            task.created,
            `"${link.name.replace(/"/g, '""')}"`,
            link.finalLink || '',
            link.status,
          ].join(','));
        }
      }
    }

    const csv = rows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mflix-links-${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
