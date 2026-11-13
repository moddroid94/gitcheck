export interface Group {
  id: number;
  name: string;
  color?: string;
  created_at?: string;
  repo_count?: number;
}

export interface Repo {
  id: number;
  owner: string;
  repo: string;
  source_type?: 'github' | 'aur';
  last_tag: string;
  last_notified_tag?: string | null;
  installed_version?: string;
  description?: string;
  language?: string;
  stargazers_count?: number;
  popularity?: number;
  avatar_url?: string;
  check_interval: number;
  include_prereleases: number; // 0 or 1
  notifications_enabled?: number; // 0 or 1, defaults to 1
  group_id?: number | null;
  group_name?: string | null;
  group_color?: string | null;
  created_at: string;
  updated_at: string;
  latest_release_body?: string;
  latest_release_html_url?: string;
  latest_release_published_at?: string;
  latest_release_name?: string;
}

export interface NotificationLog {
  id: number;
  repo_id: number | null;
  repo_name: string;
  tag_name: string;
  channel: string;
  status: 'delivered' | 'failed' | 'skipped';
  message: string;
  created_at: string;
}

export interface Release {
  id: number;
  repo_id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  created_at: string;
  prerelease: number; // 0 or 1
}

export interface SystemSettings {
  default_check_interval: number;
  default_include_prereleases: boolean;
  default_notifications_enabled: boolean;
  default_group_id: number | null;
  telegram_enabled: boolean;
  telegram_bot_token: string;
  telegram_chat_id: string;
  telegram_template: string;
  webhook_enabled: boolean;
  webhook_url: string;
  webhook_headers: string; // JSON string
  webhook_payload_type: 'json' | 'form';
  webhook_template: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  default_check_interval: 60,
  default_include_prereleases: false,
  default_notifications_enabled: true,
  default_group_id: null,
  telegram_enabled: false,
  telegram_bot_token: '',
  telegram_chat_id: '',
  telegram_template: '🚀 *New Release Detected!*\n\n*Repo/Package:* {{repo}}\n*Version:* `{{version}}`\n*Published:* {{published_at}}\n\n*Notes:*\n{{body}}\n\n[View Release]({{html_url}})',
  webhook_enabled: false,
  webhook_url: '',
  webhook_headers: '{\n  "Content-Type": "application/json"\n}',
  webhook_payload_type: 'json',
  webhook_template: '{\n  "event": "new_release",\n  "repo": "{{repo}}",\n  "owner": "{{owner}}",\n  "version": "{{version}}",\n  "name": "{{name}}",\n  "source": "{{source_type}}",\n  "url": "{{html_url}}",\n  "body": {{json_body}},\n  "timestamp": "{{published_at}}"\n}',
};
