import * as THREE from 'three';
import { LevelGenerator, GateSide, EnemyData } from './level';
import { CrowdManager } from './crowd';
import { AudioManager } from './audio';
import { Skin, Theme, GameState, BossHealthInfo } from '../types';

export interface GameCallbacks {
  onStateChange?: (state: GameState) => void;
  onCountChange?: (count: number) => void;
  onCoinsChange?: (coins: number) => void;
  onLevelChange?: (level: number) => void;
  onUpgradesChange?: (crowdUpgrade: number, strengthUpgrade: number) => void;
  onSkinsChange?: (skins: Skin[], equippedSkin: string) => void;
  onThemesChange?: (themes: Theme[], equippedTheme: string) => void;
  onBossHealthChange?: (info: BossHealthInfo | null) => void;
  onFloatingText?: (text: string, color: string) => void;
  onScreenShake?: (intensity: number) => void;
  onWin?: (earnedCoins: number) => void;
  onLose?: () => void;
}

export class Game {
  scene: THREE.Scene | null = null;
  camera: THREE.PerspectiveCamera | null = null;
  renderer: THREE.WebGLRenderer | null = null;
  clock = new THREE.Clock();
  directionalLight: THREE.DirectionalLight | null = null;
  animationFrameId: number | null = null;

  state: GameState = 'menu';
  level = 1;
  coins = 0;
  crowdUpgrade = 1;
  strengthUpgrade = 1;

  skins: Skin[] = [
    { id: 'blue', name: 'Classic Blue', color: 0x2196F3, price: 0, owned: true },
    { id: 'green', name: 'Forest', color: 0x4CAF50, price: 10, owned: false },
    { id: 'orange', name: 'Sunset', color: 0xFF9800, price: 10, owned: false },
    { id: 'purple', name: 'Royal', color: 0x9C27B0, price: 15, owned: false },
    { id: 'pink', name: 'Bubblegum', color: 0xE91E63, price: 15, owned: false },
    { id: 'cyan', name: 'Ice', color: 0x00BCD4, price: 20, owned: false },
    { id: 'yellow', name: 'Gold', color: 0xFFEB3B, price: 20, owned: false },
    { id: 'white', name: 'Ghost', color: 0xFFFFFF, price: 25, owned: false },
    { id: 'black', name: 'Shadow', color: 0x333333, price: 25, owned: false },
    { id: 'rainbow', name: 'Rainbow', color: 0xFF1744, price: 0, owned: false, shareUnlock: true },
  ];
  equippedSkin = 'blue';

  themes: Theme[] = [
    { id: 'default', name: 'Day', colors: ['#1a0533', '#4a90d9', '#87CEEB', '#b8e4f0', '#f0f8ff'], fog: 0xb8e4f0, ground: 0x66BB6A, price: 0, owned: true },
    { id: 'sunset', name: 'Sunset', colors: ['#1a0011', '#ff6b35', '#ff8c61', '#ffc89e', '#fff3e0'], fog: 0xffc89e, ground: 0x8D6E63, price: 15, owned: false },
    { id: 'night', name: 'Night', colors: ['#000011', '#0d1b2a', '#1b2838', '#2d4059', '#3d5a80'], fog: 0x1b2838, ground: 0x2E7D32, price: 15, owned: false },
    { id: 'candy', name: 'Candy', colors: ['#4a0072', '#c51162', '#ff6090', '#ff80ab', '#ffe0f0'], fog: 0xff80ab, ground: 0x81C784, price: 20, owned: false },
    { id: 'ocean', name: 'Ocean', colors: ['#001a33', '#003366', '#006699', '#3399cc', '#99ccff'], fog: 0x3399cc, ground: 0x26A69A, price: 20, owned: false },
    { id: 'volcano', name: 'Volcano', colors: ['#1a0000', '#4d0000', '#800000', '#cc3300', '#ff6600'], fog: 0xcc3300, ground: 0x5D4037, price: 25, owned: false },
  ];
  equippedTheme = 'default';

  fightingEnemy: EnemyData | null = null;
  fightTimer = 0;
  fightInterval = 0.12;
  fightCameraTime = 0;

  playerX = 0;
  speed = 9;
  trackZ = 0;
  trackLength = 200;

  isDragging = false;
  lastInputX = 0;
  keys: Record<string, boolean> = {};

  levelGenerator: LevelGenerator | null = null;
  crowdManager: CrowdManager | null = null;
  audio: AudioManager;
  callbacks: GameCallbacks;

  private boundOnResize: () => void;
  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private boundOnKeyUp: (e: KeyboardEvent) => void;

  constructor(callbacks: GameCallbacks = {}) {
    this.callbacks = callbacks;
    this.audio = new AudioManager();
    this.loadProgress();

    this.boundOnResize = this.onResize.bind(this);
    this.boundOnKeyDown = (e) => { this.keys[e.key] = true; };
    this.boundOnKeyUp = (e) => { this.keys[e.key] = false; };
  }

  init(canvas: HTMLCanvasElement) {
    this.setupRenderer(canvas);
    this.setupScene();
    this.setupCamera();
    this.setupLights();
    this.setupInput(canvas);

    this.crowdManager = new CrowdManager(this.scene!, this);
    this.levelGenerator = new LevelGenerator(this.scene!, this);

    this.notifyAll();
    this.animate();
  }

  notifyAll() {
    this.callbacks.onStateChange?.(this.state);
    this.callbacks.onLevelChange?.(this.level);
    this.callbacks.onCoinsChange?.(this.coins);
    this.callbacks.onUpgradesChange?.(this.crowdUpgrade, this.strengthUpgrade);
    this.callbacks.onSkinsChange?.([...this.skins], this.equippedSkin);
    this.callbacks.onThemesChange?.([...this.themes], this.equippedTheme);
    this.callbacks.onCountChange?.(this.crowdManager?.getPlayerCount() ?? this.getStartingCrowdSize());
  }

  setupRenderer(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    window.addEventListener('resize', this.boundOnResize);
  }

  onResize() {
    if (!this.renderer || !this.camera) return;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.applyTheme();
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
    this.camera.position.set(0, 12, 15);
    this.camera.lookAt(0, 0, -10);
  }

  setupLights() {
    if (!this.scene) return;
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xfff5e0, 1.0);
    directional.position.set(10, 20, 10);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 100;
    directional.shadow.camera.left = -30;
    directional.shadow.camera.right = 30;
    directional.shadow.camera.top = 30;
    directional.shadow.camera.bottom = -30;
    this.scene.add(directional);
    this.directionalLight = directional;

    const sunGeo = new THREE.SphereGeometry(3, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFEB3B });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(40, 45, -80);
    this.scene.add(sun);

    const glowGeo = new THREE.SphereGeometry(5, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xFFF9C4,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(40, 45, -80);
    this.scene.add(glow);

    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x66BB6A, 0.3);
    this.scene.add(hemi);
  }

  setupInput(canvas: HTMLCanvasElement) {
    canvas.addEventListener('mousedown', (e) => {
      if (this.state !== 'playing') return;
      this.isDragging = true;
      this.lastInputX = e.clientX;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging || this.state !== 'playing') return;
      const deltaX = (e.clientX - this.lastInputX) * 0.02;
      this.playerX = Math.max(-3.5, Math.min(3.5, this.playerX + deltaX));
      this.lastInputX = e.clientX;
    });

    canvas.addEventListener('mouseup', () => { this.isDragging = false; });
    canvas.addEventListener('mouseleave', () => { this.isDragging = false; });

    canvas.addEventListener('touchstart', (e) => {
      if (this.state !== 'playing') return;
      this.isDragging = true;
      this.lastInputX = e.touches[0].clientX;
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || this.state !== 'playing') return;
      e.preventDefault();
      const deltaX = (e.touches[0].clientX - this.lastInputX) * 0.02;
      this.playerX = Math.max(-3.5, Math.min(3.5, this.playerX + deltaX));
      this.lastInputX = e.touches[0].clientX;
    }, { passive: false });

    canvas.addEventListener('touchend', () => { this.isDragging = false; });

    window.addEventListener('keydown', this.boundOnKeyDown);
    window.addEventListener('keyup', this.boundOnKeyUp);
  }

  startGame() {
    this.state = 'playing';
    this.trackZ = 0;
    this.playerX = 0;
    this.speed = 9;

    this.audio.init();
    this.audio.resume();
    this.audio.startMusic();

    this.clearLevel();

    this.trackLength = 150 + this.level * 30;
    this.levelGenerator?.generate(this.level, this.trackLength);

    const startCount = this.getStartingCrowdSize();
    this.crowdManager?.createPlayerCrowd(startCount);

    this.callbacks.onStateChange?.(this.state);
    this.callbacks.onCountChange?.(startCount);
    this.callbacks.onBossHealthChange?.(null);
  }

  getStartingCrowdSize(): number {
    return 1 + (this.crowdUpgrade - 1) * 3;
  }

  clearLevel() {
    if (!this.scene) return;
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if (obj.userData.dynamic) {
        toRemove.push(obj);
      }
    });

    toRemove.forEach(obj => {
      this.scene?.remove(obj);
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    this.crowdManager?.clear();
    this.levelGenerator?.clear();
  }

  update(delta: number) {
    if (this.state === 'boss_defeated') {
      this.crowdManager?.update(delta);
      this.levelGenerator?.updateBossDefeat(delta);
      return;
    }

    if (this.state === 'fighting') {
      this.updateFight(delta);
      this.crowdManager?.update(delta);
      this.callbacks.onCountChange?.(this.crowdManager?.getPlayerCount() ?? 0);

      if (this.camera) {
        this.fightCameraTime = (this.fightCameraTime || 0) + delta;
        const shakeX = Math.sin(this.fightCameraTime * 25) * 0.15;
        const shakeY = Math.cos(this.fightCameraTime * 30) * 0.08;
        this.camera.position.x = this.playerX * 0.3 + shakeX;
        this.camera.position.z = -this.trackZ + 12;
        this.camera.position.y = 10 + shakeY;
        this.camera.lookAt(this.playerX * 0.3, 1, -this.trackZ - 5);
      }
      return;
    }

    if (this.state !== 'playing') return;

    if (this.keys['ArrowLeft'] || this.keys['a']) {
      this.playerX = Math.max(-3.5, this.playerX - 8 * delta);
    }
    if (this.keys['ArrowRight'] || this.keys['d']) {
      this.playerX = Math.min(3.5, this.playerX + 8 * delta);
    }

    this.trackZ += this.speed * delta;
    this.crowdManager?.updatePlayerPosition(this.playerX, -this.trackZ);

    if (this.camera) {
      this.camera.position.x = this.playerX * 0.3;
      this.camera.position.z = -this.trackZ + 15;
      this.camera.lookAt(this.playerX * 0.3, 0, -this.trackZ - 10);
    }

    if (this.directionalLight) {
      this.directionalLight.position.set(this.playerX + 10, 20, -this.trackZ + 10);
      this.directionalLight.target.position.set(this.playerX, 0, -this.trackZ);
      this.directionalLight.target.updateMatrixWorld();
    }

    this.checkGateCollisions();
    this.checkObstacleCollisions();
    this.checkEnemyCollisions();

    if (this.trackZ >= this.trackLength) {
      this.checkBossFight();
    }

    this.crowdManager?.update(delta);
    this.callbacks.onCountChange?.(this.crowdManager?.getPlayerCount() ?? 0);
  }

  checkGateCollisions() {
    if (!this.levelGenerator) return;
    const gates = this.levelGenerator.gates;
    for (let i = gates.length - 1; i >= 0; i--) {
      const gate = gates[i];
      if (gate.passed) continue;

      const gateZ = -gate.z;
      const playerZ = -this.trackZ;

      if (Math.abs(playerZ - gateZ) < 1.0) {
        if (this.playerX < 0 && gate.leftGate) {
          this.applyGate(gate.leftGate);
          gate.passed = true;
          this.highlightGate(gate, 'left');
        } else if (this.playerX >= 0 && gate.rightGate) {
          this.applyGate(gate.rightGate);
          gate.passed = true;
          this.highlightGate(gate, 'right');
        }
      }
    }
  }

  applyGate(gateData: GateSide) {
    if (!this.crowdManager) return;
    const currentCount = this.crowdManager.getPlayerCount();
    let newCount = currentCount;

    switch (gateData.op) {
      case '+': newCount = currentCount + gateData.value; break;
      case '-': newCount = Math.max(1, currentCount - gateData.value); break;
      case '*': newCount = currentCount * gateData.value; break;
      case '/': newCount = Math.max(1, Math.floor(currentCount / gateData.value)); break;
    }

    newCount = Math.min(newCount, 200);

    if (newCount > currentCount) {
      this.crowdManager.addToPlayerCrowd(newCount - currentCount);
      this.audio.playGateGood();
      this.callbacks.onFloatingText?.(`+${newCount - currentCount}`, '#4CAF50');
      this.callbacks.onScreenShake?.(3);
    } else if (newCount < currentCount) {
      this.crowdManager.removeFromPlayerCrowd(currentCount - newCount);
      this.audio.playGateBad();
      this.callbacks.onFloatingText?.(`-${currentCount - newCount}`, '#f44336');
      this.callbacks.onScreenShake?.(5);
    }
  }

  highlightGate(gate: { leftMesh: THREE.Mesh | null; rightMesh: THREE.Mesh | null }, side: 'left' | 'right') {
    const mesh = side === 'left' ? gate.leftMesh : gate.rightMesh;
    if (mesh && (mesh.material as THREE.MeshStandardMaterial).emissive) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive = new THREE.Color(0xffffff);
      mat.emissiveIntensity = 0.5;
      setTimeout(() => {
        if (mat) {
          mat.emissiveIntensity = 0;
        }
      }, 300);
    }
  }

  checkObstacleCollisions() {
    if (!this.levelGenerator || !this.crowdManager) return;
    const obstacles = this.levelGenerator.obstacles;
    for (const obs of obstacles) {
      if (obs.passed) continue;
      const obsZ = -obs.z;
      const playerZ = -this.trackZ;

      if (Math.abs(playerZ - obsZ) < 1.5) {
        const playerLeft = this.playerX - 1.5;
        const playerRight = this.playerX + 1.5;
        const obsLeft = obs.x - obs.width / 2;
        const obsRight = obs.x + obs.width / 2;

        if (playerRight > obsLeft && playerLeft < obsRight) {
          const loss = Math.ceil(this.crowdManager.getPlayerCount() * 0.3);
          this.crowdManager.removeFromPlayerCrowd(loss);
          obs.passed = true;
          this.audio.playHit();
          this.callbacks.onScreenShake?.(8);
          this.callbacks.onFloatingText?.(`-${loss}`, '#ff5722');

          if (this.crowdManager.getPlayerCount() <= 0) {
            this.loseGame();
          }
        }
      }
    }
  }

  checkEnemyCollisions() {
    if (!this.levelGenerator || !this.crowdManager) return;
    const enemies = this.levelGenerator.enemies;
    for (const enemy of enemies) {
      if (enemy.defeated) continue;
      const enemyZ = -enemy.z;
      const playerZ = -this.trackZ;

      if (Math.abs(playerZ - enemyZ) < 2.0) {
        this.state = 'fighting';
        this.callbacks.onStateChange?.('fighting');
        this.fightingEnemy = enemy;
        this.fightingEnemy.remainingCount = enemy.count;
        this.fightTimer = 0;
        this.fightCameraTime = 0;
        this.speed = 0;
        this.audio.playHit();
        this.callbacks.onScreenShake?.(10);

        this.crowdManager.spawnImpactFlash(
          new THREE.Vector3(this.playerX, 1, -this.trackZ), 0xFFFFFF
        );
        this.crowdManager.spawnSparks(
          new THREE.Vector3(this.playerX, 1, -this.trackZ), 0xFFAA00, 10
        );
        return;
      }
    }
  }

  updateFight(delta: number) {
    if (!this.crowdManager || !this.levelGenerator) return;
    this.fightTimer += delta;

    if (this.fightTimer >= this.fightInterval) {
      this.fightTimer -= this.fightInterval;

      const enemy = this.fightingEnemy;
      if (!enemy || enemy.remainingCount === undefined) return;

      const strength = this.strengthUpgrade;
      const enemyKills = Math.min(strength, enemy.remainingCount);
      enemy.remainingCount -= enemyKills;

      if (enemy.remainingCount > 0) {
        this.crowdManager.removeFromPlayerCrowd(1);
        this.crowdManager.spawnDeathEffect(this.playerX, -this.trackZ, 0x2196F3);
      }

      if (enemyKills > 0) {
        const enemyX = (Math.random() - 0.5) * 3;
        this.crowdManager.spawnDeathEffect(enemyX, -enemy.z, 0xf44336);
        this.audio.playFightHit();
      }

      if (enemy.isBoss) {
        this.callbacks.onBossHealthChange?.({
          remaining: enemy.remainingCount,
          max: enemy.count
        });
        this.levelGenerator.shakeBoss();
      } else {
        this.levelGenerator.updateEnemyLabel(enemy);
      }

      if (enemy.remainingCount <= 0) {
        enemy.defeated = true;
        if (enemy.isBoss) {
          this.callbacks.onBossHealthChange?.(null);
          this.levelGenerator.playBossDefeatAnimation();
          this.callbacks.onScreenShake?.(15);
          this.crowdManager.spawnSparks(
            new THREE.Vector3(0, 3, -enemy.z), 0x9C27B0, 20
          );
          setTimeout(() => this.winGame(), 1200);
          this.state = 'boss_defeated';
          this.callbacks.onStateChange?.('boss_defeated');
          this.fightingEnemy = null;
          this.fightCameraTime = 0;
        } else {
          this.crowdManager.removeEnemyCrowd(enemy);
          this.state = 'playing';
          this.callbacks.onStateChange?.('playing');
          this.speed = 9;
          this.fightingEnemy = null;
          this.fightCameraTime = 0;
          if (this.camera) this.camera.position.y = 12;
        }
      } else if (this.crowdManager.getPlayerCount() <= 0) {
        this.callbacks.onBossHealthChange?.(null);
        this.loseGame();
        this.fightingEnemy = null;
        this.fightCameraTime = 0;
      }
    }
  }

  checkBossFight() {
    if (!this.levelGenerator) return;
    const boss = this.levelGenerator.boss;
    if (!boss || boss.defeated) {
      this.winGame();
      return;
    }

    this.state = 'fighting';
    this.callbacks.onStateChange?.('fighting');
    this.audio.playBossAppear();
    this.callbacks.onScreenShake?.(12);
    this.fightCameraTime = 0;
    this.fightingEnemy = {
      z: boss.z,
      count: boss.health,
      remainingCount: boss.health,
      defeated: false,
      isBoss: true,
      meshGroup: null
    };
    this.fightTimer = 0;
    this.speed = 0;

    this.callbacks.onBossHealthChange?.({
      remaining: boss.health,
      max: boss.health
    });

    const originalCheck = this.fightingEnemy;
    Object.defineProperty(originalCheck, 'defeated', {
      get: () => boss.defeated,
      set: (v) => { boss.defeated = v; }
    });
  }

  winGame() {
    this.state = 'win';
    const earnedCoins = Math.floor((this.crowdManager?.getPlayerCount() ?? 1) * 2 + this.level * 10);
    this.coins += earnedCoins;
    this.level++;
    this.saveProgress();
    this.audio.stopMusic();
    this.audio.playWin();

    this.callbacks.onStateChange?.('win');
    this.callbacks.onCoinsChange?.(this.coins);
    this.callbacks.onLevelChange?.(this.level);
    this.callbacks.onWin?.(earnedCoins);
  }

  loseGame() {
    this.state = 'lose';
    const earnedCoins = Math.floor(this.level * 2);
    this.coins += earnedCoins;
    this.saveProgress();
    this.audio.stopMusic();
    this.audio.playLose();

    this.callbacks.onStateChange?.('lose');
    this.callbacks.onCoinsChange?.(this.coins);
    this.callbacks.onLose?.();
  }

  upgradeCrowd(): boolean {
    const cost = this.crowdUpgrade * 50;
    if (this.coins >= cost) {
      this.coins -= cost;
      this.crowdUpgrade++;
      this.saveProgress();
      this.callbacks.onCoinsChange?.(this.coins);
      this.callbacks.onUpgradesChange?.(this.crowdUpgrade, this.strengthUpgrade);
      return true;
    }
    return false;
  }

  upgradeStrength(): boolean {
    const cost = this.strengthUpgrade * 75;
    if (this.coins >= cost) {
      this.coins -= cost;
      this.strengthUpgrade++;
      this.saveProgress();
      this.callbacks.onCoinsChange?.(this.coins);
      this.callbacks.onUpgradesChange?.(this.crowdUpgrade, this.strengthUpgrade);
      return true;
    }
    return false;
  }

  buySkin(skinId: string): boolean {
    const skin = this.skins.find(s => s.id === skinId);
    if (!skin || skin.owned || skin.shareUnlock) return false;
    if (this.coins < skin.price) return false;
    this.coins -= skin.price;
    skin.owned = true;
    this.equippedSkin = skinId;
    this.saveProgress();
    this.callbacks.onCoinsChange?.(this.coins);
    this.callbacks.onSkinsChange?.([...this.skins], this.equippedSkin);
    return true;
  }

  equipSkin(skinId: string): boolean {
    const skin = this.skins.find(s => s.id === skinId);
    if (!skin || !skin.owned) return false;
    this.equippedSkin = skinId;
    this.saveProgress();
    this.callbacks.onSkinsChange?.([...this.skins], this.equippedSkin);
    return true;
  }

  shareForSkin(skinId: string): boolean {
    const skin = this.skins.find(s => s.id === skinId);
    if (!skin || !skin.shareUnlock || skin.owned) return false;
    skin.owned = true;
    this.equippedSkin = skinId;
    this.saveProgress();
    this.callbacks.onSkinsChange?.([...this.skins], this.equippedSkin);
    return true;
  }

  buyTheme(themeId: string): boolean {
    const theme = this.themes.find(t => t.id === themeId);
    if (!theme || theme.owned) return false;
    if (this.coins < theme.price) return false;
    this.coins -= theme.price;
    theme.owned = true;
    this.equippedTheme = themeId;
    this.applyTheme();
    this.saveProgress();
    this.callbacks.onCoinsChange?.(this.coins);
    this.callbacks.onThemesChange?.([...this.themes], this.equippedTheme);
    return true;
  }

  equipTheme(themeId: string): boolean {
    const theme = this.themes.find(t => t.id === themeId);
    if (!theme || !theme.owned) return false;
    this.equippedTheme = themeId;
    this.applyTheme();
    this.saveProgress();
    this.callbacks.onThemesChange?.([...this.themes], this.equippedTheme);
    return true;
  }

  getPlayerColor(): number {
    const skin = this.skins.find(s => s.id === this.equippedSkin);
    return skin ? skin.color : 0x2196F3;
  }

  getActiveTheme(): Theme {
    return this.themes.find(t => t.id === this.equippedTheme) || this.themes[0];
  }

  applyTheme() {
    if (!this.scene) return;
    const theme = this.getActiveTheme();
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 1;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d');
    if (skyCtx) {
      const gradient = skyCtx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, theme.colors[0]);
      gradient.addColorStop(0.2, theme.colors[1]);
      gradient.addColorStop(0.5, theme.colors[2]);
      gradient.addColorStop(0.8, theme.colors[3]);
      gradient.addColorStop(1.0, theme.colors[4]);
      skyCtx.fillStyle = gradient;
      skyCtx.fillRect(0, 0, 1, 512);
    }
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    this.scene.background = skyTexture;
    this.scene.fog = new THREE.FogExp2(theme.fog, 0.006);
  }

  saveProgress() {
    const data = {
      level: this.level,
      coins: this.coins,
      crowdUpgrade: this.crowdUpgrade,
      strengthUpgrade: this.strengthUpgrade,
      ownedSkins: this.skins.filter(s => s.owned).map(s => s.id),
      equippedSkin: this.equippedSkin,
      ownedThemes: this.themes.filter(t => t.owned).map(t => t.id),
      equippedTheme: this.equippedTheme
    };
    try {
      localStorage.setItem('countMasters', JSON.stringify(data));
    } catch {}
  }

  loadProgress() {
    try {
      const data = localStorage.getItem('countMasters');
      if (data) {
        const parsed = JSON.parse(data);
        this.level = parsed.level || 1;
        this.coins = parsed.coins || 0;
        this.crowdUpgrade = parsed.crowdUpgrade || 1;
        this.strengthUpgrade = parsed.strengthUpgrade || 1;
        if (parsed.ownedSkins) {
          this.skins.forEach(s => { s.owned = parsed.ownedSkins.includes(s.id); });
        }
        if (parsed.equippedSkin) this.equippedSkin = parsed.equippedSkin;
        if (parsed.ownedThemes) {
          this.themes.forEach(t => { t.owned = parsed.ownedThemes.includes(t.id); });
        }
        if (parsed.equippedTheme) this.equippedTheme = parsed.equippedTheme;
      }
    } catch {}
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.update(delta);
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.boundOnResize);
    window.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('keyup', this.boundOnKeyUp);
    this.audio.stopMusic();
    this.clearLevel();
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
