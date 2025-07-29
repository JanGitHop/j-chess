# Pfeil- und Feldmarkierungs-Roadmap für Schach-App

## 📋 Übersicht
Diese Roadmap beschreibt die schrittweise Implementierung von Pfeilen und Feldmarkierungen mit Rechtsklick-Funktionalität für die Vue.js Schach-Anwendung.

## 🎯 Ziele
- ✅ Pfeile zwischen Feldern zeichnen (Rechtsklick + Ziehen)
- ✅ Einzelne Felder markieren (Rechtsklick)
- ✅ Verschiedene Farben und Stile
- ✅ Verwaltung und Persistierung der Annotationen
- ✅ Benutzerfreundliche Steuerung

## 🗺️ Implementierungs-Phasen

### Phase 1: Grundarchitektur 🏗️
**Geschätzte Zeit:** 2-3 Stunden

#### 1.1 Annotation Store erstellen
- [ ] `useAnnotationStore.js` erstellen
- [ ] State für Pfeile und Markierungen definieren
- [ ] Grundlegende CRUD-Operationen implementieren
- [ ] Farbverwaltung einbauen

#### 1.2 Typen und Konstanten
- [ ] `annotationConstants.js` erstellen
- [ ] Pfeil-Typen definieren
- [ ] Markierungs-Typen definieren
- [ ] Standard-Farben festlegen

**Deliverables:**
- ✅ Funktionsfähiger Store
- ✅ Typen-Definitionen
- ✅ Grundlegende Tests

### Phase 2: Maus-Interaktionen 🖱️
**Geschätzte Zeit:** 3-4 Stunden

#### 2.1 Event-Handler im Board
- [ ] Rechtsklick-Events implementieren
- [ ] Drag-Detection für Pfeil vs. Markierung
- [ ] Koordinaten-Umrechnung (Pixel → Schachfeld)
- [ ] Context-Menu unterdrücken

#### 2.2 Drag & Drop Logik
- [ ] `mousedown` Handler für Start
- [ ] `mousemove` Handler für Vorschau
- [ ] `mouseup` Handler für Finalisierung
- [ ] Minimum-Drag-Distanz definieren

**Deliverables:**
- ✅ Funktionsfähige Maus-Interaktionen
- ✅ Korrekte Feld-Erkennung
- ✅ Drag-Detection

### Phase 3: Visuelle Darstellung 🎨
**Geschätzte Zeit:** 4-5 Stunden

#### 3.1 SVG-Overlay Komponente
- [ ] `AnnotationOverlay.vue` erstellen
- [ ] SVG-Container über Schachbrett positionieren
- [ ] Responsive Skalierung implementieren
- [ ] Z-Index korrekt setzen

#### 3.2 Pfeil-Rendering
- [ ] SVG-Pfeil-Komponente erstellen
- [ ] Pfeilspitze zeichnen
- [ ] Verschiedene Farben unterstützen
- [ ] Liniendicke anpassbar machen

#### 3.3 Markierungs-Rendering
- [ ] Kreis-Markierungen implementieren
- [ ] Symbol-Markierungen (optional)
- [ ] Verschiedene Stile (gefüllt, Umriss)
- [ ] Transparenz-Unterstützung

**Deliverables:**
- ✅ Funktionsfähiges SVG-Overlay
- ✅ Schöne Pfeil-Darstellung
- ✅ Ansprechende Markierungen

### Phase 4: Benutzersteuerung 🎛️
**Geschätzte Zeit:** 2-3 Stunden

#### 4.1 Farbauswahl
- [ ] Farbpalette-Komponente erstellen
- [ ] Aktuelle Farbe im Store verwalten
- [ ] UI für Farbwechsel implementieren
- [ ] Tastatur-Shortcuts für Farben

#### 4.2 Löschen-Funktionalität
- [ ] Einzelne Annotation löschen
- [ ] Alle Annotationen löschen
- [ ] Rückgängig-Funktion (Undo)
- [ ] Bestätigungs-Dialoge

**Deliverables:**
- ✅ Intuitive Farbauswahl
- ✅ Flexible Lösch-Optionen
- ✅ Undo-Funktionalität

### Phase 5: Integration & Polish 💎
**Geschätzte Zeit:** 3-4 Stunden

#### 5.1 Header-Integration
- [ ] Annotation-Buttons im Header hinzufügen
- [ ] Toggle für Annotation-Modus
- [ ] Aktuelle Farbe anzeigen
- [ ] Statistiken anzeigen (Anzahl Pfeile/Markierungen)

#### 5.2 Einstellungen
- [ ] Annotation-Einstellungen im Settings-Dropdown
- [ ] Standard-Farbe konfigurierbar
- [ ] Auto-Clear nach Zügen (optional)
- [ ] Annotation-Transparenz einstellen

#### 5.3 Persistierung
- [ ] Annotationen in LocalStorage speichern
- [ ] Bei Spielstart/reset berücksichtigen
- [ ] Export/Import mit Spielstand
- [ ] Pro Spielposition speichern (optional)

**Deliverables:**
- ✅ Vollständige UI-Integration
- ✅ Konfigurierbare Einstellungen
- ✅ Persistente Speicherung

### Phase 6: Erweiterte Features 🚀
**Geschätzte Zeit:** 4-6 Stunden (Optional)

#### 6.1 Erweiterte Pfeil-Arten
- [ ] Winkel-Pfeile (Springer)
- [ ] Gestrichelte Pfeile (?)

#### 6.2 Erweiterte Markierungen
- [ ] Verschiedene Symbole (!, ?, ★, ✕)
- [ ] Text-Annotationen
- [ ] Feld-Rahmen (statt Kreise)
- [ ] Animierte Markierungen

#### 6.3 Analyse-Features
- [ ] Annotation-Vorlagen
- [ ] Häufige Muster speichern
- [ ] Annotation-Historie
- [ ] Kommentare zu Annotationen

**Deliverables:**
- ✅ Professionelle Analyse-Tools
- ✅ Erweiterte Anpassbarkeit
- ✅ Power-User Features

## 📁 Datei-Struktur

```text
src/
├── Stores/
│   └── annotationStore.js
├── Components/
│   ├── Board/
│   │   └── AnnotationOverlay.vue
│   └── UI/
│       ├── ColorPalette.vue
│       └── AnnotationControls.vue
├── Composables/
│   ├── useAnnotations.js
│   └── useAnnotationDraw.js
├── Utils/
│   └── annotationConstants.js
└── Assets/
    └── annotation-icons/
```

## 🎨 Technische Details

### Maus-Event-Flow

1. contextmenu → preventDefault()
2. mousedown (right) → startAnnotation()
3. mousemove → updatePreview()
4. mouseup → finalizeAnnotation()

### Koordinaten-System
javascript // Pixel → Schachfeld const pixelToSquare = (x, y, boardRect) => { const squareSize = boardRect.width / 8 const file = Math.floor((x - boardRect.left) / squareSize) const rank = Math.floor((y - boardRect.top) / squareSize) return indicesToSquare(file, rank) }

### Store-Schema

javascript:
{ arrows: [
  { id: 'arrow_1',
    from: 'e2', 
    to: 'e4', 
    color: 'red', 
    style: 'solid'
  }],
  markers: [ 
  { id: 'marker_1', 
    square: 'd4', 
    color: 'green', 
    type: 'circle'
  }],
  currentColor: 'red',
  isAnnotationMode: false
}

## 🧪 Testing-Plan

### Unit Tests
- [ ] Store-Funktionen testen
- [ ] Koordinaten-Umrechnung testen
- [ ] Pfeil-Berechnungen testen

### Integration Tests
- [ ] Maus-Events simulieren
- [ ] SVG-Rendering testen
- [ ] Persistierung testen

### E2E Tests
- [ ] Pfeil zeichnen (kompletter Flow)
- [ ] Markierung setzen
- [ ] Farbe wechseln
- [ ] Löschen-Funktionen

## 🚨 Risiken & Herausforderungen

### Technische Risiken
- **Performance:** Viele SVG-Elemente können langsam werden
    - *Lösung:* Virtual Scrolling oder Canvas-Rendering
- **Browser-Kompatibilität:** Rechtsklick-Events unterschiedlich
    - *Lösung:* Polyfills und ausführliche Tests
- **Mobile Support:** Touch-Events für Tablets/Phones
    - *Lösung:* Touch-Gesten implementieren

### UX-Herausforderungen
- **Versehentliche Aktivierung:** Rechtsklick-Konflikte
    - *Lösung:* Toggle-Modus oder Modifier-Keys
- **Übersichtlichkeit:** Zu viele Annotationen
    - *Lösung:* Gruppierung und Filter-Optionen

## 📈 Success Metrics

### Funktionale Anforderungen
- ✅ Pfeile zeichenbar in <1 Sekunde
- ✅ Markierungen setzbar in <0.5 Sekunden
- ✅ 99% korrekte Feld-Erkennung
- ✅ Unterstützung für min. 5 Farben

### Performance-Ziele
- ✅ <100ms Reaktionszeit auf Maus-Events
- ✅ Smooth Animation bei 60fps
- ✅ <5MB zusätzlicher Memory-Verbrauch
- ✅ Funktioniert mit 50+ gleichzeitigen Annotationen

## 🔄 Rollout-Plan

### Alpha (Interne Tests)
- Grundfunktionalität implementiert
- Basis-Tests bestanden
- Core-Features funktionsfähig

### Beta (Ausgewählte Benutzer)
- Alle Phasen 1-4 abgeschlossen
- Feedback-Integration
- Bug-Fixes und Optimierungen

### Production Release
- Alle Features getestet
- Dokumentation vollständig
- Performance-optimiert

---

**Letzte Aktualisierung:** 2025-07-23  
**Nächste Review:** Bei Abschluss Phase 2  
**Status:** 🚧 In Planung
