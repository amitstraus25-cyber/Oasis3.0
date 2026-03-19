"use client";

import { useEffect, useRef, useCallback } from 'react';
import {
  TILE, MAP_W, MAP_H, VW, VH, T, WALKABLE,
  PLAYER_SPEED, FIX_RANGE, GAME_TIME, TOTAL_ISSUES,
} from '@/lib/constants';
import type {
  TileType, Player, NPC, Issue, Cubicle, Particle, Camera, GameScreen,
} from '@/lib/types';
import { generateMap, createPlayer, createNPCs, createIssues } from '@/lib/mapGenerator';
import { initAudio, sfxFix, sfxWin, sfxLose } from '@/lib/audio';
import {
  drawTile, drawCubicleLabels, drawPerson, drawIssue,
  drawHUD, drawParticles, drawTitle, drawEnd,
} from '@/lib/renderer';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<{
    screen: GameScreen;
    map: TileType[][];
    cubicles: Cubicle[];
    deskMap: Map<string, Issue>;
    player: Player | null;
    npcs: NPC[];
    issues: Issue[];
    particles: Particle[];
    timer: number;
    fixed: number;
    cooldown: number;
    tick: number;
    flash: number;
    camera: Camera;
    keys: Record<string, boolean>;
    lastTime: number;
    nearbyIssue: Issue | null;
  }>({
    screen: 'title',
    map: [],
    cubicles: [],
    deskMap: new Map(),
    player: null,
    npcs: [],
    issues: [],
    particles: [],
    timer: GAME_TIME,
    fixed: 0,
    cooldown: 0,
    tick: 0,
    flash: 0,
    camera: { x: 0, y: 0 },
    keys: {},
    lastTime: 0,
    nearbyIssue: null,
  });

  const startGame = useCallback(() => {
    const state = gameStateRef.current;
    state.screen = 'playing';
    state.timer = GAME_TIME;
    state.fixed = 0;
    state.cooldown = 0;
    state.flash = 0;
    state.tick = 0;
    state.particles = [];
    state.nearbyIssue = null;

    const { map, cubicles } = generateMap();
    state.map = map;
    state.cubicles = cubicles;
    state.player = createPlayer();
    state.npcs = createNPCs(cubicles);
    const { issues, deskMap } = createIssues(cubicles, state.npcs);
    state.issues = issues;
    state.deskMap = deskMap;
  }, []);

  const canWalk = useCallback((px: number, py: number): boolean => {
    const state = gameStateRef.current;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
    return WALKABLE.has(state.map[ty][tx]);
  }, []);

  const updatePlayer = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.player) return;

    let dx = 0, dy = 0;
    if (state.keys['ArrowUp'] || state.keys['KeyW']) dy = -1;
    if (state.keys['ArrowDown'] || state.keys['KeyS']) dy = 1;
    if (state.keys['ArrowLeft'] || state.keys['KeyA']) dx = -1;
    if (state.keys['ArrowRight'] || state.keys['KeyD']) dx = 1;

    state.player.moving = dx !== 0 || dy !== 0;

    if (state.player.moving) {
      if (dy < 0) state.player.dir = 1;
      if (dy > 0) state.player.dir = 0;
      if (dx < 0) state.player.dir = 2;
      if (dx > 0) state.player.dir = 3;

      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }

      const spd = PLAYER_SPEED;
      const pad = 10;
      const nx = state.player.x + dx * spd;
      const ny = state.player.y + dy * spd;

      if (
        canWalk(nx + pad, state.player.y + pad) &&
        canWalk(nx + TILE - pad, state.player.y + pad) &&
        canWalk(nx + pad, state.player.y + TILE - pad) &&
        canWalk(nx + TILE - pad, state.player.y + TILE - pad)
      ) {
        state.player.x = nx;
      }

      if (
        canWalk(state.player.x + pad, ny + pad) &&
        canWalk(state.player.x + TILE - pad, ny + pad) &&
        canWalk(state.player.x + pad, ny + TILE - pad) &&
        canWalk(state.player.x + TILE - pad, ny + TILE - pad)
      ) {
        state.player.y = ny;
      }

      state.player.frameTimer++;
      if (state.player.frameTimer >= 7) {
        state.player.frameTimer = 0;
        state.player.frame = 1 - state.player.frame;
      }
    } else {
      state.player.frame = 0;
      state.player.frameTimer = 0;
    }
  }, [canWalk]);

  const updateCamera = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.player) return;

    state.camera.x = state.player.x + TILE / 2 - VW / 2;
    state.camera.y = state.player.y + TILE / 2 - VH / 2;
    state.camera.x = Math.max(0, Math.min(state.camera.x, MAP_W * TILE - VW));
    state.camera.y = Math.max(0, Math.min(state.camera.y, MAP_H * TILE - VH));
  }, []);

  const updateParticles = useCallback(() => {
    const state = gameStateRef.current;

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life--;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }, []);

  const spawnIssueParticles = useCallback(() => {
    const state = gameStateRef.current;

    for (const d of state.issues) {
      if (d.fixed) continue;
      const rate = d.type === 1 ? 3 : 7;
      if (state.tick % rate !== 0) continue;
      const px = d.x, py = d.y;

      switch (d.type) {
        case 0: // Coffee drip
          state.particles.push({
            x: px + 14 + Math.random() * 12, y: py + 18,
            vx: (Math.random() - 0.5) * 0.6, vy: 0.8 + Math.random() * 0.5,
            life: 14, maxLife: 14, color: '#886622', size: 2 + Math.random() * 2
          });
          break;
        case 1: // Fire
          state.particles.push({
            x: px + 8 + Math.random() * 24, y: py + 24,
            vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 2,
            life: 18 + Math.random() * 10, maxLife: 28,
            color: Math.random() > 0.4 ? '#ff4400' : '#ffaa00', size: 3 + Math.random() * 5
          });
          break;
        case 7: // Keys falling
          state.particles.push({
            x: px + 10 + Math.random() * 20, y: py + 4,
            vx: (Math.random() - 0.5) * 0.8, vy: 1.2 + Math.random(),
            life: 16, maxLife: 16, color: '#5588ff', size: 2 + Math.random() * 2
          });
          break;
        case 8: // Log particles
          if (state.tick % 5 === 0) {
            state.particles.push({
              x: px + 6 + Math.random() * 28, y: py + 2,
              vx: (Math.random() - 0.5) * 2, vy: -1.5 - Math.random(),
              life: 22, maxLife: 22, color: '#44ff88', size: 2
            });
          }
          break;
      }
    }
  }, []);

  const findNearbyIssue = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.player) return;

    const px = state.player.x + TILE / 2;
    const py = state.player.y + TILE / 2;
    state.nearbyIssue = null;
    let best = FIX_RANGE + 1;

    for (const d of state.issues) {
      if (d.fixed) continue;
      const dx = (d.x + TILE / 2) - px;
      const dy = (d.y + TILE / 2) - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < best) {
        best = dist;
        state.nearbyIssue = d;
      }
    }
  }, []);

  const tryFix = useCallback(() => {
    const state = gameStateRef.current;
    if (state.cooldown > 0 || !state.player) return;

    const px = state.player.x + TILE / 2;
    const py = state.player.y + TILE / 2;
    let best: Issue | null = null;
    let bestDist = FIX_RANGE + 1;

    for (const issue of state.issues) {
      if (issue.fixed) continue;
      const dx = (issue.x + TILE / 2) - px;
      const dy = (issue.y + TILE / 2) - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        best = issue;
        bestDist = dist;
      }
    }

    if (!best) return;

    best.fixed = true;
    state.fixed++;
    state.cooldown = 20;
    state.flash = 14;
    sfxFix();

    // Spawn fix particles
    for (let i = 0; i < 24; i++) {
      state.particles.push({
        x: best.x + TILE / 2,
        y: best.y + TILE / 2,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5 - 2,
        life: 25 + Math.random() * 25,
        maxLife: 50,
        color: ['#44ffaa', '#aaffee', '#ffffff', '#88ff44'][Math.floor(Math.random() * 4)],
        size: 2 + Math.random() * 4,
      });
    }

    // Update NPCs
    for (const npc of state.npcs) {
      if (npc.distractionRef === best) {
        npc.state = 'working';
        npc.distractionRef = null;
        npc.happyTimer = 90;
      }
    }

    if (state.fixed >= TOTAL_ISSUES) {
      state.screen = 'win';
      sfxWin();
    }
  }, []);

  const update = useCallback((dt: number) => {
    const state = gameStateRef.current;
    if (state.screen !== 'playing') return;

    state.tick++;
    state.timer -= dt;

    if (state.timer <= 0) {
      state.timer = 0;
      state.screen = 'lose';
      sfxLose();
      return;
    }

    if (state.cooldown > 0) state.cooldown--;
    if (state.flash > 0) state.flash--;

    updatePlayer();
    updateCamera();
    updateParticles();
    spawnIssueParticles();
    findNearbyIssue();

    for (const d of state.issues) {
      if (!d.fixed) d.animFrame++;
    }

    for (const npc of state.npcs) {
      if (npc.happyTimer > 0) npc.happyTimer--;
      if (state.tick % 12 === 0) npc.frame = 1 - npc.frame;
    }
  }, [updatePlayer, updateCamera, updateParticles, spawnIssueParticles, findNearbyIssue]);

  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameStateRef.current;
    ctx.clearRect(0, 0, VW, VH);

    if (state.screen === 'title') {
      drawTitle(ctx, state.tick);
      return;
    }

    if (!state.player) return;

    // Draw visible tiles
    const sy = Math.max(0, Math.floor(state.camera.y / TILE));
    const ey = Math.min(MAP_H - 1, Math.ceil((state.camera.y + VH) / TILE));
    const sx = Math.max(0, Math.floor(state.camera.x / TILE));
    const ex = Math.min(MAP_W - 1, Math.ceil((state.camera.x + VW) / TILE));

    for (let ty = sy; ty <= ey; ty++) {
      for (let tx = sx; tx <= ex; tx++) {
        drawTile(ctx, state.map, state.deskMap, tx, ty, state.camera);
      }
    }

    // Draw cubicle labels
    drawCubicleLabels(ctx, state.cubicles, state.deskMap, state.camera);

    // Draw issues
    for (const issue of state.issues) {
      drawIssue(ctx, issue, state.camera);
    }

    // Draw NPCs
    for (const npc of state.npcs) {
      drawPerson(ctx, npc.x, npc.y, state.camera, state.tick, {
        sitting: npc.state === 'working',
        typing: npc.state === 'working',
        shirtColor: npc.shirtColor,
        hairColor: npc.hairColor,
        frame: npc.frame,
        happyTimer: npc.happyTimer,
        distracted: npc.state === 'distracted'
      });
    }

    // Player glow
    const pgx = state.player.x - state.camera.x + TILE / 2;
    const pgy = state.player.y - state.camera.y + TILE / 2 + 8;
    const glowR = 20 + Math.sin(state.tick * 0.08) * 3;
    ctx.fillStyle = 'rgba(0,255,170,0.15)';
    ctx.beginPath();
    ctx.arc(pgx, pgy, glowR + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,255,170,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pgx, pgy, glowR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Draw player
    drawPerson(ctx, state.player.x, state.player.y, state.camera, state.tick, {
      isPlayer: true,
      shirtColor: '#00aaaa',
      hairColor: '#443311',
      walking: state.player.moving,
      frame: state.player.frame
    });

    // Draw particles
    drawParticles(ctx, state.particles, state.camera);

    // Draw HUD
    drawHUD(
      ctx,
      state.timer,
      state.fixed,
      state.flash,
      state.map,
      state.issues,
      state.player,
      state.nearbyIssue,
      state.tick
    );

    // Draw end screens
    if (state.screen === 'win') {
      drawEnd(ctx, true, state.timer, state.fixed);
    }
    if (state.screen === 'lose') {
      drawEnd(ctx, false, state.timer, state.fixed);
    }
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    gameStateRef.current.lastTime = performance.now();

    let animationId: number;

    const loop = (ts: number) => {
      const state = gameStateRef.current;
      const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
      state.lastTime = ts;

      update(dt);
      render(ctx);

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [update, render]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      state.keys[e.code] = true;

      if (state.screen === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        initAudio();
        startGame();
      }

      if ((state.screen === 'win' || state.screen === 'lose') && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        state.screen = 'title';
        state.camera = { x: 0, y: 0 };
      }

      if (state.screen === 'playing' && e.code === 'Space') {
        e.preventDefault();
        tryFix();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameStateRef.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startGame, tryFix]);

  return (
    <canvas
      ref={canvasRef}
      width={VW}
      height={VH}
      className="game-canvas"
    />
  );
}
