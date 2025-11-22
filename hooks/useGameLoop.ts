
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Tower, Enemy, Projectile, Particle, Soldier, Critter, TerrainType, TowerType, EnemyType, Season } from '../types';
import { CELL_SIZE, GRID_W, GRID_H, PALETTES, TOWER_STATS, ENEMY_STATS, ANIMALS } from '../constants';

const lerpColor = (c1: string, c2: string, t: number) => {
  if (!c1 || !c2) return '#000000';
  const r1 = parseInt(c1.substring(1, 3), 16);
  const g1 = parseInt(c1.substring(3, 5), 16);
  const b1 = parseInt(c1.substring(5, 7), 16);
  const r2 = parseInt(c2.substring(1, 3), 16);
  const g2 = parseInt(c2.substring(3, 5), 16);
  const b2 = parseInt(c2.substring(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const useGameLoop = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [money, setMoney] = useState(250);
  const [lives, setLives] = useState(20);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speedMulti, setSpeedMulti] = useState(1);
  const [season, setSeason] = useState<Season>('summer');
  const [waveActive, setWaveActive] = useState(false);
  const [nextBoss, setNextBoss] = useState<EnemyType>(EnemyType.PEASANT);
  const [citadelLevel, setCitadelLevel] = useState(0);
  const [goodieCooldowns, setGoodieCooldowns] = useState({ arrow: 0, tax: 0, ice: 0 });

  const stateRef = useRef<GameState>({
    grid: [],
    wearMap: [],
    flowField: [],
    gold: 250,
    lives: 20,
    wave: 1,
    waveActive: false,
    season: 'summer',
    nextSeason: 'summer',
    seasonLerp: 0,
    dayTime: 0,
    citadelLevel: 0,
    nextBoss: EnemyType.PEASANT,
    goodies: { arrow: 0, tax: 0, ice: 0 }
  });

  const towersRef = useRef<Tower[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const soldiersRef = useRef<Soldier[]>([]);
  const crittersRef = useRef<Critter[]>([]);
  const frameRef = useRef(0);
  const waveQueueRef = useRef<EnemyType[]>([]);
  const targetPos = useRef({ x: 9, y: GRID_H - 2 }); 

  // State references for loop access
  const pausedRef = useRef(isPaused);
  const speedRef = useRef(speedMulti);
  
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { speedRef.current = speedMulti; }, [speedMulti]);

  // --- INITIALIZATION ---
  const initGame = useCallback(() => {
    setMoney(250); setLives(20); setWave(1); setGameOver(false); setCitadelLevel(0); setWaveActive(false);
    stateRef.current.gold = 250; stateRef.current.lives = 20; stateRef.current.wave = 1;
    stateRef.current.waveActive = false; stateRef.current.season = 'summer';
    stateRef.current.nextSeason = 'summer'; stateRef.current.seasonLerp = 0;
    stateRef.current.citadelLevel = 0;
    
    towersRef.current = []; enemiesRef.current = []; projectilesRef.current = [];
    particlesRef.current = []; soldiersRef.current = [];
    crittersRef.current = [];

    const newGrid: {type:TerrainType, variant:number}[][] = [];
    const newWear: number[][] = [];
    
    // Generate Map
    for (let y = 0; y < GRID_H; y++) {
      const row = [];
      const wRow = [];
      for (let x = 0; x < GRID_W; x++) {
        let noise = Math.sin(x * 0.3) * Math.cos(y * 0.3) + Math.sin((x + y) * 0.1);
        
        // Map to 4 variants (0-3) - Even with uniform color, we keep logic
        let variant = 0;
        if (noise > 0.6) variant = 3;
        else if (noise > 0.1) variant = 2;
        else if (noise > -0.4) variant = 1;
        else variant = 0;

        row.push({ type: TerrainType.GRASS, variant });
        wRow.push(0);
      }
      newGrid.push(row);
      newWear.push(wRow);
    }
    
    stateRef.current.grid = newGrid;
    stateRef.current.wearMap = newWear;

    // Place Resources/Obstacles
    const place = (type: TerrainType, count: number) => {
      for(let i=0; i<count; i++) {
        let x = Math.floor(Math.random() * (GRID_W-2)) + 1;
        let y = Math.floor(Math.random() * (GRID_H-2)) + 1;
        if(y > 2 && newGrid[y][x].type === TerrainType.GRASS) newGrid[y][x].type = type;
      }
    };
    place(TerrainType.MINE, 4);
    place(TerrainType.POWER, 3);
    place(TerrainType.SWAMP, 6);
    place(TerrainType.TREE, 20);
    
    // Water clumps
    let lx = 10, ly = 10;
    for(let i=0; i<15; i++) {
        let ox = lx + Math.floor((Math.random()-0.5)*6); let oy = ly + Math.floor((Math.random()-0.5)*6);
        if(ox>0 && ox<GRID_W-1 && oy>0 && oy<GRID_H-1) newGrid[oy][ox].type = TerrainType.WATER;
    }
    
    // Set Castle Zone (Bottom)
    const cx = targetPos.current.x, cy = targetPos.current.y;
    stateRef.current.grid[cy][cx] = { type: TerrainType.CASTLE_ZONE, variant: 0 };
    stateRef.current.grid[cy][cx+1] = { type: TerrainType.CASTLE_ZONE, variant: 0 };
    stateRef.current.grid[cy+1][cx] = { type: TerrainType.CASTLE_ZONE, variant: 0 };
    stateRef.current.grid[cy+1][cx+1] = { type: TerrainType.CASTLE_ZONE, variant: 0 };

    calcFlowField();
    
    // Spawn Critters
    for(let i=0; i<5; i++) {
      crittersRef.current.push({
        id: Math.random().toString(),
        x: Math.random()*GRID_W*CELL_SIZE, y: Math.random()*GRID_H*CELL_SIZE,
        vx: 0, vy: 0,
        icon: ANIMALS[Math.floor(Math.random()*ANIMALS.length)].icon,
        panic: 0
      });
    }
  }, []);

  // --- FLOW FIELD ---
  const calcFlowField = () => {
    const grid = stateRef.current.grid;
    const field = Array(GRID_H).fill(0).map(() => Array(GRID_W).fill(null) as (number | null)[]);
    const queue: {x:number, y:number}[] = [];
    
    const cx = targetPos.current.x, cy = targetPos.current.y;
    [{x:cx, y:cy}, {x:cx+1, y:cy}, {x:cx, y:cy+1}, {x:cx+1, y:cy+1}].forEach(p => {
      field[p.y][p.x] = 0;
      queue.push(p);
    });

    const dirs = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}];
    while(queue.length > 0) {
      const curr = queue.shift()!;
      const dist = field[curr.y][curr.x]!;
      for(const d of dirs) {
        const nx = curr.x + d.x, ny = curr.y + d.y;
        if(nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
          const t = grid[ny][nx].type;
          const obstacle = t === TerrainType.WALL || t === TerrainType.TREE || t === TerrainType.WATER;
          if(!obstacle && field[ny][nx] === null) {
            field[ny][nx] = dist + 1;
            queue.push({x: nx, y: ny});
          }
        }
      }
    }
    stateRef.current.flowField = field;
  };

  const wouldBlockPath = (tx: number, ty: number) => {
    const grid = stateRef.current.grid;
    const oldType = grid[ty][tx].type;
    grid[ty][tx].type = TerrainType.WALL;
    calcFlowField();
    let reachable = false;
    for(let x=0; x<GRID_W; x++) {
        if (stateRef.current.flowField[0][x] !== null) reachable = true;
    }
    grid[ty][tx].type = oldType;
    if(!reachable) calcFlowField();
    return !reachable;
  };

  // --- SPAWNING ---
  const startWave = () => {
    if(stateRef.current.waveActive) return;
    towersRef.current.forEach(t => { if(t.type === TowerType.BLITZ) t.ammo = t.ammoMax; });
    stateRef.current.waveActive = true;
    setWaveActive(true);
    
    const q: EnemyType[] = [];
    const w = stateRef.current.wave;
    
    if (w % 10 === 0) {
      q.push(EnemyType.BOSS);
      setNextBoss(w % 20 === 0 ? EnemyType.BOSS : EnemyType.KNIGHT); 
    } else {
      const count = 4 + Math.floor(w * 1.5);
      for (let i=0; i<count; i++) {
        const r = Math.random();
        if (w > 5 && r < 0.05) q.push(EnemyType.SPIDER);
        else if (w > 15 && i%4===0) q.push(EnemyType.SKELETON);
        else if (w > 10 && i%5===0) q.push(EnemyType.SPIDER);
        else if (w > 20 && i%6===0) q.push(EnemyType.SNAKE);
        else if (w > 6 && i%3===0) q.push(EnemyType.KNIGHT);
        else if (w > 3 && i%2===0) q.push(EnemyType.WOLF);
        else q.push(EnemyType.PEASANT);
      }
      if(w % 5 === 0) q.splice(Math.floor(q.length/2), 0, EnemyType.KOBOLD);
    }
    waveQueueRef.current = q;
  };

  // --- UPDATE ---
  const update = useCallback(() => {
    if(gameOver || pausedRef.current) return;
    const state = stateRef.current;
    const speed = speedRef.current;
    frameRef.current++;
    
    // Time/Season
    const cycle = Math.floor((state.wave - 1) / 5) % 2;
    const targetDayTime = cycle === 0 ? 0.0 : 0.7;
    if(state.dayTime < targetDayTime) state.dayTime = Math.min(targetDayTime, state.dayTime + 0.0005);
    if(state.dayTime > targetDayTime) state.dayTime = Math.max(targetDayTime, state.dayTime - 0.0005);
    
    if(state.seasonLerp < 1) {
      state.seasonLerp += 0.005;
      if(state.seasonLerp >= 1) {
        state.season = state.nextSeason;
        setSeason(state.season);
        state.seasonLerp = 0;
      }
    }

    // Goodie Cooldowns
    Object.keys(state.goodies).forEach(k => {
       const key = k as keyof typeof state.goodies;
       if(state.goodies[key] > 0) state.goodies[key]--;
    });
    setGoodieCooldowns({...state.goodies});

    // Swamp Bubbles
    if (particlesRef.current.length < 50) {
      for(let y=0; y<GRID_H; y++) for(let x=0; x<GRID_W; x++) {
        if(state.grid[y][x].type === TerrainType.SWAMP && Math.random() < 0.02) {
           particlesRef.current.push({
             id: Math.random().toString(),
             x: x*CELL_SIZE + Math.random()*CELL_SIZE,
             y: y*CELL_SIZE + Math.random()*CELL_SIZE,
             vx: 0, vy: 0,
             life: 0, maxLife: 80,
             size: Math.random()*3,
             color: 'rgba(255,255,255,0.3)',
             type: 'bubble'
           });
        }
      }
    }

    // Spawning
    if(state.waveActive) {
      if(waveQueueRef.current.length > 0) {
        if(frameRef.current % Math.max(10, Math.floor(40 / speed)) === 0) {
           const type = waveQueueRef.current.shift()!;
           const stats = ENEMY_STATS[type];
           if(type === EnemyType.BOSS || type === EnemyType.KNIGHT || type === EnemyType.SPIDER) setNextBoss(type);

           enemiesRef.current.push({
             id: Math.random().toString(),
             type,
             x: Math.random() * (GRID_W * CELL_SIZE - 40) + 20,
             y: -20,
             hp: stats.hp * Math.pow(1.13, state.wave - 1),
             maxHp: stats.hp * Math.pow(1.13, state.wave - 1),
             speed: stats.speed,
             frozen: 0, slowTimer: 0, burnStack: 0, poisonStack: 0,
             tarred: false, dead: false, reached: false, dx: 0, blockedBy: null,
             noiseOffset: Math.random() * 1000,
             armor: stats.armor
           });
        }
      } else if (enemiesRef.current.length === 0) {
        state.waveActive = false;
        setWaveActive(false);
        state.wave++;
        setWave(state.wave);
        
        let interest = Math.floor(state.gold * 0.05);
        let mines = 0;
        state.grid.forEach(row => row.forEach(cell => { if(cell.type === TerrainType.MINE) mines += 5; }));
        state.gold += 50 + interest + mines;
        setMoney(state.gold);
        particlesRef.current.push({ id:Math.random().toString(), x: GRID_W*CELL_SIZE/2, y: GRID_H*CELL_SIZE/2, vx:0, vy:-1, life:60, maxLife:60, color: '#fbbf24', size:20, type: 'text', text: `+50g & ${interest}g Zins`});

        let upcoming = 'summer';
        if(state.wave < 10) upcoming = 'summer';
        else if(state.wave < 20) upcoming = 'autumn';
        else if(state.wave < 30) upcoming = 'winter';
        else upcoming = 'spring';
        
        if(upcoming !== state.nextSeason) {
          state.nextSeason = upcoming as Season;
          state.seasonLerp = 0;
        }
      }
    }

    // Soldiers Update
    soldiersRef.current = soldiersRef.current.filter(s => s.hp > 0);
    soldiersRef.current.forEach(s => {
      if(!s.targetId || !enemiesRef.current.find(e => e.id === s.targetId)) {
        s.targetId = null;
        const t = enemiesRef.current.find(e => Math.hypot(e.x - s.x, e.y - s.y) < 60 && !e.blockedBy && !e.dead);
        if(t) s.targetId = t.id;
      }
      if(s.targetId) {
        const t = enemiesRef.current.find(e => e.id === s.targetId);
        if(t) {
           const dist = Math.hypot(t.x - s.x, t.y - s.y);
           if(dist > 10) {
             s.x += ((t.x - s.x)/dist) * 1.5 * speed;
             s.y += ((t.y - s.y)/dist) * 1.5 * speed;
           } else {
             t.blockedBy = s.id;
             if(frameRef.current % 30 === 0) {
               const dmg = s.dmg * (1 + state.citadelLevel * 0.1);
               t.hp -= dmg;
               s.hp -= (state.dayTime > 0.5 ? 5 : 2.5);
               particlesRef.current.push({ id:Math.random().toString(), x:s.x, y:s.y, vx:0, vy:0, life:10, maxLife:10, color:'#ef4444', size:2, type:'spark' });
             }
           }
        }
      } else {
        if(Math.hypot(s.x - s.spawnX, s.y - s.spawnY) > 5) {
          const dx = s.spawnX - s.x, dy = s.spawnY - s.y, d = Math.hypot(dx, dy);
          s.x += (dx/d) * speed; s.y += (dy/d) * speed;
        } else if (s.hp < s.maxHp && frameRef.current % 60 === 0) s.hp += 2;
      }
    });

    // Enemies Update
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
      const e = enemiesRef.current[i];
      const eStats = ENEMY_STATS[e.type];
      if(e.burnStack > 0) { e.burnStack--; if(frameRef.current % 30 === 0) e.hp -= 10; }
      if(e.poisonStack > 0) { e.poisonStack--; if(frameRef.current % 60 === 0) e.hp -= (e.maxHp * 0.01 + 5); }
      if(e.slowTimer > 0) e.slowTimer--;
      if(e.frozen > 0) e.frozen--;

      if(e.hp <= 0) {
        state.gold += eStats.reward;
        setMoney(Math.floor(state.gold));
        enemiesRef.current.splice(i, 1);
        continue;
      }

      if(!e.blockedBy || !soldiersRef.current.find(s => s.id === e.blockedBy)) {
        e.blockedBy = null;
        let spd = eStats.speed * speed;
        const gx = Math.floor(e.x/CELL_SIZE), gy = Math.floor(e.y/CELL_SIZE);
        if(state.grid[gy] && state.grid[gy][gx].type === TerrainType.SWAMP && !eStats.ignoreSlow) spd *= 0.5;
        if(state.season === 'winter' || (state.seasonLerp > 0.5 && state.nextSeason === 'winter')) spd *= 0.9;
        if(e.slowTimer > 0) spd *= (eStats.ignoreSlow ? 0.8 : 0.5);
        if(state.goodies.ice > 0) spd *= 0.2;
        if(state.dayTime < 0.3 && (e.type === EnemyType.WOLF || e.type === EnemyType.SPIDER)) spd *= 1.2;

        if(state.flowField[gy] && state.flowField[gy][gx] !== null) {
          let best = state.flowField[gy][gx]!, dir = {x:0, y:0};
          [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(d => {
             const nx = gx+d.x, ny = gy+d.y;
             if(nx>=0 && nx<GRID_W && ny>=0 && ny<GRID_H && state.flowField[ny][nx] !== null) {
               if(state.flowField[ny][nx]! < best) { best = state.flowField[ny][nx]!; dir = d; }
             }
          });
          const destX = (gx + dir.x) * CELL_SIZE + CELL_SIZE/2;
          const destY = (gy + dir.y) * CELL_SIZE + CELL_SIZE/2;
          const dx = destX - e.x, dy = destY - e.y, dist = Math.hypot(dx, dy);
          e.dx = dx; 
          const noiseX = Math.sin(frameRef.current * 0.05 + e.noiseOffset) * 0.5;
          if(dist <= spd) { e.x = destX; e.y = destY; } 
          else { e.x += (dx/dist) * spd + noiseX; e.y += (dy/dist) * spd; }
          if(state.wearMap[gy][gx] < 1.5) state.wearMap[gy][gx] += 0.005;
        } else {
           e.y += spd;
        }
        
        const tx = targetPos.current.x * CELL_SIZE + CELL_SIZE, ty = targetPos.current.y * CELL_SIZE + CELL_SIZE;
        if(Math.abs(e.x - tx) < 30 && Math.abs(e.y - ty) < 30) {
           state.lives -= (e.type === EnemyType.BOSS ? 10 : 1);
           setLives(state.lives);
           enemiesRef.current.splice(i, 1);
           if(state.lives <= 0) setGameOver(true);
        }
      }
    }

    // Towers Update
    towersRef.current.forEach(t => {
      if(t.cooldown > 0) t.cooldown -= speed;
      if(t.cooldown <= 0) {
         if(t.type === TowerType.BLITZ && t.ammo <= 0) return;
         if(t.type === TowerType.BARRACKS) { t.cooldown = 600; return; } 

         let range = t.range * CELL_SIZE;
         if(state.dayTime > 0.3) {
            if(t.type === TowerType.ARCHER || t.type === TowerType.CROSSBOW) range *= 0.7;
            if(t.type === TowerType.FIRE) range *= 1.2;
         }

         const targets = enemiesRef.current.filter(e => Math.hypot(e.x - t.x, e.y - t.y) <= range);
         if(targets.length > 0) {
            let target = targets[0];
            if(t.strategy === 'STRONG') target = targets.reduce((a,b) => a.hp > b.hp ? a : b);
            if(t.strategy === 'WEAK') target = targets.reduce((a,b) => a.hp < b.hp ? a : b);
            
            const dmg = t.damage * (1 + state.citadelLevel * 0.1);
            if(t.type === TowerType.BLITZ) {
               particlesRef.current.push({ id:Math.random().toString(), x:t.x, y:t.y-6, vx:0, vy:0, life:10, maxLife:10, color:'#0ea5e9', size:2, type:'bolt' });
               target.hp -= dmg;
               t.ammo--;
            } else if(t.type === TowerType.TAR) {
               targets.forEach(e => { e.slowTimer = 90; e.tarred = true; });
               particlesRef.current.push({ id:Math.random().toString(), x:t.x, y:t.y, vx:0, vy:0, life:20, maxLife:20, color:'#1e1b4b', size:range, type:'pulse' });
            } else if(t.type === TowerType.KNIGHT) {
               target.hp -= dmg;
               particlesRef.current.push({ id:Math.random().toString(), x:target.x, y:target.y, vx:0, vy:0, life:10, maxLife:10, color:'#fff', size:5, type:'spark' });
            } else {
               let pType: any = 'proj';
               let col = '#fff';
               if(t.type === TowerType.ARCHER) {
                 if(t.special === 'B') { pType = 'poison'; col = '#84cc16'; }
                 else {
                    const neighbors = towersRef.current.filter(n => Math.abs(n.gx - t.gx) + Math.abs(n.gy - t.gy) === 1);
                    if(neighbors.some(n => n.type === TowerType.FIRE || n.type === TowerType.TAR)) { pType = 'fire'; col = '#ef4444'; }
                 }
               } else if (t.type === TowerType.FIRE) { pType = 'aoe'; col = '#f97316'; }
               
               projectilesRef.current.push({
                 id: Math.random().toString(),
                 x: t.x, y: t.y - 10,
                 targetId: target.id,
                 damage: dmg,
                 type: pType,
                 sourceId: t.id,
                 color: col,
                 speed: t.type === TowerType.CROSSBOW ? 10 : 5,
                 active: true
               });
            }
            t.cooldown = t.speed;
         }
      }
    });

    // Projectiles
    for(let i=projectilesRef.current.length-1; i>=0; i--) {
      const p = projectilesRef.current[i];
      const target = enemiesRef.current.find(e => e.id === p.targetId);
      if(!target) { p.active = false; projectilesRef.current.splice(i, 1); continue; }
      const dx = target.x - p.x, dy = target.y - p.y, dist = Math.hypot(dx, dy);
      if(dist < p.speed * speed) {
        if(p.type === 'aoe') {
          enemiesRef.current.forEach(e => {
            if(Math.hypot(e.x - p.x, e.y - p.y) < 60) {
              e.hp -= p.damage;
              if(e.tarred) { e.tarred = false; e.burnStack += 180; e.hp -= 50; particlesRef.current.push({id:Math.random().toString(), x:e.x, y:e.y, vx:0, vy:0, life:30, maxLife:30, color:'#f97316', size:30, type:'pulse'}); }
            }
          });
           particlesRef.current.push({id:Math.random().toString(), x:p.x, y:p.y, vx:0, vy:0, life:10, maxLife:10, color:p.color, size:60, type:'pulse'});
        } else {
          let dmg = p.damage;
          if(target.armor > 0 && p.type === 'proj') dmg *= (1 - target.armor);
          if(p.type === 'poison' && !ENEMY_STATS[target.type].immunePoison) target.poisonStack = 300;
          if(p.type === 'fire') { target.burnStack = 180; target.slowTimer = 30; }
          target.hp -= dmg;
        }
        p.active = false;
        projectilesRef.current.splice(i, 1);
      } else {
        p.x += (dx/dist) * p.speed * speed; p.y += (dy/dist) * p.speed * speed;
      }
    }

    // Particles
    for(let i=particlesRef.current.length-1; i>=0; i--) {
      const p = particlesRef.current[i];
      if(p.type === 'bubble') {
        p.y -= 0.3; p.size += 0.02; p.life++;
        if(p.life > 80) { p.life = 0; p.size = 1; p.y += 24; }
      } else {
        p.life--;
        if(p.type === 'text') p.y -= 0.5;
        if(p.life <= 0) particlesRef.current.splice(i, 1);
      }
    }

    // Critters
    crittersRef.current.forEach(c => {
       if(c.panic > 0) { c.x += c.vx*2; c.y += c.vy*2; c.panic--; }
       else {
         c.x += c.vx; c.y += c.vy;
         if(Math.random() < 0.02) { c.vx = (Math.random()-0.5)*0.5; c.vy = (Math.random()-0.5)*0.5; }
       }
       if(c.x < 0 || c.x > GRID_W*CELL_SIZE) c.vx *= -1;
       if(c.y < 0 || c.y > GRID_H*CELL_SIZE) c.vy *= -1;
    });
  }, [gameOver]); // Depend only on gameOver, refs handle the rest

  // --- DRAW ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    const state = stateRef.current;
    const seasonCols = PALETTES[state.season];
    const nextSeasonCols = PALETTES[state.nextSeason];
    const t = state.seasonLerp;

    // Now mapping flat string arrays correctly
    const curGrass = seasonCols.grass.map((c, i) => lerpColor(c, nextSeasonCols.grass[i], t));
    const curWater = lerpColor(seasonCols.water, nextSeasonCols.water, t);
    const curTree = lerpColor(seasonCols.tree, nextSeasonCols.tree, t);
    const curIcons = t > 0.5 ? nextSeasonCols.icons : seasonCols.icons;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    state.grid.forEach((row, y) => row.forEach((cell, x) => {
       let col = curGrass[Math.min(3, cell.variant)]; 
       if(cell.type === TerrainType.SWAMP) col = '#57534e';
       if(cell.type === TerrainType.POWER) col = '#7f1d1d';
       if(cell.type === TerrainType.MINE) col = '#713f12';
       if(cell.type === TerrainType.CASTLE_ZONE) col = '#1e293b';
       if(cell.type === TerrainType.WATER) {
         const wave = (Math.sin(frameRef.current * 0.02 + x * 0.5 + y * 0.5) + 1) / 2;
         ctx.globalAlpha = 0.6 + wave * 0.2;
         col = curWater;
       }
       
       ctx.fillStyle = col;
       ctx.fillRect(x*CELL_SIZE, y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
       ctx.globalAlpha = 1.0;
       
       // Grid Lines (Bright enough)
       ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
       ctx.strokeRect(x*CELL_SIZE, y*CELL_SIZE, CELL_SIZE, CELL_SIZE);

       if(cell.type === TerrainType.TREE) {
         ctx.fillStyle = curTree;
         ctx.font = '20px Segoe UI Emoji'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
         ctx.fillText(curIcons[(x+y)%3], x*CELL_SIZE+CELL_SIZE/2, y*CELL_SIZE+CELL_SIZE);
       }
       if(cell.type === TerrainType.MINE) {
         ctx.font = '16px Segoe UI Emoji'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
         ctx.fillText('⛏️', x*CELL_SIZE+CELL_SIZE/2, y*CELL_SIZE+CELL_SIZE/2);
       }
    }));
    
    // Castle
    const cx = targetPos.current.x*CELL_SIZE + CELL_SIZE, cy = targetPos.current.y*CELL_SIZE + CELL_SIZE;
    ctx.fillStyle = '#334155'; ctx.fillRect(cx-25, cy-25, 50, 50); 
    ctx.fillStyle = '#1e293b'; ctx.fillRect(cx-15, cy-15, 30, 30); 
    ctx.font='30px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🏰', cx, cy);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx-25, cy-25, 10, 10); ctx.fillRect(cx+15, cy-25, 10, 10);
    ctx.fillRect(cx-25, cy+15, 10, 10); ctx.fillRect(cx+15, cy+15, 10, 10);

    // Critters
    crittersRef.current.forEach(c => {
       ctx.save(); ctx.translate(c.x, c.y); 
       if(c.vx > 0) ctx.scale(-1, 1);
       ctx.font = '14px Segoe UI Emoji'; ctx.textAlign='center'; ctx.textBaseline='middle';
       ctx.fillText(c.icon, 0, 0);
       ctx.restore();
    });
    
    // Soldiers
    soldiersRef.current.forEach(s => {
      ctx.font = '14px Segoe UI Emoji'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🛡️', s.x, s.y);
      const hp = s.hp/s.maxHp;
      ctx.fillStyle = '#ef4444'; ctx.fillRect(s.x-6, s.y-10, 12, 2);
      ctx.fillStyle = '#22c55e'; ctx.fillRect(s.x-6, s.y-10, 12*hp, 2);
    });

    // Towers
    towersRef.current.forEach(tow => {
       const stats = TOWER_STATS[tow.type];
       let by = tow.y + 12; 
       let alpha = (tow.cooldown > 0) ? 0.6 : 1.0; if(tow.type===TowerType.BARRACKS) alpha = 1.0; ctx.globalAlpha = alpha;
       ctx.fillStyle = stats.color; ctx.fillRect(tow.x-12, by-6, 24, 6); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(tow.x-12, by, 24, 2);
       ctx.font = '18px Segoe UI Emoji'; ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(stats.icon, tow.x, by-4);
       if(tow.master) { ctx.strokeStyle='#fbbf24'; ctx.lineWidth=2; ctx.strokeRect(tow.x-12, by-6, 24, 6); }
       if(tow.level > 0) {
         ctx.font = '10px Arial'; ctx.fillStyle = '#fbbf24'; ctx.textBaseline = 'top';
         ctx.fillText('★'.repeat(tow.level), tow.x, by-2);
       }
       if(tow.type === TowerType.BLITZ) {
          const pct = Math.max(0, (tow.speed - tow.cooldown)/tow.speed);
          ctx.fillStyle = '#0ea5e9'; ctx.fillRect(tow.x-10, by+8, 20*pct, 3);
       }
       ctx.globalAlpha = 1.0;
    });
    
    // Enemies
    enemiesRef.current.forEach(e => {
       const stats = ENEMY_STATS[e.type];
       ctx.save(); ctx.translate(e.x, e.y);
       // Wobble
       let wobble = Math.sin(frameRef.current * 0.2) * 2;
       ctx.rotate(wobble * 0.05);
       if(e.dx > 0) ctx.scale(-1, 1);
       ctx.font = `${stats.size}px Segoe UI Emoji`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle = '#fff';
       ctx.fillText(stats.icon, 0, 0);
       ctx.restore();
       
       if(e.poisonStack > 0) { ctx.font='10px Arial'; ctx.fillText('☠️', e.x, e.y-15); }
       if(e.burnStack > 0) { ctx.font='10px Arial'; ctx.fillText('🔥', e.x+10, e.y-15); }
       
       const hp = e.hp/e.maxHp;
       ctx.fillStyle = '#334155'; ctx.fillRect(e.x-10, e.y-stats.size/2-4, 20, 3);
       ctx.fillStyle = hp < 0.3 ? '#ef4444' : '#22c55e'; ctx.fillRect(e.x-10, e.y-stats.size/2-4, 20*hp, 3);
    });

    // Projectiles
    projectilesRef.current.forEach(p => {
       if(p.type === 'pulse') {
         ctx.strokeStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, Math.PI*2); ctx.stroke();
       } else {
         ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
       }
    });

    // Particles
    particlesRef.current.forEach(p => {
      if(p.type === 'text') {
        ctx.fillStyle = p.color; ctx.font = '12px Segoe UI Emoji'; ctx.fillText(p.text!, p.x, p.y);
      } else if(p.type === 'bubble') {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.stroke();
      } else if(p.type === 'bolt') {
         ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 2, 2);
      } else {
        ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    });

    if(state.dayTime > 0.01) {
      const alpha = Math.min(0.7, state.dayTime);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(0, 5, 20, ${alpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.globalCompositeOperation = 'destination-out';
      const drawLight = (x:number, y:number, r:number) => {
        const g = ctx.createRadialGradient(x, y, r*0.2, x, y, r);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
      };
      
      drawLight(cx, cy, 250);
      towersRef.current.forEach(t => { if(TOWER_STATS[t.type].light) drawLight(t.x, t.y, 100); });
      
      ctx.globalCompositeOperation = 'source-over';
    }

  }, []);

  const loop = useCallback(() => {
    update();
    draw();
    frameRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    initGame();
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [initGame, loop]);

  // --- ACTIONS ---
  const buildTower = (gx: number, gy: number, type: TowerType) => {
    const cost = TOWER_STATS[type].cost;
    if(stateRef.current.gold >= cost && !wouldBlockPath(gx, gy) && stateRef.current.grid[gy][gx].type !== TerrainType.WALL && stateRef.current.grid[gy][gx].type !== TerrainType.WATER && stateRef.current.grid[gy][gx].type !== TerrainType.CASTLE_ZONE) {
       if(towersRef.current.find(t => t.gx === gx && t.gy === gy)) return;
       
       stateRef.current.gold -= cost;
       setMoney(stateRef.current.gold);
       stateRef.current.grid[gy][gx].type = TerrainType.WALL;
       
       const newT: Tower = {
         id: Math.random().toString(),
         gx, gy,
         x: gx*CELL_SIZE + CELL_SIZE/2, y: gy*CELL_SIZE + CELL_SIZE/2,
         type,
         level: 0,
         cooldown: 0,
         damage: TOWER_STATS[type].damage,
         range: TOWER_STATS[type].range,
         speed: TOWER_STATS[type].speed,
         ammo: TOWER_STATS[type].spawn ? 0 : (type === TowerType.BLITZ ? 2 : 0),
         ammoMax: (type === TowerType.BLITZ ? 2 : 0),
         master: false,
         special: null,
         strategy: 'FIRST',
         kills: 0, damageDealt: 0
       };
       
       if(type === TowerType.BARRACKS) {
         for(let i=0; i<3; i++) soldiersRef.current.push({ id:Math.random().toString(), ownerId:newT.id, x:newT.x, y:newT.y, spawnX:newT.x, spawnY:newT.y, hp:60, maxHp:60, dmg:5, targetId:null });
       }
       
       towersRef.current.push(newT);
       calcFlowField();
    }
  };

  const sellTower = (t: Tower) => {
     const refund = Math.floor(TOWER_STATS[t.type].cost * 0.7);
     stateRef.current.gold += refund; setMoney(stateRef.current.gold);
     stateRef.current.grid[t.gy][t.gx].type = TerrainType.GRASS;
     towersRef.current = towersRef.current.filter(x => x.id !== t.id);
     soldiersRef.current = soldiersRef.current.filter(s => s.ownerId !== t.id);
     calcFlowField();
  };
  
  const upgradeTower = (t: Tower, type: 'A'|'B'|'MASTER'|'VETERAN') => {
     if(type === 'VETERAN' && stateRef.current.gold >= 50) {
       stateRef.current.gold -= 50; t.level = 1; t.damage *= 1.1; t.range *= 1.1;
     } else if (type === 'MASTER' && stateRef.current.gold >= 500) {
       stateRef.current.gold -= 500; t.level = 3; t.master = true; t.damage *= 2; t.range *= 1.3;
       if(t.type === TowerType.ARCHER) t.speed *= 0.5;
       if(t.type === TowerType.BLITZ) t.ammoMax += 2;
       if(t.type === TowerType.BARRACKS) soldiersRef.current.filter(s=>s.ownerId===t.id).forEach(s=>{s.maxHp=150; s.hp=150; s.dmg=15;});
     } else if ((type === 'A' || type === 'B') && stateRef.current.gold >= 100) {
        stateRef.current.gold -= 100; t.level = 2; t.special = type;
        if(type === 'A' && t.type === TowerType.ARCHER) t.range *= 1.3;
        if(type === 'A' && t.type === TowerType.KNIGHT) t.speed *= 0.8;
        if(type === 'B' && t.type === TowerType.KNIGHT) { t.damage *= 2; t.speed *= 1.2; }
     }
     setMoney(stateRef.current.gold);
  };
  
  const useGoodie = (type: 'arrow'|'tax'|'ice') => {
    const g = stateRef.current.goodies;
    if(type === 'arrow' && g.arrow <= 0) {
       g.arrow = 1800; 
       enemiesRef.current.forEach(e => e.hp -= 100);
       particlesRef.current.push({id:Math.random().toString(), x:GRID_W*CELL_SIZE/2, y:GRID_H*CELL_SIZE/2, type:'pulse', color:'#fff', size: 300, vx:0, vy:0, life:20, maxLife:20});
    }
    if(type === 'tax' && g.tax <= 0) {
       g.tax = 2700; stateRef.current.gold += 100; setMoney(stateRef.current.gold);
       particlesRef.current.push({id:Math.random().toString(), x:GRID_W*CELL_SIZE/2, y:GRID_H*CELL_SIZE/2, type:'text', color:'#fbbf24', text:'+100g', vx:0, vy:0, life:60, maxLife:60, size:0});
    }
    if(type === 'ice' && g.ice <= 0) { g.ice = 3600; }
    setGoodieCooldowns({...g});
  };

  const upgradeCitadel = () => {
    if(stateRef.current.gold >= 2500) {
      stateRef.current.gold -= 2500;
      stateRef.current.citadelLevel += 1;
      setMoney(stateRef.current.gold);
      setCitadelLevel(stateRef.current.citadelLevel);
    }
  };

  const getTowerAt = (x: number, y: number) => {
     const gx = Math.floor(x/CELL_SIZE), gy = Math.floor(y/CELL_SIZE);
     return towersRef.current.find(t => t.gx === gx && t.gy === gy);
  };

  return {
    money, lives, wave, gameOver, citadelLevel, season,
    isPaused, setIsPaused, speedMulti, setSpeedMulti, waveActive,
    startWave, buildTower, sellTower, upgradeTower, upgradeCitadel, useGoodie, getTowerAt,
    goodieCooldowns,
    resetGame: () => initGame()
  };
};
