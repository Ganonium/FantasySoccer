import type { MatchSetup, TeamSetup } from './types';
import type { Difficulty } from './ai';

// Formationen aus Sicht des Teams, das unten verteidigt (y = 1 ist die eigene Torlinie).

export const HEROES: TeamSetup = {
  name: 'Ritter',
  color: '#4fc3f7',
  formation: [
    { kind: 'knight', x: 0.2, y: 0.76 },
    { kind: 'knight', x: 0.5, y: 0.83 },
    { kind: 'knight', x: 0.8, y: 0.76 },
  ],
};

const RIVALS: TeamSetup = {
  name: 'Schwarze Ritter',
  color: '#ef5350',
  look: 'dark',
  formation: HEROES.formation,
};

// Gegner-Formationen haben immer einen Spieler in der Mitte vor dem Tor, damit kein freier
// Schusskanal vom Anstoßpunkt direkt ins Tor führt.
const GOBLINS: TeamSetup = {
  name: 'Goblins',
  color: '#9ccc65',
  formation: [
    { kind: 'goblin', x: 0.5, y: 0.68 },
    { kind: 'goblin', x: 0.22, y: 0.76 },
    { kind: 'goblin', x: 0.78, y: 0.76 },
    { kind: 'goblin', x: 0.5, y: 0.86 },
  ],
};

const ORCS: TeamSetup = {
  name: 'Orks',
  color: '#ff8a50',
  formation: [
    { kind: 'orc', x: 0.36, y: 0.7 },
    { kind: 'orc', x: 0.56, y: 0.85 },
  ],
};

export interface Level {
  id: string;
  title: string;
  intro: string;
  setup: MatchSetup;
  difficulty: Difficulty;
}

export const CAMPAIGN: Level[] = [
  {
    id: 'training',
    title: 'Trainingsplatz',
    intro: 'Die Schwarzen Ritter fordern euch zum Übungsspiel. Drei gegen drei – zeig, was du kannst.',
    setup: { home: HEROES, away: RIVALS, goalsToWin: 3, firstKickoff: 'home' },
    difficulty: 'easy',
  },
  {
    id: 'goblins',
    title: 'Goblin-Höhle',
    intro: 'Vier flinke Goblins – klein, leicht, schwer zu treffen. Ramm sie vom Feld oder schieß an ihnen vorbei.',
    setup: { home: HEROES, away: GOBLINS, goalsToWin: 3, firstKickoff: 'home' },
    difficulty: 'normal',
  },
  {
    id: 'orcs',
    title: 'Ork-Lager',
    intro: 'Nur zwei Orks – aber groß, schwer und mit hartem Schlag. Halte Abstand und spiel über die Flügel.',
    setup: { home: HEROES, away: ORCS, goalsToWin: 3, firstKickoff: 'home' },
    difficulty: 'normal',
  },
];
