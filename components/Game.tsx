"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  TILE, MAP_W, MAP_H, VW, VH, T, WALKABLE, SPLIT_VW,
  PLAYER_SPEED, FIX_RANGE, GAME_TIME, TOTAL_ISSUES, OASIS,
  DECOY_FREEZE_FRAMES, DECOY_MESSAGES, DANCER_FREEZE_FRAMES,
  CARPET_COOLDOWN,
} from '@/lib/constants';
import type {
  TileType, Player, NPC, Issue, Cubicle, Particle, Camera, GameScreen, Camel, BellyDancer, GameMode, Winner,
} from '@/lib/types';
import { generateMap, createPlayer, createNPCs, createIssues, createCamels, createBellyDancers } from '@/lib/mapGenerator';
import { initAudio, sfxFix, sfxWin, sfxLose, sfxTeleport, startMusic, stopMusic, toggleMusic } from '@/lib/audio';
import {
  drawTile, drawCubicleLabels, drawPerson, drawIssue, drawCamel, drawBellyDancer,
  drawHUD, drawParticles, drawTitle, drawEnd, drawModeSelect, drawMinimap, drawScoreboard,
} from '@/lib/renderer';
import { fetchScores, submitScore } from '@/lib/scoreboard';
import type { ScoreEntry } from '@/lib/types';

interface GameProps {
  isMobile?: boolean;
}

export default function Game({ isMobile = false }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const joystickRef = useRef<{ active: boolean; dx: number; dy: number }>({ active: false, dx: 0, dy: 0 });
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const [mobileControlsVisible, setMobileControlsVisible] = useState(false);
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
    dancers: BellyDancer[];
    dancerFreeze: number;
    dancerFreeze2: number;
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
    coffeeBoost: number;
    coffeeBoost2: number;
    coolerCooldowns: Map<string, number>;
    carpetCooldowns: Map<string, number>;
    decoyFreeze: number;
    decoyFreeze2: number;
    decoyMessage: string;
    decoyMessage2: string;
    winner: Winner;
    scores: ScoreEntry[];
    playerName: string;
    enteringName: boolean;
    scoreSubmitted: boolean;
    modeSelectChoice: GameMode;
    musicMuted: boolean;
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
    dancers: [],
    dancerFreeze: 0,
    dancerFreeze2: 0,
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
    coffeeBoost: 0,
    coffeeBoost2: 0,
    coolerCooldowns: new Map(),
    carpetCooldowns: new Map(),
    decoyFreeze: 0,
    decoyFreeze2: 0,
    decoyMessage: '',
    decoyMessage2: '',
    winner: null,
    scores: [],
    playerName: '',
    enteringName: false,
    scoreSubmitted: false,
    modeSelectChoice: 'single',
    musicMuted: false,
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
    state.coffeeBoost = 0;
    state.coffeeBoost2 = 0;
    state.coolerCooldowns = new Map();
    state.carpetCooldowns = new Map();
    state.decoyFreeze = 0;
    state.decoyFreeze2 = 0;
    state.decoyMessage = '';
    state.decoyMessage2 = '';
    state.winner = null;

    const { map, cubicles } = generateMap();
    state.map = map;
    state.cubicles = cubicles;
    state.player = createPlayer(1);
    state.player2 = mode === 'multi' ? createPlayer(2) : null;
    state.npcs = createNPCs(cubicles);
    state.camels = createCamels(map);
    state.dancers = createBellyDancers(map);
    state.dancerFreeze = 0;
    state.dancerFreeze2 = 0;
    const { issues, deskMap } = createIssues(cubicles, state.npcs);
    state.issues = issues;
    state.deskMap = deskMap;

    startMusic();
    if (isMobile) setMobileControlsVisible(true);
  }, [isMobile]);

  const canWalk = useCallback((px: number, py: number): boolean => {
    const state = gameStateRef.current;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
    return WALKABLE.has(state.map[ty][tx]);
  }, []);

  const checkCoffeePickup = useCallback((player: Player, playerNum: 1 | 2) => {
    const state = gameStateRef.current;
    const boostKey = playerNum === 1 ? 'coffeeBoost' : 'coffeeBoost2';
    if (state[boostKey] > 0) return; // Already boosted

    const ptx = Math.floor((player.x + TILE / 2) / TILE);
    const pty = Math.floor((player.y + TILE / 2) / TILE);

    // Check adjacent tiles for cooler
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = ptx + dx;
        const cy = pty + dy;
        if (cx < 0 || cy < 0 || cx >= MAP_W || cy >= MAP_H) continue;
        if (state.map[cy][cx] !== T.COOLER) continue;

        const coolerKey = `${cx},${cy}`;
        const cooldown = state.coolerCooldowns.get(coolerKey) || 0;
        if (cooldown > 0) continue;

        // Activate boost! 360 frames = ~6 seconds
        state[boostKey] = 360;
        state.coolerCooldowns.set(coolerKey, 600); // 10s cooldown on this cooler

        // Coffee particles
        for (let i = 0; i < 16; i++) {
          state.particles.push({
            x: cx * TILE + TILE / 2,
            y: cy * TILE + TILE / 2,
            vx: (Math.random() - 0.5) * 4,
            vy: -2 - Math.random() * 3,
            life: 20 + Math.random() * 15,
            maxLife: 35,
            color: ['#8B4513', '#D2691E', '#F5DEB3', '#FFD700'][Math.floor(Math.random() * 4)],
            size: 2 + Math.random() * 3,
          });
        }
        return;
      }
    }
  }, []);

  const checkCarpetTeleport = useCallback((player: Player, playerNum: 1 | 2) => {
    const state = gameStateRef.current;

    const ptx = Math.floor((player.x + TILE / 2) / TILE);
    const pty = Math.floor((player.y + TILE / 2) / TILE);

    if (ptx < 0 || pty < 0 || ptx >= MAP_W || pty >= MAP_H) return;
    if (state.map[pty][ptx] !== T.CARPET) return;

    const carpetKey = `${ptx},${pty}`;
    const cooldown = state.carpetCooldowns.get(carpetKey) || 0;
    if (cooldown > 0) return;

    // Find nearest unfixed non-decoy issue
    let best: Issue | null = null;
    let bestDist = Infinity;
    for (const issue of state.issues) {
      if (issue.fixed || issue.decoy) continue;
      const dx = issue.x - player.x;
      const dy = issue.y - player.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = issue;
      }
    }
    if (!best) return;

    // Spawn departure particles
    for (let i = 0; i < 14; i++) {
      state.particles.push({
        x: player.x + TILE / 2,
        y: player.y + TILE / 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 25 + Math.random() * 15,
        maxLife: 40,
        color: ['#7c5cfc', '#5EEAD4', '#DAA520', '#a78bfa'][Math.floor(Math.random() * 4)],
        size: 2 + Math.random() * 3,
      });
    }

    // Teleport
    player.x = best.x;
    player.y = best.y;

    // Spawn arrival particles
    for (let i = 0; i < 14; i++) {
      state.particles.push({
        x: best.x + TILE / 2,
        y: best.y + TILE / 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 25 + Math.random() * 15,
        maxLife: 40,
        color: ['#7c5cfc', '#5EEAD4', '#DAA520', '#a78bfa'][Math.floor(Math.random() * 4)],
        size: 2 + Math.random() * 3,
      });
    }

    state.carpetCooldowns.set(carpetKey, CARPET_COOLDOWN);
    sfxTeleport();
  }, []);

  const updatePlayerGeneric = useCallback((
    player: Player,
    upKey: string, downKey: string, leftKey: string, rightKey: string,
    camelBlockTimer: number,
    setBlockTimer: (val: number) => void,
    isBoosted: boolean,
    altUp?: string, altDown?: string, altLeft?: string, altRight?: string
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
        return 300;
      }
    }

    let dx = 0, dy = 0;
    if (state.keys[upKey] || (altUp && state.keys[altUp])) dy = -1;
    if (state.keys[downKey] || (altDown && state.keys[altDown])) dy = 1;
    if (state.keys[leftKey] || (altLeft && state.keys[altLeft])) dx = -1;
    if (state.keys[rightKey] || (altRight && state.keys[altRight])) dx = 1;

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

      const spd = isBoosted ? PLAYER_SPEED * 1.8 : PLAYER_SPEED;
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

      const animSpeed = isBoosted ? 4 : 7;
      player.frameTimer++;
      if (player.frameTimer >= animSpeed) {
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

    // Frozen by decoy NHI or belly dancer
    if (state.decoyFreeze > 0 || state.dancerFreeze > 0) {
      state.player.moving = false;
      state.player.frame = 0;
      return;
    }

    // Check dancer collision
    for (const dancer of state.dancers) {
      const dist = Math.abs(state.player.x - dancer.x) + Math.abs(state.player.y - dancer.y);
      if (dist < TILE * 0.8) {
        state.dancerFreeze = DANCER_FREEZE_FRAMES;
        return;
      }
    }

    checkCoffeePickup(state.player, 1);
    checkCarpetTeleport(state.player, 1);

    const singleMode = state.gameMode === 'single';
    state.camelBlockTimer = updatePlayerGeneric(
      state.player,
      'KeyW', 'KeyS', 'KeyA', 'KeyD',
      state.camelBlockTimer,
      (val) => { state.camelBlockTimer = val; },
      state.coffeeBoost > 0,
      singleMode ? 'ArrowUp' : undefined,
      singleMode ? 'ArrowDown' : undefined,
      singleMode ? 'ArrowLeft' : undefined,
      singleMode ? 'ArrowRight' : undefined
    );

    // Spawn speed trail particles when boosted and moving
    if (state.coffeeBoost > 0 && state.player.moving && state.tick % 3 === 0) {
      state.particles.push({
        x: state.player.x + TILE / 2 + (Math.random() - 0.5) * 10,
        y: state.player.y + TILE + 4,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.5 - Math.random() * 0.5,
        life: 12, maxLife: 12,
        color: Math.random() > 0.5 ? '#D2691E' : '#FFD700',
        size: 2 + Math.random() * 2,
      });
    }
  }, [updatePlayerGeneric, checkCoffeePickup, checkCarpetTeleport]);

  const updatePlayer2 = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.player2 || state.gameMode !== 'multi') return;

    if (state.decoyFreeze2 > 0 || state.dancerFreeze2 > 0) {
      state.player2.moving = false;
      state.player2.frame = 0;
      return;
    }

    for (const dancer of state.dancers) {
      const dist = Math.abs(state.player2.x - dancer.x) + Math.abs(state.player2.y - dancer.y);
      if (dist < TILE * 0.8) {
        state.dancerFreeze2 = DANCER_FREEZE_FRAMES;
        return;
      }
    }

    checkCoffeePickup(state.player2, 2);
    checkCarpetTeleport(state.player2, 2);

    state.camelBlockTimer2 = updatePlayerGeneric(
      state.player2,
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      state.camelBlockTimer2,
      (val) => { state.camelBlockTimer2 = val; },
      state.coffeeBoost2 > 0
    );

    if (state.coffeeBoost2 > 0 && state.player2.moving && state.tick % 3 === 0) {
      state.particles.push({
        x: state.player2.x + TILE / 2 + (Math.random() - 0.5) * 10,
        y: state.player2.y + TILE + 4,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.5 - Math.random() * 0.5,
        life: 12, maxLife: 12,
        color: Math.random() > 0.5 ? '#D2691E' : '#FFD700',
        size: 2 + Math.random() * 2,
      });
    }
  }, [updatePlayerGeneric, checkCoffeePickup, checkCarpetTeleport]);

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

  const updateDancers = useCallback(() => {
    const state = gameStateRef.current;
    for (const dancer of state.dancers) {
      dancer.moveTimer++;
      dancer.frame = Math.floor(state.tick / 12) % 4;
      if (dancer.moveTimer >= 150) {
        dancer.moveTimer = 0;
        const dirs = [
          { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
          { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        ];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        const nx = dancer.tileX + dir.dx;
        const ny = dancer.tileY + dir.dy;
        if (nx > 1 && nx < MAP_W - 2 && ny > 1 && ny < MAP_H - 2 && WALKABLE.has(state.map[ny][nx])) {
          dancer.tileX = nx;
          dancer.tileY = ny;
          dancer.x = nx * TILE;
          dancer.y = ny * TILE;
          dancer.dir = dirs.indexOf(dir);
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
    const decoyFreeze = playerNum === 1 ? state.decoyFreeze : state.decoyFreeze2;
    
    if (cooldown > 0 || decoyFreeze > 0 || !player) return;

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

    // Decoy trap! Freeze the player and show chatty message
    if (best.decoy) {
      const msg = DECOY_MESSAGES[Math.floor(Math.random() * DECOY_MESSAGES.length)];
      if (playerNum === 1) {
        state.decoyFreeze = DECOY_FREEZE_FRAMES;
        state.decoyMessage = msg;
      } else {
        state.decoyFreeze2 = DECOY_FREEZE_FRAMES;
        state.decoyMessage2 = msg;
      }
      
      // Amber "oops" particles
      for (let i = 0; i < 12; i++) {
        state.particles.push({
          x: best.x + TILE / 2,
          y: best.y + TILE / 2,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3 - 1,
          life: 20 + Math.random() * 15,
          maxLife: 35,
          color: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d'][Math.floor(Math.random() * 4)],
          size: 2 + Math.random() * 3,
        });
      }
      best.fixed = true; // Remove it so it doesn't trap again
      return;
    }

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
      ? ['#7c5cfc', '#a78bfa', '#c4b5fd', '#ddd6fe']
      : ['#f97316', '#fb923c', '#fdba74', '#fed7aa'];

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
        state.enteringName = true;
        state.playerName = '';
        state.scoreSubmitted = false;
        stopMusic();
        sfxWin();
        fetchScores().then(s => { state.scores = s; });
      }
    } else {
      if (state.fixed >= TOTAL_ISSUES) {
        state.screen = 'win';
        state.enteringName = true;
        state.playerName = '';
        state.scoreSubmitted = false;
        stopMusic();
        sfxWin();
        fetchScores().then(s => { state.scores = s; });
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
      stopMusic();
      sfxLose();
      fetchScores().then(s => { state.scores = s; });
      return;
    }

    if (state.cooldown > 0) state.cooldown--;
    if (state.cooldown2 > 0) state.cooldown2--;
    if (state.flash > 0) state.flash--;
    if (state.flash2 > 0) state.flash2--;
    if (state.coffeeBoost > 0) state.coffeeBoost--;
    if (state.coffeeBoost2 > 0) state.coffeeBoost2--;
    if (state.decoyFreeze > 0) state.decoyFreeze--;
    if (state.decoyFreeze2 > 0) state.decoyFreeze2--;
    if (state.dancerFreeze > 0) state.dancerFreeze--;
    if (state.dancerFreeze2 > 0) state.dancerFreeze2--;

    // Tick cooler cooldowns
    state.coolerCooldowns.forEach((val, key) => {
      if (val > 1) state.coolerCooldowns.set(key, val - 1);
      else state.coolerCooldowns.delete(key);
    });

    // Tick carpet cooldowns
    state.carpetCooldowns.forEach((val, key) => {
      if (val > 1) state.carpetCooldowns.set(key, val - 1);
      else state.carpetCooldowns.delete(key);
    });

    updatePlayer();
    if (state.gameMode === 'multi') {
      updatePlayer2();
    }
    updateCamera();
    updateParticles();
    updateCamels();
    updateDancers();
    spawnIssueParticles();
    findNearbyIssue();

    for (const d of state.issues) {
      if (!d.fixed) d.animFrame++;
    }

    for (const npc of state.npcs) {
      if (npc.happyTimer > 0) npc.happyTimer--;
      if (state.tick % 12 === 0) npc.frame = 1 - npc.frame;
    }
  }, [updatePlayer, updatePlayer2, updateCamera, updateParticles, updateCamels, updateDancers, spawnIssueParticles, findNearbyIssue]);

  const renderPlayerView = useCallback((
    ctx: CanvasRenderingContext2D,
    player: Player,
    camera: Camera,
    viewWidth: number,
    offsetX: number,
    playerNum: 1 | 2,
    nearbyIssue: Issue | null,
    flash: number,
    camelBlockTimer: number,
    coffeeBoost: number,
    decoyFreeze: number,
    decoyMessage: string,
    dancerFreeze: number
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

    // Draw belly dancers
    for (const dancer of state.dancers) {
      drawBellyDancer(ctx, dancer, camera, state.tick);
    }

    // Show "Playing with camel!" message if blocked
    if (camelBlockTimer > 0) {
      const camelSec = Math.ceil(camelBlockTimer / 60);
      ctx.fillStyle = 'rgba(15,15,26,0.85)';
      ctx.beginPath();
      ctx.roundRect(viewWidth / 2 - 105, 80, 210, 28, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(249,115,22,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(viewWidth / 2 - 105, 80, 210, 28, 6);
      ctx.stroke();
      ctx.fillStyle = '#fb923c';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Playing with camel! (${camelSec}s)`, viewWidth / 2, 99);
      ctx.textAlign = 'left';
    }

    // Player glow
    const pgx = player.x - camera.x + TILE / 2;
    const pgy = player.y - camera.y + TILE / 2 + 8;
    const glowR = 20 + Math.sin(state.tick * 0.08) * 3;
    
    let glowColor: string;
    let strokeColor: string;
    
    if (coffeeBoost > 0) {
      glowColor = 'rgba(249,115,22,0.2)';
      strokeColor = 'rgba(251,146,60,0.6)';
    } else if (playerNum === 1) {
      glowColor = 'rgba(124,92,252,0.12)';
      strokeColor = 'rgba(167,139,250,0.4)';
    } else {
      glowColor = 'rgba(249,115,22,0.12)';
      strokeColor = 'rgba(251,146,60,0.4)';
    }
    
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(pgx, pgy, (coffeeBoost > 0 ? glowR + 8 : glowR) + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = coffeeBoost > 0 ? 2 : 1;
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

    // Coffee boost indicator
    if (coffeeBoost > 0) {
      const boostBarWidth = 60;
      const boostPct = coffeeBoost / 360;
      const bx = pgx - boostBarWidth / 2;
      const by = player.y - camera.y - 8;
      
      const boostSec = Math.ceil(coffeeBoost / 60);
      ctx.fillStyle = '#fb923c';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`BOOST! (${boostSec}s)`, pgx, by - 4);
      ctx.textAlign = 'left';
      
      ctx.fillStyle = 'rgba(15,15,26,0.6)';
      ctx.beginPath();
      ctx.roundRect(bx, by, boostBarWidth, 7, 3);
      ctx.fill();
      ctx.fillStyle = boostPct > 0.3 ? '#f97316' : '#ff4444';
      ctx.beginPath();
      ctx.roundRect(bx, by, boostBarWidth * boostPct, 7, 3);
      ctx.fill();
    }

    // Decoy NHI chatty message
    if (decoyFreeze > 0 && decoyMessage) {
      const msgWidth = Math.min(viewWidth - 40, 400);
      const msgX = viewWidth / 2 - msgWidth / 2;
      const msgY = VH / 2 - 30;
      
      ctx.fillStyle = 'rgba(15,15,26,0.92)';
      ctx.beginPath();
      ctx.roundRect(msgX, msgY, msgWidth, 60, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(251,191,36,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(msgX, msgY, msgWidth, 60, 8);
      ctx.stroke();
      
      const decoySec = Math.ceil(decoyFreeze / 60);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`NOISY NHI! (${decoySec}s)`, viewWidth / 2, msgY + 18);
      
      ctx.fillStyle = '#e8e5f0';
      ctx.font = '10px monospace';
      // Word-wrap the message
      const words = decoyMessage.split(' ');
      let line = '';
      let lineY = msgY + 35;
      for (const word of words) {
        const test = line + (line ? ' ' : '') + word;
        if (ctx.measureText(test).width > msgWidth - 30) {
          ctx.fillText(line, viewWidth / 2, lineY);
          line = word;
          lineY += 13;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, viewWidth / 2, lineY);
      ctx.textAlign = 'left';
    }

    // Dancer freeze message (offset below camel message to avoid stacking)
    if (dancerFreeze > 0) {
      const dancerSec = Math.ceil(dancerFreeze / 60);
      const dancerMsgY = camelBlockTimer > 0 ? 115 : 80;
      ctx.fillStyle = 'rgba(15,15,26,0.88)';
      ctx.beginPath();
      ctx.roundRect(viewWidth / 2 - 120, dancerMsgY, 240, 28, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(176,48,96,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(viewWidth / 2 - 120, dancerMsgY, 240, 28, 6);
      ctx.stroke();
      ctx.fillStyle = '#ff69b4';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Mesmerized by the dancer! (${dancerSec}s)`, viewWidth / 2, dancerMsgY + 19);
      ctx.textAlign = 'left';
    }

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
      drawModeSelect(ctx, state.tick, state.modeSelectChoice, isMobile);
      return;
    }

    if (!state.player) return;

    if (state.gameMode === 'multi' && state.player2) {
      // Split-screen rendering
      renderPlayerView(ctx, state.player, state.camera, SPLIT_VW, 0, 1, state.nearbyIssue, state.flash, state.camelBlockTimer, state.coffeeBoost, state.decoyFreeze, state.decoyMessage, state.dancerFreeze);
      renderPlayerView(ctx, state.player2, state.camera2, SPLIT_VW, SPLIT_VW, 2, state.nearbyIssue2, state.flash2, state.camelBlockTimer2, state.coffeeBoost2, state.decoyFreeze2, state.decoyMessage2, state.dancerFreeze2);
      
      // Divider line (subtle purple)
      ctx.fillStyle = 'rgba(124,92,252,0.3)';
      ctx.fillRect(SPLIT_VW - 1, 0, 2, VH);
      
      // Minimaps
      drawMinimap(ctx, state.map, state.issues, state.player, state.player2, {
        width: 90,
        posX: SPLIT_VW - 100,
        playerColor: '#a78bfa',
        player2Color: '#fb923c'
      });
      drawMinimap(ctx, state.map, state.issues, state.player, state.player2, {
        width: 90,
        posX: VW - 100,
        playerColor: '#a78bfa',
        player2Color: '#fb923c'
      });
      
      // Shared timer at top center
      ctx.fillStyle = 'rgba(15,15,26,0.88)';
      ctx.beginPath();
      ctx.roundRect(VW / 2 - 60, 5, 120, 40, 8);
      ctx.fill();
      ctx.strokeStyle = state.timer < 15 ? 'rgba(255,85,85,0.5)' : 'rgba(124,92,252,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(VW / 2 - 60, 5, 120, 40, 8);
      ctx.stroke();
      
      const mins = Math.floor(state.timer / 60);
      const secs = Math.floor(state.timer % 60);
      const ts = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      ctx.fillStyle = state.timer < 15 ? '#ff5555' : '#e8e5f0';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ts, VW / 2, 33);
      ctx.textAlign = 'left';
      
      // Player 1 score (left)
      ctx.fillStyle = 'rgba(15,15,26,0.88)';
      ctx.beginPath();
      ctx.roundRect(10, 5, 100, 40, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(124,92,252,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(10, 5, 100, 40, 8);
      ctx.stroke();
      ctx.fillStyle = '#a78bfa';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('P1', 20, 22);
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${state.player.fixes}/${TOTAL_ISSUES}`, 20, 40);
      
      // Player 2 score (right)
      ctx.fillStyle = 'rgba(15,15,26,0.88)';
      ctx.beginPath();
      ctx.roundRect(VW - 110, 5, 100, 40, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(249,115,22,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(VW - 110, 5, 100, 40, 8);
      ctx.stroke();
      ctx.fillStyle = '#fb923c';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('P2', VW - 100, 22);
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${state.player2.fixes}/${TOTAL_ISSUES}`, VW - 100, 40);
      
    } else {
      // Single player rendering
      renderPlayerView(ctx, state.player, state.camera, VW, 0, 1, state.nearbyIssue, state.flash, state.camelBlockTimer, state.coffeeBoost, state.decoyFreeze, state.decoyMessage, state.dancerFreeze);
      
      drawHUD(
        ctx,
        state.timer,
        state.fixed,
        state.flash,
        state.map,
        state.issues,
        state.player,
        state.nearbyIssue,
        state.tick,
        state.musicMuted
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
        state.player2?.fixes || 0,
        state.enteringName
      );
      drawScoreboard(ctx, state.scores, state.playerName, state.enteringName, state.tick);
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
        return;
      }

      // Mode select -> toggle + confirm
      if (state.screen === 'modeSelect') {
        if (!isMobile && (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
          e.preventDefault();
          state.modeSelectChoice = state.modeSelectChoice === 'single' ? 'multi' : 'single';
        }
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startGame(state.modeSelectChoice);
        }
        if (e.code === 'Escape') {
          e.preventDefault();
          state.screen = 'title';
        }
      }

      // End screen — name entry or return to title
      if (state.screen === 'win' || state.screen === 'lose') {
        if (state.enteringName) {
          e.preventDefault();
          if (e.code === 'Enter' && state.playerName.length > 0) {
            state.enteringName = false;
            const elapsed = GAME_TIME - state.timer;
            submitScore(state.playerName, elapsed, state.fixed).then(s => {
              state.scores = s;
              state.scoreSubmitted = true;
            });
          } else if (e.code === 'Backspace') {
            state.playerName = state.playerName.slice(0, -1);
          } else if (e.code === 'Escape') {
            state.enteringName = false;
          } else if (e.key.length === 1 && state.playerName.length < 12) {
            state.playerName += e.key;
          }
        } else if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          state.screen = 'title';
          state.camera = { x: 0, y: 0 };
          state.camera2 = { x: 0, y: 0 };
          setMobileControlsVisible(false);
        }
      }

      // Player 1 fix: E, Space, or Enter (Enter only in single player)
      if (state.screen === 'playing' && (e.code === 'Space' || e.code === 'KeyE' || (e.code === 'Enter' && state.gameMode === 'single'))) {
        e.preventDefault();
        tryFixForPlayer(1);
      }

      // Player 2 fix: Enter or Shift (multiplayer only)
      if (state.screen === 'playing' && state.gameMode === 'multi' && (e.code === 'Enter' || e.code === 'ShiftRight' || e.code === 'ShiftLeft')) {
        e.preventDefault();
        tryFixForPlayer(2);
      }

      // Music toggle
      if (state.screen === 'playing' && e.code === 'KeyM') {
        state.musicMuted = toggleMusic();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameStateRef.current.keys[e.code] = false;
    };

    const handleClick = (e: MouseEvent) => {
      const state = gameStateRef.current;
      if (state.screen !== 'playing') return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = VW / rect.width;
      const scaleY = VH / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      const muteX = VW - 120 - 46;
      const muteY = 10;
      if (cx >= muteX && cx <= muteX + 30 && cy >= muteY && cy <= muteY + 30) {
        state.musicMuted = toggleMusic();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('click', handleClick);
    };
  }, [startGame, tryFixForPlayer]);

  // Mobile: sync joystick into key state each frame
  useEffect(() => {
    if (!isMobile) return;
    let raf: number;
    const sync = () => {
      const state = gameStateRef.current;
      const j = joystickRef.current;
      state.keys['KeyW'] = j.active && j.dy < -0.3;
      state.keys['KeyS'] = j.active && j.dy > 0.3;
      state.keys['KeyA'] = j.active && j.dx < -0.3;
      state.keys['KeyD'] = j.active && j.dx > 0.3;
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [isMobile]);

  // Mobile: handle canvas tap for title/modeSelect/end screens only
  const handleCanvasTap = useCallback(() => {
    const state = gameStateRef.current;
    if (state.screen === 'playing') return;
    if (state.screen === 'title') {
      initAudio();
      state.screen = 'modeSelect';
    } else if (state.screen === 'modeSelect') {
      startGame(isMobile ? 'single' : state.modeSelectChoice);
    } else if (state.screen === 'win' || state.screen === 'lose') {
      if (state.enteringName) {
        state.enteringName = false;
      } else {
        state.screen = 'title';
        state.camera = { x: 0, y: 0 };
        state.camera2 = { x: 0, y: 0 };
        setMobileControlsVisible(false);
      }
    }
  }, [startGame, isMobile]);

  // Joystick touch handlers -- update knob DOM directly for smooth visuals
  const handleJoystickTouch = useCallback((e: React.TouchEvent, isEnd = false) => {
    e.preventDefault();
    const j = joystickRef.current;
    if (isEnd) {
      j.active = false;
      j.dx = 0;
      j.dy = 0;
    } else {
      const touch = e.touches[0];
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = (touch.clientX - rect.left - cx) / cx;
      const dy = (touch.clientY - rect.top - cy) / cy;
      j.active = true;
      j.dx = Math.max(-1, Math.min(1, dx));
      j.dy = Math.max(-1, Math.min(1, dy));
    }
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = `translate(${j.dx * 30}px, ${j.dy * 30}px)`;
    }
  }, []);

  const handleFixTap = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const state = gameStateRef.current;
    if (state.screen === 'playing') {
      tryFixForPlayer(1);
    }
  }, [tryFixForPlayer]);

  if (isMobile) {
    return (
      <div className="mobile-wrapper">
        <canvas
          ref={canvasRef}
          width={VW}
          height={VH}
          className="game-canvas mobile-canvas"
          onTouchEnd={handleCanvasTap}
        />
        {mobileControlsVisible && (
          <div className="mobile-controls">
            <div
              className="joystick-zone"
              onTouchStart={(e) => handleJoystickTouch(e)}
              onTouchMove={(e) => handleJoystickTouch(e)}
              onTouchEnd={(e) => handleJoystickTouch(e, true)}
              onTouchCancel={(e) => handleJoystickTouch(e, true)}
            >
              <div className="joystick-ring">
                <div ref={joystickKnobRef} className="joystick-knob" />
              </div>
            </div>
            <div
              className="fix-button"
              onTouchStart={handleFixTap}
            >
              FIX
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={VW}
      height={VH}
      className="game-canvas"
    />
  );
}
