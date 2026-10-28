import * as THREE from 'three';

export class LevelGenerator {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.gates = [];
        this.collectibles = [];
        this.obstacles = [];
        this.enemies = [];
        this.boss = null;
        this.meshes = [];
        this.animTime = 0;
    }

    clear() {
        this.gates = [];
        this.collectibles = [];
        this.obstacles = [];
        this.enemies = [];
        this.boss = null;
        this.meshes.forEach(m => {
            this.scene.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) {
                if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
                else m.material.dispose();
            }
        });
        this.meshes = [];
    }

    // Natural smooth serpentine road curvature
    getPathCenterX(z) {
        if (z < 25) return 0;
        const blend = Math.min(1, (z - 25) / 15);
        return (Math.sin(z * 0.045) * 2.2 + Math.cos(z * 0.02) * 0.8) * blend;
    }

    // Defines 3-lane fork / path choice zones
    isForkZone(z) {
        const mod = z % 65;
        return mod >= 20 && mod <= 50;
    }

    generate(level, trackLength) {
        this.createTrack(trackLength);
        this.createCollectibles(level, trackLength);
        this.createObstacles(level, trackLength);
        this.createEnemies(level, trackLength);
        this.createBoss(level, trackLength);
        this.createDecorations(trackLength);
    }

    createTrack(trackLength) {
        const segLen = 5;
        const segCount = Math.ceil(trackLength / segLen);

        // Weathered temple flagstone materials
        const stonePalette = [
            new THREE.MeshStandardMaterial({ color: 0xbaa482, roughness: 0.85, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ color: 0xab9573, roughness: 0.88, metalness: 0.08 }),
            new THREE.MeshStandardMaterial({ color: 0x9e8766, roughness: 0.82, metalness: 0.12 }),
            new THREE.MeshStandardMaterial({ color: 0x8f7858, roughness: 0.9, metalness: 0.05 })
        ];

        const curbMat = new THREE.MeshStandardMaterial({
            color: 0x544332,
            roughness: 0.9,
            metalness: 0.15
        });

        const dividerMat = new THREE.MeshStandardMaterial({
            color: 0x6e5944,
            roughness: 0.85,
            metalness: 0.1
        });

        // 1. Build segmented curving natural stone highway
        for (let i = 0; i < segCount; i++) {
            const zStart = i * segLen;
            const zCenter = zStart + segLen / 2;
            const cx = this.getPathCenterX(zCenter);
            const isFork = this.isForkZone(zCenter);
            const roadWidth = isFork ? 14.8 : 12.0;

            // Main stone road slab
            const mat = stonePalette[i % stonePalette.length];
            const slabGeo = new THREE.BoxGeometry(roadWidth, 0.25, segLen);
            const slab = new THREE.Mesh(slabGeo, mat);
            slab.position.set(cx, 0.01, -zCenter);
            slab.receiveShadow = true;
            slab.userData.dynamic = true;
            this.scene.add(slab);
            this.meshes.push(slab);

            // Carved outer stone curbs on both edges
            const curbGeo = new THREE.BoxGeometry(0.5, 0.45, segLen);
            
            const leftCurb = new THREE.Mesh(curbGeo, curbMat);
            leftCurb.position.set(cx - roadWidth / 2 - 0.25, 0.15, -zCenter);
            leftCurb.castShadow = true;
            leftCurb.receiveShadow = true;
            leftCurb.userData.dynamic = true;
            this.scene.add(leftCurb);
            this.meshes.push(leftCurb);

            const rightCurb = new THREE.Mesh(curbGeo, curbMat);
            rightCurb.position.set(cx + roadWidth / 2 + 0.25, 0.15, -zCenter);
            rightCurb.castShadow = true;
            rightCurb.receiveShadow = true;
            rightCurb.userData.dynamic = true;
            this.scene.add(rightCurb);
            this.meshes.push(rightCurb);

            // In fork zones: create dividing ancient ruin curb islands separating Left, Center, Right paths
            if (isFork) {
                const islandGeo = new THREE.BoxGeometry(0.65, 0.4, segLen);
                
                // Left divider island (splits Left path from Center path)
                const leftIsland = new THREE.Mesh(islandGeo, dividerMat);
                leftIsland.position.set(cx - 1.8, 0.15, -zCenter);
                leftIsland.castShadow = true;
                leftIsland.userData.dynamic = true;
                this.scene.add(leftIsland);
                this.meshes.push(leftIsland);

                // Right divider island (splits Center path from Right path)
                const rightIsland = new THREE.Mesh(islandGeo, dividerMat);
                rightIsland.position.set(cx + 1.8, 0.15, -zCenter);
                rightIsland.castShadow = true;
                rightIsland.userData.dynamic = true;
                this.scene.add(rightIsland);
                this.meshes.push(rightIsland);

                // At the start of a fork section: place carved path choice obelisks/shrines!
                if (zStart % 65 < segLen) {
                    this.createForkEntranceSign(cx, zStart);
                }
            }

            // Flagstone tile patterns (carved inlay lines along the road)
            for (let t = -roadWidth / 2 + 1.5; t < roadWidth / 2; t += 2.2) {
                const tileGeo = new THREE.PlaneGeometry(0.08, segLen);
                const tileMat = new THREE.MeshBasicMaterial({ color: 0x4a3b2c, transparent: true, opacity: 0.35 });
                const line = new THREE.Mesh(tileGeo, tileMat);
                line.rotation.x = -Math.PI / 2;
                line.position.set(cx + t, 0.14, -zCenter);
                line.userData.dynamic = true;
                this.scene.add(line);
                this.meshes.push(line);
            }

            // Stone torch braziers with warm fire light along the verges every ~18 units
            if (i % 4 === 0) {
                this.createBrazier(cx - roadWidth / 2 - 0.9, zCenter);
                this.createBrazier(cx + roadWidth / 2 + 0.9, zCenter);
            }
        }

        // 2. Grand Ancient Temple Start Gateway
        const startArchGroup = new THREE.Group();
        const templeStoneMat = new THREE.MeshStandardMaterial({ color: 0x8a7356, roughness: 0.75, metalness: 0.15 });
        const goldReliefMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.25 });

        // Left & right fluted temple pillars
        const pillarGeo = new THREE.CylinderGeometry(0.65, 0.75, 6.2, 12);
        const leftPillar = new THREE.Mesh(pillarGeo, templeStoneMat);
        leftPillar.position.set(-6.8, 3.1, -0.5);
        leftPillar.castShadow = true;
        startArchGroup.add(leftPillar);

        const rightPillar = new THREE.Mesh(pillarGeo, templeStoneMat);
        rightPillar.position.set(6.8, 3.1, -0.5);
        rightPillar.castShadow = true;
        startArchGroup.add(rightPillar);

        // Pillar capitals with gold trim
        const capGeo = new THREE.BoxGeometry(1.6, 0.5, 1.6);
        const leftCap = new THREE.Mesh(capGeo, goldReliefMat);
        leftCap.position.set(-6.8, 6.3, -0.5);
        startArchGroup.add(leftCap);

        const rightCap = new THREE.Mesh(capGeo, goldReliefMat);
        rightCap.position.set(6.8, 6.3, -0.5);
        startArchGroup.add(rightCap);

        // Heavy carved stone lintel arch beam
        const beamGeo = new THREE.BoxGeometry(15.6, 1.1, 1.4);
        const topBeam = new THREE.Mesh(beamGeo, templeStoneMat);
        topBeam.position.set(0, 6.8, -0.5);
        topBeam.castShadow = true;
        startArchGroup.add(topBeam);

        // Ornate golden sun crest in center
        const sunCrestGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 16);
        const sunCrest = new THREE.Mesh(sunCrestGeo, goldReliefMat);
        sunCrest.rotation.x = Math.PI / 2;
        sunCrest.position.set(0, 7.8, -0.5);
        startArchGroup.add(sunCrest);

        // Start Banner canvas
        const startCanvas = document.createElement('canvas');
        startCanvas.width = 512;
        startCanvas.height = 128;
        const sCtx = startCanvas.getContext('2d');
        sCtx.fillStyle = 'rgba(25, 20, 15, 0.92)';
        sCtx.roundRect(10, 10, 492, 108, 20);
        sCtx.fill();
        sCtx.strokeStyle = '#d4af37';
        sCtx.lineWidth = 6;
        sCtx.stroke();
        sCtx.fillStyle = '#ffffff';
        sCtx.font = '900 42px system-ui, sans-serif';
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';
        sCtx.shadowColor = '#ffd700';
        sCtx.shadowBlur = 15;
        sCtx.fillText('🏛️ TEMPLE ADVENTURE 🏛️', 256, 64);

        const startTex = new THREE.CanvasTexture(startCanvas);
        const startLabelGeo = new THREE.PlaneGeometry(7.2, 1.8);
        const startLabelMat = new THREE.MeshBasicMaterial({ map: startTex, transparent: true });
        const startBanner = new THREE.Mesh(startLabelGeo, startLabelMat);
        startBanner.position.set(0, 8.8, -0.5);
        startArchGroup.add(startBanner);

        startArchGroup.userData.dynamic = true;
        this.scene.add(startArchGroup);
        this.meshes.push(startArchGroup);

        // Expansive stylized terrain
        const groundGeo = new THREE.PlaneGeometry(420, trackLength + 220);
        const groundColor = (this.game && this.game.getActiveTheme()) ? this.game.getActiveTheme().ground : 0x3d9959;
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: groundColor, 
            roughness: 0.9,
            metalness: 0.05
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -0.06, -trackLength / 2);
        ground.receiveShadow = true;
        ground.userData.dynamic = true;
        this.scene.add(ground);
        this.meshes.push(ground);
    }

    createForkEntranceSign(cx, z) {
        // Carved stone shrine with torch markers showing 3 path choices
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7a654d, roughness: 0.8 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.25 });

        // Left path marker obelisk
        const obeliskGeo = new THREE.CylinderGeometry(0.3, 0.45, 2.8, 6);
        const leftObelisk = new THREE.Mesh(obeliskGeo, stoneMat);
        leftObelisk.position.set(cx - 1.8, 1.4, -z);
        leftObelisk.castShadow = true;
        group.add(leftObelisk);

        // Right path marker obelisk
        const rightObelisk = new THREE.Mesh(obeliskGeo, stoneMat);
        rightObelisk.position.set(cx + 1.8, 1.4, -z);
        rightObelisk.castShadow = true;
        group.add(rightObelisk);

        // Small decorative golden rune orbs on obelisks
        const orbGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const leftOrb = new THREE.Mesh(orbGeo, goldMat);
        leftOrb.position.set(cx - 1.8, 2.9, -z);
        group.add(leftOrb);

        const rightOrb = new THREE.Mesh(orbGeo, goldMat);
        rightOrb.position.set(cx + 1.8, 2.9, -z);
        group.add(rightOrb);

        // Overhead stone lintel connecting the dividers with path arrows
        const beamGeo = new THREE.BoxGeometry(4.2, 0.4, 0.4);
        const beam = new THREE.Mesh(beamGeo, stoneMat);
        beam.position.set(cx, 3.4, -z);
        group.add(beam);

        // Canvas sign: "◀ PATH CHOICE ▶"
        const canvas = document.createElement('canvas');
        canvas.width = 384;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(20, 15, 10, 0.9)';
        ctx.roundRect(8, 8, 368, 80, 16);
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◀ PATH CHOICE ▶', 192, 48);

        const tex = new THREE.CanvasTexture(canvas);
        const labelGeo = new THREE.PlaneGeometry(3.6, 0.9);
        const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(cx, 4.2, -z);
        group.add(label);

        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createBrazier(x, z) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.9 });
        const copperMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.8, roughness: 0.3 });
        const fireMat = new THREE.MeshStandardMaterial({ 
            color: 0xff6d00, 
            emissive: 0xff3d00, 
            emissiveIntensity: 1.4,
            roughness: 0.2
        });

        // Carved stone pedestal
        const pedGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.4, 8);
        const pedestal = new THREE.Mesh(pedGeo, stoneMat);
        pedestal.position.y = 0.7;
        pedestal.castShadow = true;
        group.add(pedestal);

        // Bronze / Copper fire bowl
        const bowlGeo = new THREE.CylinderGeometry(0.55, 0.3, 0.4, 8);
        const bowl = new THREE.Mesh(bowlGeo, copperMat);
        bowl.position.y = 1.5;
        group.add(bowl);

        // Animated warm flame cone
        const flameGeo = new THREE.ConeGeometry(0.35, 0.85, 6);
        const flame = new THREE.Mesh(flameGeo, fireMat);
        flame.position.y = 1.95;
        group.add(flame);

        group.position.set(x, 0, -z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    // Creates spinning 3D gold coins, emerald health flasks, and mystic power relics
    createCollectibles(level, trackLength) {
        this.collectibles = [];

        // Distribute trails of collectible coins, health flasks, and power-up relics
        const stepZ = 12;
        const totalSteps = Math.floor((trackLength - 30) / stepZ);

        for (let s = 1; s < totalSteps; s++) {
            const z = 18 + s * stepZ;
            const cx = this.getPathCenterX(z);
            const isFork = this.isForkZone(z);

            // In fork sections: place distinct rewards in the 3 lanes!
            if (isFork) {
                // Left lane (x = cx - 3.6): Trail of 4 Gold Coins
                for (let c = 0; c < 4; c++) {
                    const coinZ = z + (c - 1.5) * 1.8;
                    const coinX = this.getPathCenterX(coinZ) - 3.6;
                    this.spawnCoin(coinX, coinZ);
                }

                // Right lane (x = cx + 3.6): Health or Power-Up Relic!
                if (s % 2 === 0) {
                    this.spawnHealthPickup(cx + 3.6, z);
                } else {
                    this.spawnPowerUpPickup(cx + 3.6, z);
                }
            } else {
                // In standard curving road sections:
                const pattern = s % 4;

                if (pattern === 0) {
                    // Center arc of 5 golden coins
                    for (let c = 0; c < 5; c++) {
                        const coinZ = z + (c - 2) * 1.8;
                        const coinX = this.getPathCenterX(coinZ) + Math.sin(c * 0.7) * 1.5;
                        this.spawnCoin(coinX, coinZ);
                    }
                } else if (pattern === 1) {
                    // Left lane coin run
                    for (let c = 0; c < 4; c++) {
                        const coinZ = z + (c - 1.5) * 1.8;
                        const coinX = this.getPathCenterX(coinZ) - 2.8;
                        this.spawnCoin(coinX, coinZ);
                    }
                } else if (pattern === 2) {
                    // Right lane coin run
                    for (let c = 0; c < 4; c++) {
                        const coinZ = z + (c - 1.5) * 1.8;
                        const coinX = this.getPathCenterX(coinZ) + 2.8;
                        this.spawnCoin(coinX, coinZ);
                    }
                } else if (pattern === 3) {
                    // Occasional high-value relic in center lane
                    if (s % 3 === 0) {
                        this.spawnHealthPickup(cx, z);
                    } else {
                        this.spawnPowerUpPickup(cx, z);
                    }
                }
            }
        }
    }

    spawnCoin(x, z) {
        const group = new THREE.Group();
        
        // Shiny 3D golden coin with beveled rim
        const coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.9,
            roughness: 0.18,
            emissive: 0xffaa00,
            emissiveIntensity: 0.3
        });

        const coinGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.1, 16);
        const coin = new THREE.Mesh(coinGeo, coinMat);
        coin.rotation.x = Math.PI / 2;
        group.add(coin);

        // Embossed inner star/gem relief
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xfff066,
            metalness: 0.95,
            roughness: 0.1,
            emissive: 0xffd700,
            emissiveIntensity: 0.5
        });
        const star = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.13), coreMat);
        star.rotation.z = Math.PI / 4;
        group.add(star);

        group.position.set(x, 0.85, -z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);

        this.collectibles.push({
            type: 'coin',
            x: x,
            z: z,
            mesh: group,
            collected: false,
            value: 1,
            radius: 1.25,
            phase: Math.random() * Math.PI * 2
        });
    }

    spawnHealthPickup(x, z) {
        const group = new THREE.Group();

        // Floating emerald vitality flask
        const flaskMat = new THREE.MeshStandardMaterial({
            color: 0x00e676,
            emissive: 0x00e676,
            emissiveIntensity: 0.85,
            roughness: 0.15,
            metalness: 0.6
        });

        // Gem octahedron body
        const flaskGeo = new THREE.OctahedronGeometry(0.5, 0);
        const flask = new THREE.Mesh(flaskGeo, flaskMat);
        group.add(flask);

        // Golden cap & neck
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.2 });
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 8), goldMat);
        cap.position.y = 0.55;
        group.add(cap);

        // Pulsing emerald aura ring
        const auraGeo = new THREE.RingGeometry(0.5, 0.75, 16);
        const auraMat = new THREE.MeshBasicMaterial({ color: 0x00e676, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.rotation.x = -Math.PI / 2;
        aura.position.y = -0.55;
        group.add(aura);

        group.position.set(x, 1.1, -z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);

        this.collectibles.push({
            type: 'health',
            x: x,
            z: z,
            mesh: group,
            collected: false,
            value: 30,
            radius: 1.4,
            phase: Math.random() * Math.PI * 2
        });
    }

    spawnPowerUpPickup(x, z) {
        const group = new THREE.Group();

        // Glowing celestial mystic shield relic
        const relicMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00b4d8,
            emissiveIntensity: 0.9,
            roughness: 0.2,
            metalness: 0.7
        });

        // Winged crystal diamond
        const crystalGeo = new THREE.DodecahedronGeometry(0.48, 0);
        const crystal = new THREE.Mesh(crystalGeo, relicMat);
        group.add(crystal);

        // Golden orbit rune ring
        const ringGeo = new THREE.TorusGeometry(0.7, 0.05, 6, 24);
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
        const ring = new THREE.Mesh(ringGeo, goldMat);
        ring.rotation.x = Math.PI / 4;
        group.add(ring);

        group.position.set(x, 1.15, -z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);

        this.collectibles.push({
            type: 'powerup',
            x: x,
            z: z,
            mesh: group,
            collected: false,
            value: 25,
            radius: 1.4,
            phase: Math.random() * Math.PI * 2
        });
    }

    // Creates authentic temple obstacles: broken ruins, rocks, fallen pillars, gaps, and low barriers
    createObstacles(level, trackLength) {
        this.obstacles = [];
        const count = 7 + level * 2;
        const enemyZones = [50, 95, 140, 185]; // Avoid enemy zones

        for (let i = 0; i < count; i++) {
            let z;
            let attempts = 0;
            do {
                z = 28 + Math.random() * (trackLength - 55);
                attempts++;
            } while (enemyZones.some(ez => Math.abs(ez - z) < 10) && attempts < 40);

            if (attempts >= 40) continue;

            const cx = this.getPathCenterX(z);
            const isFork = this.isForkZone(z);
            const obsType = Math.floor(Math.random() * 5);

            let laneX = 0;
            let width = 2.8;

            if (isFork) {
                // In fork section: block one of the 3 paths (left -3.6, center 0, right +3.6)
                const laneChoice = Math.random();
                if (laneChoice < 0.35) laneX = -3.6;
                else if (laneChoice < 0.7) laneX = 0;
                else laneX = 3.6;
                width = 2.6;
            } else {
                // Standard road: place on left (-3.0), center (0), or right (+3.0)
                const laneChoice = Math.random();
                if (laneChoice < 0.35) laneX = -3.0;
                else if (laneChoice < 0.7) laneX = 0;
                else laneX = 3.0;
                width = 3.0;
            }

            const worldX = cx + laneX;

            if (obsType === 0) {
                // 1. Fallen Stone Pillar
                this.createFallenPillarObstacle(worldX, z, width);
            } else if (obsType === 1) {
                // 2. Ancient Ruin Rubble & Boulder Pile
                this.createRubbleObstacle(worldX, z, width);
            } else if (obsType === 2) {
                // 3. Low Carved Stone Altar Barrier
                this.createAltarBarrierObstacle(worldX, z, width);
            } else if (obsType === 3) {
                // 4. Sunken Spike Trap
                this.createSpikeTrapObstacle(worldX, z, width);
            } else {
                // 5. Collapsed Arch Debris
                this.createArchDebrisObstacle(worldX, z, width);
            }

            this.obstacles.push({
                x: laneX,
                worldX: worldX,
                z: z,
                width: width,
                passed: false
            });
        }
    }

    createFallenPillarObstacle(x, z, width) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x948067, roughness: 0.8, metalness: 0.1 });
        const crackedMat = new THREE.MeshStandardMaterial({ color: 0x6e5b46, roughness: 0.9 });

        // Broken fluted pillar cylinder lying horizontally
        const pillarGeo = new THREE.CylinderGeometry(0.38, 0.42, width, 10);
        const pillar = new THREE.Mesh(pillarGeo, stoneMat);
        pillar.rotation.z = Math.PI / 2;
        pillar.position.y = 0.38;
        pillar.castShadow = true;
        group.add(pillar);

        // Cracked stone fragments and fallen rubble around pillar
        for (let i = 0; i < 4; i++) {
            const chunkGeo = new THREE.DodecahedronGeometry(0.25 + Math.random() * 0.15, 0);
            const chunk = new THREE.Mesh(chunkGeo, crackedMat);
            chunk.position.set((Math.random() - 0.5) * (width * 0.8), 0.2, (Math.random() - 0.5) * 0.8);
            chunk.rotation.set(Math.random(), Math.random(), Math.random());
            chunk.castShadow = true;
            group.add(chunk);
        }

        group.position.set(x, 0, -z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createRubbleObstacle(x, z, width) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7c6953, roughness: 0.88, metalness: 0.1 });
        const mossMat = new THREE.MeshStandardMaterial({ color: 0x3d6645, roughness: 0.9 });

        // Cluster of weathered rectangular temple blocks and mossy boulders
        for (let i = 0; i < 5; i++) {
            const isBlock = i % 2 === 0;
            const geo = isBlock 
                ? new THREE.BoxGeometry(0.7 + Math.random() * 0.4, 0.6 + Math.random() * 0.4, 0.6 + Math.random() * 0.3)
                : new THREE.DodecahedronGeometry(0.45 + Math.random() * 0.2, 0);
            const mat = (i === 1) ? mossMat : stoneMat;
            const piece = new THREE.Mesh(geo, mat);
            piece.position.set(
                (i - 2) * (width / 4.5) + (Math.random() - 0.5) * 0.2,
                0.35 + Math.random() * 0.2,
                (Math.random() - 0.5) * 0.4
            );
            piece.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
            piece.castShadow = true;
            group.add(piece);
        }

        group.position.set(x, 0, -z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createAltarBarrierObstacle(x, z, width) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a7356, roughness: 0.78, metalness: 0.15 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.4, metalness: 0.6 });

        // Low carved stone altar block
        const altarGeo = new THREE.BoxGeometry(width, 1.0, 0.7);
        const altar = new THREE.Mesh(altarGeo, stoneMat);
        altar.position.y = 0.5;
        altar.castShadow = true;
        group.add(altar);

        // Carved golden frieze trim along the top edge
        const trimGeo = new THREE.BoxGeometry(width + 0.1, 0.15, 0.8);
        const trim = new THREE.Mesh(trimGeo, goldMat);
        trim.position.y = 1.05;
        group.add(trim);

        // Small carved relief urns on corners
        for (let side of [-1, 1]) {
            const urnGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.35, 6);
            const urn = new THREE.Mesh(urnGeo, stoneMat);
            urn.position.set(side * (width / 2 - 0.3), 1.25, 0);
            group.add(urn);
        }

        group.position.set(x, 0, -z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createSpikeTrapObstacle(x, z, width) {
        const group = new THREE.Group();
        const plateMat = new THREE.MeshStandardMaterial({ color: 0x3d3328, roughness: 0.95 });
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x8a1c14, metalness: 0.8, roughness: 0.3 });

        // Sunken stone trap grate
        const grateGeo = new THREE.BoxGeometry(width, 0.12, 1.6);
        const grate = new THREE.Mesh(grateGeo, plateMat);
        grate.position.y = 0.06;
        grate.receiveShadow = true;
        group.add(grate);

        // Menacing ancient rusted iron spikes
        const spikeCount = Math.floor(width / 0.7);
        for (let row = -1; row <= 1; row += 2) {
            for (let col = 0; col < spikeCount; col++) {
                const spikeGeo = new THREE.ConeGeometry(0.14, 0.75, 4);
                const spike = new THREE.Mesh(spikeGeo, spikeMat);
                spike.position.set(
                    (col - (spikeCount - 1) / 2) * 0.65,
                    0.42,
                    row * 0.45
                );
                spike.castShadow = true;
                group.add(spike);
            }
        }

        group.position.set(x, 0, -z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createArchDebrisObstacle(x, z, width) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7e6952, roughness: 0.82 });

        // Tilted broken pillar fragment creating a narrow barrier
        const pillarGeo = new THREE.CylinderGeometry(0.35, 0.45, 2.2, 8);
        const pillar = new THREE.Mesh(pillarGeo, stoneMat);
        pillar.position.set(-width * 0.25, 0.9, 0);
        pillar.rotation.z = 0.35;
        pillar.castShadow = true;
        group.add(pillar);

        // Crushed capital block on ground
        const capGeo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
        const cap = new THREE.Mesh(capGeo, stoneMat);
        cap.position.set(width * 0.2, 0.3, 0);
        cap.rotation.set(0.2, 0.5, -0.2);
        cap.castShadow = true;
        group.add(cap);

        group.position.set(x, 0, -z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    // Per-frame animation for spinning coins, hovering relics, and torch flames
    update(delta) {
        this.animTime = (this.animTime || 0) + delta;

        // Animate floating collectibles
        for (const item of this.collectibles) {
            if (item.collected || !item.mesh) continue;

            if (item.type === 'coin') {
                // Graceful coin spin
                item.mesh.rotation.y += delta * 3.5;
                item.mesh.position.y = 0.85 + Math.sin(this.animTime * 4 + item.phase) * 0.12;
            } else {
                // Floating and bobbing health & power-up relics
                item.mesh.rotation.y += delta * 2.2;
                item.mesh.position.y = 1.1 + Math.sin(this.animTime * 3 + item.phase) * 0.16;
            }
        }
    }

    createEnemies(level, trackLength) {
        const count = 2 + Math.floor(level * 0.5);
        const spacing = (trackLength - 60) / (count + 1);

        for (let i = 0; i < count; i++) {
            const z = 50 + (i + 1) * spacing;
            const enemyCount = Math.floor(5 + level * 3 + Math.random() * level * 5);
            
            const enemy = {
                z: z,
                count: enemyCount,
                defeated: false,
                meshes: []
            };

            // Create enemy crowd visual
            this.createEnemyCrowd(enemy, z, enemyCount);
            this.enemies.push(enemy);
        }
    }

    createEnemyCrowd(enemy, z, count) {
        const displayCount = Math.min(count, 30);
        const group = new THREE.Group();
        group.userData.dynamic = true;

        for (let i = 0; i < displayCount; i++) {
            const angle = (i / displayCount) * Math.PI * 2 + Math.random() * 0.5;
            const radius = Math.sqrt(i / displayCount) * 2.5;
            // Rival Raider color: dark menacing crimson
            const stickman = this.createStickman(0x880e4f);
            stickman.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius * 0.5
            );
            stickman.userData.index = i;
            stickman.userData.basePos = { x: stickman.position.x, z: stickman.position.z };
            group.add(stickman);
        }

        const enemyX = this.getPathCenterX(z);
        group.position.set(enemyX, 0, -z);
        this.scene.add(group);
        this.meshes.push(group);
        enemy.meshGroup = group;

        // High-contrast arcade danger badge
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(20, 4, 10, 0.9)';
        ctx.beginPath();
        ctx.roundRect(12, 12, 232, 104, 24);
        ctx.fill();
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.fillStyle = '#ff8a80';
        ctx.font = '900 24px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚔️ RIVALS', 128, 44);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 52px system-ui, sans-serif';
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 15;
        ctx.fillText(count.toString(), 128, 96);

        const texture = new THREE.CanvasTexture(canvas);
        const labelGeo = new THREE.PlaneGeometry(2.6, 1.3);
        const labelMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(enemyX, 4.2, -z);
        label.userData.dynamic = true;
        this.scene.add(label);
        this.meshes.push(label);
        enemy.labelMesh = label;
    }

    updateEnemyLabel(enemy) {
        if (!enemy.labelMesh) return;
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(20, 4, 10, 0.9)';
        ctx.beginPath();
        ctx.roundRect(12, 12, 232, 104, 24);
        ctx.fill();
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.fillStyle = '#ff8a80';
        ctx.font = '900 24px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚔️ RIVALS', 128, 44);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 52px system-ui, sans-serif';
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 15;
        ctx.fillText(Math.max(0, enemy.remainingCount).toString(), 128, 96);
        
        if (enemy.labelMesh.material.map) {
            enemy.labelMesh.material.map.dispose();
        }
        enemy.labelMesh.material.map = new THREE.CanvasTexture(canvas);
        enemy.labelMesh.material.needsUpdate = true;
    }

    removeEnemyStickman(enemy, count = 1, crowdManager = null) {
        if (!enemy.meshGroup) return;
        const toRemove = Math.min(count, enemy.meshGroup.children.length);
        for (let i = 0; i < toRemove; i++) {
            if (enemy.meshGroup.children.length > 0) {
                const child = enemy.meshGroup.children[enemy.meshGroup.children.length - 1];
                if (crowdManager) {
                    crowdManager.launchRagdoll(child, 0x880e4f, enemy.meshGroup);
                }
                enemy.meshGroup.remove(child);
            }
        }
    }

    updateEnemies(delta, isFighting = false, fightingEnemy = null, playerX = 0, trackZ = 0, crowdManager = null) {
        this.enemyAnimTime = (this.enemyAnimTime || 0) + delta;

        // If currently in a crowd fight, animate the active enemy horde
        if (isFighting && fightingEnemy && fightingEnemy.meshGroup) {
            this.enemyCombatTime = (this.enemyCombatTime || 0) + delta;
            const enemyChildren = fightingEnemy.meshGroup.children;
            const frontlineCount = Math.min(8, Math.max(2, Math.floor(enemyChildren.length * 0.4)));

            enemyChildren.forEach((stickman, i) => {
                const children = stickman.children;
                const baseZ = stickman.userData.basePos ? stickman.userData.basePos.z : 0;
                const isFrontline = i < frontlineCount;

                if (isFrontline) {
                    // Surge forward toward player (positive Z in enemy local space)
                    const targetZ = baseZ + 1.1;
                    stickman.position.z += (targetZ - stickman.position.z) * Math.min(1, delta * 8);

                    // Aggressive battle stance shuffle
                    stickman.position.y = 0.05 + Math.sin(this.enemyCombatTime * 14 + i) * 0.04;

                    // Braced combat legs
                    if (children.length >= 4) {
                        children[2].rotation.x = 0.35 - Math.sin(this.enemyCombatTime * 8 + i) * 0.15;
                        children[3].rotation.x = -0.35 + Math.sin(this.enemyCombatTime * 8 + i) * 0.15;
                    }

                    // Left arm raises spiked shield forward to block
                    if (children.length >= 5) {
                        children[4].rotation.x = -0.7 + Math.sin(this.enemyCombatTime * 8 + i) * 0.15;
                        children[4].rotation.y = -0.3;
                        children[4].rotation.z = -0.4;
                    }

                    // Right arm chops down furiously with jagged cleaver/axe
                    const attackSpeed = 12.5;
                    const attackPhase = (this.enemyCombatTime * attackSpeed + i * 1.8 + Math.PI) % (Math.PI * 2);
                    if (children.length >= 6) {
                        children[5].rotation.x = Math.sin(attackPhase) * 1.25 - 0.2;
                        children[5].rotation.y = Math.cos(attackPhase) * 0.35;
                        children[5].rotation.z = 0.25;
                    }

                    // Heavy chopping lunge
                    if (children.length >= 1) {
                        children[0].rotation.x = -0.22 - Math.sin(attackPhase) * 0.12;
                        children[0].rotation.y = -Math.sin(attackPhase) * 0.15;
                    }
                    if (children.length >= 2) {
                        children[1].rotation.x = -0.1 - Math.sin(attackPhase) * 0.08;
                    }

                    // Occasional fiery red slash arc on enemy strike apex
                    if (attackPhase > 1.7 && attackPhase < 2.1 && Math.random() < 0.2 && crowdManager) {
                        const worldPos = new THREE.Vector3();
                        stickman.getWorldPosition(worldPos);
                        worldPos.y += 0.8;
                        worldPos.z += 0.35;
                        worldPos.x += (Math.random() - 0.5) * 0.3;
                        crowdManager.spawnSlash(worldPos, null, 0xff1744, 0.95);
                    }
                } else {
                    // Rear enemy ranks roar and push forward
                    const targetZ = baseZ + 0.5;
                    stickman.position.z += (targetZ - stickman.position.z) * Math.min(1, delta * 6);
                    stickman.position.y = Math.abs(Math.sin(this.enemyCombatTime * 8 + i * 0.5)) * 0.18;

                    // Arms brandishing weapons high
                    if (children.length >= 5) {
                        children[4].rotation.x = -1.1 + Math.sin(this.enemyCombatTime * 9 + i) * 0.3;
                        children[4].rotation.z = -0.5;
                    }
                    if (children.length >= 6) {
                        children[5].rotation.x = -1.2 + Math.cos(this.enemyCombatTime * 10 + i) * 0.4;
                        children[5].rotation.z = 0.4;
                    }
                }
            });
        } else {
            this.enemyCombatTime = 0;
            // Idle breathing for all active enemy groups along the track
            for (const enemy of this.enemies) {
                if (enemy.defeated || !enemy.meshGroup) continue;
                enemy.meshGroup.children.forEach((stickman, i) => {
                    const idlePhase = this.enemyAnimTime * 2.5 + i * 0.4;
                    stickman.position.y = Math.abs(Math.sin(idlePhase)) * 0.06;
                    const children = stickman.children;
                    if (children.length >= 1) {
                        children[0].rotation.y = Math.sin(idlePhase) * 0.08;
                    }
                });
            }
        }
    }

    createBoss(level, trackLength) {
        this.boss = null; // No final boss monster yet per requirement 13

        // Grand Ancient Temple Sanctuary & Victory Portal
        const sanctuaryGroup = new THREE.Group();
        const templeStoneMat = new THREE.MeshStandardMaterial({ color: 0x8a7356, roughness: 0.75, metalness: 0.15 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.2 });

        // Sanctuary stone floor dais
        const daisGeo = new THREE.BoxGeometry(18, 0.4, 20);
        const dais = new THREE.Mesh(daisGeo, templeStoneMat);
        dais.position.set(0, 0.2, -trackLength);
        dais.receiveShadow = true;
        sanctuaryGroup.add(dais);

        // Flanking carved victory colonnade
        for (let side of [-1, 1]) {
            for (let c = 0; c < 3; c++) {
                const colGeo = new THREE.CylinderGeometry(0.7, 0.8, 7.5, 12);
                const col = new THREE.Mesh(colGeo, templeStoneMat);
                col.position.set(side * 8.5, 3.9, -trackLength + (c - 1) * 6);
                col.castShadow = true;
                sanctuaryGroup.add(col);

                const colCap = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 1.8), goldMat);
                colCap.position.set(side * 8.5, 7.8, -trackLength + (c - 1) * 6);
                sanctuaryGroup.add(colCap);
            }
        }

        // Towering Grand Victory Archway
        const leftPylon = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 9.5, 12), templeStoneMat);
        leftPylon.position.set(-6.5, 4.8, -trackLength);
        leftPylon.castShadow = true;
        sanctuaryGroup.add(leftPylon);

        const rightPylon = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 9.5, 12), templeStoneMat);
        rightPylon.position.set(6.5, 4.8, -trackLength);
        rightPylon.castShadow = true;
        sanctuaryGroup.add(rightPylon);

        const topArch = new THREE.Mesh(new THREE.BoxGeometry(16, 1.5, 1.8), templeStoneMat);
        topArch.position.set(0, 9.8, -trackLength);
        topArch.castShadow = true;
        sanctuaryGroup.add(topArch);

        // Ancient Sun-Disc Crest
        const sunDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 24), goldMat);
        sunDisc.rotation.x = Math.PI / 2;
        sunDisc.position.set(0, 11.2, -trackLength);
        sanctuaryGroup.add(sunDisc);

        // Radiant Mystic Victory Portal (Glow plane)
        const portalGeo = new THREE.PlaneGeometry(10.5, 8.2);
        const portalMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.65,
            side: THREE.DoubleSide
        });
        const portal = new THREE.Mesh(portalGeo, portalMat);
        portal.position.set(0, 4.5, -trackLength);
        sanctuaryGroup.add(portal);

        // Golden Victory Ring inside the portal
        const ringGeo = new THREE.TorusGeometry(3.6, 0.25, 16, 32);
        const ring = new THREE.Mesh(ringGeo, goldMat);
        ring.position.set(0, 4.5, -trackLength + 0.1);
        sanctuaryGroup.add(ring);

        // Overhead Victory Banner
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(20, 15, 10, 0.95)';
        ctx.roundRect(10, 10, 492, 108, 20);
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 40px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.fillText('🏛️ TEMPLE SANCTUARY 🏛️', 256, 64);

        const tex = new THREE.CanvasTexture(canvas);
        const labelGeo = new THREE.PlaneGeometry(7.2, 1.8);
        const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(0, 12.6, -trackLength);
        sanctuaryGroup.add(label);

        // Ceremonial flame braziers on sanctuary approach
        this.createBrazier(-5.2, trackLength - 4);
        this.createBrazier(5.2, trackLength - 4);

        sanctuaryGroup.userData.dynamic = true;
        this.scene.add(sanctuaryGroup);
        this.meshes.push(sanctuaryGroup);
    }

    shakeBoss() {}
    playBossDefeatAnimation() {}
    updateBossDefeat(delta) {}

    createDecorations(trackLength) {
        // 1. Layered low-poly rolling hills along both flanks to eliminate flat-plane appearance
        this.createRollingHills(trackLength);

        // 2. Progressive scenery distribution by zones along the track
        for (let z = 8; z < trackLength - 8; z += 7) {
            const progress = z / trackLength; // 0.0 to 1.0

            // Both left and right side scenery
            for (let side of [-1, 1]) {
                const rand = Math.random();
                const jitterZ = -z + (Math.random() - 0.5) * 4;

                // Zone 1: Meadow Parkway (Start to 35%)
                if (progress < 0.35) {
                    // Immediate verge: roadside flags & flowering bushes
                    if (rand < 0.25) {
                        const flagX = side * 5.6;
                        const flagCol = side > 0 ? 0x0284c7 : 0xf43f5e;
                        this.createRoadsideFlag(flagX, jitterZ, flagCol);
                    } else if (rand < 0.55) {
                        const bushX = side * (6.8 + Math.random() * 2.2);
                        const flowerCol = Math.random() > 0.5 ? 0xf43f5e : 0xfacc15;
                        this.createBush(bushX, jitterZ, 0.7 + Math.random() * 0.4, flowerCol);
                    }

                    // Mid verge: Lush round fluffy trees & boulders
                    const treeX = side * (8.5 + Math.random() * 14);
                    const treeScale = 0.85 + Math.random() * 0.5;
                    const foliageCols = [0x22c55e, 0x16a34a, 0x15803d, 0x4ade80];
                    const fCol = foliageCols[Math.floor(Math.random() * foliageCols.length)];
                    this.createRoundTree(treeX, jitterZ, treeScale, fCol);

                    if (Math.random() > 0.4) {
                        const rockX = side * (7.5 + Math.random() * 12);
                        this.createRock(rockX, jitterZ + 2, 0.5 + Math.random() * 0.6);
                    }
                }
                // Zone 2: Palm Oasis & Valley (35% to 72%)
                else if (progress < 0.72) {
                    // Verge: arcade crystals & warm boulders
                    if (rand < 0.3) {
                        const crysX = side * (7.0 + Math.random() * 3.5);
                        this.createArcadeCrystal(crysX, jitterZ);
                    } else if (rand < 0.6) {
                        const bushX = side * (6.8 + Math.random() * 2.5);
                        this.createBush(bushX, jitterZ, 0.8 + Math.random() * 0.3, 0xa855f7);
                    }

                    // Mid verge: Stylized arcade palms & scattered conifers
                    const treeX = side * (8.5 + Math.random() * 15);
                    if (Math.random() > 0.3) {
                        this.createPalmTree(treeX, jitterZ, 0.9 + Math.random() * 0.4);
                    } else {
                        this.createPineTree(treeX, jitterZ, 0.85 + Math.random() * 0.4);
                    }

                    const rockX = side * (8.0 + Math.random() * 12);
                    this.createRock(rockX, jitterZ - 1.5, 0.6 + Math.random() * 0.7);
                }
                // Zone 3: Colosseum & Arena Approach (72% to 100%)
                else {
                    // Verge: Grand stone obelisks & triumphant flags
                    if (rand < 0.35) {
                        const pylonX = side * 5.8;
                        this.createObelisk(pylonX, jitterZ, 0.9 + Math.random() * 0.3);
                    } else if (rand < 0.65) {
                        const flagX = side * 5.6;
                        this.createRoadsideFlag(flagX, jitterZ, 0xfacc15);
                    }

                    // Mid verge: Dense alpine evergreen pines framing the approach
                    const pineX = side * (8.0 + Math.random() * 16);
                    this.createPineTree(pineX, jitterZ, 1.0 + Math.random() * 0.6);

                    if (Math.random() > 0.35) {
                        const rockX = side * (7.5 + Math.random() * 10);
                        this.createRock(rockX, jitterZ + 1.2, 0.7 + Math.random() * 0.7);
                    }
                }
            }
        }

        // 3. Dual-layer mountain ranges along the horizon
        this.createMountains(trackLength);

        // 4. Distant colorful hot air balloons adding arcade life to the horizon
        this.createHotAirBalloons(trackLength);

        // 5. Stylized low-poly 3D clouds in the bright sky
        this.createClouds(trackLength);
    }

    createRollingHills(trackLength) {
        // Create low-poly rolling mounds along both sides
        const hillColors = [0x32834b, 0x3d9959, 0x2d7343, 0x45a863];
        for (let z = 0; z < trackLength + 60; z += 18) {
            for (let side of [-1, 1]) {
                const hillX = side * (22 + Math.random() * 18);
                const hillZ = -z + (Math.random() - 0.5) * 8;
                const radius = 9 + Math.random() * 8;
                const height = 1.6 + Math.random() * 2.2;

                const hillGeo = new THREE.CylinderGeometry(radius * 0.3, radius, height, 7);
                const hillMat = new THREE.MeshStandardMaterial({
                    color: hillColors[Math.floor(Math.random() * hillColors.length)],
                    flatShading: true,
                    roughness: 0.9
                });
                const hill = new THREE.Mesh(hillGeo, hillMat);
                hill.position.set(hillX, height * 0.45 - 0.05, hillZ);
                hill.rotation.y = Math.random() * Math.PI;
                hill.receiveShadow = true;
                hill.userData.dynamic = true;
                this.scene.add(hill);
                this.meshes.push(hill);
            }
        }
    }

    createRoundTree(x, z, scale = 1, foliageColor = 0x22c55e) {
        const group = new THREE.Group();

        // Wooden Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 2.2 * scale, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.1 * scale;
        trunk.castShadow = true;
        group.add(trunk);

        // Multi-part fluffy canopy (3 overlapping low-poly spheres)
        const canopyMat = new THREE.MeshStandardMaterial({
            color: foliageColor,
            flatShading: true,
            roughness: 0.6
        });
        const mainCanopy = new THREE.Mesh(new THREE.DodecahedronGeometry(1.25 * scale, 1), canopyMat);
        mainCanopy.position.y = 2.4 * scale;
        mainCanopy.castShadow = true;
        group.add(mainCanopy);

        const subCanopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 * scale, 1), canopyMat);
        subCanopy1.position.set(0.45 * scale, 2.7 * scale, 0.25 * scale);
        subCanopy1.castShadow = true;
        group.add(subCanopy1);

        const highlightMat = new THREE.MeshStandardMaterial({
            color: 0x4ade80,
            flatShading: true,
            roughness: 0.6
        });
        const topCanopy = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 * scale, 1), highlightMat);
        topCanopy.position.set(-0.25 * scale, 3.2 * scale, -0.15 * scale);
        topCanopy.castShadow = true;
        group.add(topCanopy);

        group.position.set(x, 0, z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createPalmTree(x, z, scale = 1) {
        const group = new THREE.Group();

        // Curved segmented trunk
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x785338, roughness: 0.75 });
        const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.26 * scale, 1.5 * scale, 6), trunkMat);
        seg1.position.set(0, 0.75 * scale, 0);
        seg1.rotation.z = 0.08;
        seg1.castShadow = true;
        group.add(seg1);

        const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.18 * scale, 1.6 * scale, 6), trunkMat);
        seg2.position.set(0.12 * scale, 2.15 * scale, 0);
        seg2.rotation.z = 0.16;
        seg2.castShadow = true;
        group.add(seg2);

        // 5 radiating palm fronds curving downwards
        const frondMat = new THREE.MeshStandardMaterial({
            color: 0x16a34a,
            flatShading: true,
            roughness: 0.55
        });
        const frondGeo = new THREE.ConeGeometry(0.55 * scale, 2.0 * scale, 4);

        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const frond = new THREE.Mesh(frondGeo, frondMat);
            frond.position.set(0.25 * scale, 3.0 * scale, 0);
            frond.rotation.y = angle;
            frond.rotation.z = 1.15; // droop outward
            frond.castShadow = true;
            group.add(frond);
        }

        // Coconuts
        const cocoMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.7 });
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const coco = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 6, 6), cocoMat);
            coco.position.set(
                0.25 * scale + Math.cos(angle) * 0.2 * scale,
                2.8 * scale,
                Math.sin(angle) * 0.2 * scale
            );
            group.add(coco);
        }

        group.position.set(x, 0, z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createPineTree(x, z, scale = 1) {
        const group = new THREE.Group();

        // Brown trunk
        const trunkGeo = new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, 1.6 * scale, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.8 * scale;
        trunk.castShadow = true;
        group.add(trunk);

        // 3 stacked tiered cones
        const coneColors = [0x14532d, 0x166534, 0x15803d];
        for (let i = 0; i < 3; i++) {
            const radius = (1.25 - i * 0.28) * scale;
            const height = (1.3 - i * 0.15) * scale;
            const coneGeo = new THREE.ConeGeometry(radius, height, 6);
            const coneMat = new THREE.MeshStandardMaterial({
                color: coneColors[i],
                flatShading: true,
                roughness: 0.6
            });
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.y = (1.7 + i * 0.85) * scale;
            cone.castShadow = true;
            group.add(cone);
        }

        group.position.set(x, 0, z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createBush(x, z, scale = 1, flowerColor = 0xf43f5e) {
        const group = new THREE.Group();

        const bushMat = new THREE.MeshStandardMaterial({
            color: 0x16a34a,
            flatShading: true,
            roughness: 0.7
        });
        const mainBush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 * scale, 1), bushMat);
        mainBush.position.y = 0.45 * scale;
        mainBush.castShadow = true;
        group.add(mainBush);

        const subBush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 * scale, 1), bushMat);
        subBush.position.set(0.35 * scale, 0.35 * scale, 0.15 * scale);
        subBush.castShadow = true;
        group.add(subBush);

        // Blossom accents
        const flMat = new THREE.MeshStandardMaterial({
            color: flowerColor,
            emissive: flowerColor,
            emissiveIntensity: 0.4,
            roughness: 0.4
        });
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const blossom = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 * scale, 0), flMat);
            blossom.position.set(
                Math.cos(angle) * 0.4 * scale,
                0.8 * scale,
                Math.sin(angle) * 0.4 * scale
            );
            group.add(blossom);
        }

        group.position.set(x, 0, z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createRock(x, z, scale = 1) {
        const rockGeo = new THREE.DodecahedronGeometry(scale, 0);
        const rockColors = [0x64748b, 0x475569, 0x94a3b8];
        const rockMat = new THREE.MeshStandardMaterial({
            color: rockColors[Math.floor(Math.random() * rockColors.length)],
            flatShading: true,
            roughness: 0.85
        });
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(x, scale * 0.45, z);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        rock.castShadow = true;
        rock.receiveShadow = true;
        rock.userData.dynamic = true;
        this.scene.add(rock);
        this.meshes.push(rock);
    }

    createRoadsideFlag(x, z, color = 0x0284c7) {
        const group = new THREE.Group();

        // Flagpole
        const poleGeo = new THREE.CylinderGeometry(0.04, 0.05, 3.2, 5);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.6, roughness: 0.3 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 1.6;
        pole.castShadow = true;
        group.add(pole);

        // Fluttering banner
        const flagGeo = new THREE.PlaneGeometry(0.85, 0.55);
        const flagMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.25,
            side: THREE.DoubleSide
        });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(x > 0 ? 0.45 : -0.45, 2.8, 0);
        flag.rotation.y = x > 0 ? 0.3 : -0.3;
        group.add(flag);

        group.position.set(x, 0, z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createObelisk(x, z, scale = 1) {
        const group = new THREE.Group();

        // Base pedestal
        const baseGeo = new THREE.BoxGeometry(0.8 * scale, 0.4 * scale, 0.8 * scale);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.2 * scale;
        group.add(base);

        // Tapered stone pillar
        const pillarGeo = new THREE.CylinderGeometry(0.24 * scale, 0.38 * scale, 3.4 * scale, 4);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, flatShading: true, roughness: 0.7 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.y = 2.0 * scale;
        pillar.rotation.y = Math.PI / 4;
        pillar.castShadow = true;
        group.add(pillar);

        // Glowing apex crystal
        const apexGeo = new THREE.OctahedronGeometry(0.22 * scale, 0);
        const apexMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.9,
            metalness: 0.8
        });
        const apex = new THREE.Mesh(apexGeo, apexMat);
        apex.position.y = 3.9 * scale;
        group.add(apex);

        group.position.set(x, 0, z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createHotAirBalloons(trackLength) {
        const balloonConfigs = [
            { x: -75, y: 44, z: -trackLength * 0.25, scale: 2.2, col1: 0xef4444, col2: 0xfacc15 },
            { x: 85, y: 52, z: -trackLength * 0.55, scale: 2.6, col1: 0x0284c7, col2: 0xf8fafc },
            { x: -95, y: 48, z: -trackLength * 0.85, scale: 2.0, col1: 0x8b5cf6, col2: 0xec4899 }
        ];

        balloonConfigs.forEach(cfg => {
            const group = new THREE.Group();

            // Main balloon envelope
            const balloonGeo = new THREE.SphereGeometry(cfg.scale, 12, 10);
            balloonGeo.scale(1, 1.35, 1);
            const balloonMat = new THREE.MeshStandardMaterial({
                color: cfg.col1,
                roughness: 0.5,
                flatShading: true
            });
            const balloon = new THREE.Mesh(balloonGeo, balloonMat);
            group.add(balloon);

            // Contrast equatorial stripe ring
            const stripeGeo = new THREE.TorusGeometry(cfg.scale * 1.01, 0.15 * cfg.scale, 6, 16);
            const stripeMat = new THREE.MeshStandardMaterial({ color: cfg.col2, roughness: 0.5 });
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.rotation.x = Math.PI / 2;
            group.add(stripe);

            // Passenger wicker basket
            const basketGeo = new THREE.BoxGeometry(0.7 * cfg.scale, 0.6 * cfg.scale, 0.7 * cfg.scale);
            const basketMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
            const basket = new THREE.Mesh(basketGeo, basketMat);
            basket.position.y = -1.9 * cfg.scale;
            group.add(basket);

            group.position.set(cfg.x, cfg.y, cfg.z);
            group.userData.dynamic = true;
            this.scene.add(group);
            this.meshes.push(group);
        });
    }

    createArcadeCrystal(x, z) {
        const height = 1.6 + Math.random() * 1.8;
        const radius = 0.4 + Math.random() * 0.3;
        const crystalGeo = new THREE.OctahedronGeometry(radius, 0);
        
        const colors = [0x00f0ff, 0x00e676, 0xd500f9, 0xff007f];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const crystalMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.75,
            roughness: 0.1,
            metalness: 0.9,
            flatShading: true
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.set(x, height * 0.6, z);
        crystal.scale.set(1, height / radius, 1);
        crystal.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
        crystal.userData.dynamic = true;
        this.scene.add(crystal);
        this.meshes.push(crystal);
    }

    createMountains(trackLength) {
        // Layer 1: Mid-distance rolling foothills
        const midColors = [0x255d40, 0x1f4b34, 0x2e6f4d];
        for (let i = 0; i < 16; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            const x = side * (52 + Math.random() * 32);
            const z = -(Math.random() * (trackLength + 40));
            const height = 22 + Math.random() * 18;
            const radius = 14 + Math.random() * 12;

            const hillGeo = new THREE.ConeGeometry(radius, height, 5);
            const hillMat = new THREE.MeshStandardMaterial({
                color: midColors[Math.floor(Math.random() * midColors.length)],
                flatShading: true,
                roughness: 0.9
            });
            const hill = new THREE.Mesh(hillGeo, hillMat);
            hill.position.set(x, height * 0.4, z);
            hill.userData.dynamic = true;
            this.scene.add(hill);
            this.meshes.push(hill);
        }

        // Layer 2: Distant majestic alpine mountains with crisp snow caps
        const mountainColors = [0x1e293b, 0x334155, 0x0f172a];
        for (let i = 0; i < 18; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            const x = side * (90 + Math.random() * 65);
            const z = -(Math.random() * (trackLength + 80)) + 30;
            const height = 48 + Math.random() * 32;
            const radius = 22 + Math.random() * 16;

            const mountainGeo = new THREE.ConeGeometry(radius, height, 6);
            const mountainMat = new THREE.MeshStandardMaterial({ 
                color: mountainColors[Math.floor(Math.random() * mountainColors.length)],
                flatShading: true,
                roughness: 0.9
            });
            const mountain = new THREE.Mesh(mountainGeo, mountainMat);
            mountain.position.set(x, height * 0.42, z);
            mountain.userData.dynamic = true;
            this.scene.add(mountain);
            this.meshes.push(mountain);

            // Clean white snow cap peak
            const peakGeo = new THREE.ConeGeometry(radius * 0.32, height * 0.28, 6);
            const peakMat = new THREE.MeshStandardMaterial({ 
                color: 0xf8fafc,
                flatShading: true,
                roughness: 0.4
            });
            const peak = new THREE.Mesh(peakGeo, peakMat);
            peak.position.set(x, height * 0.78, z);
            peak.userData.dynamic = true;
            this.scene.add(peak);
            this.meshes.push(peak);
        }
    }

    createClouds(trackLength) {
        for (let i = 0; i < 26; i++) {
            const group = new THREE.Group();
            const cloudMat = new THREE.MeshStandardMaterial({ 
                color: 0xffffff, 
                transparent: true, 
                opacity: 0.92,
                roughness: 0.3,
                flatShading: true
            });

            const numPuffs = 4 + Math.floor(Math.random() * 3);
            for (let j = 0; j < numPuffs; j++) {
                const puffGeo = new THREE.DodecahedronGeometry(2.0 + Math.random() * 1.8, 0);
                const puff = new THREE.Mesh(puffGeo, cloudMat);
                puff.position.set(
                    (j - numPuffs / 2) * 2.4,
                    Math.random() * 0.8,
                    Math.random() * 1.0
                );
                group.add(puff);
            }

            group.position.set(
                (Math.random() - 0.5) * 160,
                30 + Math.random() * 22,
                -(Math.random() * (trackLength + 60)) + 20
            );
            group.userData.dynamic = true;
            this.scene.add(group);
            this.meshes.push(group);
        }
    }

    createStickman(color) {
        // Distinctive Rival Raider enemy character
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ 
            color: color || 0x880e4f,
            roughness: 0.4,
            metalness: 0.7
        });
        const darkArmorMat = new THREE.MeshStandardMaterial({ color: 0x181a24, roughness: 0.5, metalness: 0.8 });

        // 1. Armored Body
        const bodyGeo = new THREE.CapsuleGeometry(0.16, 0.48, 6, 6);
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.y = 0.7;
        body.castShadow = true;

        // Spiked Shoulder Pauldrons on enemies
        const spikeGeo = new THREE.ConeGeometry(0.06, 0.18, 4);
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x111625, metalness: 0.9 });
        const leftSpike = new THREE.Mesh(spikeGeo, spikeMat);
        leftSpike.position.set(-0.2, 0.22, 0);
        leftSpike.rotation.z = 0.5;
        body.add(leftSpike);

        const rightSpike = new THREE.Mesh(spikeGeo, spikeMat);
        rightSpike.position.set(0.2, 0.22, 0);
        rightSpike.rotation.z = -0.5;
        body.add(rightSpike);

        // Glowing Chest Warning Core
        const coreGeo = new THREE.BoxGeometry(0.12, 0.16, 0.08);
        const coreMat = new THREE.MeshStandardMaterial({ 
            color: 0xff1744, 
            emissive: 0xff1744, 
            emissiveIntensity: 1.0 
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(0, 0.04, 0.12);
        body.add(core);

        group.add(body);

        // 2. Horned Combat Helmet Head
        const headGeo = new THREE.SphereGeometry(0.22, 10, 10);
        const head = new THREE.Mesh(headGeo, mat);
        head.position.y = 1.22;
        head.castShadow = true;

        // Twin aggressive horns on helmet
        const hornGeo = new THREE.ConeGeometry(0.05, 0.22, 4);
        const leftHorn = new THREE.Mesh(hornGeo, spikeMat);
        leftHorn.position.set(-0.14, 0.18, -0.04);
        leftHorn.rotation.z = 0.4;
        leftHorn.rotation.x = -0.2;
        head.add(leftHorn);

        const rightHorn = new THREE.Mesh(hornGeo, spikeMat);
        rightHorn.position.set(0.14, 0.18, -0.04);
        rightHorn.rotation.z = -0.4;
        rightHorn.rotation.x = -0.2;
        head.add(rightHorn);

        // Glowing fiery red eye-visor slit
        const visorGeo = new THREE.BoxGeometry(0.28, 0.07, 0.14);
        const visor = new THREE.Mesh(visorGeo, coreMat);
        visor.position.set(0, 0.02, 0.12);
        head.add(visor);

        group.add(head);

        // 3. Heavy Armored Legs
        const legGeo = new THREE.CapsuleGeometry(0.07, 0.3, 4, 4);
        const leftLeg = new THREE.Mesh(legGeo, mat);
        leftLeg.position.set(-0.1, 0.2, 0);
        const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.17), darkArmorMat);
        leftBoot.position.set(0, -0.15, 0.04);
        leftLeg.add(leftBoot);
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, mat);
        rightLeg.position.set(0.1, 0.2, 0);
        const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.17), darkArmorMat);
        rightBoot.position.set(0, -0.15, 0.04);
        rightLeg.add(rightBoot);
        group.add(rightLeg);

        // 4. Left Arm & Spiked War Buckler
        const armGeo = new THREE.CapsuleGeometry(0.055, 0.25, 4, 4);
        const leftArm = new THREE.Mesh(armGeo, mat);
        leftArm.position.set(-0.25, 0.75, 0);
        leftArm.rotation.z = 0.3;

        // Spiked Buckler
        const shieldGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 6);
        const shield = new THREE.Mesh(shieldGeo, darkArmorMat);
        shield.position.set(-0.06, -0.06, 0.08);
        shield.rotation.y = Math.PI / 2;
        const shieldSpike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 4), coreMat);
        shieldSpike.position.set(0, 0.08, 0);
        shieldSpike.rotation.x = Math.PI / 2;
        shield.add(shieldSpike);
        leftArm.add(shield);
        group.add(leftArm);

        // 5. Right Arm & Brutal Jagged Raider Cleaver / Axe
        const rightArm = new THREE.Mesh(armGeo, mat);
        rightArm.position.set(0.25, 0.75, 0);
        rightArm.rotation.z = -0.3;

        // Weapon handle
        const axeGroup = new THREE.Group();
        const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.38, 5);
        const handle = new THREE.Mesh(handleGeo, darkArmorMat);
        axeGroup.add(handle);

        // Jagged axe blade
        const bladeGeo = new THREE.BoxGeometry(0.18, 0.22, 0.03);
        const blade = new THREE.Mesh(bladeGeo, darkArmorMat);
        blade.position.set(0.1, 0.12, 0);
        axeGroup.add(blade);

        // Red glowing cutting edge
        const edgeGeo = new THREE.BoxGeometry(0.04, 0.24, 0.04);
        const edge = new THREE.Mesh(edgeGeo, coreMat);
        edge.position.set(0.19, 0.12, 0);
        axeGroup.add(edge);

        axeGroup.position.set(0.04, -0.12, 0.12);
        axeGroup.rotation.x = Math.PI / 3;
        rightArm.add(axeGroup);
        group.add(rightArm);

        // Store part references
        group.userData.body = body;
        group.userData.head = head;
        group.userData.leftLeg = leftLeg;
        group.userData.rightLeg = rightLeg;
        group.userData.leftArm = leftArm;
        group.userData.rightArm = rightArm;
        group.userData.weapon = axeGroup;
        group.userData.shield = shield;
        group.userData.isEnemy = true;
        group.userData.hitReact = 0;

        return group;
    }
}
