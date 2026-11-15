# GitCheck

**A self-hosted release monitor for GitHub repositories and Docker Hub images.**

GitCheck tracks the releases and tags you care about, shows what is installed versus what is available, renders changelogs, groups projects, and sends notifications when something new ships.

<img alt="GitCheck dashboard" src="https://github.com/user-attachments/assets/fe84a296-a42b-4874-8e0a-356633e30951" />

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Notifications](#notifications)
- [How checks work](#how-checks-work)
- [REST API](#rest-api)
- [Database](#database)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)

## Features

### Sources

- Monitor **GitHub repositories** and **Docker Hub images** from one dashboard.
- GitHub releases are read from the Releases API. If a repository has no formal releases, GitCheck falls back to its latest Git tag.
- Docker Hub tags are read from the Docker Hub API. Signature/attestation tags are ignored, pre-release tags are filtered by default, and versioned tags such as `1.31.8-alpine` are preferred over rolling aliases such as `latest`, `stable`, or `edge`.
- Accepts `owner/repo`, GitHub URLs, `gh:owner/repo`, `docker:org/image`, `docker:nginx`, Docker Hub URLs, and plain official image names such as `nginx`.

### Dashboard

- **Grid**, **list**, and **grouped** views.
- Search by repository, owner, description, or group.
- Filter by GitHub, Docker Hub, group, or ungrouped items.
- **Updates only** filter, showing repositories whose installed version differs from the latest detected version.
- Sort by last update, stars, or name in ascending/descending order.
- View mode, filters, sorting, and theme are persisted in the browser.
- Light and dark themes, with system preference detection.
- Responsive layout for desktop and mobile.

### Releases and version tracking

- Stores the latest detected release/tag and the latest changelog.
- Tracks an optional **installed version** per project and highlights available updates.
- Mark a release as installed from the changelog or repository details view.
- Full changelog modal with GitHub-flavored Markdown rendering.
- Release history per repository, with pre-release inclusion controlled per repository.
- Repository details modal with changelog and per-repository settings.

### Organization

- Create custom groups with colors.
- Assign one group per repository, either when adding or later in repository settings.
- Filter the sidebar by group and use the grouped dashboard view.
- Set a default group for newly added repositories.
- Bulk import repositories from a newline-, comma-, or semicolon-separated list, with duplicate detection and per-item success/failure feedback.

### Automation and notifications

- Background scheduler checks repositories based on each repository's configured interval.
- Per-repository **check interval**, **include pre-releases**, and **notifications enabled** settings.
- System-wide defaults for interval, pre-releases, notifications, and default group.
- **Telegram** notifications with customizable message templates and optional forum topic targeting.
- **Generic webhooks** with custom URL, headers, JSON or form payloads, and payload templates.
- Per-repository notification mute toggle.
- Test buttons for each notification channel.
- Notification audit log for delivered, failed, and skipped alerts.
- GitHub and Docker Hub responses are cached for 10 minutes; manual refreshes bypass the cache.

### Operations

- No login or user accounts by default.
- SQLite database, no external database server required.
- Automatic schema setup and lightweight migrations for existing databases.
- Optional GitHub token for higher API rate limits.
- Docker and Docker Compose support.
- SPA served by Express in production, with Vite middleware in development.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4 |
| UI | lucide-react, motion, react-markdown, remark-gfm, date-fns |
| Backend | Node.js, Express 4, tsx |
| Database | SQLite via better-sqlite3 |
| Scheduling | node-cron |
| HTTP client | axios |

## Installation

### Requirements

- **Node.js 20 or newer** (the Docker image uses Node 20).
- **npm**.
- On some platforms, a working C/C++ build toolchain and Python may be required to compile `better-sqlite3`. Prebuilt binaries are used where available.
- Optional: **Docker** and **Docker Compose**.

### Run locally

```bash
git clone https://github.com/moddroid94/gitcheck.git
cd gitcheck
npm install
cp .env.example .env
```

Edit `.env` as needed, then start the development server:

```bash
npm run dev
```

Open **http://localhost:3000**.

The development server runs Express with Vite middleware, so frontend changes are hot-reloaded.

### Production build

```bash
npm run build
NODE_ENV=production npx tsx server.ts
```

The production server serves the built frontend from `dist/` and listens on port **3000**. There is currently no separate `npm start` script; `npx tsx server.ts` is the server entry point.

Useful scripts:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Express + Vite development server |
| `npm run build` | Build the frontend into `dist/` |
| `npm run preview` | Preview the Vite build |
| `npm run lint` | Type-check with `tsc --noEmit` |
| `npm run clean` | Remove the `dist/` directory |

### Docker Compose (recommended for self-hosting)

```bash
cp .env.example .env
# Edit .env and set GITHUB_TOKEN and WEB_PORT as needed
docker compose up -d --build
```

The compose file maps `${WEB_PORT}` on the host to port `3000` inside the container. For example, with `WEB_PORT=6767`, open **http://localhost:6767**.

Data is persisted in `./data`, and the container uses `/app/data/github-monitor.db` as its database path. The service restarts automatically unless stopped.

### Docker without Compose

```bash
docker build -t gitcheck .
docker run -d \
  --name gitcheck \
  -p 6767:3000 \
  -e GITHUB_TOKEN=your_github_token \
  -v "$(pwd)/data:/app/data" \
  --restart unless-stopped \
  gitcheck
```

## Configuration

GitCheck reads configuration from environment variables and a `.env` file.

| Variable | Default | Description |
| --- | --- | --- |
| `GITHUB_TOKEN` | empty | Optional GitHub personal access token. Raises the GitHub API rate limit from 60 to 5,000 requests/hour for unauthenticated vs. authenticated requests. A token with public repository read access is enough for public repositories. |
| `CHECK_INTERVAL` | `60` | Fallback background check interval in minutes. Per-repository intervals and the system default setting take precedence. |
| `WEB_PORT` | `6767` in `.env.example` | **Docker Compose only.** Host port mapped to container port 3000. It does not change the local Node.js server port. |
| `DB_PATH` | `./github-monitor.db` | SQLite database file path. Docker Compose sets this to `/app/data/github-monitor.db`. |
| `NODE_ENV` | unset | Set to `production` to serve the built `dist/` frontend instead of using Vite middleware. |

Example `.env`:

```env
# Optional: raises GitHub API rate limits
GITHUB_TOKEN=ghp_your_token_here

# Docker Compose host port only
WEB_PORT=6767

# Fallback check interval in minutes
CHECK_INTERVAL=60
```

The application port inside the Node.js process is always **3000**. For a non-Docker deployment, use a reverse proxy if you need a different public port.

## Usage

### Add a single repository or image

1. Click **+ ADD REPOSITORY**.
2. Enter a source using any supported format.
3. Optionally choose a group and expand **Show options** to configure:
   - Check interval in minutes.
   - Installed version (for update tracking).
   - Include pre-releases.
   - Release notifications.
4. Click **ADD REPOSITORY**.

Supported input examples:

| Input | Source |
| --- | --- |
| `facebook/react` | GitHub repository |
| `https://github.com/facebook/react` | GitHub repository |
| `gh:facebook/react` | GitHub repository (explicit) |
| `docker:linuxserver/plex` | Docker Hub image |
| `docker:nginx` | Docker Hub official image |
| `https://hub.docker.com/r/linuxserver/plex` | Docker Hub image |
| `docker.io/library/nginx` | Docker Hub official image |
| `nginx` | Docker Hub official image |
| `nginx:latest` | Docker Hub official image (tag is stripped) |

> A plain `owner/repo` is interpreted as GitHub. Use the `docker:` or `dh:` prefix when the source should be Docker Hub.

When a repository is added, GitCheck fetches its metadata, latest release/tag, and recent release history. If you provide an installed version that is older than the latest release, GitCheck can send an initial update notification.

### Bulk import

1. Click **BULK IMPORT**.
2. Enter one source per line. Newlines, commas, and semicolons are all supported.
3. Optionally select a group and configure batch settings.
4. Click **ADD ALL REPOSITORIES**.

Example:

```text
gh:facebook/react
gh:nodejs/node
docker:nginx
docker:linuxserver/plex
https://github.com/rust-lang/rust
```

Duplicate inputs are deduplicated. Already monitored sources are reported as skipped, and invalid or missing sources are reported individually.

### Dashboard controls

- **Search** filters by repository name, owner, description, or group.
- **Source filters** switch between all sources, GitHub, and Docker Hub.
- **Group filters** show a specific group, all groups, or ungrouped repositories.
- **Updates only** shows repositories with a pending installed-to-latest difference.
- **Grid**, **list**, and **grouped** buttons change the layout.
- **Sort** controls order by last update, stars, or name.
- **Refresh all** checks every repository immediately.
- **Settings** opens system settings.
- **Theme button** toggles light/dark mode.
- **Bulk import** opens bulk mode directly.

### Repository actions

Each card or list row provides:

- **Changelog**: open the latest release notes.
- **Refresh**: check that source immediately, bypassing the 10-minute cache.
- **Bell**: enable or mute notifications for that repository.
- **Settings**: open repository details and configuration.
- **Delete**: remove the repository and its stored release history.

### Repository details

Open a repository to access two tabs:

- **Changelog & Releases**: full release history, Markdown changelogs, links to GitHub/Docker Hub, and **Mark as installed** for each release.
- **Repo settings**: assigned group, installed version, check interval, pre-release inclusion, and notification toggle.

For Docker Hub images, the details view also shows namespace, stars, pulls, image size, digest, and supported platforms when available.

### Manage groups

Open **+ MANAGE GROUPS** in the sidebar to:

- Create groups with a name and color.
- Rename or recolor existing groups.
- Delete groups. Repositories in a deleted group become ungrouped.

Groups are available as filters, are displayed as badges on cards and rows, and can be used to organize the grouped dashboard view.

### System settings

Open **SETTINGS** to configure:

#### Default repository settings

- Default check interval.
- Default organization group.
- Include pre-releases by default.
- Enable notifications by default for new sources.

These defaults are applied when adding repositories individually or in bulk, unless overridden in the add form or repository settings.

#### Notifications and webhooks

See [Notifications](#notifications).

## Notifications

Notifications are dispatched when a new release/tag is detected, or when an installed version is behind the latest version and has not yet been notified.

### Telegram

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy its API token.
2. Obtain the target chat ID (for a channel or group, add the bot and use the numeric ID or `@channel_name`).
3. In **Settings → Notifications & Webhooks**, enable Telegram and enter the token and chat ID.
4. Optionally enter a **Topic / Message Thread ID** to send messages to a specific forum topic.
5. Customize the message template if desired.
6. Click **Send test Telegram message**. A successful test also saves and enables the channel.
7. Click **Save settings**.

#### Sending to a forum topic

Telegram forum supergroups organize messages into topics. To post into one, set **Topic / Message Thread ID** to the topic's thread ID, usually the last number in the topic link:

```text
https://t.me/c/123456789/42  →  Topic / Message Thread ID: 42
```

GitCheck sends this value as Telegram's `message_thread_id`. Leave the field blank to keep sending to the chat's default timeline. Topic targeting only applies to forum supergroups and private chats with forum topic mode enabled; broadcast channels do not support topics. If you use a channel's linked discussion group, target that group and topic instead.

Default Telegram template:

```text
🚀 *New Release Detected!*

*Repo/Package:* {{repo}}
*Version:* `{{version}}`
*Published:* {{published_at}}

*Notes:*
{{body}}

[View Release]({{html_url}})
```

Template tokens:

| Token | Value |
| --- | --- |
| `{{repo}}` | Repository or image name |
| `{{owner}}` | GitHub owner or Docker Hub namespace |
| `{{version}}` | Release/tag name |
| `{{name}}` | Release title or tag name |
| `{{published_at}}` | Localized publish timestamp |
| `{{html_url}}` | Release or tag URL |
| `{{source_type}}` | `GitHub Repository` or `Docker Hub` |
| `{{body}}` | Release notes, truncated to 400 characters |

Telegram messages use Markdown formatting. If Telegram rejects the Markdown, GitCheck retries as plain text. Notification text is capped at Telegram's 4,096-character limit.

### Webhooks

1. Enable **Webhook** in settings.
2. Enter the target URL.
3. Choose **JSON** or **Form encoded** payload type.
4. Optionally add custom HTTP headers as a JSON object.
5. Edit the payload template.
6. Click **Send test webhook request**. A successful test also saves and enables the channel.
7. Click **Save settings**.

Default JSON payload:

```json
{
  "event": "new_release",
  "repo": "{{repo}}",
  "owner": "{{owner}}",
  "version": "{{version}}",
  "name": "{{name}}",
  "source": "{{source_type}}",
  "url": "{{html_url}}",
  "body": {{json_body}},
  "timestamp": "{{published_at}}"
}
```

Webhook template tokens include all Telegram tokens plus:

| Token | Value |
| --- | --- |
| `{{json_body}}` | Release notes as a JSON-escaped string, suitable for embedding in JSON |
| `{{is_test}}` | `true` for test dispatches, otherwise `false` |

The default `Content-Type: application/json` header is set in the headers field. The webhook works with Discord, Slack, n8n, Zapier, Home Assistant, and custom HTTP endpoints.

### Per-repository mute

Use the bell button on a card or row, or the notification toggle in repository settings, to mute alerts for a single repository while leaving global channels enabled.

### Dispatch logs

**Settings → Notifications & Webhooks → Recent notification dispatch logs** shows the latest deliveries with status (`delivered`, `failed`, `skipped`), repository, version, channel, details, and timestamp.

Skipped entries are recorded when a repository is muted or when no notification channel is enabled/configured.

## How checks work

- A cron job runs every minute.
- On each tick, GitCheck checks only repositories whose configured check interval has elapsed since their last check.
- Per-repository intervals take precedence over the system default; `CHECK_INTERVAL` is the fallback.
- Checks are spaced with a short delay to reduce burst traffic.
- GitHub and Docker Hub data is cached for **10 minutes**. Scheduled checks that become due bypass the cache; manual refreshes always do.
- If GitHub returns `403` for rate limiting, the background loop stops for that tick and manual refresh returns a rate-limit error.
- A new tag triggers update detection, changelog storage, and notification dispatch. A successful notification records `last_notified_tag` to prevent duplicate alerts.
- If a repository has an installed version older than the latest tag and has not yet been notified for that tag, GitCheck dispatches a pending-update notification.

## REST API

GitCheck exposes a JSON API used by the web frontend.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/repos` | List monitored repositories and images |
| `POST` | `/api/repos` | Add one repository or image |
| `POST` | `/api/repos/bulk` | Bulk add sources |
| `GET` | `/api/repos/:id` | Get one source |
| `PUT` | `/api/repos/:id` | Update interval, pre-releases, installed version, group, or notifications |
| `DELETE` | `/api/repos/:id` | Remove a source and its releases |
| `POST` | `/api/repos/:id/refresh` | Refresh one source immediately |
| `POST` | `/api/repos/refresh-all` | Refresh all sources |
| `GET` | `/api/repos/:id/releases` | Get stored releases; fetch from the source if empty |
| `GET` | `/api/groups` | List groups |
| `POST` | `/api/groups` | Create a group |
| `PUT` | `/api/groups/:id` | Update a group |
| `DELETE` | `/api/groups/:id` | Delete a group |
| `GET` | `/api/settings` | Get system settings |
| `PUT` | `/api/settings` | Update system settings |
| `GET` | `/api/notifications/channels` | List notification providers and enabled state |
| `POST` | `/api/notifications/test` | Send a test notification |
| `GET` | `/api/notifications/logs?limit=30` | Get recent notification logs |

Example: add a GitHub repository with a 30-minute interval and no pre-releases.

```bash
curl -X POST http://localhost:3000/api/repos \
  -H "Content-Type: application/json" \
  -d '{
    "input_string": "gh:facebook/react",
    "check_interval": 30,
    "include_prereleases": false,
    "notifications_enabled": true,
    "installed_version": "19.0.0",
    "group_id": null
  }'
```

Example: add a Docker Hub image.

```bash
curl -X POST http://localhost:3000/api/repos \
  -H "Content-Type: application/json" \
  -d '{
    "input_string": "docker:linuxserver/plex",
    "check_interval": 60
  }'
```

## Database

GitCheck uses SQLite via `better-sqlite3`. The database is created automatically on first start.

Default location:

- Local Node.js: `./github-monitor.db` in the working directory.
- Docker Compose: `/app/data/github-monitor.db`, persisted through the `./data` volume.

Override with `DB_PATH`.

Tables:

| Table | Purpose |
| --- | --- |
| `groups` | Group names, colors, and creation timestamps |
| `monitored_repos` | GitHub/Docker sources, metadata, latest tag, installed version, check interval, group, notification settings |
| `releases` | Cached release/tag history and changelogs |
| `system_settings` | Key/value store for defaults and notification configuration |
| `notification_logs` | Audit trail of delivered, failed, and skipped notifications |

Deleting a repository also deletes its stored releases. Deleting a group sets affected repositories to ungrouped.

To back up the application, stop it and copy the SQLite database file (or the `data/` directory when using Docker).

## Project structure

```text
gitcheck/
├── server.ts                     # Express server, API routes, scheduler, refresh logic
├── src/
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # React entry point
│   ├── config.ts                 # Environment configuration
│   ├── db.ts                     # SQLite schema, migrations, queries
│   ├── types.ts                  # Shared types and default settings
│   ├── index.css                 # Tailwind and global styles
│   ├── components/
│   │   ├── AddRepoForm.tsx       # Single/bulk add modal
│   │   ├── BulkAddRepoForm.tsx   # Bulk import form
│   │   ├── GroupManagerModal.tsx # Group CRUD
│   │   ├── RepoCard.tsx          # Grid card
│   │   ├── RepoRow.tsx           # List row
│   │   ├── RepoList.tsx          # Dashboard, filters, views
│   │   ├── RepoDetails.tsx       # Changelog and repo settings modal
│   │   ├── ReleaseModal.tsx      # Full changelog modal
│   │   ├── SettingsPage.tsx      # System defaults and notifications
│   │   └── Modal.tsx             # Shared modal shell
│   ├── context/
│   │   └── ThemeContext.tsx      # Persisted light/dark theme
│   └── services/
│       ├── github.ts             # GitHub API client and cache
│       ├── dockerhub.ts          # Docker Hub API client and tag logic
│       └── notifications.ts      # Telegram/webhook providers
├── Dockerfile
├── docker-compose.yml
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

## Troubleshooting

### GitHub rate limit exceeded

Unauthenticated GitHub requests are limited to 60 per hour. Add `GITHUB_TOKEN` to `.env` (or the Docker environment) and restart the app. Manual refreshes return a clear rate-limit error, and the background loop pauses when GitHub responds with `403`.

### A repository has no releases

If the repository does not use GitHub Releases, GitCheck falls back to the latest Git tag. The changelog will note that the repository uses tags without formal releases.

### Docker image shows `latest` or an unexpected tag

Docker Hub returns many tag types. GitCheck ignores signature/attestation tags, filters pre-release-style tags unless enabled, and prefers versioned tags over rolling aliases. If a project uses a non-standard tagging scheme, enable pre-releases or verify the tag ordering on Docker Hub.

### Notifications are not arriving

1. Open **Settings → Notifications & Webhooks** and confirm the channel is **ENABLED**.
2. Send a test message and check the result.
3. Confirm the repository's bell is not muted.
4. Check **Recent notification dispatch logs** for `failed` or `skipped` entries.
5. For Telegram, confirm the bot can post to the target chat and that the chat ID and optional topic ID are correct.
6. For webhooks, verify the URL, headers, payload type, and endpoint response status.

### The app starts but the page is blank in production

Run `npm run build` first, and start the server with `NODE_ENV=production`. Without that environment variable, the server expects Vite middleware and does not serve `dist/`.

### Database permission errors

Ensure the process user can write to the database file and its directory. In Docker, the `./data` directory must be writable by the container user. Set `DB_PATH` to a writable location if needed.

### Port already in use

The Node.js server always listens on port 3000. Stop the conflicting process or change the mapping in Docker Compose (`${WEB_PORT}:3000`). For local non-Docker use, put a reverse proxy in front of port 3000.

## Security notes

- GitCheck has **no authentication** by default. Do not expose it directly to the public internet without a reverse proxy, VPN, or authentication layer.
- The app stores notification credentials (Telegram bot token, webhook headers) in the SQLite database in plain text. Protect the database file and backups accordingly.
- A GitHub token is optional but recommended for rate limits. Use a token with the minimum required scope, especially for public repositories.
- Webhook URLs and headers are operator-controlled; treat them as secrets.

## Other screenshots

<img alt="GitCheck release view" src="https://github.com/user-attachments/assets/1059cd84-88c2-4ea5-aec9-250aba97600b" />
