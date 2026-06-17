# Accelute - GitHub PR QA Agent

Automated QA reviewer for pull requests. Trigger with `/qa` on a PR, and the agent will read the PR context, open the preview deployment in a real browser, execute a QA plan, collect evidence, and post a structured report.

## Stack

- **API:** Express + TypeScript
- **Web:** Next.js dashboard
- **DB:** PostgreSQL + Prisma
- **AI:** LangChain.js + Fireworks API
- **Browser:** Playwright (default), Camofox optional
- **Evidence:** Cloudflare R2

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

- Comment `/qa` on a pull request
- Comment `/qa url=https://preview.example.com` to provide a preview URL
- Comment `/qa retry` to rerun
- Label a PR with `qa-needed`
- Open or update a PR (auto-runs on open/sync)

## Environment variables

See [.env.example](.env.example) for the full list.

## Project structure

```
apps/api     Express API, webhooks, pipeline, browser automation
apps/web     Next.js dashboard
packages/db  Prisma schema and client
packages/shared  Shared zod schemas and types
```
