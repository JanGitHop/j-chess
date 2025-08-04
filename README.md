# Schach - Online Schachplattform

Eine moderne, interaktive Schachplattform, entwickelt mit Laravel und Vue.js.

![Schach Logo](public/images/logo.png)

## Über das Projekt

Dieses Projekt ist ein Just-For-Fun-Projekt und soll eine vollständige Schachplattform werden, die es Benutzern ermöglicht,
Schach online zu spielen, ob gegen andere Spieler in Echtzeit oder gegen verschiedene KI-Gegner.

## Aktueller Status

Das Projekt befindet sich in aktiver Entwicklung. Folgende Funktionen sind bereits implementiert:

- ✅ Interaktives Schachbrett mit Drag-and-Drop-Funktionalität
- ✅ Vollständige Implementierung der Schachregeln
- ✅ Lokaler Mehrspielermodus (PvP auf demselben Gerät)
- ✅ Analysetools (Pfeile zeichnen, Felder markieren)
- ✅ Verschiedene Brettthemen und -größen
- ✅ Zughistorie mit Notation

Folgende Funktionen sind in Entwicklung:
- 🚧 Responsive Darstellung
- 🚧 KI-Gegner
- 🚧 Online-Multiplayer
- 🚧 Benutzerprofile und Authentifizierung
- 🚧 Spielanalyse und Zugvorschläge

## Hauptfunktionen

### Spielmodi
- **Lokaler PvP-Modus**: Spielen Sie gegen einen Freund auf demselben Gerät
- **Analysemodus**: Analysieren Sie Stellungen und Züge mit Hilfe von Markierungen und Pfeilen

### Spieloberfläche
- **GameHeader**: Steuert die wichtigsten Spielfunktionen
  - Spielmodus-Auswahl (Lokal PvP, Analyse)
  - Brett drehen
  - Themen- und Größeneinstellungen
  - Audio-Einstellungen
  - Neues Spiel starten
  - Spielexport
- **Schachbrett**: Interaktives Brett mit Drag-and-Drop-Funktionalität
  - (Shift +) Alt + Klick + Ziehen: Pfeile zeichnen
  - (Shift +) Alt + Klick auf ein Feld: Feld markieren
  - `X` um Markierungen zu löschen
  - Verschiedene Farben für Markierungen
- **Zughistorie**: Zeigt alle gespielten Züge in Schachnotation
- **Spielsteuerung**: Zurücksetzen, Züge zurücknehmen, etc.

### Anpassungsoptionen
- Verschiedene Brett-Themen
- Einstellbare Brettgröße
- Koordinatenanzeige ein-/ausschalten
- Legale Züge anzeigen/ausblenden
- Letzten Zug hervorheben

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

## Benutzerhinweise

### Spielsteuerung
1. **Spielmodus wählen**: Über den GameHeader können Sie zwischen "Lokal PvP" und "Analyse" wählen
2. **Neues Spiel starten**: Klicken Sie auf das Menü-Symbol und wählen Sie "Neues Spiel"
3. **Figuren bewegen**: Drag & Drop der Figuren auf legale Felder
4. **Brett drehen**: Klicken Sie auf den "Brett drehen" Button im GameHeader
5. **Automatisches Brett drehen**: Aktiviere Auto-Reverse im GameHeader
6. **Züge zurücknehmen**: Nutzen Sie die Spielsteuerung am unteren Rand

### Analysetools
1. **Pfeile zeichnen**: Rechtsklick auf ein Startfeld, halten und zum Zielfeld ziehen
2. **Felder markieren**: Rechtsklick auf ein Feld
3. **Farbe ändern**: Verwenden Sie die Farbauswahl in der Werkzeugleiste
4. **Markierungen löschen**: Klicken Sie auf den "Löschen" Button in der Werkzeugleiste

### Anpassungen
1. **Thema ändern**: Öffnen Sie das Themen-Dropdown im GameHeader
2. **Brettgröße ändern**: Wählen Sie eine Größe aus dem Größen-Dropdown
3. **Einstellungen anpassen**: Nutzen Sie das Einstellungen-Dropdown für weitere Optionen

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

### Phase 1: Grundgerüst ✅
- Laravel + Inertia.js Setup
- Basis-Schachbrett (Vue-Komponente)
- Einfache Spiellogik

### Phase 2: Core Features ⏳
- PvP-Spiele (lokal) ✅
- Grundlegende Schachregeln ✅
- Analysetools (Pfeile, Markierungen) ✅
- Spielhistorie ✅
- Profil-Management 🚧

### Phase 3: Multiplayer 🔜
- WebSocket-Integration
- Live-Spiele zwischen Benutzern
- Lobby-System
- Spectator-Modus

### Phase 4: Engine-Integration 🔜
- Stockfish-Integration
- Engine-Management-System
- Verschiedene Schwierigkeitsgrade
- Analyse-Features

Für eine detaillierte Liste der geplanten Aufgaben, siehe [docs/tasks.md](docs/tasks.md).

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe die [LICENSE](LICENSE) Datei für Details.
