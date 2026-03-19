import { NHIProfile, IssueType } from './types';

// Game dimensions
export const TILE = 32;
export const MAP_W = 32;
export const MAP_H = 26;
export const VW = 640;  // Viewport width (20 tiles)
export const VH = 480;  // Viewport height (15 tiles)

// Gameplay
export const PLAYER_SPEED = 3.5;
export const FIX_RANGE = 70;
export const GAME_TIME = 120;
export const TOTAL_ISSUES = 9;

// Tile types
export const T = {
  FLOOR: 0,
  WALL: 1,
  DESK: 2,
  OUTER: 3,
  POOL: 4,
  CACTUS: 5,
  PALM: 6,
} as const;

export const WALKABLE = new Set<number>([T.FLOOR, T.POOL]);

// Colors
export const OASIS = {
  teal: '#14B8A6',
  tealLight: '#5EEAD4',
  tealDark: '#0D9488',
};

export const DESERT = {
  sandLight: '#F5E6C8',
  sandMid: '#E8D5B7',
  sandDark: '#C4955C',
  sandDeep: '#A67B45',
  cactus: '#5A7A5A',
  cactusDark: '#3D5E3D',
  rock: '#8B7355',
};

// NHI Profiles
export const NHI_PROFILES: NHIProfile[] = [
  { id: 'svc-deploy', kind: 'automation', risk: 78 },
  { id: 'svc-auth', kind: 'automation', risk: 92 },
  { id: 'agent-k8s', kind: 'agent', risk: 85 },
  { id: 'agent-scan', kind: 'agent', risk: 76 },
  { id: 'bot-release', kind: 'bot', risk: 79 },
  { id: 'bot-slack', kind: 'bot', risk: 62 },
  { id: 'wkld-api', kind: 'workload', risk: 84 },
  { id: 'sa-terraform', kind: 'svc-acct', risk: 90 },
  { id: 'sa-vault', kind: 'svc-acct', risk: 95 },
];

// Issue types
export const ISSUES: IssueType[] = [
  { name: 'Credential Leak', sev: 'CRIT' },
  { name: 'Identity Breach', sev: 'CRIT' },
  { name: 'Expired Cert', sev: 'HIGH' },
  { name: 'Stale Token', sev: 'HIGH' },
  { name: 'Permission Conflict', sev: 'HIGH' },
  { name: 'Unrotated Secret', sev: 'CRIT' },
  { name: 'Dormant Identity', sev: 'MED' },
  { name: 'Secret Sprawl', sev: 'HIGH' },
  { name: 'Log Overflow', sev: 'MED' },
];

// NPC Colors
export const NPC_COLORS = [
  '#cc4444', '#4466cc', '#44aa44', '#cc8833', '#bb44bb',
  '#44aaaa', '#7777cc', '#cc7777', '#77bb77'
];

// Kind colors for labels
export const KIND_COLORS: Record<string, string> = {
  automation: '#4488ff',
  agent: '#44cc44',
  bot: '#cc44cc',
  workload: '#ff8844',
  'svc-acct': '#ffcc44',
};

// OASIS letter patterns (5x5)
export const LETTER_PATTERNS = {
  O: ['01110', '10001', '10001', '10001', '01110'],
  A: ['01110', '10001', '11111', '10001', '10001'],
  S: ['01111', '10000', '01110', '00001', '11110'],
  I: ['11111', '00100', '00100', '00100', '11111'],
};

// Letter positions
export const LETTER_POSITIONS = {
  topY: 4,
  botY: 14,
  oX: 6,
  aX: 14,
  s1X: 3,
  iX: 12,
  s2X: 21,
};

// Desk positions
export const DESK_POSITIONS = [
  // Top area
  [3, 3],
  [12, 4],
  [12, 5],
  [20, 6],
  [28, 3],
  // Middle area
  [3, 11],
  [28, 11],
  // Bottom area
  [9, 15],
  [10, 16],
  [18, 15],
  [19, 16],
  // Bottom corners
  [4, 22],
  [27, 22],
];

// Pool position
export const POOL_Y = 11;
export const POOL_X_START = 13;
export const POOL_X_END = 18;

// Cactus positions
export const CACTUS_POSITIONS = [
  [2, 2],
  [MAP_W - 3, 2],
  [2, MAP_H - 3],
  [MAP_W - 3, MAP_H - 3],
];

// Palm tree positions
export const PALM_POSITIONS = [
  [10, 11],
  [22, 11],
  [5, 21],
  [26, 21],
];
