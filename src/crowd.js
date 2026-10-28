import * as THREE from 'three';

export class CrowdManager {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.playerStickmen = [];
        this.playerGroup = null;
        this.playerCount = 0;
        this.animTime = 0;
        this.combatTime = 0;
        this.slashEffects = [];    // Neon sword slash arcs
        this.flyingBodies = [];    // Ragdoll stickmen flying away
        this.impactFlashes = [];   // Impact burst rings
        this.sparkParticles = [];  // Small spark particles
        this.trailParticles = [];  // Trailing particles behind flying bodies
    }

    clear() {
        if (this.playerGroup) {
            this.scene.remove(this.playerGroup);
            this.playerGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        this.playerStickmen = [];
        this.playerGroup = null;
        this.playerCount = 0;
        
        // Clean up effects
        this.slashEffects.forEach(s => { 
            this.scene.remove(s.mesh);
            if (s.mesh.geometry) s.mesh.geometry.dispose();
            if (s.mesh.material) s.mesh.material.dispose();
        });
        this.slashEffects = [];
        this.flyingBodies.forEach(b => { this.scene.remove(b.mesh); });
        this.flyingBodies = [];
        this.impactFlashes.forEach(f => { this.scene.remove(f.mesh); });
        this.impactFlashes = [];
        this.sparkParticles.forEach(p => { this.scene.remove(p.mesh); });
        this.sparkParticles = [];
        this.trailParticles.forEach(p => { this.scene.remove(p.mesh); });
        this.trailParticles = [];
    }

    createPlayerCrowd(count) {
        this.clear();
        this.playerCount = count;
        this.playerGroup = new THREE.Group();
        this.playerGroup.userData.dynamic = true;

        for (let i = 0; i < count; i++) {
            this.addStickmanToGroup(i);
        }

        this.scene.add(this.playerGroup);
    }

    addStickmanToGroup(index) {
        let color;
        if (this.game && this.game.equippedSkin === 'rainbow') {
            const rainbowColors = [0xFF1744, 0xFF9100, 0xFFEA00, 0x00E676, 0x2979FF, 0xD500F9];
            color = rainbowColors[index % rainbowColors.length];
        } else {
            color = this.game ? this.game.getPlayerColor() : 0x2196F3;
        }
        const stickman = this.createStickman(color, false);
        const pos = this.getFormationPosition(index);
        stickman.position.set(pos.x, 0, pos.z);
        stickman.userData.index = index;
        stickman.userData.basePos = { x: pos.x, z: pos.z };
        stickman.userData.targetCombatPos = { x: pos.x, z: pos.z };
        // Start with a pop-in scale animation
        stickman.scale.set(0, 0, 0);
        stickman.userData.spawnTime = this.animTime;
        stickman.userData.spawning = true;
        if (!this.playerGroup) {
            this.playerGroup = new THREE.Group();
            this.playerGroup.userData.dynamic = true;
            this.scene.add(this.playerGroup);
        }
        this.playerGroup.add(stickman);
        this.playerStickmen.push(stickman);
    }

    getFormationPosition(index) {
        if (index === 0) return { x: 0, z: 0 };
        const angle = index * 2.4;
        const radius = Math.sqrt(index) * 0.4;
        return {
            x: Math.cos(angle) * radius,
            z: Math.sin(angle) * radius * 0.6
        };
    }

    createStickman(color, isEnemy = false) {
        const group = new THREE.Group();

        if (isEnemy) {
            // ============ ENEMY RIVAL RAIDER ============
            const mat = new THREE.MeshStandardMaterial({ 
                color: color || 0x880e4f,
                roughness: 0.45,
                metalness: 0.6
            });
            const darkArmorMat = new THREE.MeshStandardMaterial({ color: 0x181a24, roughness: 0.5, metalness: 0.8 });
            const evilGlowMat = new THREE.MeshStandardMaterial({
                color: 0xff1744,
                emissive: 0xff1744,
                emissiveIntensity: 1.1
            });

            // 1. Armored Body
            const bodyGeo = new THREE.CapsuleGeometry(0.16, 0.48, 6, 6);
            const body = new THREE.Mesh(bodyGeo, mat);
            body.position.y = 0.7;
            body.castShadow = true;

            // Spiked Pauldrons
            const spikeGeo = new THREE.ConeGeometry(0.06, 0.18, 4);
            const leftSpike = new THREE.Mesh(spikeGeo, darkArmorMat);
            leftSpike.position.set(-0.2, 0.22, 0);
            leftSpike.rotation.z = 0.5;
            body.add(leftSpike);

            const rightSpike = new THREE.Mesh(spikeGeo, darkArmorMat);
            rightSpike.position.set(0.2, 0.22, 0);
            rightSpike.rotation.z = -0.5;
            body.add(rightSpike);

            // Glowing Evil Chest Core
            const coreGeo = new THREE.BoxGeometry(0.12, 0.16, 0.08);
            const core = new THREE.Mesh(coreGeo, evilGlowMat);
            core.position.set(0, 0.04, 0.12);
            body.add(core);
            group.add(body);

            // 2. Horned Raider Helmet
            const headGeo = new THREE.SphereGeometry(0.22, 10, 10);
            const head = new THREE.Mesh(headGeo, mat);
            head.position.y = 1.22;
            head.castShadow = true;

            // Evil Horns
            const hornGeo = new THREE.ConeGeometry(0.05, 0.22, 4);
            const leftHorn = new THREE.Mesh(hornGeo, darkArmorMat);
            leftHorn.position.set(-0.14, 0.18, -0.04);
            leftHorn.rotation.z = 0.4;
            leftHorn.rotation.x = -0.2;
            head.add(leftHorn);

            const rightHorn = new THREE.Mesh(hornGeo, darkArmorMat);
            rightHorn.position.set(0.14, 0.18, -0.04);
            rightHorn.rotation.z = -0.4;
            rightHorn.rotation.x = -0.2;
            head.add(rightHorn);

            // Fiery Slit Visor
            const visorGeo = new THREE.BoxGeometry(0.28, 0.07, 0.14);
            const visor = new THREE.Mesh(visorGeo, evilGlowMat);
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
            const shieldSpike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 4), evilGlowMat);
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
            const edge = new THREE.Mesh(edgeGeo, evilGlowMat);
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

        // ============ FRIENDLY CHAMPION RUNNER ============
        const mat = new THREE.MeshStandardMaterial({ 
            color,
            roughness: 0.35,
            metalness: 0.25
        });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const cyanGlowMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.95,
            roughness: 0.1
        });
        const darkArmorMat = new THREE.MeshStandardMaterial({ color: 0x1b2838, roughness: 0.4, metalness: 0.7 });

        // 1. Body (child 0)
        const bodyGeo = new THREE.CapsuleGeometry(0.16, 0.48, 6, 6);
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.y = 0.7;
        body.castShadow = true;

        // Runner chest energy core
        const coreGeo = new THREE.BoxGeometry(0.14, 0.18, 0.08);
        const core = new THREE.Mesh(coreGeo, cyanGlowMat);
        core.position.set(0, 0.05, 0.12);
        body.add(core);

        // Hero Aerodynamic Shoulder Armor Guards
        const shoulderGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const leftShoulder = new THREE.Mesh(shoulderGeo, whiteMat);
        leftShoulder.position.set(-0.2, 0.22, 0);
        leftShoulder.scale.set(1.2, 0.8, 1);
        body.add(leftShoulder);

        const rightShoulder = new THREE.Mesh(shoulderGeo, whiteMat);
        rightShoulder.position.set(0.2, 0.22, 0);
        rightShoulder.scale.set(1.2, 0.8, 1);
        body.add(rightShoulder);

        // Runner booster / jetpack
        const packGeo = new THREE.BoxGeometry(0.2, 0.24, 0.1);
        const pack = new THREE.Mesh(packGeo, darkArmorMat);
        pack.position.set(0, 0.05, -0.12);

        // Twin nozzles
        const nozzleGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.07, 6);
        const nozzleL = new THREE.Mesh(nozzleGeo, cyanGlowMat);
        nozzleL.position.set(-0.06, -0.13, 0);
        pack.add(nozzleL);
        const nozzleR = new THREE.Mesh(nozzleGeo, cyanGlowMat);
        nozzleR.position.set(0.06, -0.13, 0);
        pack.add(nozzleR);
        body.add(pack);

        group.add(body); // children[0]

        // 2. Head (child 1)
        const headGeo = new THREE.SphereGeometry(0.22, 10, 10);
        const head = new THREE.Mesh(headGeo, mat);
        head.position.y = 1.22;
        head.castShadow = true;

        // Sleek aerodynamic cyber-visor
        const visorGeo = new THREE.BoxGeometry(0.3, 0.1, 0.16);
        const visorMat = new THREE.MeshStandardMaterial({
            color: 0x0d1b2a,
            emissive: 0x00e5ff,
            emissiveIntensity: 0.85,
            roughness: 0.1,
            metalness: 0.8
        });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 0.02, 0.12);
        head.add(visor);

        // Champion headband
        const bandGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.05, 12, 1, true);
        const band = new THREE.Mesh(bandGeo, whiteMat);
        band.position.set(0, 0.05, 0);
        head.add(band);

        // Hero crest
        const crestGeo = new THREE.BoxGeometry(0.04, 0.1, 0.16);
        const crest = new THREE.Mesh(crestGeo, cyanGlowMat);
        crest.position.set(0, 0.2, -0.04);
        head.add(crest);

        group.add(head); // children[1]

        // 3. Left Leg (child 2)
        const legGeo = new THREE.CapsuleGeometry(0.07, 0.3, 6, 6);
        const leftLeg = new THREE.Mesh(legGeo, mat);
        leftLeg.position.set(-0.1, 0.2, 0);

        const shoeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.17);
        const leftShoe = new THREE.Mesh(shoeGeo, whiteMat);
        leftShoe.position.set(0, -0.15, 0.04);
        leftLeg.add(leftShoe);
        group.add(leftLeg); // children[2]

        // 4. Right Leg (child 3)
        const rightLeg = new THREE.Mesh(legGeo, mat);
        rightLeg.position.set(0.1, 0.2, 0);

        const rightShoe = new THREE.Mesh(shoeGeo, whiteMat);
        rightShoe.position.set(0, -0.15, 0.04);
        rightLeg.add(rightShoe);
        group.add(rightLeg); // children[3]

        // 5. Left Arm (child 4) & Hero Buckler Shield
        const armGeo = new THREE.CapsuleGeometry(0.05, 0.25, 4, 4);
        const leftArm = new THREE.Mesh(armGeo, mat);
        leftArm.position.set(-0.25, 0.75, 0);
        leftArm.rotation.z = 0.3;

        const cuffGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.07, 6);
        const leftCuff = new THREE.Mesh(cuffGeo, whiteMat);
        leftCuff.position.set(0, -0.09, 0);
        leftArm.add(leftCuff);

        // Hero Buckler Shield
        const shieldGroup = new THREE.Group();
        const shieldBaseGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 8);
        const shieldBase = new THREE.Mesh(shieldBaseGeo, whiteMat);
        shieldBase.rotation.x = Math.PI / 2;
        shieldGroup.add(shieldBase);

        const shieldRimGeo = new THREE.TorusGeometry(0.18, 0.025, 6, 12);
        const shieldRim = new THREE.Mesh(shieldRimGeo, cyanGlowMat);
        shieldGroup.add(shieldRim);

        const shieldBossGeo = new THREE.SphereGeometry(0.05, 6, 6);
        const shieldBoss = new THREE.Mesh(shieldBossGeo, cyanGlowMat);
        shieldBoss.position.z = 0.03;
        shieldGroup.add(shieldBoss);

        shieldGroup.position.set(-0.08, -0.05, 0.08);
        shieldGroup.rotation.y = Math.PI / 2;
        leftArm.add(shieldGroup);
        group.add(leftArm); // children[4]

        // 6. Right Arm (child 5) & Glowing Cyber Energy Blade
        const rightArm = new THREE.Mesh(armGeo, mat);
        rightArm.position.set(0.25, 0.75, 0);
        rightArm.rotation.z = -0.3;

        const rightCuff = new THREE.Mesh(cuffGeo, whiteMat);
        rightCuff.position.set(0, -0.09, 0);
        rightArm.add(rightCuff);

        // Cyber Energy Sword
        const swordGroup = new THREE.Group();
        
        // Hilt grip
        const swordHiltGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.12, 5);
        const swordHilt = new THREE.Mesh(swordHiltGeo, darkArmorMat);
        swordGroup.add(swordHilt);

        // Crossguard
        const swordGuardGeo = new THREE.BoxGeometry(0.12, 0.025, 0.04);
        const swordGuard = new THREE.Mesh(swordGuardGeo, whiteMat);
        swordGuard.position.y = 0.06;
        swordGroup.add(swordGuard);

        // Glowing Energy Blade
        const swordBladeGeo = new THREE.BoxGeometry(0.055, 0.42, 0.015);
        const swordBlade = new THREE.Mesh(swordBladeGeo, cyanGlowMat);
        swordBlade.position.y = 0.28;
        swordGroup.add(swordBlade);

        swordGroup.position.set(0.04, -0.12, 0.12);
        swordGroup.rotation.x = Math.PI / 3;
        rightArm.add(swordGroup);
        group.add(rightArm); // children[5]

        // Store part references
        group.userData.body = body;
        group.userData.head = head;
        group.userData.leftLeg = leftLeg;
        group.userData.rightLeg = rightLeg;
        group.userData.leftArm = leftArm;
        group.userData.rightArm = rightArm;
        group.userData.sword = swordGroup;
        group.userData.shield = shieldGroup;
        group.userData.isEnemy = false;
        group.userData.hitReact = 0;

        return group;
    }

    addToPlayerCrowd(amount) {
        const startIndex = this.playerCount;
        this.playerCount += amount;

        for (let i = 0; i < amount; i++) {
            this.addStickmanToGroup(startIndex + i);
        }
    }

    removeFromPlayerCrowd(amount) {
        amount = Math.min(amount, this.playerCount - 1);
        if (amount <= 0) return;

        for (let i = 0; i < amount; i++) {
            if (this.playerStickmen.length > 1) {
                const stickman = this.playerStickmen.pop();
                // Instead of just removing, launch it as a ragdoll
                let ragdollColor;
                if (this.game && this.game.equippedSkin === 'rainbow') {
                    const rainbowColors = [0xFF1744, 0xFF9100, 0xFFEA00, 0x00E676, 0x2979FF, 0xD500F9];
                    ragdollColor = rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
                } else {
                    ragdollColor = this.game ? this.game.getPlayerColor() : 0x2196F3;
                }
                this.launchRagdoll(stickman, ragdollColor);
                if (this.playerGroup) {
                    this.playerGroup.remove(stickman);
                }
            }
        }
        this.playerCount = Math.max(1, this.playerCount - amount);
    }

    removeEnemyCrowd(enemy) {
        if (enemy.meshGroup) {
            // Launch remaining enemy stickmen as ragdolls
            const children = [...enemy.meshGroup.children];
            children.forEach(child => {
                this.launchRagdoll(child, 0xf44336, enemy.meshGroup);
            });
            setTimeout(() => {
                if (enemy.meshGroup) {
                    this.scene.remove(enemy.meshGroup);
                    enemy.meshGroup.traverse(c => {
                        if (c.geometry) c.geometry.dispose();
                        if (c.material) c.material.dispose();
                    });
                }
            }, 100);
        }
    }

    // ============ RAGDOLL FLYING STICKMAN ============
    launchRagdoll(stickman, color, parentGroup) {
        // Get world position of the stickman
        const worldPos = new THREE.Vector3();
        stickman.getWorldPosition(worldPos);

        // Check if enemy or friendly
        const isEnemy = stickman.userData && stickman.userData.isEnemy === true;
        const ragdoll = this.createStickman(color, isEnemy);
        ragdoll.position.copy(worldPos);
        ragdoll.userData.dynamic = true;

        // Random launch direction (mostly up and outward)
        const launchAngle = Math.random() * Math.PI * 2;
        const launchPower = 4 + Math.random() * 6;
        const upPower = 6 + Math.random() * 5;

        ragdoll.userData.velocity = new THREE.Vector3(
            Math.cos(launchAngle) * launchPower,
            upPower,
            Math.sin(launchAngle) * launchPower
        );
        ragdoll.userData.angularVel = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 15
        );
        ragdoll.userData.life = 1.5;
        ragdoll.userData.maxLife = 1.5;
        ragdoll.userData.color = color;
        ragdoll.userData.trailTimer = 0;

        // Make material transparent for fade-out
        ragdoll.traverse(child => {
            if (child.material) {
                child.material = child.material.clone();
                child.material.transparent = true;
            }
        });

        this.scene.add(ragdoll);
        this.flyingBodies.push({ mesh: ragdoll });

        // Spawn impact flash at launch position
        this.spawnImpactFlash(worldPos, color);

        // Spawn burst sparks
        this.spawnSparks(worldPos, color, 5);
    }

    // ============ NEON SWORD SLASH EFFECT ============
    spawnSlash(position, rotation, color = 0x00f0ff, scale = 1) {
        if (this.slashEffects.length >= 6) {
            const oldest = this.slashEffects.shift();
            this.scene.remove(oldest.mesh);
            if (oldest.mesh.geometry) oldest.mesh.geometry.dispose();
            if (oldest.mesh.material) oldest.mesh.material.dispose();
        }

        const arcGeo = new THREE.RingGeometry(0.24 * scale, 0.46 * scale, 12, 1, 0, Math.PI * 0.7);
        const arcMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const slash = new THREE.Mesh(arcGeo, arcMat);
        slash.position.copy(position);
        if (rotation) {
            slash.rotation.copy(rotation);
        } else {
            slash.rotation.x = -Math.PI / 3;
            slash.rotation.y = (Math.random() - 0.5) * 0.4;
            slash.rotation.z = (Math.random() - 0.5) * 0.4;
        }
        slash.userData.dynamic = true;
        this.scene.add(slash);
        this.slashEffects.push({
            mesh: slash,
            life: 0.13,
            maxLife: 0.13
        });
    }

    updateSlashEffects(delta) {
        for (let i = this.slashEffects.length - 1; i >= 0; i--) {
            const effect = this.slashEffects[i];
            effect.life -= delta;
            const progress = 1 - (effect.life / effect.maxLife);
            
            const s = 1 + progress * 0.5;
            effect.mesh.scale.set(s, s, s);
            effect.mesh.material.opacity = Math.max(0, (1 - progress) * 0.95);

            if (effect.life <= 0) {
                this.scene.remove(effect.mesh);
                effect.mesh.geometry.dispose();
                effect.mesh.material.dispose();
                this.slashEffects.splice(i, 1);
            }
        }
    }

    // ============ IMPACT FLASH (expanding ring) ============
    spawnImpactFlash(position, color) {
        const ringGeo = new THREE.RingGeometry(0.1, 0.3, 16);
        const ringMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(position);
        ring.position.y += 0.8;
        ring.rotation.x = -Math.PI / 2;
        ring.userData.dynamic = true;

        this.scene.add(ring);
        this.impactFlashes.push({
            mesh: ring,
            life: 0.4,
            maxLife: 0.4
        });

        // Also spawn a bright sphere flash
        const flashGeo = new THREE.SphereGeometry(0.3, 8, 8);
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.9
        });
        const flash = new THREE.Mesh(flashGeo, flashMat);
        flash.position.copy(position);
        flash.position.y += 0.8;
        flash.userData.dynamic = true;
        this.scene.add(flash);
        this.impactFlashes.push({
            mesh: flash,
            life: 0.2,
            maxLife: 0.2
        });
    }

    // ============ SPARK PARTICLES ============
    spawnSparks(position, color, count) {
        for (let i = 0; i < count; i++) {
            const geo = new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 4, 4);
            const mat = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? color : 0xFFFFFF,
                transparent: true,
                opacity: 1
            });
            const spark = new THREE.Mesh(geo, mat);
            spark.position.copy(position);
            spark.position.y += 0.5 + Math.random() * 0.5;
            spark.userData.dynamic = true;

            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 5;
            spark.userData.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                2 + Math.random() * 4,
                Math.sin(angle) * speed
            );
            spark.userData.life = 0.5 + Math.random() * 0.3;
            spark.userData.maxLife = spark.userData.life;

            this.scene.add(spark);
            this.sparkParticles.push({ mesh: spark });
        }
    }

    // ============ DEATH EFFECT (called from game.js fight) ============
    spawnDeathEffect(x, z, color) {
        const pos = new THREE.Vector3(
            x + (Math.random() - 0.5) * 2,
            0.5,
            z + (Math.random() - 0.5) * 1
        );
        this.spawnImpactFlash(pos, color);
        this.spawnSparks(pos, color, 4);
    }

    getPlayerCount() {
        return this.playerCount;
    }

    updatePlayerPosition(x, z) {
        if (this.playerGroup) {
            this.playerGroup.position.set(x, 0, z);
        }
    }

    update(delta, isFighting = false, fightingEnemy = null, playerX = 0, trackZ = 0) {
        this.animTime += delta * 5; // Slower animation cycle
        if (isFighting) {
            this.combatTime += delta;
        } else {
            this.combatTime = 0;
        }
        
        // Animate stickmen
        if (this.playerStickmen.length > 0) {
            const frontlineCount = Math.min(10, Math.max(3, Math.floor(this.playerStickmen.length * 0.45)));

            this.playerStickmen.forEach((stickman, i) => {
                // Spawn pop-in animation
                if (stickman.userData.spawning) {
                    const elapsed = this.animTime - stickman.userData.spawnTime;
                    const t = Math.min(elapsed * 2, 1);
                    const scale = Math.min(t * 1.2, 1) * (1 + Math.sin(t * Math.PI) * 0.3);
                    stickman.scale.set(
                        Math.min(scale, 1),
                        Math.min(scale, 1),
                        Math.min(scale, 1)
                    );
                    if (t >= 1) {
                        stickman.userData.spawning = false;
                        stickman.scale.set(1, 1, 1);
                    }
                }

                const children = stickman.children;
                const baseZ = stickman.userData.basePos ? stickman.userData.basePos.z : 0;
                const baseX = stickman.userData.basePos ? stickman.userData.basePos.x : 0;

                if (isFighting && fightingEnemy) {
                    // ============ COMBAT ENGAGEMENT ANIMATION ============
                    const isFrontline = i < frontlineCount;

                    if (isFrontline) {
                        // Frontline fighters push forward towards the clash zone
                        const targetZ = baseZ - 1.1;
                        stickman.position.z += (targetZ - stickman.position.z) * Math.min(1, delta * 8);

                        // Athletic fighting stance shuffle
                        stickman.position.y = 0.05 + Math.sin(this.combatTime * 14 + i) * 0.04;

                        // Braced legs
                        if (children.length >= 4) {
                            children[2].rotation.x = -0.35 + Math.sin(this.combatTime * 8 + i) * 0.15;
                            children[3].rotation.x = 0.35 - Math.sin(this.combatTime * 8 + i) * 0.15;
                        }

                        // Guard stance: Left arm with shield raised to block
                        if (children.length >= 5) {
                            children[4].rotation.x = -0.75 + Math.sin(this.combatTime * 8 + i) * 0.15;
                            children[4].rotation.y = 0.35;
                            children[4].rotation.z = 0.4;
                        }

                        // Fast, snappy sword slash attacks
                        const attackSpeed = 13;
                        const attackPhase = (this.combatTime * attackSpeed + i * 1.6) % (Math.PI * 2);
                        if (children.length >= 6) {
                            children[5].rotation.x = Math.sin(attackPhase) * 1.2 - 0.2;
                            children[5].rotation.y = -Math.cos(attackPhase) * 0.35;
                            children[5].rotation.z = -0.25;
                        }

                        // Lunge forward into slash
                        if (children.length >= 1) {
                            children[0].rotation.x = 0.22 + Math.sin(attackPhase) * 0.12;
                            children[0].rotation.y = Math.sin(attackPhase) * 0.15;
                        }
                        if (children.length >= 2) {
                            children[1].rotation.x = 0.1 + Math.sin(attackPhase) * 0.08;
                        }

                        // Spawn neon slash arc and light sparks near apex of sword swing
                        if (attackPhase > 1.7 && attackPhase < 2.1 && Math.random() < 0.25) {
                            const worldPos = new THREE.Vector3();
                            stickman.getWorldPosition(worldPos);
                            worldPos.y += 0.8;
                            worldPos.z -= 0.35;
                            worldPos.x += (Math.random() - 0.5) * 0.3;
                            this.spawnSlash(worldPos, null, 0x00f0ff, 1.0);
                            if (Math.random() < 0.35) {
                                this.spawnSparks(worldPos, 0x00f0ff, 2);
                            }
                        }
                    } else {
                        // Reserve / rear fighters cheer and press forward
                        const targetZ = baseZ - 0.5;
                        stickman.position.z += (targetZ - stickman.position.z) * Math.min(1, delta * 6);
                        stickman.position.y = Math.abs(Math.sin(this.combatTime * 9 + i * 0.5)) * 0.18;

                        // Raised arms cheering / rallying
                        if (children.length >= 5) {
                            children[4].rotation.x = -1.1 + Math.cos(this.combatTime * 10 + i) * 0.3;
                            children[4].rotation.z = 0.5;
                        }
                        if (children.length >= 6) {
                            children[5].rotation.x = -1.3 + Math.sin(this.combatTime * 11 + i) * 0.4;
                            children[5].rotation.z = -0.4;
                        }
                        if (children.length >= 1) {
                            children[0].rotation.x = 0.08;
                            children[0].rotation.y = 0;
                        }
                    }

                    // Hit reaction flinch
                    if (stickman.userData.hitReact > 0) {
                        stickman.userData.hitReact = Math.max(0, stickman.userData.hitReact - delta * 4);
                        if (children.length >= 1) {
                            children[0].rotation.x -= 0.35 * stickman.userData.hitReact;
                        }
                        stickman.position.z += 0.12 * stickman.userData.hitReact;
                    }
                } else {
                    // ============ NORMAL RUNNING ANIMATION ============
                    // Smoothly restore base position
                    stickman.position.z += (baseZ - stickman.position.z) * Math.min(1, delta * 6);
                    stickman.position.x += (baseX - stickman.position.x) * Math.min(1, delta * 6);

                    const offset = i * 0.7;
                    const walkCycle = this.animTime + offset;
                    
                    // Bobbing motion - more pronounced up/down
                    if (!stickman.userData.spawning) {
                        stickman.position.y = Math.abs(Math.sin(walkCycle * 2)) * 0.25;
                    }
                    
                    // Body lean forward while running
                    if (children.length >= 1) {
                        children[0].rotation.x = 0.15 + Math.sin(walkCycle) * 0.05;
                        children[0].rotation.y = 0;
                    }
                    // Head bob
                    if (children.length >= 2) {
                        children[1].rotation.x = Math.sin(walkCycle * 2) * 0.08;
                    }
                    
                    // Leg animation - runner stride
                    if (children.length >= 4) {
                        children[2].rotation.x = Math.sin(walkCycle) * 0.8;
                        children[3].rotation.x = -Math.sin(walkCycle) * 0.8;
                    }
                    // Arm animation - running swing with weapons in hand
                    if (children.length >= 6) {
                        children[4].rotation.x = -Math.sin(walkCycle) * 0.7;
                        children[4].rotation.y = 0;
                        children[4].rotation.z = 0.3 + Math.sin(walkCycle * 2) * 0.1;
                        children[5].rotation.x = Math.sin(walkCycle) * 0.7;
                        children[5].rotation.y = 0;
                        children[5].rotation.z = -0.3 - Math.sin(walkCycle * 2) * 0.1;
                    }
                }
            });
        }

        // Update all effects
        this.updateSlashEffects(delta);
        this.updateFlyingBodies(delta);
        this.updateImpactFlashes(delta);
        this.updateSparkParticles(delta);
        this.updateTrailParticles(delta);
    }

    updateFlyingBodies(delta) {
        for (let i = this.flyingBodies.length - 1; i >= 0; i--) {
            const body = this.flyingBodies[i];
            const mesh = body.mesh;
            const ud = mesh.userData;

            ud.life -= delta;
            const lifeRatio = ud.life / ud.maxLife;

            // Physics
            ud.velocity.y -= 20 * delta; // gravity
            mesh.position.x += ud.velocity.x * delta;
            mesh.position.y += ud.velocity.y * delta;
            mesh.position.z += ud.velocity.z * delta;

            // Tumbling rotation
            mesh.rotation.x += ud.angularVel.x * delta;
            mesh.rotation.y += ud.angularVel.y * delta;
            mesh.rotation.z += ud.angularVel.z * delta;

            // Slow down angular velocity
            ud.angularVel.multiplyScalar(0.98);

            // Fade out and shrink in last 30% of life
            if (lifeRatio < 0.3) {
                const fadeRatio = lifeRatio / 0.3;
                mesh.traverse(child => {
                    if (child.material) {
                        child.material.opacity = fadeRatio;
                    }
                });
                mesh.scale.setScalar(fadeRatio);
            }

            // Spawn trail particles
            ud.trailTimer += delta;
            if (ud.trailTimer > 0.05 && lifeRatio > 0.3) {
                ud.trailTimer = 0;
                this.spawnTrailParticle(mesh.position, ud.color);
            }

            // Bounce off ground
            if (mesh.position.y < 0.2 && ud.velocity.y < 0) {
                ud.velocity.y *= -0.4;
                ud.velocity.x *= 0.7;
                ud.velocity.z *= 0.7;
                mesh.position.y = 0.2;
                // Spawn ground hit sparks
                if (Math.abs(ud.velocity.y) > 1) {
                    this.spawnSparks(mesh.position, ud.color, 2);
                }
            }

            // Remove when dead
            if (ud.life <= 0) {
                this.scene.remove(mesh);
                mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                this.flyingBodies.splice(i, 1);
            }
        }
    }

    updateImpactFlashes(delta) {
        for (let i = this.impactFlashes.length - 1; i >= 0; i--) {
            const flash = this.impactFlashes[i];
            flash.life -= delta;
            const ratio = flash.life / flash.maxLife;

            // Expand and fade
            const scale = 1 + (1 - ratio) * 4;
            flash.mesh.scale.set(scale, scale, scale);
            flash.mesh.material.opacity = ratio * 0.8;

            if (flash.life <= 0) {
                this.scene.remove(flash.mesh);
                flash.mesh.geometry.dispose();
                flash.mesh.material.dispose();
                this.impactFlashes.splice(i, 1);
            }
        }
    }

    updateSparkParticles(delta) {
        for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
            const spark = this.sparkParticles[i];
            const mesh = spark.mesh;
            const ud = mesh.userData;

            ud.life -= delta;
            const ratio = ud.life / ud.maxLife;

            // Physics
            ud.velocity.y -= 12 * delta;
            mesh.position.x += ud.velocity.x * delta;
            mesh.position.y += ud.velocity.y * delta;
            mesh.position.z += ud.velocity.z * delta;

            // Fade and shrink
            mesh.material.opacity = ratio;
            mesh.scale.setScalar(ratio);

            // Slow down
            ud.velocity.multiplyScalar(0.96);

            if (ud.life <= 0 || mesh.position.y < -1) {
                this.scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
                this.sparkParticles.splice(i, 1);
            }
        }
    }

    spawnTrailParticle(position, color) {
        const geo = new THREE.SphereGeometry(0.04, 4, 4);
        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6
        });
        const particle = new THREE.Mesh(geo, mat);
        particle.position.copy(position);
        particle.position.x += (Math.random() - 0.5) * 0.2;
        particle.position.y += (Math.random() - 0.5) * 0.2;
        particle.userData.dynamic = true;
        particle.userData.life = 0.4;
        particle.userData.maxLife = 0.4;
        this.scene.add(particle);
        this.trailParticles.push({ mesh: particle });
    }

    updateTrailParticles(delta) {
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const trail = this.trailParticles[i];
            const mesh = trail.mesh;
            mesh.userData.life -= delta;
            const ratio = mesh.userData.life / mesh.userData.maxLife;

            mesh.material.opacity = ratio * 0.6;
            mesh.scale.setScalar(ratio);

            if (mesh.userData.life <= 0) {
                this.scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
                this.trailParticles.splice(i, 1);
            }
        }
    }

    // Keep backward compat
    updateParticles(delta) {
        // Now handled in update() automatically
    }
}
