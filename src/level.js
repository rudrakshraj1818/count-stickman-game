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
        this.animatedProps = [];
        this.animTime = 0;
    }

    clear() {
        this.gates = [];
        this.collectibles = [];
        this.obstacles = [];
        this.enemies = [];
        this.boss = null;
        this.animatedProps = [];
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

    // Natural smooth serpentine road curvature - subtle gentle winding trail
    getPathCenterX(z) {
        if (z < 18) return 0;
        const blend = Math.min(1, (z - 18) / 14);
        // Multi-frequency natural winding trail (gentle S-curves, max offset ~3.2m)
        const curve1 = Math.sin((z - 18) * 0.052) * 2.2;
        const curve2 = Math.sin((z - 18) * 0.024) * 1.1;
        const curve3 = Math.cos((z - 18) * 0.088) * 0.4;
        return (curve1 + curve2 + curve3) * blend;
    }

    // Tangent heading angle of the path at any distance z
    getPathTangentAngle(z) {
        const delta = 1.0;
        const dx = this.getPathCenterX(z + delta) - this.getPathCenterX(z - delta);
        return Math.atan2(dx, delta * 2);
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
        const segLen = 2.5; // Short segments for silky smooth curvature
        const segCount = Math.ceil(trackLength / segLen);

        // Zone 1: Forest weathered flagstone & mossy soil
        const forestPalette = [
            new THREE.MeshStandardMaterial({ color: 0x827258, roughness: 0.88, metalness: 0.08 }),
            new THREE.MeshStandardMaterial({ color: 0x75654c, roughness: 0.90, metalness: 0.05 }),
            new THREE.MeshStandardMaterial({ color: 0x8a7b60, roughness: 0.86, metalness: 0.06 })
        ];
        const forestCurbMat = new THREE.MeshStandardMaterial({ color: 0x3d3124, roughness: 0.92 });
        const forestBedMat = new THREE.MeshStandardMaterial({ color: 0x241c14, roughness: 0.95 });

        // Zone 2: Ancient Ruins sun-bleached sandstone & weathered granite
        const ruinPalette = [
            new THREE.MeshStandardMaterial({ color: 0xb5a082, roughness: 0.84, metalness: 0.10 }),
            new THREE.MeshStandardMaterial({ color: 0xa89476, roughness: 0.86, metalness: 0.08 }),
            new THREE.MeshStandardMaterial({ color: 0x9e8a6c, roughness: 0.82, metalness: 0.12 })
        ];
        const ruinCurbMat = new THREE.MeshStandardMaterial({ color: 0x544434, roughness: 0.88 });
        const ruinBedMat = new THREE.MeshStandardMaterial({ color: 0x3e3226, roughness: 0.94 });

        // Zone 3: Magical Temple polished obsidian & basalt with runic inlay channels
        const templePalette = [
            new THREE.MeshStandardMaterial({ color: 0x1e2230, roughness: 0.55, metalness: 0.5 }),
            new THREE.MeshStandardMaterial({ color: 0x262b3d, roughness: 0.58, metalness: 0.45 }),
            new THREE.MeshStandardMaterial({ color: 0x1b1f2c, roughness: 0.60, metalness: 0.55 })
        ];
        const templeCurbMat = new THREE.MeshStandardMaterial({ color: 0x121520, roughness: 0.7, metalness: 0.75 });
        const templeBedMat = new THREE.MeshStandardMaterial({ color: 0x0c0e16, roughness: 0.9 });
        const templeRuneMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00d8f6,
            emissiveIntensity: 0.75,
            roughness: 0.2
        });

        const dividerMat = new THREE.MeshStandardMaterial({ color: 0x584635, roughness: 0.85 });

        // Build continuous 3-lane integrated roadway along the organic serpentine trail
        for (let i = 0; i < segCount; i++) {
            const zStart = i * segLen;
            const zCenter = zStart + segLen / 2;
            const cx = this.getPathCenterX(zCenter);
            const angle = this.getPathTangentAngle(zCenter);
            const isFork = this.isForkZone(zCenter);
            const isBridge = (zCenter >= 88 && zCenter <= 106);
            const roadWidth = isFork ? 8.8 : 7.6;

            // Zone material selection
            let currentSlabMat;
            let currentCurbMat;
            let currentBedMat;

            if (zCenter < 65) {
                // Zone 1: Forest
                currentSlabMat = forestPalette[i % forestPalette.length];
                currentCurbMat = forestCurbMat;
                currentBedMat = forestBedMat;
            } else if (zCenter < 135) {
                // Zone 2: Ruins
                currentSlabMat = ruinPalette[i % ruinPalette.length];
                currentCurbMat = ruinCurbMat;
                currentBedMat = ruinBedMat;
            } else {
                // Zone 3: Magical Temple
                currentSlabMat = templePalette[i % templePalette.length];
                currentCurbMat = templeCurbMat;
                currentBedMat = templeBedMat;
            }

            // 1. Earthen / Stone foundation embankment underneath (embeds road naturally into world)
            if (!isBridge) {
                const bedGeo = new THREE.BoxGeometry(roadWidth + 1.2, 0.3, segLen + 0.1);
                const bed = new THREE.Mesh(bedGeo, currentBedMat);
                bed.position.set(cx, -0.05, -zCenter);
                bed.rotation.y = angle;
                bed.receiveShadow = true;
                bed.userData.dynamic = true;
                this.scene.add(bed);
                this.meshes.push(bed);
            } else {
                // Ruined Bridge section: stone bridge arch support piers descending into chasm
                if (i % 2 === 0) {
                    const pierGeo = new THREE.BoxGeometry(roadWidth + 0.6, 5.0, 1.4);
                    const pierMat = new THREE.MeshStandardMaterial({ color: 0x483a2d, roughness: 0.9 });
                    const pier = new THREE.Mesh(pierGeo, pierMat);
                    pier.position.set(cx, -2.5, -zCenter);
                    pier.rotation.y = angle;
                    pier.castShadow = true;
                    pier.userData.dynamic = true;
                    this.scene.add(pier);
                    this.meshes.push(pier);
                }
            }

            // 2. Main playable 3-lane road slab
            const slabGeo = new THREE.BoxGeometry(roadWidth, 0.25, segLen + 0.05);
            const slab = new THREE.Mesh(slabGeo, currentSlabMat);
            slab.position.set(cx, 0.01, -zCenter);
            slab.rotation.y = angle;
            slab.receiveShadow = true;
            slab.userData.dynamic = true;
            this.scene.add(slab);
            this.meshes.push(slab);

            // 3. Outer curbs cleanly framing the path
            const curbHeight = isBridge ? 0.75 : 0.42; // Higher parapet on bridge
            const curbGeo = new THREE.BoxGeometry(0.38, curbHeight, segLen + 0.05);

            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const halfW = roadWidth / 2 + 0.18;

            const leftCurb = new THREE.Mesh(curbGeo, currentCurbMat);
            leftCurb.position.set(cx - halfW * cosA, curbHeight / 2 - 0.08, -zCenter + halfW * sinA);
            leftCurb.rotation.y = angle;
            leftCurb.castShadow = true;
            leftCurb.receiveShadow = true;
            leftCurb.userData.dynamic = true;
            this.scene.add(leftCurb);
            this.meshes.push(leftCurb);

            const rightCurb = new THREE.Mesh(curbGeo, currentCurbMat);
            rightCurb.position.set(cx + halfW * cosA, curbHeight / 2 - 0.08, -zCenter - halfW * sinA);
            rightCurb.rotation.y = angle;
            rightCurb.castShadow = true;
            rightCurb.receiveShadow = true;
            rightCurb.userData.dynamic = true;
            this.scene.add(rightCurb);
            this.meshes.push(rightCurb);

            // 4. 3-Lane dividers and markings
            if (isFork) {
                // Fork zone island curbs
                const islandGeo = new THREE.BoxGeometry(0.35, 0.38, segLen);
                const divOffset = 1.125;

                const leftIsland = new THREE.Mesh(islandGeo, dividerMat);
                leftIsland.position.set(cx - divOffset * cosA, 0.14, -zCenter + divOffset * sinA);
                leftIsland.rotation.y = angle;
                leftIsland.castShadow = true;
                leftIsland.userData.dynamic = true;
                this.scene.add(leftIsland);
                this.meshes.push(leftIsland);

                const rightIsland = new THREE.Mesh(islandGeo, dividerMat);
                rightIsland.position.set(cx + divOffset * cosA, 0.14, -zCenter - divOffset * sinA);
                rightIsland.rotation.y = angle;
                rightIsland.castShadow = true;
                rightIsland.userData.dynamic = true;
                this.scene.add(rightIsland);
                this.meshes.push(rightIsland);

                if (zStart % 65 < segLen) {
                    this.createForkEntranceSign(cx, zStart);
                }
            } else {
                // Continuous 3-lane divider grooves / glowing rune lines
                const divOffset = 1.125;
                const isTemple = (zCenter >= 135);
                const laneMat = isTemple ? templeRuneMat : new THREE.MeshBasicMaterial({ color: 0x483a2b, transparent: true, opacity: 0.55 });
                const divGeo = new THREE.PlaneGeometry(isTemple ? 0.12 : 0.08, segLen);

                const leftDiv = new THREE.Mesh(divGeo, laneMat);
                leftDiv.rotation.x = -Math.PI / 2;
                leftDiv.rotation.z = angle;
                leftDiv.position.set(cx - divOffset * cosA, 0.14, -zCenter + divOffset * sinA);
                leftDiv.userData.dynamic = true;
                this.scene.add(leftDiv);
                this.meshes.push(leftDiv);

                const rightDiv = new THREE.Mesh(divGeo, laneMat);
                rightDiv.rotation.x = -Math.PI / 2;
                rightDiv.rotation.z = angle;
                rightDiv.position.set(cx + divOffset * cosA, 0.14, -zCenter - divOffset * sinA);
                rightDiv.userData.dynamic = true;
                this.scene.add(rightDiv);
                this.meshes.push(rightDiv);
            }

            // Transverse stone joint seams every few segments
            if (i % 2 === 0) {
                const seamGeo = new THREE.PlaneGeometry(roadWidth - 0.2, 0.05);
                const seamMat = new THREE.MeshBasicMaterial({ color: 0x3d3123, transparent: true, opacity: 0.35 });
                const seam = new THREE.Mesh(seamGeo, seamMat);
                seam.rotation.x = -Math.PI / 2;
                seam.rotation.z = angle;
                seam.position.set(cx, 0.14, -zStart);
                seam.userData.dynamic = true;
                this.scene.add(seam);
                this.meshes.push(seam);
            }

            // Stone torch braziers placed along verges every ~20m
            if (i % 8 === 0) {
                const bOffset = roadWidth / 2 + 0.85;
                const bLeftX = cx - bOffset * cosA;
                const bLeftZ = zCenter - bOffset * sinA;
                const bRightX = cx + bOffset * cosA;
                const bRightZ = zCenter + bOffset * sinA;

                if (zCenter >= 135) {
                    this.createMysticBrazier(bLeftX, bLeftZ);
                    this.createMysticBrazier(bRightX, bRightZ);
                } else {
                    this.createBrazier(bLeftX, bLeftZ);
                    this.createBrazier(bRightX, bRightZ);
                }
            }
        }

        // Ruined Bridge sunken chasm water/mist plane (z = 84 to 110)
        const chasmGeo = new THREE.PlaneGeometry(55, 30);
        const chasmWaterMat = new THREE.MeshStandardMaterial({
            color: 0x1a3d36,
            roughness: 0.2,
            metalness: 0.8
        });
        const chasmWater = new THREE.Mesh(chasmGeo, chasmWaterMat);
        chasmWater.rotation.x = -Math.PI / 2;
        chasmWater.position.set(this.getPathCenterX(97), -4.6, -97);
        chasmWater.userData.dynamic = true;
        this.scene.add(chasmWater);
        this.meshes.push(chasmWater);

        const mistGeo = new THREE.PlaneGeometry(50, 26);
        const mistMat = new THREE.MeshBasicMaterial({
            color: 0x98cfc0,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide
        });
        const chasmMist = new THREE.Mesh(mistGeo, mistMat);
        chasmMist.rotation.x = -Math.PI / 2;
        chasmMist.position.set(this.getPathCenterX(97), -3.2, -97);
        chasmMist.userData.dynamic = true;
        this.scene.add(chasmMist);
        this.meshes.push(chasmMist);

        // 2. Grand Ancient Temple Start Gateway - Proportional to 3-lane road
        const startArchGroup = new THREE.Group();
        const templeStoneMat = new THREE.MeshStandardMaterial({ color: 0x8a7356, roughness: 0.75, metalness: 0.15 });
        const goldReliefMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.25 });

        // Left & right fluted temple pillars flanking the narrowed road
        const pillarGeo = new THREE.CylinderGeometry(0.55, 0.65, 5.8, 12);
        const leftPillar = new THREE.Mesh(pillarGeo, templeStoneMat);
        leftPillar.position.set(-4.3, 2.9, -0.5);
        leftPillar.castShadow = true;
        startArchGroup.add(leftPillar);

        const rightPillar = new THREE.Mesh(pillarGeo, templeStoneMat);
        rightPillar.position.set(4.3, 2.9, -0.5);
        rightPillar.castShadow = true;
        startArchGroup.add(rightPillar);

        // Pillar capitals with gold trim
        const capGeo = new THREE.BoxGeometry(1.3, 0.45, 1.3);
        const leftCap = new THREE.Mesh(capGeo, goldReliefMat);
        leftCap.position.set(-4.3, 5.8, -0.5);
        startArchGroup.add(leftCap);

        const rightCap = new THREE.Mesh(capGeo, goldReliefMat);
        rightCap.position.set(4.3, 5.8, -0.5);
        startArchGroup.add(rightCap);

        // Heavy carved stone lintel arch beam spanning over the 3 lanes
        const beamGeo = new THREE.BoxGeometry(9.4, 1.0, 1.3);
        const topBeam = new THREE.Mesh(beamGeo, templeStoneMat);
        topBeam.position.set(0, 6.3, -0.5);
        topBeam.castShadow = true;
        startArchGroup.add(topBeam);

        // Ornate golden sun crest in center
        const sunCrestGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.25, 16);
        const sunCrest = new THREE.Mesh(sunCrestGeo, goldReliefMat);
        sunCrest.rotation.x = Math.PI / 2;
        sunCrest.position.set(0, 7.3, -0.5);
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
        const startLabelGeo = new THREE.PlaneGeometry(5.2, 1.4);
        const startLabelMat = new THREE.MeshBasicMaterial({ map: startTex, transparent: true });
        const startBanner = new THREE.Mesh(startLabelGeo, startLabelMat);
        startBanner.position.set(0, 8.2, -0.5);
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

        // Left path marker obelisk at divider island
        const obeliskGeo = new THREE.CylinderGeometry(0.24, 0.36, 2.7, 6);
        const leftObelisk = new THREE.Mesh(obeliskGeo, stoneMat);
        leftObelisk.position.set(cx - 1.125, 1.35, -z);
        leftObelisk.castShadow = true;
        group.add(leftObelisk);

        // Right path marker obelisk at divider island
        const rightObelisk = new THREE.Mesh(obeliskGeo, stoneMat);
        rightObelisk.position.set(cx + 1.125, 1.35, -z);
        rightObelisk.castShadow = true;
        group.add(rightObelisk);

        // Small decorative golden rune orbs on obelisks
        const orbGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const leftOrb = new THREE.Mesh(orbGeo, goldMat);
        leftOrb.position.set(cx - 1.125, 2.8, -z);
        group.add(leftOrb);

        const rightOrb = new THREE.Mesh(orbGeo, goldMat);
        rightOrb.position.set(cx + 1.125, 2.8, -z);
        group.add(rightOrb);

        // Overhead stone lintel connecting the dividers with path arrows
        const beamGeo = new THREE.BoxGeometry(2.7, 0.35, 0.35);
        const beam = new THREE.Mesh(beamGeo, stoneMat);
        beam.position.set(cx, 3.2, -z);
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
        const labelGeo = new THREE.PlaneGeometry(2.5, 0.65);
        const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(cx, 3.8, -z);
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
    // Creates 3-lane aligned spinning 3D gold coins, emerald health flasks, and mystic power relics
    createCollectibles(level, trackLength) {
        this.collectibles = [];

        // Distribute trails of collectible coins, health flasks, and power-up relics along the 3 fixed lanes
        const stepZ = 11;
        const totalSteps = Math.floor((trackLength - 28) / stepZ);
        const LANE_WIDTH = 2.25;

        for (let s = 1; s < totalSteps; s++) {
            const z = 16 + s * stepZ;
            const isFork = this.isForkZone(z);

            // Cycle lanes (-1: Left, 0: Center, 1: Right)
            const laneIndex = ((s * 2) % 3) - 1;
            const isPickup = (s % 5 === 0);

            if (isPickup) {
                if (s % 10 === 0) {
                    this.spawnPowerUpPickup(laneIndex, z, LANE_WIDTH);
                } else {
                    this.spawnHealthPickup(laneIndex, z, LANE_WIDTH);
                }
            } else {
                // Trail of 3 golden coins neatly placed along this lane
                for (let c = 0; c < 3; c++) {
                    const coinZ = z + (c - 1) * 1.6;
                    this.spawnCoin(laneIndex, coinZ, LANE_WIDTH);
                }
            }

            // In fork sections: place an extra coin trail in the other open lane
            if (isFork && s % 2 === 0) {
                const altLane = (laneIndex === 0) ? -1 : 0;
                for (let c = 0; c < 3; c++) {
                    const coinZ = z + (c - 1) * 1.6;
                    this.spawnCoin(altLane, coinZ, LANE_WIDTH);
                }
            }
        }
    }

    spawnCoin(laneIndex, z, laneWidth = 2.25) {
        const group = new THREE.Group();
        const laneX = laneIndex * laneWidth;
        const cx = this.getPathCenterX(z);
        const angle = this.getPathTangentAngle ? this.getPathTangentAngle(z) : 0;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const worldX = cx + laneX * cosA;
        const worldZ = -z + laneX * sinA;
        
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

        group.position.set(worldX, 0.85, worldZ);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);

        this.collectibles.push({
            type: 'coin',
            laneIndex: laneIndex,
            laneX: laneX,
            x: worldX,
            z: z,
            mesh: group,
            collected: false,
            value: 1,
            radius: 1.0,
            phase: Math.random() * Math.PI * 2
        });
    }

    spawnHealthPickup(laneIndex, z, laneWidth = 2.25) {
        const group = new THREE.Group();
        const laneX = laneIndex * laneWidth;
        const cx = this.getPathCenterX(z);
        const angle = this.getPathTangentAngle ? this.getPathTangentAngle(z) : 0;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const worldX = cx + laneX * cosA;
        const worldZ = -z + laneX * sinA;

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

        group.position.set(worldX, 1.1, worldZ);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);

        this.collectibles.push({
            type: 'health',
            laneIndex: laneIndex,
            laneX: laneX,
            x: worldX,
            z: z,
            mesh: group,
            collected: false,
            value: 30,
            radius: 1.0,
            phase: Math.random() * Math.PI * 2
        });
    }

    spawnPowerUpPickup(laneIndex, z, laneWidth = 2.25) {
        const group = new THREE.Group();
        const laneX = laneIndex * laneWidth;
        const cx = this.getPathCenterX(z);
        const angle = this.getPathTangentAngle ? this.getPathTangentAngle(z) : 0;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const worldX = cx + laneX * cosA;
        const worldZ = -z + laneX * sinA;

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

        group.position.set(worldX, 1.15, worldZ);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);

        this.collectibles.push({
            type: 'powerup',
            laneIndex: laneIndex,
            laneX: laneX,
            x: worldX,
            z: z,
            mesh: group,
            collected: false,
            value: 25,
            radius: 1.0,
            phase: Math.random() * Math.PI * 2
        });
    }

    // Creates authentic temple obstacles categorized by avoidance mechanic:
    // 1. 'low': Jump over or change lane (fallen pillars, low altars, spike traps)
    // 2. 'high': Crouch/slide under or change lane (overhead arch beams, hanging ruins)
    // 3. 'tall': Cannot jump or slide under, MUST change lane (solid monoliths, tall rock piles)
    createObstacles(level, trackLength) {
        this.obstacles = [];
        const count = 10 + level * 2;
        const enemyZones = [50, 95, 140, 185]; // Avoid enemy zones
        const LANE_WIDTH = 2.25;

        for (let i = 0; i < count; i++) {
            let z;
            let attempts = 0;
            do {
                z = 24 + (i / count) * (trackLength - 50) + (Math.random() - 0.5) * 6;
                attempts++;
            } while (enemyZones.some(ez => Math.abs(ez - z) < 9) && attempts < 40);

            if (attempts >= 40) continue;

            const cx = this.getPathCenterX(z);
            const angle = this.getPathTangentAngle ? this.getPathTangentAngle(z) : 0;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);

            const laneIndices = [-1, 0, 1];
            const laneIndex = laneIndices[(i * 2 + 1) % 3];
            const laneX = laneIndex * LANE_WIDTH;
            const worldX = cx + laneX * cosA;
            const worldZ = z - laneX * sinA;
            const width = 1.85;

            const typeIndex = i % 6;
            let obstacleType = 'low';

            if (typeIndex === 0) {
                obstacleType = 'low';
                this.createFallenPillarObstacle(worldX, worldZ, width, angle);
            } else if (typeIndex === 1) {
                obstacleType = 'high';
                this.createOverheadBeamObstacle(worldX, worldZ, width, angle);
            } else if (typeIndex === 2) {
                obstacleType = 'tall';
                this.createMonolithObstacle(worldX, worldZ, width, angle);
            } else if (typeIndex === 3) {
                obstacleType = 'low';
                this.createSpikeTrapObstacle(worldX, worldZ, width, angle);
            } else if (typeIndex === 4) {
                obstacleType = 'high';
                this.createArchDebrisObstacle(worldX, worldZ, width, angle);
            } else {
                obstacleType = 'low';
                this.createAltarBarrierObstacle(worldX, worldZ, width, angle);
            }

            this.obstacles.push({
                laneIndex: laneIndex,
                laneX: laneX,
                x: laneX,
                worldX: worldX,
                z: z,
                width: width,
                obstacleType: obstacleType,
                passed: false,
                avoided: false
            });
        }
    }

    // LOW OBSTACLE: Broken fluted pillar cylinder lying along the road (Jump to avoid)
    createFallenPillarObstacle(x, z, width, angle = 0) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x948067, roughness: 0.8, metalness: 0.1 });
        const crackedMat = new THREE.MeshStandardMaterial({ color: 0x6e5b46, roughness: 0.9 });

        const pillarGeo = new THREE.CylinderGeometry(0.32, 0.38, width, 10);
        const pillar = new THREE.Mesh(pillarGeo, stoneMat);
        pillar.rotation.z = Math.PI / 2;
        pillar.position.y = 0.32;
        pillar.castShadow = true;
        group.add(pillar);

        // Cracked stone fragments
        for (let i = 0; i < 4; i++) {
            const chunkGeo = new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.12, 0);
            const chunk = new THREE.Mesh(chunkGeo, crackedMat);
            chunk.position.set((Math.random() - 0.5) * (width * 0.8), 0.16, (Math.random() - 0.5) * 0.6);
            chunk.rotation.set(Math.random(), Math.random(), Math.random());
            chunk.castShadow = true;
            group.add(chunk);
        }

        group.position.set(x, 0, -z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    // LOW OBSTACLE: Carved stone altar block with corner urns (Jump to avoid)
    createAltarBarrierObstacle(x, z, width, angle = 0) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a7356, roughness: 0.78, metalness: 0.15 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.4, metalness: 0.6 });

        const altarGeo = new THREE.BoxGeometry(width, 0.7, 0.7);
        const altar = new THREE.Mesh(altarGeo, stoneMat);
        altar.position.y = 0.35;
        altar.castShadow = true;
        group.add(altar);

        const trimGeo = new THREE.BoxGeometry(width + 0.1, 0.12, 0.8);
        const trim = new THREE.Mesh(trimGeo, goldMat);
        trim.position.y = 0.72;
        group.add(trim);

        group.position.set(x, 0, -z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    // LOW OBSTACLE: Sunken spike trap in the road (Jump to avoid)
    createSpikeTrapObstacle(x, z, width, angle = 0) {
        const group = new THREE.Group();
        const plateMat = new THREE.MeshStandardMaterial({ color: 0x3d3328, roughness: 0.95 });
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x8a1c14, metalness: 0.8, roughness: 0.3 });

        const grateGeo = new THREE.BoxGeometry(width, 0.1, 1.4);
        const grate = new THREE.Mesh(grateGeo, plateMat);
        grate.position.y = 0.05;
        grate.receiveShadow = true;
        group.add(grate);

        const spikeCount = Math.floor(width / 0.65);
        for (let row = -1; row <= 1; row += 2) {
            for (let col = 0; col < spikeCount; col++) {
                const spikeGeo = new THREE.ConeGeometry(0.12, 0.55, 4);
                const spike = new THREE.Mesh(spikeGeo, spikeMat);
                spike.position.set(
                    (col - (spikeCount - 1) / 2) * 0.6,
                    0.32,
                    row * 0.4
                );
                spike.castShadow = true;
                group.add(spike);
            }
        }

        group.position.set(x, 0, -z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    // HIGH OBSTACLE: Overhead broken stone lintel beam suspended across the lane (Slide under to avoid)
    createOverheadBeamObstacle(x, z, width, angle = 0) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7a654e, roughness: 0.82 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
        const vineMat = new THREE.MeshStandardMaterial({ color: 0x2e6930, roughness: 0.95 });

        // Left & right supporting ruined wooden/stone stanchions
        const postGeo = new THREE.CylinderGeometry(0.16, 0.2, 2.5, 8);
        const leftPost = new THREE.Mesh(postGeo, stoneMat);
        leftPost.position.set(-width / 2 + 0.15, 1.25, 0);
        leftPost.castShadow = true;
        group.add(leftPost);

        const rightPost = new THREE.Mesh(postGeo, stoneMat);
        rightPost.position.set(width / 2 - 0.15, 1.25, 0);
        rightPost.castShadow = true;
        group.add(rightPost);

        // Low-hanging beam (Clearance underneath is ~1.25m: upright hero hits it, sliding clears it!)
        const beamGeo = new THREE.BoxGeometry(width + 0.3, 0.45, 0.5);
        const beam = new THREE.Mesh(beamGeo, woodMat);
        beam.position.set(0, 1.6, 0);
        beam.castShadow = true;
        group.add(beam);

        // Hanging ancient temple vines dangling from beam
        for (let i = 0; i < 4; i++) {
            const vineGeo = new THREE.CylinderGeometry(0.04, 0.02, 0.45, 6);
            const vine = new THREE.Mesh(vineGeo, vineMat);
            vine.position.set((i - 1.5) * 0.55, 1.25, 0.1);
            group.add(vine);
        }

        group.position.set(x, 0, -z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    // HIGH OBSTACLE: Collapsed hanging arch lintel (Slide under to avoid)
    createArchDebrisObstacle(x, z, width, angle = 0) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7e6952, roughness: 0.82 });
        const reliefMat = new THREE.MeshStandardMaterial({ color: 0xb59955, roughness: 0.5, metalness: 0.5 });

        // Arch pillars on sides
        const pillarGeo = new THREE.BoxGeometry(0.35, 2.4, 0.45);
        const leftP = new THREE.Mesh(pillarGeo, stoneMat);
        leftP.position.set(-width / 2 + 0.15, 1.2, 0);
        group.add(leftP);

        const rightP = new THREE.Mesh(pillarGeo, stoneMat);
        rightP.position.set(width / 2 - 0.15, 1.2, 0);
        group.add(rightP);

        // Overhead lintel beam positioned at chest/head level (Slide underneath!)
        const lintelGeo = new THREE.BoxGeometry(width + 0.2, 0.5, 0.6);
        const lintel = new THREE.Mesh(lintelGeo, stoneMat);
        lintel.position.set(0, 1.55, 0);
        lintel.castShadow = true;
        group.add(lintel);

        // Carved rune crest on lintel
        const crestGeo = new THREE.BoxGeometry(0.6, 0.35, 0.65);
        const crest = new THREE.Mesh(crestGeo, reliefMat);
        crest.position.set(0, 1.55, 0);
        group.add(crest);

        group.position.set(x, 0, -z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    // TALL OBSTACLE: Giant ancient stone monolith / totem obelisk (CANNOT jump or slide, MUST change lane)
    createMonolithObstacle(x, z, width, angle = 0) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a4d3f, roughness: 0.85, metalness: 0.1 });
        const runeMat = new THREE.MeshStandardMaterial({ 
            color: 0xff3d00, 
            emissive: 0xff1744, 
            emissiveIntensity: 0.9, 
            roughness: 0.3 
        });

        // Massive solid monolith block rising 3.4m tall
        const monolithGeo = new THREE.BoxGeometry(width * 0.82, 3.4, 1.2);
        const monolith = new THREE.Mesh(monolithGeo, stoneMat);
        monolith.position.y = 1.7;
        monolith.castShadow = true;
        group.add(monolith);

        // Tiered stepped base
        const baseGeo = new THREE.BoxGeometry(width * 0.95, 0.35, 1.5);
        const base = new THREE.Mesh(baseGeo, stoneMat);
        base.position.y = 0.18;
        base.castShadow = true;
        group.add(base);

        // Glowing menacing ancient carved rune sigil
        const runeGeo = new THREE.BoxGeometry(0.5, 0.9, 0.08);
        const rune = new THREE.Mesh(runeGeo, runeMat);
        rune.position.set(0, 2.0, 0.62);
        group.add(rune);

        group.position.set(x, 0, -z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createRubbleObstacle(x, z, width) {
        this.createMonolithObstacle(x, z, width);
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

        // Animate dynamic environmental props (sunbeams, mana orbs, brazier flames)
        for (const prop of this.animatedProps) {
            if (!prop.mesh) continue;
            if (prop.type === 'sunbeam' && prop.mesh.material) {
                prop.mesh.material.opacity = 0.10 + Math.sin(this.animTime * 1.5 + prop.phase) * 0.035;
            } else if (prop.type === 'manaOrb') {
                prop.mesh.position.y = (prop.baseY || 1.8) + Math.sin(this.animTime * 2.6 + prop.phase) * 0.15;
                prop.mesh.rotation.y += delta * 1.6;
                prop.mesh.rotation.z += delta * 0.8;
            } else if (prop.type === 'flame') {
                prop.mesh.scale.y = 1.0 + Math.sin(this.animTime * 8.5 + prop.phase) * 0.15;
                prop.mesh.scale.x = 1.0 + Math.cos(this.animTime * 7.5 + prop.phase) * 0.12;
            }
        }
    }

    createEnemies(level, trackLength) {
        const count = 2 + Math.floor(level * 0.5);
        const spacing = (trackLength - 60) / (count + 1);

        for (let i = 0; i < count; i++) {
            const z = 50 + (i + 1) * spacing;
            let enemyCount;
            const isFirst = (i === 0);

            if (isFirst) {
                // First encounter is an easy, forgiving tutorial introduction!
                enemyCount = (level === 1) ? 3 : Math.min(5, 3 + level);
            } else {
                // Later encounters scale gradually with level and distance
                enemyCount = Math.floor(4 + i * 2 + level * 2 + Math.random() * level);
            }
            
            const enemy = {
                z: z,
                count: enemyCount,
                defeated: false,
                meshes: [],
                encounterIndex: i,
                isFirstEncounter: (isFirst && level === 1)
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
            const radius = Math.sqrt(i / displayCount) * 1.7;
            // First encounter has slightly lighter scout armor, later enemies menacing crimson
            const stickmanColor = enemy.isFirstEncounter ? 0x9c4d2f : 0x880e4f;
            const stickman = this.createStickman(stickmanColor);
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

        // High-contrast arcade danger / tutorial badge
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        const isTutorial = !!enemy.isFirstEncounter;
        const borderColor = isTutorial ? '#ffb74d' : '#ff1744';
        const titleText = isTutorial ? '⚔️ SCOUTS (EASY)' : '⚔️ RIVALS';
        const titleColor = isTutorial ? '#ffe082' : '#ff8a80';

        ctx.fillStyle = isTutorial ? 'rgba(30, 20, 10, 0.92)' : 'rgba(20, 4, 10, 0.9)';
        ctx.beginPath();
        ctx.roundRect(12, 12, 232, 104, 24);
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.fillStyle = titleColor;
        ctx.font = '900 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(titleText, 128, 44);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 52px system-ui, sans-serif';
        ctx.shadowColor = borderColor;
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
        
        const isTutorial = !!enemy.isFirstEncounter;
        const borderColor = isTutorial ? '#ffb74d' : '#ff1744';
        const titleText = isTutorial ? '⚔️ SCOUTS (EASY)' : '⚔️ RIVALS';
        const titleColor = isTutorial ? '#ffe082' : '#ff8a80';

        ctx.fillStyle = isTutorial ? 'rgba(30, 20, 10, 0.92)' : 'rgba(20, 4, 10, 0.9)';
        ctx.beginPath();
        ctx.roundRect(12, 12, 232, 104, 24);
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.fillStyle = titleColor;
        ctx.font = '900 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(titleText, 128, 44);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 52px system-ui, sans-serif';
        ctx.shadowColor = borderColor;
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

                    // Right arm attack animation or telegraph charge
                    const isTelegraphing = (this.game && this.game.isEnemyTelegraphing);
                    if (isTelegraphing) {
                        // High overhead charge windup - clear visual warning to player!
                        if (children.length >= 6) {
                            children[5].rotation.x = -1.6 + Math.sin(this.enemyCombatTime * 25 + i) * 0.08;
                            children[5].rotation.y = 0.3;
                            children[5].rotation.z = 0.35;
                        }
                        if (children.length >= 1) {
                            children[0].rotation.x = -0.3;
                        }
                        stickman.position.y = 0.12 + Math.sin(this.enemyCombatTime * 28 + i) * 0.04;
                    } else {
                        // Rhythmic attack swings scaled to difficulty
                        const attackSpeed = fightingEnemy.isFirstEncounter ? 5.5 : 8.5;
                        const attackPhase = (this.enemyCombatTime * attackSpeed + i * 1.8 + Math.PI) % (Math.PI * 2);
                        if (children.length >= 6) {
                            children[5].rotation.x = Math.sin(attackPhase) * 1.1 - 0.2;
                            children[5].rotation.y = Math.cos(attackPhase) * 0.3;
                            children[5].rotation.z = 0.2;
                        }

                        // Chopping lunge
                        if (children.length >= 1) {
                            children[0].rotation.x = -0.18 - Math.sin(attackPhase) * 0.1;
                            children[0].rotation.y = -Math.sin(attackPhase) * 0.12;
                        }
                        if (children.length >= 2) {
                            children[1].rotation.x = -0.08 - Math.sin(attackPhase) * 0.06;
                        }

                        // Occasional fiery red slash arc on enemy strike apex
                        if (attackPhase > 1.7 && attackPhase < 2.1 && Math.random() < 0.25 && crowdManager) {
                            const worldPos = new THREE.Vector3();
                            stickman.getWorldPosition(worldPos);
                            worldPos.y += 0.8;
                            worldPos.z += 0.35;
                            worldPos.x += (Math.random() - 0.5) * 0.3;
                            crowdManager.spawnSlash(worldPos, null, 0xff1744, 0.95);
                        }
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

        // Grand Ancient Temple Sanctuary & Victory Portal aligned to curved path end
        const sanctuaryGroup = new THREE.Group();
        const templeStoneMat = new THREE.MeshStandardMaterial({ color: 0x8a7356, roughness: 0.75, metalness: 0.15 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.2 });

        // Sanctuary stone floor dais scaled to 3-lane proportions
        const daisGeo = new THREE.BoxGeometry(11.0, 0.4, 18);
        const dais = new THREE.Mesh(daisGeo, templeStoneMat);
        dais.position.set(0, 0.2, 0);
        dais.receiveShadow = true;
        sanctuaryGroup.add(dais);

        // Flanking carved victory colonnade hugging dais edges
        for (let side of [-1, 1]) {
            for (let c = 0; c < 3; c++) {
                const colGeo = new THREE.CylinderGeometry(0.55, 0.65, 7.2, 12);
                const col = new THREE.Mesh(colGeo, templeStoneMat);
                col.position.set(side * 5.2, 3.8, (c - 1) * 5.5);
                col.castShadow = true;
                sanctuaryGroup.add(col);

                const colCap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.4), goldMat);
                colCap.position.set(side * 5.2, 7.5, (c - 1) * 5.5);
                sanctuaryGroup.add(colCap);
            }
        }

        // Towering Grand Victory Archway
        const leftPylon = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 9.2, 12), templeStoneMat);
        leftPylon.position.set(-4.4, 4.6, 0);
        leftPylon.castShadow = true;
        sanctuaryGroup.add(leftPylon);

        const rightPylon = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 9.2, 12), templeStoneMat);
        rightPylon.position.set(4.4, 4.6, 0);
        rightPylon.castShadow = true;
        sanctuaryGroup.add(rightPylon);

        const topArch = new THREE.Mesh(new THREE.BoxGeometry(10.0, 1.3, 1.6), templeStoneMat);
        topArch.position.set(0, 9.2, 0);
        topArch.castShadow = true;
        sanctuaryGroup.add(topArch);

        // Ancient Sun-Disc Crest
        const sunDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.35, 24), goldMat);
        sunDisc.rotation.x = Math.PI / 2;
        sunDisc.position.set(0, 10.4, 0);
        sanctuaryGroup.add(sunDisc);

        // Radiant Mystic Victory Portal (Glow plane)
        const portalGeo = new THREE.PlaneGeometry(7.2, 7.5);
        const portalMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.65,
            side: THREE.DoubleSide
        });
        const portal = new THREE.Mesh(portalGeo, portalMat);
        portal.position.set(0, 4.2, 0);
        sanctuaryGroup.add(portal);

        // Golden Victory Ring inside the portal
        const ringGeo = new THREE.TorusGeometry(2.8, 0.2, 16, 32);
        const ring = new THREE.Mesh(ringGeo, goldMat);
        ring.position.set(0, 4.2, 0.1);
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
        const labelGeo = new THREE.PlaneGeometry(5.2, 1.4);
        const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(0, 11.6, 0);
        sanctuaryGroup.add(label);

        const endCx = this.getPathCenterX(trackLength);
        const endAngle = this.getPathTangentAngle ? this.getPathTangentAngle(trackLength) : 0;
        sanctuaryGroup.position.set(endCx, 0, -trackLength);
        sanctuaryGroup.rotation.y = endAngle;

        sanctuaryGroup.userData.dynamic = true;
        this.scene.add(sanctuaryGroup);
        this.meshes.push(sanctuaryGroup);
    }

    shakeBoss() {}
    playBossDefeatAnimation() {}
    updateBossDefeat(delta) {}

    createDecorations(trackLength) {
        // 1. Multi-tier rolling hills and distant terrain
        this.createRollingHills(trackLength);

        // 2. Progressive environmental distribution across the 3 distinct zones with gradual blending
        for (let z = 6; z < trackLength - 6; z += 5.5) {
            const progress = z / trackLength; // 0.0 to 1.0
            const cx = this.getPathCenterX(z);
            const angle = this.getPathTangentAngle ? this.getPathTangentAngle(z) : 0;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);

            // Both left and right side scenery positioned relative to the curved road normal
            for (let side of [-1, 1]) {
                const rand = Math.random();
                const jitterDist = (Math.random() - 0.5) * 2.0;

                // ========================================================
                // ZONE 1: Ancient Forest (Start to 35% / z: 0 - 70m)
                // Dense trees, bushes, roots, fallen logs, sunbeams, mist
                // ========================================================
                if (progress < 0.35) {
                    // Foreground verge: gnarled roots, mossy logs, ferns, roadside flora
                    const vergeOffset = side * 4.25;
                    const vx = cx + vergeOffset * cosA;
                    const vz = -(z + jitterDist) - vergeOffset * sinA;

                    if (rand < 0.28) {
                        this.createTreeRoot(vx, -vz, side, angle);
                    } else if (rand < 0.52) {
                        this.createFallenLog(vx, -vz, 3.2 + Math.random() * 1.5, angle);
                    } else if (rand < 0.76) {
                        this.createFern(vx, -vz);
                    } else {
                        const flowerCol = Math.random() > 0.5 ? 0xf43f5e : 0xfacc15;
                        this.createBush(vx, -vz, 0.7 + Math.random() * 0.4, flowerCol);
                    }

                    // Midground forest: Ancient towering oak/canopy trees & mossy rocks
                    const midOffset = side * (5.8 + Math.random() * 8.5);
                    const mx = cx + midOffset * cosA;
                    const mz = -(z + (Math.random() - 0.5) * 3) - midOffset * sinA;

                    const foliageCols = [0x15803d, 0x166534, 0x14532d, 0x1e5a32];
                    const fCol = foliageCols[Math.floor(Math.random() * foliageCols.length)];
                    this.createAncientForestTree(mx, -mz, 0.9 + Math.random() * 0.5, fCol);

                    if (Math.random() > 0.35) {
                        const rockOffset = side * (4.8 + Math.random() * 5.0);
                        const rx = cx + rockOffset * cosA;
                        const rz = -(z + 2.0) - rockOffset * sinA;
                        this.createRock(rx, -rz, 0.6 + Math.random() * 0.7);
                    }
                }
                // ========================================================
                // ZONE 2: Ancient Ruins (35% to 70% / z: 70 - 140m)
                // Broken stone walls, fluted pillars, stone stairs, statues, chasm
                // ========================================================
                else if (progress < 0.70) {
                    const vergeOffset = side * 4.35;
                    const vx = cx + vergeOffset * cosA;
                    const vz = -(z + jitterDist) - vergeOffset * sinA;

                    // Exclude immediate bridge zone verges as bridge has its own parapet curbs
                    const isBridgeSpan = (z >= 86 && z <= 108);

                    if (!isBridgeSpan) {
                        if (rand < 0.28) {
                            // Ancient Guardian Statues standing vigil beside the ruins
                            this.createGuardianStatue(vx, -vz, side, angle);
                        } else if (rand < 0.52) {
                            // Weathered stone balustrade / ruined wall
                            this.createRuinedWall(vx, -vz, 4.0, angle);
                        } else if (rand < 0.76) {
                            // Broken fluted column (some broken at mid-height, some standing)
                            const isBroken = Math.random() > 0.4;
                            this.createRuinedPillar(vx, -vz, isBroken ? 2.2 : 4.8, isBroken, angle);
                        } else {
                            // Ancient stone stairs leading up into abandoned hillside shrines
                            this.createRuinedStairs(vx, -vz, side, angle);
                        }
                    }

                    // Midground ruins: Colonnades, ancient crumbling archways, desert boulders
                    const midOffset = side * (5.8 + Math.random() * 9.0);
                    const mx = cx + midOffset * cosA;
                    const mz = -(z + (Math.random() - 0.5) * 3) - midOffset * sinA;

                    if (Math.random() > 0.4) {
                        this.createRuinedPillar(mx, -mz, 5.2, false, angle);
                    } else {
                        this.createPalmTree(mx, -mz, 0.9 + Math.random() * 0.4);
                    }

                    const rockOffset = side * (4.8 + Math.random() * 5.5);
                    const rx = cx + rockOffset * cosA;
                    const rz = -(z - 1.5) - rockOffset * sinA;
                    this.createRock(rx, -rz, 0.7 + Math.random() * 0.8);
                }
                // ========================================================
                // ZONE 3: Magical Temple / Castle (70% to 100% / z: 140 - 200m)
                // Dark basalt structures, glowing runes, grand colonnades, mystic pylons
                // ========================================================
                else {
                    const vergeOffset = side * 4.45;
                    const vx = cx + vergeOffset * cosA;
                    const vz = -(z + jitterDist) - vergeOffset * sinA;

                    if (rand < 0.30) {
                        // Grand fluted black basalt colonnade with gold capital and glowing base
                        this.createTempleColonnade(vx, -vz, 6.2, angle);
                    } else if (rand < 0.55) {
                        // Monumental temple obelisk pylon with hovering cyan mana crystal
                        this.createTemplePylon(vx, -vz, angle);
                    } else if (rand < 0.78) {
                        // Carved mana plinth with hovering glowing rune orb
                        this.createManaPlinth(vx, -vz, angle);
                    } else {
                        // Mystic flame brazier with cyan/violet mana fire
                        this.createMysticBrazier(vx, -vz, angle);
                    }

                    // Midground temple architecture: Towering pillars, bastions, and alpine evergreens
                    const midOffset = side * (5.6 + Math.random() * 8.5);
                    const mx = cx + midOffset * cosA;
                    const mz = -(z + (Math.random() - 0.5) * 3) - midOffset * sinA;

                    if (Math.random() > 0.4) {
                        this.createTempleColonnade(mx, -mz, 7.8, angle);
                    } else {
                        this.createPineTree(mx, -mz, 1.1 + Math.random() * 0.5);
                    }

                    const rockOffset = side * (4.8 + Math.random() * 5.0);
                    const rx = cx + rockOffset * cosA;
                    const rz = -(z + 1.2) - rockOffset * sinA;
                    this.createRock(rx, -rz, 0.8 + Math.random() * 0.7);
                }
            }

            // Overhead environmental architecture spanning the path:
            if (progress < 0.35 && z % 22 < 5.5) {
                // Zone 1: Overhead curved leafy canopy branch arch & sunbeam shaft
                this.createCanopyBranchArch(cx, z, angle);
                this.createSunbeamShaft(cx, z, angle);
            } else if (progress >= 0.70 && z % 20 < 5.5 && z < trackLength - 16) {
                // Zone 3: Monumental vaulted ribbed stone temple arch overhead with glowing runes
                this.createTempleVaultArch(cx, z, angle);
            }
        }

        // 3. Flanking canyon rock cliff walls creating trail enclosure and environmental depth
        this.createCanyonWalls(trackLength);

        // 4. Distant majestic mountain ranges along the horizon
        this.createMountains(trackLength);

        // 5. Distant colorful hot air balloons adding arcade life to the horizon
        this.createHotAirBalloons(trackLength);

        // 6. Stylized low-poly 3D clouds in the sky
        this.createClouds(trackLength);
    }

    // ========================================================
    // ZONE 1: ANCIENT FOREST HELPERS
    // ========================================================
    createAncientForestTree(x, z, scale = 1, foliageColor = 0x166534) {
        const group = new THREE.Group();

        // Thick gnarled wooden trunk with buttressed roots
        const trunkGeo = new THREE.CylinderGeometry(0.25 * scale, 0.42 * scale, 3.2 * scale, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x482f1b, roughness: 0.9 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.6 * scale;
        trunk.castShadow = true;
        group.add(trunk);

        // Low-poly multi-tier dense leafy canopy
        const canopyMat = new THREE.MeshStandardMaterial({
            color: foliageColor,
            flatShading: true,
            roughness: 0.65
        });

        const mainCanopy = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5 * scale, 1), canopyMat);
        mainCanopy.position.y = 3.6 * scale;
        mainCanopy.castShadow = true;
        group.add(mainCanopy);

        const sub1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 * scale, 1), canopyMat);
        sub1.position.set(0.6 * scale, 4.0 * scale, 0.3 * scale);
        sub1.castShadow = true;
        group.add(sub1);

        const highlightMat = new THREE.MeshStandardMaterial({
            color: 0x22c55e,
            flatShading: true,
            roughness: 0.6
        });
        const topCanopy = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95 * scale, 1), highlightMat);
        topCanopy.position.set(-0.35 * scale, 4.6 * scale, -0.2 * scale);
        topCanopy.castShadow = true;
        group.add(topCanopy);

        group.position.set(x, 0, z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createTreeRoot(x, z, side, angle = 0) {
        const group = new THREE.Group();
        const rootMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.95 });

        // Arching gnarled root cylinder emerging from soil and curling along curb
        const rootGeo = new THREE.CylinderGeometry(0.12, 0.22, 2.4, 6);
        const root = new THREE.Mesh(rootGeo, rootMat);
        root.rotation.z = side * 0.45;
        root.rotation.x = Math.PI / 2 + 0.2;
        root.position.set(0, 0.22, 0);
        root.castShadow = true;
        group.add(root);

        // Moss tuft on root
        const mossMat = new THREE.MeshStandardMaterial({ color: 0x2e6b3e, roughness: 0.9 });
        const moss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), mossMat);
        moss.position.set(side * 0.15, 0.32, 0.2);
        group.add(moss);

        group.position.set(x, 0, z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createFallenLog(x, z, length = 3.5, angle = 0) {
        const group = new THREE.Group();
        const logMat = new THREE.MeshStandardMaterial({ color: 0x422d1b, roughness: 0.92 });
        const mossMat = new THREE.MeshStandardMaterial({ color: 0x367a42, roughness: 0.85 });

        const logGeo = new THREE.CylinderGeometry(0.22, 0.28, length, 6);
        const log = new THREE.Mesh(logGeo, logMat);
        log.rotation.x = Math.PI / 2 + 0.08;
        log.rotation.z = (Math.random() - 0.5) * 0.25;
        log.position.y = 0.22;
        log.castShadow = true;
        group.add(log);

        // Moss patches on log
        for (let i = 0; i < 3; i++) {
            const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), mossMat);
            m.position.set((Math.random() - 0.5) * 0.2, 0.38, (i - 1) * (length * 0.28));
            group.add(m);
        }

        group.position.set(x, 0, z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createFern(x, z) {
        const group = new THREE.Group();
        const fernMat = new THREE.MeshStandardMaterial({
            color: 0x16a34a,
            flatShading: true,
            roughness: 0.7,
            side: THREE.DoubleSide
        });

        // 6 radiating fern fronds
        for (let i = 0; i < 6; i++) {
            const frondGeo = new THREE.ConeGeometry(0.24, 0.95, 3);
            const frond = new THREE.Mesh(frondGeo, fernMat);
            frond.rotation.y = (i / 6) * Math.PI * 2;
            frond.rotation.z = 0.75;
            frond.position.y = 0.28;
            group.add(frond);
        }

        group.position.set(x, 0, z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createCanopyBranchArch(cx, z, angle = 0) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x482f1b, roughness: 0.9 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, flatShading: true, roughness: 0.7 });
        const vineMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.9 });

        // Arching natural bough spanning high overhead at y = 5.8m (safe above player jump)
        const archGeo = new THREE.TorusGeometry(5.2, 0.32, 6, 12, Math.PI);
        const arch = new THREE.Mesh(archGeo, woodMat);
        arch.position.set(0, 3.8, 0);
        arch.castShadow = true;
        group.add(arch);

        // Clusters of leaves and hanging vines
        for (let i = 0; i < 5; i++) {
            const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), leafMat);
            const a = (i / 4) * Math.PI;
            leaf.position.set(Math.cos(a) * 5.0, 3.8 + Math.sin(a) * 4.8, (Math.random() - 0.5) * 0.8);
            group.add(leaf);

            // Hanging dangling vine
            const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 1.2, 4), vineMat);
            vine.position.set(Math.cos(a) * 4.6, 3.8 + Math.sin(a) * 4.0 - 0.6, 0);
            group.add(vine);
        }

        group.position.set(cx, 0, -z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createSunbeamShaft(cx, z, angle = 0) {
        const group = new THREE.Group();
        // Warm translucent sunlight shaft filtering through forest canopy
        const beamGeo = new THREE.PlaneGeometry(3.5, 14);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0xfff3c4,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.rotation.z = -0.35; // Diagonal sunbeam angle
        beam.rotation.x = 0.2;
        beam.position.set(-1.8, 6.5, 0);
        group.add(beam);

        group.position.set(cx, 0, -z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);

        this.animatedProps.push({
            type: 'sunbeam',
            mesh: beam,
            phase: Math.random() * Math.PI * 2
        });
    }

    // ========================================================
    // ZONE 2: ANCIENT RUINS HELPERS
    // ========================================================
    createRuinedPillar(x, z, height = 4.8, isBroken = false, angle = 0) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9e8a6c, roughness: 0.84, metalness: 0.12 });
        const crackedMat = new THREE.MeshStandardMaterial({ color: 0x6e5b46, roughness: 0.9 });

        // Tiered square base plinth
        const baseGeo = new THREE.BoxGeometry(0.9, 0.45, 0.9);
        const base = new THREE.Mesh(baseGeo, stoneMat);
        base.position.y = 0.225;
        base.castShadow = true;
        group.add(base);

        // Fluted column shaft
        const colGeo = new THREE.CylinderGeometry(0.34, 0.40, height, 10);
        const col = new THREE.Mesh(colGeo, stoneMat);
        col.position.y = 0.45 + height / 2;
        col.castShadow = true;
        group.add(col);

        if (!isBroken) {
            // Intact carved stone capital
            const capGeo = new THREE.BoxGeometry(0.95, 0.4, 0.95);
            const cap = new THREE.Mesh(capGeo, stoneMat);
            cap.position.y = 0.45 + height + 0.2;
            cap.castShadow = true;
            group.add(cap);
        } else {
            // Shattered top and fallen stone drum chunks on ground
            for (let i = 0; i < 3; i++) {
                const chunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.5, 6), crackedMat);
                chunk.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
                chunk.position.set((Math.random() - 0.5) * 0.8 + 0.6, 0.25, (Math.random() - 0.5) * 0.8);
                chunk.castShadow = true;
                group.add(chunk);
            }
        }

        group.position.set(x, 0, z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createGuardianStatue(x, z, side, angle = 0) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x827056, roughness: 0.85, metalness: 0.15 });
        const goldTrim = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.7 });

        // Stepped carved statue pedestal
        const pedGeo = new THREE.BoxGeometry(1.2, 0.8, 1.2);
        const ped = new THREE.Mesh(pedGeo, stoneMat);
        ped.position.y = 0.4;
        ped.castShadow = true;
        group.add(ped);

        // Weathered armored guardian torso
        const bodyGeo = new THREE.BoxGeometry(0.65, 1.4, 0.45);
        const body = new THREE.Mesh(bodyGeo, stoneMat);
        body.position.y = 1.5;
        body.castShadow = true;
        group.add(body);

        // Golden breastplate relief
        const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 8), goldTrim);
        crest.rotation.x = Math.PI / 2;
        crest.position.set(0, 1.6, 0.25);
        group.add(crest);

        // Helmet head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.42), stoneMat);
        head.position.y = 2.45;
        head.castShadow = true;
        group.add(head);

        // Stone spear held upright
        const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.8, 6), stoneMat);
        spear.position.set(side * 0.45, 2.0, 0.15);
        spear.castShadow = true;
        group.add(spear);

        const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), goldTrim);
        spearTip.position.set(side * 0.45, 4.0, 0.15);
        group.add(spearTip);

        group.position.set(x, 0, z);
        group.rotation.y = angle + (side > 0 ? -0.25 : 0.25);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createRuinedStairs(x, z, side, angle = 0) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x948268, roughness: 0.88 });

        // 3 Tiered stone steps leading outward into the hillside
        for (let i = 0; i < 3; i++) {
            const stepGeo = new THREE.BoxGeometry(1.6, 0.28, 1.1 + i * 0.6);
            const step = new THREE.Mesh(stepGeo, stoneMat);
            step.position.set(side * (i * 0.35), 0.14 + i * 0.26, 0);
            step.castShadow = true;
            step.receiveShadow = true;
            group.add(step);
        }

        // Small ruined altar block at top of stairs
        const altar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.9), stoneMat);
        altar.position.set(side * 1.3, 0.9, 0);
        altar.castShadow = true;
        group.add(altar);

        group.position.set(x, 0, z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    // ========================================================
    // ZONE 3: MAGICAL TEMPLE & CITADEL HELPERS
    // ========================================================
    createTempleColonnade(x, z, height = 6.2, angle = 0) {
        const group = new THREE.Group();
        const basaltMat = new THREE.MeshStandardMaterial({ color: 0x1b1f2e, roughness: 0.5, metalness: 0.7 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.25, metalness: 0.9 });
        const runeMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00d8f6,
            emissiveIntensity: 0.85
        });

        // Stepped basalt base with glowing rune band
        const baseGeo = new THREE.BoxGeometry(1.1, 0.5, 1.1);
        const base = new THREE.Mesh(baseGeo, basaltMat);
        base.position.y = 0.25;
        base.castShadow = true;
        group.add(base);

        const runeBand = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.08, 1.12), runeMat);
        runeBand.position.y = 0.45;
        group.add(runeBand);

        // Fluted basalt column shaft
        const shaftGeo = new THREE.CylinderGeometry(0.38, 0.45, height, 12);
        const shaft = new THREE.Mesh(shaftGeo, basaltMat);
        shaft.position.y = 0.5 + height / 2;
        shaft.castShadow = true;
        group.add(shaft);

        // Ornate golden capital
        const capGeo = new THREE.BoxGeometry(1.2, 0.45, 1.2);
        const cap = new THREE.Mesh(capGeo, goldMat);
        cap.position.y = 0.5 + height + 0.225;
        cap.castShadow = true;
        group.add(cap);

        group.position.set(x, 0, z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createTemplePylon(x, z, angle = 0) {
        const group = new THREE.Group();
        const basaltMat = new THREE.MeshStandardMaterial({ color: 0x161824, roughness: 0.6, metalness: 0.6 });
        const manaMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00d0f0,
            emissiveIntensity: 1.0,
            roughness: 0.15,
            metalness: 0.8
        });

        // 7.5m Monumental Obelisk
        const pylonGeo = new THREE.CylinderGeometry(0.3, 0.65, 7.5, 4);
        const pylon = new THREE.Mesh(pylonGeo, basaltMat);
        pylon.position.y = 3.75;
        pylon.rotation.y = Math.PI / 4;
        pylon.castShadow = true;
        group.add(pylon);

        // Floating hovering mana crystal polyhedron atop the pylon
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), manaMat);
        crystal.position.y = 8.1;
        group.add(crystal);

        // Mana ring orbit
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.65, 0.04, 6, 16),
            new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 })
        );
        ring.position.y = 8.1;
        ring.rotation.x = Math.PI / 3;
        group.add(ring);

        group.position.set(x, 0, z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);

        this.animatedProps.push({
            type: 'manaOrb',
            mesh: crystal,
            baseY: 8.1,
            phase: Math.random() * Math.PI * 2
        });
    }

    createManaPlinth(x, z, angle = 0) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x222638, roughness: 0.7, metalness: 0.4 });
        const manaOrbMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00e5ff,
            emissiveIntensity: 1.1,
            roughness: 0.1
        });

        // Pedestal base
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.2, 8), stoneMat);
        base.position.y = 0.6;
        base.castShadow = true;
        group.add(base);

        // Hovering glowing mana orb
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), manaOrbMat);
        orb.position.y = 1.7;
        group.add(orb);

        // Floating rune rings
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.38, 16), ringMat);
        ring.position.y = 1.7;
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);

        group.position.set(x, 0, z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);

        this.animatedProps.push({
            type: 'manaOrb',
            mesh: orb,
            baseY: 1.7,
            phase: Math.random() * Math.PI * 2
        });
    }

    createMysticBrazier(x, z, angle = 0) {
        const group = new THREE.Group();
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x141620, roughness: 0.5, metalness: 0.85 });
        const flameMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x0099ff,
            emissiveIntensity: 1.5,
            roughness: 0.2
        });

        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.3, 8), ironMat);
        ped.position.y = 0.65;
        ped.castShadow = true;
        group.add(ped);

        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.25, 0.35, 8), ironMat);
        bowl.position.y = 1.45;
        group.add(bowl);

        // Mystic flame cone
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 6), flameMat);
        flame.position.y = 1.9;
        group.add(flame);

        group.position.set(x, 0, z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);

        this.animatedProps.push({
            type: 'flame',
            mesh: flame,
            phase: Math.random() * Math.PI * 2
        });
    }

    createTempleVaultArch(cx, z, angle = 0) {
        const group = new THREE.Group();
        const basaltMat = new THREE.MeshStandardMaterial({ color: 0x1a1e2b, roughness: 0.6, metalness: 0.5 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.85 });
        const runeGlow = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.9 });

        // Monumental vaulted ribbed arch spanning across the road at height 7.5m
        const archWidth = 10.2;
        const archHeight = 7.5;

        // Left & right pylon columns
        const leftCol = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, archHeight, 10), basaltMat);
        leftCol.position.set(-archWidth / 2, archHeight / 2, 0);
        leftCol.castShadow = true;
        group.add(leftCol);

        const rightCol = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, archHeight, 10), basaltMat);
        rightCol.position.set(archWidth / 2, archHeight / 2, 0);
        rightCol.castShadow = true;
        group.add(rightCol);

        // Overhead heavy lintel beam
        const beamGeo = new THREE.BoxGeometry(archWidth + 1.6, 1.1, 1.4);
        const beam = new THREE.Mesh(beamGeo, basaltMat);
        beam.position.set(0, archHeight + 0.55, 0);
        beam.castShadow = true;
        group.add(beam);

        // Glowing carved rune frieze across beam
        const frieze = new THREE.Mesh(new THREE.PlaneGeometry(archWidth * 0.75, 0.35), runeGlow);
        frieze.position.set(0, archHeight + 0.55, 0.72);
        group.add(frieze);

        // Golden center keystone crest
        const crest = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 1.5), goldMat);
        crest.position.set(0, archHeight + 0.6, 0);
        group.add(crest);

        group.position.set(cx, 0, -z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    // ========================================================
    // SURROUNDINGS & DEPTH (Canyon walls, hills, mountains)
    // ========================================================
    createCanyonWalls(trackLength) {
        // Create broken rocky cliff canyon terraces along both flanks
        const cliffColors = [0x504234, 0x42362b, 0x362c23];
        for (let z = 12; z < trackLength + 40; z += 24) {
            for (let side of [-1, 1]) {
                const group = new THREE.Group();
                const cliffX = side * (16 + Math.random() * 5);
                const cliffZ = -z + (Math.random() - 0.5) * 6;
                const height = 4.5 + Math.random() * 3.5;
                const width = 12 + Math.random() * 8;

                const cliffGeo = new THREE.BoxGeometry(width, height, 8);
                const cliffMat = new THREE.MeshStandardMaterial({
                    color: cliffColors[Math.floor(Math.random() * cliffColors.length)],
                    roughness: 0.92,
                    flatShading: true
                });
                const cliff = new THREE.Mesh(cliffGeo, cliffMat);
                cliff.position.y = height / 2 - 0.2;
                cliff.rotation.y = (Math.random() - 0.5) * 0.35;
                cliff.receiveShadow = true;
                group.add(cliff);

                group.position.set(cliffX, 0, cliffZ);
                group.userData.dynamic = true;
                this.scene.add(group);
                this.meshes.push(group);
            }
        }
    }

    createRollingHills(trackLength) {
        const hillColors = [0x285934, 0x327341, 0x224c2c];
        for (let z = 0; z < trackLength + 60; z += 18) {
            for (let side of [-1, 1]) {
                const hillX = side * (26 + Math.random() * 16);
                const hillZ = -z + (Math.random() - 0.5) * 8;
                const radius = 10 + Math.random() * 8;
                const height = 2.2 + Math.random() * 2.5;

                const hillGeo = new THREE.CylinderGeometry(radius * 0.3, radius, height, 7);
                const hillMat = new THREE.MeshStandardMaterial({
                    color: hillColors[Math.floor(Math.random() * hillColors.length)],
                    flatShading: true,
                    roughness: 0.92
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

    createPalmTree(x, z, scale = 1) {
        const group = new THREE.Group();
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e4e34, roughness: 0.8 });
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

        const frondMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, flatShading: true, roughness: 0.55 });
        const frondGeo = new THREE.ConeGeometry(0.55 * scale, 2.0 * scale, 4);

        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const frond = new THREE.Mesh(frondGeo, frondMat);
            frond.position.set(0.25 * scale, 3.0 * scale, 0);
            frond.rotation.y = angle;
            frond.rotation.z = 1.15;
            frond.castShadow = true;
            group.add(frond);
        }

        group.position.set(x, 0, z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createPineTree(x, z, scale = 1) {
        const group = new THREE.Group();
        const trunkGeo = new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, 1.6 * scale, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.8 * scale;
        trunk.castShadow = true;
        group.add(trunk);

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
        const bushMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, flatShading: true, roughness: 0.7 });
        const mainBush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 * scale, 1), bushMat);
        mainBush.position.y = 0.45 * scale;
        mainBush.castShadow = true;
        group.add(mainBush);

        const subBush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 * scale, 1), bushMat);
        subBush.position.set(0.35 * scale, 0.35 * scale, 0.15 * scale);
        subBush.castShadow = true;
        group.add(subBush);

        const flMat = new THREE.MeshStandardMaterial({ color: flowerColor, emissive: flowerColor, emissiveIntensity: 0.4 });
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const blossom = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 * scale, 0), flMat);
            blossom.position.set(Math.cos(angle) * 0.4 * scale, 0.8 * scale, Math.sin(angle) * 0.4 * scale);
            group.add(blossom);
        }

        group.position.set(x, 0, z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createRock(x, z, scale = 1) {
        const rockGeo = new THREE.DodecahedronGeometry(scale, 0);
        const rockColors = [0x64748b, 0x544738, 0x7a6952];
        const rockMat = new THREE.MeshStandardMaterial({
            color: rockColors[Math.floor(Math.random() * rockColors.length)],
            flatShading: true,
            roughness: 0.88
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

    createRuinedWall(x, z, length = 4.0, angle = 0) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7a654d, roughness: 0.85, metalness: 0.1 });
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x5a4836, roughness: 0.9 });

        const wallGeo = new THREE.BoxGeometry(0.32, 0.7, length);
        const wall = new THREE.Mesh(wallGeo, stoneMat);
        wall.position.y = 0.35;
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);

        const capGeo = new THREE.BoxGeometry(0.42, 0.12, length + 0.15);
        const cap = new THREE.Mesh(capGeo, trimMat);
        cap.position.y = 0.76;
        cap.castShadow = true;
        group.add(cap);

        const postGeo = new THREE.BoxGeometry(0.48, 0.9, 0.48);
        const p1 = new THREE.Mesh(postGeo, stoneMat);
        p1.position.set(0, 0.45, -length / 2);
        p1.castShadow = true;
        group.add(p1);

        const p2 = new THREE.Mesh(postGeo, stoneMat);
        p2.position.set(0, 0.45, length / 2);
        p2.castShadow = true;
        group.add(p2);

        group.position.set(x, 0, z);
        group.rotation.y = angle;
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createRoadsideFlag(x, z, color = 0x0284c7) {
        const group = new THREE.Group();
        const poleGeo = new THREE.CylinderGeometry(0.04, 0.05, 3.2, 5);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.6, roughness: 0.3 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 1.6;
        pole.castShadow = true;
        group.add(pole);

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
        const baseGeo = new THREE.BoxGeometry(0.8 * scale, 0.4 * scale, 0.8 * scale);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.2 * scale;
        group.add(base);

        const pillarGeo = new THREE.CylinderGeometry(0.24 * scale, 0.38 * scale, 3.4 * scale, 4);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, flatShading: true, roughness: 0.7 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.y = 2.0 * scale;
        pillar.rotation.y = Math.PI / 4;
        pillar.castShadow = true;
        group.add(pillar);

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
            const balloonGeo = new THREE.SphereGeometry(cfg.scale, 12, 10);
            balloonGeo.scale(1, 1.35, 1);
            const balloonMat = new THREE.MeshStandardMaterial({ color: cfg.col1, roughness: 0.5, flatShading: true });
            const balloon = new THREE.Mesh(balloonGeo, balloonMat);
            group.add(balloon);

            const stripeGeo = new THREE.TorusGeometry(cfg.scale * 1.01, 0.15 * cfg.scale, 6, 16);
            const stripeMat = new THREE.MeshStandardMaterial({ color: cfg.col2, roughness: 0.5 });
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.rotation.x = Math.PI / 2;
            group.add(stripe);

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

    createMountains(trackLength) {
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

            const peakGeo = new THREE.ConeGeometry(radius * 0.32, height * 0.28, 6);
            const peakMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true, roughness: 0.4 });
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
