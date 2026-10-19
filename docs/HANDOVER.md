# Kickball – Projekt-Übergabe (aus Claude Chat)

> Originaltext der Übergabe, unverändert übernommen. Abweichungen zum tatsächlichen
> Code-Stand stehen in [REVIEW.md](REVIEW.md).

## Was ist das?

Ein mobiles Fußball-Billard-Spiel für Android (Hochformat). Das Konzept: 3 vs. 3 Spieler als
Kreise auf einem Spielfeld mit Toren oben und unten. Steuerung wie Billard – Spieler antippen,
zurückziehen, loslassen. Physik mit Impulsübertragung, Reibung, Elastizität.

## Aktueller Stand

Der Prototyp existiert als einzelne `kickball.html` (alles inline, kein Build-Step, kein
Framework) – im Repo unter [`prototype/kickball.html`](../prototype/kickball.html).

### Was funktioniert

- Hochkant-Canvas (9:16), passt sich ans Fenster an
- 3v3 Kreise + Ball, korrekte Größenverhältnisse
- Drag-to-shoot mit Richtungspfeil und Power-Streifen
- Impuls-Physik: Kollisionen mit Masse, Winkel, Elastizität, Reibung
- Wandkollision: Spieler prallen überall ab, nur der Ball darf durchs Tor
- Tore oben (KI) und unten (Spieler), Torerkennung mit Flash
- Rundenbasiert: Spieler schießt → alles rollt aus → KI schießt → etc.
- Scripted KI mit Denkpause (~1 Sek.) und leichter Streuung
- Anstoß-Logik: wer ein Tor kassiert hat, beginnt die nächste Runde
- Punktestand UI

### Bekannte gelöste Bugs (nicht nochmal anfassen)

- Doppelzug-Bug: `lastTurn` wird jetzt beim Schuss gesetzt, nicht nach dem Ausrollen
- Ball-durch-Wand-Bug: `resolveWalls` prüft `instanceof Player` – nur Ball passiert Torlücke
- Spieler aus dem Feld: alle vier Wände hart für Spieler

## Architektur (alles inline in einer HTML-Datei)

```
CONFIG        – alle Spielwerte zentral (Reibung, Radien, Formationen, Farben…)
Circle/Player/Ball  – Entity-Klassen
applyFriction/integrate/resolveWalls/resolveCollisions/allAtRest  – Physik-Funktionen
Renderer      – Canvas-Zeichenroutinen (Feld, Spieler, Ball, Drag-Indikator, Flash)
Input         – Touch Events (Android) + Maus-Fallback für Desktop-Dev
AI            – Scripted KI mit setTimeout-Verzögerung
Game          – State Machine + Game Loop
  States: IDLE | PLAYER | SIM | AI | GOAL
  lastTurn: 'player' | 'ai' – wird beim Schuss gesetzt
```

### State-Logik

- `PLAYER` → Spieler zieht und lässt los → `lastTurn='player'` + `SIM`
- `AI` → KI plant Schuss → `lastTurn='ai'` + `SIM`
- `SIM` → Physik läuft → wenn `allAtRest`: wechsle zu anderem Team
- `GOAL` → 2 Sek. Pause → Spawn → Verlierer beginnt

## Nächste Features (Priorität)

1. **HP/ATK-System** – Spieler haben HP (z.B. 3) und ATK-Wert. Wenn ein Spieler getroffen wird,
   bekommt er Schaden = ATK des Angreifers. Bei 0 HP verschwindet er vom Feld. Entities haben
   bereits `hp` und `atk` Properties als Platzhalter.
2. **Bessere KI** – aktuell schießt die KI immer auf den Ball ohne Positionierung. Verbesserung:
   erst günstig positionierten Spieler wählen, Winkel berechnen um Ball ins Tor zu lenken.
3. **Sound** – kurze Web Audio API Sounds für Kollision, Tor, Schuss.
4. **Multiplayer** – langfristig zwei Smartphones über WebSocket. State ist bereits als
   serialisierbares Objekt strukturiert.

## Setup

```bash
# Kein Build-Step, direkt im Browser öffnen
# Für Android-Test: lokalen Server starten
npx serve prototype
# oder
python3 -m http.server 8080 --directory prototype
# Dann im Android-Browser: http://<PC-IP>:8080/kickball.html
```

Für die Weiterentwicklung empfiehlt sich eine modulare Struktur (config.js, entities.js,
physics.js, input.js, renderer.js, ai.js, main.js) mit einem einfachen Dev-Server (Vite o.ä.).
