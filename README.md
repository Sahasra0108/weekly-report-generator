# Weekly Report Generator 

A full-stack tool for structured weekly reporting with a manager review cycle.
Team members file a weekly report against a fixed field structure; managers
review, approve, or send it back with a comment. Every submission is versioned,
so past versions stay readable in full.

- **Live Demo:** [Open Application](https://weekly-report-generator-bh6x.vercel.app)
- **API:** [API Endpoint](https://weekly-report-generator-azure.vercel.app/api/v1)
- **API Docs:** [Swagger Documentation](https://weekly-report-generator-azure.vercel.app/docs)
  
<img width="1912" height="862" alt="image" src="https://github.com/user-attachments/assets/abdc59b4-3b19-4a5a-adba-c9a756d2f8c6" />
<img width="1901" height="862" alt="image" src="https://github.com/user-attachments/assets/27a06305-08b0-453c-8380-8327c4ffb7ee" />
<img width="1897" height="856" alt="image" src="https://github.com/user-attachments/assets/45ff4bd8-c12f-412a-b305-73e136394b72" />




## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Recharts |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 |
| Database | MySQL 8 |
| Auth | JWT in an HTTP-only cookie, bcrypt |
| AI | Google Gemini with function calling |
| Tests | pytest, 30 tests on in-memory SQLite |

---

## Quick start with Docker

The fastest way to run everything. No local Python, Node or MySQL needed.

```bash
git clone https://github.com/Sahasra0108/weekly-report-generator.git
cd weekly_report_generator
docker compose up --build
```

Once the containers are up, seed the database in a second terminal:

```bash
docker compose exec backend python -m app.db.seed --reset
```

Open http://localhost:3000

To include the AI assistant, set a Gemini API key before starting:

```bash
# Windows PowerShell
$env:GEMINI_API_KEY = "your_key"

# macOS / Linux
export GEMINI_API_KEY=your_key
```

The app runs without a key — the assistant simply reports that it isn't configured.

To stop and remove the database volume:

```bash
docker compose down -v
```

---

## Manual setup

### Requirements

- Python 3.12
- Node.js 20
- MySQL 8

### 1. Database

```sql
CREATE DATABASE weekly_reports
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'wr_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON weekly_reports.* TO 'wr_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Backend

```bash
cd backend

python -m venv venv
source venv/bin/activate        # Windows: .\venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

Create `backend/.env`:

```
DATABASE_URL= your Database URL
SECRET_KEY=generate_a_long_random_string
ACCESS_TOKEN_EXPIRE_MINUTES=60
FRONTEND_ORIGIN=http://localhost:3000
COOKIE_SECURE=False
COOKIE_SAMESITE=lax
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Generate a secret key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Apply migrations, seed the database, and start the server:

```bash
alembic upgrade head
python -m app.db.seed --reset
uvicorn app.main:app --reload --port 8000
```

The API runs at http://localhost:8000 with interactive documentation at
http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Start it:

```bash
npm run dev
```

Open http://localhost:3000

---

## Demo accounts

All seeded accounts use the password `Password123!`

| Email | Role | Name |
|---|---|---|
| admin@example.com | Admin | Priya Fernando |
| manager@example.com | Manager | Dinuka Perera |
| nimal@example.com | Member | Nimal Jayasinghe |
| kavya@example.com | Member | Kavya Rathnayake |
| tharindu@example.com | Member | Tharindu Silva |
| amaya@example.com | Member | Amaya Wickramasinghe |

The seed script creates six weeks of reports across four team members in a mix of
statuses, including several that went through a correction cycle so version
history has something to show.

---

## Running the tests

```bash
cd backend
pytest -v
```

30 tests covering authentication, role-based access, report ownership, and the
full review workflow. They run against in-memory SQLite, so no database setup is
required.

---

## Features

### Roles

| Role | Can do |
|---|---|
| Member | Create, edit and submit their own reports |
| Manager | Everything a member can, plus review any report and view the team dashboard |
| Admin | Everything a manager can, plus manage users and roles |

### Pages

| Route | Purpose |
|---|---|
| `/login`, `/register` | Authentication |
| `/reports` | Report history with filtering and pagination |
| `/reports/new` | Create a weekly report |
| `/reports/[id]` | Read-only report view with version history |
| `/reports/[id]/edit` | Edit a draft or a report sent back for correction |
| `/team` | Manager dashboard — metrics, charts, activity feed |
| `/team/reports` | All team reports, filterable |
| `/team/reports/[id]` | Manager review page |
| `/team/members/[id]` | Member profile and report history |
| `/team/sections` | One section across all members for a week |
| `/projects` | Project management with CRUD |
| `/admin/users` | User management and role assignment |
| `/settings` | Account details and password change |

### AI assistant

A manager-only chat assistant backed by Gemini function calling. The model has no
database access — it names one of five tools, and the backend checks the caller's
role before executing the corresponding query.

Tools: team summary, member activity, report details, workload breakdown, recent
trend.

Drafts are excluded from every tool, conversation history is not persisted, and
the interface shows which tools were used for each answer.

---

## API

All endpoints live under `/api/v1`. Interactive documentation is at `/docs`.

| Group | Endpoints |
|---|---|
| `/auth` | register, login, logout, me, change-password |
| `/users` | list, create, update, deactivate, roles |
| `/projects` | list, create, update, archive |
| `/reports` | list, create, read, update, delete, submit, review, versions |
| `/dashboard` | summary, trend, members, projects, work-types, activity, section |
| `/assistant` | status, chat, summary |

List endpoints are paginated and filterable:

```
GET /api/v1/reports?page=2&page_size=20&status=SUBMITTED&user_id=3&week_start=2026-08-31
```

Returns `items`, `total`, `page`, `page_size`, `pages`.

---

## Project structure

<details>
<summary>Full tree</summary>

```
weekly_report_generator/
├── backend/
│   ├── alembic/
│   │   ├── versions/                    # migration files
│   │   └── env.py
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── routes/
│   │   │       │   ├── auth.py          # register, login, logout, me
│   │   │       │   ├── users.py         # user management, roles
│   │   │       │   ├── projects.py      # project CRUD
│   │   │       │   ├── reports.py       # report CRUD, submit, review, versions
│   │   │       │   ├── dashboard.py     # metrics, charts, activity
│   │   │       │   └── chat.py          # AI assistant
│   │   │       └── router.py            # mounts all routers under /api/v1
│   │   ├── core/
│   │   │   ├── config.py                # settings from environment
│   │   │   ├── security.py              # bcrypt hashing, JWT
│   │   │   ├── password.py              # password policy
│   │   │   └── deps.py                  # auth and RBAC dependencies
│   │   ├── db/
│   │   │   ├── base.py                  # SQLAlchemy declarative base
│   │   │   ├── session.py               # engine and session factory
│   │   │   └── seed.py                  # demo data script
│   │   ├── models/
│   │   │   ├── enums.py                 # status, priority, work type
│   │   │   ├── mixins.py                # created_at / updated_at
│   │   │   ├── user.py                  # roles, users
│   │   │   ├── project.py               # projects, project_members
│   │   │   ├── report.py                # reports and five child tables
│   │   │   └── review.py                # report_versions, review_comments
│   │   ├── schemas/                     # Pydantic request/response shapes
│   │   ├── services/                    # business logic and access checks
│   │   │   ├── user_service.py
│   │   │   ├── project_service.py
│   │   │   ├── report_service.py        # review workflow, versioning
│   │   │   ├── dashboard_service.py     # SQL aggregations
│   │   │   ├── ai_service.py            # Gemini function calling loop
│   │   │   └── ai_tools.py              # the five tools the model may call
│   │   └── main.py                      # FastAPI app, CORS, error handlers
│   ├── tests/
│   │   ├── conftest.py                  # fixtures, in-memory SQLite
│   │   └── test_rbac.py                 # 30 tests
│   ├── Dockerfile
│   ├── requirements.txt
│   └── alembic.ini
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (auth)/                  # login, register — no app shell
│       │   ├── (app)/                   # protected pages
│       │   │   ├── layout.tsx           # ProtectedRoute + AppShell
│       │   │   ├── reports/
│       │   │   ├── team/
│       │   │   ├── projects/
│       │   │   ├── admin/users/
│       │   │   └── settings/
│       │   ├── layout.tsx               # root, mounts AuthProvider
│       │   ├── page.tsx                 # redirects by role
│       │   └── globals.css              # design tokens
│       ├── components/
│       │   ├── ui/                      # Button, Card, Field, Table, Modal
│       │   ├── layout/                  # AppShell, ProtectedRoute
│       │   ├── reports/                 # ReportForm, ReportContent, VersionHistory
│       │   ├── dashboard/               # MetricCard, charts
│       │   └── assistant/               # ChatWidget, AiSummaryCard
│       ├── hooks/
│       │   ├── useApi.ts                # useQuery, useMutation
│       │   └── useReportForm.ts         # form state and validation
│       ├── lib/
│       │   ├── api.ts                   # fetch wrapper, error handling
│       │   ├── auth-context.tsx         # session state
│       │   ├── dates.ts                 # week helpers
│       │   ├── password.ts              # policy, mirrors the backend
│       │   └── snapshot.ts              # adapts a version back to report shape
│       ├── types/index.ts               # API contract types
│       ├── Dockerfile
│       └── next.config.ts
│
├── docs/
│   └── er-diagram.png
├── docker-compose.yml
└── README.md
```

</details>

---

## Design notes

**Authentication** — JWT in an HTTP-only cookie, so the token isn't reachable from
JavaScript. Cookie flags are environment variables: `lax` locally, `none` for
cross-domain deployment.

**Version history** — a JSON snapshot per submission rather than versioning each
child table. History needs to be readable, not queryable, and snapshots survive
schema changes.

**Enums** — stored as VARCHAR with a check constraint, not MySQL's native ENUM.
Keeps migrations cheap and lets the same models run on SQLite in tests.

**Access control** — role checks as route dependencies, ownership checks in the
service layer. A report you can't access returns 404, not 403, so the response
doesn't confirm it exists.
