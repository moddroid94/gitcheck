import axios from 'axios';
import { Repo, Release } from '../types';

export interface NotificationPayload {
  repo: Repo;
  release: Release;
  isTest?: boolean;
}

export interface NotificationResult {
  channelId: string;
  name: string;
  success: boolean;
  message?: string;
  error?: string;
}

export interface NotificationProvider {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  isEnabled(settings: any): boolean;
  send(payload: NotificationPayload, settings: any): Promise<NotificationResult>;
  test(settings: any): Promise<NotificationResult>;
}

// Utility: render template strings with {{key}} placeholders
export function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = data[key];
    if (val === undefined || val === null) return '';
    return String(val);
  });
}

/**
 * Telegram Notification Provider
 * Uses Telegram Bot API: https://api.telegram.org/bot<token>/sendMessage
 */
export class TelegramNotificationProvider implements NotificationProvider {
  readonly id = 'telegram';
  readonly name = 'Telegram';
  readonly description = 'Send release notifications to a Telegram chat, channel, or group';

  isEnabled(settings: any): boolean {
    return !!(settings.telegram_enabled && settings.telegram_bot_token && settings.telegram_chat_id);
  }

  async send(payload: NotificationPayload, settings: any): Promise<NotificationResult> {
    const token = settings.telegram_bot_token?.trim();
    const chatId = settings.telegram_chat_id?.trim();

    if (!token || !chatId) {
      return {
        channelId: this.id,
        name: this.name,
        success: false,
        error: 'Telegram Bot Token or Chat ID is not configured.',
      };
    }

    const { repo, release } = payload;
    const template = settings.telegram_template || '🚀 *New Release Detected!*\n\n*Repo:* {{repo}}\n*Version:* `{{version}}`\n*URL:* {{html_url}}';

    const plainBody = (release.body || '').replace(/[\r\n]+/g, ' ').substring(0, 400);

    const context: Record<string, string> = {
      repo: repo.repo,
      owner: repo.owner,
      version: release.tag_name || repo.last_tag || 'latest',
      name: release.name || release.tag_name || repo.repo,
      published_at: release.published_at ? new Date(release.published_at).toLocaleString() : new Date().toLocaleString(),
      html_url: release.html_url || (repo.source_type === 'aur' ? `https://aur.archlinux.org/packages/${repo.repo}` : `https://github.com/${repo.owner}/${repo.repo}`),
      source_type: repo.source_type === 'aur' ? 'AUR Package' : 'GitHub Repository',
      body: plainBody + (release.body && release.body.length > 400 ? '...' : ''),
    };

    const text = renderTemplate(template, context);

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await axios.post(
        url,
        {
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
        },
        { timeout: 10000 }
      );

      if (response.data && response.data.ok) {
        return {
          channelId: this.id,
          name: this.name,
          success: true,
          message: 'Telegram notification sent successfully.',
        };
      } else {
        return {
          channelId: this.id,
          name: this.name,
          success: false,
          error: response.data?.description || 'Telegram API returned an error.',
        };
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.description || err.message || 'Failed to send Telegram message';
      return {
        channelId: this.id,
        name: this.name,
        success: false,
        error: errorMsg,
      };
    }
  }

  async test(settings: any): Promise<NotificationResult> {
    const mockRepo: Repo = {
      id: 0,
      owner: 'release-monitor',
      repo: 'test-application',
      source_type: 'github',
      last_tag: 'v1.0.0-test',
      check_interval: 60,
      include_prereleases: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockRelease: Release = {
      id: 0,
      repo_id: 0,
      tag_name: 'v1.0.0-test',
      name: 'Test Release 1.0.0',
      body: 'This is a test notification from your Release Monitor system.',
      published_at: new Date().toISOString(),
      html_url: 'https://github.com',
      created_at: new Date().toISOString(),
      prerelease: 0,
    };

    return this.send({ repo: mockRepo, release: mockRelease, isTest: true }, settings);
  }
}

/**
 * Generic Webhook Notification Provider
 * Supports customizable URL, Headers, and JSON or Form payload
 */
export class WebhookNotificationProvider implements NotificationProvider {
  readonly id = 'webhook';
  readonly name = 'Webhook';
  readonly description = 'Send HTTP POST requests with custom payloads to Discord, Slack, n8n, Zapier, or custom services';

  isEnabled(settings: any): boolean {
    return !!(settings.webhook_enabled && settings.webhook_url);
  }

  async send(payload: NotificationPayload, settings: any): Promise<NotificationResult> {
    const webhookUrl = settings.webhook_url?.trim();
    if (!webhookUrl) {
      return {
        channelId: this.id,
        name: this.name,
        success: false,
        error: 'Webhook URL is not configured.',
      };
    }

    const { repo, release } = payload;

    // Parse custom headers
    let headers: Record<string, string> = {
      'User-Agent': 'ReleaseMonitor-Notifier/1.0',
    };

    if (settings.webhook_headers) {
      try {
        const parsed = typeof settings.webhook_headers === 'string'
          ? JSON.parse(settings.webhook_headers)
          : settings.webhook_headers;
        headers = { ...headers, ...parsed };
      } catch (e) {
        // If invalid JSON, ignore or fallback
      }
    }

    const context: Record<string, any> = {
      repo: repo.repo,
      owner: repo.owner,
      version: release.tag_name || repo.last_tag || 'latest',
      name: release.name || release.tag_name || repo.repo,
      source_type: repo.source_type || 'github',
      html_url: release.html_url || (repo.source_type === 'aur' ? `https://aur.archlinux.org/packages/${repo.repo}` : `https://github.com/${repo.owner}/${repo.repo}`),
      body: release.body || '',
      json_body: JSON.stringify(release.body || ''),
      published_at: release.published_at || new Date().toISOString(),
      is_test: !!payload.isTest,
    };

    let postData: any;
    if (settings.webhook_template && settings.webhook_template.trim()) {
      try {
        const rendered = renderTemplate(settings.webhook_template, context);
        // If payload type is JSON, try to parse rendered string
        if (settings.webhook_payload_type !== 'form') {
          postData = JSON.parse(rendered);
        } else {
          postData = rendered;
        }
      } catch (err: any) {
        // Fallback to structured object if template parsing fails
        postData = {
          event: 'new_release',
          repo: repo.repo,
          owner: repo.owner,
          version: release.tag_name,
          source_type: repo.source_type,
          url: release.html_url,
          body: release.body,
          published_at: release.published_at,
        };
      }
    } else {
      postData = {
        event: 'new_release',
        repo: repo.repo,
        owner: repo.owner,
        version: release.tag_name,
        source_type: repo.source_type,
        url: release.html_url,
        body: release.body,
        published_at: release.published_at,
      };
    }

    try {
      const response = await axios.post(webhookUrl, postData, {
        headers,
        timeout: 10000,
      });

      return {
        channelId: this.id,
        name: this.name,
        success: response.status >= 200 && response.status < 300,
        message: `Webhook delivered successfully (HTTP ${response.status}).`,
      };
    } catch (err: any) {
      const statusText = err.response?.status ? `HTTP ${err.response.status}` : '';
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      return {
        channelId: this.id,
        name: this.name,
        success: false,
        error: `${statusText}: ${errMsg || 'Request failed'}`.trim(),
      };
    }
  }

  async test(settings: any): Promise<NotificationResult> {
    const mockRepo: Repo = {
      id: 0,
      owner: 'release-monitor',
      repo: 'test-application',
      source_type: 'github',
      last_tag: 'v1.0.0-test',
      check_interval: 60,
      include_prereleases: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockRelease: Release = {
      id: 0,
      repo_id: 0,
      tag_name: 'v1.0.0-test',
      name: 'Test Release 1.0.0',
      body: 'This is a test notification from your Release Monitor webhook service.',
      published_at: new Date().toISOString(),
      html_url: 'https://github.com',
      created_at: new Date().toISOString(),
      prerelease: 0,
    };

    return this.send({ repo: mockRepo, release: mockRelease, isTest: true }, settings);
  }
}

/**
 * Modular Notification Service
 * Manages an extensible registry of NotificationProvider modules
 */
export class NotificationService {
  private providers: Map<string, NotificationProvider> = new Map();

  constructor() {
    // Register built-in providers
    this.registerProvider(new TelegramNotificationProvider());
    this.registerProvider(new WebhookNotificationProvider());
  }

  /**
   * Register a new notification provider module
   */
  registerProvider(provider: NotificationProvider) {
    this.providers.set(provider.id, provider);
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(id: string) {
    this.providers.delete(id);
  }

  /**
   * Get all registered providers
   */
  getProviders(): NotificationProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get a specific provider by ID
   */
  getProvider(id: string): NotificationProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Broadcast a release notification across all enabled providers
   */
  async notifyAll(payload: NotificationPayload, settings: any): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const provider of this.providers.values()) {
      if (provider.isEnabled(settings)) {
        try {
          const res = await provider.send(payload, settings);
          results.push(res);
        } catch (err: any) {
          results.push({
            channelId: provider.id,
            name: provider.name,
            success: false,
            error: err.message || 'Unhandled error during dispatch',
          });
        }
      }
    }

    return results;
  }

  /**
   * Test a specific notification channel
   */
  async testChannel(channelId: string, settings: any): Promise<NotificationResult> {
    const provider = this.providers.get(channelId);
    if (!provider) {
      return {
        channelId,
        name: channelId,
        success: false,
        error: `Provider '${channelId}' not found in notification registry.`,
      };
    }

    return provider.test(settings);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
