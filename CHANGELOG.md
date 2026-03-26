# Changelog

Alle bemerkenswerten Aenderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/)
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [0.1.4] - 2026-03-26

### Behoben
- React Router v7 Deprecation-Warnungen behoben: `v7_startTransition` und `v7_relativeSplatPath` Future-Flags aktiviert
- 500-Fehler bei Registrierung behoben: `from_attributes` Config zu `AuthResponse` hinzugefuegt fuer korrekte ORM-Serialisierung

## [0.1.3] - 2026-03-26

### Behoben
- Account-Erstellung: "Failed to fetch"-Fehler behoben - Register-Endpoint gibt jetzt Access-Token zurueck
- Login-Endpoint gibt jetzt auch User-Daten in der Antwort zurueck (Frontend erwartet `{ access_token, user }`)
- Vite-Proxy leitet `/api`-Anfragen korrekt an Backend weiter (Prefix-Rewrite hinzugefuegt)
- Docker-Compose: Frontend nutzt jetzt Server-seitigen Proxy statt direkter Backend-URL im Browser

## [0.1.2] - 2026-03-26

### Behoben
- Port-Binding-Fehler: Host-Ports in docker-compose.yml waren hardcoded und ignorierten .env-Einstellungen
- Alle Host-Ports (Backend, Frontend, PostgreSQL, Redis) sind jetzt ueber Umgebungsvariablen konfigurierbar

## [0.1.1] - 2026-03-26

### Behoben
- Frontend Dockerfile: fehlende `dev`-Stage hinzugefuegt, die von docker-compose.yml referenziert wird

## [0.1.0] - 2026-03-25

### Hinzugefuegt
- Initiale Projektstruktur
- FastAPI Backend mit WebSocket-Unterstuetzung
- React Frontend mit modernem Dark-Theme
- Docker Compose Setup mit Hot-Reload
- Benutzerverwaltung (Registrierung, Login, JWT)
- Projektverwaltung (CRUD)
- Aufgabenverwaltung mit KI-Verarbeitung
- Echtzeit-Logs ueber WebSocket
- Changelog-Ansicht in der App
- NVIDIA GPU-Unterstuetzung
- Trading-Modul (100 EUR -> 100.000 EUR Simulation)
- KI-Agenten-System
- Wissenschaftliche Recherche-Funktion
- Responsive Design (Mobile + Desktop)
- Datei-Watcher-Service mit Polling und Redis Pub/Sub
- Umfassende README-Dokumentation (Deutsch)
- CLAUDE.md Agenten-Anweisungen
