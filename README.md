# FantasySoccer

Fußball-Billard mit Fantasy-Gegnern – ein mobiles Rundenspiel im Hochformat (PWA für Android).
Tippe einen deiner Spieler an, zieh zurück und lass los: Schieß den Ball ins gegnerische Tor
oder ramm Goblins, Orks & Co. vom Feld.

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server, im LAN erreichbar: http://<PC-IP>:5173
npm test           # Unit-Tests (Vitest)
npm run build      # Typecheck + Produktions-Build nach dist/
npm run preview    # Build lokal ansehen (inkl. Service Worker)
```

Auf dem Android-Handy die LAN-Adresse im Chrome öffnen. Über „Zum Startbildschirm hinzufügen“
lässt sich der Produktions-Build als App installieren (Vollbild, Hochformat, offline spielbar).

Jeder Push auf `main` wird automatisch auf GitHub Pages veröffentlicht, sobald unter
*Settings → Pages → Source* „GitHub Actions“ eingestellt ist.

## Aufbau

```
src/core/          Spiellogik ohne DOM – deterministisch und testbar
  config.ts        alle Spielwerte (Feld, Physik, Schuss, Kampf, Regeln)
  types.ts         Datentypen; MatchState ist ein reines, serialisierbares Objekt
  units.ts         Einheitentypen (Ritter, Goblin, Ork): Radius, Masse, HP, ATK, Schusskraft
  physics.ts       Kreis-Physik mit festem Zeitschritt, Substeps, Torpfosten
  match.ts         Spielablauf: Schuss → Ausrollen → Zugwechsel, Tore, Rammen/HP, Sieg
  ai.ts            KI: „Geisterball“-Zielen aufs Tor, Rammangriffe, Schwierigkeitsgrade
  campaign.ts      Teams, Formationen und Kampagnen-Level
  rng.ts           Seed-basierter Zufall
src/client/        Browser-Teil
  main.ts          Game-Loop, HUD, Menü, Ergebnis-Screen, Service-Worker-Registrierung
  renderer.ts      Canvas-Zeichnung (DPR-scharf, skaliert auf jede Bildschirmgröße)
  input.ts         Billard-Steuerung über Pointer Events
  progress.ts      Kampagnen-Fortschritt (localStorage)
public/            PWA-Manifest, Service Worker, Icons
tests/             Vitest-Tests für Physik, Regeln und KI
prototype/         ursprünglicher Single-File-Prototyp (nur noch Referenz)
docs/              Übergabe aus Claude Chat und Review des Prototyps
```

## Spielregeln

- Abwechselnd ein Schuss pro Zug; der nächste Zug beginnt, wenn alles ausgerollt ist.
- Tor: der Ball überquert die Torlinie. Wer ein Tor kassiert, hat Anstoß.
- **Rammen:** Stoßen zwei gegnerische Einheiten schnell genug zusammen, verliert die gerammte
  Einheit so viele HP, wie der Angreifer ATK hat (Angreifer = wer schneller auf den anderen
  zufährt). Bei 0 HP verlässt die Einheit das Feld.
- Sieg: zuerst `goalsToWin` Tore – oder alle gegnerischen Einheiten vom Feld gerammt.
