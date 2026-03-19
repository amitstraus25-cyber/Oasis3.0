import {
  TILE, MAP_W, MAP_H, VW, VH, T, COL, OASIS, GAME_TIME, TOTAL_ISSUES, ISSUE_TYPES, SPLIT_VW,
} from './constants';
import type {
  TileType, Cubicle, Player, NPC, Issue, Particle, Camera, DrawPersonOptions, Camel, GameMode, Winner,
} from './types';

// OASIS letter patterns for floor branding (5 tiles wide, 7 tiles tall - smaller to fit)
const OASIS_LETTERS_BIG: Record<string, string[]> = {
  O: [
    '01110',
    '10001',
    '10001',
    '10001',
    '10001',
    '10001',
    '01110',
  ],
  A: [
    '00100',
    '01010',
    '10001',
    '10001',
    '11111',
    '10001',
    '10001',
  ],
  S: [
    '01111',
    '10000',
    '10000',
    '01110',
    '00001',
    '00001',
    '11110',
  ],
  I: [
    '11111',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '11111',
  ],
};

// Check if tile is part of OASIS branding - smaller version to fit map
function isOasisBrandTile(tx: number, ty: number): boolean {
  // Place "OASIS" centered on the map
  const letterHeight = 7;
  const letterWidth = 5;
  const letterSpacing = 2;
  const totalWidth = 5 * letterWidth + 4 * letterSpacing; // 5 letters, 4 gaps
  
  const brandStartX = Math.floor((MAP_W - totalWidth) / 2);
  const brandStartY = Math.floor((MAP_H - letterHeight) / 2);
  
  if (ty < brandStartY || ty >= brandStartY + letterHeight) return false;
  if (tx < brandStartX || tx >= brandStartX + totalWidth) return false;
  
  const row = ty - brandStartY;
  const letters = ['O', 'A', 'S', 'I', 'S'];
  
  let currentX = brandStartX;
  for (const letter of letters) {
    if (tx >= currentX && tx < currentX + letterWidth) {
      const col = tx - currentX;
      const pattern = OASIS_LETTERS_BIG[letter];
      if (pattern && pattern[row] && pattern[row][col] === '1') {
        return true;
      }
      return false;
    }
    currentX += letterWidth + letterSpacing;
  }
  return false;
}

// Get oasis/desert gradient color based on position
function getOasisGradient(tx: number, ty: number): string {
  // Create a gradient from edges (sandy) to center (greener/cooler)
  const centerX = MAP_W / 2;
  const centerY = MAP_H / 2;
  const distX = Math.abs(tx - centerX) / centerX;
  const distY = Math.abs(ty - centerY) / centerY;
  const dist = Math.sqrt(distX * distX + distY * distY) / 1.4;
  
  // Interpolate between oasis green-tint and desert sand
  let r = Math.floor(180 + dist * 40); // 180-220
  let g = Math.floor(170 + dist * 20); // 170-190
  let b = Math.floor(130 - dist * 20); // 130-110
  
  // Add checker pattern variation
  const checker = (tx + ty) % 2 === 0 ? 0 : -8;
  
  // OASIS branding - more visible teal tint
  if (isOasisBrandTile(tx, ty)) {
    r -= 40;
    g += 25;
    b += 35;
  }
  
  return `rgb(${r + checker},${g + checker},${b + checker})`;
}

// Draw a single tile
export function drawTile(
  ctx: CanvasRenderingContext2D,
  map: TileType[][],
  deskMap: Map<string, Issue>,
  tx: number,
  ty: number,
  camera: Camera
): void {
  const type = map[ty][tx];
  const sx = tx * TILE - camera.x;
  const sy = ty * TILE - camera.y;
  if (sx < -TILE || sy < -TILE || sx > VW || sy > VH) return;

  switch (type) {
    case T.FLOOR:
      ctx.fillStyle = getOasisGradient(tx, ty);
      ctx.fillRect(sx, sy, TILE, TILE);
      break;

    case T.WALL:
      ctx.fillStyle = getOasisGradient(tx, ty);
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = COL.wall;
      ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      for (let ly = sy + 6; ly < sy + TILE - 4; ly += 3) {
        ctx.fillRect(sx + 4, ly, TILE - 8, 1);
      }
      ctx.fillStyle = COL.wallTrim;
      ctx.fillRect(sx + 1, sy + 1, TILE - 2, 3);
      ctx.fillStyle = '#c4ccd4';
      ctx.fillRect(sx + 1, sy + 1, TILE - 2, 1);
      ctx.fillStyle = COL.wallDark;
      ctx.fillRect(sx + 2, sy + TILE - 4, TILE - 4, 2);
      break;

    case T.DESK: {
      ctx.fillStyle = getOasisGradient(tx, ty);
      ctx.fillRect(sx, sy, TILE, TILE);
      // Desk surface
      ctx.fillStyle = COL.desk;
      ctx.fillRect(sx + 2, sy + 8, TILE - 4, 18);
      ctx.fillStyle = COL.deskTop;
      ctx.fillRect(sx + 2, sy + 8, TILE - 4, 3);
      // Monitor
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(sx + 8, sy + 12, 20, 12);
      const dk = `${tx},${ty}`;
      const dRef = deskMap.get(dk);
      if (dRef && !dRef.fixed) {
        ctx.fillStyle = '#441818';
        ctx.fillRect(sx + 9, sy + 13, 18, 10);
        ctx.fillStyle = '#cc3333';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('⚠', sx + 14, sy + 21);
      } else {
        ctx.fillStyle = '#142a1c';
        ctx.fillRect(sx + 9, sy + 13, 18, 10);
        ctx.fillStyle = OASIS.teal;
        ctx.fillRect(sx + 11, sy + 15, 12, 1);
        ctx.fillRect(sx + 11, sy + 17, 8, 1);
        ctx.fillRect(sx + 11, sy + 19, 14, 1);
      }
      break;
    }

    case T.OUTER:
      // Sandy desert dunes
      ctx.fillStyle = COL.outer;
      ctx.fillRect(sx, sy, TILE, TILE);
      // Dune texture
      ctx.fillStyle = COL.outerTop;
      ctx.fillRect(sx, sy, TILE, 4);
      ctx.fillStyle = COL.outerDark;
      ctx.fillRect(sx, sy + TILE - 4, TILE, 4);
      // Sand grain dots
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      for (let i = 0; i < 4; i++) {
        const gx = ((tx * 7 + i * 11) % 30) + 5;
        const gy = ((ty * 13 + i * 7) % 28) + 6;
        ctx.fillRect(sx + gx, sy + gy, 2, 2);
      }
      break;

    case T.PLANT:
      ctx.fillStyle = getOasisGradient(tx, ty);
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = '#6b4422';
      ctx.fillRect(sx + 14, sy + 24, 12, 12);
      ctx.fillStyle = '#338848';
      ctx.beginPath();
      ctx.arc(sx + 20, sy + 18, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#44aa58';
      ctx.beginPath();
      ctx.arc(sx + 17, sy + 14, 7, 0, Math.PI * 2);
      ctx.fill();
      break;

    case T.COOLER:
      ctx.fillStyle = getOasisGradient(tx, ty);
      ctx.fillRect(sx, sy, TILE, TILE);
      // Water cooler dispenser
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(sx + 12, sy + 4, 16, 28);
      ctx.fillStyle = '#d0d0d0';
      ctx.fillRect(sx + 12, sy + 4, 16, 4);
      // Water jug on top
      ctx.fillStyle = OASIS.tealLight;
      ctx.beginPath();
      ctx.arc(sx + 20, sy + 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = OASIS.teal;
      ctx.beginPath();
      ctx.arc(sx + 20, sy + 8, 4, 0, Math.PI * 2);
      ctx.fill();
      // Dispenser tap
      ctx.fillStyle = '#888';
      ctx.fillRect(sx + 18, sy + 18, 4, 6);
      // Base
      ctx.fillStyle = '#aaa';
      ctx.fillRect(sx + 10, sy + 32, 20, 4);
      break;

    case T.PALM:
      // Palm tree on floor
      ctx.fillStyle = getOasisGradient(tx, ty);
      ctx.fillRect(sx, sy, TILE, TILE);
      // Trunk
      ctx.fillStyle = '#8B5A2B';
      ctx.fillRect(sx + 16, sy + 18, 8, 20);
      ctx.fillStyle = '#6B4423';
      ctx.fillRect(sx + 18, sy + 18, 2, 20);
      // Fronds (palm leaves)
      ctx.fillStyle = OASIS.tealDark;
      // Left fronds
      ctx.beginPath();
      ctx.moveTo(sx + 20, sy + 16);
      ctx.quadraticCurveTo(sx + 4, sy + 8, sx + 2, sy + 18);
      ctx.quadraticCurveTo(sx + 6, sy + 12, sx + 20, sy + 18);
      ctx.fill();
      // Right fronds
      ctx.beginPath();
      ctx.moveTo(sx + 20, sy + 16);
      ctx.quadraticCurveTo(sx + 36, sy + 8, sx + 38, sy + 18);
      ctx.quadraticCurveTo(sx + 34, sy + 12, sx + 20, sy + 18);
      ctx.fill();
      // Top fronds
      ctx.fillStyle = OASIS.teal;
      ctx.beginPath();
      ctx.moveTo(sx + 20, sy + 14);
      ctx.quadraticCurveTo(sx + 10, sy + 2, sx + 6, sy + 10);
      ctx.quadraticCurveTo(sx + 12, sy + 8, sx + 20, sy + 16);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx + 20, sy + 14);
      ctx.quadraticCurveTo(sx + 30, sy + 2, sx + 34, sy + 10);
      ctx.quadraticCurveTo(sx + 28, sy + 8, sx + 20, sy + 16);
      ctx.fill();
      // Coconuts
      ctx.fillStyle = '#5D4422';
      ctx.beginPath();
      ctx.arc(sx + 17, sy + 17, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx + 23, sy + 17, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case T.CACTUS:
      // Cactus on sand
      ctx.fillStyle = COL.outer;
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = COL.outerTop;
      ctx.fillRect(sx, sy, TILE, 4);
      // Cactus body
      ctx.fillStyle = '#4A7C4E';
      ctx.fillRect(sx + 14, sy + 8, 12, 28);
      // Left arm
      ctx.fillRect(sx + 6, sy + 14, 8, 6);
      ctx.fillRect(sx + 6, sy + 10, 4, 10);
      // Right arm
      ctx.fillRect(sx + 26, sy + 18, 8, 6);
      ctx.fillRect(sx + 30, sy + 14, 4, 10);
      // Highlights
      ctx.fillStyle = '#5A9C5E';
      ctx.fillRect(sx + 16, sy + 8, 3, 28);
      ctx.fillRect(sx + 8, sy + 14, 2, 6);
      ctx.fillRect(sx + 28, sy + 18, 2, 6);
      // Spines (dots)
      ctx.fillStyle = '#2A4C2E';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(sx + 22, sy + 10 + i * 5, 2, 1);
        ctx.fillRect(sx + 14, sy + 12 + i * 5, 1, 2);
      }
      break;

    case T.WATER:
      // Beautiful oasis water pool
      // Base water color
      ctx.fillStyle = OASIS.tealDark;
      ctx.fillRect(sx, sy, TILE, TILE);
      
      // Deeper water gradient in center
      ctx.fillStyle = '#0a8a7a';
      ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
      
      // Animated ripples
      const time = Date.now() * 0.002;
      const ripple1 = Math.sin(time + tx * 0.5) * 0.3 + 0.7;
      const ripple2 = Math.sin(time * 1.3 + ty * 0.7) * 0.3 + 0.7;
      
      ctx.fillStyle = `rgba(94, 234, 212, ${ripple1 * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(sx + 12, sy + 12, 6 + ripple1 * 2, 4 + ripple1, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = `rgba(94, 234, 212, ${ripple2 * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(sx + 28, sy + 24, 5 + ripple2 * 2, 3 + ripple2, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Light reflection/sparkles
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      if (Math.sin(time * 2 + tx + ty) > 0.7) {
        ctx.fillRect(sx + 8 + (tx % 3) * 6, sy + 6 + (ty % 2) * 8, 3, 3);
      }
      if (Math.sin(time * 2.5 + tx * 2) > 0.8) {
        ctx.fillRect(sx + 22, sy + 18, 2, 2);
      }
      
      // Edge foam/bubbles
      ctx.fillStyle = 'rgba(200, 250, 245, 0.4)';
      ctx.fillRect(sx, sy, TILE, 2);
      ctx.fillRect(sx, sy, 2, TILE);
      ctx.fillRect(sx + TILE - 2, sy, 2, TILE);
      ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
      break;
  }
}

// Draw cubicle labels with detailed NHI info - BIGGER and for ALL NPCs
export function drawCubicleLabels(
  ctx: CanvasRenderingContext2D,
  cubicles: Cubicle[],
  deskMap: Map<string, Issue>,
  camera: Camera
): void {
  for (const c of cubicles) {
    const cx = (c.x + 1) * TILE - camera.x;
    const cy = c.y * TILE - camera.y;
    if (cx < -TILE * 3 || cy < -TILE * 2 || cx > VW + TILE * 2 || cy > VH + TILE) continue;

    const profile = c.profile;
    const line1 = profile.id;
    const line2 = `${profile.kind} | ${profile.team} | R${profile.risk}`;

    ctx.font = 'bold 12px monospace';
    const tw1 = ctx.measureText(line1).width;
    ctx.font = '11px monospace';
    const tw2 = ctx.measureText(line2).width;
    const maxTw = Math.max(tw1, tw2);

    const lx = cx + (TILE - maxTw) / 2;
    const ly = cy + TILE + 2;

    const dk = `${c.deskX},${c.deskY}`;
    const dRef = deskMap.get(dk);
    const hasIssue = dRef && !dRef.fixed;
    const isDecoy = dRef && dRef.decoy && !dRef.fixed;

    const boxX = lx - 8;
    const boxY = ly - 30;
    const boxW = maxTw + 16;
    const boxH = 34;

    // Decoys look almost identical to real issues (amber-ish tint is very subtle)
    ctx.fillStyle = hasIssue ? (isDecoy ? 'rgba(28,20,12,0.88)' : 'rgba(25,15,20,0.88)') : 'rgba(15,15,26,0.85)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 5);
    ctx.fill();
    
    ctx.strokeStyle = hasIssue ? (isDecoy ? '#d4a040' : '#f97316') : 'rgba(124,92,252,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 5);
    ctx.stroke();

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = hasIssue ? (isDecoy ? '#e0b050' : '#fb923c') : '#a78bfa';
    ctx.fillText(line1, lx, ly - 14);

    ctx.font = '11px monospace';
    ctx.fillStyle = hasIssue ? '#d4956a' : '#9892a6';
    ctx.fillText(line2, lx, ly - 1);
  }
}

// Draw person (NPC or player)
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  camera: Camera,
  tick: number,
  opts: DrawPersonOptions
): void {
  const x = wx - camera.x;
  const y = wy - camera.y;
  if (x < -50 || y < -50 || x > VW + 50 || y > VH + 50) return;
  const s = 2;
  const cx = x + 8;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(cx + s, y + 17 * s, 10 * s, s);

  const isNPC = !opts.isPlayer;
  const armWiggle = opts.frame ? s : 0;

  if (opts.sitting) {
    // Sitting pose (at desk)
    ctx.fillStyle = '#3a5070';
    ctx.fillRect(cx + 2 * s, y + 13 * s, 8 * s, 2 * s);
    ctx.fillStyle = opts.shirtColor || '#4488aa';
    ctx.fillRect(cx + 2 * s, y + 8 * s, 8 * s, 5 * s);
    
    // Arms - NPCs have 4 arms!
    if (isNPC) {
      // Upper arms (typing)
      ctx.fillStyle = '#ffcc99';
      ctx.fillRect(cx - s + armWiggle, y + 9 * s, 3 * s, s);
      ctx.fillRect(cx + 10 * s - armWiggle, y + 9 * s, 3 * s, s);
      // Lower arms (resting)
      ctx.fillRect(cx - s - armWiggle, y + 11 * s, 3 * s, s);
      ctx.fillRect(cx + 10 * s + armWiggle, y + 11 * s, 3 * s, s);
    } else if (opts.typing && opts.frame) {
      ctx.fillStyle = '#ffcc99';
      ctx.fillRect(cx + s, y + 12 * s, 2 * s, s);
      ctx.fillRect(cx + 9 * s, y + 12 * s, 2 * s, s);
    }
  } else {
    // Standing/walking pose
    ctx.fillStyle = '#3a5070';
    const lo = (opts.walking && opts.frame) ? s : 0;
    ctx.fillRect(cx + 3 * s, y + 13 * s + lo, 3 * s, 3 * s);
    ctx.fillRect(cx + 6 * s, y + 13 * s - lo, 3 * s, 3 * s);
    ctx.fillStyle = opts.shirtColor || '#4488aa';
    ctx.fillRect(cx + 2 * s, y + 8 * s, 8 * s, 5 * s);
    
    // Arms
    if (isNPC) {
      // NPCs have 4 arms!
      ctx.fillStyle = opts.shirtColor || '#4488aa';
      // Upper arms
      ctx.fillRect(cx - armWiggle, y + 8 * s, 2 * s, 3 * s);
      ctx.fillRect(cx + 10 * s + armWiggle, y + 8 * s, 2 * s, 3 * s);
      // Lower arms
      ctx.fillRect(cx + s - armWiggle, y + 10 * s, 2 * s, 3 * s);
      ctx.fillRect(cx + 9 * s + armWiggle, y + 10 * s, 2 * s, 3 * s);
      // Hands
      ctx.fillStyle = '#ffcc99';
      ctx.fillRect(cx - armWiggle, y + 11 * s, s, 2 * s);
      ctx.fillRect(cx + 11 * s + armWiggle, y + 11 * s, s, 2 * s);
      ctx.fillRect(cx + s - armWiggle, y + 13 * s, s, s);
      ctx.fillRect(cx + 10 * s + armWiggle, y + 13 * s, s, s);
    } else {
      // Player has 2 arms
      ctx.fillRect(cx + s, y + 8 * s, s, 3 * s);
      ctx.fillRect(cx + 10 * s, y + 8 * s, s, 3 * s);
    }
  }

  // Head
  ctx.fillStyle = '#ffcc99';
  ctx.fillRect(cx + 3 * s, y + 4 * s, 6 * s, 4 * s);
  // Hair
  ctx.fillStyle = opts.hairColor || '#553322';
  ctx.fillRect(cx + 3 * s, y + 3 * s, 6 * s, 2 * s);
  // Eyes
  ctx.fillStyle = '#111';
  ctx.fillRect(cx + 4 * s, y + 5 * s, s, s);
  ctx.fillRect(cx + 7 * s, y + 5 * s, s, s);

  // Oasis logo on player shirt (teal "O" logo)
  if (opts.isPlayer) {
    ctx.fillStyle = OASIS.tealLight;
    const bx = cx + 3 * s;
    const by = y + 9 * s;
    // "O" shape for Oasis
    ctx.fillRect(bx + s, by, 3 * s, s);
    ctx.fillRect(bx + s, by + 2 * s, 3 * s, s);
    ctx.fillRect(bx, by + s, s, s);
    ctx.fillRect(bx + 4 * s, by + s, s, s);
  }

  // Happy checkmark
  if (opts.happyTimer && opts.happyTimer > 40) {
    ctx.fillStyle = '#00ee66';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('✔', x + 24, y - 2);
  }

  // Distracted warning
  if (opts.distracted) {
    const bob = Math.sin(tick * 0.12) * 2;
    ctx.fillStyle = '#ff6644';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('⚠', x + 24, y + 6 + bob);
  }
}

// Draw issue/distraction with detailed pixel art
export function drawIssue(
  ctx: CanvasRenderingContext2D,
  issue: Issue,
  camera: Camera
): void {
  if (issue.fixed) return;
  const x = issue.x - camera.x;
  const y = issue.y - camera.y;
  if (x < -80 || y < -80 || x > VW + 40 || y > VH + 40) return;
  const f = issue.animFrame;
  const T2 = TILE;
  const cx = x + T2 / 2;
  const cy = y + T2 / 2;

  switch (issue.type) {
    case 0: // Credential Leak - Dripping key
      // Key body
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b8860b';
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      // Key shaft
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(cx - 1, cy - 4, 4, 16);
      // Key teeth
      ctx.fillRect(cx + 3, cy + 4, 6, 3);
      ctx.fillRect(cx + 3, cy + 9, 4, 3);
      // Dripping effect
      const drip1 = (f * 2) % 30;
      const drip2 = ((f * 2) + 15) % 30;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(cx - 2, cy + 14 + drip1, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 4, cy + 12 + drip2, 2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 1: // Security Breach - Shield with crack
      // Shield shape
      ctx.fillStyle = '#cc3333';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx + 14, cy - 6);
      ctx.lineTo(cx + 12, cy + 10);
      ctx.lineTo(cx, cy + 16);
      ctx.lineTo(cx - 12, cy + 10);
      ctx.lineTo(cx - 14, cy - 6);
      ctx.closePath();
      ctx.fill();
      // Inner shield
      ctx.fillStyle = '#ff5555';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 10, cy - 4);
      ctx.lineTo(cx + 8, cy + 6);
      ctx.lineTo(cx, cy + 12);
      ctx.lineTo(cx - 8, cy + 6);
      ctx.lineTo(cx - 10, cy - 4);
      ctx.closePath();
      ctx.fill();
      // Crack
      ctx.strokeStyle = '#220000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - 8);
      ctx.lineTo(cx + 3, cy - 2);
      ctx.lineTo(cx - 1, cy + 4);
      ctx.lineTo(cx + 4, cy + 10);
      ctx.stroke();
      ctx.lineWidth = 1;
      // Pulse effect
      if (Math.sin(f * 0.15) > 0) {
        ctx.strokeStyle = 'rgba(255,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      break;

    case 2: // Expired Certificate - Document with X
      // Document
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(x + 8, y + 2, 24, 32);
      // Folded corner
      ctx.fillStyle = '#d0d0d0';
      ctx.beginPath();
      ctx.moveTo(x + 24, y + 2);
      ctx.lineTo(x + 32, y + 10);
      ctx.lineTo(x + 24, y + 10);
      ctx.closePath();
      ctx.fill();
      // Lines
      ctx.fillStyle = '#aaa';
      ctx.fillRect(x + 12, y + 14, 16, 2);
      ctx.fillRect(x + 12, y + 20, 12, 2);
      ctx.fillRect(x + 12, y + 26, 14, 2);
      // Red X stamp
      const flash = Math.sin(f * 0.15) > 0;
      ctx.strokeStyle = flash ? '#ff0000' : '#cc0000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 8);
      ctx.lineTo(x + 22, y + 20);
      ctx.moveTo(x + 22, y + 8);
      ctx.lineTo(x + 10, y + 20);
      ctx.stroke();
      ctx.lineWidth = 1;
      // EXPIRED text
      ctx.fillStyle = '#cc0000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('EXPIRED', x + 8, y + 38);
      break;

    case 3: // Stale API Token - Old clock/timer
      // Clock face
      ctx.fillStyle = '#ddd';
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#bbb';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#999';
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      // Clock hands (frozen)
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - 4, cy - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 6, cy + 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      // Cobwebs
      ctx.strokeStyle = 'rgba(100,100,100,0.4)';
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 8);
      ctx.quadraticCurveTo(cx - 6, cy - 10, cx, cy - 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy - 10);
      ctx.quadraticCurveTo(cx + 14, cy - 4, cx + 14, cy + 4);
      ctx.stroke();
      break;

    case 4: // Permission Conflict - Two clashing locks
      // Blue lock
      ctx.fillStyle = '#4477dd';
      ctx.fillRect(x + 4, y + 14, 14, 12);
      ctx.fillStyle = '#3366cc';
      ctx.beginPath();
      ctx.arc(x + 11, y + 14, 6, Math.PI, 0);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#4477dd';
      ctx.beginPath();
      ctx.arc(x + 11, y + 12, 5, Math.PI, 0);
      ctx.stroke();
      ctx.lineWidth = 1;
      // Red lock
      ctx.fillStyle = '#dd4444';
      ctx.fillRect(x + 22, y + 14, 14, 12);
      ctx.fillStyle = '#cc3333';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#dd4444';
      ctx.beginPath();
      ctx.arc(x + 29, y + 12, 5, Math.PI, 0);
      ctx.stroke();
      ctx.lineWidth = 1;
      // Lightning bolt conflict
      const boltY = Math.sin(f * 0.2) * 2;
      ctx.fillStyle = '#ffdd00';
      ctx.beginPath();
      ctx.moveTo(cx, y + 6 + boltY);
      ctx.lineTo(cx + 4, y + 14 + boltY);
      ctx.lineTo(cx, y + 14 + boltY);
      ctx.lineTo(cx + 2, y + 22 + boltY);
      ctx.lineTo(cx - 2, y + 16 + boltY);
      ctx.lineTo(cx, y + 16 + boltY);
      ctx.closePath();
      ctx.fill();
      break;

    case 5: // Unrotated Secret - Key with circular arrows
      // Key
      ctx.fillStyle = '#e8a030';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c88020';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8a030';
      ctx.fillRect(cx - 2, cy + 2, 4, 12);
      ctx.fillRect(cx + 2, cy + 8, 5, 2);
      ctx.fillRect(cx + 2, cy + 12, 3, 2);
      // Rotating arrows
      const angle = f * 0.05;
      ctx.strokeStyle = '#ff6644';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 16, angle, angle + Math.PI * 1.2);
      ctx.stroke();
      // Arrow head
      const ax = cx + Math.cos(angle + Math.PI * 1.2) * 16;
      const ay = cy + Math.sin(angle + Math.PI * 1.2) * 16;
      ctx.fillStyle = '#ff6644';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - 6, ay - 2);
      ctx.lineTo(ax - 4, ay + 4);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1;
      break;

    case 6: // Dormant Identity - Sleeping robot
      // Robot head
      ctx.fillStyle = '#888';
      ctx.fillRect(x + 10, y + 6, 20, 16);
      ctx.fillStyle = '#666';
      ctx.fillRect(x + 12, y + 8, 16, 12);
      // Closed eyes (sleeping)
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 14, y + 14);
      ctx.lineTo(x + 18, y + 14);
      ctx.moveTo(x + 22, y + 14);
      ctx.lineTo(x + 26, y + 14);
      ctx.stroke();
      ctx.lineWidth = 1;
      // Antenna
      ctx.fillStyle = '#aaa';
      ctx.fillRect(x + 19, y + 2, 2, 6);
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(x + 20, y + 2, 3, 0, Math.PI * 2);
      ctx.fill();
      // Robot body
      ctx.fillStyle = '#777';
      ctx.fillRect(x + 12, y + 22, 16, 12);
      // Z's floating
      const zy = Math.sin(f * 0.08) * 3;
      ctx.fillStyle = '#aaddff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('Z', x + 30, y + 8 + zy);
      ctx.font = '9px monospace';
      ctx.fillText('z', x + 34, y + 4 + zy * 0.7);
      ctx.font = '7px monospace';
      ctx.fillText('z', x + 36, y + 0 + zy * 0.5);
      break;

    case 7: // Secret Sprawl - Multiple scattered keys
      const keyPositions = [
        [6, 4], [22, 8], [10, 20], [26, 24], [16, 14]
      ];
      for (let i = 0; i < keyPositions.length; i++) {
        const [kx, ky] = keyPositions[i];
        const wobble = Math.sin(f * 0.05 + i * 1.5) * 2;
        ctx.fillStyle = i % 2 === 0 ? '#ffd700' : '#e8a030';
        // Key head
        ctx.beginPath();
        ctx.arc(x + kx + wobble, y + ky, 4, 0, Math.PI * 2);
        ctx.fill();
        // Key shaft
        ctx.fillRect(x + kx - 1 + wobble, y + ky + 3, 2, 6);
        ctx.fillRect(x + kx + 1 + wobble, y + ky + 6, 3, 2);
      }
      // Connection lines
      ctx.strokeStyle = 'rgba(255,100,100,0.3)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x + keyPositions[0][0], y + keyPositions[0][1]);
      for (let i = 1; i < keyPositions.length; i++) {
        ctx.lineTo(x + keyPositions[i][0], y + keyPositions[i][1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      break;

    case 8: // Log Overflow - Terminal with scrolling text
      // Monitor frame
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(x + 4, y + 2, 32, 28);
      // Screen
      ctx.fillStyle = '#0a1810';
      ctx.fillRect(x + 6, y + 4, 28, 22);
      // Scrolling log lines
      ctx.fillStyle = '#33ff66';
      ctx.font = '6px monospace';
      const scrollOffset = (f * 0.5) % 20;
      const logLines = [
        '> ERROR',
        'WARN: mem',
        '> CRIT!',
        'timeout',
        'ERR: key',
        '> ALERT'
      ];
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 6, y + 4, 28, 22);
      ctx.clip();
      for (let i = 0; i < 6; i++) {
        const lineY = y + 10 + i * 5 - scrollOffset;
        if (lineY > y + 2 && lineY < y + 28) {
          ctx.fillStyle = logLines[i].includes('CRIT') || logLines[i].includes('ERROR') ? '#ff4444' : '#33ff66';
          ctx.fillText(logLines[i], x + 8, lineY);
        }
      }
      ctx.restore();
      // Overflow indicator
      ctx.fillStyle = '#ff3333';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('!!!', x + 24, y + 36);
      // Monitor stand
      ctx.fillStyle = '#333';
      ctx.fillRect(x + 16, y + 30, 8, 4);
      ctx.fillRect(x + 12, y + 34, 16, 3);
      break;
  }

  // Pulsing warning ring - amber/slower for decoys, red for real
  if (issue.decoy) {
    const pulse = Math.sin(f * 0.06) * 0.25 + 0.45; // Slower, softer
    ctx.strokeStyle = `rgba(255,180,50,${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + T2 / 2, y + T2 / 2, 22 + Math.sin(f * 0.06) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    
    // Subtle speech bubble hint (only visible if you look closely)
    if (Math.sin(f * 0.04) > 0.2) {
      ctx.fillStyle = `rgba(255,200,80,${0.3 + Math.sin(f * 0.05) * 0.1})`;
      ctx.beginPath();
      ctx.arc(x + T2 - 2, y + 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(40,20,10,0.7)`;
      ctx.font = 'bold 6px monospace';
      ctx.fillText('...', x + T2 - 6, y + 5);
    }
  } else {
    const pulse = Math.sin(f * 0.09) * 0.3 + 0.55;
    ctx.strokeStyle = `rgba(255,70,70,${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + T2 / 2, y + T2 / 2, 22 + Math.sin(f * 0.09) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

// Draw camel - realistic pixel art camel
export function drawCamel(
  ctx: CanvasRenderingContext2D,
  camel: Camel,
  camera: Camera,
  tick: number
): void {
  const x = camel.x - camera.x;
  const y = camel.y - camera.y;
  const f = Math.floor(tick / 10) % 4;
  const bob = Math.sin(tick * 0.1) * 1;
  
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x + 20, y + 38, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Back legs (behind body)
  ctx.fillStyle = '#A67B5B';
  const backLegOffset = f < 2 ? 1 : -1;
  // Back left leg
  ctx.fillRect(x + 26 + backLegOffset, y + 24 + bob, 3, 12);
  ctx.fillRect(x + 25 + backLegOffset, y + 34 + bob, 4, 3); // hoof
  // Back right leg  
  ctx.fillRect(x + 30 - backLegOffset, y + 24 + bob, 3, 12);
  ctx.fillRect(x + 29 - backLegOffset, y + 34 + bob, 4, 3); // hoof
  
  // Main body - elongated oval shape
  ctx.fillStyle = '#C4956A';
  ctx.beginPath();
  ctx.ellipse(x + 22, y + 20 + bob, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Hump (single prominent hump - dromedary style)
  ctx.fillStyle = '#B8896A';
  ctx.beginPath();
  ctx.ellipse(x + 22, y + 12 + bob, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hump highlight
  ctx.fillStyle = '#D4A574';
  ctx.beginPath();
  ctx.ellipse(x + 20, y + 10 + bob, 3, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Neck (long, curved)
  ctx.fillStyle = '#C4956A';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 18 + bob);
  ctx.quadraticCurveTo(x + 6, y + 10 + bob, x + 8, y + 4 + bob);
  ctx.lineTo(x + 12, y + 4 + bob);
  ctx.quadraticCurveTo(x + 14, y + 12 + bob, x + 14, y + 18 + bob);
  ctx.fill();
  
  // Head
  ctx.fillStyle = '#C4956A';
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 4 + bob, 5, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  
  // Snout/muzzle (longer, more camel-like)
  ctx.fillStyle = '#D4A574';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 6 + bob, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Nostrils
  ctx.fillStyle = '#8B6B4A';
  ctx.fillRect(x, y + 5 + bob, 2, 2);
  ctx.fillRect(x, y + 8 + bob, 2, 2);
  
  // Eye
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 3 + bob, 2, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye highlight
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 5, y + 2 + bob, 1, 1);
  
  // Ear (small, pointy)
  ctx.fillStyle = '#B8896A';
  ctx.beginPath();
  ctx.moveTo(x + 10, y + bob);
  ctx.lineTo(x + 12, y - 3 + bob);
  ctx.lineTo(x + 14, y + 1 + bob);
  ctx.fill();
  
  // Front legs
  ctx.fillStyle = '#A67B5B';
  const frontLegOffset = f < 2 ? -1 : 1;
  // Front left leg
  ctx.fillRect(x + 12 + frontLegOffset, y + 24 + bob, 3, 12);
  ctx.fillRect(x + 11 + frontLegOffset, y + 34 + bob, 4, 3); // hoof
  // Front right leg
  ctx.fillRect(x + 16 - frontLegOffset, y + 24 + bob, 3, 12);
  ctx.fillRect(x + 15 - frontLegOffset, y + 34 + bob, 4, 3); // hoof
  
  // Tail (thin with tuft)
  ctx.fillStyle = '#A67B5B';
  const tailSway = Math.sin(tick * 0.15) * 2;
  ctx.fillRect(x + 32, y + 16 + bob, 2, 8);
  // Tail tuft
  ctx.fillStyle = '#8B5A2B';
  ctx.beginPath();
  ctx.ellipse(x + 33 + tailSway, y + 24 + bob, 3, 2, 0.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Cute heart when player is nearby/blocked
  if (Math.sin(tick * 0.08) > 0.3) {
    ctx.fillStyle = '#ff6b9d';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('♥', x + 18, y - 4 + bob);
  }
}

// Draw particles
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  camera: Camera
): void {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 40));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - camera.x - p.size / 2, p.y - camera.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// Draw minimap
export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  map: TileType[][],
  issues: Issue[],
  player: Player,
  player2?: Player | null,
  options?: { width?: number; posX?: number; playerColor?: string; player2Color?: string }
): void {
  const mw = options?.width || 120;
  const mh = Math.floor(mw * 0.77); // Maintain aspect ratio
  const mx = options?.posX !== undefined ? options.posX : VW - mw - 10;
  const my = VH - mh - 10;
  const sx = mw / MAP_W, sy = mh / MAP_H;
  const playerColor = options?.playerColor || '#00ffaa';
  const player2Color = options?.player2Color || '#FFD700';

  ctx.fillStyle = 'rgba(15,15,26,0.82)';
  ctx.beginPath();
  ctx.roundRect(mx - 3, my - 3, mw + 6, mh + 6, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(124,92,252,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mx - 3, my - 3, mw + 6, mh + 6, 6);
  ctx.stroke();
  ctx.fillStyle = '#b0a878';
  ctx.fillRect(mx, my, mw, mh);

  // Draw walls/outer
  ctx.fillStyle = 'rgba(90, 80, 110, 0.7)';
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map[y][x] === T.WALL || map[y][x] === T.OUTER) {
        ctx.fillRect(mx + x * sx, my + y * sy, Math.ceil(sx), Math.ceil(sy));
      }
    }
  }

  // Draw Oasis logo on minimap (17x17 pixel art)
  const LOGO: number[][] = [
    [0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,0,0,0,0,0,1,1,1,1,0,0],
    [0,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,0],
    [0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0],
    [1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,2,2,0,0,0,2,2,2,0,0,0,0,1,1,1],
    [1,1,1,2,2,2,2,2,0,2,2,2,0,0,0,1,0],
    [0,1,1,0,0,2,2,0,0,0,2,2,2,0,1,1,0],
    [0,1,1,1,0,0,0,0,0,0,0,2,2,1,1,1,0],
    [0,0,1,1,1,0,0,0,0,0,0,0,1,1,1,0,0],
    [0,0,1,1,1,1,0,0,0,0,0,1,1,1,1,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],
  ];
  const lpw = mw / 17, lph = mh / 17;
  for (let ly = 0; ly < 17; ly++) {
    for (let lx = 0; lx < 17; lx++) {
      const v = LOGO[ly][lx];
      if (v > 0) {
        ctx.fillStyle = v === 2 ? 'rgba(167,139,250,0.45)' : 'rgba(124,92,252,0.35)';
        ctx.fillRect(mx + lx * lpw, my + ly * lph, Math.ceil(lpw), Math.ceil(lph));
      }
    }
  }

  for (const d of issues) {
    if (d.fixed) {
      ctx.fillStyle = '#44cc44';
    } else if (d.decoy) {
      ctx.fillStyle = '#f59e0b'; // Orange for decoys
    } else {
      ctx.fillStyle = '#ff4444';
    }
    ctx.fillRect(mx + d.tileX * sx - 1, my + d.tileY * sy - 1, 4, 4);
  }

  ctx.fillStyle = playerColor;
  ctx.fillRect(mx + (player.x / TILE) * sx - 2, my + (player.y / TILE) * sy - 2, 5, 5);

  if (player2) {
    ctx.fillStyle = player2Color;
    ctx.fillRect(mx + (player2.x / TILE) * sx - 2, my + (player2.y / TILE) * sy - 2, 5, 5);
  }
}

// Draw sand clock (smaller)
function drawSandClock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  timer: number,
  tick: number
): void {
  const w = 28;
  const h = 36;
  const progress = timer / GAME_TIME;
  
  // Wooden frame
  ctx.fillStyle = '#5a4020';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#3a2810';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  
  // Glass background
  ctx.fillStyle = '#1a1510';
  ctx.fillRect(x, y, w, h);
  
  // Top bulb shape
  ctx.fillStyle = '#2a2015';
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 3);
  ctx.lineTo(x + w - 3, y + 3);
  ctx.lineTo(x + w / 2 + 2, y + h / 2 - 1);
  ctx.lineTo(x + w / 2 - 2, y + h / 2 - 1);
  ctx.closePath();
  ctx.fill();
  
  // Sand in top (decreases)
  if (progress > 0.05) {
    ctx.fillStyle = '#d4a855';
    const topY = y + 4 + (h / 2 - 6) * (1 - progress);
    const topW = (w - 8) * (0.4 + 0.6 * progress);
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - topW / 2, topY);
    ctx.lineTo(x + w / 2 + topW / 2, topY);
    ctx.lineTo(x + w / 2 + 2, y + h / 2 - 2);
    ctx.lineTo(x + w / 2 - 2, y + h / 2 - 2);
    ctx.closePath();
    ctx.fill();
  }
  
  // Bottom bulb shape
  ctx.fillStyle = '#2a2015';
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 2, y + h / 2 + 1);
  ctx.lineTo(x + w / 2 + 2, y + h / 2 + 1);
  ctx.lineTo(x + w - 3, y + h - 3);
  ctx.lineTo(x + 3, y + h - 3);
  ctx.closePath();
  ctx.fill();
  
  // Sand in bottom (increases)
  if (progress < 0.95) {
    const botProgress = 1 - progress;
    ctx.fillStyle = '#d4a855';
    const botH = (h / 2 - 6) * botProgress;
    const botW = (w - 8) * (0.4 + 0.6 * botProgress);
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - botW / 2, y + h - 4 - botH);
    ctx.lineTo(x + w / 2 + botW / 2, y + h - 4 - botH);
    ctx.lineTo(x + w - 4, y + h - 4);
    ctx.lineTo(x + 4, y + h - 4);
    ctx.closePath();
    ctx.fill();
  }
  
  // Falling sand stream
  if (progress > 0.02 && progress < 0.98) {
    ctx.fillStyle = '#d4a855';
    ctx.fillRect(x + w / 2 - 1, y + h / 2, 2, 3);
  }
  
  // Center neck
  ctx.fillStyle = '#6a5030';
  ctx.fillRect(x + w / 2 - 3, y + h / 2 - 2, 6, 4);
}

// Draw HUD
export function drawHUD(
  ctx: CanvasRenderingContext2D,
  timer: number,
  fixed: number,
  flash: number,
  map: TileType[][],
  issues: Issue[],
  player: Player,
  nearbyIssue: Issue | null,
  tick: number
): void {
  // Top left - Remediated count
  ctx.fillStyle = 'rgba(15,15,26,0.88)';
  ctx.beginPath();
  ctx.roundRect(6, 6, 220, 50, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(124,92,252,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(6, 6, 220, 50, 8);
  ctx.stroke();
  
  ctx.fillStyle = '#e8e5f0';
  ctx.font = 'bold 17px monospace';
  ctx.fillText(`Remediated: ${fixed}/${TOTAL_ISSUES}`, 14, 30);
  
  ctx.fillStyle = '#9892a6';
  ctx.font = '10px monospace';
  ctx.fillText('Govern every non-human identity', 14, 46);

  // Top right - Timer with sand clock
  const timerBoxW = 120;
  const timerBoxH = 48;
  ctx.fillStyle = 'rgba(15,15,26,0.88)';
  ctx.beginPath();
  ctx.roundRect(VW - timerBoxW - 10, 6, timerBoxW, timerBoxH, 8);
  ctx.fill();
  ctx.strokeStyle = timer < 15 ? 'rgba(255,85,85,0.6)' : 'rgba(124,92,252,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(VW - timerBoxW - 10, 6, timerBoxW, timerBoxH, 8);
  ctx.stroke();
  
  const mins = Math.floor(timer / 60);
  const secs = Math.floor(timer % 60);
  const ts = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  ctx.fillStyle = timer < 15 ? '#ff5555' : '#e8e5f0';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(ts, VW - timerBoxW + 6, 36);
  
  drawSandClock(ctx, VW - 48, 10, timer, tick);

  // Bottom - Detailed issue info box
  if (nearbyIssue) {
    const issueInfo = ISSUE_TYPES[nearbyIssue.type];
    const profile = nearbyIssue.cubicle.profile;
    
    const boxW = 520;
    const boxH = 90;
    const boxX = 10;
    const boxY = VH - boxH - 10;

    ctx.fillStyle = 'rgba(15,15,26,0.92)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(124,92,252,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.stroke();

    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`E / SPACE -> ${issueInfo.name}`, boxX + 14, boxY + 22);

    const riskColor = issueInfo.risk === 'CRIT' ? '#ff5555' : issueInfo.risk === 'High' ? '#fb923c' : '#fbbf24';
    ctx.fillStyle = riskColor;
    ctx.font = '13px monospace';
    ctx.fillText(`Pillar: ${issueInfo.pillar} | Risk: ${issueInfo.risk}`, boxX + 14, boxY + 42);

    ctx.fillStyle = '#a78bfa';
    ctx.font = '12px monospace';
    ctx.fillText(`Target: ${profile.id} (${profile.kind})`, boxX + 14, boxY + 60);

    ctx.fillStyle = '#9892a6';
    ctx.font = '11px monospace';
    ctx.fillText(issueInfo.desc, boxX + 14, boxY + 78);
  }

  // Flash effect (purple instead of green)
  if (flash > 0) {
    ctx.fillStyle = `rgba(124,92,252,${flash / 35})`;
    ctx.fillRect(0, 0, VW, VH);
  }

  // Minimap
  drawMinimap(ctx, map, issues, player);
}

// Oasis brand palette (matching oasis.security website)
const OB = {
  bg: '#0f0f1a',
  bgCard: '#1a1a2e',
  bgCardLight: '#252540',
  purple: '#7c5cfc',
  purpleLight: '#a78bfa',
  purpleSoft: '#c4b5fd',
  lavender: '#ddd6fe',
  violet: '#5b4a9e',
  orange: '#f97316',
  orangeLight: '#fb923c',
  textPrimary: '#e8e5f0',
  textSecondary: '#9892a6',
  textMuted: '#6b6580',
};

// Soft floating particles for menu backgrounds
function drawMenuParticles(ctx: CanvasRenderingContext2D, tick: number): void {
  for (let i = 0; i < 30; i++) {
    const px = (i * 137.5 + tick * 0.3) % VW;
    const py = (i * 89.3 + Math.sin(tick * 0.01 + i) * 40) % VH;
    const alpha = 0.03 + Math.sin(tick * 0.02 + i * 0.7) * 0.02;
    const r = 15 + Math.sin(i * 2.1) * 10;
    ctx.fillStyle = `rgba(124,92,252,${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw title screen
export function drawTitle(ctx: CanvasRenderingContext2D, tick: number): void {
  // Dark background
  ctx.fillStyle = OB.bg;
  ctx.fillRect(0, 0, VW, VH);

  // Floating purple particles
  drawMenuParticles(ctx, tick);

  // Subtle gradient overlay from bottom
  const grad = ctx.createLinearGradient(0, VH * 0.4, 0, VH);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(1, 'rgba(124,92,252,0.06)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VW, VH);

  // Animated cubicles row with purple glow
  for (let i = 0; i < 14; i++) {
    const bx = 40 + i * 60;
    const by = 395 + Math.sin(Date.now() * 0.001 + i) * 5;
    ctx.fillStyle = OB.bgCard;
    ctx.fillRect(bx, by, 44, 28);
    ctx.strokeStyle = OB.violet + '40';
    ctx.strokeRect(bx, by, 44, 28);
    ctx.fillStyle = i % 3 === 0 ? '#3a1525' : OB.purple + '25';
    ctx.fillRect(bx + 8, by + 6, 16, 10);
  }

  ctx.textAlign = 'center';

  // "OASIS" wordmark
  ctx.fillStyle = OB.purpleLight;
  ctx.font = 'bold 15px monospace';
  ctx.letterSpacing = '4px';
  ctx.fillText('O A S I S', VW / 2, 65);
  ctx.letterSpacing = '0px';

  // Thin line divider
  ctx.fillStyle = OB.purple + '40';
  ctx.fillRect(VW / 2 - 60, 78, 120, 1);

  // Title
  ctx.fillStyle = OB.textPrimary;
  ctx.font = 'bold 52px monospace';
  ctx.fillText('NHI FIXER', VW / 2, 130);
  // Purple shadow
  ctx.fillStyle = OB.purple + '30';
  ctx.fillText('NHI FIXER', VW / 2 + 2, 132);

  ctx.fillStyle = OB.purpleSoft;
  ctx.font = 'bold 18px monospace';
  ctx.fillText('Agentic Access Management', VW / 2, 165);

  ctx.fillStyle = OB.textSecondary;
  ctx.font = '14px monospace';
  ctx.fillText('Identity security starts from NHIs', VW / 2, 195);

  // Player preview
  const camera = { x: 0, y: 0 };
  drawPerson(ctx, VW / 2 - 20 + camera.x, 218 + camera.y, camera, tick, {
    isPlayer: true,
    shirtColor: OB.purple,
    hairColor: '#443311',
    walking: true,
    frame: Math.floor(Date.now() / 300) % 2
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = OB.purpleLight;
  ctx.font = '11px monospace';
  ctx.fillText('↑ You (Oasis Security Agent)', VW / 2, 275);

  // Stats row from website (3 cards)
  const statY = 284;
  const stats = [
    { val: '20–50x', label: 'NHIs represent', label2: 'more identities' },
    { val: '$4.88M', label: 'average cost', label2: 'of data breach (IBM)' },
    { val: '90%+', label: 'of today’s identity', label2: 'fabric is non-human' },
  ];
  const cardW = 142, cardGap = 12;
  const totalW = stats.length * cardW + (stats.length - 1) * cardGap;
  const startX = VW / 2 - totalW / 2;
  
  for (let i = 0; i < stats.length; i++) {
    const cx = startX + i * (cardW + cardGap);
    ctx.fillStyle = OB.bgCard + 'cc';
    ctx.beginPath();
    ctx.roundRect(cx, statY, cardW, 68, 8);
    ctx.fill();
    ctx.strokeStyle = OB.purple + '25';
    ctx.beginPath();
    ctx.roundRect(cx, statY, cardW, 68, 8);
    ctx.stroke();
    
    ctx.fillStyle = OB.purpleLight;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(stats[i].val, cx + cardW / 2, statY + 22);
    ctx.fillStyle = OB.textMuted;
    ctx.font = '8px monospace';
    ctx.fillText(stats[i].label, cx + cardW / 2, statY + 40);
    ctx.fillText(stats[i].label2, cx + cardW / 2, statY + 52);
  }

  // Instructions
  ctx.fillStyle = OB.textSecondary;
  ctx.font = '13px monospace';
  const lines = [
    'WASD to move  |  E / SPACE to remediate',
    '',
    'NHIs have security issues. Fix them all!',
    'Watch out for noisy decoys that waste your time.'
  ];
  lines.forEach((l, i) => ctx.fillText(l, VW / 2, 370 + i * 17));

  // Tagline
  ctx.fillStyle = OB.textMuted;
  ctx.font = '11px monospace';
  ctx.fillText('Turning IAM friction into accelerated AI adoption', VW / 2, 460);

  // Start button (orange CTA like the website)
  if (Math.sin(Date.now() * 0.004) > 0) {
    const btnW = 320, btnH = 40;
    const btnX = VW / 2 - btnW / 2, btnY = 490;
    ctx.fillStyle = OB.orange;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Press ENTER or SPACE to start', VW / 2, btnY + 26);
  }

  // Footer
  ctx.fillStyle = OB.textMuted;
  ctx.font = '10px monospace';
  ctx.fillText('oasis.security  |  Scale AI safely with governed agentic access', VW / 2, VH - 20);

  ctx.textAlign = 'left';
}

// Draw mode select screen
export function drawModeSelect(ctx: CanvasRenderingContext2D, tick: number): void {
  ctx.fillStyle = OB.bg;
  ctx.fillRect(0, 0, VW, VH);

  drawMenuParticles(ctx, tick);

  ctx.textAlign = 'center';

  // Header
  ctx.fillStyle = OB.purpleLight;
  ctx.font = 'bold 15px monospace';
  ctx.letterSpacing = '4px';
  ctx.fillText('O A S I S', VW / 2, 55);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = OB.textPrimary;
  ctx.font = 'bold 42px monospace';
  ctx.fillText('SELECT MODE', VW / 2, 105);
  ctx.fillStyle = OB.purple + '25';
  ctx.fillText('SELECT MODE', VW / 2 + 2, 107);

  const pulse = Math.sin(tick * 0.08) * 0.3 + 0.7;
  const camera = { x: 0, y: 0 };
  
  // Single Player card
  ctx.fillStyle = OB.bgCard;
  ctx.beginPath();
  ctx.roundRect(VW / 2 - 190, 145, 170, 200, 12);
  ctx.fill();
  ctx.strokeStyle = OB.purple + '60';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(VW / 2 - 190, 145, 170, 200, 12);
  ctx.stroke();
  
  drawPerson(ctx, VW / 2 - 125 + camera.x, 175 + camera.y, camera, tick, {
    isPlayer: true,
    shirtColor: OB.purple,
    hairColor: '#443311',
    walking: true,
    frame: Math.floor(Date.now() / 300) % 2
  });
  
  ctx.fillStyle = OB.textPrimary;
  ctx.font = 'bold 18px monospace';
  ctx.fillText('1 PLAYER', VW / 2 - 105, 265);
  
  // Orange CTA button
  ctx.fillStyle = `rgba(249,115,22,${pulse})`;
  ctx.beginPath();
  ctx.roundRect(VW / 2 - 165, 285, 120, 34, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('Press 1', VW / 2 - 105, 308);

  // Multiplayer card
  ctx.fillStyle = OB.bgCard;
  ctx.beginPath();
  ctx.roundRect(VW / 2 + 20, 145, 170, 200, 12);
  ctx.fill();
  ctx.strokeStyle = OB.orangeLight + '60';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(VW / 2 + 20, 145, 170, 200, 12);
  ctx.stroke();
  
  drawPerson(ctx, VW / 2 + 60 + camera.x, 175 + camera.y, camera, tick, {
    isPlayer: true,
    shirtColor: OB.purple,
    hairColor: '#443311',
    walking: true,
    frame: Math.floor(Date.now() / 300) % 2
  });
  drawPerson(ctx, VW / 2 + 100 + camera.x, 175 + camera.y, camera, tick, {
    isPlayer: true,
    shirtColor: OB.orangeLight,
    hairColor: '#664422',
    walking: true,
    frame: Math.floor(Date.now() / 300 + 1) % 2
  });
  
  ctx.fillStyle = OB.textPrimary;
  ctx.font = 'bold 18px monospace';
  ctx.fillText('2 PLAYERS', VW / 2 + 105, 265);
  
  ctx.fillStyle = `rgba(249,115,22,${pulse})`;
  ctx.beginPath();
  ctx.roundRect(VW / 2 + 45, 285, 120, 34, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('Press 2', VW / 2 + 105, 308);

  // Controls card
  ctx.fillStyle = OB.bgCard + 'aa';
  ctx.beginPath();
  ctx.roundRect(VW / 2 - 230, 375, 460, 100, 10);
  ctx.fill();
  ctx.strokeStyle = OB.purple + '25';
  ctx.beginPath();
  ctx.roundRect(VW / 2 - 230, 375, 460, 100, 10);
  ctx.stroke();

  ctx.fillStyle = OB.textMuted;
  ctx.font = '13px monospace';
  ctx.fillText('─── CONTROLS ───', VW / 2, 398);
  
  ctx.fillStyle = OB.purpleLight;
  ctx.font = '12px monospace';
  ctx.fillText('PLAYER 1: WASD to move, E/SPACE to fix', VW / 2, 425);
  ctx.fillStyle = OB.orangeLight;
  ctx.fillText('PLAYER 2: Arrows to move, ENTER/SHIFT to fix', VW / 2, 448);
  
  ctx.fillStyle = OB.textSecondary;
  ctx.font = '11px monospace';
  ctx.fillText('First to fix all issues wins! (1 minute timer)', VW / 2, 468);

  // Back hint
  ctx.fillStyle = OB.textMuted;
  ctx.font = '11px monospace';
  ctx.fillText('Press ESC to go back', VW / 2, 530);
  
  ctx.textAlign = 'left';
  ctx.lineWidth = 1;
}

// Draw end screen
export function drawEnd(
  ctx: CanvasRenderingContext2D, 
  win: boolean, 
  timer: number, 
  fixed: number,
  gameMode: GameMode = 'single',
  winner: Winner = null,
  p1Fixes: number = 0,
  p2Fixes: number = 0
): void {
  ctx.fillStyle = win ? OB.bg + 'f5' : 'rgba(15,10,20,0.96)';
  ctx.fillRect(0, 0, VW, VH);

  // Subtle purple glow at center
  const glowGrad = ctx.createRadialGradient(VW / 2, 200, 0, VW / 2, 200, 300);
  glowGrad.addColorStop(0, win ? 'rgba(124,92,252,0.12)' : 'rgba(255,50,50,0.08)');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, VW, VH);

  ctx.textAlign = 'center';

  if (gameMode === 'multi') {
    if (winner === 'player1') {
      ctx.fillStyle = OB.purpleLight;
      ctx.font = 'bold 48px monospace';
      ctx.fillText('PLAYER 1 WINS!', VW / 2, 160);
      ctx.fillStyle = OB.purple;
      ctx.font = '20px monospace';
      ctx.fillText('Purple Team Victory!', VW / 2, 200);
    } else if (winner === 'player2') {
      ctx.fillStyle = OB.orangeLight;
      ctx.font = 'bold 48px monospace';
      ctx.fillText('PLAYER 2 WINS!', VW / 2, 160);
      ctx.fillStyle = OB.orange;
      ctx.font = '20px monospace';
      ctx.fillText('Orange Team Victory!', VW / 2, 200);
    } else if (winner === 'tie') {
      ctx.fillStyle = OB.lavender;
      ctx.font = 'bold 48px monospace';
      ctx.fillText("IT'S A TIE!", VW / 2, 160);
      ctx.fillStyle = OB.textSecondary;
      ctx.font = '20px monospace';
      ctx.fillText('Both players matched!', VW / 2, 200);
    } else {
      ctx.fillStyle = '#ff5555';
      ctx.font = 'bold 48px monospace';
      ctx.fillText("TIME'S UP!", VW / 2, 160);
    }
    
    // Score cards
    ctx.fillStyle = OB.bgCard;
    ctx.beginPath();
    ctx.roundRect(VW / 2 - 200, 240, 160, 70, 10);
    ctx.fill();
    ctx.strokeStyle = OB.purple + '60';
    ctx.beginPath();
    ctx.roundRect(VW / 2 - 200, 240, 160, 70, 10);
    ctx.stroke();
    
    ctx.fillStyle = OB.purpleLight;
    ctx.font = 'bold 13px monospace';
    ctx.fillText('PLAYER 1', VW / 2 - 120, 265);
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`${p1Fixes} fixes`, VW / 2 - 120, 295);
    
    ctx.fillStyle = OB.bgCard;
    ctx.beginPath();
    ctx.roundRect(VW / 2 + 40, 240, 160, 70, 10);
    ctx.fill();
    ctx.strokeStyle = OB.orange + '60';
    ctx.beginPath();
    ctx.roundRect(VW / 2 + 40, 240, 160, 70, 10);
    ctx.stroke();
    
    ctx.fillStyle = OB.orangeLight;
    ctx.font = 'bold 13px monospace';
    ctx.fillText('PLAYER 2', VW / 2 + 120, 265);
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`${p2Fixes} fixes`, VW / 2 + 120, 295);
    
    ctx.fillStyle = OB.textMuted;
    ctx.font = '14px monospace';
    ctx.fillText(`Total issues: ${TOTAL_ISSUES}`, VW / 2, 345);
    
    // Multiplayer end branding
    ctx.fillStyle = OB.textSecondary;
    ctx.font = '11px monospace';
    ctx.fillText('NHIs outnumber human identities 20-50x and growing 20% YoY', VW / 2, 380);
    ctx.fillStyle = OB.purpleLight;
    ctx.font = 'bold 11px monospace';
    ctx.fillText('oasis.security  →  Govern agentic access at scale', VW / 2, 398);
    
  } else {
    if (win) {
      ctx.fillStyle = OB.purpleLight;
      ctx.font = 'bold 44px monospace';
      ctx.fillText('ALL NHIs SECURED!', VW / 2, 160);
      ctx.fillStyle = OB.purple + '30';
      ctx.fillText('ALL NHIs SECURED!', VW / 2 + 2, 162);
      
      ctx.fillStyle = OB.purpleSoft;
      ctx.font = '16px monospace';
      ctx.fillText('Oasis — Agentic Access Management', VW / 2, 195);
      
      ctx.fillStyle = OB.textPrimary;
      ctx.font = '20px monospace';
      const el = GAME_TIME - timer;
      const m = Math.floor(el / 60);
      const s = Math.floor(el % 60);
      ctx.fillText(`Completed in ${m}:${s < 10 ? '0' : ''}${s}`, VW / 2, 240);
      ctx.fillStyle = OB.purpleSoft;
      ctx.fillText(`All ${TOTAL_ISSUES} identity issues remediated`, VW / 2, 270);
      
      // Win message with Oasis branding
      ctx.fillStyle = OB.bgCard + 'dd';
      ctx.beginPath();
      ctx.roundRect(VW / 2 - 230, 295, 460, 65, 8);
      ctx.fill();
      ctx.strokeStyle = OB.purple + '30';
      ctx.beginPath();
      ctx.roundRect(VW / 2 - 230, 295, 460, 65, 8);
      ctx.stroke();
      
      ctx.fillStyle = OB.textSecondary;
      ctx.font = '12px monospace';
      ctx.fillText('NHIs constitute 90%+ of the identity fabric.', VW / 2, 316);
      ctx.fillText('You just governed them all. Oasis does it at cloud scale.', VW / 2, 334);
      ctx.fillStyle = OB.purpleLight;
      ctx.font = 'bold 11px monospace';
      ctx.fillText('oasis.security  →  Request a Demo', VW / 2, 352);
    } else {
      // Title (use orange to stay in brand palette)
      ctx.fillStyle = OB.orangeLight;
      ctx.font = 'bold 44px monospace';
      ctx.fillText("TIME'S UP!", VW / 2, 160);
      ctx.fillStyle = OB.orange + '35';
      ctx.fillText("TIME'S UP!", VW / 2 + 2, 162);

      // Score
      ctx.fillStyle = OB.textSecondary;
      ctx.font = '20px monospace';
      ctx.fillText(`Remediated: ${fixed} / ${TOTAL_ISSUES}`, VW / 2, 230);
      ctx.fillStyle = OB.textPrimary;
      ctx.fillText(`${TOTAL_ISSUES - fixed} identities still at risk`, VW / 2, 260);
      
      // Lose message with Oasis branding (bigger + punchier)
      const cardX = VW / 2 - 250;
      const cardY = 285;
      const cardW = 500;
      const cardH = 92;
      ctx.fillStyle = OB.bgCard + 'e6';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 10);
      ctx.fill();
      ctx.strokeStyle = OB.orange + '55';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 10);
      ctx.stroke();
      ctx.lineWidth = 1;

      ctx.fillStyle = OB.orangeLight;
      ctx.font = 'bold 14px monospace';
      ctx.fillText('Oasis takes you from 0 to 10', VW / 2, cardY + 22);

      // Wrapped body copy
      const body =
        'Purpose-built solution that combines powerful discovery, posture analytics, anomaly detection, and threat detection with efficient remediation and lifecycle management.';
      ctx.fillStyle = OB.textSecondary;
      ctx.font = '10px monospace';
      const maxW = cardW - 34;
      const words = body.split(' ');
      let line = '';
      let y = cardY + 40;
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxW) {
          ctx.fillText(line, VW / 2, y);
          line = w;
          y += 13;
          if (y > cardY + 66) break; // keep it tight
        } else {
          line = test;
        }
      }
      if (line && y <= cardY + 66) ctx.fillText(line, VW / 2, y);

      // CTA line
      ctx.fillStyle = OB.purpleLight;
      ctx.font = 'bold 11px monospace';
      ctx.fillText('oasis.security  →  Govern agentic access at scale', VW / 2, cardY + cardH - 12);
    }
  }

  // Continue button (orange)
  if (Math.sin(Date.now() * 0.004) > 0) {
    const btnW = 360, btnH = 40;
    const btnX = VW / 2 - btnW / 2, btnY = 420;
    ctx.fillStyle = OB.orange;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Press ENTER or SPACE to continue', VW / 2, btnY + 26);
  }
  
  // Footer tagline
  ctx.fillStyle = OB.textMuted;
  ctx.font = '10px monospace';
  ctx.fillText('Oasis Security  |  Map. Secure. Govern. Automate.', VW / 2, VH - 20);
  
  ctx.textAlign = 'left';
}
