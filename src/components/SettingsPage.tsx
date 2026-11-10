import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Settings,
  Send,
  Webhook,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Radio,
  ArrowLeft,
  Sparkles,
  Folder,
} from 'lucide-react';
import { Group, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '../types';

interface SettingsPageProps {
  onBack: () => void;
  groups: Group[];
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, groups }) => {
  const [activeTab, setActiveTab] = useState<'defaults' | 'notifications'>('defaults');
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Notification testing state
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Password visibility toggle
  const [showTelegramToken, setShowTelegramToken] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/settings');
      setSettings(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const res = await axios.put('/api/settings', settings);
      if (res.data.settings) {
        setSettings(res.data.settings);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramTestResult(null);

    try {
      const response = await axios.post('/api/notifications/test', {
        channel_id: 'telegram',
        settings: {
          telegram_enabled: true,
          telegram_bot_token: settings.telegram_bot_token,
          telegram_chat_id: settings.telegram_chat_id,
          telegram_template: settings.telegram_template,
        },
      });

      setTelegramTestResult({
        success: true,
        message: response.data.message || 'Telegram test message sent successfully!',
      });
    } catch (err: any) {
      setTelegramTestResult({
        success: false,
        message: err.response?.data?.error || 'Failed to send test message via Telegram.',
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookTestResult(null);

    try {
      const response = await axios.post('/api/notifications/test', {
        channel_id: 'webhook',
        settings: {
          webhook_enabled: true,
          webhook_url: settings.webhook_url,
          webhook_headers: settings.webhook_headers,
          webhook_payload_type: settings.webhook_payload_type,
          webhook_template: settings.webhook_template,
        },
      });

      setWebhookTestResult({
        success: true,
        message: response.data.message || 'Webhook delivered successfully!',
      });
    } catch (err: any) {
      setWebhookTestResult({
        success: false,
        message: err.response?.data?.error || 'Failed to deliver webhook payload.',
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 font-mono animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#18181b] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Back to Repositories"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-syne text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-600 dark:text-blue-500" />
              SYSTEM SETTINGS
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-0.5">
              CONFIGURE REPOSITORY DEFAULTS & NOTIFICATION DISPATCH CHANNELS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              SAVED SYSTEM CONFIG
            </span>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono uppercase text-xs font-bold tracking-wider transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>SAVE SETTINGS</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/40 text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>ERROR: {error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6">
        <button
          onClick={() => setActiveTab('defaults')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-mono uppercase font-bold border-b-2 transition-colors ${
            activeTab === 'defaults'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          DEFAULT REPO SETTINGS
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-mono uppercase font-bold border-b-2 transition-colors ${
            activeTab === 'notifications'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          NOTIFICATIONS & WEBHOOKS
          {(settings.telegram_enabled || settings.webhook_enabled) && (
            <span className="w-2 h-2 bg-emerald-500 inline-block" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
          <span className="text-xs uppercase tracking-widest">LOADING CONFIGURATION...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: DEFAULT REPOSITORY SETTINGS */}
          {activeTab === 'defaults' && (
            <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
              <div>
                <h2 className="font-syne text-lg font-bold uppercase text-zinc-900 dark:text-white mb-1">
                  DEFAULT REPOSITORY PREFERENCES
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  THESE VALUES APPLY AUTOMATICALLY WHEN ADDING REPOSITORIES INDIVIDUALLY OR IN BULK.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                {/* Default Interval */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    DEFAULT CHECK INTERVAL (MINUTES)
                  </label>
                  <p className="text-[0.65rem] text-zinc-500 dark:text-zinc-400 uppercase mb-2">
                    FREQUENCY OF AUTOMATED RELEASE UPDATES.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={settings.default_check_interval}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          default_check_interval: Math.max(1, parseInt(e.target.value) || 60),
                        })
                      }
                      className="block w-36 px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono outline-none focus:border-blue-500"
                    />
                    <span className="text-xs text-zinc-500 uppercase">MINUTES</span>
                  </div>
                </div>

                {/* Default Group */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-blue-500" />
                    DEFAULT ORGANIZATION GROUP
                  </label>
                  <p className="text-[0.65rem] text-zinc-500 dark:text-zinc-400 uppercase mb-2">
                    INITIAL GROUP ASSIGNED TO NEWLY MONITORED REPOSITORIES.
                  </p>
                  <select
                    value={settings.default_group_id ? String(settings.default_group_id) : ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_group_id: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="block w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs uppercase font-mono cursor-pointer outline-none focus:border-blue-500"
                  >
                    <option value="">(NONE / UNGROUPED)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Default Pre-releases */}
                <div className="md:col-span-2 pt-2">
                  <label className="flex items-start gap-3 p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/30 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.default_include_prereleases}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          default_include_prereleases: e.target.checked,
                        })
                      }
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded-none border-zinc-300"
                    />
                    <div>
                      <span className="text-xs font-bold uppercase text-zinc-900 dark:text-white">
                        INCLUDE PRE-RELEASES BY DEFAULT
                      </span>
                      <p className="text-[0.65rem] text-zinc-500 dark:text-zinc-400 uppercase mt-0.5">
                        WHEN ENABLED, BETA, RC, AND ALPHA RELEASES TRIGGER UPDATE BADGES AND NOTIFICATIONS.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Default Notifications Enabled */}
                <div className="md:col-span-2">
                  <label className="flex items-start gap-3 p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/30 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.default_notifications_enabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          default_notifications_enabled: e.target.checked,
                        })
                      }
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded-none border-zinc-300"
                    />
                    <div>
                      <span className="text-xs font-bold uppercase text-zinc-900 dark:text-white">
                        ENABLE NOTIFICATIONS BY DEFAULT FOR NEW APPS
                      </span>
                      <p className="text-[0.65rem] text-zinc-500 dark:text-zinc-400 uppercase mt-0.5">
                        NEW REPOSITORIES AND AUR PACKAGES WILL START WITH NOTIFICATIONS ENABLED.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NOTIFICATIONS & WEBHOOKS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Info banner */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 flex items-start gap-3 text-xs uppercase">
                <Sparkles className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold text-zinc-900 dark:text-white">
                    MODULAR NOTIFICATION DISPATCH ENGINE
                  </p>
                  <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
                    WHENEVER A NEW RELEASE TAG IS DETECTED, NOTIFICATIONS BROADCAST TO ENABLED CHANNELS.
                    AVAILABLE TOKENS: <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 text-blue-600 dark:text-blue-400">{'{{repo}}'}</code>, <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 text-blue-600 dark:text-blue-400">{'{{version}}'}</code>, <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 text-blue-600 dark:text-blue-400">{'{{html_url}}'}</code>, <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 text-blue-600 dark:text-blue-400">{'{{body}}'}</code>.
                  </p>
                </div>
              </div>

              {/* MODULE 1: TELEGRAM */}
              <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800">
                <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-syne font-bold uppercase text-zinc-900 dark:text-white text-base">
                        TELEGRAM NOTIFICATIONS
                      </h3>
                      <p className="text-[0.65rem] text-zinc-500 dark:text-zinc-400 uppercase">
                        DISPATCH ALERTS DIRECTLY TO TELEGRAM BOT OR CHANNEL.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs uppercase font-bold">
                    <input
                      type="checkbox"
                      checked={settings.telegram_enabled}
                      onChange={(e) =>
                        setSettings({ ...settings, telegram_enabled: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded-none border-zinc-300"
                    />
                    <span>{settings.telegram_enabled ? 'ENABLED' : 'DISABLED'}</span>
                  </label>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                        BOT API TOKEN
                      </label>
                      <div className="relative">
                        <input
                          type={showTelegramToken ? 'text' : 'password'}
                          value={settings.telegram_bot_token}
                          onChange={(e) =>
                            setSettings({ ...settings, telegram_bot_token: e.target.value })
                          }
                          placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                          className="w-full px-3 py-2 pr-10 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTelegramToken(!showTelegramToken)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        >
                          {showTelegramToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                        TARGET CHAT ID / CHANNEL
                      </label>
                      <input
                        type="text"
                        value={settings.telegram_chat_id}
                        onChange={(e) =>
                          setSettings({ ...settings, telegram_chat_id: e.target.value })
                        }
                        placeholder="@my_channel_name or 123456789"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                      MESSAGE TEMPLATE
                    </label>
                    <textarea
                      rows={4}
                      value={settings.telegram_template}
                      onChange={(e) =>
                        setSettings({ ...settings, telegram_template: e.target.value })
                      }
                      className="w-full p-3 font-mono text-xs border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Telegram Test Button & Feedback */}
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={handleTestTelegram}
                      disabled={testingTelegram || !settings.telegram_bot_token || !settings.telegram_chat_id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 text-sky-700 dark:text-sky-300 hover:bg-sky-500/30 border border-sky-500/40 text-xs font-bold uppercase transition-colors disabled:opacity-50"
                    >
                      {testingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      SEND TEST TELEGRAM MESSAGE
                    </button>

                    {telegramTestResult && (
                      <div
                        className={`text-xs px-3 py-1.5 font-bold uppercase flex items-center gap-1.5 ${
                          telegramTestResult.success
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                        }`}
                      >
                        {telegramTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        )}
                        <span>{telegramTestResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* MODULE 2: WEBHOOKS */}
              <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800">
                <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
                      <Webhook className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-syne font-bold uppercase text-zinc-900 dark:text-white text-base">
                        WEBHOOK INTEGRATIONS
                      </h3>
                      <p className="text-[0.65rem] text-zinc-500 dark:text-zinc-400 uppercase">
                        DELIVER HTTP POST WEBHOOKS TO DISCORD, SLACK, OR CUSTOM ENDPOINTS.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs uppercase font-bold">
                    <input
                      type="checkbox"
                      checked={settings.webhook_enabled}
                      onChange={(e) =>
                        setSettings({ ...settings, webhook_enabled: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded-none border-zinc-300"
                    />
                    <span>{settings.webhook_enabled ? 'ENABLED' : 'DISABLED'}</span>
                  </label>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                        TARGET WEBHOOK ENDPOINT URL
                      </label>
                      <input
                        type="url"
                        value={settings.webhook_url}
                        onChange={(e) =>
                          setSettings({ ...settings, webhook_url: e.target.value })
                        }
                        placeholder="https://discord.com/api/webhooks/..."
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                        PAYLOAD FORMAT
                      </label>
                      <select
                        value={settings.webhook_payload_type}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            webhook_payload_type: e.target.value as 'json' | 'form',
                          })
                        }
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-mono uppercase cursor-pointer outline-none focus:border-blue-500"
                      >
                        <option value="json">JSON (APPLICATION/JSON)</option>
                        <option value="form">FORM ENCODED</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                      CUSTOM HTTP HEADERS (JSON OBJECT)
                    </label>
                    <textarea
                      rows={3}
                      value={settings.webhook_headers}
                      onChange={(e) =>
                        setSettings({ ...settings, webhook_headers: e.target.value })
                      }
                      placeholder='{\n  "Authorization": "Bearer TOKEN"\n}'
                      className="w-full p-3 font-mono text-xs border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[0.65rem] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        PAYLOAD TEMPLATE BODY
                      </label>
                      <span className="text-[0.6rem] text-zinc-400 uppercase">
                        TOKENS: {'{{repo}}, {{version}}, {{owner}}, {{html_url}}, {{body}}'}
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      value={settings.webhook_template}
                      onChange={(e) =>
                        setSettings({ ...settings, webhook_template: e.target.value })
                      }
                      className="w-full p-3 font-mono text-xs border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Webhook Test Button & Feedback */}
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={handleTestWebhook}
                      disabled={testingWebhook || !settings.webhook_url}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold uppercase transition-colors disabled:opacity-50"
                    >
                      {testingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Webhook className="w-3.5 h-3.5" />}
                      SEND TEST WEBHOOK REQUEST
                    </button>

                    {webhookTestResult && (
                      <div
                        className={`text-xs px-3 py-1.5 font-bold uppercase flex items-center gap-1.5 ${
                          webhookTestResult.success
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                        }`}
                      >
                        {webhookTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        )}
                        <span>{webhookTestResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
