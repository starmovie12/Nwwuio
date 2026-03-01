/**
 * /api/ai/settings — AI Configuration Manager
 *
 * GET  → Load saved AI settings from Firebase
 * POST → Save AI settings (API key, model, custom instructions)
 *
 * Firebase doc: system/ai_settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const SETTINGS_DOC = 'system/ai_settings';

// ─── Available Gemini Models ─────────────────────────────────────────────────
// Ye list frontend ko bhi jaayegi for model selector
export const AVAILABLE_MODELS = [
  {
    id: 'gemini-2.5-flash-preview-05-20',
    name: 'Gemini 2.5 Flash (Preview)',
    description: 'Latest & fastest — thinking model with great performance',
    tier: 'recommended',
    contextWindow: '1M tokens',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Fast, powerful — best balance of speed & quality',
    tier: 'recommended',
    contextWindow: '1M tokens',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    description: 'Ultra-fast, lightweight — for quick questions',
    tier: 'fast',
    contextWindow: '1M tokens',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Most capable — deep analysis & complex reasoning',
    tier: 'powerful',
    contextWindow: '2M tokens',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Reliable & fast — good all-rounder',
    tier: 'fast',
    contextWindow: '1M tokens',
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash 8B',
    description: 'Smallest & cheapest — simple tasks only',
    tier: 'economy',
    contextWindow: '1M tokens',
  },
];

const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'gemini-2.0-flash',
  customInstructions: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── GET /api/ai/settings ────────────────────────────────────────────────────
export async function GET() {
  try {
    const snap = await db.doc(SETTINGS_DOC).get();

    if (!snap.exists) {
      return NextResponse.json({
        settings: DEFAULT_SETTINGS,
        models: AVAILABLE_MODELS,
        isConfigured: false,
      });
    }

    const data = snap.data()!;

    // Mask API key for security — show only last 8 chars
    const maskedKey = data.apiKey
      ? '••••••••' + data.apiKey.slice(-8)
      : '';

    return NextResponse.json({
      settings: {
        ...data,
        apiKey: maskedKey,
        hasApiKey: !!data.apiKey,
      },
      models: AVAILABLE_MODELS,
      isConfigured: !!data.apiKey,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─── POST /api/ai/settings ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, model, customInstructions } = body;

    // Build update object — only include fields that were sent
    const update: any = {
      updatedAt: new Date().toISOString(),
    };

    if (apiKey !== undefined && apiKey !== null) {
      // If apiKey is empty string, clear it
      // If it starts with '••••', don't update (it's the masked version)
      if (apiKey === '') {
        update.apiKey = '';
      } else if (!apiKey.startsWith('••••')) {
        update.apiKey = apiKey.trim();
      }
    }

    if (model) {
      // Validate model exists in our list
      const validModel = AVAILABLE_MODELS.find(m => m.id === model);
      if (!validModel) {
        return NextResponse.json({ error: `Invalid model: ${model}` }, { status: 400 });
      }
      update.model = model;
    }

    if (customInstructions !== undefined) {
      update.customInstructions = (customInstructions || '').slice(0, 2000); // Max 2000 chars
    }

    // Create or update
    const snap = await db.doc(SETTINGS_DOC).get();
    if (!snap.exists) {
      await db.doc(SETTINGS_DOC).set({
        ...DEFAULT_SETTINGS,
        ...update,
        createdAt: new Date().toISOString(),
      });
    } else {
      await db.doc(SETTINGS_DOC).update(update);
    }

    return NextResponse.json({ success: true, message: 'Settings saved' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
