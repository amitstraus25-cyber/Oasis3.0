export interface Player {
  x: number;
  y: number;
  dir: number;
  frame: number;
  timer: number;
  moving: boolean;
}

export interface NHIProfile {
  id: string;
  kind: 'automation' | 'agent' | 'bot' | 'workload' | 'svc-acct';
  risk: number;
}

export interface Desk {
  x: number;
  y: number;
  nx: number;
  ny: number;
  profile: NHIProfile;
  hasIssue: boolean;
}

export interface NPC {
  x: number;
  y: number;
  desk: Desk;
  color: string;
  frame: number;
  happy: number;
}

export interface IssueType {
  name: string;
  sev: 'CRIT' | 'HIGH' | 'MED';
}

export interface Issue {
  type: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  desk: Desk;
  fixed: boolean;
  anim: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface SandParticle {
  x: number;
  y: number;
  vy: number;
  life: number;
  size: number;
}

export interface Camera {
  x: number;
  y: number;
}

export type TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type GameScreen = 'title' | 'playing' | 'win' | 'lose';

export interface GameState {
  screen: GameScreen;
  map: TileType[][];
  desks: Desk[];
  player: Player | null;
  npcs: NPC[];
  issues: Issue[];
  particles: Particle[];
  sandParticles: SandParticle[];
  timer: number;
  fixed: number;
  cooldown: number;
  tick: number;
  flash: number;
  camera: Camera;
  keys: Record<string, boolean>;
}

export interface DrawPersonOptions {
  color?: string;
  walking?: boolean;
  frame?: number;
  happy?: number;
  hair?: string;
  isPlayer?: boolean;
}
