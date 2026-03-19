import {
  TILE, MAP_W, MAP_H, T, NHI_PROFILES, TOTAL_ISSUES,
  LETTER_PATTERNS, LETTER_POSITIONS,
  DESK_POSITIONS, POOL_Y, POOL_X_START, POOL_X_END,
  CACTUS_POSITIONS, PALM_POSITIONS, NPC_COLORS,
} from './constants';
import type { TileType, Desk, Player, NPC, Issue } from './types';

export function generateMap(): { map: TileType[][], desks: Desk[] } {
  const map: TileType[][] = [];
  const desks: Desk[] = [];

  // Fill with floor
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      map[y][x] = (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) 
        ? T.OUTER as TileType 
        : T.FLOOR as TileType;
    }
  }

  // Place OASIS letters
  const { topY, botY, oX, aX, s1X, iX, s2X } = LETTER_POSITIONS;
  
  placeLetter(map, LETTER_PATTERNS.O, oX, topY);
  placeLetter(map, LETTER_PATTERNS.A, aX, topY);
  placeLetter(map, LETTER_PATTERNS.S, s1X, botY);
  placeLetter(map, LETTER_PATTERNS.I, iX, botY);
  placeLetter(map, LETTER_PATTERNS.S, s2X, botY);

  // Add desks
  for (const [dx, dy] of DESK_POSITIONS) {
    if (dx > 0 && dx < MAP_W - 1 && dy > 0 && dy < MAP_H - 1 && map[dy][dx] === T.FLOOR) {
      addDesk(map, desks, dx, dy);
    }
  }

  // Oasis pool
  for (let x = POOL_X_START; x <= POOL_X_END; x++) {
    if (map[POOL_Y][x] === T.FLOOR) {
      map[POOL_Y][x] = T.POOL as TileType;
    }
  }

  // Cactuses
  for (const [x, y] of CACTUS_POSITIONS) {
    if (map[y][x] === T.FLOOR) {
      map[y][x] = T.CACTUS as TileType;
    }
  }

  // Palm trees
  for (const [x, y] of PALM_POSITIONS) {
    if (map[y][x] === T.FLOOR) {
      map[y][x] = T.PALM as TileType;
    }
  }

  return { map, desks };
}

function placeLetter(map: TileType[][], pattern: string[], sx: number, sy: number): void {
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      if (pattern[y][x] === '1') {
        const tx = sx + x;
        const ty = sy + y;
        if (tx > 0 && tx < MAP_W - 1 && ty > 0 && ty < MAP_H - 1) {
          map[ty][tx] = T.WALL as TileType;
        }
      }
    }
  }
}

function addDesk(map: TileType[][], desks: Desk[], x: number, y: number): void {
  map[y][x] = T.DESK as TileType;
  const prof = NHI_PROFILES[desks.length % NHI_PROFILES.length];

  // Find adjacent floor for NPC - prioritize BELOW desk
  let nx = x, ny = y;
  for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
    if (map[y + dy] && map[y + dy][x + dx] === T.FLOOR) {
      nx = x + dx;
      ny = y + dy;
      break;
    }
  }

  desks.push({ x, y, nx, ny, profile: prof, hasIssue: false });
}

export function createPlayer(map: TileType[][]): Player {
  const sx = Math.floor(MAP_W / 2);
  const sy = MAP_H - 3;

  let fx = sx, fy = sy;
  outer: for (let r = 0; r < 10; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const cx = sx + dx;
        const cy = sy + dy;
        if (cy > 0 && cy < MAP_H - 1 && cx > 0 && cx < MAP_W - 1 && map[cy][cx] === T.FLOOR) {
          fx = cx;
          fy = cy;
          break outer;
        }
      }
    }
  }

  return {
    x: fx * TILE,
    y: fy * TILE,
    dir: 0,
    frame: 0,
    timer: 0,
    moving: false,
  };
}

export function createNPCs(desks: Desk[]): NPC[] {
  return desks.map((d, i) => ({
    x: d.nx * TILE,
    y: d.ny * TILE,
    desk: d,
    color: NPC_COLORS[i % NPC_COLORS.length],
    frame: 0,
    happy: 0,
  }));
}

export function createIssues(desks: Desk[]): Issue[] {
  const issues: Issue[] = [];
  const shuffled = [...desks].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(TOTAL_ISSUES, desks.length));

  selected.forEach((d, i) => {
    d.hasIssue = true;
    issues.push({
      type: i,
      x: d.x * TILE,
      y: d.y * TILE,
      tx: d.x,
      ty: d.y,
      desk: d,
      fixed: false,
      anim: 0,
    });
  });

  return issues;
}
