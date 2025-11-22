
import { EnemyType, Season, TerrainType, TowerType } from './types';

export const CELL_SIZE = 32; 
export const GRID_W = 20;
export const GRID_H = 30;

// Updated to distinct colors to restore the "patchwork" (Flickenteppich) effect
export const PALETTES: Record<Season, { grass: string[], tree: string, water: string, icons: string[] }> = {
  summer: { 
    grass: ['#052e16', '#14532d', '#15803d', '#166534'], // Dark to Light Green
    tree: '#022c22', 
    water: '#1e40af', 
    icons: ['🌲', '🌳', '🌲'] 
  },
  autumn: { 
    grass: ['#451a03', '#713f12', '#854d0e', '#a16207'], // Dark Brown to Orange
    tree: '#7f1d1d', 
    water: '#1d4ed8', 
    icons: ['🍂', '🍁', '🎃'] 
  },
  winter: { 
    grass: ['#475569', '#64748b', '#94a3b8', '#cbd5e1'], // Dark Grey to White
    tree: '#1e293b', 
    water: '#bfdbfe', 
    icons: ['🌲', '❄️', '☃️'] 
  },
  spring: { 
    grass: ['#14532d', '#16a34a', '#22c55e', '#4ade80'], // Lush/Bright Green
    tree: '#15803d', 
    water: '#3b82f6', 
    icons: ['🌳', '🌸', '🌻'] 
  }
};

export const TOWER_STATS: Record<TowerType, { name: string, icon: string, cost: number, range: number, damage: number, speed: number, color: string, light: boolean, spawn?: boolean }> = {
  [TowerType.ARCHER]:   { name: 'Bogen', icon: '🏹', cost: 60, range: 4.5, damage: 15, speed: 45, color: '#a16207', light: false },
  [TowerType.KNIGHT]:   { name: 'Schwert', icon: '⚔️', cost: 80, range: 1.5, damage: 45, speed: 55, color: '#94a3b8', light: false },
  [TowerType.CROSSBOW]: { name: 'Armbrust', icon: '🎯', cost: 120, range: 7.5, damage: 80, speed: 90, color: '#451a03', light: false },
  [TowerType.FIRE]:     { name: 'Pech', icon: '🔥', cost: 150, range: 3.0, damage: 30, speed: 70, color: '#ea580c', light: true },
  [TowerType.TAR]:      { name: 'Teer', icon: '🍯', cost: 100, range: 4.0, damage: 0, speed: 40, color: '#1e1b4b', light: false },
  [TowerType.BLITZ]:    { name: 'Blitz', icon: '⚡', cost: 300, range: 3.0, damage: 0, speed: 600, color: '#0ea5e9', light: true },
  [TowerType.BARRACKS]: { name: 'Kaserne', icon: '🛡️', cost: 100, range: 2.5, damage: 0, speed: 600, color: '#374151', light: false, spawn: true },
  [TowerType.WALL]:     { name: 'Mauer', icon: '🧱', cost: 10, range: 0, damage: 0, speed: 0, color: '#525252', light: false }
};

export const ENEMY_STATS: Record<EnemyType, { name: string, hp: number, speed: number, reward: number, icon: string, armor: number, size: number, ignoreSlow?: boolean, immunePoison?: boolean }> = {
  [EnemyType.PEASANT]: { name: 'Bauer', hp: 30, speed: 1.5, reward: 2, icon: '🧟', armor: 0, size: 20 },
  [EnemyType.WOLF]:    { name: 'Wolf', hp: 20, speed: 2.8, reward: 3, icon: '🐺', armor: 0, size: 20 },
  [EnemyType.KNIGHT]:  { name: 'Ritter', hp: 90, speed: 0.9, reward: 7, icon: '🛡️', armor: 0.5, size: 20 },
  [EnemyType.SPIDER]:  { name: 'Spinne', hp: 40, speed: 2.2, reward: 5, icon: '🕷️', armor: 0.1, size: 18, ignoreSlow: true },
  [EnemyType.SKELETON]:{ name: 'Skelett', hp: 50, speed: 1.4, reward: 4, icon: '💀', armor: 0.2, size: 20, immunePoison: true },
  [EnemyType.SNAKE]:   { name: 'Schlange', hp: 35, speed: 3.0, reward: 5, icon: '🐍', armor: 0, size: 18 },
  [EnemyType.BOSS]:    { name: 'General', hp: 3000, speed: 0.6, reward: 100, icon: '👹', armor: 0.4, size: 40 },
  [EnemyType.KOBOLD]:  { name: 'Kobold', hp: 180, speed: 1.5, reward: 50, icon: '💰', armor: 0, size: 20 }
};

export const UPGRADES: Record<string, { A: string, B: string }> = {
  [TowerType.ARCHER]: { A: 'Langbogen (+30% Range)', B: 'Gift (0.5% HP/s)' },
  [TowerType.KNIGHT]: { A: 'Flink (+20% Speed)', B: 'Zweihänder (+100% Dmg)' },
  [TowerType.CROSSBOW]: { A: 'Panzerbrecher (Durchschlag)', B: 'Boss-Killer (3x Dmg)' },
  [TowerType.FIRE]: { A: 'Großer Kessel (+Radius)', B: 'Napalm (+Dmg)' },
  [TowerType.TAR]: { A: 'Hochdruck (+Range)', B: 'Klebe-Teer (+Slow)' },
  [TowerType.BLITZ]: { A: 'Spule (+Range)', B: 'Schnelllader (-20% CD)' },
  [TowerType.BARRACKS]: { A: 'Veteranen (+HP)', B: 'Drill (+Dmg)' }
};

export const ANIMALS = [{ icon: '🐑', speed: 0.3 }, { icon: '🐓', speed: 0.6 }, { icon: '🐇', speed: 0.8 }];
