# Druckmaschine

**KI-gesteuerte Plattform fuer Aufgabenautomatisierung, Code-Generierung und autonome Agenten.**

---

## Ueberblick

Druckmaschine ist eine sich selbst weiterentwickelnde KI-Plattform, die Code erstellen, KI-Agenten steuern und komplexe Aufgaben autonom ausfuehren kann. Die Plattform bietet Echtzeit-Ueberwachung, GPU-Beschleunigung und eine moderne Weboberflaeche.

Der Name "Druckmaschine" steht fuer das Ziel des Projekts: Ergebnisse -- Code, Recherchen, Handelsstrategien, Dokumente -- mit maschineller Effizienz zu produzieren.

---

## Features

- **Projektverwaltung** -- Projekte erstellen, organisieren und verwalten
- **Aufgaben mit KI-Verarbeitung** -- Aufgaben definieren und von KI-Agenten ausfuehren lassen
- **Echtzeit-Dashboard** -- Live-Logs, Fortschrittsanzeigen und Systemstatus ueber WebSocket
- **KI-Agenten-System** -- Erweiterbare Agenten fuer Code-Generierung, Recherche und Trading
- **Trading-Modul** -- Simulation mit virtuellem Startkapital (100 EUR Ziel: 100.000 EUR)
- **GPU-Beschleunigung** -- Automatische NVIDIA-GPU-Erkennung und -Nutzung
- **Wissenschaftliche Recherche** -- Agenten mit Zugriff auf wissenschaftliche Quellen
- **Changelog-System** -- Automatische Dokumentation aller Aenderungen
- **Datei-Watcher** -- Ueberwacht das Repository und protokolliert Aenderungen
- **Dark-Theme** -- Modernes, responsives Design fuer Desktop und Mobil
- **Benutzerverwaltung** -- Registrierung, Login und JWT-basierte Authentifizierung

---

## Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
│                  React 18 + TypeScript + Vite                   │
│                      Tailwind CSS (Dark)                        │
└──────────────┬──────────────────────────────┬───────────────────┘
               │ HTTP/REST                    │ WebSocket
               ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend (async)                      │
│           Python 3.12  |  SQLAlchemy 2.0  |  Pydantic           │
│                                                                  │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Auth API │  │ Tasks API │  │ WS-Hub   │  │ Agent-System  │  │
│  └──────────┘  └───────────┘  └──────────┘  └───────────────┘  │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Projekte │  │ Changelog │  │ System   │  │ Trading       │  │
│  └──────────┘  └───────────┘  └──────────┘  └───────────────┘  │
└──────┬──────────────┬──────────────┬────────────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ PostgreSQL │ │   Redis    │ │  NVIDIA    │
│    16      │ │     7      │ │   GPU      │
│  (Daten)   │ │ (Cache/    │ │ (optional) │
│            │ │  Pub/Sub)  │ │            │
└────────────┘ └────────────┘ └────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Datei-Watcher (Sidecar)                     │
│         Polling /repo  -->  Changelog + Redis Pub/Sub           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Schnellstart

### Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/) (>= 24.0)
- [Docker Compose](https://docs.docker.com/compose/install/) (>= 2.20)
- Optional: NVIDIA-Treiber und [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/) fuer GPU-Unterstuetzung

### 1. Repository klonen

```bash
git clone https://github.com/dein-benutzername/Druckmaschine.git
cd Druckmaschine
```

### 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
# .env-Datei bearbeiten und SECRET_KEY aendern
```

### 3. Alle Dienste starten

```bash
# Entwicklungsmodus
docker compose up -d

# Mit GPU-Unterstuetzung
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d

# Mit Hot-Reload (Dateiueberwachung)
docker compose watch
```

### 4. Anwendung oeffnen

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API-Dokumentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Screenshots

> *Screenshots werden nach dem ersten Release hinzugefuegt.*

| Dashboard | Aufgabenverwaltung | Echtzeit-Logs |
|:---------:|:------------------:|:-------------:|
| (folgt)   | (folgt)            | (folgt)       |

---

## Entwicklung

### Projektstruktur

```
Druckmaschine/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py               # FastAPI-Einstiegspunkt
│   │   ├── config.py             # Konfiguration (Pydantic Settings)
│   │   ├── database.py           # Async SQLAlchemy Engine
│   │   ├── models/               # ORM-Modelle
│   │   ├── schemas/              # Pydantic-Schemas
│   │   ├── api/                  # API-Endpunkte
│   │   ├── services/             # Geschaeftslogik
│   │   │   └── watcher.py        # Datei-Watcher-Service
│   │   ├── agents/               # KI-Agenten
│   │   └── plugins/              # Plugin-System
│   └── tests/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── components/           # UI-Komponenten
│       ├── pages/                # Seitenkomponenten
│       ├── stores/               # Zustand-Stores
│       └── hooks/                # React-Hooks
├── docker-compose.yml            # Entwicklung
├── docker-compose.gpu.yml        # GPU-Override
├── docker-compose.prod.yml       # Produktion
├── .env.example
├── CLAUDE.md                     # Agenten-Anweisungen
├── CHANGELOG.md
└── README.md                     # Diese Datei
```

### Haeufig genutzte Befehle

```bash
# Alle Dienste starten
docker compose up -d

# Logs anzeigen
docker compose logs -f backend        # Nur Backend
docker compose logs -f                # Alle Dienste

# Datenbank-Migrationen
docker compose exec backend alembic upgrade head
docker compose exec backend alembic revision --autogenerate -m "Beschreibung"

# Tests ausfuehren
docker compose exec backend pytest -v

# Einzelnen Dienst neu bauen
docker compose build backend
docker compose up -d backend

# Alles stoppen
docker compose down

# Alles stoppen und Daten loeschen
docker compose down -v
```

### Code-Stil

- **Python**: PEP 8, Type-Hints, async/await, Docstrings fuer oeffentliche Funktionen
- **TypeScript**: Strict-Modus, funktionale Komponenten, React Hooks, kein `any`
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)

---

## API-Endpunkte

| Methode | Pfad                       | Beschreibung                      |
|---------|----------------------------|-----------------------------------|
| POST    | `/api/auth/register`       | Neues Benutzerkonto erstellen     |
| POST    | `/api/auth/login`          | Anmelden und JWT erhalten         |
| GET     | `/api/users/me`            | Eigenes Profil abrufen            |
| GET     | `/api/projects`            | Projekte auflisten                |
| POST    | `/api/projects`            | Neues Projekt erstellen           |
| GET     | `/api/projects/{id}`       | Projektdetails abrufen            |
| PUT     | `/api/projects/{id}`       | Projekt aktualisieren             |
| DELETE  | `/api/projects/{id}`       | Projekt loeschen                  |
| GET     | `/api/tasks`               | Aufgaben auflisten                |
| POST    | `/api/tasks`               | Neue Aufgabe erstellen            |
| GET     | `/api/tasks/{id}`          | Aufgabendetails abrufen           |
| PUT     | `/api/tasks/{id}`          | Aufgabe aktualisieren             |
| DELETE  | `/api/tasks/{id}`          | Aufgabe loeschen                  |
| POST    | `/api/tasks/{id}/execute`  | KI-Ausfuehrung starten            |
| GET     | `/api/changelog`           | Changelog-Eintraege abrufen       |
| GET     | `/api/system/status`       | Systemstatus und Ressourcen       |
| GET     | `/api/system/gpu`          | GPU-Status und Auslastung         |
| WS      | `/ws`                      | Echtzeit-Event-Stream (JWT noetig)|

---

## Deployment (Produktion)

### 1. Umgebungsvariablen setzen

```bash
cp .env.example .env
```

Folgende Werte muessen zwingend angepasst werden:

- `SECRET_KEY` -- Langer, zufaelliger Schluessel
- `DB_PASSWORD` -- Sicheres Datenbankpasswort
- `CORS_ORIGINS` -- Nur erlaubte Domains

### 2. Produktionsmodus starten

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Das Produktions-Setup beinhaltet:

- Nginx als Reverse-Proxy (Port 80/443)
- Backend mit 4 Uvicorn-Workern (ohne Hot-Reload)
- Ressourcenlimits fuer alle Container
- Redis mit Speicherbegrenzung und LRU-Eviction
- Read-only Volumes fuer den Watcher

### 3. Mit GPU-Unterstuetzung

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.gpu.yml \
  up -d
```

---

## Mitwirken

Beitraege sind willkommen. Bitte beachte folgende Regeln:

1. **Fork** das Repository und erstelle einen **Feature-Branch** (`feat/mein-feature`).
2. Halte dich an den bestehenden **Code-Stil** (siehe oben).
3. Schreibe **Tests** fuer neue Funktionalitaet.
4. Aktualisiere die **CHANGELOG.md** mit deinen Aenderungen.
5. Erstelle einen **Pull Request** mit einer klaren Beschreibung.

### Commit-Nachrichten

Wir verwenden das [Conventional Commits](https://www.conventionalcommits.org/) Format:

```
feat: Neue GPU-Erkennung hinzugefuegt
fix: WebSocket-Verbindungsabbruch behoben
docs: README aktualisiert
refactor: Task-Executor ueberarbeitet
test: Tests fuer Auth-API ergaenzt
chore: Abhaengigkeiten aktualisiert
```

---

## Lizenz

Dieses Projekt ist derzeit nicht unter einer oeffentlichen Lizenz veroeffentlicht. Alle Rechte vorbehalten.

---

## Kontakt

Bei Fragen oder Vorschlaegen bitte ein [Issue](https://github.com/dein-benutzername/Druckmaschine/issues) erstellen.
