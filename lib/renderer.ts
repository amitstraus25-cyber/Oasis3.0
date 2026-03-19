import {
  TILE, MAP_W, MAP_H, VW, VH, T, COL, GAME_TIME, TOTAL_ISSUES, ISSUE_TYPES,
} from './constants';
import type {
  TileType, Cubicle, Player, NPC, Issue, Particle, Camera, DrawPersonOptions,
} from './types';

// Get oasis/desert gradient color based on position
function getOasisGradient(tx: number, ty: number): string {
  // Create a gradient from edges (sandy) to center (greener/cooler)
  const centerX = MAP_W / 2;
  const centerY = MAP_H / 2;
  const distX = Math.abs(tx - centerX) / centerX;
  const distY = Math.abs(ty - centerY) / centerY;
  const dist = Math.sqrt(distX * distX + distY * distY) / 1.4;
  
  // Interpolate between oasis green-tint and desert sand
  const r = Math.floor(180 + dist * 40); // 180-220
  const g = Math.floor(170 + dist * 20); // 170-190
  const b = Math.floor(130 - dist * 20); // 130-110
  
  // Add checker pattern variation
  const checker = (tx + ty) % 2 === 0 ? 0 : -8;
  
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
      // Chair
      ctx.fillStyle = '#3a3a44';
      ctx.fillRect(sx + 13, sy + 30, 14, 8);
      ctx.fillStyle = '#484854';
      ctx.fillRect(sx + 14, sy + 28, 12, 3);
      ctx.fillStyle = '#2a2a30';
      ctx.fillRect(sx + 14, sy + 37, 3, 2);
      ctx.fillRect(sx + 23, sy + 37, 3, 2);
      // Desk surface
      ctx.fillStyle = COL.desk;
      ctx.fillRect(sx + 2, sy + 3, TILE - 4, 24);
      ctx.fillStyle = COL.deskTop;
      ctx.fillRect(sx + 2, sy + 3, TILE - 4, 3);
      // Monitor
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(sx + 7, sy + 7, 22, 15);
      const dk = `${tx},${ty}`;
      const dRef = deskMap.get(dk);
      if (dRef && !dRef.fixed) {
        ctx.fillStyle = '#441818';
        ctx.fillRect(sx + 8, sy + 8, 20, 13);
        ctx.fillStyle = '#cc3333';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('⚠', sx + 14, sy + 18);
      } else {
        ctx.fillStyle = '#142a1c';
        ctx.fillRect(sx + 8, sy + 8, 20, 13);
        ctx.fillStyle = '#3a8855';
        ctx.fillRect(sx + 9, sy + 10, 14, 1);
        ctx.fillRect(sx + 9, sy + 12, 10, 1);
        ctx.fillRect(sx + 9, sy + 14, 16, 1);
        ctx.fillRect(sx + 9, sy + 16, 8, 1);
      }
      // Keyboard/mouse
      ctx.fillStyle = '#333';
      ctx.fillRect(sx + 16, sy + 22, 4, 4);
      ctx.fillStyle = '#aaa';
      ctx.fillRect(sx + 8, sy + 24, 14, 3);
      ctx.fillStyle = '#888';
      ctx.fillRect(sx + 26, sy + 24, 8, 3);
      break;
    }

    case T.OUTER:
      ctx.fillStyle = COL.outer;
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = COL.outerTop;
      ctx.fillRect(sx, sy, TILE, 3);
      if ((tx * 7 + ty * 3) % 6 === 0) {
        ctx.fillStyle = '#2a3a50';
        ctx.fillRect(sx + 8, sy + 8, 24, 22);
        ctx.fillStyle = '#3a5070';
        ctx.fillRect(sx + 10, sy + 10, 20, 18);
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
      ctx.fillStyle = '#dde8ee';
      ctx.fillRect(sx + 10, sy + 4, 20, 30);
      ctx.fillStyle = '#c0ccd4';
      ctx.fillRect(sx + 10, sy + 4, 20, 4);
      ctx.fillStyle = '#4499ee';
      ctx.fillRect(sx + 14, sy + 12, 12, 14);
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

    // Measure text widths with bigger fonts
    ctx.font = 'bold 12px monospace';
    const tw1 = ctx.measureText(line1).width;
    ctx.font = '11px monospace';
    const tw2 = ctx.measureText(line2).width;
    const maxTw = Math.max(tw1, tw2);

    const lx = cx + (TILE - maxTw) / 2;
    const ly = cy + TILE + 2;

    // Background box - bigger and more visible
    ctx.fillStyle = 'rgba(10,24,16,0.92)';
    ctx.fillRect(lx - 6, ly - 28, maxTw + 12, 32);
    
    // Check if has issue
    const dk = `${c.deskX},${c.deskY}`;
    const dRef = deskMap.get(dk);
    const hasIssue = dRef && !dRef.fixed;
    
    // Border color based on status
    ctx.strokeStyle = hasIssue ? 'rgba(255,136,68,0.7)' : 'rgba(68,170,100,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(lx - 6, ly - 28, maxTw + 12, 32);
    ctx.lineWidth = 1;

    // Line 1: NHI name - BIGGER
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = hasIssue ? '#ff9955' : '#66eebb';
    ctx.fillText(line1, lx, ly - 14);

    // Line 2: kind | team | risk - BIGGER
    ctx.font = '11px monospace';
    ctx.fillStyle = hasIssue ? '#ddaa77' : '#99ccbb';
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

  // Oasis logo on player shirt
  if (opts.isPlayer) {
    ctx.fillStyle = '#00ffaa';
    const bx = cx + 3 * s;
    const by = y + 9 * s;
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

  switch (issue.type) {
    case 0: // Credential Leak - coffee spill
      ctx.fillStyle = '#cc9922';
      ctx.fillRect(x + 6, y + 10, 18, 6);
      ctx.fillRect(x + 4, y + 6, 12, 14);
      ctx.fillStyle = '#aa7718';
      ctx.fillRect(x + 7, y + 10, 6, 4);
      ctx.fillRect(x + 20, y + 10, 4, 8);
      ctx.fillRect(x + 24, y + 12, 4, 6);
      ctx.fillStyle = '#5a3000';
      ctx.beginPath();
      ctx.ellipse(x + T2 / 2, y + 30, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a4800';
      ctx.beginPath();
      ctx.ellipse(x + T2 / 2, y + 30, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 1: // Security Breach - fire
      ctx.fillStyle = '#cc2222';
      ctx.fillRect(x + 8, y + 10, 6, 16);
      ctx.fillRect(x + 14, y + 6, 12, 8);
      ctx.fillRect(x + 26, y + 10, 6, 16);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(x + 14, y + 14, 12, 12);
      ctx.fillStyle = '#881111';
      ctx.fillRect(x + 16, y + 12, 2, 14);
      ctx.fillRect(x + 22, y + 12, 2, 14);
      for (let i = 0; i < 5; i++) {
        const fx = x + 6 + Math.sin(f * 0.25 + i * 1.2) * 8;
        const fy = y + 28 - i * 5 - Math.abs(Math.sin(f * 0.18 + i * 0.7)) * 5;
        ctx.fillStyle = i < 2 ? '#ff2200' : (i < 3 ? '#ff7700' : '#ffcc00');
        ctx.fillRect(fx, fy, 6 + Math.sin(f * 0.1 + i) * 2, 5);
      }
      break;

    case 2: // Expired Certificate
      ctx.fillStyle = '#ddd';
      ctx.fillRect(x + 6, y + 2, 28, 34);
      ctx.fillStyle = '#eee';
      ctx.fillRect(x + 8, y + 4, 24, 28);
      ctx.fillStyle = '#aaa';
      ctx.fillRect(x + 10, y + 8, 20, 1);
      ctx.fillRect(x + 10, y + 12, 16, 1);
      ctx.fillRect(x + 10, y + 16, 18, 1);
      const flash = Math.sin(f * 0.2) > 0;
      ctx.strokeStyle = flash ? '#ff2222' : '#cc0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 14, y + 20);
      ctx.lineTo(x + 26, y + 32);
      ctx.moveTo(x + 26, y + 20);
      ctx.lineTo(x + 14, y + 32);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = flash ? '#ff2222' : '#cc0000';
      ctx.font = 'bold 6px monospace';
      ctx.fillText('EXPIRED', x + 9, y + 35);
      break;

    case 3: // Stale API Token
      ctx.fillStyle = '#aa8833';
      ctx.beginPath();
      ctx.arc(x + T2 / 2, y + T2 / 2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#887722';
      ctx.beginPath();
      ctx.arc(x + T2 / 2, y + T2 / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#665511';
      ctx.beginPath();
      ctx.arc(x + T2 / 2, y + T2 / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(100,100,100,0.5)';
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 4);
      ctx.lineTo(x + 18, y + 16);
      ctx.moveTo(x + 28, y + 6);
      ctx.lineTo(x + 20, y + 18);
      ctx.moveTo(x + 30, y + 30);
      ctx.lineTo(x + 22, y + 22);
      ctx.stroke();
      ctx.fillStyle = 'rgba(150,150,130,0.3)';
      ctx.fillRect(x + 8, y + 8, 24, 24);
      break;

    case 4: // Permission Conflict
      ctx.fillStyle = '#4466cc';
      ctx.fillRect(x + 2, y + 6, 14, 18);
      ctx.fillStyle = '#3355bb';
      ctx.fillRect(x + 4, y + 8, 10, 14);
      ctx.fillStyle = '#cc4444';
      ctx.fillRect(x + 24, y + 6, 14, 18);
      ctx.fillStyle = '#bb3333';
      ctx.fillRect(x + 26, y + 8, 10, 14);
      const blt = Math.sin(f * 0.2) * 3;
      ctx.fillStyle = '#ffee44';
      ctx.fillRect(x + 17, y + 10 + blt, 6, 3);
      ctx.fillRect(x + 18, y + 8 + blt, 4, 8);
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('!', x + 7, y + 30);
      ctx.fillText('!', x + 30, y + 30);
      break;

    case 5: // Unrotated Secret
      ctx.fillStyle = '#cc8822';
      ctx.fillRect(x + 12, y + 12, 16, 6);
      ctx.fillRect(x + 8, y + 8, 12, 14);
      ctx.fillStyle = '#aa6618';
      ctx.fillRect(x + 10, y + 12, 6, 4);
      ctx.fillRect(x + 24, y + 12, 4, 8);
      ctx.fillRect(x + 28, y + 14, 4, 5);
      const vib = Math.sin(f * 0.35) * 3;
      ctx.strokeStyle = '#ff6644';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + T2 / 2 + vib, y + T2 / 2, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + T2 / 2 + vib, y + 14, 5, Math.PI * 0.7, Math.PI * 2.3);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = '#ff3322';
      ctx.beginPath();
      ctx.arc(x + 32, y + 6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('!', x + 30, y + 9);
      break;

    case 6: // Dormant Identity
      ctx.fillStyle = '#777';
      ctx.beginPath();
      ctx.arc(x + T2 / 2, y + 12, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#666';
      ctx.fillRect(x + 10, y + 20, 20, 14);
      ctx.strokeStyle = 'rgba(120,120,120,0.4)';
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 4);
      ctx.lineTo(x + 18, y + 12);
      ctx.moveTo(x + 34, y + 8);
      ctx.lineTo(x + 24, y + 14);
      ctx.stroke();
      ctx.fillStyle = '#aaaaff';
      ctx.font = '12px monospace';
      const zy = Math.sin(f * 0.08) * 4;
      ctx.fillText('Z', x + 28, y + 8 + zy);
      ctx.font = '9px monospace';
      ctx.fillText('z', x + 34, y + 2 + zy * 0.6);
      break;

    case 7: // Secret Sprawl
      for (let i = 0; i < 4; i++) {
        const kx = x + 4 + i * 8 + Math.sin(f * 0.03 + i * 2) * 3;
        const ky = y + 6 + i * 6;
        ctx.fillStyle = '#cc9922';
        ctx.fillRect(kx, ky, 8, 3);
        ctx.fillRect(kx - 2, ky - 2, 6, 7);
      }
      ctx.fillStyle = 'rgba(60,100,200,0.3)';
      const spread = 12 + Math.sin(f * 0.04) * 3;
      ctx.beginPath();
      ctx.ellipse(x + T2 / 2, y + 30, spread, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 8: // Log Overflow
      ctx.fillStyle = '#1a2a1a';
      ctx.fillRect(x + 4, y + 4, 32, 24);
      ctx.fillStyle = '#0a1a0a';
      ctx.fillRect(x + 5, y + 5, 30, 22);
      ctx.fillStyle = '#33cc66';
      ctx.font = '6px monospace';
      const scroll = f % 60;
      const lines = ['> ERR connect', '  WARN timeout', '  ERR auth_fail', '> CRIT overflow', '  ERR key_exp', '> WARN stale'];
      for (let i = 0; i < 4; i++) {
        const li = (Math.floor(scroll / 15) + i) % lines.length;
        ctx.fillText(lines[li], x + 7, y + 12 + i * 5);
      }
      ctx.fillStyle = 'rgba(50,200,100,0.15)';
      ctx.fillRect(x + 5, y + 5, 30, 22);
      break;
  }

  // Pulsing warning ring
  const pulse = Math.sin(f * 0.09) * 0.3 + 0.55;
  ctx.strokeStyle = `rgba(255,70,70,${pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + T2 / 2, y + T2 / 2, 22 + Math.sin(f * 0.09) * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
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
  player: Player
): void {
  const mw = 120, mh = 92;
  const mx = VW - mw - 10, my = VH - mh - 10;
  const sx = mw / MAP_W, sy = mh / MAP_H;

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
  ctx.strokeStyle = 'rgba(68,170,100,0.25)';
  ctx.strokeRect(mx - 3, my - 3, mw + 6, mh + 6);
  ctx.fillStyle = '#b0a878';
  ctx.fillRect(mx, my, mw, mh);

  ctx.fillStyle = '#6a7888';
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map[y][x] === T.WALL || map[y][x] === T.OUTER) {
        ctx.fillRect(mx + x * sx, my + y * sy, Math.ceil(sx), Math.ceil(sy));
      }
    }
  }

  for (const d of issues) {
    ctx.fillStyle = d.fixed ? '#44cc44' : '#ff4444';
    ctx.fillRect(mx + d.tileX * sx - 1, my + d.tileY * sy - 1, 4, 4);
  }

  ctx.fillStyle = '#00ffaa';
  ctx.fillRect(mx + (player.x / TILE) * sx - 2, my + (player.y / TILE) * sy - 2, 5, 5);
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
  ctx.fillStyle = 'rgba(8,16,12,0.8)';
  ctx.fillRect(6, 6, 200, 40);
  ctx.strokeStyle = 'rgba(68,170,100,0.3)';
  ctx.strokeRect(6, 6, 200, 40);
  ctx.fillStyle = '#ddf0dd';
  ctx.font = 'bold 17px monospace';
  ctx.fillText(`Remediated: ${fixed}/${TOTAL_ISSUES}`, 14, 32);

  // Top right - Timer with sand clock
  const timerBoxW = 120;
  const timerBoxH = 48;
  ctx.fillStyle = 'rgba(8,16,12,0.85)';
  ctx.fillRect(VW - timerBoxW - 10, 6, timerBoxW, timerBoxH);
  ctx.strokeStyle = timer < 30 ? 'rgba(255,80,80,0.6)' : 'rgba(68,170,100,0.3)';
  ctx.strokeRect(VW - timerBoxW - 10, 6, timerBoxW, timerBoxH);
  
  // Time text
  const mins = Math.floor(timer / 60);
  const secs = Math.floor(timer % 60);
  const ts = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  ctx.fillStyle = timer < 30 ? '#ff5555' : '#ddf0dd';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(ts, VW - timerBoxW + 6, 36);
  
  // Sand clock (smaller)
  drawSandClock(ctx, VW - 48, 10, timer, tick);

  // Bottom - Detailed issue info box (like in the screenshot)
  if (nearbyIssue) {
    const issueInfo = ISSUE_TYPES[nearbyIssue.type];
    const profile = nearbyIssue.cubicle.profile;
    
    // Box dimensions
    const boxW = 520;
    const boxH = 90;
    const boxX = 10;
    const boxY = VH - boxH - 10;

    // Background
    ctx.fillStyle = 'rgba(8,16,12,0.92)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#44aa66';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.lineWidth = 1;

    // Line 1: SPACE -> Issue Name
    ctx.fillStyle = '#44ddaa';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`SPACE -> ${issueInfo.name}`, boxX + 14, boxY + 22);

    // Line 2: Pillar | Risk
    const riskColor = issueInfo.risk === 'CRIT' ? '#ff5555' : issueInfo.risk === 'High' ? '#ffaa44' : '#ffff66';
    ctx.fillStyle = riskColor;
    ctx.font = '13px monospace';
    ctx.fillText(`Pillar: ${issueInfo.pillar} | Risk: ${issueInfo.risk}`, boxX + 14, boxY + 42);

    // Line 3: Target info
    ctx.fillStyle = '#88bbaa';
    ctx.font = '12px monospace';
    ctx.fillText(`Target: ${profile.id} (${profile.kind})`, boxX + 14, boxY + 60);

    // Line 4: Description
    ctx.fillStyle = '#778888';
    ctx.font = '11px monospace';
    ctx.fillText(issueInfo.desc, boxX + 14, boxY + 78);
  }

  // Flash effect
  if (flash > 0) {
    ctx.fillStyle = `rgba(68,255,170,${flash / 28})`;
    ctx.fillRect(0, 0, VW, VH);
  }

  // Minimap
  drawMinimap(ctx, map, issues, player);
}

// Draw title screen
export function drawTitle(ctx: CanvasRenderingContext2D, tick: number): void {
  ctx.fillStyle = '#0e1018';
  ctx.fillRect(0, 0, VW, VH);

  ctx.fillStyle = '#141820';
  for (let y = 0; y < VH; y += 40) {
    for (let x = 0; x < VW; x += 40) {
      if ((x / 40 + y / 40) % 2 === 0) ctx.fillRect(x, y, 40, 40);
    }
  }

  // Animated cubicles
  for (let i = 0; i < 14; i++) {
    const bx = 40 + i * 60;
    const by = 380 + Math.sin(Date.now() * 0.001 + i) * 6;
    ctx.fillStyle = '#1a2028';
    ctx.fillRect(bx, by, 44, 28);
    ctx.fillStyle = '#242e38';
    ctx.fillRect(bx, by, 44, 3);
    ctx.fillStyle = i % 3 === 0 ? '#331818' : '#142a1c';
    ctx.fillRect(bx + 8, by + 6, 16, 10);
  }

  ctx.textAlign = 'center';

  // Title
  ctx.fillStyle = '#44ddaa';
  ctx.font = 'bold 52px monospace';
  ctx.fillText('NHI FIXER', VW / 2, 120);
  ctx.fillStyle = 'rgba(68,221,170,0.15)';
  ctx.fillText('NHI FIXER', VW / 2 + 2, 122);

  ctx.fillStyle = '#ff8833';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('Non-Human Identity Office', VW / 2, 160);

  ctx.fillStyle = '#7799aa';
  ctx.font = '16px monospace';
  ctx.fillText('Secure the identities. Clean up the mess.', VW / 2, 195);

  // Player preview
  const camera = { x: 0, y: 0 };
  drawPerson(ctx, VW / 2 - 20 + camera.x, 218 + camera.y, camera, tick, {
    isPlayer: true,
    shirtColor: '#00aaaa',
    hairColor: '#443311',
    walking: true,
    frame: Math.floor(Date.now() / 300) % 2
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#44ddaa';
  ctx.font = '11px monospace';
  ctx.fillText('↑ You (Oasis shirt)', VW / 2, 272);

  // Instructions
  ctx.fillStyle = '#8899aa';
  ctx.font = '13px monospace';
  const lines = [
    'WASD / Arrows  –  Move through the office',
    'SPACE  –  Remediate nearby NHI issue',
    '',
    '9 Non-Human Identities have security issues.',
    'Service accounts, bots, agents, workloads –',
    'find and fix them all before time runs out!'
  ];
  lines.forEach((l, i) => ctx.fillText(l, VW / 2, 305 + i * 20));

  // Start prompt
  if (Math.sin(Date.now() * 0.004) > 0) {
    ctx.fillStyle = '#ffee44';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('Press ENTER or SPACE to start', VW / 2, 530);
  }
  ctx.textAlign = 'left';
}

// Draw end screen
export function drawEnd(ctx: CanvasRenderingContext2D, win: boolean, timer: number, fixed: number): void {
  ctx.fillStyle = win ? 'rgba(4,24,12,0.9)' : 'rgba(30,8,8,0.9)';
  ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';

  if (win) {
    ctx.fillStyle = '#44ffaa';
    ctx.font = 'bold 48px monospace';
    ctx.fillText('ALL NHIs SECURED!', VW / 2, 180);
    ctx.fillStyle = '#ddf0dd';
    ctx.font = '20px monospace';
    const el = GAME_TIME - timer;
    const m = Math.floor(el / 60);
    const s = Math.floor(el % 60);
    ctx.fillText(`Completed in ${m}:${s < 10 ? '0' : ''}${s}`, VW / 2, 250);
    ctx.fillText(`All ${TOTAL_ISSUES} identity issues remediated`, VW / 2, 290);
  } else {
    ctx.fillStyle = '#ff5555';
    ctx.font = 'bold 48px monospace';
    ctx.fillText("TIME'S UP!", VW / 2, 180);
    ctx.fillStyle = '#ffcccc';
    ctx.font = '20px monospace';
    ctx.fillText(`Remediated: ${fixed} / ${TOTAL_ISSUES}`, VW / 2, 250);
    ctx.fillText(`${TOTAL_ISSUES - fixed} identities still at risk`, VW / 2, 290);
  }

  if (Math.sin(Date.now() * 0.004) > 0) {
    ctx.fillStyle = '#ffee44';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Press ENTER or SPACE to continue', VW / 2, 420);
  }
  ctx.textAlign = 'left';
}
