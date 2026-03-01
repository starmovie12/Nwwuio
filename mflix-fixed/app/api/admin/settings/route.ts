/**
 * GET  /api/admin/settings — Load admin settings
 * POST /api/admin/settings — Save admin settings / test connections
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import axios from 'axios';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SETTINGS_DOC = 'system/admin_settings';

const DEFAULT = {
  vpsBaseUrl: process.env.VPS_BASE_URL || 'http://85.121.5.246',
  hubcloudPort: process.env.HUBCLOUD_PORT || '5001',
  timerPort: process.env.TIMER_PORT || '10000',
  telegramBotToken: '',
  telegramChatId: '',
  notifyOnComplete: true,
  notifyOnFail: true,
  notifyOnVpsDown: true,
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
  updatedAt: new Date().toISOString(),
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // VPS ping test
    if (searchParams.get('test') === 'vps') {
      const url = searchParams.get('url') || '';
      const start = Date.now();
      try {
        await axios.get(`${url}/health`, { timeout: 5000 });
        return NextResponse.json({ ok: true, ms: Date.now() - start });
      } catch {
        try {
          await axios.get(url, { timeout: 5000 });
          return NextResponse.json({ ok: true, ms: Date.now() - start });
        } catch (e2: unknown) {
          return NextResponse.json({ ok: false, error: e2 instanceof Error ? e2.message : 'Unreachable' });
        }
      }
    }

    const snap = await db.doc(SETTINGS_DOC).get();
    const settings = snap.exists ? snap.data() : DEFAULT;

    // Mask sensitive fields
    const masked = {
      ...settings,
      telegramBotToken: settings?.telegramBotToken ? '••••' + (settings.telegramBotToken as string).slice(-8) : '',
    };

    return NextResponse.json({ settings: masked, hasSettings: snap.exists });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Test Telegram
    if (body.action === 'test-telegram') {
      const snap = await db.doc(SETTINGS_DOC).get();
      const saved = snap.data();
      const token = body.telegramBotToken && !body.telegramBotToken.startsWith('••••')
        ? body.telegramBotToken
        : saved?.telegramBotToken;
      const chatId = body.telegramChatId || saved?.telegramChatId;

      if (!token || !chatId) {
        return NextResponse.json({ error: 'Telegram token aur chat ID required hai' }, { status: 400 });
      }
      const res = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: '✅ MFLIX PRO: Test message from admin panel!',
      });
      return NextResponse.json({ success: true, messageId: res.data?.result?.message_id });
    }

    // Save settings
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    const ALLOWED = ['vpsBaseUrl', 'hubcloudPort', 'timerPort', 'telegramChatId', 'notifyOnComplete', 'notifyOnFail', 'notifyOnVpsDown', 'baseUrl'];

    for (const key of ALLOWED) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    // Only update token if not masked
    if (body.telegramBotToken && !body.telegramBotToken.startsWith('••••')) {
      update.telegramBotToken = body.telegramBotToken;
    }

    await db.doc(SETTINGS_DOC).set(update, { merge: true });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
