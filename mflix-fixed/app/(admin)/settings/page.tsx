'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { motion } from 'motion/react';
import { Save, TestTube, Database, Server, Bell, Shield, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/admin/Toast';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface SettingsSection {
  key: string;
  title: string;
  icon: string;
  description: string;
}

const SECTIONS: SettingsSection[] = [
  { key: 'general', title: 'General', icon: '⚙️', description: 'Basic system settings' },
  { key: 'vps', title: 'VPS Server', icon: '🖥', description: 'VPS connection settings' },
  { key: 'notifications', title: 'Notifications', icon: '🔔', description: 'Telegram alerts config' },
  { key: 'cron', title: 'Cron Engine', icon: '⏰', description: 'GitHub Actions cron config' },
  { key: 'ai', title: 'AI Settings', icon: '🧠', description: 'Gemini API configuration' },
  { key: 'system', title: 'System Actions', icon: '🔧', description: 'Maintenance & cleanup' },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('general');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const { data: settingsData, mutate } = useSWR('/api/admin/settings', fetcher, { keepPreviousData: true });
  const { data: aiSettings, mutate: mutateAi } = useSWR('/api/ai/settings', fetcher, { keepPreviousData: true });

  const [form, setForm] = useState({
    vpsBaseUrl: '',
    hubcloudPort: '5001',
    timerPort: '10000',
    telegramBotToken: '',
    telegramChatId: '',
    notifyOnComplete: true,
    notifyOnFail: true,
    notifyOnVpsDown: true,
    adminSecret: '',
    cronSecret: '',
    baseUrl: '',
  });

  const [aiForm, setAiForm] = useState({
    apiKey: '',
    model: 'gemini-2.5-flash',
    customInstructions: '',
  });

  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      setForm(prev => ({
        ...prev,
        vpsBaseUrl: s.vpsBaseUrl || '',
        hubcloudPort: s.hubcloudPort || '5001',
        timerPort: s.timerPort || '10000',
        telegramBotToken: s.telegramBotToken || '',
        telegramChatId: s.telegramChatId || '',
        notifyOnComplete: s.notifyOnComplete ?? true,
        notifyOnFail: s.notifyOnFail ?? true,
        notifyOnVpsDown: s.notifyOnVpsDown ?? true,
        baseUrl: s.baseUrl || '',
      }));
    }
  }, [settingsData]);

  useEffect(() => {
    if (aiSettings?.settings) {
      setAiForm(prev => ({
        ...prev,
        model: aiSettings.settings.model || 'gemini-2.5-flash',
        customInstructions: aiSettings.settings.customInstructions || '',
      }));
    }
  }, [aiSettings]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.success) { toast.success('Settings saved!'); mutate(); }
      else toast.error(d.error || 'Save failed');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const saveAiSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiForm),
      });
      const d = await res.json();
      if (d.success) { toast.success('AI settings saved!'); mutateAi(); }
      else toast.error(d.error || 'Save failed');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const testVps = async (type: 'timer' | 'hubcloud') => {
    setTesting(type);
    try {
      const port = type === 'timer' ? form.timerPort : form.hubcloudPort;
      const url = form.vpsBaseUrl || 'http://85.121.5.246';
      const res = await fetch(`/api/admin/settings?test=vps&url=${encodeURIComponent(`${url}:${port}`)}`);
      const d = await res.json();
      if (d.ok) toast.success(`VPS ${type} online — ${d.ms}ms`);
      else toast.error(`VPS ${type} offline — ${d.error || 'No response'}`);
    } catch { toast.error('Test failed'); }
    finally { setTesting(null); }
  };

  const testTelegram = async () => {
    setTesting('telegram');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, action: 'test-telegram' }),
      });
      const d = await res.json();
      if (d.success) toast.success('Telegram test message sent!');
      else toast.error(`Telegram test failed: ${d.error}`);
    } catch { toast.error('Test failed'); }
    finally { setTesting(null); }
  };

  const systemAction = async (action: string) => {
    try {
      const res = await fetch('/api/system/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      toast.success(d.message || 'Action completed');
    } catch { toast.error('Action failed'); }
  };

  const AI_MODELS = [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash ⚡ (Recommended)' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro ⭐ (Best quality)' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite ⚡⚡ (Fastest)' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash ⚡ (Stable)' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro 🧠 (Deep analysis)' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash ⚡ (Reliable)' },
    { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B (Simple tasks)' },
  ];

  const InputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 transition-colors";
  const LabelClass = "block text-xs font-medium text-slate-400 mb-1.5";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white mb-1">⚙️ System Settings</h2>
        <p className="text-sm text-slate-500">Sab configuration ek jagah — Vercel env vars replace karo</p>
      </div>

      <div className="flex gap-4">
        {/* Section nav */}
        <nav className="w-40 shrink-0 space-y-1">
          {SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                activeSection === s.key ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.title}</span>
            </button>
          ))}
        </nav>

        {/* Form */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-4"
          >
            {activeSection === 'general' && (
              <>
                <h3 className="text-sm font-semibold text-white">⚙️ General Settings</h3>
                <div>
                  <label className={LabelClass}>Base URL (Next.js app URL)</label>
                  <input value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
                    placeholder="https://your-app.vercel.app" className={InputClass} />
                </div>
                <button onClick={saveSettings} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-xl transition-colors">
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </>
            )}

            {activeSection === 'vps' && (
              <>
                <h3 className="text-sm font-semibold text-white">🖥 VPS Server</h3>
                <div>
                  <label className={LabelClass}>VPS Base URL</label>
                  <input value={form.vpsBaseUrl} onChange={e => setForm(f => ({ ...f, vpsBaseUrl: e.target.value }))}
                    placeholder="http://85.121.5.246" className={InputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LabelClass}>HubCloud Port</label>
                    <input value={form.hubcloudPort} onChange={e => setForm(f => ({ ...f, hubcloudPort: e.target.value }))}
                      placeholder="5001" className={InputClass} />
                  </div>
                  <div>
                    <label className={LabelClass}>Timer Port</label>
                    <input value={form.timerPort} onChange={e => setForm(f => ({ ...f, timerPort: e.target.value }))}
                      placeholder="10000" className={InputClass} />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => testVps('hubcloud')} disabled={testing !== null}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-white/5 text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50">
                    <TestTube className="w-3.5 h-3.5" />
                    {testing === 'hubcloud' ? 'Testing...' : 'Test HubCloud (5001)'}
                  </button>
                  <button onClick={() => testVps('timer')} disabled={testing !== null}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-white/5 text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50">
                    <TestTube className="w-3.5 h-3.5" />
                    {testing === 'timer' ? 'Testing...' : 'Test Timer (10000)'}
                  </button>
                  <button onClick={saveSettings} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-xl transition-colors ml-auto">
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </button>
                </div>
              </>
            )}

            {activeSection === 'notifications' && (
              <>
                <h3 className="text-sm font-semibold text-white">🔔 Telegram Notifications</h3>
                <div>
                  <label className={LabelClass}>Bot Token</label>
                  <input value={form.telegramBotToken} onChange={e => setForm(f => ({ ...f, telegramBotToken: e.target.value }))}
                    placeholder="123456789:ABCdef..." className={InputClass} type="password" />
                </div>
                <div>
                  <label className={LabelClass}>Chat ID</label>
                  <input value={form.telegramChatId} onChange={e => setForm(f => ({ ...f, telegramChatId: e.target.value }))}
                    placeholder="-1001234567890" className={InputClass} />
                </div>
                <div className="space-y-2">
                  {[
                    { key: 'notifyOnComplete', label: '✅ On task complete' },
                    { key: 'notifyOnFail', label: '❌ On task fail' },
                    { key: 'notifyOnVpsDown', label: '🔴 On VPS down' },
                  ].map(opt => (
                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(form as Record<string, unknown>)[opt.key] as boolean}
                        onChange={e => setForm(f => ({ ...f, [opt.key]: e.target.checked }))}
                        className="w-4 h-4 rounded accent-indigo-500"
                      />
                      <span className="text-xs text-slate-300">{opt.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={testTelegram} disabled={testing === 'telegram'}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-50">
                    <Bell className="w-3.5 h-3.5" />
                    {testing === 'telegram' ? 'Sending...' : 'Test Message'}
                  </button>
                  <button onClick={saveSettings} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-xl ml-auto">
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
              </>
            )}

            {activeSection === 'cron' && (
              <>
                <h3 className="text-sm font-semibold text-white">⏰ Cron Engine</h3>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 space-y-1">
                  <p>⚠️ GitHub Actions secrets Vercel dashboard se change karne padte hain:</p>
                  <p><strong>CRON_SECRET</strong> — Cron authentication key</p>
                  <p><strong>APP_BASE_URL</strong> — Your Vercel app URL</p>
                </div>
                <div>
                  <label className={LabelClass}>Cron Secret (info only)</label>
                  <input value="••••••••" disabled className={`${InputClass} opacity-50 cursor-not-allowed`} />
                  <p className="text-[10px] text-slate-600 mt-1">Vercel env mein CRON_SECRET set karo</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                    <p className="text-slate-400 font-medium mb-1">Stuck threshold</p>
                    <p className="text-white">10 minutes</p>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                    <p className="text-slate-400 font-medium mb-1">Max retries</p>
                    <p className="text-white">3</p>
                  </div>
                </div>
              </>
            )}

            {activeSection === 'ai' && (
              <>
                <h3 className="text-sm font-semibold text-white">🧠 AI Assistant (Gemini)</h3>
                <div>
                  <label className={LabelClass}>Gemini API Key</label>
                  <div className="relative">
                    <input
                      value={aiForm.apiKey}
                      onChange={e => setAiForm(f => ({ ...f, apiKey: e.target.value }))}
                      placeholder="AIzaSy... (Google AI Studio se lo)"
                      type={showKey ? 'text' : 'password'}
                      className={`${InputClass} pr-10`}
                    />
                    <button onClick={() => setShowKey(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">
                    Free key: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">aistudio.google.com/apikey</a>
                  </p>
                </div>
                <div>
                  <label className={LabelClass}>Model</label>
                  <select
                    value={aiForm.model}
                    onChange={e => setAiForm(f => ({ ...f, model: e.target.value }))}
                    className={InputClass}
                  >
                    {AI_MODELS.map(m => (
                      <option key={m.id} value={m.id} style={{ background: '#0c0c0e' }}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Custom Instructions (optional)</label>
                  <textarea
                    value={aiForm.customInstructions}
                    onChange={e => setAiForm(f => ({ ...f, customInstructions: e.target.value }))}
                    placeholder="AI ko extra instructions do, e.g. 'hamesha code examples do'"
                    rows={3}
                    maxLength={2000}
                    className={`${InputClass} resize-none`}
                  />
                  <p className="text-[10px] text-slate-600 mt-1">{aiForm.customInstructions.length}/2000</p>
                </div>
                <button onClick={saveAiSettings} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm rounded-xl">
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save AI Settings'}
                </button>
              </>
            )}

            {activeSection === 'system' && (
              <>
                <h3 className="text-sm font-semibold text-white">🔧 System Actions</h3>
                <div className="space-y-3">
                  {[
                    {
                      label: 'Reset Stuck Tasks',
                      description: 'Processing state mein stuck tasks ko reset karo',
                      icon: <RefreshCw className="w-4 h-4" />,
                      action: 'reset-stuck',
                      variant: 'amber',
                    },
                    {
                      label: 'Clear Expired Cache',
                      description: '24h se purani link_cache entries delete karo',
                      icon: <Database className="w-4 h-4" />,
                      action: 'clear-cache',
                      variant: 'indigo',
                    },
                    {
                      label: 'Heal System',
                      description: 'Auto-healing — stuck tasks, dead queue items fix karo',
                      icon: <Server className="w-4 h-4" />,
                      action: 'heal',
                      variant: 'emerald',
                    },
                  ].map(action => (
                    <div key={action.action} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-3">
                      <div>
                        <p className="text-xs font-medium text-white">{action.label}</p>
                        <p className="text-[10px] text-slate-500">{action.description}</p>
                      </div>
                      <button
                        onClick={() => systemAction(action.action)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                          action.variant === 'amber' ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25' :
                          action.variant === 'emerald' ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' :
                          'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25'
                        }`}
                      >
                        {action.icon}
                        Run
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
