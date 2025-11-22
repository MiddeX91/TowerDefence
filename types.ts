
export enum TerrainType {
  GRASS = 0,
  WALL = 1,
  SWAMP = 2,
  POWER = 3, // Red tile (Damage boost)
  MINE = 4,  // Gold tile
  TREE = 5,
  WATER = 6,
  CASTLE_ZONE = 9
}

export enum TowerType {
  ARCHER = 'ARCHER',
  KNIGHT = 'KNIGHT',
  CROSSBOW = 'CROSSBOW',
  FIRE = 'FIRE',
  TAR = 'TAR',
  BLITZ = 'BLITZ',
  BARRACKS = 'BARRACKS',
  WALL = 'WALL'
}

export enum EnemyType {
  PEASANT = 'PEASANT',
  WOLF = 'WOLF',
  KNIGHT = 'KNIGHT',
  SPIDER = 'SPIDER',
  SKELETON = 'SKELETON',
  SNAKE = 'SNAKE',
  BOSS = 'BOSS',
  KOBOLD = 'KOBOLD'
}

export type Season = 'summer' | 'autumn' | 'winter' | 'spring';

export interface Vector2D {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
}

export interface Enemy extends Entity {
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  frozen: number; // frames
  slowTimer: number;
  burnStack: number;
  poisonStack: number;
  tarred: boolean;
  dead: boolean;
  reached: boolean;
  dx: number; // for direction flipping
  blockedBy: string | null; // ID of soldier blocking
  noiseOffset: number;
  armor: number;
}

export interface Soldier extends Entity {
  ownerId: string;
  hp: number;
  maxHp: number;
  dmg: number;
  targetId: string | null;
  spawnX: number;
  spawnY: number;
}

export interface Tower extends Entity {
  gx: number; // Grid X
  gy: number; // Grid Y
  type: TowerType;
  level: number;
  cooldown: number;
  damage: number;
  range: number;
  speed: number; // Attack speed (lower is faster)
  ammo: number; // For BLITZ
  ammoMax: number;
  master: boolean;
  special: string | null; // 'A' or 'B'
  strategy: 'FIRST' | 'STRONG' | 'WEAK';
  kills: number;
  damageDealt: number;
}

export interface Projectile extends Entity {
  targetId: string;
  damage: number;
  type: 'proj' | 'aoe' | 'poison' | 'fire' | 'melee' | 'pulse' | 'bolt'; // melee is instant, handled differently
  speed: number;
  active: boolean;
  color: string;
  sourceId: string;
}

export interface Particle extends Entity {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'spark' | 'smoke' | 'text' | 'bolt' | 'pulse' | 'bubble';
  text?: string;
}

export interface Critter extends Entity {
  vx: number;
  vy: number;
  icon: string;
  panic: number;
}

export interface GameState {
  grid: { type: TerrainType; variant: number }[][];
  wearMap: number[][]; // Visual wear on paths
  flowField: (number | null)[][]; // Pathfinding heat map
  gold: number;
  lives: number;
  wave: number;
  waveActive: boolean;
  season: Season;
  nextSeason: Season;
  seasonLerp: number;
  dayTime: number; // 0.0 (Day) to 0.7 (Night)
  citadelLevel: number; // Global damage mod
  nextBoss: EnemyType;
  goodies: {
    arrow: number; // Cooldown frames
    tax: number;
    ice: number;
  };
}
