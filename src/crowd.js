import * as THREE from 'three';

export class CrowdManager {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.playerStickmen = [];
        this.playerGroup = null;
        this.playerCount = 0;
        this.animTime = 0;
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
        const stickman = this.createStickman(color);
        const pos = this.getFormationPosition(index);
        stickman.position.set(pos.x, 0, pos.z);
        stickman.userData.index = index;
        // Start with a pop-in scale animation
        stickman.scale.set(0, 0, 0);
        stickman.userData.spawnTime = this.animTime;
        stickman.userData.spawning = true;
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

    createStickman(color) {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ 
            color,
            roughness: 0.35,
            metalness: 0.2
        });

        // 1. Body (child 0)
        const bodyGeo = new THREE.CapsuleGeometry(0.16, 0.48, 6, 6);
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.y = 0.7;
        body.castShadow = true;

        // Runner chest energy core (attached to body)
        const coreGeo = new THREE.BoxGeometry(0.14, 0.18, 0.08);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.8,
            roughness: 0.2
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(0, 0.05, 0.12);
        body.add(core);

        // Runner jetpack/booster (attached to body back)
        const packGeo = new THREE.BoxGeometry(0.2, 0.24, 0.1);
        const packMat = new THREE.MeshStandardMaterial({
            color: 0x1b2838,
            roughness: 0.4,
            metalness: 0.7
        });
        const pack = new THREE.Mesh(packGeo, packMat);
        pack.position.set(0, 0.05, -0.12);

        // Twin thruster nozzles on pack
        const nozzleGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.07, 6);
        const nozzleMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.9
        });
        const nozzleL = new THREE.Mesh(nozzleGeo, nozzleMat);
        nozzleL.position.set(-0.06, -0.13, 0);
        pack.add(nozzleL);
        const nozzleR = new THREE.Mesh(nozzleGeo, nozzleMat);
        nozzleR.position.set(0.06, -0.13, 0);
        pack.add(nozzleR);
        body.add(pack);

        group.add(body); // children[0]

        // 2. Head (child 1)
        const headGeo = new THREE.SphereGeometry(0.22, 10, 10);
        const head = new THREE.Mesh(headGeo, mat);
        head.position.y = 1.22;
        head.castShadow = true;

        // Sleek aerodynamic arcade cyber-visor (attached to head)
        const visorGeo = new THREE.BoxGeometry(0.3, 0.1, 0.16);
        const visorMat = new THREE.MeshStandardMaterial({
            color: 0x0d1b2a,
            emissive: 0x00e5ff,
            emissiveIntensity: 0.8,
            roughness: 0.1,
            metalness: 0.8
        });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 0.02, 0.12);
        head.add(visor);

        // Sporty headband / aero fin across the head
        const bandGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.05, 12, 1, true);
        const bandMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.3
        });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.set(0, 0.05, 0);
        head.add(band);

        // Top aero crest
        const crestGeo = new THREE.BoxGeometry(0.04, 0.1, 0.16);
        const crestMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.5
        });
        const crest = new THREE.Mesh(crestGeo, crestMat);
        crest.position.set(0, 0.2, -0.04);
        head.add(crest);

        group.add(head); // children[1]

        // 3. Left Leg (child 2)
        const legGeo = new THREE.CapsuleGeometry(0.07, 0.3, 6, 6);
        const leftLeg = new THREE.Mesh(legGeo, mat);
        leftLeg.position.set(-0.1, 0.2, 0);

        // Runner sneaker
        const shoeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.17);
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
        leftShoe.position.set(0, -0.15, 0.04);
        leftLeg.add(leftShoe);

        group.add(leftLeg); // children[2]

        // 4. Right Leg (child 3)
        const rightLeg = new THREE.Mesh(legGeo, mat);
        rightLeg.position.set(0.1, 0.2, 0);

        const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
        rightShoe.position.set(0, -0.15, 0.04);
        rightLeg.add(rightShoe);

        group.add(rightLeg); // children[3]

        // 5. Left Arm (child 4)
        const armGeo = new THREE.CapsuleGeometry(0.05, 0.25, 4, 4);
        const leftArm = new THREE.Mesh(armGeo, mat);
        leftArm.position.set(-0.25, 0.75, 0);
        leftArm.rotation.z = 0.3;
        const cuffGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.07, 6);
        const cuffMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const leftCuff = new THREE.Mesh(cuffGeo, cuffMat);
        leftCuff.position.set(0, -0.09, 0);
        leftArm.add(leftCuff);
        group.add(leftArm); // children[4]

        // 6. Right Arm (child 5)
        const rightArm = new THREE.Mesh(armGeo, mat);
        rightArm.position.set(0.25, 0.75, 0);
        rightArm.rotation.z = -0.3;
        const rightCuff = new THREE.Mesh(cuffGeo, cuffMat);
        rightCuff.position.set(0, -0.09, 0);
        rightArm.add(rightCuff);
        group.add(rightArm); // children[5]

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
                this.playerGroup.remove(stickman);
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

        // Create a simplified ragdoll body
        const ragdoll = this.createStickman(color);
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

    update(delta) {
        this.animTime += delta * 5; // Slower animation cycle
        
        // Animate stickmen running
        if (this.playerStickmen.length > 0) {
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

                const offset = i * 0.7;
                const walkCycle = this.animTime + offset;
                
                // Bobbing motion - more pronounced up/down
                if (!stickman.userData.spawning) {
                    stickman.position.y = Math.abs(Math.sin(walkCycle * 2)) * 0.25;
                }
                
                // Body lean forward while running
                const children = stickman.children;
                // Body tilt (children[0] = body)
                if (children.length >= 1) {
                    children[0].rotation.x = 0.15 + Math.sin(walkCycle) * 0.05;
                }
                // Head bob (children[1] = head)
                if (children.length >= 2) {
                    children[1].rotation.x = Math.sin(walkCycle * 2) * 0.08;
                }
                
                // Leg animation - much larger swing
                if (children.length >= 4) {
                    children[2].rotation.x = Math.sin(walkCycle) * 0.8; // left leg big swing
                    children[3].rotation.x = -Math.sin(walkCycle) * 0.8; // right leg big swing
                }
                // Arm animation - opposite to legs, big swing
                if (children.length >= 6) {
                    children[4].rotation.x = -Math.sin(walkCycle) * 0.7; // left arm
                    children[4].rotation.z = 0.3 + Math.sin(walkCycle * 2) * 0.1;
                    children[5].rotation.x = Math.sin(walkCycle) * 0.7; // right arm
                    children[5].rotation.z = -0.3 - Math.sin(walkCycle * 2) * 0.1;
                }
            });
        }

        // Update all effects
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
