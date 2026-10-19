// Alle Spielwerte zentral. Längen in logischen Feld-Einheiten (unabhängig von
// Bildschirmgröße), Zeiten in Sekunden, Geschwindigkeiten in Einheiten/Sekunde.

export const FIELD = {
  width: 900,
  height: 1600,
  goalWidth: 360,
  goalDepth: 70,
  postRadius: 10,
  /** Abgerundete Spielfeldecken – verhindert, dass der Ball in der Ecke festhängt. */
  cornerRadius: 110,
  /** 5-Meter-Raum: bleibt der Ball darin liegen, gibt es Abstoß von seiner Ecke. */
  goalAreaWidth: 520,
  goalAreaDepth: 130,
  /** Strafraum (nur Markierung). */
  penaltyAreaWidth: 640,
  penaltyAreaDepth: 300,
} as const;

export const PHYSICS = {
  /** Feste Länge eines Simulations-Ticks. */
  TICK: 1 / 120,
  /** Physik-Unterschritte pro Tick – verhindert Durchtunneln bei hohen Geschwindigkeiten. */
  SUBSTEPS: 2,
  /** Iterationen der Überlappungskorrektur pro Unterschritt. */
  SOLVER_ITERATIONS: 3,
  /** Exponentielle Dämpfung (1/s). Entspricht ca. Faktor 0,983 pro Frame bei 60 fps. */
  DAMPING: 1.03,
  /** Lineare Rollreibung (Einheiten/s²) – lässt langsame Körper zügig ausrollen. */
  ROLL_DECEL: 60,
  /** Darunter gilt ein Körper als ruhend. */
  MIN_SPEED: 12,
  RESTITUTION: 0.74,
  BALL_RESTITUTION: 0.82,
  WALL_RESTITUTION: 0.6,
  POST_RESTITUTION: 0.7,
  /** Sicherheitsnetz: so lange darf eine Simulationsphase höchstens dauern. */
  MAX_SIM_TIME: 20,
} as const;

export const BALL = {
  radius: 33,
  /** Masse relativ zu einem Standard-Spieler (Radius 66). */
  mass: 0.14,
} as const;

/** Referenzradius für die Masseberechnung: Ein Einheitskreis dieser Größe hat Masse 1. */
export const REFERENCE_RADIUS = 66;

export const SHOT = {
  /** Maximale Abschussgeschwindigkeit eines Spielers mit shotPower 1. */
  MAX_SPEED: 2900,
  /** Maximale Zieh-Länge in Feld-Einheiten (entspricht voller Kraft). */
  MAX_PULL: 220,
  /** Kürzere Züge werden ignoriert (versehentliches Antippen). */
  MIN_PULL: 14,
} as const;

export const COMBAT = {
  /**
   * Mindestgeschwindigkeit, mit der der Rammende auf den Gegner zufahren muss, damit der
   * Zusammenstoß Schaden macht. Rammen kann nur das Team, das gerade geschossen hat.
   */
  MIN_IMPACT_SPEED: 700,
  /** Dasselbe Paar kann sich frühestens nach dieser Zeit erneut verletzen. */
  HIT_COOLDOWN: 0.35,
} as const;

export const RULES = {
  GOAL_PAUSE: 2,
  /** true: Nach jedem Tor bekommen alle Einheiten volle HP und KO-Einheiten kehren zurück. */
  RESTORE_ON_KICKOFF: false,
} as const;
