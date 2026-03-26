# Changelog

Alle bemerkenswerten Aenderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/)
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [0.1.7] - 2026-03-26

### Behoben
- bcrypt-Version auf 4.0.1 gepinnt: passlib 1.7.4 ist inkompatibel mit bcrypt >= 4.1 (detect_wrap_bug schlaegt fehl, da bcrypt 4.1+ Passwoerter > 72 Bytes direkt ablehnt)

## [0.1.6] - 2026-03-26

### Behoben
- 500-Fehler bei Registrierung behoben: `bcrypt__truncate_error=False` in CryptContext gesetzt, damit passlib Passwoerter ueber 72 Bytes nicht mit ValueError abweist
- Passwort-Laenge auf maximal 128 Zeichen begrenzt (Validierung im Schema)

## [0.1.5] - 2026-03-26

### Behoben
- 500-Fehler bei Registrierung behoben: Passwoerter werden vor dem Hashing auf 72 Bytes gekuerzt (bcrypt-Limit)

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
