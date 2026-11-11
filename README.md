# LogSense Server

Backend for the **LogSense** observability platform. It is a Fastify + PostgreSQL API that handles user
authentication, projects, environment-scoped API keys, log ingestion from the LogSense SDKs, dashboard
metrics, an AI "ask your logs" agent, and a scheduled daily AI log report delivered to Discord.

LLM chat and embeddings run through a local [Ollama](https://ollama.com/) server. The `groq.client.ts` and
`gemini.client.ts` modules are kept only as compatibility shims that forward to Ollama.

See [`project.md`](project.md) for the wider product concept.

---

## Features

- **Log ingestion** — `POST /logs`, `POST /events` and `POST /v1/events`, authenticated with a project API key (`x-api-key` header or `Authorization`). Gzip-compressed request bodies (`Content-Encoding: gzip`) are decompressed automatically.
- **Projects and API keys** — multiple projects per account; API keys are scoped per environment and can be rotated, enabled/disabled, deleted and verified.
- **Log search** — paginated listing with filtering, single-log detail and deletion.
- **Dashboard metrics** — overview totals, volume timeline, level breakdown, per-service stats, recent errors and onboarding status.
- **AI log agent** (`POST /projects/:projectId/ai/chat`) — a planner classifies the question and extracts entities, then routes it to tools (`LogsTool`, `MetricsTool`, `TraceTool`, `IssueTool`, `BusinessTool`, `SemanticSearch`, `DocumentationTool`, `GeneralKnowledgeTool`). Low-confidence questions fall back to LLM-generated SQL that is validated to be a read-only, project-scoped `SELECT`. Results are summarized with conversation memory.
- **Semantic search / RAG** — log and document embeddings (768-dim, `nomic-embed-text` by default) stored with `pgvector`.
- **Daily AI report** — a `node-cron` job at 23:59 summarizes each project's logs for the day and posts it to the project's, owner's or global Discord webhook. It can also be triggered per project via `POST /projects/:id/daily-report`.
- **Auth** — JWT (`@fastify/jwt`) with bcrypt password hashing; register, login, logout, refresh, profile and settings (including Discord webhook settings).

## Tech stack

- Node.js, TypeScript, [Fastify 5](https://fastify.dev/)
- Zod + `fastify-type-provider-zod` for request validation
- PostgreSQL (`pg`) with the `pgvector` and `pgcrypto` extensions
- Ollama for chat completions and embeddings
- `node-cron`, `pino`
- `tsx` for development

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL with the [`pgvector`](https://github.com/pgvector/pgvector) extension available (migrations run `CREATE EXTENSION vector`). Note: the provided `docker-compose.yml` uses the stock `postgres:17` image, which does not ship pgvector (needs confirmation / may need a pgvector image).
- An Ollama server with the chat and embedding models you configure pulled (defaults are defined in `src/modules/ai/ollama.client.ts`)

### Setup

```bash
npm install
cp .env.example .env        # fill in your own values
docker compose up -d        # optional: local PostgreSQL
npm run migrate             # apply SQL migrations in src/database/migrations
npm run dev                 # tsx watch src/server.ts
```

The server listens on `0.0.0.0:$PORT` (default `5000`). `GET /health` returns a status check.

To backfill embeddings for existing logs:

```bash
npm run vectorize
```

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | HTTP port (default `5000`) |
| `NODE_ENV` | No | Defaults to `development` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | No | Token lifetime (default `7d`) |
| `OLLAMA_BASE_URL` | No | Ollama server URL (defaults to a local instance) |
| `OLLAMA_CHAT_MODEL` | No | Primary chat model |
| `OLLAMA_CHAT_FALLBACK` | No | Fallback chat model used on timeout / for large prompts |
| `OLLAMA_EMBED_MODEL` | No | Embedding model (must produce 768-dim vectors to match the schema) |
| `OLLAMA_CHAT_TIMEOUT_MS` | No | Chat request timeout (default 90000) |
| `OLLAMA_EMBED_TIMEOUT_MS` | No | Embedding request timeout (default 30000) |
| `DISCORD_WEBHOOK_URL` | No | Global Discord webhook for daily reports |

`.env.example` also lists `GROQ_API_KEY`, which is no longer read by the server code since LLM calls moved to Ollama.

## Scripts

| Script | Command |
| --- | --- |
| `npm run dev` | `tsx watch src/server.ts` |
| `npm run build` | `tsc` |
| `npm start` | `node dist/server.js` |
| `npm run migrate` | Apply pending SQL migrations (tracked in `schema_migrations`) |
| `npm run vectorize` | Generate embeddings for logs that don't have one |

No test script is defined.

## API overview

JWT-protected routes expect `Authorization: Bearer <token>`. Ingestion routes expect a project API key.

### Auth (`/auth`)
`POST /register`, `POST /login`, `POST /logout`, `POST /refresh`, `GET /me`, `PUT /settings`

### Projects (`/projects`)
`POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /:id/daily-report`

### API keys (`/api-keys`)
`POST /projects/:projectId`, `GET /projects/:projectId`, `DELETE /:id`, `POST /:id/rotate`, `PATCH /:id/status`, `GET /verify`

### Logs
- `POST /logs` — ingest (API key)
- `POST /events`, `POST /v1/events` — ingest aliases (API key)
- `GET /logs`, `GET /logs/:id`, `DELETE /logs/:id` — query (JWT)

### Dashboard (`/dashboard`)
`GET /overview`, `GET /timeline`, `GET /log-levels`, `GET /services`, `GET /recent-errors`, `GET /onboarding`

### AI
`POST /projects/:projectId/ai/chat` — body `{ "prompt": "Which API errored most today?" }`

## Project structure

```
src/
  server.ts               Startup: DB connect, daily report scheduler, listen
  app.ts                  Fastify app, gzip hook, error handler, route registration
  config/                 env, PostgreSQL pool, logger
  common/                 errors, JWT service, JWT and API-key auth middleware
  database/
    migrate.ts            Migration runner
    migrations/           SQL migrations (users, projects, api_keys, logs, pgvector, webhooks)
    vectorize-logs.ts     Embedding backfill
  modules/
    auth/ projects/ apiKeys/ logs/ dashboard/
    ai/                   Planner, tool router, tools, SQL fallback + validator, summarizer, Ollama client
    rag/                  Chunking, embeddings, pgvector repository, retrieval
    notifications/        Discord notifications
scratch/                  Ad-hoc development scripts
docker-compose.yml        Local PostgreSQL
```
