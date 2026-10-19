# FantasySoccer – Hinweise für Claude

- Sprache im Projekt: Deutsch (UI-Texte, Kommentare, Doku). Code-Bezeichner Englisch.
- `src/core/` darf weder DOM noch `Math.random`/`Date` verwenden: der Spielkern muss
  deterministisch bleiben (Basis für Replays und späteren Multiplayer). Zufall nur über `rng.ts`.
- Spielwerte gehören nach `src/core/config.ts` bzw. `units.ts`/`campaign.ts`, nicht in den Code.
- Koordinaten sind logische Feld-Einheiten (900 × 1600), nie Bildschirmpixel.
- Vor jedem Commit: `npm test` und `npm run build` (inkl. Typecheck) müssen grün sein.
