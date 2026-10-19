// Reine Datentypen. Der komplette Spielzustand ist ein einfaches, JSON-serialisierbares
// Objekt (MatchState) – Voraussetzung für Speichern, Replays und späteren Multiplayer.

export type TeamId = 'home' | 'away';

export type UnitKind = 'knight' | 'goblin' | 'orc' | 'dragon';

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
}

export interface Unit extends Body {
  id: number;
  team: TeamId;
  kind: UnitKind;
  hp: number;
  maxHp: number;
  atk: number;
  shotPower: number;
  active: boolean;
  /** Index in der Formation – bestimmt den Platz beim Anstoß. */
  slot: number;
}

export type Ball = Body;

export interface FormationSlot {
  kind: UnitKind;
  /** Normierte Position (0..1) aus Sicht des Heimteams, das unten verteidigt. */
  x: number;
  y: number;
}

/** Rein optische Variante eines Teams (z. B. schwarze Rüstungen). */
export type TeamLook = 'default' | 'dark';

export interface TeamSetup {
  name: string;
  color: string;
  look?: TeamLook;
  formation: FormationSlot[];
}

export interface MatchSetup {
  home: TeamSetup;
  away: TeamSetup;
  goalsToWin: number;
  /** Wer den ersten Anstoß hat. */
  firstKickoff: TeamId;
}

export type Phase = 'aim' | 'sim' | 'goal' | 'over';

export type WinReason = 'goals' | 'knockout';

export interface MatchState {
  setup: MatchSetup;
  units: Unit[];
  ball: Ball;
  score: Record<TeamId, number>;
  phase: Phase;
  /** Im Zielen: wer jetzt schießt. In der Simulation: wer zuletzt geschossen hat. */
  turn: TeamId;
  /** Sekunden seit Beginn der aktuellen Phase. */
  phaseTime: number;
  /** Fortlaufende Zugnummer, praktisch für KI-Zufall und Replays. */
  turnNumber: number;
  winner: TeamId | null;
  winReason: WinReason | null;
  /** Abklingzeiten für Treffer zwischen Einheitenpaaren, Schlüssel "idA:idB". */
  hitCooldowns: Record<string, number>;
}

export type GameEvent =
  | { type: 'shot'; team: TeamId; unitId: number; speed: number }
  | { type: 'impact'; kind: 'unit' | 'ball' | 'wall' | 'post'; speed: number; x: number; y: number }
  | { type: 'hit'; attackerId: number; targetId: number; damage: number; x: number; y: number }
  | { type: 'ko'; unitId: number; x: number; y: number }
  | { type: 'goal'; scorer: TeamId }
  | { type: 'goalKick'; x: number; y: number }
  | { type: 'turn'; team: TeamId }
  | { type: 'over'; winner: TeamId; reason: WinReason };

export const otherTeam = (t: TeamId): TeamId => (t === 'home' ? 'away' : 'home');
