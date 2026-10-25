import * as THREE from 'three';

interface RagdollItem {
  mesh: THREE.Group;
}

interface FlashItem {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface SparkItem {
  mesh: THREE.Mesh;
}

interface TrailItem {
  mesh: THREE.Mesh;
}

interface GameReference {
  equippedSkin: string;
  getPlayerColor: () => number;
}

export class CrowdManager {
  scene: THREE.Scene;
  game: GameReference | null = null;
  playerStickmen: THREE.Group[] = [];
  playerGroup: THREE.Group | null = null;
  playerCount = 0;
  animTime = 0;
  flyingBodies: RagdollItem[] = [];
  impactFlashes: FlashItem[] = [];
  sparkParticles: SparkItem[] = [];
  trailParticles: TrailItem[] = [];

  constructor(scene: THREE.Scene, game: GameReference | null = null) {
    this.scene = scene;
    this.game = game;
  }

  clear() {
    if (this.playerGroup) {
      this.scene.remove(this.playerGroup);
      this.playerGroup.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    }
    this.playerStickmen = [];
    this.playerGroup = null;
    this.playerCount = 0;

    this.flyingBodies.forEach(b => {
      this.scene.remove(b.mesh);
    });
    this.flyingBodies = [];
    this.impactFlashes.forEach(f => {
      this.scene.remove(f.mesh);
    });
    this.impactFlashes = [];
    this.sparkParticles.forEach(p => {
      this.scene.remove(p.mesh);
    });
    this.sparkParticles = [];
    this.trailParticles.forEach(p => {
      this.scene.remove(p.mesh);
    });
    this.trailParticles = [];
  }

  createPlayerCrowd(count: number) {
    this.clear();
    this.playerCount = count;
    this.playerGroup = new THREE.Group();
    this.playerGroup.userData.dynamic = true;

    for (let i = 0; i < count; i++) {
      this.addStickmanToGroup(i);
    }

    this.scene.add(this.playerGroup);
  }

  addStickmanToGroup(index: number) {
    let color: number;
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
    stickman.scale.set(0, 0, 0);
    stickman.userData.spawnTime = this.animTime;
    stickman.userData.spawning = true;
    if (this.playerGroup) {
      this.playerGroup.add(stickman);
    }
    this.playerStickmen.push(stickman);
  }

  getFormationPosition(index: number) {
    if (index === 0) return { x: 0, z: 0 };
    const angle = index * 2.4;
    const radius = Math.sqrt(index) * 0.4;
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius * 0.6
    };
  }

  createStickman(color: number): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color });

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.15, 0.5, 4, 4);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.7;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = 1.2;
    head.castShadow = true;
    group.add(head);

    // Legs
    const legGeo = new THREE.CapsuleGeometry(0.07, 0.3, 4, 4);
    const leftLeg = new THREE.Mesh(legGeo, mat);
    leftLeg.position.set(-0.1, 0.2, 0);
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, mat);
    rightLeg.position.set(0.1, 0.2, 0);
    group.add(rightLeg);

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.05, 0.25, 4, 4);
    const leftArm = new THREE.Mesh(armGeo, mat);
    leftArm.position.set(-0.25, 0.75, 0);
    leftArm.rotation.z = 0.3;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, mat);
    rightArm.position.set(0.25, 0.75, 0);
    rightArm.rotation.z = -0.3;
    group.add(rightArm);

    return group;
  }

  addToPlayerCrowd(amount: number) {
    const startIndex = this.playerCount;
    this.playerCount += amount;

    for (let i = 0; i < amount; i++) {
      this.addStickmanToGroup(startIndex + i);
    }
  }

  removeFromPlayerCrowd(amount: number) {
    amount = Math.min(amount, this.playerCount - 1);
    if (amount <= 0) return;

    for (let i = 0; i < amount; i++) {
      if (this.playerStickmen.length > 1) {
        const stickman = this.playerStickmen.pop();
        if (stickman && this.playerGroup) {
          let ragdollColor: number;
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
    }
    this.playerCount = Math.max(1, this.playerCount - amount);
  }

  removeEnemyCrowd(enemy: { meshGroup?: THREE.Group | null }) {
    if (enemy.meshGroup) {
      const children = [...enemy.meshGroup.children];
      children.forEach(child => {
        this.launchRagdoll(child as THREE.Group, 0xf44336);
      });
      setTimeout(() => {
        if (enemy.meshGroup) {
          this.scene.remove(enemy.meshGroup);
          enemy.meshGroup.traverse(c => {
            const m = c as THREE.Mesh;
            if (m.geometry) m.geometry.dispose();
            if (m.material) {
              if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
              else m.material.dispose();
            }
          });
        }
      }, 100);
    }
  }

  launchRagdoll(stickman: THREE.Object3D, color: number) {
    const worldPos = new THREE.Vector3();
    stickman.getWorldPosition(worldPos);

    const ragdoll = this.createStickman(color);
    ragdoll.position.copy(worldPos);
    ragdoll.userData.dynamic = true;

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

    ragdoll.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        mesh.material = (mesh.material as THREE.Material).clone();
        mesh.material.transparent = true;
      }
    });

    this.scene.add(ragdoll);
    this.flyingBodies.push({ mesh: ragdoll });

    this.spawnImpactFlash(worldPos, color);
    this.spawnSparks(worldPos, color, 5);
  }

  spawnImpactFlash(position: THREE.Vector3, color: number) {
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

  spawnSparks(position: THREE.Vector3, color: number, count: number) {
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

  spawnDeathEffect(x: number, z: number, color: number) {
    const pos = new THREE.Vector3(
      x + (Math.random() - 0.5) * 2,
      0.5,
      z + (Math.random() - 0.5) * 1
    );
    this.spawnImpactFlash(pos, color);
    this.spawnSparks(pos, color, 4);
  }

  getPlayerCount(): number {
    return this.playerCount;
  }

  updatePlayerPosition(x: number, z: number) {
    if (this.playerGroup) {
      this.playerGroup.position.set(x, 0, z);
    }
  }

  update(delta: number) {
    this.animTime += delta * 5;

    if (this.playerStickmen.length > 0) {
      this.playerStickmen.forEach((stickman, i) => {
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

        if (!stickman.userData.spawning) {
          stickman.position.y = Math.abs(Math.sin(walkCycle * 2)) * 0.25;
        }

        const children = stickman.children;
        if (children.length >= 1) {
          children[0].rotation.x = 0.15 + Math.sin(walkCycle) * 0.05;
        }
        if (children.length >= 2) {
          children[1].rotation.x = Math.sin(walkCycle * 2) * 0.08;
        }
        if (children.length >= 4) {
          children[2].rotation.x = Math.sin(walkCycle) * 0.8;
          children[3].rotation.x = -Math.sin(walkCycle) * 0.8;
        }
        if (children.length >= 6) {
          children[4].rotation.x = -Math.sin(walkCycle) * 0.7;
          children[4].rotation.z = 0.3 + Math.sin(walkCycle * 2) * 0.1;
          children[5].rotation.x = Math.sin(walkCycle) * 0.7;
          children[5].rotation.z = -0.3 - Math.sin(walkCycle * 2) * 0.1;
        }
      });
    }

    this.updateFlyingBodies(delta);
    this.updateImpactFlashes(delta);
    this.updateSparkParticles(delta);
    this.updateTrailParticles(delta);
  }

  updateFlyingBodies(delta: number) {
    for (let i = this.flyingBodies.length - 1; i >= 0; i--) {
      const body = this.flyingBodies[i];
      const mesh = body.mesh;
      const ud = mesh.userData;

      ud.life -= delta;
      const lifeRatio = ud.life / ud.maxLife;

      ud.velocity.y -= 20 * delta;
      mesh.position.x += ud.velocity.x * delta;
      mesh.position.y += ud.velocity.y * delta;
      mesh.position.z += ud.velocity.z * delta;

      mesh.rotation.x += ud.angularVel.x * delta;
      mesh.rotation.y += ud.angularVel.y * delta;
      mesh.rotation.z += ud.angularVel.z * delta;

      ud.angularVel.multiplyScalar(0.98);

      if (lifeRatio < 0.3) {
        const fadeRatio = lifeRatio / 0.3;
        mesh.traverse(child => {
          const m = child as THREE.Mesh;
          if (m.material) {
            (m.material as THREE.Material).opacity = fadeRatio;
          }
        });
        mesh.scale.setScalar(fadeRatio);
      }

      ud.trailTimer += delta;
      if (ud.trailTimer > 0.05 && lifeRatio > 0.3) {
        ud.trailTimer = 0;
        this.spawnTrailParticle(mesh.position, ud.color);
      }

      if (mesh.position.y < 0.2 && ud.velocity.y < 0) {
        ud.velocity.y *= -0.4;
        ud.velocity.x *= 0.7;
        ud.velocity.z *= 0.7;
        mesh.position.y = 0.2;
        if (Math.abs(ud.velocity.y) > 1) {
          this.spawnSparks(mesh.position, ud.color, 2);
        }
      }

      if (ud.life <= 0) {
        this.scene.remove(mesh);
        mesh.traverse(child => {
          const m = child as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (m.material) {
            if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
            else m.material.dispose();
          }
        });
        this.flyingBodies.splice(i, 1);
      }
    }
  }

  updateImpactFlashes(delta: number) {
    for (let i = this.impactFlashes.length - 1; i >= 0; i--) {
      const flash = this.impactFlashes[i];
      flash.life -= delta;
      const ratio = flash.life / flash.maxLife;

      const scale = 1 + (1 - ratio) * 4;
      flash.mesh.scale.set(scale, scale, scale);
      (flash.mesh.material as THREE.Material).opacity = ratio * 0.8;

      if (flash.life <= 0) {
        this.scene.remove(flash.mesh);
        flash.mesh.geometry.dispose();
        (flash.mesh.material as THREE.Material).dispose();
        this.impactFlashes.splice(i, 1);
      }
    }
  }

  updateSparkParticles(delta: number) {
    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const spark = this.sparkParticles[i];
      const mesh = spark.mesh;
      const ud = mesh.userData;

      ud.life -= delta;
      const ratio = ud.life / ud.maxLife;

      ud.velocity.y -= 12 * delta;
      mesh.position.x += ud.velocity.x * delta;
      mesh.position.y += ud.velocity.y * delta;
      mesh.position.z += ud.velocity.z * delta;

      (mesh.material as THREE.Material).opacity = ratio;
      mesh.scale.setScalar(ratio);

      ud.velocity.multiplyScalar(0.96);

      if (ud.life <= 0 || mesh.position.y < -1) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.sparkParticles.splice(i, 1);
      }
    }
  }

  spawnTrailParticle(position: THREE.Vector3, color: number) {
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

  updateTrailParticles(delta: number) {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const trail = this.trailParticles[i];
      const mesh = trail.mesh;
      mesh.userData.life -= delta;
      const ratio = mesh.userData.life / mesh.userData.maxLife;

      (mesh.material as THREE.Material).opacity = ratio * 0.6;
      mesh.scale.setScalar(ratio);

      if (mesh.userData.life <= 0) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.trailParticles.splice(i, 1);
      }
    }
  }

  updateParticles(_delta: number) {
    // Handled in update
  }
}
