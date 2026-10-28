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

        // Stylized expansive arcade terrain
        const groundGeo = new THREE.PlaneGeometry(380, trackLength + 200);
        const groundColor = (this.game && this.game.getActiveTheme()) ? this.game.getActiveTheme().ground : 0x3d9959;
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: groundColor, 
            roughness: 0.88,
            metalness: 0.05
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -0.05, -trackLength / 2);
        ground.receiveShadow = true;
        ground.userData.dynamic = true;
        this.scene.add(ground);
        this.meshes.push(ground);

        // Roadside shoulders (clean asphalt verge strips)
        const shoulderGeo = new THREE.PlaneGeometry(1.2, trackLength + 10);
        const shoulderMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.7,
            metalness: 0.15
        });
        const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
        leftShoulder.rotation.x = -Math.PI / 2;
        leftShoulder.position.set(-5.8, 0.015, -trackLength / 2);
        leftShoulder.receiveShadow = true;
        leftShoulder.userData.dynamic = true;
        this.scene.add(leftShoulder);
        this.meshes.push(leftShoulder);

        const rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
        rightShoulder.rotation.x = -Math.PI / 2;
        rightShoulder.position.set(5.8, 0.015, -trackLength / 2);
        rightShoulder.receiveShadow = true;
        rightShoulder.userData.dynamic = true;
        this.scene.add(rightShoulder);
        this.meshes.push(rightShoulder);

        // Alternating red/white racing curb rumble strips
        for (let z = 0; z < trackLength; z += 3) {
            const isRed = Math.floor(z / 3) % 2 === 0;
            const curbCol = isRed ? 0xef4444 : 0xf8fafc;
            const curbMat = new THREE.MeshStandardMaterial({ color: curbCol, roughness: 0.5 });
            
            const leftCurbStripe = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 2.7), curbMat);
            leftCurbStripe.rotation.x = -Math.PI / 2;
            leftCurbStripe.position.set(-5.15, 0.02, -z - 1.35);
            leftCurbStripe.userData.dynamic = true;
            this.scene.add(leftCurbStripe);
            this.meshes.push(leftCurbStripe);

            const rightCurbStripe = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 2.7), curbMat);
            rightCurbStripe.rotation.x = -Math.PI / 2;
            rightCurbStripe.position.set(5.15, 0.02, -z - 1.35);
            rightCurbStripe.userData.dynamic = true;
            this.scene.add(rightCurbStripe);
            this.meshes.push(rightCurbStripe);
        }

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
