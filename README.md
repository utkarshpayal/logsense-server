# LogSense Server

LogSense is an AI-powered observability and log ingestion platform designed for modern development teams. This repository houses the core **LogSense Server**, a high-performance Fastify backend written in TypeScript. It provides log ingestion endpoints, analytical dashboard services, and a safety-validated AI agent that translates natural language questions into secure PostgreSQL queries.

---

## 🚀 Core Features

1. **High-Throughput Ingestion API**:
   - Fastify-powered ingestion endpoint (`POST /logs`) with support for GZIP request body decompression to save bandwidth and decrease latency.
   - API key-based authentication with project scoping.

2. **AI Log Query Engine (Groq Fallback Chain)**:
   - Uses **Groq SDK** to run natural language-to-SQL translation and result summarization.
   - Built-in multi-model fallback chain to ensure high availability:
     1. `llama-3.3-70b-versatile` (Primary)
     2. `llama-3.1-8b-instant`
     3. `mixtral-8x7b-32768`
     4. `gemma2-9b-it`
   - Auto-executes fallback fuzzy matches if the primary query returns 0 rows.

3. **Strict AI Safety & Tenant Scoping**:
   - Blocks write operations (`INSERT`, `UPDATE`, `DELETE`, etc.) at the parsing level.
   - Enforces `project_id` matching on every generated query to prevent cross-tenant data leaks.
   - Implements strict validation for PostgreSQL JSONB operators to ensure syntactic query validity.

4. **Rich Analytics & Dashboard Endpoints**:
   - Provides aggregate statistics, log volume timelines, error breakdowns, and service performance charts.

5. **Multi-Project & Multi-Key Scoping**:
   - Fully featured authentication (register/login with JWT).
   - CRUD management of projects and project-specific API keys.

---

## 🛠️ Tech Stack

- **Runtime & Language**: Node.js & TypeScript
- **Web Framework**: [Fastify](https://fastify.dev/) (utilizing `fastify-type-provider-zod` for type-safe validation)
- **Database**: PostgreSQL (using `pg` driver)
- **AI Integration**: [Groq SDK](https://github.com/groq/groq-typescript) (LLM translation and parsing)
- **Auth**: `@fastify/jwt` & `bcrypt` for secure user sessions and password hashing
- **Development Tooling**: `tsx` (for fast TS execution), `tsc`, `typescript`

---

## 🧱 Project Structure

```
├── dist/                     # Compiled JavaScript files
├── src/
│   ├── common/               # Shared middlewares, error classes, and utilities
│   │   ├── errors/           # Custom HTTP error handlers (BadRequest, NotFound, etc.)
│   │   ├── jwt/              # JWT types and helpers
│   │   └── middleware/       # Authentication (JWT) and API key middleware
│   ├── config/               # DB connections and environment configurations
│   ├── database/             # Migrations runner and SQL scripts
│   │   └── migrations/       # SQL files for schema setup
│   ├── modules/              # Feature modules (Domain-driven structure)
│   │   ├── ai/               # AI query and Groq translation services
│   │   ├── apiKeys/          # API Key CRUD and management
│   │   ├── auth/             # User registration and authentication
│   │   ├── dashboard/        # Analytics aggregation routes
│   │   ├── logs/             # Log ingestion, retrieval, and schema definitions
│   │   ├── projects/         # Project isolation and management
│   │   └── users/            # User models
│   ├── types/                # TypeScript declaration extensions
│   ├── app.ts                # Fastify app initialization and global hooks
│   └── server.ts             # Application entrypoint
├── docker-compose.yml        # PostgreSQL service definition
├── package.json              # App scripts and dependencies
├── tsconfig.json             # TypeScript compiler settings
└── project.md                # Project documentation and specifications
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js**: `v18.x` or later
- **Docker**: For running the PostgreSQL instance
- **Groq API Key**: For AI querying features

### 1. Clone & Install Dependencies

```bash
cd logsense-server
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/logsense
JWT_SECRET=your_super_secret_jwt_token_key_here
JWT_EXPIRES_IN=7d
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 3. Spin Up PostgreSQL Database

Use Docker to start the Postgres container:

```bash
docker-compose up -d
```

### 4. Run Database Migrations

Apply the migration scripts to initialize the database schema:

```bash
npm run migrate
```

### 5. Start the Server

**Development Mode (auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm start
```

---

## 🗄️ Database Schema

The core table `logs` stores both metadata and structural fields:

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, auto-generated |
| `project_id` | `UUID` | References user project (not null) |
| `api_key_id` | `UUID` | References API key used for ingestion |
| `level` | `VARCHAR` | Log level: `debug`, `info`, `warn`, `error` |
| `message` | `TEXT` | Log message / trace details |
| `service` | `VARCHAR` | Microservice identifier (e.g. `auth-service`) |
| `environment`| `VARCHAR` | Deployment environment (e.g. `production`) |
| `metadata` | `JSONB` | Structured JSON containing arbitrary attributes |
| `trace_id` | `VARCHAR` | Correlation trace ID for distributed tracing |
| `request_id` | `VARCHAR` | HTTP Request trace ID |
| `hostname` | `VARCHAR` | Origin host server name |
| `created_at` | `TIMESTAMPTZ` | Timestamp of the log occurrence |

---

## 🔌 API Reference

### 🔐 Authentication
* **POST** `/auth/register` - Register a new user account.
* **POST** `/auth/login` - Authenticate and retrieve a JWT token.

### 📁 Projects
* **POST** `/projects` - Create a new project.
* **GET** `/projects` - List all projects owned by the user.
* **GET** `/projects/:id` - Fetch details of a project.
* **PUT** `/projects/:id` - Update project details.
* **DELETE** `/projects/:id` - Delete a project and its associated data.

### 🔑 API Keys
* **POST** `/api-keys` - Generate a new API key for a project.
* **GET** `/api-keys` - List active API keys.
* **DELETE** `/api-keys/:id` - Revoke an API key.

### 📥 Log Ingestion
* **POST** `/logs`
  * **Headers**: `x-api-key: <YOUR_API_KEY>`, `content-encoding: gzip` (optional)
  * **Body**: Single log or array of logs matching the ingestion Zod schema.

### 🔍 Log Retrieval
* **GET** `/logs` - Retrieve logs for a project (supports pagination and query parameters).
* **GET** `/logs/:id` - Get detail of a specific log line.

### 📊 Analytics & Dashboard
* **GET** `/dashboard/overview` - Basic summary counts and rates.
* **GET** `/dashboard/timeline` - Log count buckets grouped by timestamp.
* **GET** `/dashboard/log-levels` - Log count grouped by levels.
* **GET** `/dashboard/services` - Log count grouped by origin services.
* **GET** `/dashboard/recent-errors` - List of most recent error logs.

### 🤖 AI Log Assistant
* **POST** `/projects/:projectId/ai/chat`
  * **Headers**: `Authorization: Bearer <JWT_TOKEN>`
  * **Body**:
    ```json
    {
      "prompt": "Which service failed the most in the last 2 hours?"
    }
    ```
  * **Response**:
    ```json
    {
      "success": true,
      "answer": "The payment-service failed the most with 12 validation timeout errors.",
      "sql": "SELECT ...",
      "explanation": "Queries logs matching the error levels in the last 2 hours.",
      "data": [...]
    }
    ```

---

## 🔒 Security Highlights

- **SQL Injection Prevention**: The AI generated SQL is programmatically checked to confirm it strictly contains read-only commands (`SELECT`) and specifically restricts destructive functions.
- **Tenant Isolation**: Every database interaction enforces `project_id = <UUID>` fetched from the JWT context of the request, preventing users from seeing logs of projects they do not own.
- **Fail-safe Fuzzy Fallback**: If the query generator constructs a search syntax that returns 0 rows, the system automatically triggers a text-search query containing key phrases from the original user prompt to find partial matches.
