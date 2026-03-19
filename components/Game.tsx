"use client";

import { useEffect, useRef, useCallback } from 'react';
import {
  TILE, MAP_W, MAP_H, VW, VH, T, WALKABLE,
  PLAYER_SPEED, FIX_RANGE, GAME_TIME, TOTAL_ISSUES, OASIS,
} from '@/lib/constants';
import type {
  TileType, Player, NPC, Issue, Desk, Particle, SandParticle,
  Camera, GameScreen,
} from '@/lib/types';
import { generateMap, createPlayer, createNPCs, createIssues } from '@/lib/mapGenerator';
import { initAudio, sfxFix, sfxWin, sfxLose } from '@/lib/audio';
import {
  drawTile, drawPerson, drawDeskLabel, drawIssue,
  drawHUD, drawParticles, drawTitle, drawEnd,
} from '@/lib/renderer';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<{
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
    lastTime: number;
  }>({
    screen: 'title',
    map: [],
    desks: [],
    player: null,
    npcs: [],
    issues: [],
    particles: [],
    sandParticles: [],
    timer: GAME_TIME,
    fixed: 0,
    cooldown: 0,
    tick: 0,
    flash: 0,
    camera: { x: 0, y: 0 },
    keys: {},
    lastTime: 0,
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
    state.sandParticles = [];

    const { map, desks } = generateMap();
    state.map = map;
    state.desks = desks;
    state.player = createPlayer(map);
    state.npcs = createNPCs(desks);
    state.issues = createIssues(desks);

    // Initialize camera
    if (state.player) {
      state.camera.x = state.player.x + TILE / 2 - VW / 2;
      state.camera.y = state.player.y + TILE / 2 - VH / 2;
      state.camera.x = Math.max(0, Math.min(MAP_W * TILE - VW, state.camera.x));
      state.camera.y = Math.max(0, Math.min(MAP_H * TILE - VH, state.camera.y));
    }
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
      const pad = 5;
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

      state.player.timer++;
      if (state.player.timer >= 8) {
        state.player.timer = 0;
        state.player.frame = 1 - state.player.frame;
      }
    } else {
      state.player.frame = 0;
      state.player.timer = 0;
    }
  }, [canWalk]);

  const updateCamera = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.player) return;

    const targetX = state.player.x + TILE / 2 - VW / 2;
    const targetY = state.player.y + TILE / 2 - VH / 2;

    state.camera.x += (targetX - state.camera.x) * 0.1;
    state.camera.y += (targetY - state.camera.y) * 0.1;

    const maxX = MAP_W * TILE - VW;
    const maxY = MAP_H * TILE - VH;
    state.camera.x = Math.max(0, Math.min(maxX, state.camera.x));
    state.camera.y = Math.max(0, Math.min(maxY, state.camera.y));
  }, []);

  const updateParticles = useCallback(() => {
    const state = gameStateRef.current;

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life--;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    for (let i = state.sandParticles.length - 1; i >= 0; i--) {
      const p = state.sandParticles[i];
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) state.sandParticles.splice(i, 1);
    }

    if (state.tick % 4 === 0 && state.timer > 0) {
      state.sandParticles.push({
        x: Math.random() * 6 - 3,
        y: 0,
        vy: 0.6 + Math.random() * 0.3,
        life: 25,
        size: 1.5,
      });
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
      const dist = Math.sqrt(
        (issue.x + TILE / 2 - px) ** 2 + (issue.y + TILE / 2 - py) ** 2
      );
      if (dist < bestDist) {
        best = issue;
        bestDist = dist;
      }
    }

    if (!best) return;

    best.fixed = true;
    best.desk.hasIssue = false;
    state.fixed++;
    state.cooldown = 15;
    state.flash = 12;
    sfxFix();

    for (let i = 0; i < 15; i++) {
      state.particles.push({
        x: best.x + TILE / 2,
        y: best.y + TILE / 2,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5 - 2,
        life: 25 + Math.random() * 20,
        color: [OASIS.teal, OASIS.tealLight, '#99F6E4'][Math.floor(Math.random() * 3)],
        size: 3 + Math.random() * 4,
      });
    }

    for (const npc of state.npcs) {
      if (npc.desk === best.desk) npc.happy = 60;
    }

    if (state.fixed >= TOTAL_ISSUES) {
      state.screen = 'win';
      sfxWin();
    }
  }, []);

  const update = useCallback((dt: number) => {
    const state = gameStateRef.current;
    state.tick++;

    if (state.screen !== 'playing') return;

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

    for (const issue of state.issues) {
      if (!issue.fixed) issue.anim++;
    }

    for (const npc of state.npcs) {
      if (npc.happy > 0) npc.happy--;
      if (state.tick % 15 === 0) npc.frame = 1 - npc.frame;
    }
  }, [updatePlayer, updateCamera, updateParticles]);

  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameStateRef.current;
    ctx.clearRect(0, 0, VW, VH);

    if (state.screen === 'title') {
      drawTitle(ctx);
      return;
    }

    if (!state.player) return;

    // Apply camera transform
    ctx.save();
    ctx.translate(-Math.round(state.camera.x), -Math.round(state.camera.y));

    // Draw visible tiles
    const startTX = Math.max(0, Math.floor(state.camera.x / TILE));
    const startTY = Math.max(0, Math.floor(state.camera.y / TILE));
    const endTX = Math.min(MAP_W, Math.ceil((state.camera.x + VW) / TILE) + 1);
    const endTY = Math.min(MAP_H, Math.ceil((state.camera.y + VH) / TILE) + 1);

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        drawTile(ctx, state.map, state.desks, tx, ty);
      }
    }

    // Draw issues
    for (const issue of state.issues) {
      drawIssue(ctx, issue);
    }

    // Draw NPCs with labels
    for (const npc of state.npcs) {
      drawPerson(ctx, npc.x, npc.y, {
        color: npc.color,
        frame: npc.frame,
        happy: npc.happy,
      });
      drawDeskLabel(ctx, npc, state.issues);
    }

    // Player glow
    ctx.fillStyle = 'rgba(20,184,166,0.2)';
    ctx.beginPath();
    ctx.arc(state.player.x + TILE / 2, state.player.y + TILE / 2, 22, 0, Math.PI * 2);
    ctx.fill();

    // Draw player
    drawPerson(ctx, state.player.x, state.player.y, {
      isPlayer: true,
      color: OASIS.teal,
      walking: state.player.moving,
      frame: state.player.frame,
    });

    // Draw particles
    drawParticles(ctx, state.particles);

    ctx.restore();

    // Draw HUD (screen space)
    drawHUD(
      ctx,
      state.timer,
      state.fixed,
      state.flash,
      state.map,
      state.issues,
      state.player,
      state.camera,
      state.sandParticles
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
