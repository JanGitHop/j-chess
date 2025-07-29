## Detaillierte Projektstruktur
``` 
Schach/
??? app/
?   ??? Http/Controllers/
?   ?   ??? GameController.php
?   ?   ??? AuthController.php
?   ?   ??? ChessEngineController.php
?   ??? Models/
?   ?   ??? User.php
?   ?   ??? Game.php
?   ?   ??? Move.php
?   ?   ??? ChessEngine.php
?   ??? Services/
?   ?   ??? ChessEngineService.php
?   ?   ??? GameLogicService.php
?   ?   ??? MultiplayerService.php
?   ??? Events/
?   ?   ??? GameStarted.php
?   ?   ??? MoveMade.php
?   ?   ??? GameEnded.php
?   ??? Broadcasting/
??? resources/
?   ??? js/
?   ?   ??? Components/
?   ?   ?   ??? ChessBoard.vue
?   ?   ?   ??? ChessPiece.vue
?   ?   ?   ??? GameControls.vue
?   ?   ?   ??? EngineSelector.vue
?   ?   ??? Pages/
?   ?   ?   ??? Game/
?   ?   ?   ?   ??? Index.vue
?   ?   ?   ?   ??? Show.vue
?   ?   ?   ?   ??? Create.vue
?   ?   ?   ??? Dashboard.vue
?   ?   ?   ??? Profile.vue
?   ?   ??? Stores/
?   ?   ?   ??? gameStore.js
?   ?   ?   ??? engineStore.js
?   ?   ??? app.js
?   ??? views/
?       ??? app.blade.php
??? routes/
?   ??? web.php
?   ??? channels.php (für Broadcasting)
??? database/
    ??? migrations/
```
## Technischer Stack
### Backend (Laravel)
``` php
// Hauptkomponenten
- Laravel 10.x
- Inertia.js Server-Adapter
- Laravel Sanctum (Authentication)
- Laravel WebSockets/Pusher (Real-time)
- Queue System (für Engine-Berechnungen)
```
### Frontend (Vue)
``` javascript
// Hauptkomponenten
- Vue 3 (Composition API)
- Inertia.js Client-Adapter
- Pinia (State Management)
- Tailwind CSS
- Vue-Draggable (für Schachfiguren)
```
## Datenbank-Schema (Kern-Tabellen)
``` sql
-- Spiele
games: id, white_player_id, black_player_id, status, fen, pgn, engine_id, created_at

-- Züge
moves: id, game_id, move_notation, fen_after, player_id, timestamp

-- Chess Engines
chess_engines: id, name, executable_path, parameters, active

-- Benutzer (erweitert)
users: id, name, email, rating, games_played, games_won
```
## Multiplayer-Architektur
### Real-time Communication
``` php
// Event Broadcasting
- MoveMade Event ? an beide Spieler
- GameStateChanged ? Live-Updates
- PlayerJoined/Left ? Lobby-Updates
```
### Game Flow
1. **Spielerstellung**: Spieler erstellt Spiel ? Lobby
2. **Beitritt**: Zweiter Spieler tritt bei
3. **Real-time Sync**: Züge werden live übertragen
4. **Engine-Integration**: Optional KI-Gegner

## Chess Engine-Architektur
### Flexible Engine-Integration
``` php
interface ChessEngineInterface {
    public function getBestMove(string $fen, int $depth): string;
    public function evaluate(string $fen): float;
    public function isLegal(string $fen, string $move): bool;
}

class StockfishEngine implements ChessEngineInterface { ... }
class LeelaEngine implements ChessEngineInterface { ... }
// Weitere Engines...
```
## Entwicklungsroadmap
### Phase 1: Grundgerüst
1. Laravel + Inertia.js Setup
2. Benutzerregistrierung/-login
3. Basis-Schachbrett (Vue-Komponente) ✅
4. Spiellogik ✅

### Phase 2: Core Features
1. PvP-Spiele (lokal)
2. Grundlegende Schachregeln ✅
3. Spielhistorie
4. Profil-Management

### Phase 3: Multiplayer
1. WebSocket-Integration
2. Live-Spiele zwischen Benutzern
3. Lobby-System
4. Spectator-Modus

### Phase 4: Engine-Integration
1. Stockfish-Integration
2. Engine-Management-System
3. Verschiedene Schwierigkeitsgrade
4. Analyse-Features

##### Sail Install
