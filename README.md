# Accelute - GitHub PR QA Agent

Automated QA reviewer for pull requests. Trigger with `/qa` on a PR, and the agent will read the PR context, open the preview deployment in a real browser, execute a QA plan, record a 2x-speed demo video, collect evidence, and post a structured report.

## Stack

- **API:** Express + TypeScript
- **Web:** Next.js dashboard
- **DB:** PostgreSQL + Prisma
- **AI:** LangChain.js + Fireworks API
- **Browser:** Playwright (headless, with session video)
- **Evidence:** Cloudflare R2 (screenshots, trace, 2x MP4 demo)

## Quick start

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

- API: http://localhost:3001
- Dashboard: http://localhost:3002

## GitHub App setup

1. Create a GitHub App with webhook URL `https://<your-host>/webhooks/github`
2. Permissions: Pull requests (RW), Issues (RW), Contents (R), Deployments (R), Metadata (R)
3. Subscribe to events: `pull_request`, `issue_comment`, `deployment_status`
4. Install the app on a test repository
5. For local dev, use [smee.io](https://smee.io) to forward webhooks

## Triggering QA

| Command | Behavior |
|---------|----------|
| `/qa` | Resolve preview URL from deployments/PR comments; if none, clone PR head and boot locally |
| `/qa url=https://preview.example.com` | Skip clone; test the given URL |
| `/qa retry` | Rerun the last QA plan |
| Label `qa-needed` | Auto-run on label |
| PR opened/sync | Auto-run (if configured in webhooks) |

## Clone-and-run

When no preview URL is available, the agent:

1. Shallow-clones the PR head branch at the exact commit
2. Auto-detects the framework (Next.js, Vite, CRA, pnpm workspace `apps/web`, static HTML)
3. Runs `install` + `start`, waits for HTTP readiness
4. Records a headless Playwright session, transcodes to a short **2x MP4**
5. Uploads evidence to R2 and embeds `<video>` in the PR comment

Override detection with [`.accelute.yml`](.accelute.yml.example) in the repo root:

```yaml
install: pnpm install --frozen-lockfile
workdir: apps/web
start: npx next dev -p {port}
readyPath: /
```

## Security

Clone-and-run **executes untrusted PR code** on the host running the API (`pnpm install` + dev server). There is no container sandbox in the MVP.

| Env var | Default | Purpose |
|---------|---------|---------|
| `CLONE_AND_RUN_ENABLED` | `true` | Set `false` to only test explicit or discovered preview URLs |
| `ALLOW_FORK_CLONES` | `false` | Set `true` to allow cloning fork head repos (requires app install on fork) |

For production, run the API in an isolated environment (VM, Firecracker, or Docker) and consider disabling clone-and-run.

## R2 public video URL

Inline `<video>` players in PR comments need a stable public URL:

```bash
wrangler r2 bucket dev-url enable qa-agent-evidence
# Set R2_PUBLIC_BASE_URL=https://pub-<hash>.r2.dev in .env
```

Demo videos (`session.mp4`) are publicly readable at that URL. Other evidence uses 24-hour presigned URLs.

## Environment variables

See [.env.example](.env.example) for the full list.

## Project structure

```
apps/api     Express API, webhooks, pipeline, browser automation
apps/web     Next.js dashboard
packages/db  Prisma schema and client
packages/shared  Shared zod schemas and types
```
