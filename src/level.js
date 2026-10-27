import * as THREE from 'three';

export class LevelGenerator {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.gates = [];
        this.obstacles = [];
        this.enemies = [];
        this.boss = null;
        this.meshes = [];
    }

    clear() {
        this.gates = [];
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

    generate(level, trackLength) {
        this.createTrack(trackLength);
        this.createGates(level, trackLength);
        this.createObstacles(level, trackLength);
        this.createEnemies(level, trackLength);
        this.createBoss(level, trackLength);
        this.createDecorations(trackLength);
    }

    createTrack(trackLength) {
        // High-tech arcade track runway
        const trackGeo = new THREE.PlaneGeometry(10, trackLength);
        const trackMat = new THREE.MeshStandardMaterial({ 
            color: 0x141824,
            roughness: 0.45,
            metalness: 0.25
        });
        const track = new THREE.Mesh(trackGeo, trackMat);
        track.rotation.x = -Math.PI / 2;
        track.position.set(0, 0.01, -trackLength / 2);
        track.receiveShadow = true;
        track.userData.dynamic = true;
        this.scene.add(track);
        this.meshes.push(track);

        // Track lane divider (luminous dashed center line)
        for (let z = 0; z < trackLength; z += 4) {
            const dashGeo = new THREE.PlaneGeometry(0.18, 1.8);
            const dashMat = new THREE.MeshStandardMaterial({ 
                color: 0x00f0ff,
                emissive: 0x00e5ff,
                emissiveIntensity: 0.6,
                roughness: 0.3
            });
            const dash = new THREE.Mesh(dashGeo, dashMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(0, 0.02, -z);
            dash.userData.dynamic = true;
            this.scene.add(dash);
            this.meshes.push(dash);
        }

        // Inner glowing track curb rails (Neon Cyan / Electric Blue)
        const curbGeo = new THREE.BoxGeometry(0.25, 0.35, trackLength);
        const curbMat = new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            emissive: 0x00b4d8,
            emissiveIntensity: 0.85,
            roughness: 0.2
        });

        const leftCurb = new THREE.Mesh(curbGeo, curbMat);
        leftCurb.position.set(-4.9, 0.18, -trackLength / 2);
        leftCurb.userData.dynamic = true;
        this.scene.add(leftCurb);
        this.meshes.push(leftCurb);

        const rightCurb = new THREE.Mesh(curbGeo, curbMat);
        rightCurb.position.set(4.9, 0.18, -trackLength / 2);
        rightCurb.userData.dynamic = true;
        this.scene.add(rightCurb);
        this.meshes.push(rightCurb);

        // Outer barrier rails (Dark metallic support with neon strip)
        const barrierGeo = new THREE.BoxGeometry(0.3, 0.7, trackLength);
        const barrierMat = new THREE.MeshStandardMaterial({
            color: 0x0c101c,
            roughness: 0.3,
            metalness: 0.8
        });

        const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
        leftBarrier.position.set(-5.15, 0.35, -trackLength / 2);
        leftBarrier.castShadow = true;
        leftBarrier.userData.dynamic = true;
        this.scene.add(leftBarrier);
        this.meshes.push(leftBarrier);

        const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
        rightBarrier.position.set(5.15, 0.35, -trackLength / 2);
        rightBarrier.castShadow = true;
        rightBarrier.userData.dynamic = true;
        this.scene.add(rightBarrier);
        this.meshes.push(rightBarrier);

        // Start Grid: Checkered neon start pattern
        for (let row = 0; row < 4; row++) {
            for (let col = -4; col <= 4; col += 2) {
                const checkGeo = new THREE.PlaneGeometry(1.8, 0.9);
                const isBright = ((row + (col / 2)) % 2 === 0);
                const checkMat = new THREE.MeshStandardMaterial({
                    color: isBright ? 0x00f0ff : 0x0d1b2a,
                    emissive: isBright ? 0x00f0ff : 0x000000,
                    emissiveIntensity: isBright ? 0.4 : 0
                });
                const check = new THREE.Mesh(checkGeo, checkMat);
                check.rotation.x = -Math.PI / 2;
                check.position.set(col, 0.025, -(row * 1.0 + 1));
                check.userData.dynamic = true;
                this.scene.add(check);
                this.meshes.push(check);
            }
        }

        // Start Arch Gantry (Overhead neon START portal)
        const startArchGroup = new THREE.Group();
        const archMat = new THREE.MeshStandardMaterial({ color: 0x1a233a, metalness: 0.8, roughness: 0.2 });
        const archGlowMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.9 });
        
        const pillarGeo = new THREE.BoxGeometry(0.4, 5.0, 0.4);
        const leftPillar = new THREE.Mesh(pillarGeo, archMat);
        leftPillar.position.set(-5.2, 2.5, -0.5);
        startArchGroup.add(leftPillar);
        const rightPillar = new THREE.Mesh(pillarGeo, archMat);
        rightPillar.position.set(5.2, 2.5, -0.5);
        startArchGroup.add(rightPillar);

        const beamGeo = new THREE.BoxGeometry(10.8, 0.6, 0.5);
        const topBeam = new THREE.Mesh(beamGeo, archMat);
        topBeam.position.set(0, 5.0, -0.5);
        startArchGroup.add(topBeam);

        const neonStripGeo = new THREE.BoxGeometry(10.2, 0.15, 0.55);
        const neonStrip = new THREE.Mesh(neonStripGeo, archGlowMat);
        neonStrip.position.set(0, 4.7, -0.5);
        startArchGroup.add(neonStrip);

        // Start Banner canvas
        const startCanvas = document.createElement('canvas');
        startCanvas.width = 512;
        startCanvas.height = 128;
        const sCtx = startCanvas.getContext('2d');
        sCtx.fillStyle = 'rgba(10, 20, 40, 0.9)';
        sCtx.roundRect(10, 10, 492, 108, 20);
        sCtx.fill();
        sCtx.strokeStyle = '#00f0ff';
        sCtx.lineWidth = 6;
        sCtx.stroke();
        sCtx.fillStyle = '#ffffff';
        sCtx.font = '900 52px system-ui, sans-serif';
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';
        sCtx.shadowColor = '#00f0ff';
        sCtx.shadowBlur = 15;
        sCtx.fillText('⚡ CROWD RUSH ⚡', 256, 64);

        const startTex = new THREE.CanvasTexture(startCanvas);
        const startLabelGeo = new THREE.PlaneGeometry(6.5, 1.6);
        const startLabelMat = new THREE.MeshBasicMaterial({ map: startTex, transparent: true });
        const startBanner = new THREE.Mesh(startLabelGeo, startLabelMat);
        startBanner.position.set(0, 5.8, -0.5);
        startArchGroup.add(startBanner);

        startArchGroup.userData.dynamic = true;
        this.scene.add(startArchGroup);
        this.meshes.push(startArchGroup);

        // Boss Battle Arena Ring at the end of the track
        const arenaRingGeo = new THREE.RingGeometry(5.2, 6.0, 32);
        const arenaRingMat = new THREE.MeshStandardMaterial({
            color: 0x9c27b0,
            emissive: 0x7b1fa2,
            emissiveIntensity: 0.9,
            side: THREE.DoubleSide
        });
        const arenaRing = new THREE.Mesh(arenaRingGeo, arenaRingMat);
        arenaRing.rotation.x = -Math.PI / 2;
        arenaRing.position.set(0, 0.03, -trackLength);
        arenaRing.userData.dynamic = true;
        this.scene.add(arenaRing);
        this.meshes.push(arenaRing);

        // Stylized arcade ground
        const groundGeo = new THREE.PlaneGeometry(240, trackLength + 120);
        const groundColor = (this.game && this.game.getActiveTheme()) ? this.game.getActiveTheme().ground : 0x1b3b2b;
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: groundColor, 
            roughness: 0.85,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -0.05, -trackLength / 2);
        ground.receiveShadow = true;
        ground.userData.dynamic = true;
        this.scene.add(ground);
        this.meshes.push(ground);

        // Trackside neon light posts (rhythmic markers every 16 units)
        for (let z = 16; z < trackLength - 10; z += 16) {
            for (let side of [-1, 1]) {
                const postX = side * 5.4;
                const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.4, 6);
                const postMat = new THREE.MeshStandardMaterial({ color: 0x1a233a, metalness: 0.8 });
                const post = new THREE.Mesh(postGeo, postMat);
                post.position.set(postX, 0.7, -z);
                post.userData.dynamic = true;
                this.scene.add(post);
                this.meshes.push(post);

                const beaconGeo = new THREE.SphereGeometry(0.18, 8, 8);
                const beaconMat = new THREE.MeshStandardMaterial({
                    color: 0x00f0ff,
                    emissive: 0x00e5ff,
                    emissiveIntensity: 1.0
                });
                const beacon = new THREE.Mesh(beaconGeo, beaconMat);
                beacon.position.set(postX, 1.45, -z);
                beacon.userData.dynamic = true;
                this.scene.add(beacon);
                this.meshes.push(beacon);
            }
        }
    }

    createGates(level, trackLength) {
        const gateCount = 8 + level * 2;
        const spacing = (trackLength - 30) / gateCount;

        for (let i = 0; i < gateCount; i++) {
            const z = 20 + i * spacing;
            const gateData = this.generateGatePair(level);
            
            const gate = {
                z: z,
                passed: false,
                leftGate: gateData.left,
                rightGate: gateData.right,
                leftMesh: null,
                rightMesh: null
            };

            // Create gate meshes
            const leftMeshes = [];
            gate.leftMesh = this.createGateMesh(gateData.left, -2.5, z, leftMeshes);
            const rightMeshes = [];
            gate.rightMesh = this.createGateMesh(gateData.right, 2.5, z, rightMeshes);

            // Sleek central divider pylon with neon beacon
            const divGeo = new THREE.BoxGeometry(0.3, 4.4, 0.35);
            const divMat = new THREE.MeshStandardMaterial({ color: 0x111625, metalness: 0.8, roughness: 0.3 });
            const divider = new THREE.Mesh(divGeo, divMat);
            divider.position.set(0, 2.2, -z);
            divider.userData.dynamic = true;
            this.scene.add(divider);
            this.meshes.push(divider);

            const divCoreGeo = new THREE.BoxGeometry(0.12, 4.2, 0.38);
            const divCoreMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00e5ff, emissiveIntensity: 0.8 });
            const divCore = new THREE.Mesh(divCoreGeo, divCoreMat);
            divCore.position.set(0, 2.2, -z);
            divCore.userData.dynamic = true;
            this.scene.add(divCore);
            this.meshes.push(divCore);

            gate.meshes = [...leftMeshes, ...rightMeshes, divider, divCore];
            this.gates.push(gate);
        }
    }

    removeGate(gate) {
        if (!gate || gate.removed) return;
        gate.removed = true;
        gate.passed = true;
        if (gate.meshes && gate.meshes.length > 0) {
            gate.meshes.forEach(m => {
                if (m) {
                    m.visible = false;
                    this.scene.remove(m);
                }
            });
        }
    }

    generateGatePair(level) {
        const ops = ['+', '*', '-'];
        const leftOp = ops[Math.floor(Math.random() * 2)]; // Prefer + and *
        let rightOp = ops[Math.floor(Math.random() * 3)];
        
        // Ensure variety
        if (rightOp === leftOp) rightOp = ops[(ops.indexOf(rightOp) + 1) % ops.length];

        const getValue = (op) => {
            switch (op) {
                case '+': return Math.floor(Math.random() * (5 + level * 2)) + 3;
                case '*': return Math.floor(Math.random() * 2) + 2;
                case '-': return Math.floor(Math.random() * (3 + level)) + 2;
                default: return 2;
            }
        };

        return {
            left: { op: leftOp, value: getValue(leftOp) },
            right: { op: rightOp, value: getValue(rightOp) }
        };
    }

    createGateMesh(gateData, x, z, meshCollector = null) {
        const isGood = gateData.op === '+' || gateData.op === '*';
        const primaryColor = isGood ? 0x00E676 : 0xFF1744;
        const emissiveColor = isGood ? 0x00B0FF : 0xD50000;
        
        // 1. Sleek metallic archway frame
        const frameMat = new THREE.MeshStandardMaterial({ 
            color: 0x111625, 
            metalness: 0.85, 
            roughness: 0.25 
        });
        const glowPipingMat = new THREE.MeshStandardMaterial({ 
            color: primaryColor,
            emissive: primaryColor,
            emissiveIntensity: 0.9
        });

        // Outer pillar
        const outerPillarX = x < 0 ? (x - 2.25) : (x + 2.25);
        const pillarGeo = new THREE.BoxGeometry(0.25, 4.2, 0.35);
        const pillar = new THREE.Mesh(pillarGeo, frameMat);
        pillar.position.set(outerPillarX, 2.1, -z);
        pillar.userData.dynamic = true;
        this.scene.add(pillar);
        this.meshes.push(pillar);

        // Top arch beam
        const beamGeo = new THREE.BoxGeometry(4.7, 0.35, 0.35);
        const beam = new THREE.Mesh(beamGeo, frameMat);
        beam.position.set(x, 4.15, -z);
        beam.userData.dynamic = true;
        this.scene.add(beam);
        this.meshes.push(beam);

        // Neon piping along top beam
        const neonBeamGeo = new THREE.BoxGeometry(4.5, 0.1, 0.38);
        const neonBeam = new THREE.Mesh(neonBeamGeo, glowPipingMat);
        neonBeam.position.set(x, 4.0, -z);
        neonBeam.userData.dynamic = true;
        this.scene.add(neonBeam);
        this.meshes.push(neonBeam);

        // Top beacon orb
        const beaconGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const beacon = new THREE.Mesh(beaconGeo, glowPipingMat);
        beacon.position.set(x, 4.45, -z);
        beacon.userData.dynamic = true;
        this.scene.add(beacon);
        this.meshes.push(beacon);

        // 2. Translucent glowing energy field curtain (this is gateMesh for highlight/emissive collision)
        const gateGeo = new THREE.BoxGeometry(4.4, 3.8, 0.12);
        const gateMat = new THREE.MeshStandardMaterial({ 
            color: primaryColor,
            emissive: emissiveColor,
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0.72,
            roughness: 0.2
        });
        const gateMesh = new THREE.Mesh(gateGeo, gateMat);
        gateMesh.position.set(x, 2.0, -z);
        gateMesh.userData.dynamic = true;
        this.scene.add(gateMesh);
        this.meshes.push(gateMesh);

        // 3. High-resolution, super crisp arcade canvas label
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Draw arcade pill badge
        ctx.fillStyle = 'rgba(8, 14, 26, 0.88)';
        ctx.beginPath();
        ctx.roundRect(16, 16, 480, 224, 36);
        ctx.fill();

        ctx.strokeStyle = isGood ? '#00e676' : '#ff1744';
        ctx.lineWidth = 10;
        ctx.stroke();

        // Inner glowing border
        ctx.strokeStyle = isGood ? 'rgba(0, 230, 118, 0.4)' : 'rgba(255, 23, 68, 0.4)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Sub-tag label (e.g. ★ MULTIPLY ★ or ⚠ HAZARD ⚠)
        ctx.fillStyle = isGood ? '#69f0ae' : '#ff8a80';
        ctx.font = '900 32px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const subtag = gateData.op === '*' ? '★ MULTIPLY ★' 
                     : gateData.op === '+' ? '▲ RUSH BOOST ▲' 
                     : gateData.op === '/' ? '⚠ DIVIDE ⚠' 
                     : '▼ HAZARD ▼';
        ctx.fillText(subtag, 256, 34);

        // Main operator & value
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 110px system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = isGood ? '#00e676' : '#ff1744';
        ctx.shadowBlur = 25;
        ctx.fillText(`${gateData.op}${gateData.value}`, 256, 148);

        const texture = new THREE.CanvasTexture(canvas);
        const labelGeo = new THREE.PlaneGeometry(3.6, 1.8);
        const labelMat = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true,
            depthWrite: false
        });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(x, 2.3, -z + 0.12);
        label.userData.dynamic = true;
        this.scene.add(label);
        this.meshes.push(label);

        if (meshCollector) {
            meshCollector.push(pillar, beam, neonBeam, beacon, gateMesh, label);
        }

        return gateMesh;
    }

    createObstacles(level, trackLength) {
        const count = 3 + level;
        const safeZones = this.gates.map(g => g.z);

        for (let i = 0; i < count; i++) {
            let z;
            let attempts = 0;
            do {
                z = 30 + Math.random() * (trackLength - 60);
                attempts++;
            } while (safeZones.some(gz => Math.abs(gz - z) < 8) && attempts < 50);

            if (attempts >= 50) continue;

            const obstacleType = Math.random();
            let x, width;

            if (obstacleType < 0.5) {
                // Spinning saw
                x = (Math.random() - 0.5) * 5;
                width = 3;
                this.createSawObstacle(x, z);
            } else {
                // Wall barrier
                x = (Math.random() - 0.5) * 4;
                width = 2 + Math.random() * 3;
                this.createWallObstacle(x, z, width);
            }

            this.obstacles.push({ x, z, width, passed: false });
        }
    }

    createSawObstacle(x, z) {
        // High-energy arcade spinning saw
        const sawGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.18, 16);
        const sawMat = new THREE.MeshStandardMaterial({ 
            color: 0x111625, 
            metalness: 0.9, 
            roughness: 0.2 
        });
        const saw = new THREE.Mesh(sawGeo, sawMat);
        saw.position.set(x, 1, -z);
        saw.rotation.x = Math.PI / 2;
        saw.userData.dynamic = true;
        this.scene.add(saw);
        this.meshes.push(saw);

        // Glowing red neon blade perimeter
        const bladeRimGeo = new THREE.TorusGeometry(1.5, 0.14, 6, 16);
        const bladeRimMat = new THREE.MeshStandardMaterial({ 
            color: 0xff1744, 
            emissive: 0xff1744, 
            emissiveIntensity: 1.0 
        });
        const bladeRim = new THREE.Mesh(bladeRimGeo, bladeRimMat);
        bladeRim.position.set(x, 1, -z);
        bladeRim.rotation.x = Math.PI / 2;
        bladeRim.userData.dynamic = true;
        this.scene.add(bladeRim);
        this.meshes.push(bladeRim);

        // Center warning hub
        const hubGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.25, 8);
        const hubMat = new THREE.MeshStandardMaterial({ color: 0xff9100, emissive: 0xff9100, emissiveIntensity: 0.8 });
        const hub = new THREE.Mesh(hubGeo, hubMat);
        hub.position.set(x, 1, -z);
        hub.rotation.x = Math.PI / 2;
        hub.userData.dynamic = true;
        this.scene.add(hub);
        this.meshes.push(hub);
    }

    createWallObstacle(x, z, width) {
        // High-tech hazard barrier wall
        const wallGeo = new THREE.BoxGeometry(width, 2.4, 0.45);
        const wallMat = new THREE.MeshStandardMaterial({ 
            color: 0x151a28,
            roughness: 0.35,
            metalness: 0.7
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(x, 1.2, -z);
        wall.castShadow = true;
        wall.userData.dynamic = true;
        this.scene.add(wall);
        this.meshes.push(wall);

        // Glowing hazard warning strip along top
        const stripGeo = new THREE.BoxGeometry(width, 0.2, 0.5);
        const stripMat = new THREE.MeshStandardMaterial({ 
            color: 0xff9100, 
            emissive: 0xff9100, 
            emissiveIntensity: 0.9 
        });
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.set(x, 2.3, -z);
        strip.userData.dynamic = true;
        this.scene.add(strip);
        this.meshes.push(strip);

        // Spikes on top with glowing tips
        for (let i = 0; i < Math.floor(width); i++) {
            const spikeGeo = new THREE.ConeGeometry(0.14, 0.55, 4);
            const spikeMat = new THREE.MeshStandardMaterial({ 
                color: 0xff1744, 
                emissive: 0xd50000, 
                emissiveIntensity: 0.7 
            });
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            spike.position.set(x - width/2 + 0.5 + i * 0.8, 2.7, -z);
            spike.userData.dynamic = true;
            this.scene.add(spike);
            this.meshes.push(spike);
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
            group.add(stickman);
        }

        group.position.set(0, 0, -z);
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
        label.position.set(0, 4.2, -z);
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

        // Remove stickmen from the enemy group visually
        if (enemy.meshGroup && enemy.meshGroup.children.length > 0) {
            const child = enemy.meshGroup.children[enemy.meshGroup.children.length - 1];
            enemy.meshGroup.remove(child);
        }
    }

    createBoss(level, trackLength) {
        const bossHealth = Math.floor(20 + level * 15);
        this.boss = { z: trackLength, health: bossHealth, defeated: false };

        // Imposing Cyber-Titan Boss
        const bossGroup = new THREE.Group();
        bossGroup.userData.dynamic = true;

        const bossArmorMat = new THREE.MeshStandardMaterial({ 
            color: 0x2a0845, 
            roughness: 0.3, 
            metalness: 0.8 
        });
        const glowCoreMat = new THREE.MeshStandardMaterial({ 
            color: 0xff1744, 
            emissive: 0xff1744, 
            emissiveIntensity: 1.2 
        });

        // 1. Armored Body
        const bodyGeo = new THREE.CapsuleGeometry(1.1, 3.2, 8, 8);
        const body = new THREE.Mesh(bodyGeo, bossArmorMat);
        body.position.y = 3.2;
        body.castShadow = true;

        // Glowing Chest Reactor Core
        const coreGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const core = new THREE.Mesh(coreGeo, glowCoreMat);
        core.position.set(0, 0.4, 0.9);
        body.add(core);

        // Heavy Spiked Shoulder Pauldrons
        const pylonGeo = new THREE.ConeGeometry(0.4, 1.2, 5);
        const leftSpike = new THREE.Mesh(pylonGeo, bossArmorMat);
        leftSpike.position.set(-1.2, 1.3, 0);
        leftSpike.rotation.z = 0.5;
        body.add(leftSpike);

        const rightSpike = new THREE.Mesh(pylonGeo, bossArmorMat);
        rightSpike.position.set(1.2, 1.3, 0);
        rightSpike.rotation.z = -0.5;
        body.add(rightSpike);

        bossGroup.add(body);

        // 2. Head with horned helmet
        const headGeo = new THREE.SphereGeometry(1.3, 16, 16);
        const head = new THREE.Mesh(headGeo, bossArmorMat);
        head.position.y = 6.4;
        head.castShadow = true;

        // Glowing Fiery Visor Slit
        const visorGeo = new THREE.BoxGeometry(1.4, 0.3, 0.8);
        const visor = new THREE.Mesh(visorGeo, glowCoreMat);
        visor.position.set(0, 0, 0.95);
        head.add(visor);

        bossGroup.add(head);

        // 3. Imposing Golden Horned Crown
        const crownBaseGeo = new THREE.CylinderGeometry(0.9, 1.3, 0.9, 8);
        const crownMat = new THREE.MeshStandardMaterial({ 
            color: 0xffd700, 
            metalness: 0.9, 
            roughness: 0.15,
            emissive: 0xff8f00,
            emissiveIntensity: 0.3
        });
        const crown = new THREE.Mesh(crownBaseGeo, crownMat);
        crown.position.y = 7.7;
        
        // Crown Ruby Spikes
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const spikeG = new THREE.ConeGeometry(0.2, 0.8, 4);
            const spike = new THREE.Mesh(spikeG, glowCoreMat);
            spike.position.set(Math.cos(angle) * 0.9, 0.7, Math.sin(angle) * 0.9);
            crown.add(spike);
        }
        bossGroup.add(crown);

        // 4. Arms with Heavy Spiked Gauntlets
        const armGeo = new THREE.CapsuleGeometry(0.35, 2.2, 6, 6);
        const leftArm = new THREE.Mesh(armGeo, bossArmorMat);
        leftArm.position.set(-1.8, 3.6, 0);
        leftArm.rotation.z = 0.35;
        bossGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, bossArmorMat);
        rightArm.position.set(1.8, 3.6, 0);
        rightArm.rotation.z = -0.35;
        bossGroup.add(rightArm);

        bossGroup.position.set(0, 0, -trackLength);
        this.scene.add(bossGroup);
        this.meshes.push(bossGroup);
        this.boss.meshGroup = bossGroup;
        this.boss.defeatTime = 0;
        this.boss.isDefeating = false;

        // Arcade Boss Name & Health Banner
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(15, 6, 25, 0.92)';
        ctx.beginPath();
        ctx.roundRect(16, 16, 480, 96, 24);
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.fillStyle = '#ffd700';
        ctx.font = '900 48px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 20;
        ctx.fillText(`👑 TITAN OVERLORD: ${bossHealth}`, 256, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const labelGeo = new THREE.PlaneGeometry(6.5, 1.6);
        const labelMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(0, 9.6, -trackLength);
        label.userData.dynamic = true;
        this.scene.add(label);
        this.meshes.push(label);
    }

    shakeBoss() {
        if (!this.boss || !this.boss.meshGroup) return;
        const group = this.boss.meshGroup;
        const shakeX = (Math.random() - 0.5) * 0.4;
        const shakeZ = (Math.random() - 0.5) * 0.2;
        group.position.x = shakeX;
        group.position.z += shakeZ;
        group.traverse(child => {
            if (child.material && child.material.emissive) {
                child.material.emissive = new THREE.Color(0xff0000);
                child.material.emissiveIntensity = 0.8;
            }
        });
        setTimeout(() => {
            if (group) {
                group.position.x = 0;
                group.traverse(child => {
                    if (child.material && child.material.emissiveIntensity) {
                        child.material.emissiveIntensity = 0.2;
                    }
                });
            }
        }, 80);
    }

    playBossDefeatAnimation() {
        if (!this.boss || !this.boss.meshGroup) return;
        this.boss.isDefeating = true;
        this.boss.defeatTime = 0;
    }

    updateBossDefeat(delta) {
        if (!this.boss || !this.boss.isDefeating || !this.boss.meshGroup) return;
        
        this.boss.defeatTime += delta;
        const t = this.boss.defeatTime;
        const group = this.boss.meshGroup;

        // Stage 1: Shake violently (0 - 0.5s)
        if (t < 0.5) {
            group.position.x = (Math.random() - 0.5) * t * 4;
            group.rotation.z = (Math.random() - 0.5) * t * 0.5;
            group.traverse(child => {
                if (child.material && child.material.color) {
                    child.material.emissive = new THREE.Color(0xff0000);
                    child.material.emissiveIntensity = Math.sin(t * 40) * 0.5 + 0.5;
                }
            });
        }
        // Stage 2: Fall apart and shrink (0.5 - 1.2s)
        else if (t < 1.2) {
            const fallProgress = (t - 0.5) / 0.7;
            group.position.y = -fallProgress * 3;
            group.rotation.x = fallProgress * 0.8;
            group.rotation.z = fallProgress * 0.5;
            const scale = 1 - fallProgress * 0.8;
            group.scale.set(scale, scale * (1 - fallProgress * 0.3), scale);
            group.traverse(child => {
                if (child.material) {
                    child.material.transparent = true;
                    child.material.opacity = 1 - fallProgress;
                }
            });
            group.children.forEach((child, i) => {
                child.position.x += (Math.random() - 0.5) * delta * 8;
                child.position.y += (Math.random() - 0.5) * delta * 5;
                child.rotation.x += delta * (i + 1) * 3;
            });
        }
        // Stage 3: Remove
        else {
            this.scene.remove(group);
            this.boss.isDefeating = false;
        }
    }

    createDecorations(trackLength) {
        // Stylized low-poly arcade crystals and energy pylons along track
        for (let z = 0; z < trackLength; z += 14) {
            // Left side arcade crystal
            if (Math.random() > 0.35) {
                const x = -(7.5 + Math.random() * 8);
                this.createArcadeCrystal(x, -z + Math.random() * 4);
            }
            // Right side arcade crystal
            if (Math.random() > 0.35) {
                const x = 7.5 + Math.random() * 8;
                this.createArcadeCrystal(x, -z + Math.random() * 4);
            }
        }

        // Stylized low-poly trees along the track
        for (let z = 0; z < trackLength; z += 10) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (6.5 + Math.random() * 6);
            this.createTree(x, -z + Math.random() * 4);
        }

        // Geometric mountains in the background
        this.createMountains(trackLength);

        // Low-poly stylized clouds in the sky
        this.createClouds(trackLength);
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

    createTree(x, z) {
        // Stylized low-poly geometric cyber-palm / tree
        const group = new THREE.Group();
        
        // Minimalist metallic trunk
        const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 2.4, 5);
        const trunkMat = new THREE.MeshStandardMaterial({ 
            color: 0x1b2838, 
            roughness: 0.4, 
            metalness: 0.6 
        });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.2;
        group.add(trunk);

        // Dual-tone low-poly canopy cone
        const canopyColors = [0x00e676, 0x00b0ff, 0x76ff03, 0x00e5ff];
        const canopyColor = canopyColors[Math.floor(Math.random() * canopyColors.length)];
        
        for (let i = 0; i < 3; i++) {
            const coneGeo = new THREE.ConeGeometry(1.2 - i * 0.25, 1.2, 5);
            const coneMat = new THREE.MeshStandardMaterial({
                color: canopyColor,
                emissive: canopyColor,
                emissiveIntensity: 0.15,
                flatShading: true,
                roughness: 0.5
            });
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.y = 2.2 + i * 0.75;
            group.add(cone);
        }

        group.position.set(x, 0, z);
        group.userData.dynamic = true;
        this.scene.add(group);
        this.meshes.push(group);
    }

    createMountains(trackLength) {
        const mountainColors = [0x1a233a, 0x24344d, 0x0d1b2a];
        
        for (let i = 0; i < 14; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            const x = side * (45 + Math.random() * 35);
            const z = -(Math.random() * trackLength);
            const height = 18 + Math.random() * 24;
            const radius = 10 + Math.random() * 12;
            
            const mountainGeo = new THREE.ConeGeometry(radius, height, 5);
            const mountainMat = new THREE.MeshStandardMaterial({ 
                color: mountainColors[Math.floor(Math.random() * mountainColors.length)],
                flatShading: true,
                roughness: 0.9
            });
            const mountain = new THREE.Mesh(mountainGeo, mountainMat);
            mountain.position.set(x, height * 0.4, z);
            mountain.userData.dynamic = true;
            this.scene.add(mountain);
            this.meshes.push(mountain);

            // Glowing neon ridge line / peak cap
            const peakGeo = new THREE.ConeGeometry(radius * 0.25, height * 0.2, 5);
            const peakMat = new THREE.MeshStandardMaterial({ 
                color: 0x00f0ff,
                emissive: 0x00e5ff,
                emissiveIntensity: 0.35,
                flatShading: true
            });
            const peak = new THREE.Mesh(peakGeo, peakMat);
            peak.position.set(x, height * 0.8, z);
            peak.userData.dynamic = true;
            this.scene.add(peak);
            this.meshes.push(peak);
        }
    }

    createClouds(trackLength) {
        for (let i = 0; i < 18; i++) {
            const group = new THREE.Group();
            const cloudMat = new THREE.MeshStandardMaterial({ 
                color: 0xffffff, 
                transparent: true, 
                opacity: 0.88,
                roughness: 0.3,
                flatShading: true
            });

            const numPuffs = 3 + Math.floor(Math.random() * 3);
            for (let j = 0; j < numPuffs; j++) {
                const puffGeo = new THREE.DodecahedronGeometry(1.6 + Math.random() * 1.6, 0);
                const puff = new THREE.Mesh(puffGeo, cloudMat);
                puff.position.set(
                    j * 2.2,
                    Math.random() * 0.6,
                    Math.random() * 0.8
                );
                group.add(puff);
            }

            group.position.set(
                (Math.random() - 0.5) * 80,
                24 + Math.random() * 16,
                -(Math.random() * trackLength)
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

        // 3. Legs
        const legGeo = new THREE.CapsuleGeometry(0.07, 0.3, 4, 4);
        const leftLeg = new THREE.Mesh(legGeo, mat);
        leftLeg.position.set(-0.1, 0.2, 0);
        group.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, mat);
        rightLeg.position.set(0.1, 0.2, 0);
        group.add(rightLeg);

        return group;
    }
}
