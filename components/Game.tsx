"use client";

import { useEffect, useRef, useCallback } from 'react';
import {
  TILE, MAP_W, MAP_H, VW, VH, T, WALKABLE, SPLIT_VW,
  PLAYER_SPEED, FIX_RANGE, GAME_TIME, TOTAL_ISSUES, OASIS,
} from '@/lib/constants';
import type {
  TileType, Player, NPC, Issue, Cubicle, Particle, Camera, GameScreen, Camel, GameMode, Winner,
} from '@/lib/types';
import { generateMap, createPlayer, createNPCs, createIssues, createCamels } from '@/lib/mapGenerator';
import { initAudio, sfxFix, sfxWin, sfxLose } from '@/lib/audio';
import {
  drawTile, drawCubicleLabels, drawPerson, drawIssue, drawCamel,
  drawHUD, drawParticles, drawTitle, drawEnd, drawModeSelect,
} from '@/lib/renderer';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<{
    screen: GameScreen;
    gameMode: GameMode;
    map: TileType[][];
    cubicles: Cubicle[];
    deskMap: Map<string, Issue>;
    player: Player | null;
    player2: Player | null;
    npcs: NPC[];
    issues: Issue[];
    camels: Camel[];
    particles: Particle[];
    timer: number;
    fixed: number;
    cooldown: number;
    cooldown2: number;
    tick: number;
    flash: number;
    flash2: number;
    camera: Camera;
    camera2: Camera;
    keys: Record<string, boolean>;
    lastTime: number;
    nearbyIssue: Issue | null;
    nearbyIssue2: Issue | null;
    camelBlockTimer: number;
    camelBlockTimer2: number;
    winner: Winner;
  }>({
    screen: 'title',
    gameMode: 'single',
    map: [],
    cubicles: [],
    deskMap: new Map(),
    player: null,
    player2: null,
    npcs: [],
    issues: [],
    camels: [],
    particles: [],
    timer: GAME_TIME,
    fixed: 0,
    cooldown: 0,
    cooldown2: 0,
    tick: 0,
    flash: 0,
    flash2: 0,
    camera: { x: 0, y: 0 },
    camera2: { x: 0, y: 0 },
    keys: {},
    lastTime: 0,
    nearbyIssue: null,
    nearbyIssue2: null,
    camelBlockTimer: 0,
    camelBlockTimer2: 0,
    winner: null,
  });

  const startGame = useCallback((mode: GameMode) => {
    const state = gameStateRef.current;
    state.screen = 'playing';
    state.gameMode = mode;
    state.timer = GAME_TIME;
    state.fixed = 0;
    state.cooldown = 0;
    state.cooldown2 = 0;
    state.flash = 0;
    state.flash2 = 0;
    state.tick = 0;
    state.particles = [];
    state.nearbyIssue = null;
    state.nearbyIssue2 = null;
    state.camelBlockTimer = 0;
    state.camelBlockTimer2 = 0;
    state.winner = null;

    const { map, cubicles } = generateMap();
    state.map = map;
    state.cubicles = cubicles;
    state.player = createPlayer(1);
    state.player2 = mode === 'multi' ? createPlayer(2) : null;
    state.npcs = createNPCs(cubicles);
    state.camels = createCamels(map);
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

  const updatePlayerGeneric = useCallback((
    player: Player,
    upKey: string, downKey: string, leftKey: string, rightKey: string,
    camelBlockTimer: number,
    setBlockTimer: (val: number) => void
  ): number => {
    const state = gameStateRef.current;
    
    if (camelBlockTimer > 0) {
      player.moving = false;
      player.frame = 0;
      return camelBlockTimer - 1;
    }

    for (const camel of state.camels) {
      const dist = Math.abs(player.x - camel.x) + Math.abs(player.y - camel.y);
      if (dist < TILE * 0.8) {
        return 180;
      }
    }

    let dx = 0, dy = 0;
    if (state.keys[upKey]) dy = -1;
    if (state.keys[downKey]) dy = 1;
    if (state.keys[leftKey]) dx = -1;
    if (state.keys[rightKey]) dx = 1;

    player.moving = dx !== 0 || dy !== 0;

    if (player.moving) {
      if (dy < 0) player.dir = 1;
      if (dy > 0) player.dir = 0;
      if (dx < 0) player.dir = 2;
      if (dx > 0) player.dir = 3;

      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }

      const spd = PLAYER_SPEED;
      const pad = 10;
      const nx = player.x + dx * spd;
      const ny = player.y + dy * spd;

      if (
        canWalk(nx + pad, player.y + pad) &&
        canWalk(nx + TILE - pad, player.y + pad) &&
        canWalk(nx + pad, player.y + TILE - pad) &&
        canWalk(nx + TILE - pad, player.y + TILE - pad)
      ) {
        player.x = nx;
      }

      if (
        canWalk(player.x + pad, ny + pad) &&
        canWalk(player.x + TILE - pad, ny + pad) &&
        canWalk(player.x + pad, ny + TILE - pad) &&
        canWalk(player.x + TILE - pad, ny + TILE - pad)
      ) {
        player.y = ny;
      }

      player.frameTimer++;
      if (player.frameTimer >= 7) {
        player.frameTimer = 0;
        player.frame = 1 - player.frame;
      }
    } else {
      player.frame = 0;
      player.frameTimer = 0;
    }
    
    return camelBlockTimer;
  }, [canWalk]);

  const updatePlayer = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.player) return;

    // Player 1: WASD
    state.camelBlockTimer = updatePlayerGeneric(
      state.player,
      'KeyW', 'KeyS', 'KeyA', 'KeyD',
      state.camelBlockTimer,
      (val) => { state.camelBlockTimer = val; }
    );
  }, [updatePlayerGeneric]);

  const updatePlayer2 = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.player2 || state.gameMode !== 'multi') return;

    // Player 2: Arrow keys
    state.camelBlockTimer2 = updatePlayerGeneric(
      state.player2,
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      state.camelBlockTimer2,
      (val) => { state.camelBlockTimer2 = val; }
    );
  }, [updatePlayerGeneric]);

  const updateCameraForPlayer = useCallback((player: Player, camera: Camera, viewWidth: number) => {
    camera.x = player.x + TILE / 2 - viewWidth / 2;
    camera.y = player.y + TILE / 2 - VH / 2;
    camera.x = Math.max(0, Math.min(camera.x, MAP_W * TILE - viewWidth));
    camera.y = Math.max(0, Math.min(camera.y, MAP_H * TILE - VH));
  }, []);

  const updateCamera = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.player) return;

    const viewWidth = state.gameMode === 'multi' ? SPLIT_VW : VW;
    updateCameraForPlayer(state.player, state.camera, viewWidth);
    
    if (state.player2 && state.gameMode === 'multi') {
      updateCameraForPlayer(state.player2, state.camera2, viewWidth);
    }
  }, [updateCameraForPlayer]);

  const updateCamels = useCallback(() => {
    const state = gameStateRef.current;
    
    for (const camel of state.camels) {
      camel.moveTimer++;
      camel.frame = Math.floor(state.tick / 15) % 4;
      
      if (camel.moveTimer >= 120) {
        camel.moveTimer = 0;
        
        const dirs = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
        ];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        const newTileX = camel.tileX + dir.dx;
        const newTileY = camel.tileY + dir.dy;
        
        if (
          newTileX > 1 && newTileX < MAP_W - 2 &&
          newTileY > 1 && newTileY < MAP_H - 2 &&
          WALKABLE.has(state.map[newTileY][newTileX])
        ) {
          camel.tileX = newTileX;
          camel.tileY = newTileY;
          camel.x = newTileX * TILE;
          camel.y = newTileY * TILE;
          camel.dir = dirs.indexOf(dir);
        }
      }
    }
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
        case 0:
          state.particles.push({
            x: px + 14 + Math.random() * 12, y: py + 18,
            vx: (Math.random() - 0.5) * 0.6, vy: 0.8 + Math.random() * 0.5,
            life: 14, maxLife: 14, color: '#886622', size: 2 + Math.random() * 2
          });
          break;
        case 1:
          state.particles.push({
            x: px + 8 + Math.random() * 24, y: py + 24,
            vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 2,
            life: 18 + Math.random() * 10, maxLife: 28,
            color: Math.random() > 0.4 ? '#ff4400' : '#ffaa00', size: 3 + Math.random() * 5
          });
          break;
        case 7:
          state.particles.push({
            x: px + 10 + Math.random() * 20, y: py + 4,
            vx: (Math.random() - 0.5) * 0.8, vy: 1.2 + Math.random(),
            life: 16, maxLife: 16, color: '#5588ff', size: 2 + Math.random() * 2
          });
          break;
        case 8:
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
    
    const findForPlayer = (player: Player | null): Issue | null => {
      if (!player) return null;
      const px = player.x + TILE / 2;
      const py = player.y + TILE / 2;
      let nearest: Issue | null = null;
      let best = FIX_RANGE + 1;

      for (const d of state.issues) {
        if (d.fixed) continue;
        const dx = (d.x + TILE / 2) - px;
        const dy = (d.y + TILE / 2) - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < best) {
          best = dist;
          nearest = d;
        }
      }
      return nearest;
    };

    state.nearbyIssue = findForPlayer(state.player);
    if (state.gameMode === 'multi') {
      state.nearbyIssue2 = findForPlayer(state.player2);
    }
  }, []);

  const tryFixForPlayer = useCallback((playerNum: 1 | 2) => {
    const state = gameStateRef.current;
    const player = playerNum === 1 ? state.player : state.player2;
    const cooldown = playerNum === 1 ? state.cooldown : state.cooldown2;
    
    if (cooldown > 0 || !player) return;

    const px = player.x + TILE / 2;
    const py = player.y + TILE / 2;
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
    player.fixes++;
    state.fixed++;
    
    if (playerNum === 1) {
      state.cooldown = 20;
      state.flash = 14;
    } else {
      state.cooldown2 = 20;
      state.flash2 = 14;
    }
    
    sfxFix();

    const particleColor = playerNum === 1 
      ? ['#14B8A6', '#5EEAD4', '#0D9488', '#99F6E4']
      : ['#D4A855', '#F5D89A', '#B8942A', '#FFE4A0'];

    for (let i = 0; i < 24; i++) {
      state.particles.push({
        x: best.x + TILE / 2,
        y: best.y + TILE / 2,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5 - 2,
        life: 25 + Math.random() * 25,
        maxLife: 50,
        color: particleColor[Math.floor(Math.random() * 4)],
        size: 2 + Math.random() * 4,
      });
    }

    for (const npc of state.npcs) {
      if (npc.distractionRef === best) {
        npc.state = 'working';
        npc.distractionRef = null;
        npc.happyTimer = 90;
      }
    }

    // Check win condition
    if (state.gameMode === 'multi') {
      if (player.fixes >= TOTAL_ISSUES) {
        state.winner = playerNum === 1 ? 'player1' : 'player2';
        state.screen = 'win';
        sfxWin();
      }
    } else {
      if (state.fixed >= TOTAL_ISSUES) {
        state.screen = 'win';
        sfxWin();
      }
    }
  }, []);

  const update = useCallback((dt: number) => {
    const state = gameStateRef.current;
    if (state.screen !== 'playing') return;

    state.tick++;
    state.timer -= dt;

    if (state.timer <= 0) {
      state.timer = 0;
      
      if (state.gameMode === 'multi') {
        const p1Fixes = state.player?.fixes || 0;
        const p2Fixes = state.player2?.fixes || 0;
        if (p1Fixes > p2Fixes) {
          state.winner = 'player1';
        } else if (p2Fixes > p1Fixes) {
          state.winner = 'player2';
        } else {
          state.winner = 'tie';
        }
      }
      
      state.screen = 'lose';
      sfxLose();
      return;
    }

    if (state.cooldown > 0) state.cooldown--;
    if (state.cooldown2 > 0) state.cooldown2--;
    if (state.flash > 0) state.flash--;
    if (state.flash2 > 0) state.flash2--;

    updatePlayer();
    if (state.gameMode === 'multi') {
      updatePlayer2();
    }
    updateCamera();
    updateParticles();
    updateCamels();
    spawnIssueParticles();
    findNearbyIssue();

    for (const d of state.issues) {
      if (!d.fixed) d.animFrame++;
    }

    for (const npc of state.npcs) {
      if (npc.happyTimer > 0) npc.happyTimer--;
      if (state.tick % 12 === 0) npc.frame = 1 - npc.frame;
    }
  }, [updatePlayer, updatePlayer2, updateCamera, updateParticles, updateCamels, spawnIssueParticles, findNearbyIssue]);

  const renderPlayerView = useCallback((
    ctx: CanvasRenderingContext2D,
    player: Player,
    camera: Camera,
    viewWidth: number,
    offsetX: number,
    playerNum: 1 | 2,
    nearbyIssue: Issue | null,
    flash: number,
    camelBlockTimer: number
  ) => {
    const state = gameStateRef.current;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(offsetX, 0, viewWidth, VH);
    ctx.clip();
    ctx.translate(offsetX, 0);

    // Draw visible tiles
    const sy = Math.max(0, Math.floor(camera.y / TILE));
    const ey = Math.min(MAP_H - 1, Math.ceil((camera.y + VH) / TILE));
    const sx = Math.max(0, Math.floor(camera.x / TILE));
    const ex = Math.min(MAP_W - 1, Math.ceil((camera.x + viewWidth) / TILE));

    for (let ty = sy; ty <= ey; ty++) {
      for (let tx = sx; tx <= ex; tx++) {
        drawTile(ctx, state.map, state.deskMap, tx, ty, camera);
      }
    }

    // Draw cubicle labels
    drawCubicleLabels(ctx, state.cubicles, state.deskMap, camera);

    // Draw issues
    for (const issue of state.issues) {
      drawIssue(ctx, issue, camera);
    }

    // Draw NPCs
    for (const npc of state.npcs) {
      drawPerson(ctx, npc.x, npc.y, camera, state.tick, {
        sitting: npc.state === 'working',
        typing: npc.state === 'working',
        shirtColor: npc.shirtColor,
        hairColor: npc.hairColor,
        frame: npc.frame,
        happyTimer: npc.happyTimer,
        distracted: npc.state === 'distracted'
      });
    }

    // Draw camels
    for (const camel of state.camels) {
      drawCamel(ctx, camel, camera, state.tick);
    }

    // Show "Playing with camel!" message if blocked
    if (camelBlockTimer > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(viewWidth / 2 - 90, 80, 180, 30);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🐪 Playing with camel! 🐪', viewWidth / 2, 100);
      ctx.textAlign = 'left';
    }

    // Player glow
    const pgx = player.x - camera.x + TILE / 2;
    const pgy = player.y - camera.y + TILE / 2 + 8;
    const glowR = 20 + Math.sin(state.tick * 0.08) * 3;
    const glowColor = playerNum === 1 ? 'rgba(20,184,166,0.15)' : 'rgba(212,168,85,0.15)';
    const strokeColor = playerNum === 1 ? 'rgba(94,234,212,0.5)' : 'rgba(245,216,154,0.5)';
    
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(pgx, pgy, glowR + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pgx, pgy, glowR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Draw player
    drawPerson(ctx, player.x, player.y, camera, state.tick, {
      isPlayer: true,
      shirtColor: player.shirtColor,
      hairColor: playerNum === 1 ? '#443311' : '#664422',
      walking: player.moving,
      frame: player.frame
    });

    // Draw particles
    drawParticles(ctx, state.particles, camera);

    ctx.restore();
  }, []);

  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameStateRef.current;
    ctx.clearRect(0, 0, VW, VH);

    if (state.screen === 'title') {
      drawTitle(ctx, state.tick);
      return;
    }

    if (state.screen === 'modeSelect') {
      drawModeSelect(ctx, state.tick);
      return;
    }

    if (!state.player) return;

    if (state.gameMode === 'multi' && state.player2) {
      // Split-screen rendering
      renderPlayerView(ctx, state.player, state.camera, SPLIT_VW, 0, 1, state.nearbyIssue, state.flash, state.camelBlockTimer);
      renderPlayerView(ctx, state.player2, state.camera2, SPLIT_VW, SPLIT_VW, 2, state.nearbyIssue2, state.flash2, state.camelBlockTimer2);
      
      // Divider line
      ctx.fillStyle = '#333';
      ctx.fillRect(SPLIT_VW - 2, 0, 4, VH);
      
      // Shared timer at top center
      ctx.fillStyle = OASIS.navy + 'e0';
      ctx.fillRect(VW / 2 - 60, 5, 120, 40);
      ctx.strokeStyle = OASIS.teal;
      ctx.strokeRect(VW / 2 - 60, 5, 120, 40);
      
      const mins = Math.floor(state.timer / 60);
      const secs = Math.floor(state.timer % 60);
      const ts = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      ctx.fillStyle = state.timer < 15 ? '#ff5555' : OASIS.tealLight;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ts, VW / 2, 33);
      ctx.textAlign = 'left';
      
      // Player 1 score (left)
      ctx.fillStyle = OASIS.navy + 'e0';
      ctx.fillRect(10, 5, 100, 40);
      ctx.strokeStyle = OASIS.teal;
      ctx.strokeRect(10, 5, 100, 40);
      ctx.fillStyle = OASIS.tealLight;
      ctx.font = 'bold 11px monospace';
      ctx.fillText('P1', 20, 22);
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${state.player.fixes}/${TOTAL_ISSUES}`, 20, 40);
      
      // Player 2 score (right)
      ctx.fillStyle = OASIS.navy + 'e0';
      ctx.fillRect(VW - 110, 5, 100, 40);
      ctx.strokeStyle = OASIS.gold;
      ctx.strokeRect(VW - 110, 5, 100, 40);
      ctx.fillStyle = OASIS.gold;
      ctx.font = 'bold 11px monospace';
      ctx.fillText('P2', VW - 100, 22);
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${state.player2.fixes}/${TOTAL_ISSUES}`, VW - 100, 40);
      
    } else {
      // Single player rendering
      renderPlayerView(ctx, state.player, state.camera, VW, 0, 1, state.nearbyIssue, state.flash, state.camelBlockTimer);
      
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
    }

    // Draw end screens
    if (state.screen === 'win' || state.screen === 'lose') {
      drawEnd(
        ctx, 
        state.screen === 'win', 
        state.timer, 
        state.fixed,
        state.gameMode,
        state.winner,
        state.player?.fixes || 0,
        state.player2?.fixes || 0
      );
    }
  }, [renderPlayerView]);

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

      // Title screen -> mode select
      if (state.screen === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        initAudio();
        state.screen = 'modeSelect';
      }

      // Mode select -> start game
      if (state.screen === 'modeSelect') {
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          startGame('single');
        }
        if (e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          startGame('multi');
        }
        if (e.code === 'Escape') {
          e.preventDefault();
          state.screen = 'title';
        }
      }

      // End screen -> title
      if ((state.screen === 'win' || state.screen === 'lose') && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        state.screen = 'title';
        state.camera = { x: 0, y: 0 };
        state.camera2 = { x: 0, y: 0 };
      }

      // Player 1 fix: E or Space
      if (state.screen === 'playing' && (e.code === 'Space' || e.code === 'KeyE')) {
        e.preventDefault();
        tryFixForPlayer(1);
      }

      // Player 2 fix: Enter or Shift (multiplayer only)
      if (state.screen === 'playing' && state.gameMode === 'multi' && (e.code === 'Enter' || e.code === 'ShiftRight' || e.code === 'ShiftLeft')) {
        e.preventDefault();
        tryFixForPlayer(2);
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
  }, [startGame, tryFixForPlayer]);

  return (
    <canvas
      ref={canvasRef}
      width={VW}
      height={VH}
      className="game-canvas"
    />
  );
}
