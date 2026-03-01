import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// GET /api/admin/analytics — Dedicated admin analytics
// Query: ?range=7d | 30d | today | custom&from=ISO&to=ISO
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '7d';
    const fromParam = searchParams.get('from');
    const toParam   = searchParams.get('to');

    const now = new Date();
    let fromDate: Date;
    let toDate: Date = now;

    if (range === 'today') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === '30d') {
      fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === 'custom' && fromParam && toParam) {
      fromDate = new Date(fromParam);
      toDate   = new Date(toParam);
    } else {
      // Default: 7d
      fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const fromISO = fromDate.toISOString();
    const toISO   = toDate.toISOString();

    // Fetch tasks in date range
    const snap = await db.collection('scraping_tasks')
      .where('createdAt', '>=', fromISO)
      .where('createdAt', '<=', toISO)
      .orderBy('createdAt', 'asc')
      .limit(1000)
      .get();

    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    const totalTasks     = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const failedTasks    = tasks.filter(t => t.status === 'failed').length;
    const processingTasks= tasks.filter(t => t.status === 'processing').length;
    const pendingTasks   = tasks.filter(t => t.status === 'pending').length;
    const successRate    = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // All links across tasks
    const allLinks = tasks.flatMap(t => t.links || []);
    const totalLinks     = allLinks.length;
    const doneLinks      = allLinks.filter(l => ['done','success'].includes(l.status || '')).length;
    const avgLinksPerTask = totalTasks > 0 ? (totalLinks / totalTasks) : 0;

    // Daily breakdown
    const dailyMap: Record<string, { date: string; processed: number; success: number; failed: number }> = {};
    for (const t of tasks) {
      const day = (t.createdAt || '').slice(0, 10);
      if (!day) continue;
      if (!dailyMap[day]) dailyMap[day] = { date: day, processed: 0, success: 0, failed: 0 };
      dailyMap[day].processed++;
      if (t.status === 'completed') dailyMap[day].success++;
      if (t.status === 'failed')    dailyMap[day].failed++;
    }
    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Solver performance (based on link names)
    const solverMap: Record<string, { success: number; failed: number }> = {};
    for (const link of allLinks) {
      let solver = 'Other';
      const url = (link.link || '').toLowerCase();
      if (url.includes('hubcloud')) solver = 'HubCloud';
      else if (url.includes('hubdrive')) solver = 'HubDrive';
      else if (url.includes('hblinks')) solver = 'HBLinks';
      else if (url.includes('hubcdn')) solver = 'HubCDN';
      else if (url.includes('gadgetsweb') || url.includes('review-tech') || url.includes('ngwin') || url.includes('cryptoinsights')) solver = 'Timer';
      else if (url.includes('gdflix') || url.includes('drivehub')) solver = 'GDFlix';

      if (!solverMap[solver]) solverMap[solver] = { success: 0, failed: 0 };
      const s = (link.status || '').toLowerCase();
      if (s === 'done' || s === 'success') solverMap[solver].success++;
      else if (s === 'error' || s === 'failed') solverMap[solver].failed++;
    }
    const solverPerformance = Object.entries(solverMap).map(([name, v]) => ({ name, ...v }));

    // Error breakdown
    const errorLinks = allLinks.filter(l => (l.status || '') === 'error' || (l.status || '') === 'failed');
    const errorMap: Record<string, number> = {};
    for (const l of errorLinks) {
      const msg = (l.error || 'Unknown error').slice(0, 60);
      errorMap[msg] = (errorMap[msg] || 0) + 1;
    }
    const topErrors = Object.entries(errorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));

    // Hourly heatmap (today only, or average over range)
    const hourlyCount = new Array(24).fill(0);
    for (const t of tasks) {
      const hr = new Date(t.createdAt || '').getHours();
      if (!isNaN(hr)) hourlyCount[hr]++;
    }

    // Time distribution (how long tasks take in seconds)
    const timeBuckets: Record<string, number> = {
      '0-5s': 0, '5-10s': 0, '10-20s': 0,
      '20-30s': 0, '30-45s': 0, '45-60s': 0, '60s+': 0,
    };
    for (const t of tasks) {
      if (t.createdAt && t.completedAt) {
        const secs = (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / 1000;
        if (secs <= 5) timeBuckets['0-5s']++;
        else if (secs <= 10) timeBuckets['5-10s']++;
        else if (secs <= 20) timeBuckets['10-20s']++;
        else if (secs <= 30) timeBuckets['20-30s']++;
        else if (secs <= 45) timeBuckets['30-45s']++;
        else if (secs <= 60) timeBuckets['45-60s']++;
        else timeBuckets['60s+']++;
      }
    }
    const timeDistribution = Object.entries(timeBuckets).map(([bucket, count]) => ({ bucket, count }));

    // Status distribution (pie chart)
    const statusDistribution = [
      { name: 'Completed', value: completedTasks },
      { name: 'Failed',    value: failedTasks },
      { name: 'Processing',value: processingTasks },
      { name: 'Pending',   value: pendingTasks },
    ].filter(d => d.value > 0);

    return NextResponse.json({
      range,
      from: fromISO,
      to:   toISO,
      overview: {
        totalTasks,
        completedTasks,
        failedTasks,
        processingTasks,
        pendingTasks,
        successRate,
        totalLinks,
        doneLinks,
        avgLinksPerTask: Math.round(avgLinksPerTask * 10) / 10,
      },
      daily,
      solverPerformance,
      statusDistribution,
      topErrors,
      timeDistribution,
      hourly: hourlyCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
