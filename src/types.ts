export interface Skin {
  id: string;
  name: string;
  color: number;
  price: number;
  owned: boolean;
  shareUnlock?: boolean;
}

export interface Theme {
  id: string;
  name: string;
  colors: string[];
  fog: number;
  ground: number;
  price: number;
  owned: boolean;
}

export type GameState = 'menu' | 'playing' | 'fighting' | 'boss_defeated' | 'win' | 'lose';

export interface FloatingTextItem {
  id: number;
  text: string;
  color: string;
}

export interface BossHealthInfo {
  remaining: number;
  max: number;
}
