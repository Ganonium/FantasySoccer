# Review des Prototyps `prototype/kickball.html`

Stand: Code-Lektüre, nicht im Browser getestet. Zeilennummern beziehen sich auf
`prototype/kickball.html`.

## Abweichungen zwischen Übergabe und Code

- `hp`/`atk` existieren **nicht** – `Player` hat nur `team` und `active` (Z. 116–120).
- Der Spielzustand ist **nicht** als serialisierbares Objekt gebaut, sondern über
  Klasseninstanzen, `setTimeout`-Timer und DOM verteilt.
- Eine `/game/`-Modulstruktur gibt es nicht.

## Bugs

1. **Restitution falsch angewendet** (Z. 190): `imp = 2*dot/tm * e` statt
   `(1+e)*dot/tm`. Effektiv e ≈ 0,48 statt 0,74; bei e = 0 würden sich Körper durchdringen.
2. **Resize zerschießt das Feld** (Z. 658–665): Canvas wird neu dimensioniert, `_compute()`
   läuft aber nur in `init()`. Auf Android reicht das Ein-/Ausblenden der Adressleiste.
3. **Physik framerate-abhängig** (Z. 541–556): ein Physik-Schritt pro `requestAnimationFrame`
   → auf 90/120-Hz-Displays läuft alles 1,5–2× so schnell, auch der Flash-Timer.
4. **Softlock ohne aktive Spieler**: `AI._plan` liefert `null`, Callback kommt nie, Zustand
   bleibt `AI`. Spielerseite analog. Wird mit HP/ATK real.
5. **Input** (Z. 377–436): Mouseup außerhalb des Canvas → Drag bleibt hängen; zweiter Finger
   überschreibt den Drag, `touches[0]` kann der falsche Finger sein. Lösung: Pointer Events
   mit `setPointerCapture` und `pointerId`.
6. **Hohe Geschwindigkeiten**: Ball (sehr leicht) erreicht nach Stoß ~30 px/Frame bei
   ~14 px Radius → tiefe Überlappungen, falsche Normalen. Lösung: Substeps + mehrere
   Kollisions-Iterationen.
7. Kleinere Punkte:
   - Kollisionsauflösung nach den Wänden kann Körper kurz aus dem Feld drücken.
   - Keine Torpfosten – Ball rutscht am Pfosten halb durch.
   - Statusanzeige zeigt auch bei Gegentor „⚽ TOR!“.
   - Kein `devicePixelRatio` → unscharf auf Android.
   - UI-Offset 48 px und Tortiefe 30 px als feste Pixelwerte.
   - Keine Siegbedingung, kein Neustart, keine Pause bei `visibilitychange`.

## Verbesserungsideen

- **Struktur**: Vite + ES-Module; reiner Spielzustand (`{ entities, score, turn, phase }`)
  getrennt von Renderer/Input; deterministische Physik mit festem Zeitschritt (Basis für
  Multiplayer/Lockstep).
- **HP/ATK**: Schaden nur bei Gegnerkontakt über Mindest-Stoßgeschwindigkeit, „Verursacher“
  mitführen, kurze Unverwundbarkeit pro Kontakt, HP-Anzeige am Spieler; offen: Reset beim Anstoß?
- **KI**: Ghost-Ball-Zielpunkt hinter dem Ball, Auswahl nach Winkel/Distanz/freier Bahn,
  Schusskraft nach Distanz, Streuung als Schwierigkeitsgrad.
- **Sound**: kleines Web-Audio-Modul, Lautstärke nach Stoßstärke, Audio beim Start-Tap
  entsperren.
- **Android**: `viewport-fit=cover`, Safe-Area, PWA-Manifest (portrait, fullscreen),
  Vibration bei Tor.
