import { T, MAP_W, MAP_H, TILE, NHI_PROFILES, SHIRT_COLORS, HAIR_COLORS, TOTAL_ISSUES, OASIS } from './constants';
import type { TileType, Cubicle, Player, NPC, Issue, Camel } from './types';

export function generateMap(): { map: TileType[][], cubicles: Cubicle[] } {
  const map: TileType[][] = [];
  const cubicles: Cubicle[] = [];

  // Initialize floor
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      map[y][x] = T.FLOOR;
    }
  }

  // Outer walls
  for (let x = 0; x < MAP_W; x++) {
    map[0][x] = T.OUTER;
    map[MAP_H - 1][x] = T.OUTER;
  }
  for (let y = 0; y < MAP_H; y++) {
    map[y][0] = T.OUTER;
    map[y][MAP_W - 1] = T.OUTER;
  }

  // Cubicle grid
  const sX = 3, sY = 3, gX = 5, gY = 5;
  const skipCol = 3, skipRow = 2;
  const shuffledProfiles = [...NHI_PROFILES].sort(() => Math.random() - 0.5);
  let ni = 0;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      if (col === skipCol || row === skipRow) continue;
      const tx = sX + col * gX;
      const ty = sY + row * gY;
      if (tx + 3 > MAP_W - 2 || ty + 3 > MAP_H - 2) continue;

      // Cubicle walls
      map[ty][tx] = T.WALL;
      map[ty][tx + 1] = T.WALL;
      map[ty][tx + 2] = T.WALL;
      map[ty + 1][tx] = T.WALL;
      map[ty + 2][tx] = T.WALL;
      map[ty + 1][tx + 1] = T.DESK;

      const profile = shuffledProfiles[ni % shuffledProfiles.length];
      cubicles.push({
        x: tx,
        y: ty,
        deskX: tx + 1,
        deskY: ty + 1,
        openX: tx + 2,
        openY: ty + 2,
        label: profile.id,
        profile: profile
      });
      ni++;
    }
  }

  // Plants along hallways
  const hallY = sY + skipRow * gY;
  const hallX = sX + skipCol * gX;
  for (let x = 2; x < MAP_W - 2; x += 7) {
    if (hallY < MAP_H && map[hallY][x] === T.FLOOR) {
      map[hallY][x] = T.PLANT;
    }
  }
  for (let y = 2; y < MAP_H - 2; y += 8) {
    if (hallX < MAP_W && map[y][hallX] === T.FLOOR) {
      map[y][hallX] = T.PLANT;
    }
  }

  // Water coolers
  if (hallY + 1 < MAP_H && hallX + 2 < MAP_W && map[hallY + 1][hallX + 2] === T.FLOOR) {
    map[hallY + 1][hallX + 2] = T.COOLER;
  }
  if (hallY + 1 < MAP_H && 3 < MAP_W && map[hallY + 1][3] === T.FLOOR) {
    map[hallY + 1][3] = T.COOLER;
  }

  // === OASIS ELEMENTS ===
  
  // Palm trees at corners, edges, and scattered inside (doubled amount)
  const palmPositions = [
    // Corners
    [2, 2], [MAP_W - 3, 2], [2, MAP_H - 3], [MAP_W - 3, MAP_H - 3],
    // Top/bottom center
    [Math.floor(MAP_W / 2), 2], [Math.floor(MAP_W / 2), MAP_H - 3],
    // Left/right center
    [2, Math.floor(MAP_H / 2)], [MAP_W - 3, Math.floor(MAP_H / 2)],
    // Additional palms - quarter positions
    [Math.floor(MAP_W / 4), 2], [Math.floor(3 * MAP_W / 4), 2],
    [Math.floor(MAP_W / 4), MAP_H - 3], [Math.floor(3 * MAP_W / 4), MAP_H - 3],
    [2, Math.floor(MAP_H / 4)], [2, Math.floor(3 * MAP_H / 4)],
    [MAP_W - 3, Math.floor(MAP_H / 4)], [MAP_W - 3, Math.floor(3 * MAP_H / 4)],
  ];
  for (const [px, py] of palmPositions) {
    if (py > 0 && py < MAP_H - 1 && px > 0 && px < MAP_W - 1 && map[py][px] === T.FLOOR) {
      map[py][px] = T.PALM;
    }
  }

  // Cacti in the outer sandy border (more frequent)
  for (let x = 0; x < MAP_W; x++) {
    if (x % 4 === 2) {
      if (map[0][x] === T.OUTER) map[0][x] = T.CACTUS;
      if (map[MAP_H - 1][x] === T.OUTER) map[MAP_H - 1][x] = T.CACTUS;
    }
  }
  for (let y = 0; y < MAP_H; y++) {
    if (y % 3 === 1) {
      if (map[y][0] === T.OUTER) map[y][0] = T.CACTUS;
      if (map[y][MAP_W - 1] === T.OUTER) map[y][MAP_W - 1] = T.CACTUS;
    }
  }

  // Central oasis water pool - bigger beautiful pool
  const poolCenterX = hallX;
  const poolCenterY = hallY;
  // Main pool area (5 wide x 3 tall)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const wx = poolCenterX + dx;
      const wy = poolCenterY + dy;
      if (wy > 0 && wy < MAP_H - 1 && wx > 0 && wx < MAP_W - 1) {
        map[wy][wx] = T.WATER;
      }
    }
  }
  
  // Remove any plants/palms that ended up in or adjacent to the pool
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const wx = poolCenterX + dx;
      const wy = poolCenterY + dy;
      if (wy > 0 && wy < MAP_H - 1 && wx > 0 && wx < MAP_W - 1) {
        if (map[wy][wx] === T.PLANT || map[wy][wx] === T.PALM || map[wy][wx] === T.COOLER) {
          map[wy][wx] = T.FLOOR;
        }
      }
    }
  }

  return { map, cubicles };
}

export function createPlayer(playerNum: 1 | 2 = 1): Player {
  // Player 1 spawns on left side, Player 2 on right side
  const xOffset = playerNum === 1 ? -5 : 5;
  return {
    x: (MAP_W / 2 + xOffset) * TILE,
    y: (MAP_H / 2) * TILE,
    dir: playerNum === 1 ? 3 : 2, // P1 faces right, P2 faces left
    frame: 0,
    frameTimer: 0,
    moving: false,
    shirtColor: playerNum === 1 ? '#7c5cfc' : '#f97316', // Purple for P1, Orange for P2
    fixes: 0
  };
}

export function createNPCs(cubicles: Cubicle[]): NPC[] {
  return cubicles.map(c => ({
    tileX: c.deskX,
    tileY: c.deskY,
    x: c.deskX * TILE,
    y: c.deskY * TILE,
    state: 'working' as const,
    shirtColor: SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)],
    hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
    frame: 0,
    distractionRef: null,
    happyTimer: 0
  }));
}

export function createCamels(map: TileType[][]): Camel[] {
  const camels: Camel[] = [];
  const numCamels = 3;
  
  // Find floor tiles in hallways for camel spawn points
  const floorTiles: [number, number][] = [];
  for (let y = 2; y < MAP_H - 2; y++) {
    for (let x = 2; x < MAP_W - 2; x++) {
      if (map[y][x] === T.FLOOR) {
        // Check if it's in a more open area (not inside cubicles)
        let openNeighbors = 0;
        if (map[y-1][x] === T.FLOOR) openNeighbors++;
        if (map[y+1][x] === T.FLOOR) openNeighbors++;
        if (map[y][x-1] === T.FLOOR) openNeighbors++;
        if (map[y][x+1] === T.FLOOR) openNeighbors++;
        if (openNeighbors >= 3) {
          floorTiles.push([x, y]);
        }
      }
    }
  }
  
  // Shuffle and pick camel positions
  const shuffled = floorTiles.sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(numCamels, shuffled.length); i++) {
    const [tx, ty] = shuffled[i];
    camels.push({
      x: tx * TILE,
      y: ty * TILE,
      tileX: tx,
      tileY: ty,
      dir: Math.floor(Math.random() * 4),
      frame: 0,
      moveTimer: 0
    });
  }
  
  return camels;
}

export function createIssues(cubicles: Cubicle[], npcs: NPC[]): { issues: Issue[], deskMap: Map<string, Issue> } {
  const shuffled = [...cubicles].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, TOTAL_ISSUES);
  const issues: Issue[] = [];
  const deskMap = new Map<string, Issue>();

  for (let i = 0; i < selected.length; i++) {
    const c = selected[i];
    const issue: Issue = {
      type: i,
      tileX: c.openX,
      tileY: c.openY,
      x: c.openX * TILE,
      y: c.openY * TILE,
      fixed: false,
      animFrame: 0,
      cubicle: c
    };
    issues.push(issue);
    deskMap.set(`${c.deskX},${c.deskY}`, issue);
  }

  // Link NPCs to their issues
  for (const issue of issues) {
    for (const npc of npcs) {
      const dist = Math.abs(npc.tileX - issue.tileX) + Math.abs(npc.tileY - issue.tileY);
      if (dist <= 3 && !npc.distractionRef) {
        npc.state = 'distracted';
        npc.distractionRef = issue;
      }
    }
  }

  return { issues, deskMap };
}
