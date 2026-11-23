# ATI Motors - Robotics Runbook Assistant

An internal, production-grade operational knowledge base and troubleshooting assistant built for robotics operations interns and support engineers at **ATI Motors**.

The assistant connects directly to a **PostgreSQL** database indexed with Notion operational runbooks, providing **grounded, zero-hallucination troubleshooting steps**, syntax-highlighted terminal commands with one-click copy, verified safety warnings, and clear source references.

---

## 1. System Architecture

```
                                  +------------------------------------+
                                  |     ATI Operations Engineer /      |
                                  |         Robotics Intern            |
                                  +-----------------+------------------+
                                                    |
                         +--------------------------+--------------------------+
                         |                                                     |
                         v                                                     v
          +-------------------------------+                     +-------------------------------+
          |   React 18 + TypeScript SPA   |                     |     Zendesk Support Sidebar   |
          |   Vite + Tailwind CSS v4      |                     |    (ZAF v2 Iframe Extension)  |
          +---------------+---------------+                     +---------------+---------------+
                          |                                                     |
                          |                 REST API (/api/...)                 |
                          +-------------------------+---------------------------+
                                                    |
                                                    v
                                  +------------------------------------+
                                  |         FastAPI 0.115 Backend      |
                                  |         Python 3.11 / Pydantic v2  |
                                  +-----------------+------------------+
                                                    |
                 +----------------------------------+----------------------------------+
                 |                                  |                                  |
                 v                                  v                                  v
    +-------------------------+        +-------------------------+        +-------------------------+
    |  Ingestion Pipeline     |        |  Search & Assistant     |        |  Alembic 1.13           |
    |  - Notion CSV Parser    |        |  - Faceted Search       |        |  - Database Migrations  |
    |  - Markdown Parser      |        |  - Grounded Retrieval   |        |  - Versioned DDL        |
    |  - Deduplication Hasher |        |  - Strict Zero-Halluc.  |        +-------------------------+
    +------------+------------+        +------------+------------+                     |
                 |                                  |                                  |
                 +----------------------------------+----------------------------------+
                                                    |
                                                    v
                                  +------------------------------------+
                                  |      PostgreSQL 15 Database        |
                                  |  - runbooks                        |
                                  |  - runbook_steps                   |
                                  |  - ingestion_jobs                  |
                                  |  - conversations & messages        |
                                  |  (pgvector ready for Phase 4)      |
                                  +------------------------------------+
```

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite 6, Tailwind CSS v4, Lucide Icons |
| **Backend** | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic 1.13, Uvicorn |
| **Database** | PostgreSQL 15 (with indexed full-text retrieval and pgvector readiness) |
| **DevOps & Containers** | Docker, Docker Compose, Nginx Alpine, Multi-stage builds |

---

## 3. Database Schema

The database uses a normalized schema with cascade deletes, timestamps, and indexes:

1. **`runbooks`**:
   - `id`: UUID primary key.
   - `title`: Runbook name (indexed).
   - `description`: Overview or scope of the procedure.
   - `form_type`, `ticket_type`, `category`, `product_area`, `components`: Facet metadata.
   - `source_type`: `notion_csv`, `notion_md`, or `notion_api`.
   - `source_page_id`, `source_url`: Backlinks to original Notion pages.
   - `content_hash`: SHA256 deterministic hash of title, metadata, and steps for **idempotent re-imports**.
   - `created_at`, `updated_at`: Timestamps.

2. **`runbook_steps`**:
   - `id`: UUID primary key.
   - `runbook_id`: Foreign key referencing `runbooks.id` (ON DELETE CASCADE).
   - `step_number`: Numeric ordering (1, 2, 3...).
   - `step_title`: Short descriptive title of the step.
   - `command`: Exact terminal/docker command string.
   - `instruction`: Detailed instructions and checklist bullets.
   - `warning`: Safety warning or danger alerts.
   - `notes`: Operational tips, parameter thresholds, and diagnostic hints.

3. **`ingestion_jobs`**:
   - `id`: UUID primary key.
   - `source_type`: Format imported (`csv`, `markdown`).
   - `status`: `pending`, `processing`, `completed`, `failed`.
   - `records_processed`, `records_created`, `records_updated`, `records_skipped`.
   - `error_summary`, `details`: JSON validation notes and skipped row reports.
   - `started_at`, `completed_at`.

4. **`conversations` & `messages`**:
   - Persists intern troubleshooting sessions and message exchanges for Zendesk audit trails.

---

## 4. Setup and Quickstart

### Prerequisites
- Docker & Docker Compose (`docker compose version` >= 2.0)
- (Optional for standalone local execution: Python 3.10+ and Node 20+)

### Step 1: Clone and Configure Environment
```bash
git clone <repository_url> askati
cd askati

# Copy environment template
cp .env.example .env
```

Review `.env` settings:
```env
ENVIRONMENT=development
DATABASE_URL=postgresql://runbook_user:runbook_pass@localhost:5432/runbooks_db
POSTGRES_USER=runbook_user
POSTGRES_PASSWORD=runbook_pass
POSTGRES_DB=runbooks_db
ADMIN_API_KEY=ati_admin_dev_secret_change_in_prod
```

### Step 2: Start All Services via Docker Compose
```bash
docker compose up -d
```
This starts:
- **`runbook_db`**: PostgreSQL 15 on port `5432`
- **`runbook_backend`**: FastAPI on port `8000`
- **`runbook_frontend`**: Production Nginx SPA on port `5173`

Verify services:
```bash
docker compose ps
```

### Step 3: Run Alembic Migrations
```bash
# Run migrations using the included helper wrapper or docker
./bin/alembic upgrade head
```

### Step 4: Seed Database with Initial Runbooks
To populate the database with the Notion runbooks and sample exports:
```bash
./bin/py /app/backend/seed.py
```
This loads:
- `data/sample_exports/Runbooks 31271982801b8058ba26f93f067050c8.csv` (24 real Notion runbooks)
- `data/sample_exports/sample_fictional_notion_runbook.csv` (3 sample procedures)
- `data/sample_exports/sample_markdown_export/*.md` (Lidar & Heatmap Markdown exports)

---

## 5. Web Interface Access

Open your browser to:
- **Web Application**: [http://localhost:5173](http://localhost:5173)
- **Interactive Backend Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Endpoint**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Features in the Web App
1. **Chat Workspace**:
   - Ask questions like:
     - *"How do I generate a map?"*
     - *"How can I investigate an obstacle detection issue?"*
     - *"How do I inspect the Lidar frame for a detected obstacle?"*
     - *"Which runbook covers the Streamlit visualizer?"*
     - *"What command is documented for map generation?"*
   - Displays numbered step cards with 1-click **Copy Command** buttons.
   - Highlights **Operational Warnings** and **Documentation Notes**.
   - Surfaces **Grounded Source Badges** linking directly to the full runbook.
   - Provides clickable **Recommended Follow-up Questions**.

2. **Runbook Knowledge Base**:
   - Filter runbooks by **Product Area** (Map, Sensor, Streamlit, Battery, Navigation, Motors).
   - Filter by **Category** (Software, Hardware) and **Ticket Type** (Knowledge, Incident, Problem).
   - Instant search across runbook titles, component tags, and commands.
   - Full-detail drawer with complete ordered steps and Notion metadata.

3. **Ingestion Pipeline (Admin)**:
   - Upload new Notion CSV exports or Markdown files.
   - **Dry-Run Preview & Validation**: inspects valid rows, identifies skipped rows (such as blank Notion select-option templates), and flags validation warnings before committing.
   - Idempotent commit: safely re-imports without creating duplicate runbooks or duplicate steps.
   - Ingestion Job Audit table with execution times and records counts.

4. **Zendesk Support Mode**:
   - Interactive simulation of how the widget operates inside the Zendesk Support agent sidebar.
   - Automatically detects ticket tags and error codes (e.g. `Lidar`, `Obstacle`) to surface immediate troubleshooting procedures.

---

## 6. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health & PostgreSQL connectivity check |
| `GET` | `/api/runbooks` | List runbooks with search, pagination, and facet filters |
| `GET` | `/api/runbooks/{id}` | Detailed runbook with all ordered troubleshooting steps |
| `GET` | `/api/search?q={term}` | Quick search across titles, commands, and instructions |
| `POST` | `/api/assistant/chat` | Natural language question retrieval endpoint |
| `POST` | `/api/ingestion/preview` | Dry-run validation preview for CSV / Markdown exports |
| `POST` | `/api/ingestion/import` | Idempotent database commit for runbook exports |
| `GET` | `/api/ingestion/jobs` | History of previous ingestion jobs |
| `GET` | `/api/conversations` | List persistent chat sessions |
| `GET` | `/api/conversations/{id}` | Message history for a session |

---

## 7. Running Automated Tests

Both backend and frontend test suites are fully automated and verified:

### Backend Tests (pytest)
Runs 7 comprehensive tests covering health, CSV import, Markdown import, Notion empty row sanitization, idempotent re-imports, search, and assistant retrieval:
```bash
./bin/pytest /app/backend/tests -v
```

### Frontend Tests (Node 20 test runner)
Runs tests covering bundle artifact verification, API contract serialization, and command sanitization:
```bash
docker run --rm -v $(pwd)/frontend:/app -w /app node:20-alpine node --test tests/frontend.test.mjs
```

---

## 8. Zendesk Apps Framework (ZAF v2) Integration Guide

To embed this assistant into Zendesk Support for tier-1/tier-2 support engineers:

1. **Sidebar App Manifest (`manifest.json`)**:
   ```json
   {
     "name": "ATI Robotics Runbook Assistant",
     "author": { "name": "ATI Motors Operations" },
     "defaultLocale": "en",
     "location": {
       "support": {
         "ticket_sidebar": {
           "url": "https://runbooks.internal.atimotors.com/zendesk",
           "flexible": true
         }
       }
     },
     "frameworkVersion": "2.0"
   }
   ```

2. **Ticket Context Handshake**:
   The widget listens to Zendesk Client events:
   ```javascript
   const client = ZAFClient.init();
   client.get(['ticket.subject', 'ticket.tags', 'ticket.description']).then(function(data) {
     const query = data['ticket.subject'];
     // Request grounded runbook from assistant
     fetch('/api/assistant/chat', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ query, ticket_context: data })
     });
   });
   ```

3. **Authentication Boundary**:
   In production, Zendesk communicates using JSON Web Tokens (JWT) signed with `ZENDESK_SHARED_SECRET` validated by the FastAPI dependency `verify_admin_key`.

---

## 9. Semantic Search & pgvector Roadmap

The initial version uses PostgreSQL full-text indexing and exact keyword ranking. When company infrastructure authorizes embedding models:

1. Enable pgvector extension in PostgreSQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
2. Enable setting in `.env`:
   ```env
   ENABLE_PGVECTOR=true
   EMBEDDING_MODEL=text-embedding-3-small
   ```
3. Run Alembic migration `002_add_pgvector.py` adding `embedding vector(1536)` to `runbooks` and `runbook_steps`.
4. The retrieval layer in `assistant_service.py` switches to hybrid retrieval (combining keyword BM25 with cosine similarity `embedding <=> query_vec`).

---

## 10. Security Compliance

- **No Secrets in Frontend**: All database credentials and admin keys reside strictly on the backend.
- **Never Commit `.env`**: `.gitignore` strictly excludes `.env` and secret files.
- **Strict Parameterized SQL**: All queries use SQLAlchemy ORM expressions; zero raw string interpolation.
- **Non-Executable Policy**: Commands are rendered in formatted code blocks with copy utilities only; the application never executes arbitrary commands on the host machine or robot hardware.
- **Zero Hallucination Guardrails**: If an operational procedure is not in the verified database, the assistant refuses to generate fictional terminal commands.
# askAti
