# Druckmaschine - AI-Powered Task Automation Platform

## Project Overview

Druckmaschine is a self-evolving AI platform that can create code, AI agents, and execute complex tasks autonomously. It features real-time monitoring, GPU acceleration, and a modern web interface. The name "Druckmaschine" (German for "printing press") reflects the project's goal: to produce outputs -- code, research, trades, documents -- with machine-like efficiency.

## Architecture

- **Backend**: Python 3.12 / FastAPI (fully async), SQLAlchemy 2.0 with asyncpg, PostgreSQL 16, Redis 7
- **Frontend**: React 18 + TypeScript 5 + Vite 5 + Tailwind CSS 3
- **Infrastructure**: Docker Compose with hot-reload (`docker compose watch`), NVIDIA GPU support
- **Real-time**: WebSocket connections for live updates, logs, and task progress
- **State Management**: Zustand (frontend), Redis pub/sub (backend)

## Key Principles

1. Always write clean, documented, versioned code.
2. Every change must be reflected in the CHANGELOG.md.
3. Use scientific sources for research tasks.
4. GPU acceleration when available (auto-detected via `pynvml`).
5. Background task execution with real-time progress reporting.
6. Self-documenting: the watcher service auto-logs file changes.
7. All database operations must use async SQLAlchemy sessions.
8. All API endpoints must have proper error handling and return consistent JSON shapes.

## File Structure

```
Druckmaschine/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/                  # Database migrations
│   │   ├── env.py
│   │   └── versions/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI application entry point
│   │   ├── config.py             # Pydantic settings
│   │   ├── database.py           # Async SQLAlchemy engine & session
│   │   ├── models/               # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── task.py
│   │   │   └── changelog.py
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── task.py
│   │   │   └── changelog.py
│   │   ├── api/                  # API route handlers
│   │   │   ├── __init__.py
│   │   │   ├── auth.py           # POST /auth/register, /auth/login
│   │   │   ├── users.py          # GET /users/me
│   │   │   ├── projects.py       # CRUD /projects
│   │   │   ├── tasks.py          # CRUD /tasks, POST /tasks/{id}/execute
│   │   │   ├── changelog.py      # GET /changelog
│   │   │   ├── system.py         # GET /system/status, /system/gpu
│   │   │   └── ws.py             # WebSocket /ws
│   │   ├── services/             # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── auth.py           # JWT creation/verification
│   │   │   ├── task_executor.py  # Background task runner
│   │   │   ├── gpu.py            # GPU detection and management
│   │   │   ├── watcher.py        # File watcher (standalone process)
│   │   │   └── trading.py        # Trading simulation engine
│   │   ├── agents/               # AI agent definitions
│   │   │   ├── __init__.py
│   │   │   ├── base.py           # BaseAgent abstract class
│   │   │   ├── code_agent.py     # Code generation agent
│   │   │   ├── research_agent.py # Scientific research agent
│   │   │   └── trading_agent.py  # Trading strategy agent
│   │   └── plugins/              # Plugin system
│   │       ├── __init__.py
│   │       └── loader.py         # Dynamic plugin loading
│   └── tests/
│       ├── conftest.py
│       └── test_api/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/                  # API client functions
│       ├── components/           # Reusable UI components
│       ├── pages/                # Route pages
│       ├── stores/               # Zustand state stores
│       ├── hooks/                # Custom React hooks
│       └── types/                # TypeScript type definitions
├── docker-compose.yml            # Base compose (development)
├── docker-compose.gpu.yml        # GPU override
├── docker-compose.prod.yml       # Production override
├── .env.example                  # Environment variable template
├── .gitignore
├── .dockerignore
├── CLAUDE.md                     # This file -- agent instructions
├── README.md                     # Project documentation (German)
└── CHANGELOG.md                  # Version history
```

## Development Commands

```bash
# Start all services in development mode
docker compose up -d

# Start with GPU support
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d

# Start with hot-reload file watching
docker compose watch

# Start in production mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f backend       # Backend logs
docker compose logs -f frontend      # Frontend logs
docker compose logs -f watcher       # File watcher logs
docker compose logs -f               # All services

# Database operations
docker compose exec backend alembic upgrade head        # Run migrations
docker compose exec backend alembic revision --autogenerate -m "description"  # Create migration

# Run backend tests
docker compose exec backend pytest -v

# Rebuild a specific service
docker compose build backend
docker compose up -d backend

# Stop everything
docker compose down

# Stop and remove all data
docker compose down -v
```

## Code Style

- **Python**: PEP 8, type hints on all functions, async/await for I/O, docstrings on public functions.
- **TypeScript**: strict mode enabled, functional components only, React hooks, no `any` types.
- **Commits**: Conventional Commits format -- `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- **Naming**: snake_case for Python, camelCase for TypeScript, PascalCase for React components and Python classes.

## API Endpoints

### Authentication
- `POST /api/auth/register` -- Create a new user account
- `POST /api/auth/login` -- Authenticate and receive JWT tokens

### Users
- `GET /api/users/me` -- Get current user profile

### Projects
- `GET /api/projects` -- List all projects for the current user
- `POST /api/projects` -- Create a new project
- `GET /api/projects/{id}` -- Get project details
- `PUT /api/projects/{id}` -- Update a project
- `DELETE /api/projects/{id}` -- Delete a project

### Tasks
- `GET /api/tasks` -- List tasks (filterable by project)
- `POST /api/tasks` -- Create a new task
- `GET /api/tasks/{id}` -- Get task details
- `PUT /api/tasks/{id}` -- Update a task
- `DELETE /api/tasks/{id}` -- Delete a task
- `POST /api/tasks/{id}/execute` -- Start AI execution of a task

### Changelog
- `GET /api/changelog` -- Get changelog entries (paginated)

### System
- `GET /api/system/status` -- System health and resource usage
- `GET /api/system/gpu` -- GPU status and utilization

### WebSocket
- `WS /ws` -- Real-time event stream (requires JWT as query param)

## WebSocket Events

Events are JSON objects with `{"type": "...", "data": {...}}` structure.

### Server to Client
- `task:progress` -- Task progress update: `{task_id, progress, message}`
- `task:log` -- Task log entry: `{task_id, level, message, timestamp}`
- `task:complete` -- Task finished: `{task_id, status, result}`
- `system:event` -- System-level event: `{event, details}`
- `log:entry` -- Application log: `{level, message, source, timestamp}`

### Client to Server
- `task:cancel` -- Request task cancellation: `{task_id}`
- `subscribe` -- Subscribe to specific channels: `{channels: [...]}`
- `unsubscribe` -- Unsubscribe from channels: `{channels: [...]}`

## MCP and Plugin Integration

- The app uses MCP (Model Context Protocol) for AI agent communication.
- Plugins are dynamically loaded from `backend/app/plugins/`.
- Each plugin is a Python module with a `register(app)` function.
- Online services are integrated via `backend/app/services/`.
- Service classes follow the repository pattern with async methods.

## Trading Module

- Simulation mode starts with a configurable virtual balance (default 100 EUR) and targets 100,000 EUR.
- Real market data is fetched for simulation; no real money is involved unless `TRADING_REAL_MODE=true`.
- Real mode requires explicit user confirmation for every trade via the UI.
- Risk management is enforced at all levels: maximum position size, stop-loss, daily loss limit.
- All trades are logged and visible in the changelog.

## AI Agent System

- Agents are Python classes that inherit from `BaseAgent`.
- Every agent must implement an async `execute(context)` method.
- Agents report progress via `self.report_progress(percent, message)` which pushes WebSocket events.
- Agents can use GPU resources if available by calling `self.require_gpu()`.
- Agents can spawn sub-agents via `self.create_sub_agent(AgentClass, config)`.
- Agent results are stored in the database and linked to their parent task.
- Built-in agents: `CodeAgent`, `ResearchAgent`, `TradingAgent`.

## Error Handling

- All API errors return `{"detail": "message"}` with appropriate HTTP status codes.
- Background task failures are reported via WebSocket `task:complete` with `status: "failed"`.
- Unhandled exceptions are caught by middleware, logged, and returned as 500 with a generic message.
- Database connection failures trigger automatic retries with exponential backoff.

## Security Notes

- JWT tokens expire after 30 minutes; refresh tokens last 7 days.
- Passwords are hashed with bcrypt (passlib).
- CORS is restricted to configured origins only.
- WebSocket connections require a valid JWT.
- The `SECRET_KEY` must be changed from the default before any production deployment.
- Never commit `.env` files.
