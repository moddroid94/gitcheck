# GitCheck - A GitHub/AUR Release Monitor

A simple application to monitor GitHub repository releases.
<img width="1894" height="1025" alt="dms_capture_1794237780209" src="https://github.com/user-attachments/assets/fe84a296-a42b-4874-8e0a-356633e30951" />


## Features

- Monitor multiple GitHub /AUR repositories.
- Dashboard repo card and info (grid or list view)
- View full changelog for releases.
- Per-repository configuration (check interval).
- Check for new releases periodically.
- Simple web interface to manage repositories.
- Telegram and Webhooks notifications with per-repo toggle and template vars.
- No authentication required.

## Configuration

Create a `.env` file with the following variables:

```env
GITHUB_TOKEN=your_github_token # Optional, for higher rate limits
WEB_PORT=6767
```

## Usage

1. Start the server:
   ```bash
   npm run dev
   ```
2. Open the app in your browser.
3. Add repositories (e.g., `moddroid94` / `github-release-monitor`).
4. The app will check for new releases in the background.

## Docker Deployment

1.  Build and start the container:
    ```bash
    docker-compose up -d
    ```

2.  To set the GitHub token, create a `.env` file in the same directory as `docker-compose.yml` or pass it directly:
    ```bash
    GITHUB_TOKEN=your_token docker-compose up -d
    ```

## Database

The application uses a SQLite database (`github-monitor.db`) to store monitored repositories and their last seen release tag.

## Other Screenshots

<img width="1894" height="1025" alt="image" src="https://github.com/user-attachments/assets/1059cd84-88c2-4ea5-aec9-250aba97600b" />
