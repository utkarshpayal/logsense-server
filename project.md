LogSense — AI-Powered Observability Library for Developers

Drop-in logging SDK that captures detailed request/error/performance data from your app, and lets you ask questions in plain English about what's happening in your system — no dashboards, no manual log greping.



🎯 The Problem

When something breaks in production, debugging usually means:

Scrolling through thousands of raw log lines
Manually correlating timestamps across services
Waiting on a senior engineer because juniors don't know "where to even look"
Paying $$$ for tools like Datadog/New Relic that are overkill for small teams

LogSense solves this by combining lightweight auto-instrumentation with an AI chatbot layer, so any developer (or even a non-technical PM) can just ask:

"Which API errored the most in the last hour?" "What did user_id 4521 do before checkout failed?" "Compare today's error rate to yesterday's."

...and get an instant, accurate answer — backed by real structured data, not guesses.



✨ Core Features

1. Auto-Instrumentation SDK

Drop-in middleware for Express / FastAPI / Django (more languages later)
Captures automatically: route, method, status code, latency, user ID (if available), timestamp, error stack traces
Zero blocking — logs are buffered and flushed asynchronously in the background, so your app's response time is never affected
Local buffering + retry if the logging backend is temporarily unreachable (no data loss)

2. Smart Sampling

100% of errors and slow requests are always captured
Successful/normal requests are sampled (configurable %) to avoid overwhelming storage
Sampling rate auto-increases temporarily if a new error pattern starts repeating

3. Distributed Tracing

Every incoming request gets a trace_id, propagated across internal service calls via headers
Lets you reconstruct the full path of a request across multiple microservices
Answers questions like: "Was checkout slow because of the DB query or the payment service call?"

4. PII Redaction

Sensitive fields (emails, passwords, card numbers, tokens) are automatically detected and redacted before logs ever leave the client app
Ensures sensitive data never touches your storage layer — important for compliance and trust

5. Anomaly Detection & Alerting

Maintains a rolling baseline (avg + std deviation) of latency/error rate per endpoint
Auto-flags when an endpoint deviates significantly (e.g., 3x normal error rate)
Pushes alerts to Slack/email/webhook
Chatbot can proactively say: "Error rate on /checkout spiked 5x in the last hour."

6. AI Chatbot Query Layer

Ask questions in natural language → gets converted into a validated, safe structured query → runs against aggregated log data → result is translated back into a clear answer
Supports: usage stats, error breakdowns, user session timelines, comparisons (this week vs last week), root-cause hints
Daily/weekly digest: chatbot proactively summarizes system health every morning

7. Role-Based Access (Multi-team safety)

If multiple teams/projects share the system, each chatbot query is scoped to only the data that team/user is allowed to see

8. Tiered Log Retention

Recent logs (e.g., 7 days): full detail, fast storage
Older logs: aggregated/compressed and moved to cheaper cold storage
Keeps cost manageable as log volume grows



🧱 Architecture Overview

┌─────────────────┐
│   Your App       │
│  (Node/Python)   │
│                  │
│  LogSense SDK    │──┐  (async, non-blocking)
└─────────────────┘  │
                      ▼
            ┌──────────────────┐
            │ Ingestion API     │  (fast write endpoint)
            └──────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  Message Queue    │  (Kafka / Redis Streams)
            │  (decouples write │
            │   from processing)│
            └──────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  Processing Layer │
            │ - PII redaction   │
            │ - Aggregation     │
            │ - Anomaly check   │
            └──────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │   Storage Layer   │
            │ (ClickHouse /     │
            │  Postgres+Timescale)│
            └──────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  Query Validation │  (whitelists tables/columns,
            │      Layer        │   blocks destructive queries,
            └──────────────────┘   enforces timeouts)
                      │
                      ▼
            ┌──────────────────┐
            │   AI Chatbot      │  (NL → structured query →
            │  (LLM-powered)    │   run → NL answer)
            └──────────────────┘
                      │
                      ▼
              👨‍💻 Developer asks:
          "Which API errored most today?"



🔁 Request Flow (Step by Step)

Request hits your app → LogSense middleware intercepts it
Metadata captured: route, latency, status, user context, errors (if any)
PII redaction runs locally before anything leaves the app
Log event buffered in memory, flushed in a batch every few seconds (async, non-blocking)
Ingestion API receives the batch, pushes it to a queue (Kafka/Redis Streams)
Processing workers consume from the queue:

Compute pre-aggregations (per-minute/hour rollups)
Run anomaly detection against rolling baseline
Store raw + aggregated data
If anomaly detected → alert sent to Slack/webhook
Developer opens chatbot, types a question
LLM converts question → structured query (e.g., SQL) using the known schema
Validation layer checks the query (read-only, whitelisted tables, query timeout)
Query executes against aggregated/raw tables
Result passed back to LLM → converted into a natural language answer
Developer gets the answer directly in chat — no dashboards, no manual digging



🛠️ Tech Stack

Layer

Technology

Why

SDK

Node.js (TypeScript) + Python (FastAPI/Django middleware)

Covers most common backend stacks

Ingestion API

Fastify / Express

Lightweight, high throughput

Queue

Kafka or Redis Streams

Decouples ingestion from processing, handles burst traffic

Storage

ClickHouse (or Postgres + TimescaleDB)

Built for time-series/log analytics at scale

Cache

Redis

For rate limiting, recent aggregates, anomaly baselines

AI Layer

Claude / GPT API (function calling)

NL → structured query generation, and response generation

Alerting

Webhooks → Slack/Email

Real-time anomaly notifications

Dashboard (optional)

React + simple charts

For teams who still want a visual view alongside the chatbot



🔒 Safety & Validation (Important Design Decision)

Since the chatbot generates queries dynamically via an LLM, we never trust the generated query blindly:

Only SELECT queries allowed — no writes/deletes ever reach the DB
Whitelisted tables/columns only
Query timeout enforced (kills long-running queries)
Per-tenant scoping enforced at the query layer (not just trusted from the LLM output)

This is one of the most important engineering decisions in this project — it's what makes "AI talks to your database" safe to actually use.



🚀 Example Usage (developer's perspective)

npm install logsense-sdk

const logsense = require('logsense-sdk');
app.use(logsense.middleware({ apiKey: 'YOUR_KEY' }));

That's it. From here, all requests/errors are automatically tracked, and you can open the LogSense chatbot and ask:

You: Which endpoint had the most 500 errors today?
LogSense: /api/checkout had 23 errors today (up from 4 yesterday), 
          mostly starting after 2:15 PM — correlates with the v2.3.1 deploy.



🧪 Real Example: 3 Services Called from Frontend

To make this concrete, here's how LogSense behaves in a real-ish e-commerce app where the frontend calls 3 backend services: Auth Service, Catalog Service, and Order Service.

The Scenario

Frontend (React app)
   │
   ├──► 1. Auth Service        POST /auth/login
   │
   ├──► 2. Catalog Service      GET /products?category=shoes
   │
   └──► 3. Order Service        POST /orders/checkout

User flow: logs in → browses shoes → tries to checkout → checkout fails.

What Each Service Sends to LogSense (via the SDK)

1. Auth Service — POST /auth/login

{
  "trace_id": "trc_8a91f2",
  "service": "auth-service",
  "route": "/auth/login",
  "method": "POST",
  "status": 200,
  "latency_ms": 142,
  "user_id": "u_4521",
  "timestamp": "2026-06-27T10:02:11Z"
}

LogSense SDK auto-attaches user_id once it's known, and generates the trace_id that gets passed forward to every subsequent call this user makes (sent back to the frontend, which forwards it as a header on the next requests).

2. Catalog Service — GET /products?category=shoes

{
  "trace_id": "trc_8a91f2",
  "service": "catalog-service",
  "route": "/products",
  "method": "GET",
  "status": 200,
  "latency_ms": 310,
  "user_id": "u_4521",
  "timestamp": "2026-06-27T10:02:40Z"
}

Same trace_id continues — LogSense now knows this request belongs to the same user session as the login above.

3. Order Service — POST /orders/checkout

{
  "trace_id": "trc_8a91f2",
  "service": "order-service",
  "route": "/orders/checkout",
  "method": "POST",
  "status": 500,
  "latency_ms": 2400,
  "user_id": "u_4521",
  "error": "PaymentGatewayTimeoutError",
  "timestamp": "2026-06-27T10:03:05Z"
}

This one fails — high latency (2.4s, way above normal) and a real error captured automatically by the SDK's error-handling hook (no manual try/catch logging needed by the developer).

What LogSense Can Now Do With This Data

Because all 3 events share the same trace_id and user_id, the chatbot can answer things no single service's logs could answer alone:

Q: "What happened with user u_4521's checkout just now?"

User u_4521 logged in at 10:02:11, browsed shoes (310ms, fine), then checkout failed at 10:03:05 with a PaymentGatewayTimeoutError — request took 2.4s before failing, which is ~8x your normal checkout latency.

Q: "Is this happening to other users too, or just this one?"

LogSense checks how many other trace_ids hit /orders/checkout with status 500 + PaymentGatewayTimeoutError in the same time window → "Yes, 14 other users hit the same error in the last 20 minutes — looks like the payment gateway itself is degraded, not a single-user issue."

Q: "Which of the 3 services is the slowest in this user's journey?"

Order Service — checkout took 2.4s vs Auth (142ms) and Catalog (310ms). This is where to investigate first.

Q: "Show me everything that happened across all services for this user in the last hour."

Reconstructs the full cross-service timeline using trace_id/user_id correlation — login → browse → failed checkout — even though the data physically lives in 3 separate services' logs.

Why This Matters (the "so what")

Without a shared trace_id, each service's logs are isolated — Auth team sees only auth logs, Order team sees only order logs, and nobody has the full picture. A developer debugging the checkout failure would have to manually go ask the Auth and Catalog teams "did anything weird happen for this user?" — slow and error-prone.

LogSense stitches these together automatically, so one question to the chatbot reconstructs the entire cross-service story — this is genuinely what tools like Datadog APM / Honeycomb solve in production, and it's the single most "wow" feature to demo in an interview.



📌 Roadmap / Future Ideas

[ ] Session replay (reconstruct full user journey before an error)
[ ] Natural language alert rule creation ("alert me if /payment errors exceed 5%")
[ ] Multi-language SDK support (Go, Java)
[ ] Cost/usage-based insights ("which API costs the most in compute time")



💡 Why This Project Exists

Most debugging time isn't spent fixing bugs — it's spent finding them. LogSense turns observability into a conversation, so any developer (or even non-technical teammate) can get answers about system health instantly, without needing to know query languages or dig through raw logs.