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
  HelpCircle,
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
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Back to Repositories"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Settings
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure default repository options and automated notification channels.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {saveSuccess && (
            <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Saved!
            </span>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
        <button
          onClick={() => setActiveTab('defaults')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'defaults'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Default Repository Settings
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'notifications'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          Notifications & Webhooks
          {(settings.telegram_enabled || settings.webhook_enabled) && (
            <span className="w-2 h-2 rounded-full bg-green-500" />
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: DEFAULT REPOSITORY SETTINGS */}
          {activeTab === 'defaults' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  Default Repository Preferences
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  These values apply automatically when adding repositories individually or in bulk without overriding options.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                {/* Default Interval */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Default Check Interval (Minutes)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    How frequently the monitor checks GitHub and AUR for new releases.
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
                      className="block w-36 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">minutes</span>
                  </div>
                </div>

                {/* Default Group */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-blue-500" />
                    Default Organization Group
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Initial group assigned to newly monitored repositories.
                  </p>
                  <select
                    value={settings.default_group_id ? String(settings.default_group_id) : ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_group_id: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="">(None / Ungrouped)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Default Pre-releases */}
                <div className="md:col-span-2 pt-2">
                  <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.default_include_prereleases}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          default_include_prereleases: e.target.checked,
                        })
                      }
                      className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Include Pre-releases by Default
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        When enabled, beta, release candidate (RC), and alpha releases will trigger update badges and notifications for new repositories.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Default Notifications Enabled */}
                <div className="md:col-span-2">
                  <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.default_notifications_enabled}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          default_notifications_enabled: e.target.checked,
                        })
                      }
                      className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Enable Notifications by Default for New Apps
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        When checked, new repositories and AUR packages will start with notifications enabled. You can always toggle notifications on or off per app.
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
              {/* Architecture Info banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Modular & Pluggable Notification Dispatcher
                  </p>
                  <p className="mt-0.5 text-gray-600 dark:text-gray-400">
                    Whenever a new release tag is detected on GitHub or AUR, the notification system broadcasts to all enabled channels. Use templating tokens like <code className="bg-white/70 dark:bg-gray-800 px-1 py-0.5 rounded border border-blue-200 dark:border-blue-800">{'{{repo}}'}</code>, <code className="bg-white/70 dark:bg-gray-800 px-1 py-0.5 rounded border border-blue-200 dark:border-blue-800">{'{{version}}'}</code>, <code className="bg-white/70 dark:bg-gray-800 px-1 py-0.5 rounded border border-blue-200 dark:border-blue-800">{'{{html_url}}'}</code>, and <code className="bg-white/70 dark:bg-gray-800 px-1 py-0.5 rounded border border-blue-200 dark:border-blue-800">{'{{body}}'}</code>.
                  </p>
                </div>
              </div>

              {/* MODULE 1: TELEGRAM */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        Telegram Notifications
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Deliver release alerts directly to a Telegram Bot, Channel, or Group.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.telegram_enabled}
                      onChange={(e) =>
                        setSettings({ ...settings, telegram_enabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Bot API Token
                      </label>
                      <div className="relative">
                        <input
                          type={showTelegramToken ? 'text' : 'password'}
                          value={settings.telegram_bot_token}
                          onChange={(e) =>
                            setSettings({ ...settings, telegram_bot_token: e.target.value })
                          }
                          placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTelegramToken(!showTelegramToken)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showTelegramToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Obtain token via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@BotFather</a> on Telegram.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Target Chat ID
                      </label>
                      <input
                        type="text"
                        value={settings.telegram_chat_id}
                        onChange={(e) =>
                          setSettings({ ...settings, telegram_chat_id: e.target.value })
                        }
                        placeholder="@my_channel_name or 123456789"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Can be a private chat ID or public channel username (e.g. <code>@my_channel</code>).
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Message Markdown Template
                    </label>
                    <textarea
                      rows={4}
                      value={settings.telegram_template}
                      onChange={(e) =>
                        setSettings({ ...settings, telegram_template: e.target.value })
                      }
                      className="w-full p-3 font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Telegram Test Button & Feedback */}
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={handleTestTelegram}
                      disabled={testingTelegram || !settings.telegram_bot_token || !settings.telegram_chat_id}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-200 dark:border-sky-800 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {testingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Send Test Notification to Telegram
                    </button>

                    {telegramTestResult && (
                      <div
                        className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                          telegramTestResult.success
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        {telegramTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />
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
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <Webhook className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        Webhook Integrations
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Deliver HTTP POST webhooks to Discord, Slack, n8n, Zapier, or custom backends.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.webhook_enabled}
                      onChange={(e) =>
                        setSettings({ ...settings, webhook_enabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Target Webhook Endpoint URL
                      </label>
                      <input
                        type="url"
                        value={settings.webhook_url}
                        onChange={(e) =>
                          setSettings({ ...settings, webhook_url: e.target.value })
                        }
                        placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/services/..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Payload Format
                      </label>
                      <select
                        value={settings.webhook_payload_type}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            webhook_payload_type: e.target.value as 'json' | 'form',
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                      >
                        <option value="json">JSON (application/json)</option>
                        <option value="form">Form Encoded (application/x-www-form-urlencoded)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Custom HTTP Headers (JSON Object)
                    </label>
                    <textarea
                      rows={3}
                      value={settings.webhook_headers}
                      onChange={(e) =>
                        setSettings({ ...settings, webhook_headers: e.target.value })
                      }
                      placeholder='{\n  "Authorization": "Bearer YOUR_SECRET_TOKEN",\n  "Content-Type": "application/json"\n}'
                      className="w-full p-3 font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Payload Template Body
                      </label>
                      <span className="text-[11px] text-gray-400">
                        Tokens: {'{{repo}}, {{version}}, {{owner}}, {{html_url}}, {{body}}, {{published_at}}'}
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={settings.webhook_template}
                      onChange={(e) =>
                        setSettings({ ...settings, webhook_template: e.target.value })
                      }
                      className="w-full p-3 font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Webhook Test Button & Feedback */}
                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={handleTestWebhook}
                      disabled={testingWebhook || !settings.webhook_url}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {testingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Webhook className="w-3.5 h-3.5" />}
                      Send Test HTTP Request to Webhook
                    </button>

                    {webhookTestResult && (
                      <div
                        className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                          webhookTestResult.success
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        {webhookTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />
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
