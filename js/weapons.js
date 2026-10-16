import * as THREE from 'three';

// High-Performance Aerospace 6DOF Weaponry: Slick Dual-Core Lasers & Wild Corkscrewing Guided Missiles
export class WeaponManager {
    constructor(scene, soundSystem) {
        this.scene = scene;
        this.sound = soundSystem;

        this.projectiles = [];
        this.flares = [];
        this.particles = [];
        this.smokeMotes = [];
        this.rings = [];

        // Weapon states
        this.laserLevel = 1; // Mk 1 to Mk 4
        this.lastLaserTime = 0;
        this.laserCooldown = 0.095; // Crisp high-cadence rate of fire

        this.vulcanAmmo = 800;
        this.lastVulcanTime = 0;
        this.vulcanCooldown = 0.045; // 22 rounds/sec

        this.missileAmmo = 30; // Generous salvo capacity
        this.maxMissiles = 30;
        this.lastMissileTime = 0;
        this.missileCooldown = 0.32; // Rapid-fire corkscrewing salvo capability
        this.missileReloadTimer = 0;

        this.lastFlareTime = 0;
        this.flareCooldown = 0.35;

        // Wing cannon alternating tracker
        this.wingToggle = false;

        // --- 1. Slick Laser Specifications (Dual-Core: Blinding White Needle + Vibrant Neon Sheath) ---
        this.laserConfigs = {
            1: {
                name: 'CYAN PULSE',
                glowColor: 0x00f0ff,
                lightColor: 0x00f0ff,
                speed: 190.0,
                damage: 32,
                energyCost: 1.2,
                lightIntensity: 3.5,
                lightDist: 22,
                mode: 'alternating'
            },
            2: {
                name: 'EMERALD HEAVY',
                glowColor: 0x10b981,
                lightColor: 0x10b981,
                speed: 210.0,
                damage: 54,
                energyCost: 2.2,
                lightIntensity: 4.2,
                lightDist: 25,
                mode: 'dual'
            },
            3: {
                name: 'VIOLET PLASMA',
                glowColor: 0xc084fc,
                lightColor: 0xc084fc,
                speed: 230.0,
                damage: 75,
                energyCost: 3.0,
                lightIntensity: 4.8,
                lightDist: 28,
                mode: 'dual'
            },
            4: {
                name: 'SOLAR GOLD QUAD',
                glowColor: 0xfbbf24,
                lightColor: 0xfbbf24,
                speed: 250.0,
                damage: 120,
                energyCost: 4.5,
                lightIntensity: 6.0,
                lightDist: 32,
                mode: 'quad'
            }
        };

        // Inner white-hot needle core
        this.laserCoreGeom = new THREE.CylinderGeometry(0.045, 0.045, 2.6, 6);
        this.laserCoreGeom.rotateX(Math.PI / 2);
        this.laserCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // Outer volumetric plasma sheaths
        this.laserGlowGeom = new THREE.CylinderGeometry(0.14, 0.14, 2.9, 8);
        this.laserGlowGeom.rotateX(Math.PI / 2);

        this.laserGlowMats = {
            1: new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
            2: new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
            3: new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
            4: new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
        };

        // Vulcan tracer
        this.vulcanGeom = new THREE.CylinderGeometry(0.035, 0.035, 1.2, 5);
        this.vulcanGeom.rotateX(Math.PI / 2);
        this.vulcanMat = new THREE.MeshBasicMaterial({ color: 0xffeebb });

        // Flare
        this.flareGeom = new THREE.SphereGeometry(0.25, 8, 8);
        this.flareMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });

        // --- 2. Wild Missile Shared Geometries & PBR Materials ---
        this.missileNoseGeom = new THREE.ConeGeometry(0.24, 0.75, 8);
        this.missileNoseGeom.rotateX(-Math.PI / 2);

        this.missileBodyGeom = new THREE.CylinderGeometry(0.24, 0.24, 1.3, 8);
        this.missileBodyGeom.rotateX(Math.PI / 2);

        this.missileFinGeom = new THREE.BoxGeometry(0.04, 0.72, 0.42);

        this.missileNozzleGeom = new THREE.CylinderGeometry(0.18, 0.26, 0.35, 8);
        this.missileNozzleGeom.rotateX(Math.PI / 2);

        this.missilePlumeGeom = new THREE.ConeGeometry(0.22, 1.4, 8);
        this.missilePlumeGeom.rotateX(-Math.PI / 2);

        this.missileBodyMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.35,
            metalness: 0.85
        });

        this.missileNoseMat = new THREE.MeshStandardMaterial({
            color: 0xef4444, // Crimson warhead tip
            roughness: 0.4,
            metalness: 0.5
        });

        this.missilePlumeMat = new THREE.MeshBasicMaterial({
            color: 0xff9900,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Soft circular smoke texture for corkscrew contrail
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(255, 230, 180, 1.0)');
        grad.addColorStop(0.35, 'rgba(160, 170, 185, 0.8)');
        grad.addColorStop(1, 'rgba(40, 50, 60, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
        this.smokeTex = new THREE.CanvasTexture(canvas);

        this.shockwaveGeom = new THREE.RingGeometry(0.4, 1.6, 24);
        this.shockwaveMat = new THREE.MeshBasicMaterial({
            color: 0xffaa33,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }

    cycleLaserLevel() {
        this.laserLevel = (this.laserLevel % 4) + 1;
        this.sound.playWeaponSwitch?.();
        return this.laserLevel;
    }

    // --- 1. Slick Lasers Firing Pipeline ---
    firePrimary(physics, weaponId, currentTime) {
        if (weaponId === 1) {
            if (currentTime - this.lastLaserTime < this.laserCooldown) return false;
            const cfg = this.laserConfigs[this.laserLevel];
            if (physics.energy < cfg.energyCost) return false;

            physics.energy = Math.max(0, physics.energy - cfg.energyCost);
            this.lastLaserTime = currentTime;

            const shipQuat = physics.quaternion;
            const shipPos = physics.position;

            // Wingtip cannon positions matching the Pyro-GX 3D model
            const leftWing = new THREE.Vector3(-2.55, 0.02, -1.55);
            const rightWing = new THREE.Vector3(2.55, 0.02, -1.55);
            const ventralL = new THREE.Vector3(-1.3, -0.3, -1.1);
            const ventralR = new THREE.Vector3(1.3, -0.3, -1.1);

            let muzzleOffsets = [];
            if (cfg.mode === 'alternating') {
                muzzleOffsets = [this.wingToggle ? rightWing : leftWing];
                this.wingToggle = !this.wingToggle;
            } else if (cfg.mode === 'dual') {
                muzzleOffsets = [leftWing, rightWing];
            } else if (cfg.mode === 'quad') {
                muzzleOffsets = [leftWing, rightWing, ventralL, ventralR];
            }

            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipQuat);

            for (const offset of muzzleOffsets) {
                const worldMuzzle = offset.clone().applyQuaternion(shipQuat).add(shipPos);

                // Compound Dual-Core Laser Bolt:
                const boltGroup = new THREE.Group();
                boltGroup.position.copy(worldMuzzle);
                boltGroup.quaternion.copy(shipQuat);

                // Inner white-hot needle core
                const coreMesh = new THREE.Mesh(this.laserCoreGeom, this.laserCoreMat);
                boltGroup.add(coreMesh);

                // Outer glowing neon sheath (glows via HDR UnrealBloomPass with zero PointLight shader recompilation!)
                const glowMat = this.laserGlowMats[this.laserLevel];
                const glowMesh = new THREE.Mesh(this.laserGlowGeom, glowMat);
                boltGroup.add(glowMesh);

                this.scene.add(boltGroup);

                this.projectiles.push({
                    mesh: boltGroup,
                    velocity: forward.clone().multiplyScalar(cfg.speed),
                    damage: cfg.damage,
                    glowColor: cfg.glowColor,
                    life: 2.2,
                    isPlayer: true,
                    type: 'laser'
                });

                // Muzzle Flash at wingtip
                this.spawnMuzzleFlash(worldMuzzle, cfg.glowColor, cfg.lightColor);
            }

            this.sound.playLaser(this.laserLevel);
            physics.applyRecoil(this.laserLevel === 4 ? 220.0 : 130.0);
            return true;
        } else if (weaponId === 2) {
            // High-cadence Vulcan Chaingun
            if (currentTime - this.lastVulcanTime < this.vulcanCooldown) return false;
            if (this.vulcanAmmo <= 0) return false;

            this.vulcanAmmo--;
            this.lastVulcanTime = currentTime;

            const shipQuat = physics.quaternion;
            const shipPos = physics.position;
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipQuat);

            const spread = new THREE.Vector3(
                (Math.random() - 0.5) * 0.024,
                (Math.random() - 0.5) * 0.024,
                0
            ).applyQuaternion(shipQuat);

            // Alternating vulcan muzzle offset
            const vOffset = new THREE.Vector3(this.wingToggle ? 0.35 : -0.35, -0.22, -1.8).applyQuaternion(shipQuat);
            this.wingToggle = !this.wingToggle;

            const mesh = new THREE.Mesh(this.vulcanGeom, this.vulcanMat);
            mesh.position.copy(shipPos).add(vOffset);
            mesh.quaternion.copy(shipQuat);
            this.scene.add(mesh);

            this.projectiles.push({
                mesh,
                velocity: forward.add(spread).normalize().multiplyScalar(240.0),
                damage: 16,
                glowColor: 0xffcc44,
                life: 1.8,
                isPlayer: true,
                type: 'bullet'
            });

            this.sound.playVulcan();
            physics.applyRecoil(160.0);
            return true;
        }
        return false;
    }

    spawnMuzzleFlash(pos, colorHex, lightColor) {
        // Expanding bright diamond/star flash (HDR Bloom glow, zero PointLight shader stutter)
        const flashGeom = new THREE.OctahedronGeometry(0.35);
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: false,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });
        const flashMesh = new THREE.Mesh(flashGeom, flashMat);
        flashMesh.position.copy(pos);
        this.scene.add(flashMesh);

        this.particles.push({
            mesh: flashMesh,
            velocity: new THREE.Vector3(0, 0, 0),
            scaleRate: 14.0,
            life: 0.045,
            maxLife: 0.045,
            isFlash: true
        });
    }

    // --- 2. Wild Guided Corkscrew Missiles ---
    fireSecondary(physics, currentTime, targets = []) {
        if (currentTime - this.lastMissileTime < this.missileCooldown) return false;
        if (this.missileAmmo <= 0) return false;

        this.missileAmmo--;
        this.lastMissileTime = currentTime;

        const shipQuat = physics.quaternion;
        const shipPos = physics.position;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipQuat);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(shipQuat);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(shipQuat);

        // Ventral missile ejection bay offset
        const bayOffset = new THREE.Vector3(0, -0.45, -0.4).applyQuaternion(shipQuat);
        const spawnPos = shipPos.clone().add(bayOffset);

        // Build 3D Rocket Mesh
        const rocketGroup = new THREE.Group();
        rocketGroup.position.copy(spawnPos);
        rocketGroup.quaternion.copy(shipQuat);

        // Body tube
        const bodyMesh = new THREE.Mesh(this.missileBodyGeom, this.missileBodyMat);
        rocketGroup.add(bodyMesh);

        // Ogive nose cone
        const noseMesh = new THREE.Mesh(this.missileNoseGeom, this.missileNoseMat);
        noseMesh.position.set(0, 0, -1.0);
        rocketGroup.add(noseMesh);

        // 4 Cruciform stabilizer fins
        for (let i = 0; i < 4; i++) {
            const fin = new THREE.Mesh(this.missileFinGeom, this.missileBodyMat);
            fin.position.set(0, 0, 0.45);
            fin.rotation.z = (Math.PI / 4) + (i * Math.PI / 2);
            rocketGroup.add(fin);
        }

        // Exhaust nozzle bell
        const nozzle = new THREE.Mesh(this.missileNozzleGeom, this.missileBodyMat);
        nozzle.position.set(0, 0, 0.8);
        rocketGroup.add(nozzle);

        // Blazing rocket motor exhaust plume (HDR Bloom)
        const plume = new THREE.Mesh(this.missilePlumeGeom, this.missilePlumeMat);
        plume.position.set(0, 0, 1.5);
        rocketGroup.add(plume);

        this.scene.add(rocketGroup);

        // Find potential homing target within forward cone
        let bestTarget = null;
        let bestDist = 140.0;
        if (targets && targets.length > 0) {
            for (const t of targets) {
                if (!t.isAlive) continue;
                const toT = t.position.clone().sub(spawnPos);
                const dist = toT.length();
                if (dist < bestDist) {
                    const angle = forward.angleTo(toT.normalize());
                    if (angle < Math.PI / 3.0) { // 60-degree forward target acquisition cone
                        bestDist = dist;
                        bestTarget = t;
                    }
                }
            }
        }

        // Initial staged trajectory: slight downward drop, then explosive rocket ignition
        this.projectiles.push({
            mesh: rocketGroup,
            plume,
            basePos: spawnPos.clone(),
            forwardDir: forward.clone(),
            rightDir: right.clone(),
            upDir: up.clone(),
            speed: 32.0,            // Initial ejection speed
            targetSpeed: 105.0,     // Wild rocket cruise speed
            damage: 280,
            radius: 9.5,            // Blast radius
            life: 4.8,
            age: 0.0,
            isIgnited: false,
            target: bestTarget,
            // Wild corkscrew parameters
            spiralAngle: Math.random() * Math.PI * 2,
            spiralRate: 22.0 + Math.random() * 8.0, // rad/s
            spiralRadius: 0.95 + Math.random() * 0.4, // meters
            smokeTimer: 0.0,
            isPlayer: true,
            type: 'missile'
        });

        this.sound.playMissileLaunch();
        physics.applyRecoil(240.0);
        return true;
    }

    fireFlare(physics, currentTime) {
        if (currentTime - this.lastFlareTime < this.flareCooldown) return false;
        if (physics.energy < 1.0) return false;

        physics.energy = Math.max(0, physics.energy - 1.0);
        this.lastFlareTime = currentTime;

        const shipQuat = physics.quaternion;
        const shipPos = physics.position;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipQuat);

        const mesh = new THREE.Mesh(this.flareGeom, this.flareMat);
        mesh.position.copy(shipPos).addScaledVector(forward, 1.2);
        this.scene.add(mesh);

        this.flares.push({
            mesh,
            velocity: forward.multiplyScalar(45.0),
            life: 25.0
        });

        this.sound.playFlare();
        return true;
    }

    spawnDroneLaser(startPos, targetPos) {
        // Passive mode keeps drones non-hostile, but preserved for target simulator
        const dir = targetPos.clone().sub(startPos).normalize();
        const mesh = new THREE.Mesh(this.laserCoreGeom, this.laserCoreMat);
        mesh.position.copy(startPos);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
        this.scene.add(mesh);

        this.projectiles.push({
            mesh,
            velocity: dir.multiplyScalar(65.0),
            damage: 15,
            glowColor: 0x00f0ff,
            life: 3.0,
            isPlayer: false,
            type: 'drone_laser'
        });
    }

    // --- 3. High-Impact Detonation & Shockwave VFX ---
    spawnSparks(position, colorHex = 0xffaa22, count = 16, speedMultiplier = 1.0) {
        for (let i = 0; i < count; i++) {
            const geom = new THREE.BufferGeometry();
            const pos = new Float32Array([0, 0, 0]);
            geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));

            const mat = new THREE.PointsMaterial({
                color: colorHex,
                size: 0.35,
                transparent: true,
                opacity: 0.95,
                blending: THREE.AdditiveBlending
            });
            const p = new THREE.Points(geom, mat);
            p.position.copy(position);
            this.scene.add(p);

            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 26 * speedMultiplier,
                (Math.random() - 0.5) * 26 * speedMultiplier,
                (Math.random() - 0.5) * 26 * speedMultiplier
            );

            this.particles.push({
                mesh: p,
                velocity: vel,
                drag: 0.94,
                life: 0.35 + Math.random() * 0.35,
                maxLife: 0.7
            });
        }
    }

    spawnPlasmaSplash(position, normal, colorHex) {
        // Glowing radial splash decal ring facing impact normal
        const ring = new THREE.Mesh(this.shockwaveGeom, new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        ring.position.copy(position).addScaledVector(normal, 0.05);
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        ring.scale.set(0.4, 0.4, 0.4);
        this.scene.add(ring);

        this.rings.push({
            mesh: ring,
            expandRate: 12.0,
            life: 0.18,
            maxLife: 0.18
        });

        // Ricochet sparks
        this.spawnSparks(position, colorHex, 14, 1.2);
    }

    spawnExplosion(position, isBig = false, onShake = null) {
        this.sound.playExplosion(isBig);

        // 1. Expanding Core Fireball Sphere
        const ballGeom = new THREE.IcosahedronGeometry(isBig ? 1.4 : 0.8, 2);
        const ballMat = new THREE.MeshBasicMaterial({
            color: 0xffaa22,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });
        const fireball = new THREE.Mesh(ballGeom, ballMat);
        fireball.position.copy(position);
        this.scene.add(fireball);

        this.particles.push({
            mesh: fireball,
            scaleRate: isBig ? 32.0 : 16.0,
            fadeRate: isBig ? 3.2 : 5.0,
            velocity: new THREE.Vector3(0, 0, 0),
            life: isBig ? 0.35 : 0.2,
            maxLife: isBig ? 0.35 : 0.2,
            isFireball: true
        });

        // 2. Supersonic Shockwave Ring
        const wave = new THREE.Mesh(this.shockwaveGeom, this.shockwaveMat.clone());
        wave.position.copy(position);
        wave.rotation.x = Math.PI / 2;
        this.scene.add(wave);

        this.rings.push({
            mesh: wave,
            expandRate: isBig ? 36.0 : 20.0,
            life: isBig ? 0.38 : 0.22,
            maxLife: isBig ? 0.38 : 0.22
        });

        // 3. Dense Spray of Shrapnel Embers
        const count = isBig ? 42 : 20;
        this.spawnSparks(position, 0xff5511, count, isBig ? 1.5 : 1.0);
        this.spawnSparks(position, 0xffdd44, Math.floor(count / 2), isBig ? 1.8 : 1.2);

        // 4. Heavy billow of smoke motes
        for (let s = 0; s < (isBig ? 10 : 5); s++) {
            const smokeMat = new THREE.SpriteMaterial({
                map: this.smokeTex,
                transparent: true,
                opacity: 0.8,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                rotation: Math.random() * Math.PI * 2
            });
            const sm = new THREE.Sprite(smokeMat);
            sm.position.copy(position);
            sm.scale.set(1.4, 1.4, 1.0);
            this.scene.add(sm);

            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8
            );

            this.smokeMotes.push({
                mesh: sm,
                baseScale: 1.4,
                velocity: vel,
                scaleRate: 3.5,
                rotRate: (Math.random() - 0.5) * 1.5,
                life: 1.2 + Math.random() * 0.6,
                maxLife: 1.8
            });
        }

        if (onShake) onShake();
    }

    // --- 4. Frame Loop Update ---
    update(deltaTime, colliders, targets, playerPhysics, onScreenShake = null) {
        // Continuous Missile Replenishment (1 every 3 seconds)
        this.missileReloadTimer += deltaTime;
        if (this.missileReloadTimer >= 3.0) {
            this.missileReloadTimer = 0;
            if (this.missileAmmo < this.maxMissiles) {
                this.missileAmmo++;
            }
        }

        // 1. Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= deltaTime;
            p.age = (p.age || 0) + deltaTime;

            if (p.type === 'missile') {
                // Wild Corkscrew Guided Missile Physics
                if (p.age > 0.14 && !p.isIgnited) {
                    p.isIgnited = true;
                    if (p.plume) p.plume.scale.set(1.4, 1.4, 2.2);
                    if (p.light) p.light.intensity = 8.0;
                }

                // Accelerate rocket motor
                p.speed += (p.targetSpeed - p.speed) * (deltaTime * 3.8);

                // Smart Homing Guidance
                if (p.target && p.target.isAlive) {
                    const toTarget = p.target.position.clone().sub(p.basePos).normalize();
                    p.forwardDir.lerp(toTarget, deltaTime * 5.2).normalize();
                }

                // Update base line position
                p.basePos.addScaledVector(p.forwardDir, p.speed * deltaTime);

                // Calculate orthogonal right and up vectors relative to forward direction
                const worldUp = Math.abs(p.forwardDir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
                p.rightDir.crossVectors(p.forwardDir, worldUp).normalize();
                p.upDir.crossVectors(p.rightDir, p.forwardDir).normalize();

                // Advance corkscrew spiral
                p.spiralAngle += p.spiralRate * deltaTime;
                const cosA = Math.cos(p.spiralAngle) * p.spiralRadius;
                const sinA = Math.sin(p.spiralAngle) * p.spiralRadius;
                const spiralOffset = p.rightDir.clone().multiplyScalar(cosA).add(p.upDir.clone().multiplyScalar(sinA));

                // Position mesh on corkscrew spiral
                const prevPos = p.mesh.position.clone();
                p.mesh.position.copy(p.basePos).add(spiralOffset);

                // Orient missile along tangent direction of movement
                const tangentDir = p.mesh.position.clone().sub(prevPos);
                if (tangentDir.lengthSq() > 0.0001) {
                    p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), tangentDir.normalize());
                }

                // Emit Volumetric Corkscrew Smoke Trail Mote
                p.smokeTimer += deltaTime;
                if (p.smokeTimer > 0.024) {
                    p.smokeTimer = 0;
                    const moveDir = tangentDir.lengthSq() > 0.0001 ? tangentDir.normalize() : p.forwardDir;
                    const nozzlePos = p.mesh.position.clone().addScaledVector(moveDir, -1.2);

                    const sMat = new THREE.SpriteMaterial({
                        map: this.smokeTex,
                        transparent: true,
                        opacity: 0.85,
                        depthWrite: false,
                        blending: THREE.AdditiveBlending,
                        rotation: Math.random() * Math.PI * 2
                    });
                    const smokePuff = new THREE.Sprite(sMat);
                    smokePuff.position.copy(nozzlePos);
                    smokePuff.scale.set(0.65, 0.65, 1.0);
                    this.scene.add(smokePuff);

                    this.smokeMotes.push({
                        mesh: smokePuff,
                        baseScale: 0.65,
                        velocity: moveDir.clone().multiplyScalar(-0.15),
                        scaleRate: 2.8,
                        rotRate: (Math.random() - 0.5) * 2.0,
                        life: 1.35,
                        maxLife: 1.35
                    });
                }
            } else {
                // High-velocity straight laser / bullet flight
                p.mesh.position.addScaledVector(p.velocity, deltaTime);
            }

            let hit = false;
            let hitNormal = new THREE.Vector3(0, 1, 0);

            // Test target hits (Drones, Auxiliary Core, etc.)
            if (p.isPlayer) {
                for (let t = 0; t < targets.length; t++) {
                    const target = targets[t];
                    if (!target.isAlive) continue;

                    if (p.mesh.position.distanceTo(target.position) < (target.radius || 1.6)) {
                        target.takeDamage(p.damage);
                        hit = true;
                        hitNormal.subVectors(p.mesh.position, target.position).normalize();

                        if (p.type === 'missile') {
                            const dist = p.mesh.position.distanceTo(playerPhysics.position);
                            const shakeMag = Math.min(1.4, 45.0 / Math.max(6.0, dist));
                            this.spawnExplosion(p.mesh.position, true, () => {
                                if (onScreenShake) onScreenShake(shakeMag);
                            });
                        } else {
                            this.spawnPlasmaSplash(p.mesh.position, hitNormal, p.glowColor || 0x00f0ff);
                        }
                        break;
                    }
                }
            } else {
                // Drone laser hitting Player
                if (p.mesh.position.distanceTo(playerPhysics.position) < playerPhysics.radius) {
                    playerPhysics.takeDamage(p.damage);
                    this.sound.playShieldHit();
                    this.spawnSparks(p.mesh.position, 0x44aaff, 14);
                    hit = true;
                }
            }

            // Test wall collider hits
            if (!hit && colliders) {
                for (let c = 0; c < colliders.length; c++) {
                    const box = colliders[c];
                    if (box && box.containsPoint(p.mesh.position)) {
                        hit = true;
                        // Approximate normal from box center
                        const boxCenter = new THREE.Vector3();
                        box.getCenter(boxCenter);
                        hitNormal.subVectors(p.mesh.position, boxCenter).normalize();

                        if (p.type === 'missile') {
                            const dist = p.mesh.position.distanceTo(playerPhysics.position);
                            const shakeMag = Math.min(1.4, 45.0 / Math.max(6.0, dist));
                            this.spawnExplosion(p.mesh.position, true, () => {
                                if (onScreenShake) onScreenShake(shakeMag);
                            });
                        } else {
                            this.spawnPlasmaSplash(p.mesh.position, hitNormal, p.glowColor || 0x00f0ff);
                        }
                        break;
                    }
                }
            }

            if (hit || p.life <= 0) {
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
            }
        }

        // 2. Update Expanding Shockwave Rings
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const r = this.rings[i];
            r.life -= deltaTime;
            const progress = 1.0 - (r.life / r.maxLife);
            const scale = 1.0 + progress * r.expandRate;
            r.mesh.scale.set(scale, scale, 1.0);
            if (r.mesh.material) {
                r.mesh.material.opacity = (r.life / r.maxLife) * 0.9;
            }

            if (r.life <= 0) {
                this.scene.remove(r.mesh);
                this.rings.splice(i, 1);
            }
        }

        // 3. Update Volumetric Smoke Motes
        for (let i = this.smokeMotes.length - 1; i >= 0; i--) {
            const sm = this.smokeMotes[i];
            sm.life -= deltaTime;
            sm.mesh.position.addScaledVector(sm.velocity, deltaTime);

            if (sm.mesh.material) {
                if (sm.mesh.material.rotation !== undefined) {
                    sm.mesh.material.rotation += sm.rotRate * deltaTime;
                }
                sm.mesh.material.opacity = (sm.life / sm.maxLife) * 0.75;
            }

            const progress = 1.0 - (sm.life / sm.maxLife);
            const baseScale = sm.baseScale || 1.0;
            const currentScale = baseScale * (1.0 + progress * sm.scaleRate);
            sm.mesh.scale.set(currentScale, currentScale, 1.0);

            if (sm.life <= 0) {
                this.scene.remove(sm.mesh);
                if (sm.mesh.material) sm.mesh.material.dispose();
                this.smokeMotes.splice(i, 1);
            }
        }

        // 4. Update Sparks & Muzzle Flashes
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const part = this.particles[i];
            part.life -= deltaTime;

            if (part.isFireball) {
                const s = 1.0 + (1.0 - part.life / part.maxLife) * part.scaleRate;
                part.mesh.scale.set(s, s, s);
                part.mesh.material.opacity = Math.max(0, part.life / part.maxLife);
            } else if (part.isFlash) {
                const s = 1.0 + (1.0 - part.life / part.maxLife) * part.scaleRate;
                part.mesh.scale.set(s, s, s);
                part.mesh.material.opacity = Math.max(0, part.life / part.maxLife);
                if (part.light) {
                    part.light.intensity = (part.life / part.maxLife) * 4.0;
                }
            } else {
                if (part.drag) part.velocity.multiplyScalar(part.drag);
                part.mesh.position.addScaledVector(part.velocity, deltaTime);
            }

            if (part.life <= 0) {
                this.scene.remove(part.mesh);
                if (part.mesh.geometry) part.mesh.geometry.dispose();
                if (part.mesh.material) part.mesh.material.dispose();
                if (part.light) this.scene.remove(part.light);
                this.particles.splice(i, 1);
            }
        }

        // 5. Update Bouncing Flares
        for (let i = this.flares.length - 1; i >= 0; i--) {
            const fl = this.flares[i];
            fl.life -= deltaTime;
            fl.mesh.position.addScaledVector(fl.velocity, deltaTime);

            if (colliders) {
                for (let c = 0; c < colliders.length; c++) {
                    const box = colliders[c];
                    if (box && box.containsPoint(fl.mesh.position)) {
                        fl.velocity.multiplyScalar(-0.55);
                        break;
                    }
                }
            }

            if (fl.light && fl.life < 3.0) {
                fl.light.intensity = (fl.life / 3.0) * 2.5;
            }

            if (fl.life <= 0) {
                this.scene.remove(fl.mesh);
                this.flares.splice(i, 1);
            }
        }
    }
}
