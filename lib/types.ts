export type TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Player {
  x: number;
  y: number;
  dir: number;
  frame: number;
  frameTimer: number;
  moving: boolean;
}

export interface NHIProfile {
  id: string;
  kind: string;
  team: string;
  risk: number;
}

export interface Cubicle {
  x: number;
  y: number;
  deskX: number;
  deskY: number;
  openX: number;
  openY: number;
  label: string;
  profile: NHIProfile;
}

export interface NPC {
  tileX: number;
  tileY: number;
  x: number;
  y: number;
  state: 'working' | 'distracted';
  shirtColor: string;
  hairColor: string;
  frame: number;
  distractionRef: Issue | null;
  happyTimer: number;
}

export interface Issue {
  type: number;
  tileX: number;
  tileY: number;
  x: number;
  y: number;
  fixed: boolean;
  animFrame: number;
  cubicle: Cubicle;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Camera {
  x: number;
  y: number;
}

export type GameScreen = 'title' | 'playing' | 'win' | 'lose';

export interface DrawPersonOptions {
  isPlayer?: boolean;
  sitting?: boolean;
  typing?: boolean;
  walking?: boolean;
  shirtColor?: string;
  hairColor?: string;
  frame?: number;
  happyTimer?: number;
  distracted?: boolean;
}
