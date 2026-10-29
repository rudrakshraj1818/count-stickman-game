import * as THREE from 'three';
import { LevelGenerator } from './level.js';
import { CrowdManager } from './crowd.js';
import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';

export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        // Game state
        this.state = 'menu'; // menu, playing, fighting, win, lose
        this.level = 1;
        this.coins = 0;

        // Hero Progression
        this.heroLevel = 1;
        this.heroXP = 0;
        this.heroMaxXP = 100;
        this.healthUpgrade = 1;   // Vitality (HP & Armor)
        this.crowdUpgrade = 1;    // Alias for compatibility
        this.strengthUpgrade = 1; // Weapon attack power
        this.calculateHeroStats();

        // Skins & Themes
        this.skins = [
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
        this.equippedSkin = 'blue';
        
        this.themes = [
            { id: 'default', name: 'Arcade Day', colors: ['#0284c7','#38bdf8','#7dd3fc','#bae6fd','#e0f2fe'], fog: 0x7dd3fc, ground: 0x3d9959, price: 0, owned: true },
            { id: 'sunset', name: 'Cyber Sunset', colors: ['#4c0519','#9f1239','#e11d48','#fb923c','#fef08a'], fog: 0xfb7185, ground: 0x881337, price: 15, owned: false },
            { id: 'night', name: 'Neon Night', colors: ['#0a192f','#172a45','#1e3a8a','#2563eb','#38bdf8'], fog: 0x1e3a8a, ground: 0x0f2d24, price: 15, owned: false },
            { id: 'candy', name: 'Sugar Rush', colors: ['#4a044e','#a21caf','#e879f9','#f472b6','#fce7f3'], fog: 0xf472b6, ground: 0x22543d, price: 20, owned: false },
            { id: 'ocean', name: 'Aqua Surge', colors: ['#082f49','#0369a1','#0284c7','#38bdf8','#a5f3fc'], fog: 0x38bdf8, ground: 0x134e4a, price: 20, owned: false },
            { id: 'volcano', name: 'Magma Core', colors: ['#450a0a','#991b1b','#c2410c','#f97316','#fdba74'], fog: 0xea580c, ground: 0x431407, price: 25, owned: false },
        ];
        this.equippedTheme = 'default';
        
        // Fighting state
        this.fightingEnemy = null;
        this.fightTimer = 0;
        this.fightCameraTime = 0;
        this.fightTickCount = 0;
        
        // 3-Lane Temple Run Movement
        this.currentLane = 0; // -1: Left, 0: Center, 1: Right
        this.LANE_WIDTH = 2.25;
        this.playerX = 0;
        this.laneChangeSpeed = 22;
        this.speed = 9;
        this.trackZ = 0;

        // Jump Mechanics
        this.isJumping = false;
        this.jumpY = 0;
        this.jumpVelocity = 0;
        this.GRAVITY = 32;
        this.JUMP_FORCE = 12.5;

        // Crouch / Slide Mechanics
        this.isSliding = false;
        this.slideTimer = 0;
        this.SLIDE_DURATION = 0.72;

        // Swipe & Touch Tracking
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.swipeTriggered = false;
        this.isDragging = false;
        this.keys = {};
        
        // Level
        this.levelGenerator = null;
        this.trackLength = 200;
        
        // Load saved data
        this.loadProgress();
    }

    calculateHeroStats() {
        const vitality = this.healthUpgrade || this.crowdUpgrade || 1;
        this.heroMaxHP = 100 + (vitality - 1) * 25 + (this.heroLevel - 1) * 15;
        this.heroHP = this.heroMaxHP;
        this.heroMaxArmor = 20 + (vitality - 1) * 15 + (this.heroLevel - 1) * 5;
        this.heroArmor = this.heroMaxArmor;
        this.heroAttack = 15 + (this.strengthUpgrade - 1) * 6 + (this.heroLevel - 1) * 3;
    }

    init() {
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        this.setupInput();
        
        this.ui = new UIManager(this);
        this.crowdManager = new CrowdManager(this.scene, this);
        this.levelGenerator = new LevelGenerator(this.scene, this);
        this.audio = new AudioManager();
        
        this.animate();
    }

    setupRenderer() {
        const canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.applyTheme();
    }

    setupCamera() {
        // True Third-Person Camera behind the single hero
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
        this.camera.position.set(0, 3.2, 5.8);
        this.camera.lookAt(0, 1.35, -14);
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.75);
        this.scene.add(ambient);

        const directional = new THREE.DirectionalLight(0xfff8ee, 1.25);
        directional.position.set(12, 24, 12);
        directional.castShadow = true;
        directional.shadow.mapSize.set(2048, 2048);
        directional.shadow.camera.near = 0.5;
        directional.shadow.camera.far = 120;
        directional.shadow.camera.left = -30;
        directional.shadow.camera.right = 30;
        directional.shadow.camera.top = 30;
        directional.shadow.camera.bottom = -30;
        this.scene.add(directional);
        this.directionalLight = directional;

        // Bright stylized arcade sun group (follows player in distance)
        this.sunGroup = new THREE.Group();
        const sunGeo = new THREE.SphereGeometry(4.2, 16, 16);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFF066 });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        this.sunGroup.add(sun);

        const coronaGeo = new THREE.RingGeometry(4.5, 7.5, 32);
        const coronaMat = new THREE.MeshBasicMaterial({ 
            color: 0xFFF9C4, 
            transparent: true, 
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const corona = new THREE.Mesh(coronaGeo, coronaMat);
        corona.position.z = 0.2;
        this.sunGroup.add(corona);

        this.sunGroup.position.set(35, 45, -120);
        this.scene.add(this.sunGroup);

        const theme = this.getActiveTheme();
        const hemi = new THREE.HemisphereLight(theme.fog || 0x7dd3fc, theme.ground || 0x3d9959, 0.55);
        this.scene.add(hemi);
        this.hemiLight = hemi;
    }

    changeLane(dir) {
        if (this.state !== 'playing') return;
        const prevLane = this.currentLane;
        this.currentLane = Math.max(-1, Math.min(1, this.currentLane + dir));
        if (this.currentLane !== prevLane && this.audio) {
            this.audio.playLaneChange();
        }
    }

    jump() {
        if (this.state !== 'playing') return;
        if (this.jumpY <= 0.05 && !this.isJumping) {
            this.isJumping = true;
            this.jumpVelocity = this.JUMP_FORCE;
            if (this.isSliding) {
                this.isSliding = false;
                this.slideTimer = 0;
            }
            if (this.audio) this.audio.playJump();
        }
    }

    slide() {
        if (this.state !== 'playing') return;
        if (this.isJumping || this.jumpY > 0.05) {
            // Fast downward drop from air
            this.jumpVelocity = -24;
        } else {
            this.isSliding = true;
            this.slideTimer = this.SLIDE_DURATION;
            if (this.audio) this.audio.playSlide();
        }
    }

    setupInput() {
        const canvas = this.renderer.domElement;
        
        // Mouse swipe gestures
        canvas.addEventListener('mousedown', (e) => {
            if (this.state !== 'playing') return;
            this.isDragging = true;
            this.touchStartX = e.clientX;
            this.touchStartY = e.clientY;
            this.swipeTriggered = false;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging || this.state !== 'playing') return;
            const dx = e.clientX - this.touchStartX;
            const dy = e.clientY - this.touchStartY;
            const dist = Math.hypot(dx, dy);

            if (!this.swipeTriggered && dist >= 32) {
                this.swipeTriggered = true;
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx > 0) this.changeLane(1);
                    else this.changeLane(-1);
                } else {
                    if (dy < 0) this.jump();
                    else this.slide();
                }
                this.touchStartX = e.clientX;
                this.touchStartY = e.clientY;
                this.swipeTriggered = false;
            }
        });

        canvas.addEventListener('mouseup', () => { this.isDragging = false; });
        canvas.addEventListener('mouseleave', () => { this.isDragging = false; });

        // Touch swipe gestures
        canvas.addEventListener('touchstart', (e) => {
            if (this.state !== 'playing') return;
            this.isDragging = true;
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.swipeTriggered = false;
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            if (!this.isDragging || this.state !== 'playing') return;
            const touch = e.touches[0];
            const dx = touch.clientX - this.touchStartX;
            const dy = touch.clientY - this.touchStartY;
            const dist = Math.hypot(dx, dy);

            if (!this.swipeTriggered && dist >= 30) {
                this.swipeTriggered = true;
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (dx > 0) this.changeLane(1);
                    else this.changeLane(-1);
                } else {
                    if (dy < 0) this.jump();
                    else this.slide();
                }
                this.touchStartX = touch.clientX;
                this.touchStartY = touch.clientY;
                this.swipeTriggered = false;
            }
        }, { passive: true });

        canvas.addEventListener('touchend', () => { this.isDragging = false; });

        // Keyboard controls (Discrete lane switches & jump/slide)
        window.addEventListener('keydown', (e) => {
            if (this.state !== 'playing' || e.repeat) return;
            const key = e.key.toLowerCase();

            if (key === 'arrowleft' || key === 'a') {
                this.changeLane(-1);
            } else if (key === 'arrowright' || key === 'd') {
                this.changeLane(1);
            } else if (key === 'arrowup' || key === 'w' || e.key === ' ') {
                e.preventDefault();
                this.jump();
            } else if (key === 'arrowdown' || key === 's') {
                e.preventDefault();
                this.slide();
            }
        });
    }

    startGame() {
        this.state = 'playing';
        this.trackZ = 0;
        this.currentLane = 0;
        this.playerX = 0;
        this.speed = 9;
        this.isJumping = false;
        this.jumpY = 0;
        this.jumpVelocity = 0;
        this.isSliding = false;
        this.slideTimer = 0;
        
        // Audio
        this.audio.init();
        this.audio.resume();
        this.audio.startMusic();
        
        // Reset hero stats for the run
        this.calculateHeroStats();

        // Clear scene objects
        this.clearLevel();
        
        // Generate level
        this.trackLength = 150 + this.level * 30;
        this.levelGenerator.generate(this.level, this.trackLength);
        
        // Create single player hero
        this.crowdManager.createPlayerCrowd();
        
        this.ui.showHUD();
        this.ui.updateHUDInfo();
    }

    clearLevel() {
        const toRemove = [];
        this.scene.traverse((obj) => {
            if (obj.userData.dynamic) {
                toRemove.push(obj);
            }
        });
        toRemove.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        this.crowdManager.clear();
        this.levelGenerator.clear();
    }

    update(delta) {
        if (this.state === 'boss_defeated') {
            this.crowdManager.update(delta);
            this.levelGenerator.updateBossDefeat(delta);
            return;
        }

        if (this.state === 'fighting') {
            this.updateFight(delta);
            this.crowdManager.update(delta, true, this.fightingEnemy, this.playerX, this.trackZ);
            this.levelGenerator.updateEnemies(delta, true, this.fightingEnemy, this.playerX, this.trackZ, this.crowdManager);
            this.ui.updateHUDInfo();
            
            // Third-Person Camera during fight
            const pathCenterX = this.levelGenerator ? this.levelGenerator.getPathCenterX(this.trackZ) : 0;
            const heroWorldX = pathCenterX + this.playerX;
            this.fightCameraTime = (this.fightCameraTime || 0) + delta;
            const shakeX = Math.sin(this.fightCameraTime * 25) * 0.08;
            const shakeY = Math.cos(this.fightCameraTime * 30) * 0.05;
            this.camera.position.x = heroWorldX * 0.65 + shakeX;
            this.camera.position.z = -this.trackZ + 5.0;
            this.camera.position.y = 2.8 + shakeY;
            this.camera.lookAt(heroWorldX * 0.3, 1.25, -this.trackZ - 6);
            return;
        }

        if (this.state !== 'playing') return;

        // Smooth 3-lane interpolation
        const targetLaneX = this.currentLane * this.LANE_WIDTH;
        this.playerX = THREE.MathUtils.damp(this.playerX, targetLaneX, this.laneChangeSpeed, delta);
        this.playerX = Math.max(-this.LANE_WIDTH, Math.min(this.LANE_WIDTH, this.playerX));

        // Parabolic Jump kinematics
        if (this.isJumping || this.jumpY > 0) {
            this.jumpVelocity -= this.GRAVITY * delta;
            this.jumpY += this.jumpVelocity * delta;
            if (this.jumpY <= 0) {
                this.jumpY = 0;
                this.jumpVelocity = 0;
                this.isJumping = false;
            }
        }

        // Crouch / Slide duration timer
        if (this.isSliding) {
            this.slideTimer -= delta;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.slideTimer = 0;
            }
        }

        // Move forward continuously
        this.trackZ += this.speed * delta;

        // Update single hero world position along natural curving temple road
        const pathCenterX = this.levelGenerator ? this.levelGenerator.getPathCenterX(this.trackZ) : 0;
        const roadAngle = (this.levelGenerator && this.levelGenerator.getPathTangentAngle) ? this.levelGenerator.getPathTangentAngle(this.trackZ) : 0;
        const heroWorldX = pathCenterX + this.playerX;
        this.crowdManager.updatePlayerPosition(heroWorldX, -this.trackZ, this.jumpY, this.isSliding, roadAngle);

        // Third-Person Camera follow behind hero with forward road curve look-ahead and jump offset
        const targetCamX = heroWorldX * 0.85;
        const targetCamY = 3.3 + this.jumpY * 0.35;
        const targetCamZ = -this.trackZ + 5.8;

        this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, delta * 12);
        this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, delta * 8);
        this.camera.position.z = targetCamZ;

        const aheadZ = this.trackZ + 18;
        const aheadPathX = this.levelGenerator ? this.levelGenerator.getPathCenterX(aheadZ) : 0;
        const lookTargetX = aheadPathX + this.playerX * 0.35;
        const lookTargetY = 1.35;
        const lookTargetZ = -this.trackZ - 14;
        this.camera.lookAt(lookTargetX, lookTargetY, lookTargetZ);

        // Update light position to follow hero
        this.directionalLight.position.set(
            heroWorldX + 12,
            22,
            -this.trackZ + 12
        );
        this.directionalLight.target.position.set(heroWorldX, 0, -this.trackZ);
        this.directionalLight.target.updateMatrixWorld();

        // Keep sun visible in the sky ahead
        if (this.sunGroup) {
            this.sunGroup.position.set(35, 45, -this.trackZ - 120);
        }

        // Smooth gradual environmental atmosphere transitions across the 3 zones
        this.updateEnvironmentAtmosphere(delta);

        // Check collisions for collectibles, obstacles, enemies
        this.checkCollectibleCollisions();
        this.checkObstacleCollisions();
        this.checkEnemyCollisions();

        // Check if reached end: sprint through the Grand Temple Sanctuary Victory Portal
        if (this.trackZ >= this.trackLength) {
            if (!this.levelGenerator.boss) {
                this.winGame();
            } else {
                this.checkBossFight();
            }
        }

        // Update hero running animation and dynamic level elements (coins spinning, relics bobbing)
        this.crowdManager.update(delta, false, null, this.playerX, this.trackZ);
        this.levelGenerator.updateEnemies(delta, false, null, this.playerX, this.trackZ, this.crowdManager);
        this.levelGenerator.update(delta);

        // Update HUD
        this.ui.updateHUDInfo();
    }

    updateEnvironmentAtmosphere(delta) {
        if (!this.scene || !this.scene.fog) return;
        const progress = Math.min(1, Math.max(0, this.trackZ / this.trackLength));

        let targetFogColor;
        let targetFogNear = 75;
        let targetFogFar = 220;
        let targetHemiSky;
        let targetHemiGround;

        if (progress < 0.35) {
            // Zone 1: Ancient Forest - Lush mist with sunlit green and blue hues
            const t = progress / 0.35;
            targetFogColor = new THREE.Color(0x7dd3fc).lerp(new THREE.Color(0x9bd8b5), t * 0.6);
            targetHemiSky = new THREE.Color(0x82dbf5);
            targetHemiGround = new THREE.Color(0x286338);
            targetFogNear = 80;
            targetFogFar = 220;
        } else if (progress < 0.70) {
            // Zone 2: Ancient Ruins - Warm golden antique stone haze
            const t = (progress - 0.35) / 0.35;
            targetFogColor = new THREE.Color(0x9bd8b5).lerp(new THREE.Color(0xd2b68c), t);
            targetHemiSky = new THREE.Color(0xf2d6a2);
            targetHemiGround = new THREE.Color(0x52422e);
            targetFogNear = 65;
            targetFogFar = 185;
        } else {
            // Zone 3: Magical Temple / Castle - Deep mysterious twilight sanctuary with glowing runes
            const t = Math.min(1, (progress - 0.70) / 0.30);
            targetFogColor = new THREE.Color(0xd2b68c).lerp(new THREE.Color(0x1a1832), t);
            targetHemiSky = new THREE.Color(0xf2d6a2).lerp(new THREE.Color(0x403c7a), t);
            targetHemiGround = new THREE.Color(0x52422e).lerp(new THREE.Color(0x10131f), t);
            targetFogNear = 50;
            targetFogFar = 150;
        }

        // Interpolate fog and ambient lighting gracefully
        this.scene.fog.color.lerp(targetFogColor, Math.min(1, delta * 2.0));
        this.scene.fog.near += (targetFogNear - this.scene.fog.near) * Math.min(1, delta * 2.0);
        this.scene.fog.far += (targetFogFar - this.scene.fog.far) * Math.min(1, delta * 2.0);

        if (this.renderer) {
            this.renderer.setClearColor(this.scene.fog.color, 1);
        }
        if (this.hemiLight && targetHemiSky && targetHemiGround) {
            this.hemiLight.color.lerp(targetHemiSky, Math.min(1, delta * 2.0));
            this.hemiLight.groundColor.lerp(targetHemiGround, Math.min(1, delta * 2.0));
        }
    }

    checkCollectibleCollisions() {
        if (!this.levelGenerator || !this.levelGenerator.collectibles) return;
        const collectibles = this.levelGenerator.collectibles;
        const pathCenterX = this.levelGenerator.getPathCenterX(this.trackZ);
        const heroWorldX = pathCenterX + this.playerX;
        const playerZ = this.trackZ;

        for (let i = collectibles.length - 1; i >= 0; i--) {
            const item = collectibles[i];
            if (item.collected) continue;

            const dz = Math.abs(item.z - playerZ);
            const inLane = (item.laneX !== undefined) 
                ? Math.abs(this.playerX - item.laneX) < 0.95
                : Math.abs(heroWorldX - item.x) < 0.95;

            if (inLane && dz < (item.radius || 1.15)) {
                item.collected = true;
                if (item.mesh) {
                    this.scene.remove(item.mesh);
                }

                if (item.type === 'coin') {
                    this.addCoins(item.value || 1);
                    this.audio.playGateGood();
                    this.ui.showFloatingText(`+${item.value || 1} 🪙`, '#ffd700');
                    const sparkPos = new THREE.Vector3(item.x, 0.9 + this.jumpY * 0.5, -item.z);
                    this.crowdManager.spawnSparks(sparkPos, 0xffd700, 6);
                } else if (item.type === 'health') {
                    this.healHero(item.value || 30);
                    this.audio.playGateGood();
                    this.ui.showFloatingText(`+${item.value || 30} HP`, '#00e676');
                    const flashPos = new THREE.Vector3(item.x, 1.1 + this.jumpY * 0.5, -item.z);
                    this.crowdManager.spawnImpactFlash(flashPos, 0x00e676);
                } else if (item.type === 'powerup') {
                    this.addHeroArmor(item.value || 25);
                    this.addHeroXP(35);
                    this.audio.playGateGood();
                    this.ui.showFloatingText('+25 SHIELD & XP ⭐', '#00f0ff');
                    const flashPos = new THREE.Vector3(item.x, 1.1 + this.jumpY * 0.5, -item.z);
                    this.crowdManager.spawnImpactFlash(flashPos, 0x00f0ff);
                }
                this.ui.updateHUDInfo();
            }
        }
    }

    applyGate(gateData) {
        if (!gateData) return;
        switch (gateData.type) {
            case 'xp':
                this.addHeroXP(gateData.value);
                this.audio.playGateGood();
                this.ui.showFloatingText(`+${gateData.value} XP`, '#00e5ff');
                break;
            case 'coins':
                this.addCoins(gateData.value);
                this.audio.playGateGood();
                this.ui.showFloatingText(`+${gateData.value} 🪙`, '#ffd700');
                break;
            case 'hp':
                this.healHero(gateData.value);
                this.audio.playGateGood();
                this.ui.showFloatingText(`+${gateData.value} HP`, '#00e676');
                break;
            case 'armor':
                this.addHeroArmor(gateData.value);
                this.audio.playGateGood();
                this.ui.showFloatingText(`+${gateData.value} SHIELD`, '#ab47bc');
                break;
            case 'hazard':
                this.damageHero(gateData.value);
                this.audio.playGateBad();
                this.ui.showFloatingText(`-${gateData.value} HP`, '#ff1744');
                this.ui.screenShake(6);
                break;
        }
        this.ui.updateHUDInfo();
    }

    addCoins(amount) {
        this.coins += amount;
        this.saveProgress();
    }

    addHeroXP(amount) {
        this.heroXP += amount;
        while (this.heroXP >= this.heroMaxXP) {
            this.heroXP -= this.heroMaxXP;
            this.heroLevel++;
            this.heroMaxXP = Math.floor(this.heroMaxXP * 1.35);
            this.heroMaxHP += 20;
            this.heroHP = this.heroMaxHP; // Full heal on level up
            this.heroAttack += 5;
            this.heroMaxArmor += 10;
            this.heroArmor = this.heroMaxArmor;
            this.audio.playWin();
            this.ui.showFloatingText(`⭐ LEVEL UP! Lv.${this.heroLevel}`, '#ffd700');
            this.ui.screenShake(6);
            this.crowdManager.triggerLevelUpEffect();
        }
        this.saveProgress();
        this.ui.updateHUDInfo();
    }

    healHero(amount) {
        this.heroHP = Math.min(this.heroMaxHP, this.heroHP + amount);
        this.ui.updateHUDInfo();
    }

    addHeroArmor(amount) {
        this.heroArmor = Math.min(this.heroMaxArmor * 1.5, this.heroArmor + amount);
        this.ui.updateHUDInfo();
    }

    damageHero(amount) {
        if (this.heroArmor > 0) {
            if (this.heroArmor >= amount) {
                this.heroArmor -= amount;
                amount = 0;
            } else {
                amount -= this.heroArmor;
                this.heroArmor = 0;
            }
        }
        if (amount > 0) {
            this.heroHP = Math.max(0, this.heroHP - amount);
        }
        this.ui.updateHUDInfo();
        if (this.heroHP <= 0) {
            this.loseGame();
        }
    }

    checkObstacleCollisions() {
        const obstacles = this.levelGenerator.obstacles;
        if (!obstacles) return;
        const pathCenterX = this.levelGenerator ? this.levelGenerator.getPathCenterX(this.trackZ) : 0;
        const heroWorldX = pathCenterX + this.playerX;

        for (const obs of obstacles) {
            if (obs.passed) continue;
            const dz = Math.abs(this.trackZ - obs.z);

            if (dz < 1.35) {
                const inLane = (obs.laneX !== undefined)
                    ? Math.abs(this.playerX - obs.laneX) < 0.9
                    : Math.abs(heroWorldX - obs.worldX) < (obs.width / 2 + 0.15);

                if (!inLane) continue;

                if (obs.obstacleType === 'low') {
                    // LOW OBSTACLE: Jump over to avoid!
                    if (this.jumpY > 0.72) {
                        obs.passed = true;
                        obs.avoided = true;
                        this.ui.showFloatingText('JUMP! 🦘', '#00f0ff');
                        const sparkPos = new THREE.Vector3(heroWorldX, 0.5, -this.trackZ);
                        this.crowdManager.spawnSparks(sparkPos, 0x00f0ff, 6);
                    } else {
                        // Failed to jump: collision!
                        obs.passed = true;
                        this.damageHero(25);
                        this.audio.playHit();
                        this.ui.screenShake(10);
                        this.ui.showFloatingText('TRIP! -25 HP', '#ff5722');
                        this.crowdManager.triggerStumble();
                    }
                } else if (obs.obstacleType === 'high') {
                    // HIGH OBSTACLE: Slide / crouch under to avoid!
                    if (this.isSliding) {
                        obs.passed = true;
                        obs.avoided = true;
                        this.ui.showFloatingText('SLIDE! 💨', '#00e676');
                        const sparkPos = new THREE.Vector3(heroWorldX, 0.25, -this.trackZ);
                        this.crowdManager.spawnSparks(sparkPos, 0x00e676, 6);
                    } else {
                        // Failed to slide: head bonk!
                        obs.passed = true;
                        this.damageHero(25);
                        this.audio.playHit();
                        this.ui.screenShake(10);
                        this.ui.showFloatingText('HEAD BONK! -25 HP', '#ff1744');
                        this.crowdManager.triggerStumble();
                    }
                } else {
                    // TALL OBSTACLE: Solid monolith/wall - cannot jump or slide, must switch lane!
                    obs.passed = true;
                    this.damageHero(30);
                    this.audio.playHit();
                    this.ui.screenShake(12);
                    this.ui.showFloatingText('CRASH! -30 HP', '#ff1744');
                    this.crowdManager.triggerStumble();
                }
            }
        }
    }

    checkEnemyCollisions() {
        const enemies = this.levelGenerator.enemies;
        if (!enemies) return;
        const pathCenterX = this.levelGenerator ? this.levelGenerator.getPathCenterX(this.trackZ) : 0;
        const heroWorldX = pathCenterX + this.playerX;

        for (const enemy of enemies) {
            if (enemy.defeated) continue;
            const enemyZ = -enemy.z;
            const playerZ = -this.trackZ;

            if (Math.abs(playerZ - enemyZ) < 1.8) {
                this.state = 'fighting';
                this.fightingEnemy = enemy;
                this.fightingEnemy.remainingCount = enemy.count;
                this.fightTimer = 0;
                this.fightCameraTime = 0;
                this.fightTickCount = 0;
                this.speed = 0;
                this.audio.playHit();
                this.ui.screenShake(8);

                const clashPos = new THREE.Vector3(heroWorldX, 0.9, -this.trackZ - 0.7);
                this.crowdManager.spawnImpactFlash(clashPos, 0xFFFFFF);
                this.crowdManager.spawnSlash(clashPos, null, 0x00f0ff, 1.4);
                this.crowdManager.spawnSparks(clashPos, 0xFFAA00, 10);
                return;
            }
        }
    }

    updateFight(delta) {
        const enemy = this.fightingEnemy;
        if (!enemy) return;

        this.fightTimer += delta;
        const strikeInterval = 0.12;

        if (this.fightTimer >= strikeInterval) {
            this.fightTimer -= strikeInterval;
            this.fightTickCount = (this.fightTickCount || 0) + 1;

            // Hero strikes enemies with weapon attack power
            const killsPerStrike = this.heroAttack >= 25 ? 2 : 1;
            const enemyKills = Math.min(killsPerStrike, enemy.remainingCount);
            enemy.remainingCount -= enemyKills;

            // Enemy strikes back at hero
            if (enemy.remainingCount > 0 && (this.fightTickCount % 2 === 0)) {
                const enemyDmg = Math.min(enemy.remainingCount * 2, 8);
                this.damageHero(enemyDmg);
                this.crowdManager.spawnDeathEffect(this.playerX, -this.trackZ, 0x00f0ff);
            }

            // Defeated enemy effects
            if (enemyKills > 0) {
                if (!enemy.isBoss) {
                    this.levelGenerator.removeEnemyStickman(enemy, enemyKills, this.crowdManager);
                }
                const enemyX = (Math.random() - 0.5) * 1.5;
                this.crowdManager.spawnDeathEffect(enemyX, -enemy.z, 0xf44336);
                this.audio.playFightHit();
            }

            // Update enemy label / boss bar
            if (enemy.isBoss) {
                this.ui.updateBossHealthBar(enemy.remainingCount, enemy.count);
                this.levelGenerator.shakeBoss();
            } else {
                this.levelGenerator.updateEnemyLabel(enemy);
            }

            // Check outcome
            if (enemy.remainingCount <= 0) {
                enemy.defeated = true;
                if (enemy.isBoss) {
                    this.ui.hideBossHealthBar();
                    this.levelGenerator.playBossDefeatAnimation();
                    this.ui.screenShake(14);
                    this.crowdManager.spawnSparks(new THREE.Vector3(0, 3, -enemy.z), 0x9C27B0, 20);
                    setTimeout(() => this.winGame(), 1200);
                    this.state = 'boss_defeated';
                    this.fightingEnemy = null;
                } else {
                    this.crowdManager.removeEnemyCrowd(enemy);
                    this.addHeroXP(35);
                    this.addCoins(10 + this.level * 2);
                    this.ui.showFloatingText('+35 XP', '#00e5ff');
                    this.state = 'playing';
                    this.speed = 9;
                    this.fightingEnemy = null;
                    this.fightCameraTime = 0;
                }
            } else if (this.heroHP <= 0) {
                this.ui.hideBossHealthBar();
                this.loseGame();
                this.fightingEnemy = null;
            }
        }

        this.crowdManager.updateParticles(delta);
    }

    checkBossFight() {
        const boss = this.levelGenerator.boss;
        if (!boss || boss.defeated) {
            this.winGame();
            return;
        }

        this.state = 'fighting';
        this.audio.playBossAppear();
        this.ui.screenShake(12);
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

        this.ui.showBossHealthBar(boss.health);

        const originalCheck = this.fightingEnemy;
        Object.defineProperty(originalCheck, 'defeated', {
            get: () => boss.defeated,
            set: (v) => { boss.defeated = v; }
        });
    }

    winGame() {
        this.state = 'win';
        const earnedCoins = Math.floor(15 + this.level * 10 + this.heroLevel * 5);
        this.coins += earnedCoins;
        this.level++;
        this.addHeroXP(50);
        this.saveProgress();
        this.audio.stopMusic();
        this.audio.playWin();
        this.ui.showWin(earnedCoins);
    }

    loseGame() {
        this.state = 'lose';
        const earnedCoins = Math.floor(this.level * 2);
        this.coins += earnedCoins;
        this.saveProgress();
        this.audio.stopMusic();
        this.audio.playLose();
        this.ui.showLose();
    }

    upgradecrowd() {
        // Alias for Hero Vitality (HP & Armor)
        const cost = this.healthUpgrade * 50;
        if (this.coins >= cost) {
            this.coins -= cost;
            this.healthUpgrade++;
            this.crowdUpgrade = this.healthUpgrade;
            this.calculateHeroStats();
            this.saveProgress();
            return true;
        }
        return false;
    }

    upgradeStrength() {
        // Hero Weapon Attack Power
        const cost = this.strengthUpgrade * 75;
        if (this.coins >= cost) {
            this.coins -= cost;
            this.strengthUpgrade++;
            this.calculateHeroStats();
            this.saveProgress();
            return true;
        }
        return false;
    }

    buySkin(skinId) {
        const skin = this.skins.find(s => s.id === skinId);
        if (!skin || skin.owned) return false;
        if (skin.shareUnlock) return false;
        if (this.coins < skin.price) return false;
        this.coins -= skin.price;
        skin.owned = true;
        this.equippedSkin = skinId;
        this.saveProgress();
        return true;
    }

    equipSkin(skinId) {
        const skin = this.skins.find(s => s.id === skinId);
        if (!skin || !skin.owned) return false;
        this.equippedSkin = skinId;
        this.saveProgress();
        return true;
    }

    shareForSkin(skinId) {
        const skin = this.skins.find(s => s.id === skinId);
        if (!skin || !skin.shareUnlock || skin.owned) return false;
        skin.owned = true;
        this.equippedSkin = skinId;
        this.saveProgress();
        return true;
    }

    buyTheme(themeId) {
        const theme = this.themes.find(t => t.id === themeId);
        if (!theme || theme.owned) return false;
        if (this.coins < theme.price) return false;
        this.coins -= theme.price;
        theme.owned = true;
        this.equippedTheme = themeId;
        this.applyTheme();
        this.saveProgress();
        return true;
    }

    equipTheme(themeId) {
        const theme = this.themes.find(t => t.id === themeId);
        if (!theme || !theme.owned) return false;
        this.equippedTheme = themeId;
        this.applyTheme();
        this.saveProgress();
        return true;
    }

    getPlayerColor() {
        const skin = this.skins.find(s => s.id === this.equippedSkin);
        return skin ? skin.color : 0x2196F3;
    }

    getActiveTheme() {
        return this.themes.find(t => t.id === this.equippedTheme) || this.themes[0];
    }

    applyTheme() {
        const theme = this.getActiveTheme();
        const skyCanvas = document.createElement('canvas');
        skyCanvas.width = 512;
        skyCanvas.height = 512;
        const skyCtx = skyCanvas.getContext('2d');
        const gradient = skyCtx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, theme.colors[0]);
        gradient.addColorStop(0.25, theme.colors[1]);
        gradient.addColorStop(0.55, theme.colors[2]);
        gradient.addColorStop(0.8, theme.colors[3]);
        gradient.addColorStop(1.0, theme.colors[4]);
        skyCtx.fillStyle = gradient;
        skyCtx.fillRect(0, 0, 512, 512);
        const skyTexture = new THREE.CanvasTexture(skyCanvas);
        skyTexture.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = skyTexture;
        if (this.renderer) {
            this.renderer.setClearColor(theme.fog || 0x7dd3fc, 1);
        }
        this.scene.fog = new THREE.Fog(theme.fog || 0x7dd3fc, 110, 280);

        if (this.hemiLight) {
            this.hemiLight.color.setHex(theme.fog || 0x7dd3fc);
            this.hemiLight.groundColor.setHex(theme.ground || 0x3d9959);
        }
    }

    saveProgress() {
        const data = {
            level: this.level,
            coins: this.coins,
            heroLevel: this.heroLevel,
            heroXP: this.heroXP,
            heroMaxXP: this.heroMaxXP,
            healthUpgrade: this.healthUpgrade,
            crowdUpgrade: this.healthUpgrade,
            strengthUpgrade: this.strengthUpgrade,
            ownedSkins: this.skins.filter(s => s.owned).map(s => s.id),
            equippedSkin: this.equippedSkin,
            ownedThemes: this.themes.filter(t => t.owned).map(t => t.id),
            equippedTheme: this.equippedTheme
        };
        localStorage.setItem('countMasters', JSON.stringify(data));
    }

    loadProgress() {
        const data = localStorage.getItem('countMasters');
        if (data) {
            const parsed = JSON.parse(data);
            this.level = parsed.level || 1;
            this.coins = parsed.coins || 0;
            this.heroLevel = parsed.heroLevel || 1;
            this.heroXP = parsed.heroXP || 0;
            this.heroMaxXP = parsed.heroMaxXP || 100;
            this.healthUpgrade = parsed.healthUpgrade || parsed.crowdUpgrade || 1;
            this.crowdUpgrade = this.healthUpgrade;
            this.strengthUpgrade = parsed.strengthUpgrade || 1;
            if (parsed.ownedSkins) {
                this.skins.forEach(s => { s.owned = parsed.ownedSkins.includes(s.id); });
            }
            if (parsed.equippedSkin) this.equippedSkin = parsed.equippedSkin;
            if (parsed.ownedThemes) {
                this.themes.forEach(t => { t.owned = parsed.ownedThemes.includes(t.id); });
            }
            if (parsed.equippedTheme) this.equippedTheme = parsed.equippedTheme;
            this.calculateHeroStats();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = Math.min(this.clock.getDelta(), 0.05);
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
    }
}
