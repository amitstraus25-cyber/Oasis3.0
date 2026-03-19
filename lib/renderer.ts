import {
  TILE, MAP_W, MAP_H, VW, VH, T, GAME_TIME, TOTAL_ISSUES,
  OASIS, DESERT, ISSUES, KIND_COLORS,
} from './constants';
import type {
  TileType, Desk, Player, NPC, Issue, Particle, SandParticle,
  Camera, DrawPersonOptions,
} from './types';

// Get gradient color for desert floor
export function getGradientColor(ty: number): string {
  const t = ty / MAP_H;
  return `rgb(${Math.floor(245 - t * 55)},${Math.floor(230 - t * 75)},${Math.floor(200 - t * 90)})`;
}

// Draw a single tile
export function drawTile(
  ctx: CanvasRenderingContext2D,
  map: TileType[][],
  desks: Desk[],
  tx: number,
  ty: number
): void {
  const type = map[ty][tx];
  const sx = tx * TILE;
  const sy = ty * TILE;
  const chk = (tx + ty) % 2 === 0;
  const gc = getGradientColor(ty);
  const gc2 = getGradientColor(ty + 0.5);

  if (type === T.FLOOR) {
    ctx.fillStyle = chk ? gc : gc2;
    ctx.fillRect(sx, sy, TILE, TILE);
  }
  else if (type === T.WALL) {
    ctx.fillStyle = '#7a8899';
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#a0acb8';
    ctx.fillRect(sx + 1, sy + 1, TILE - 2, 3);
    ctx.fillStyle = '#5a6878';
    ctx.fillRect(sx + 2, sy + TILE - 3, TILE - 4, 2);
  }
  else if (type === T.DESK) {
    ctx.fillStyle = chk ? gc : gc2;
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#7c5420';
    ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 8);
    ctx.fillStyle = '#946830';
    ctx.fillRect(sx + 2, sy + 2, TILE - 4, 3);
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(sx + 5, sy + 5, TILE - 10, 10);
    const desk = desks.find(d => d.x === tx && d.y === ty);
    ctx.fillStyle = (desk && desk.hasIssue) ? '#441818' : '#0a1e1a';
    ctx.fillRect(sx + 6, sy + 6, TILE - 12, 8);
    if (!desk?.hasIssue) {
      ctx.fillStyle = OASIS.teal;
      ctx.fillRect(sx + 7, sy + 8, 8, 1);
      ctx.fillRect(sx + 7, sy + 11, 6, 1);
    }
  }
  else if (type === T.OUTER) {
    ctx.fillStyle = '#363c48';
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#464e5a';
    ctx.fillRect(sx, sy, TILE, 3);
  }
  else if (type === T.POOL) {
    ctx.fillStyle = chk ? gc : gc2;
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = OASIS.tealDark;
    ctx.beginPath();
    ctx.ellipse(sx + TILE / 2, sy + TILE / 2, TILE / 2 - 2, TILE / 2 - 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = OASIS.teal;
    ctx.beginPath();
    ctx.ellipse(sx + TILE / 2, sy + TILE / 2, TILE / 2 - 5, TILE / 2 - 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(94,234,212,0.4)';
    ctx.beginPath();
    ctx.ellipse(sx + TILE / 2 - 4, sy + TILE / 2 - 3, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  else if (type === T.CACTUS) {
    ctx.fillStyle = chk ? gc : gc2;
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = DESERT.cactus;
    ctx.fillRect(sx + 12, sy + 4, 8, 24);
    ctx.fillRect(sx + 4, sy + 10, 8, 4);
    ctx.fillRect(sx + 4, sy + 6, 4, 8);
    ctx.fillRect(sx + 20, sy + 14, 8, 4);
    ctx.fillRect(sx + 24, sy + 10, 4, 8);
    ctx.fillStyle = DESERT.cactusDark;
    ctx.fillRect(sx + 14, sy + 4, 2, 24);
    if ((tx + ty) % 3 === 0) {
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(sx + 16, sy + 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  else if (type === T.PALM) {
    ctx.fillStyle = chk ? gc : gc2;
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = '#5D4422';
    ctx.fillRect(sx + 14, sy + 12, 4, 18);
    ctx.fillStyle = OASIS.tealDark;
    ctx.beginPath();
    ctx.arc(sx + 16, sy + 6, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = OASIS.teal;
    ctx.beginPath();
    ctx.arc(sx + 10, sy + 10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx + 22, sy + 10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(sx + 14, sy + 8, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw a person (player or NPC)
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  opts: DrawPersonOptions
): void {
  const x = wx;
  const y = wy;
  const skin = '#ffcc99';
  const shirt = opts.color || OASIS.teal;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(x + 4, y + TILE - 4, TILE - 8, 3);

  // Legs
  ctx.fillStyle = '#3a5070';
  const lo = opts.walking && opts.frame ? 2 : 0;
  ctx.fillRect(x + 8, y + 20 + lo, 6, 8);
  ctx.fillRect(x + 18, y + 20 - lo, 6, 8);

  // Body
  ctx.fillStyle = shirt;
  ctx.fillRect(x + 6, y + 12, 20, 10);

  // 4 Arms
  const ao = opts.frame ? 2 : 0;

  // Upper arms
  ctx.fillStyle = shirt;
  ctx.fillRect(x + 2 - ao, y + 12, 6, 4);
  ctx.fillRect(x + 24 + ao, y + 12, 6, 4);
  ctx.fillStyle = skin;
  ctx.fillRect(x + 2 - ao, y + 16, 5, 4);
  ctx.fillRect(x + 25 + ao, y + 16, 5, 4);

  // Lower arms
  ctx.fillStyle = shirt;
  ctx.fillRect(x + ao, y + 16, 5, 3);
  ctx.fillRect(x + 27 - ao, y + 16, 5, 3);
  ctx.fillStyle = skin;
  ctx.fillRect(x + ao, y + 19, 4, 4);
  ctx.fillRect(x + 28 - ao, y + 19, 4, 4);

  // Head
  ctx.fillStyle = skin;
  ctx.fillRect(x + 10, y + 4, 12, 10);
  ctx.fillStyle = opts.hair || '#443322';
  ctx.fillRect(x + 10, y + 2, 12, 4);
  ctx.fillStyle = '#111';
  ctx.fillRect(x + 12, y + 8, 2, 2);
  ctx.fillRect(x + 18, y + 8, 2, 2);

  // Player badge
  if (opts.isPlayer) {
    ctx.fillStyle = OASIS.tealLight;
    ctx.fillRect(x + 12, y + 14, 8, 2);
    ctx.fillRect(x + 14, y + 16, 4, 3);
  }

  // Happy checkmark
  if (opts.happy && opts.happy > 30) {
    ctx.fillStyle = '#00ee66';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('✓', x + 24, y);
  }
}

// Draw desk label above NPC
export function drawDeskLabel(
  ctx: CanvasRenderingContext2D,
  npc: NPC,
  issues: Issue[]
): void {
  const desk = npc.desk;
  if (!desk) return;

  const x = npc.x + TILE / 2;
  const y = npc.y - 8;

  const prof = desk.profile;
  const labelText = prof.id;

  ctx.font = 'bold 8px monospace';
  const tw = ctx.measureText(labelText).width;

  // Background
  ctx.fillStyle = 'rgba(20,16,12,0.85)';
  ctx.fillRect(x - tw / 2 - 4, y - 10, tw + 8, 12);

  // Border based on kind
  const kindColor = KIND_COLORS[prof.kind] || OASIS.teal;
  ctx.strokeStyle = kindColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - tw / 2 - 4, y - 10, tw + 8, 12);

  // Text
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(labelText, x, y - 2);
  ctx.textAlign = 'left';

  // Issue label
  if (desk.hasIssue) {
    const issue = issues.find(i => i.desk === desk && !i.fixed);
    if (issue) {
      const issueName = ISSUES[issue.type].name;
      const sev = ISSUES[issue.type].sev;
      const sevColor = sev === 'CRIT' ? '#ff4444' : sev === 'HIGH' ? '#ffaa44' : '#ffff44';

      ctx.font = 'bold 7px monospace';
      const iw = ctx.measureText(issueName).width;

      ctx.fillStyle = 'rgba(40,20,20,0.9)';
      ctx.fillRect(x - iw / 2 - 3, y + 2, iw + 6, 10);
      ctx.strokeStyle = sevColor;
      ctx.strokeRect(x - iw / 2 - 3, y + 2, iw + 6, 10);

      ctx.fillStyle = sevColor;
      ctx.textAlign = 'center';
      ctx.fillText(issueName, x, y + 9);
      ctx.textAlign = 'left';
    }
  }
}

// Draw issue icon
export function drawIssue(ctx: CanvasRenderingContext2D, issue: Issue): void {
  if (issue.fixed) return;
  
  const x = issue.x;
  const y = issue.y;
  const pulse = Math.sin(issue.anim * 0.1) * 0.3 + 0.7;
  const t = issue.type;

  // Background
  ctx.fillStyle = 'rgba(30,20,20,0.92)';
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);

  // Draw icon based on type
  if (t === 0) {
    ctx.fillStyle = '#D4A574';
    ctx.fillRect(x + 8, y + 10, 12, 5);
    ctx.fillRect(x + 18, y + 8, 5, 4);
    ctx.fillStyle = '#ff4444';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + 10 + i * 4, y + 18 + i * 2 + Math.sin(issue.anim * 0.15 + i) * 2, 3, 4);
    }
  } else if (t === 1) {
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 6);
    ctx.lineTo(x + 26, y + 26);
    ctx.lineTo(x + 6, y + 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(x + 14, y + 14, 4, 8);
  } else if (t === 2) {
    ctx.fillStyle = '#eee';
    ctx.fillRect(x + 8, y + 5, 16, 22);
    ctx.strokeStyle = '#cc3333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 15);
    ctx.lineTo(x + 22, y + 23);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 15);
    ctx.lineTo(x + 10, y + 23);
    ctx.stroke();
    ctx.lineWidth = 1;
  } else if (t === 3) {
    ctx.fillStyle = '#aa8844';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#664422';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(80,60,40,0.5)';
    ctx.fillRect(x + 8, y + 8, 2, 16);
  } else if (t === 4) {
    ctx.fillStyle = '#4466cc';
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 16);
    ctx.lineTo(x + 16, y + 8);
    ctx.lineTo(x + 16, y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#cc4444';
    ctx.beginPath();
    ctx.moveTo(x + 26, y + 16);
    ctx.lineTo(x + 16, y + 8);
    ctx.lineTo(x + 16, y + 24);
    ctx.closePath();
    ctx.fill();
  } else if (t === 5) {
    ctx.fillStyle = '#666';
    ctx.fillRect(x + 10, y + 12, 12, 12);
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(x + 16, y + 12, 5, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,150,150,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 6);
    ctx.lineTo(x + 14, y + 12);
    ctx.stroke();
  } else if (t === 6) {
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(x + 16, y + 12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 11, y + 18, 10, 8);
    ctx.fillStyle = '#88aaff';
    const zy = Math.sin(issue.anim * 0.06) * 3;
    ctx.font = 'bold 10px monospace';
    ctx.fillText('z', x + 22, y + 8 + zy);
  } else if (t === 7) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#D4A574';
      const kx = x + 6 + (i % 2) * 12 + Math.sin(issue.anim * 0.05 + i) * 2;
      const ky = y + 6 + Math.floor(i / 2) * 12;
      ctx.fillRect(kx, ky, 7, 3);
      ctx.fillRect(kx - 2, ky - 2, 4, 7);
    }
  } else {
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(x + 5, y + 5, 22, 22);
    ctx.fillStyle = '#33cc66';
    ctx.font = '6px monospace';
    const msgs = ['ERR', 'WARN', 'CRIT'];
    for (let i = 0; i < 3; i++) {
      ctx.fillText(msgs[(Math.floor(issue.anim / 12) + i) % 3], x + 7, y + 12 + i * 6);
    }
  }

  // Ring
  ctx.strokeStyle = `rgba(255,80,80,${pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + TILE / 2, TILE / 2 - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
}

// Draw sand clock
export function drawSandClock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ratio: number,
  sandParticles: SandParticle[]
): void {
  const w = 28, h = 44;

  // Frame
  ctx.fillStyle = DESERT.rock;
  ctx.fillRect(x, y, w, 4);
  ctx.fillRect(x, y + h - 4, w, 4);
  ctx.fillRect(x + 2, y + 4, 2, h - 8);
  ctx.fillRect(x + w - 4, y + 4, 2, h - 8);

  // Glass
  ctx.fillStyle = 'rgba(200,220,240,0.2)';
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 6);
  ctx.lineTo(x + w - 6, y + 6);
  ctx.lineTo(x + w / 2 + 1, y + h / 2);
  ctx.lineTo(x + w / 2 - 1, y + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 1, y + h / 2);
  ctx.lineTo(x + w / 2 + 1, y + h / 2);
  ctx.lineTo(x + w - 6, y + h - 6);
  ctx.lineTo(x + 6, y + h - 6);
  ctx.closePath();
  ctx.fill();

  // Sand
  const topH = Math.floor(14 * ratio);
  const botH = Math.floor(14 * (1 - ratio));

  ctx.fillStyle = DESERT.sandDark;
  if (topH > 0) {
    const topY = y + 6 + (14 - topH);
    const topW = 4 + (topH / 14) * 12;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - topW / 2, topY);
    ctx.lineTo(x + w / 2 + topW / 2, topY);
    ctx.lineTo(x + w / 2 + 1, y + 20);
    ctx.lineTo(x + w / 2 - 1, y + 20);
    ctx.closePath();
    ctx.fill();
  }
  if (botH > 0) {
    const botW = 4 + (botH / 14) * 12;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 1, y + h / 2 + 2);
    ctx.lineTo(x + w / 2 + 1, y + h / 2 + 2);
    ctx.lineTo(x + w / 2 + botW / 2, y + h - 6);
    ctx.lineTo(x + w / 2 - botW / 2, y + h - 6);
    ctx.closePath();
    ctx.fill();
  }

  // Falling sand particles
  for (const p of sandParticles) {
    ctx.fillStyle = DESERT.sandDark;
    ctx.fillRect(x + w / 2 + p.x, y + 21 + p.y * 0.7, p.size, p.size);
  }
}

// Draw minimap
export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  map: TileType[][],
  issues: Issue[],
  player: Player,
  camera: Camera
): void {
  const s = 3;
  const mw = MAP_W * s;
  const mh = MAP_H * s;
  const mx = VW - mw - 8;
  const my = VH - mh - 8;

  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);

  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const t = map[ty][tx];
      let c = DESERT.sandMid;
      if (t === T.WALL) c = '#7a8899';
      else if (t === T.DESK) c = '#6a5838';
      else if (t === T.OUTER) c = '#363c48';
      else if (t === T.POOL) c = OASIS.teal;
      else if (t === T.CACTUS) c = DESERT.cactus;
      else if (t === T.PALM) c = OASIS.tealDark;
      ctx.fillStyle = c;
      ctx.fillRect(mx + tx * s, my + ty * s, s, s);
    }
  }

  // Camera viewport indicator
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    mx + (camera.x / TILE) * s,
    my + (camera.y / TILE) * s,
    (VW / TILE) * s,
    (VH / TILE) * s
  );

  // Issues
  for (const i of issues) {
    ctx.fillStyle = i.fixed ? OASIS.teal : '#ff4444';
    ctx.fillRect(mx + i.tx * s - 1, my + i.ty * s - 1, s + 2, s + 2);
  }

  // Player
  ctx.fillStyle = OASIS.tealLight;
  ctx.fillRect(mx + (player.x / TILE) * s - 1, my + (player.y / TILE) * s - 1, s + 2, s + 2);
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
  camera: Camera,
  sandParticles: SandParticle[]
): void {
  // Top bar
  ctx.fillStyle = 'rgba(20,16,12,0.92)';
  ctx.fillRect(0, 0, VW, 50);
  ctx.strokeStyle = DESERT.rock;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, VW, 50);
  ctx.lineWidth = 1;

  // Score
  ctx.fillStyle = DESERT.sandLight;
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`Fixed: ${fixed}/${TOTAL_ISSUES}`, 12, 32);

  // Title
  ctx.fillStyle = OASIS.tealLight;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NHI FIXER', VW / 2, 32);
  ctx.textAlign = 'left';

  // Sand clock timer
  const ratio = Math.max(0, timer / GAME_TIME);
  drawSandClock(ctx, VW - 80, 3, ratio, sandParticles);

  // Timer text
  const m = Math.floor(timer / 60);
  const s = Math.floor(timer % 60);
  ctx.fillStyle = timer < 30 ? '#ff5555' : DESERT.sandLight;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${m}:${s < 10 ? '0' : ''}${s}`, VW - 85, 30);
  ctx.textAlign = 'left';

  // Flash effect
  if (flash > 0) {
    ctx.fillStyle = `rgba(94,234,212,${flash / 24})`;
    ctx.fillRect(0, 0, VW, VH);
  }

  drawMinimap(ctx, map, issues, player, camera);
}

// Draw particles
export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// Draw title screen
export function drawTitle(ctx: CanvasRenderingContext2D): void {
  const grad = ctx.createLinearGradient(0, 0, 0, VH);
  grad.addColorStop(0, '#2A1F14');
  grad.addColorStop(1, '#0E0A08');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VW, VH);

  // Checkerboard
  for (let y = 0; y < VH; y += TILE) {
    for (let x = 0; x < VW; x += TILE) {
      if ((x / TILE + y / TILE) % 2 === 0) {
        ctx.fillStyle = `rgba(60,45,30,${0.2 - (y / VH) * 0.15})`;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }

  // Cactuses
  for (let i = 0; i < 4; i++) {
    const cx = 60 + i * 160;
    const cy = VH - 50 + Math.sin(Date.now() * 0.001 + i) * 5;
    ctx.fillStyle = DESERT.cactus;
    ctx.fillRect(cx, cy - 30, 6, 35);
    ctx.fillRect(cx - 8, cy - 18, 8, 4);
    ctx.fillRect(cx - 8, cy - 24, 4, 10);
    ctx.fillRect(cx + 6, cy - 12, 8, 4);
    ctx.fillRect(cx + 10, cy - 18, 4, 10);
  }

  ctx.textAlign = 'center';

  ctx.fillStyle = OASIS.tealLight;
  ctx.font = 'bold 12px monospace';
  ctx.fillText('OASIS SECURITY', VW / 2, 50);

  ctx.fillStyle = DESERT.sandLight;
  ctx.font = 'bold 36px monospace';
  ctx.fillText('NHI FIXER', VW / 2, 95);

  ctx.fillStyle = OASIS.teal;
  ctx.font = '12px monospace';
  ctx.fillText('Identity security for the Agentic era', VW / 2, 125);

  // Character preview
  drawPerson(ctx, VW / 2 - 16, 150, {
    isPlayer: true,
    color: OASIS.teal,
    walking: true,
    frame: Math.floor(Date.now() / 300) % 2,
  });
  
  ctx.fillStyle = OASIS.tealLight;
  ctx.font = '10px monospace';
  ctx.fillText('You (with 4 arms!)', VW / 2, 210);

  ctx.fillStyle = DESERT.sandMid;
  ctx.font = '12px monospace';
  ctx.fillText('WASD / Arrows - Move', VW / 2, 255);
  ctx.fillText('SPACE - Fix nearby issues', VW / 2, 275);
  ctx.fillText(`Fix all ${TOTAL_ISSUES} NHI issues before time runs out!`, VW / 2, 310);

  if (Math.sin(Date.now() * 0.004) > 0) {
    ctx.fillStyle = OASIS.tealLight;
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Press SPACE to start', VW / 2, VH - 60);
  }

  ctx.textAlign = 'left';
}

// Draw end screen
export function drawEnd(ctx: CanvasRenderingContext2D, win: boolean, timer: number, fixed: number): void {
  const grad = ctx.createLinearGradient(0, 0, 0, VH);
  grad.addColorStop(0, win ? 'rgba(10,50,45,0.96)' : 'rgba(50,20,15,0.96)');
  grad.addColorStop(1, win ? 'rgba(5,30,25,0.96)' : 'rgba(30,10,8,0.96)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VW, VH);

  ctx.textAlign = 'center';

  if (win) {
    ctx.fillStyle = OASIS.tealLight;
    ctx.font = 'bold 32px monospace';
    ctx.fillText('ALL NHIs SECURED!', VW / 2, VH / 2 - 30);
    ctx.fillStyle = '#ddf0dd';
    ctx.font = '16px monospace';
    const e = GAME_TIME - timer;
    ctx.fillText(`Time: ${Math.floor(e / 60)}:${String(Math.floor(e % 60)).padStart(2, '0')}`, VW / 2, VH / 2 + 15);
  } else {
    ctx.fillStyle = '#ff6655';
    ctx.font = 'bold 36px monospace';
    ctx.fillText("TIME'S UP!", VW / 2, VH / 2 - 30);
    ctx.fillStyle = '#ffcccc';
    ctx.font = '16px monospace';
    ctx.fillText(`Fixed: ${fixed} / ${TOTAL_ISSUES}`, VW / 2, VH / 2 + 15);
  }

  if (Math.sin(Date.now() * 0.004) > 0) {
    ctx.fillStyle = OASIS.tealLight;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Press SPACE to continue', VW / 2, VH / 2 + 80);
  }

  ctx.textAlign = 'left';
}
