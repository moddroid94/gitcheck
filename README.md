# GitHub Release Monitor

A simple application to monitor GitHub repository releases.
<img width="1387" height="932" alt="image" src="https://github.com/user-attachments/assets/af609f66-7bb9-4ce9-8f55-ec6c32c7072a" />

## Features

- Monitor multiple GitHub repositories.
- Dashboard with repository cards showing details (stars, language, last release).
- View full changelogs for releases.
- Per-repository configuration (check interval).
- Check for new releases periodically.
- Simple web interface to manage repositories.
- No authentication required.

## Configuration

Create a `.env` file with the following variables:

```env
GITHUB_TOKEN=your_github_token # Optional, for higher rate limits
WEB_PORT=9595
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
