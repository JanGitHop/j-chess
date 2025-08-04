# Schach - Online Schachplattform

Eine moderne, interaktive Schachplattform, entwickelt mit Laravel und Vue.js.

![Schach Logo](public/images/logo.png)

## Über das Projekt

Dieses Projekt ist ein Just-For-Fun-Projekt und soll eine vollständige Schachplattform werden, die es Benutzern ermöglicht,
Schach online zu spielen, ob gegen andere Spieler in Echtzeit oder gegen verschiedene KI-Gegner.

### Hauptfunktionen

- Interaktives Schachbrett mit Drag-and-Drop-Funktionalität
- Analysetools, wie z.B. farbliches Markieren von Feldern, Zeichnen von Pfeilen
- Vollständige Implementierung der Schachregeln
- Multiplayer-Modus in Echtzeit
- KI-Gegner mit verschiedenen Schwierigkeitsgraden
- Spielanalyse und Zugvorschläge
- Benutzerprofile und Ranglisten
- Spielhistorie und PGN-Export
- Training, wie z.B. Eröffnungen, Mittel- oder Endspiel

## Technologien

### Backend
- Laravel 10.x
- Inertia.js Server-Adapter
- Laravel Sanctum (Authentication)
- Laravel WebSockets/Pusher (Echtzeit-Kommunikation)
- Queue System (für Engine-Berechnungen)

### Frontend
- Vue 3 (Composition API)
- Inertia.js Client-Adapter
- Pinia (State Management)
- Tailwind CSS
- Vue-Draggable (für Schachfiguren)

## Installation

### Voraussetzungen
- Docker und Docker Compose
- PHP 8.4 oder höher
- Composer
- Node.js und NPM

### Schritte zur Installation

1. Repository klonen:
   ```bash
   git clone https://github.com/JanGitHop/j-chess.git
   cd j-chess
   ```

2. Abhängigkeiten installieren:
   ```bash
   composer install
   npm install
   ```

3. Umgebungsvariablen konfigurieren:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. Docker-Container starten:
   ```bash
   ./vendor/bin/sail up -d
   ```

5. Datenbank-Migrationen ausführen:
   ```bash
   ./vendor/bin/sail artisan migrate
   ```

6. Frontend-Assets kompilieren:
   ```bash
   ./vendor/bin/sail npm run dev
   ```

7. Die Anwendung ist nun unter http://localhost erreichbar

## Entwicklung

### Entwicklungsumgebung

Das Projekt verwendet Laravel Sail für eine Docker-basierte Entwicklungsumgebung. Folgende Dienste sind verfügbar:

- **Laravel**: PHP-Anwendungsserver
- **MySQL**: Datenbank
- **Redis**: Cache und Queues
- **Mailpit**: E-Mail-Testing
- **Soketi**: WebSocket-Server
- **Meilisearch**: Suchfunktionalität

### Nützliche Befehle

Hilfreich wäre es, einen Alias zu erstellen:
statt `./vendor/bin/sail` => sail

Erstelle die aliases in Deiner .zshrc
```bash
alias sail='[ -f sail ] && bash sail || bash ./vendor/bin/sail'
alias sailstart='sail up -d | sail npm run dev'
```

- Server starten: `./vendor/bin/sail up -d` oder `sail up -d`
- Server stoppen: `./vendor/bin/sail down`
- Composer-Befehle: `./vendor/bin/sail composer <command>`
- Artisan-Befehle: `./vendor/bin/sail artisan <command>`
- NPM-Befehle: `./vendor/bin/sail npm <command>`
- Tests ausführen: `./vendor/bin/sail test`

## Projektstruktur

```
Schach/
├── app/
│   ├── Http/Controllers/
│   │   ├── GameController.php
│   │   ├── AuthController.php
│   │   ├── ChessEngineController.php
│   ├── Models/
│   │   ├── User.php
│   │   ├── Game.php
│   │   ├── Move.php
│   │   ├── ChessEngine.php
│   ├── Services/
│   │   ├── ChessEngineService.php
│   │   ├── GameLogicService.php
│   │   ├── MultiplayerService.php
│   ├── Events/
│   │   ├── GameStarted.php
│   │   ├── MoveMade.php
│   │   ├── GameEnded.php
├── resources/
│   ├── js/
│   │   ├── Components/
│   │   │   ├── ChessBoard.vue
│   │   │   ├── ChessPiece.vue
│   │   │   ├── GameControls.vue
│   │   ├── Pages/
│   │   │   ├── Game/
│   │   │   ├── Dashboard.vue
│   │   ├── Stores/
│   │   │   ├── gameStore.js
│   │   │   ├── boardStore.js
│   │   │   ├── pieceStore.js
├── routes/
│   ├── web.php
│   ├── channels.php
├── database/
│   ├── migrations/
├── docs/
│   ├── tasks.md
```

## Roadmap

Die Entwicklung des Projekts ist in mehrere Phasen unterteilt:

### Phase 1: Grundgerüst ✓
- Laravel + Inertia.js Setup
- Basis-Schachbrett (Vue-Komponente)
- Einfache Spiellogik

### Phase 2: Core Features - Frontend (In Bearbeitung)
- PvP-Spiele (lokal)
- Grundlegende Schachregeln
- Spielhistorie
- Profil-Management

### Phase 3: Multiplayer (Geplant)
- WebSocket-Integration
- Live-Spiele zwischen Benutzern
- Lobby-System
- Spectator-Modus

### Phase 4: Engine-Integration (Geplant)
- Stockfish-Integration
- Engine-Management-System
- Verschiedene Schwierigkeitsgrade
- Analyse-Features

Für eine detaillierte Liste der geplanten Aufgaben, siehe [docs/tasks.md](docs/tasks.md).

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe die [LICENSE](LICENSE) Datei für Details.
