// Game dimensions - matching original
export const TILE = 40;
export const MAP_W = 44;
export const MAP_H = 34;
export const VW = 880;
export const VH = 680;

// Gameplay
export const PLAYER_SPEED = 3.8;
export const FIX_RANGE = 72;
export const GAME_TIME = 60; // 1 minute
export const TOTAL_ISSUES = 9;

// Split-screen dimensions
export const SPLIT_VW = 440; // Half of VW for each player

// Tile types
export const T = {
  FLOOR: 0,
  WALL: 1,
  DESK: 2,
  OUTER: 3,
  PLANT: 4,
  COOLER: 5,
  PALM: 6,
  CACTUS: 7,
  WATER: 8,
} as const;

export const WALKABLE = new Set<number>([T.FLOOR]);

// Colors - Oasis brand style
export const COL = {
  floor1: '#d4c4a0',
  floor2: '#cebf9a',
  wall: '#7a8a9a',
  wallTrim: '#a0b0c0',
  wallDark: '#5a6878',
  desk: '#8c6428',
  deskTop: '#a47838',
  outer: '#c4a060',      // Sandy dune color
  outerTop: '#d4b070',   // Lighter sand
  outerDark: '#a08050',  // Darker sand
};

// Oasis brand colors
export const OASIS = {
  teal: '#14B8A6',
  tealLight: '#5EEAD4',
  tealDark: '#0D9488',
  navy: '#1a2535',
  navyLight: '#2a3545',
  gold: '#d4a855',
  sand: '#e8d4a8',
  water: '#38bdf8',
  waterDark: '#0ea5e9',
};

// NHI Profiles with detailed info
export interface NHIProfile {
  id: string;
  kind: string;
  team: string;
  risk: number;
}

export const NHI_PROFILES: NHIProfile[] = [
  { id: 'svc-deploy', kind: 'automation', team: 'DevOps', risk: 78 },
  { id: 'svc-auth', kind: 'automation', team: 'Identity', risk: 92 },
  { id: 'svc-billing', kind: 'automation', team: 'FinanceOps', risk: 83 },
  { id: 'svc-notify', kind: 'automation', team: 'Platform', risk: 72 },
  { id: 'svc-gateway', kind: 'automation', team: 'Platform', risk: 88 },
  { id: 'agent-k8s', kind: 'agent', team: 'Ops', risk: 85 },
  { id: 'agent-scan', kind: 'agent', team: 'Security', risk: 91 },
  { id: 'agent-backup', kind: 'agent', team: 'Infra', risk: 67 },
  { id: 'agent-ci', kind: 'agent', team: 'DevOps', risk: 74 },
  { id: 'agent-log', kind: 'agent', team: 'Observability', risk: 58 },
  { id: 'bot-release', kind: 'bot', team: 'DevOps', risk: 79 },
  { id: 'bot-slack', kind: 'bot', team: 'IT', risk: 62 },
  { id: 'bot-jira', kind: 'bot', team: 'Engineering', risk: 55 },
  { id: 'bot-pager', kind: 'bot', team: 'Ops', risk: 71 },
  { id: 'bot-test', kind: 'bot', team: 'QA', risk: 56 },
  { id: 'wkld-api', kind: 'workload', team: 'Backend', risk: 84 },
  { id: 'wkld-etl', kind: 'workload', team: 'Data', risk: 77 },
  { id: 'wkld-ml', kind: 'workload', team: 'ML', risk: 69 },
  { id: 'wkld-cache', kind: 'workload', team: 'Platform', risk: 63 },
  { id: 'wkld-queue', kind: 'workload', team: 'Platform', risk: 66 },
  { id: 'sa-terraform', kind: 'svc-acct', team: 'Infra', risk: 94 },
  { id: 'sa-ansible', kind: 'svc-acct', team: 'Infra', risk: 86 },
  { id: 'sa-vault', kind: 'svc-acct', team: 'Security', risk: 97 },
  { id: 'sa-jenkins', kind: 'svc-acct', team: 'DevOps', risk: 89 },
  { id: 'sa-argocd', kind: 'svc-acct', team: 'DevOps', risk: 82 },
];

// Shirt colors for NPCs
export const SHIRT_COLORS = [
  '#cc4444', '#4466cc', '#44aa44', '#cc8833', '#bb44bb',
  '#44aaaa', '#7777cc', '#cc7777', '#77bb77', '#bbbb44', '#8844cc'
];

// Hair colors
export const HAIR_COLORS = [
  '#332211', '#553322', '#221100', '#664422', 
  '#443311', '#887744', '#222222', '#aa6633'
];

// Issue/Distraction types with detailed info
export const ISSUE_TYPES = [
  { name: 'Credential Leak', pillar: 'Secrets', risk: 'CRIT', desc: 'Exposed credentials in logs or config files pose immediate risk.' },
  { name: 'Security Breach', pillar: 'Posture', risk: 'CRIT', desc: 'Active breach detected requiring immediate containment.' },
  { name: 'Expired Certificate', pillar: 'Posture', risk: 'High', desc: 'Expired trust chains break secure service-to-service communication.' },
  { name: 'Stale API Token', pillar: 'Lifecycle', risk: 'High', desc: 'Long-lived tokens without rotation increase blast radius.' },
  { name: 'Permission Conflict', pillar: 'Posture', risk: 'High', desc: 'Conflicting permissions violate least-privilege principle.' },
  { name: 'Unrotated Secret', pillar: 'Secrets', risk: 'CRIT', desc: 'Secrets without rotation schedule risk long-term exposure.' },
  { name: 'Dormant Identity', pillar: 'Lifecycle', risk: 'Med', desc: 'Inactive identities should be deprovisioned to reduce attack surface.' },
  { name: 'Secret Sprawl', pillar: 'Discovery', risk: 'High', desc: 'Duplicate secrets across systems complicate rotation.' },
  { name: 'Log Overflow', pillar: 'Observability', risk: 'Med', desc: 'Excessive logging may expose sensitive data in audit trails.' },
];
