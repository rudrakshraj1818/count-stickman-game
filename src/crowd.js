import * as THREE from 'three';

export class CrowdManager {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        
        // Single Hero reference
        this.heroGroup = null;
        this.heroModel = null;
        this.heroParts = null;
        this.prevPlayerX = 0;
        this.horizontalVel = 0;
        
        this.animTime = 0;
        this.combatTime = 0;
        this.slashEffects = [];    // Neon sword slash arcs
        this.flyingBodies = [];    // Ragdoll enemy stickmen flying away
        this.impactFlashes = [];   // Impact burst rings
        this.sparkParticles = [];  // Small spark particles
        this.trailParticles = [];  // Trailing particles
        this.invulnerableTimer = 0; // Damage invulnerability timer
    }

    clear() {
        if (this.heroGroup) {
            this.scene.remove(this.heroGroup);
            this.heroGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        this.heroGroup = null;
        this.heroModel = null;
        this.heroParts = null;

        // Clean up visual effects
        this.slashEffects.forEach(s => { 
            this.scene.remove(s.mesh);
            if (s.mesh.geometry) s.mesh.geometry.dispose();
            if (s.mesh.material) s.mesh.material.dispose();
        });
        this.slashEffects = [];

        this.flyingBodies.forEach(b => { 
            this.scene.remove(b.mesh); 
            b.mesh.traverse(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
        });
        this.flyingBodies = [];

        this.impactFlashes.forEach(f => { 
            this.scene.remove(f.mesh);
            if (f.mesh.geometry) f.mesh.geometry.dispose();
            if (f.mesh.material) f.mesh.material.dispose();
        });
        this.impactFlashes = [];

        this.sparkParticles.forEach(p => { 
            this.scene.remove(p.mesh); 
            if (p.mesh.geometry) p.mesh.geometry.dispose();
            if (p.mesh.material) p.mesh.material.dispose();
        });
        this.sparkParticles = [];

        this.trailParticles.forEach(p => { 
            this.scene.remove(p.mesh); 
            if (p.mesh.geometry) p.mesh.geometry.dispose();
            if (p.mesh.material) p.mesh.material.dispose();
        });
        this.trailParticles = [];
    }

    // ============ CREATE SINGLE PLAYABLE HERO ============
    createPlayerCrowd() {
        this.clear();
        this.createHero();
    }

    createHero() {
        this.heroGroup = new THREE.Group();
        this.heroGroup.userData.dynamic = true;

        this.heroModel = new THREE.Group();
        this.heroGroup.add(this.heroModel);

        const skinColor = this.game ? this.game.getPlayerColor() : 0x2196F3;
        
        // Materials
        const heroMat = new THREE.MeshStandardMaterial({
            color: skinColor,
            roughness: 0.35,
            metalness: 0.5
        });

        const darkArmorMat = new THREE.MeshStandardMaterial({
            color: 0x181e2e,
            roughness: 0.45,
            metalness: 0.85
        });

        const goldTrimMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            roughness: 0.25,
            metalness: 0.95
        });

        const glowingVisorMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00e5ff,
            emissiveIntensity: 1.2
        });

        const energyCoreMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00d0ff,
            emissiveIntensity: 1.0
        });

        // 1. Soft Contact Shadow grounded flush beneath hero
        const shadowGeo = new THREE.CircleGeometry(0.58, 20);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000511,
            transparent: true,
            opacity: 0.45,
            depthWrite: false
        });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.02;
        this.heroGroup.add(shadow);
        this.heroShadow = shadow;

        // 2. Armored Torso / Chestplate
        const torsoGeo = new THREE.CapsuleGeometry(0.22, 0.52, 8, 8);
        const torso = new THREE.Mesh(torsoGeo, heroMat);
        torso.position.y = 0.85;
        torso.castShadow = true;
        this.heroModel.add(torso);

        // Chest Armor Breastplate
        const chestPlateGeo = new THREE.BoxGeometry(0.34, 0.36, 0.24);
        const chestPlate = new THREE.Mesh(chestPlateGeo, darkArmorMat);
        chestPlate.position.set(0, 0.08, 0.02);
        torso.add(chestPlate);

        // Glowing Core Crest on chestplate
        const coreGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 6);
        const core = new THREE.Mesh(coreGeo, energyCoreMat);
        core.position.set(0, 0.08, 0.14);
        core.rotation.x = Math.PI / 2;
        torso.add(core);

        // Armored Belt
        const beltGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 12);
        const belt = new THREE.Mesh(beltGeo, darkArmorMat);
        belt.position.set(0, -0.22, 0);
        torso.add(belt);

        const buckleGeo = new THREE.BoxGeometry(0.12, 0.1, 0.1);
        const buckle = new THREE.Mesh(buckleGeo, goldTrimMat);
        buckle.position.set(0, -0.22, 0.14);
        torso.add(buckle);

        // 3. Knight-Runner Helmet Head & Winged Crest
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 1.4, 0);

        const headGeo = new THREE.SphereGeometry(0.23, 12, 12);
        const head = new THREE.Mesh(headGeo, heroMat);
        head.castShadow = true;
        headGroup.add(head);

        // Helmet brow guard
        const browGeo = new THREE.BoxGeometry(0.32, 0.1, 0.28);
        const brow = new THREE.Mesh(browGeo, darkArmorMat);
        brow.position.set(0, 0.1, 0.02);
        headGroup.add(brow);

        // Glowing Visor Line
        const visorGeo = new THREE.BoxGeometry(0.28, 0.065, 0.14);
        const visor = new THREE.Mesh(visorGeo, glowingVisorMat);
        visor.position.set(0, 0.02, 0.14);
        headGroup.add(visor);

        // Winged crest on helmet
        const crownCrestGeo = new THREE.ConeGeometry(0.06, 0.28, 4);
        const crownCrest = new THREE.Mesh(crownCrestGeo, goldTrimMat);
        crownCrest.position.set(0, 0.28, 0.04);
        crownCrest.rotation.x = -0.3;
        headGroup.add(crownCrest);

        const wingGeo = new THREE.ConeGeometry(0.045, 0.22, 4);
        const leftWing = new THREE.Mesh(wingGeo, goldTrimMat);
        leftWing.position.set(-0.16, 0.18, -0.04);
        leftWing.rotation.z = 0.6;
        leftWing.rotation.x = -0.2;
        headGroup.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeo, goldTrimMat);
        rightWing.position.set(0.16, 0.18, -0.04);
        rightWing.rotation.z = -0.6;
        rightWing.rotation.x = -0.2;
        headGroup.add(rightWing);

        this.heroModel.add(headGroup);

        // 4. Spaulders (Shoulder Pauldrons)
        const pauldronGeo = new THREE.SphereGeometry(0.12, 8, 8, 0, Math.PI);
        const leftPauldron = new THREE.Mesh(pauldronGeo, goldTrimMat);
        leftPauldron.position.set(-0.28, 1.15, 0);
        leftPauldron.rotation.z = -Math.PI / 2;
        this.heroModel.add(leftPauldron);

        const rightPauldron = new THREE.Mesh(pauldronGeo, goldTrimMat);
        rightPauldron.position.set(0.28, 1.15, 0);
        rightPauldron.rotation.z = Math.PI / 2;
        this.heroModel.add(rightPauldron);

        // 5. Left Arm with Heroic Guard Buckler / Shield
        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.32, 1.12, 0);

        const armGeo = new THREE.CapsuleGeometry(0.065, 0.32, 6, 6);
        const leftArm = new THREE.Mesh(armGeo, heroMat);
        leftArm.position.y = -0.16;
        leftArm.castShadow = true;
        leftArmGroup.add(leftArm);

        // Hero Buckler Shield
        const shieldGroup = new THREE.Group();
        const shieldRimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 8);
        const shieldRim = new THREE.Mesh(shieldRimGeo, darkArmorMat);
        shieldRim.rotation.y = Math.PI / 2;
        shieldGroup.add(shieldRim);

        const shieldBossGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const shieldBoss = new THREE.Mesh(shieldBossGeo, goldTrimMat);
        shieldBoss.position.set(-0.03, 0, 0);
        shieldGroup.add(shieldBoss);

        const shieldGlowGeo = new THREE.BoxGeometry(0.04, 0.28, 0.28);
        const shieldGlow = new THREE.Mesh(shieldGlowGeo, glowingVisorMat);
        shieldGroup.add(shieldGlow);

        shieldGroup.position.set(-0.12, -0.18, 0.08);
        shieldGroup.rotation.y = Math.PI / 2;
        leftArmGroup.add(shieldGroup);

        this.heroModel.add(leftArmGroup);

        // 6. Right Arm with Radiant Hero Blade
        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.32, 1.12, 0);

        const rightArm = new THREE.Mesh(armGeo, heroMat);
        rightArm.position.y = -0.16;
        rightArm.castShadow = true;
        rightArmGroup.add(rightArm);

        // Weapon (Hero Broadsword / Energy Blade)
        const weaponGroup = new THREE.Group();
        const hiltGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.42, 6);
        const hilt = new THREE.Mesh(hiltGeo, darkArmorMat);
        hilt.rotation.x = Math.PI / 2;
        weaponGroup.add(hilt);

        const crossguardGeo = new THREE.BoxGeometry(0.24, 0.05, 0.06);
        const crossguard = new THREE.Mesh(crossguardGeo, goldTrimMat);
        crossguard.position.set(0, 0, -0.12);
        weaponGroup.add(crossguard);

        // Silver metallic blade
        const swordBladeGeo = new THREE.BoxGeometry(0.08, 0.68, 0.03);
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0xddf0ff,
            metalness: 0.95,
            roughness: 0.15
        });
        const swordBlade = new THREE.Mesh(swordBladeGeo, bladeMat);
        swordBlade.position.set(0, 0, -0.48);
        swordBlade.rotation.x = Math.PI / 2;
        weaponGroup.add(swordBlade);

        // Radiant glowing cutting core
        const bladeCoreGeo = new THREE.BoxGeometry(0.035, 0.65, 0.045);
        const bladeCore = new THREE.Mesh(bladeCoreGeo, energyCoreMat);
        bladeCore.position.set(0, 0, -0.48);
        bladeCore.rotation.x = Math.PI / 2;
        weaponGroup.add(bladeCore);

        weaponGroup.position.set(0.06, -0.25, 0.12);
        weaponGroup.rotation.x = 0.25;
        rightArmGroup.add(weaponGroup);

        this.heroModel.add(rightArmGroup);

        // 7. Armored Legs & Runner Boots
        const legGeo = new THREE.CapsuleGeometry(0.085, 0.36, 6, 6);
        const bootGeo = new THREE.BoxGeometry(0.14, 0.12, 0.24);
        const kneeGeo = new THREE.BoxGeometry(0.14, 0.1, 0.14);

        // Left Leg Group
        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.14, 0.65, 0);

        const leftLeg = new THREE.Mesh(legGeo, heroMat);
        leftLeg.position.y = -0.18;
        leftLeg.castShadow = true;
        leftLegGroup.add(leftLeg);

        const leftKnee = new THREE.Mesh(kneeGeo, goldTrimMat);
        leftKnee.position.set(0, -0.14, 0.06);
        leftLegGroup.add(leftKnee);

        const leftBoot = new THREE.Mesh(bootGeo, darkArmorMat);
        leftBoot.position.set(0, -0.38, 0.05);
        leftBoot.castShadow = true;
        leftLegGroup.add(leftBoot);

        this.heroModel.add(leftLegGroup);

        // Right Leg Group
        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.14, 0.65, 0);

        const rightLeg = new THREE.Mesh(legGeo, heroMat);
        rightLeg.position.y = -0.18;
        rightLeg.castShadow = true;
        rightLegGroup.add(rightLeg);

        const rightKnee = new THREE.Mesh(kneeGeo, goldTrimMat);
        rightKnee.position.set(0, -0.14, 0.06);
        rightLegGroup.add(rightKnee);

        const rightBoot = new THREE.Mesh(bootGeo, darkArmorMat);
        rightBoot.position.set(0, -0.38, 0.05);
        rightBoot.castShadow = true;
        rightLegGroup.add(rightBoot);

        this.heroModel.add(rightLegGroup);

        // 8. Flowing Runner Cape
        const capeGeo = new THREE.BoxGeometry(0.32, 0.55, 0.02);
        const capeMat = new THREE.MeshStandardMaterial({
            color: skinColor,
            roughness: 0.7,
            metalness: 0.1
        });
        const cape = new THREE.Mesh(capeGeo, capeMat);
        cape.position.set(0, 0.9, -0.14);
        cape.rotation.x = 0.28;
        this.heroModel.add(cape);

        // Store parts for animation
        this.heroParts = {
            torso,
            headGroup,
            leftArmGroup,
            rightArmGroup,
            weaponGroup,
            shieldGroup,
            leftLegGroup,
            rightLegGroup,
            cape,
            bladeCore,
            core
        };

        // Apply hero level scaling
        const heroLevel = this.game ? this.game.heroLevel : 1;
        this.updateHeroScale(heroLevel);

        this.scene.add(this.heroGroup);
    }

    updateHeroScale(level = 1) {
        if (!this.heroModel) return;
        // Subtle visual size & power increase at higher levels
        const scale = 1.0 + Math.min(0.24, (level - 1) * 0.04);
        this.heroModel.scale.set(scale, scale, scale);
    }

    getPlayerCount() {
        return (this.game && this.game.heroHP > 0) ? 1 : 0;
    }

    updatePlayerPosition(x, z, jumpY = 0, isSliding = false, roadAngle = 0) {
        this.currentJumpY = jumpY;
        this.currentIsSliding = isSliding;
        if (this.heroGroup) {
            this.heroGroup.position.set(x, jumpY, z);
            if (this.heroModel) {
                const targetRotY = roadAngle + (this.horizontalVel || 0) * 0.04;
                this.heroModel.rotation.y += (targetRotY - this.heroModel.rotation.y) * 0.25;
            }
            if (this.heroShadow) {
                this.heroShadow.position.y = -jumpY + 0.02;
                const shadowScale = Math.max(0.35, 1.0 - jumpY * 0.28);
                this.heroShadow.scale.set(shadowScale, shadowScale, shadowScale);
                if (this.heroShadow.material) {
                    this.heroShadow.material.opacity = Math.max(0.12, 0.45 - jumpY * 0.16);
                }
            }
        }
    }

    triggerStumble() {
        this.stumbleTimer = 0.35;
        if (this.heroGroup) {
            const pos = this.heroGroup.position.clone();
            pos.y += 0.8;
            this.spawnSparks(pos, 0xff5722, 12);
            this.spawnImpactFlash(pos, 0xff1744);
        }
    }

    triggerInvulnerability(duration = 0.85) {
        this.invulnerableTimer = duration;
        if (this.heroGroup) {
            const pos = this.heroGroup.position.clone();
            pos.y += 0.9;
            this.spawnImpactFlash(pos, 0x00f0ff);
            this.spawnSparks(pos, 0x00f0ff, 8);
        }
    }

    // ============ ANIMATION & GAME LOOP ============
    update(delta, isFighting = false, fightingEnemy = null, playerX = 0, trackZ = 0) {
        this.animTime += delta * 11;

        // Calculate horizontal swipe velocity for banking tilt
        const deltaX = playerX - this.prevPlayerX;
        this.horizontalVel = THREE.MathUtils.damp(this.horizontalVel, deltaX / Math.max(delta, 0.001), 12, delta);
        this.prevPlayerX = playerX;

        // Stumble shake reaction when hitting obstacles
        if (this.stumbleTimer > 0) {
            this.stumbleTimer -= delta;
            if (this.heroModel) {
                this.heroModel.position.x = Math.sin(this.stumbleTimer * 45) * 0.12;
            }
        } else if (this.heroModel) {
            this.heroModel.position.x = 0;
        }

        // Damage-invulnerability flashing / blinking
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= delta;
            if (this.heroModel) {
                this.heroModel.visible = (Math.floor(this.invulnerableTimer * 22) % 2 === 0);
            }
        } else if (this.heroModel && !this.heroModel.visible) {
            this.heroModel.visible = true;
        }

        if (this.heroParts && this.heroModel) {
            const parts = this.heroParts;

            if (isFighting && fightingEnemy) {
                // ============ COMBAT STANCE & ATTACK ============
                this.combatTime += delta;

                // Hero combat stance: solid braced forward stance
                this.heroModel.position.y = 0.05 + Math.abs(Math.sin(this.combatTime * 14)) * 0.06;
                this.heroModel.rotation.x = 0.12;
                this.heroGroup.rotation.z = 0;

                // Shield raised in guard
                parts.leftArmGroup.rotation.x = -0.85 + Math.sin(this.combatTime * 10) * 0.15;
                parts.leftArmGroup.rotation.y = 0.45;
                parts.leftArmGroup.rotation.z = 0.3;

                // Dynamic Sword Slashes
                const slashCycle = Math.sin(this.combatTime * 22);
                parts.rightArmGroup.rotation.x = -1.1 + slashCycle * 0.85;
                parts.rightArmGroup.rotation.y = -0.3 + Math.cos(this.combatTime * 22) * 0.4;
                parts.rightArmGroup.rotation.z = -0.2;

                // Braced legs
                parts.leftLegGroup.rotation.x = -0.35 + Math.sin(this.combatTime * 8) * 0.1;
                parts.rightLegGroup.rotation.x = 0.4 - Math.sin(this.combatTime * 8) * 0.1;

                // Cape billows in combat breeze
                parts.cape.rotation.x = 0.35 + Math.sin(this.combatTime * 12) * 0.15;

                // Periodic slash arc spawn
                if (Math.random() < 0.25) {
                    const slashPos = new THREE.Vector3(
                        playerX + (Math.random() - 0.5) * 0.5,
                        0.9 + Math.random() * 0.5,
                        -trackZ - 0.7
                    );
                    this.spawnSlash(slashPos, null, 0x00f0ff, 1.2);
                }

            } else if (this.currentIsSliding) {
                // ============ DYNAMIC SLIDE / CROUCH POSE ============
                // Body lowers and tilts backward ~48 degrees
                this.heroModel.position.y = -0.28;
                this.heroModel.rotation.x = -0.85;
                this.heroGroup.rotation.z = 0;

                // Both legs extended forward in slide
                parts.leftLegGroup.rotation.x = -1.15;
                parts.rightLegGroup.rotation.x = -1.05;

                // Shield raised forward to protect head/chest under low obstacles
                parts.leftArmGroup.rotation.x = -0.9;
                parts.leftArmGroup.rotation.y = 0.35;
                parts.leftArmGroup.rotation.z = 0.2;

                // Sword carried low along the runner flank
                parts.rightArmGroup.rotation.x = 0.35;
                parts.rightArmGroup.rotation.y = 0;
                parts.rightArmGroup.rotation.z = -0.3;

                // Cape streams flat behind
                parts.cape.rotation.x = -0.4;
                parts.cape.rotation.z = 0;

                // Slide ground sparks & friction dust
                if (Math.random() < 0.55) {
                    const dustPos = new THREE.Vector3(
                        playerX + (Math.random() - 0.5) * 0.35,
                        0.06,
                        -trackZ + (Math.random() - 0.5) * 0.35
                    );
                    this.spawnSparks(dustPos, 0xffa726, 2);
                }

            } else if (this.currentJumpY > 0.08) {
                // ============ DYNAMIC JUMP SILHOUETTE ============
                this.heroModel.position.y = 0;
                this.heroModel.rotation.x = -0.15; // forward aerodynamic leap
                this.heroGroup.rotation.z = THREE.MathUtils.clamp(-this.horizontalVel * 0.025, -0.18, 0.18);

                // Legs tucked upward for clear obstacle clearance
                parts.leftLegGroup.rotation.x = -0.7;
                parts.rightLegGroup.rotation.x = 0.5;

                // Arms outstretched for balance in air
                parts.leftArmGroup.rotation.x = 0.45;
                parts.leftArmGroup.rotation.z = 0.5;
                parts.rightArmGroup.rotation.x = -0.75;
                parts.rightArmGroup.rotation.z = -0.5;

                // Cape billows upward against gravity
                parts.cape.rotation.x = 0.85;

            } else {
                // ============ NORMAL RUNNING ANIMATION ============
                this.combatTime = 0;
                const walkCycle = this.animTime;

                // Vertical runner bobbing
                this.heroModel.position.y = Math.abs(Math.sin(walkCycle)) * 0.1;

                // Dynamic sprint forward lean
                this.heroModel.rotation.x = 0.16;

                // Steering bank into left/right lane switch
                const bankAngle = THREE.MathUtils.clamp(-this.horizontalVel * 0.035, -0.22, 0.22);
                this.heroGroup.rotation.z = THREE.MathUtils.damp(this.heroGroup.rotation.z, bankAngle, 10, delta);

                // Alternating stride legs
                parts.leftLegGroup.rotation.x = Math.sin(walkCycle) * 0.85;
                parts.rightLegGroup.rotation.x = -Math.sin(walkCycle) * 0.85;

                // Alternating running arm swings
                parts.leftArmGroup.rotation.x = -Math.sin(walkCycle) * 0.55;
                parts.leftArmGroup.rotation.y = 0;
                parts.leftArmGroup.rotation.z = 0.2;

                parts.rightArmGroup.rotation.x = Math.sin(walkCycle) * 0.65;
                parts.rightArmGroup.rotation.y = 0;
                parts.rightArmGroup.rotation.z = -0.22;

                // Flowing cape flapping behind runner
                parts.cape.rotation.x = 0.42 + Math.sin(walkCycle * 2) * 0.14;
                parts.cape.rotation.z = Math.sin(walkCycle) * 0.08;

                // Head look straight ahead
                parts.headGroup.rotation.y = THREE.MathUtils.clamp(-this.horizontalVel * 0.02, -0.15, 0.15);
            }
        }

        // Update all visual particle systems
        this.updateSlashEffects(delta);
        this.updateFlyingBodies(delta);
        this.updateImpactFlashes(delta);
        this.updateSparkParticles(delta);
        this.updateTrailParticles(delta);
    }

    triggerLevelUpEffect() {
        if (!this.heroGroup) return;
        const pos = this.heroGroup.position.clone();
        pos.y = 1.0;

        // Radiant golden aura rings
        this.spawnImpactFlash(pos, 0xffd700);
        this.spawnSparks(pos, 0xffea00, 18);
        this.spawnSlash(pos, null, 0xffd700, 1.8);

        // Update scale with new level
        if (this.game) {
            this.updateHeroScale(this.game.heroLevel);
        }
    }

    addToPlayerCrowd(amount) {
        // Converted to Hero XP progression
        if (this.game) {
            this.game.addHeroXP(amount * 15);
        }
    }

    removeFromPlayerCrowd(amount) {
        // Converted to Hero damage
        if (this.game) {
            this.game.damageHero(amount * 8);
        }
    }

    removeEnemyCrowd(enemy) {
        if (enemy.meshGroup) {
            // Launch remaining enemy stickmen as ragdolls
            const children = [...enemy.meshGroup.children];
            children.forEach(child => {
                this.launchRagdoll(child, 0xf44336);
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

    // ============ RAGDOLL FLYING ENEMY ============
    launchRagdoll(stickman, color) {
        const worldPos = new THREE.Vector3();
        stickman.getWorldPosition(worldPos);

        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
            color: color || 0x880e4f,
            roughness: 0.5,
            metalness: 0.6
        });

        // Simple ragdoll stickman mesh
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.45, 4, 4), mat);
        body.position.y = 0.65;
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), mat);
        head.position.y = 1.15;
        group.add(head);

        group.position.copy(worldPos);
        group.userData.dynamic = true;

        const launchAngle = Math.random() * Math.PI * 2;
        const launchPower = 5 + Math.random() * 6;
        const upPower = 6 + Math.random() * 5;

        group.userData.velocity = new THREE.Vector3(
            Math.cos(launchAngle) * launchPower,
            upPower,
            Math.sin(launchAngle) * launchPower
        );
        group.userData.angularVel = new THREE.Vector3(
            (Math.random() - 0.5) * 16,
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 16
        );
        group.userData.life = 1.4;
        group.userData.maxLife = 1.4;

        this.scene.add(group);
        this.flyingBodies.push({ mesh: group });

        this.spawnImpactFlash(worldPos, color);
        this.spawnSparks(worldPos, color, 6);
    }

    spawnSlash(position, rotation, color = 0x00f0ff, scale = 1) {
        if (this.slashEffects.length >= 6) {
            const oldest = this.slashEffects.shift();
            this.scene.remove(oldest.mesh);
            if (oldest.mesh.geometry) oldest.mesh.geometry.dispose();
            if (oldest.mesh.material) oldest.mesh.material.dispose();
        }

        const arcGeo = new THREE.RingGeometry(0.25 * scale, 0.5 * scale, 12, 1, 0, Math.PI * 0.7);
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
            life: 0.14,
            maxLife: 0.14
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

    spawnImpactFlash(position, color = 0xffffff) {
        if (this.impactFlashes.length >= 6) {
            const oldest = this.impactFlashes.shift();
            this.scene.remove(oldest.mesh);
            if (oldest.mesh.geometry) oldest.mesh.geometry.dispose();
            if (oldest.mesh.material) oldest.mesh.material.dispose();
        }

        const ringGeo = new THREE.RingGeometry(0.1, 0.45, 16);
        const ringMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const flash = new THREE.Mesh(ringGeo, ringMat);
        flash.position.copy(position);
        flash.position.y += 0.05;
        flash.rotation.x = -Math.PI / 2;
        flash.userData.dynamic = true;
        this.scene.add(flash);
        this.impactFlashes.push({
            mesh: flash,
            life: 0.16,
            maxLife: 0.16
        });
    }

    updateImpactFlashes(delta) {
        for (let i = this.impactFlashes.length - 1; i >= 0; i--) {
            const flash = this.impactFlashes[i];
            flash.life -= delta;
            const progress = 1 - (flash.life / flash.maxLife);
            
            const s = 1 + progress * 2.2;
            flash.mesh.scale.set(s, s, s);
            flash.mesh.material.opacity = Math.max(0, 1 - progress);

            if (flash.life <= 0) {
                this.scene.remove(flash.mesh);
                flash.mesh.geometry.dispose();
                flash.mesh.material.dispose();
                this.impactFlashes.splice(i, 1);
            }
        }
    }

    spawnSparks(position, color = 0xffaa00, count = 6) {
        for (let i = 0; i < count; i++) {
            if (this.sparkParticles.length >= 35) {
                const oldest = this.sparkParticles.shift();
                this.scene.remove(oldest.mesh);
                if (oldest.mesh.geometry) oldest.mesh.geometry.dispose();
                if (oldest.mesh.material) oldest.mesh.material.dispose();
            }

            const sparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
            const sparkMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending
            });
            const spark = new THREE.Mesh(sparkGeo, sparkMat);
            spark.position.copy(position);
            spark.userData.dynamic = true;

            const angle = Math.random() * Math.PI * 2;
            const speed = 2.5 + Math.random() * 4.5;
            const upSpeed = 2 + Math.random() * 4;

            this.scene.add(spark);
            this.sparkParticles.push({
                mesh: spark,
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    upSpeed,
                    Math.sin(angle) * speed
                ),
                life: 0.35 + Math.random() * 0.25,
                maxLife: 0.6
            });
        }
    }

    updateSparkParticles(delta) {
        for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
            const p = this.sparkParticles[i];
            p.life -= delta;
            p.velocity.y -= 14 * delta; // Gravity
            p.mesh.position.addScaledVector(p.velocity, delta);

            const progress = 1 - (p.life / p.maxLife);
            p.mesh.material.opacity = Math.max(0, 1 - progress);

            if (p.life <= 0 || p.mesh.position.y < 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.sparkParticles.splice(i, 1);
            }
        }
    }

    updateTrailParticles(delta) {
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const p = this.trailParticles[i];
            p.life -= delta;
            p.mesh.position.addScaledVector(p.velocity, delta);
            const progress = 1 - (p.life / p.maxLife);
            p.mesh.material.opacity = Math.max(0, 1 - progress);
            const s = (1 - progress) * 0.08;
            p.mesh.scale.set(s, s, s);

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.trailParticles.splice(i, 1);
            }
        }
    }

    updateFlyingBodies(delta) {
        for (let i = this.flyingBodies.length - 1; i >= 0; i--) {
            const body = this.flyingBodies[i];
            const mesh = body.mesh;
            const ud = mesh.userData;

            ud.life -= delta;
            const lifeRatio = ud.life / ud.maxLife;

            ud.velocity.y -= 18 * delta; // Gravity
            mesh.position.addScaledVector(ud.velocity, delta);

            mesh.rotation.x += ud.angularVel.x * delta;
            mesh.rotation.y += ud.angularVel.y * delta;
            mesh.rotation.z += ud.angularVel.z * delta;

            if (mesh.position.y <= 0.2) {
                mesh.position.y = 0.2;
                ud.velocity.y = -ud.velocity.y * 0.4;
                ud.velocity.x *= 0.65;
                ud.velocity.z *= 0.65;
                ud.angularVel.multiplyScalar(0.5);
            }

            mesh.traverse(child => {
                if (child.material) {
                    child.material.opacity = Math.max(0, lifeRatio);
                }
            });

            if (ud.life <= 0) {
                this.scene.remove(mesh);
                mesh.traverse(c => {
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) c.material.dispose();
                });
                this.flyingBodies.splice(i, 1);
            }
        }
    }

    updateParticles(delta) {
        this.updateSparkParticles(delta);
        this.updateSlashEffects(delta);
    }

    spawnDeathEffect(x, z, color = 0x2196F3) {
        const pos = new THREE.Vector3(x, 0.8, z);
        this.spawnImpactFlash(pos, color);
        this.spawnSparks(pos, color, 5);
    }
}
