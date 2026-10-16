import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { InputController } from './controls.js';
import { ShipPhysics } from './physics.js';
import { SoundSystem } from './audio.js';
import { WeaponManager } from './weapons.js';
import { LevelBuilder } from './level.js';
import { DroneManager } from './ai.js';
import { HUD } from './hud.js';
import { PyroGXModel } from './ship.js';
import { FlythroughController } from './flythrough.js';

export class DescentGame {
    constructor() {
        this.container = document.getElementById('game-container');

        // Three.js Core (Extended draw distance & atmospheric fog for Multi-Cavern Complex)
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0d1626, 350, 1050);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1200);
        this.scene.add(this.camera);

        // WebGL2 Renderer with High-Performance Tone Mapping (Zero shadow-pass draw call overhead for locked 60+ FPS)
        this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setClearColor(0x0c1424, 1.0);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.18;
        this.renderer.shadowMap.enabled = false;
        this.container.appendChild(this.renderer.domElement);

        // Hardware MSAA 4x HDR Post-Processing Pipeline
        const isWebGL2 = this.renderer.capabilities.isWebGL2;
        const renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                type: THREE.HalfFloatType,
                format: THREE.RGBAFormat,
                samples: isWebGL2 ? 4 : 0
            }
        );
        this.composer = new EffectComposer(this.renderer, renderTarget);

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Unreal Bloom Pass tuned so only true emissive neon elements & weapon bolts glow (no specular glare on hull)
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.58,  // bloom strength
            0.35,  // bloom radius
            0.88   // bloom threshold (only high emissive objects & weapon bolts glow)
        );
        this.composer.addPass(this.bloomPass);

        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);

        // Bloom state management
        this.bloomModes = [
            { name: 'GPU: WEBGL2 + HDR BLOOM (4x MSAA)', strength: 0.58, label: 'ACTIVE [0.58]' },
            { name: 'GPU: WEBGL2 + ULTRA BLOOM (4x MSAA)', strength: 1.05, label: 'ULTRA [1.05]' },
            { name: 'GPU: WEBGL2 (RAW / NO BLOOM)', strength: 0.00, label: 'OFF [RAW]' }
        ];
        this.currentBloomModeIdx = 0;
        this.baseBloomStrength = this.bloomModes[0].strength;
        this.bloomPulse = 0.0;

        // Subsystems
        this.sound = new SoundSystem();
        this.inputs = new InputController(this.renderer.domElement);
        this.physics = new ShipPhysics();
        this.weapons = new WeaponManager(this.scene, this.sound);
        this.level = new LevelBuilder(this.scene);
        this.drones = new DroneManager(this.scene, this.weapons, this.sound);
        this.hud = new HUD(this.container);

        // Pyro-GX Ship Model (visible in third-person tag-along view)
        this.playerShip = PyroGXModel.create();
        this.scene.add(this.playerShip);
        this._visualTiltEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        this._visualTiltQuat = new THREE.Quaternion();

        // High-Power Forward Nose Spotlight mounted at the nose tip (ahead of wings so zero wing glare!)
        const noseSpotlight = new THREE.SpotLight(0xf0f9ff, 11.0, 220, Math.PI / 3.2, 0.45, 0.85);
        noseSpotlight.position.set(0, -0.1, -2.5);
        noseSpotlight.target.position.set(0, -0.1, -25.0);
        this.playerShip.add(noseSpotlight);
        this.playerShip.add(noseSpotlight.target);

        // View Mode: 'tag_along' (third-person chase) or 'cockpit' (first-person)
        this.viewMode = 'tag_along';

        // Autopilot Cinematic Flythrough Tour
        this.flythrough = new FlythroughController(this);

        // Interactive 5-Module Flight Academy State
        this.academy = {
            currentStep: 0, // 0..4
            completed: [false, false, false, false, false],
            hasTestedSlide: false,
            steps: [
                {
                    title: '6DOF TRANSLATION & LAUNCH',
                    hint: 'Surge out of the tube [W/S] and test pure vertical [Space/C] & lateral [A/D] sliding'
                },
                {
                    title: 'THE SWING-AROUND (ORBIT-STRAFE)',
                    hint: 'Slide sideways [A/D] while turning your nose inward to orbit the Anchor or Pylons!'
                },
                {
                    title: '180° WHIP-TURN & RETRO-DRIFT',
                    hint: 'Fly forward at speed, then press [X] (or whip mouse 180°) to drift backward on inertia!'
                },
                {
                    title: 'BARREL ROLL & TRICHORDING',
                    hint: 'Double-tap [Q/E] for a 360° Snap Roll, or hold [W + A/D + Space] for Trichord Overdrive!'
                },
                {
                    title: 'MULTI-CAVERN SLALOM & SIDE TUNNELS',
                    hint: 'Explore West Crystal Grotto, East Turbine Vault & North Sanctum via the Side Tunnels!'
                }
            ]
        };

        // Game State (Peaceful familiarization flight)
        this.isMeltdown = false;
        this.meltdownTimer = 0;
        this.isEscaped = false;
        this.isDead = false;

        // Camera shake
        this.shakeIntensity = 0;

        // Timing
        this.clock = new THREE.Clock();

        this.init();
    }

    init() {
        // Build World & Calibration Buoys
        this.level.buildAll();
        this.drones.populateLevel();

        // Apply 16x Anisotropic Filtering across all textures on GPU
        const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
        this.level.applyAnisotropy(maxAnisotropy);

        // Spawn position in Calibration Flight Tube
        this.physics.position.set(0, 0, 2);

        // Window resize
        window.addEventListener('resize', () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
            this.composer.setSize(w, h);
            this.bloomPass.setSize(w, h);
            this.hud.resize();
        });

        // Click to start audio & controls
        const instructions = document.getElementById('instructions-overlay');
        const startMission = (e, autoTour = false) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            this.sound.init();
            if (instructions) instructions.style.display = 'none';

            if (autoTour) {
                this.viewMode = 'tag_along';
                this.flythrough.start();
            } else {
                this.flythrough.stop();
                try {
                    const req = this.renderer.domElement.requestPointerLock?.();
                    if (req && typeof req.catch === 'function') {
                        req.catch(err => console.warn('Pointer lock warning:', err));
                    }
                } catch (err) {
                    console.warn('Pointer lock request error:', err);
                }
            }
        };

        const flythroughBtn = document.getElementById('flythrough-btn');
        if (flythroughBtn) {
            flythroughBtn.addEventListener('click', (e) => startMission(e, true));
            flythroughBtn.addEventListener('pointerdown', (e) => startMission(e, true));
        }

        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => startMission(e, false));
            startBtn.addEventListener('pointerdown', (e) => startMission(e, false));
        }

        if (instructions) {
            instructions.addEventListener('click', (e) => {
                if (e.target === instructions) startMission(e, true);
            });
        }

        this.animate();
    }

    cycleBloomMode() {
        this.currentBloomModeIdx = (this.currentBloomModeIdx + 1) % this.bloomModes.length;
        const mode = this.bloomModes[this.currentBloomModeIdx];
        this.baseBloomStrength = mode.strength;
        this.bloomPass.strength = mode.strength;
        this.hud.triggerGateNotice(`HDR BLOOM: ${mode.label}`, false);
        this.sound.playWeaponSwitch?.();
    }

    triggerDetonationBloom(mag = 1.0) {
        if (this.baseBloomStrength > 0.01) {
            this.bloomPulse = Math.min(1.5, this.bloomPulse + mag * 0.75);
        }
    }

    completeAcademyStep(idx) {
        if (idx < 0 || idx >= this.academy.steps.length) return;
        if (!this.academy.completed[idx]) {
            this.academy.completed[idx] = true;
            this.sound.playGateChime?.(idx + 1);
            this.hud.triggerGateNotice(`★ ACADEMY MODULE ${idx + 1} MASTERED: ${this.academy.steps[idx].title} ★`, false);
        }
        // Advance to next uncompleted step if this was current
        if (this.academy.currentStep === idx) {
            const nextIdx = this.academy.completed.findIndex(c => !c);
            if (nextIdx !== -1) {
                this.academy.currentStep = nextIdx;
            } else {
                this.hud.triggerGateNotice('★ ALL 5 PYRO-GX FLIGHT ACADEMY MODULES MASTERED! ★', true);
                this.sound.playKeyPickup?.();
            }
        }
    }

    cycleAcademyModule() {
        this.academy.currentStep = (this.academy.currentStep + 1) % this.academy.steps.length;
        const st = this.academy.steps[this.academy.currentStep];
        this.hud.triggerGateNotice(`ACADEMY MODULE ${this.academy.currentStep + 1}: ${st.title}`, false);
        this.sound.playWeaponSwitch?.();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = Math.min(this.clock.getDelta(), 0.05);
        const currentTime = performance.now() * 0.001;

        try {
            if (!this.isEscaped && !this.isDead) {
                this.update(deltaTime, currentTime);
            }
            this.render();
        } catch (e) {
            console.error('Frame error:', e);
            if (!window.__frameErrLogged) {
                window.__frameErrLogged = true;
                const errDiv = document.createElement('div');
                errDiv.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;background:#990000;color:#fff;padding:20px;z-index:9999999;font-family:monospace;font-size:15px;white-space:pre-wrap;border:3px solid #ffcccc;';
                errDiv.innerHTML = `<strong>FRAME RENDER ERROR:</strong>\n${e.message}\n${e.stack || ''}`;
                document.body.appendChild(errDiv);
            }
        }
    }

    update(deltaTime, currentTime) {
        // 1. Process Inputs
        this.inputs.update(deltaTime);

        // Toggle View Mode with 'V'
        if (this.inputs.consumeViewToggle()) {
            this.viewMode = (this.viewMode === 'cockpit' ? 'tag_along' : 'cockpit');
            this.sound.playWeaponSwitch?.();
        }

        // Toggle Autopilot with 'P'
        if (this.inputs.consumeAutopilotToggle()) {
            if (this.flythrough.isActive) {
                this.flythrough.stop();
            } else {
                this.flythrough.start();
            }
        }

        // Cycle Laser Level with '1'
        if (this.inputs.consumeLaserCycle()) {
            const lvl = this.weapons.cycleLaserLevel();
            const cfg = this.weapons.laserConfigs[lvl];
            this.hud.triggerGateNotice(`PRIMARY: ${cfg.name} (MK ${lvl})`, false);
        }

        // Toggle GPU Bloom Mode with 'B'
        if (this.inputs.consumeBloomToggle()) {
            this.cycleBloomMode();
        }

        // Cycle Academy Module with 'T'
        if (this.inputs.consumeTutorialCycle()) {
            this.cycleAcademyModule();
        }

        // Signature Descent Trick Hotkeys: [X] 180° Whip-Turn, Double-tap [Q/E] Snap Barrel Roll, [L] Level Horizon
        if (this.inputs.consumeWhipTurn()) {
            if (this.flythrough.isActive) this.flythrough.stop();
            if (this.physics.triggerWhipTurn()) {
                this.sound.playManeuverThruster?.(true);
            }
        }

        const snapRollDir = this.inputs.consumeSnapRoll();
        if (snapRollDir !== 0) {
            if (this.flythrough.isActive) this.flythrough.stop();
            if (this.physics.triggerSnapRoll(snapRollDir)) {
                this.sound.playManeuverThruster?.(false);
            }
        }

        if (this.inputs.consumeLevelOut()) {
            const autoOn = this.physics.triggerLevelOut();
            this.hud.triggerTrickCallout(autoOn ? 'HORIZON AUTO-LEVEL: ENGAGED' : 'HORIZON LEVEL-OUT: MANUAL 6DOF', '#10b981');
            this.sound.playWeaponSwitch?.();
        }

        // Smooth bloom pulse decay after detonations
        if (this.bloomPulse > 0.001) {
            this.bloomPass.strength = this.baseBloomStrength + this.bloomPulse;
            this.bloomPulse = Math.max(0, this.bloomPulse - deltaTime * 4.2);
        } else {
            this.bloomPass.strength = this.baseBloomStrength;
        }

        // 2. Flythrough Autopilot or Manual 6DOF Physics
        if (this.flythrough.isActive) {
            const hasInput = (Math.abs(this.inputs.surge) > 0.1 || Math.abs(this.inputs.sway) > 0.1 || Math.abs(this.inputs.heave) > 0.1);
            if (hasInput) {
                this.flythrough.stop();
            } else {
                this.flythrough.update(deltaTime, currentTime);
            }
        } else {
            this.physics.update(this.inputs, this.level.colliders, deltaTime);
            if (this.physics.lastCollisionImpact > 3.5) {
                this.sound.playWallBounce?.(this.physics.lastCollisionImpact);
            }
        }

        // Check for newly detected 6DOF Tricks & Maneuver Callouts
        const trickEv = this.physics.consumeTrickEvent();
        if (trickEv) {
            const trickColors = {
                whip_turn: '#f59e0b',
                swing_around: '#00f0ff',
                barrel_roll: '#10b981',
                trichord: '#e879f9'
            };
            this.hud.triggerTrickCallout(trickEv.label, trickColors[trickEv.id] || '#fbbf24');

            // Progress Flight Academy based on performed trick
            if (trickEv.id === 'swing_around') this.completeAcademyStep(1);
            if (trickEv.id === 'whip_turn') this.completeAcademyStep(2);
            if (trickEv.id === 'barrel_roll' || trickEv.id === 'trichord') this.completeAcademyStep(3);
        }

        // Evaluate Step 1 (6DOF Translation & Launch into Arena)
        if (Math.abs(this.inputs.sway) > 0.2 || Math.abs(this.inputs.heave) > 0.2) {
            this.academy.hasTestedSlide = true;
        }
        if (!this.academy.completed[0] && this.physics.position.z < -38 && this.academy.hasTestedSlide) {
            this.completeAcademyStep(0);
        }

        // Combine shootable calibration targets: Buoys + Grate + Reactor Core
        const combatTargets = [...this.drones.drones];
        for (const item of this.level.interactables) {
            if (item.type === 'grate' && item.isAlive) combatTargets.push(item);
            if (item.type === 'reactor_core' && item.isAlive) combatTargets.push(item);
        }

        // 3. Firing Controls (Slick Lasers & Wild Missiles)
        if (this.inputs.isPrimaryFiring) {
            this.weapons.firePrimary(this.physics, this.inputs.weaponSelect, currentTime);
        }
        if (this.inputs.isSecondaryFiring) {
            this.weapons.fireSecondary(this.physics, currentTime, combatTargets);
        }
        if (this.inputs.consumeFlare()) {
            this.weapons.fireFlare(this.physics, currentTime);
        }

        // 4. Update Thruster Audio & Exhaust Plumes
        const speedRatio = this.physics.velocity.length() / this.physics.maxVelocity;
        const isThrusting = (this.inputs.surge !== 0 || this.inputs.sway !== 0 || this.inputs.heave !== 0 || this.flythrough.isActive);
        this.sound.updateThruster(speedRatio, isThrusting, this.inputs.isBoosting, this.physics.isTrichording);

        // Dynamic FOV warp on afterburner boost or Trichord Overdrive
        const isHighSpeed = this.inputs.isBoosting || this.physics.isTrichording || (this.flythrough.isActive && speedRatio > 0.65);
        const targetFOV = isHighSpeed ? 84 : 75;
        if (Math.abs(this.camera.fov - targetFOV) > 0.05) {
            this.camera.fov += (targetFOV - this.camera.fov) * (deltaTime * 8.0);
            this.camera.updateProjectionMatrix();
        }

        // Update Pyro-GX Ship Model Mesh with dynamic Swing-Around Visual Bank & Articulation
        if (this.playerShip) {
            this.playerShip.position.copy(this.physics.position);
            this.playerShip.quaternion.copy(this.physics.quaternion);

            // Subtle dynamic visual bank/pitch/yaw articulation in third-person chase view so the ship visibly carves into turns
            const targetBankZ = THREE.MathUtils.clamp(-this.inputs.sway * 0.24 + this.physics.angularVelocity.y * 0.14 - this.inputs.roll * 0.12, -0.38, 0.38);
            const targetPitchX = THREE.MathUtils.clamp(this.inputs.heave * 0.14 + this.physics.angularVelocity.x * 0.10, -0.24, 0.24);
            const targetYawY = THREE.MathUtils.clamp(this.physics.angularVelocity.y * 0.08, -0.18, 0.18);
            const tiltAlpha = 1.0 - Math.exp(-14.0 * deltaTime);

            this._visualTiltEuler.x += (targetPitchX - this._visualTiltEuler.x) * tiltAlpha;
            this._visualTiltEuler.y += (targetYawY - this._visualTiltEuler.y) * tiltAlpha;
            this._visualTiltEuler.z += (targetBankZ - this._visualTiltEuler.z) * tiltAlpha;
            this._visualTiltQuat.setFromEuler(this._visualTiltEuler);
            this.playerShip.quaternion.multiply(this._visualTiltQuat);

            this.playerShip.visible = (this.viewMode === 'tag_along');
            this.playerShip.userData.updateThrusters?.(speedRatio, isThrusting);
        }

        // 5. Update Level Interactivity, Dust & Rings
        this.level.update(deltaTime, this.physics, this.sound);

        // Continuous auto-recharge of shields & energy for stress-free flight familiarization
        if (this.physics.shield < 100) {
            this.physics.shield = Math.min(100, this.physics.shield + deltaTime * 25.0);
        }
        if (this.physics.energy < 100) {
            this.physics.energy = Math.min(100, this.physics.energy + deltaTime * 20.0);
        }

        // 6. Slalom Training Gates Detection
        this.level.checkSlalomGates(this.physics.position, (ring, clearedCount, totalCount) => {
            this.sound.playGateChime(clearedCount);
            const isAllCleared = (clearedCount === totalCount);
            this.hud.triggerGateNotice(
                isAllCleared ? '★ 6DOF SLALOM COURSE QUALIFIED! ALL GATES CLEARED ★' : `SLALOM GATE ${clearedCount}/${totalCount} CLEARED!`,
                isAllCleared
            );
            if (isAllCleared) {
                this.sound.playKeyPickup();
                this.completeAcademyStep(4);
            }
        });

        // 7. Optional Target Practice: Training Core Deactivation
        if (this.level.isReactorDestroyed && !this.isMeltdown) {
            this.isMeltdown = true;
            this.sound.playKeyPickup();
            this.hud.triggerGateNotice('★ CALIBRATION CORE TARGET DEACTIVATED ★', true);
            this.weapons.spawnExplosion(new THREE.Vector3(0, 12, -595), true);
            this.triggerDetonationBloom(1.3);
            this.completeAcademyStep(4);
        }

        // 8. Update Calibration Buoys
        this.drones.update(deltaTime, this.physics.position, currentTime);

        // 9. Update Weapons, Projectiles & Shockwave Screen Shake
        this.weapons.update(deltaTime, this.level.colliders, combatTargets, this.physics, (shakeMag) => {
            this.shakeIntensity = Math.min(1.2, this.shakeIntensity + shakeMag);
            this.triggerDetonationBloom(shakeMag);
        });

        // 10. Silky Camera Positioning: First-Person Cockpit vs Dynamic Tag-Along Chase View
        if (this.viewMode === 'tag_along') {
            // Subtle lateral/vertical swing offset during maneuvers so the player feels the swing-around G-force
            const swingX = THREE.MathUtils.clamp(-this.physics.angularVelocity.y * 0.38 - this.inputs.sway * 0.30, -1.1, 1.1);
            const swingY = 1.48 + THREE.MathUtils.clamp(-this.inputs.heave * 0.22, -0.35, 0.35);
            const chaseOffset = new THREE.Vector3(swingX, swingY, 4.65).applyQuaternion(this.physics.quaternion);
            const targetCamPos = this.physics.position.clone().add(chaseOffset);

            // Ultra-responsive frame-rate independent spring tracking
            const camLerp = 1.0 - Math.exp(-18.0 * deltaTime);
            this.camera.position.lerp(targetCamPos, camLerp);

            const forwardOffset = new THREE.Vector3(0, 0.35, -18.0).applyQuaternion(this.physics.quaternion);
            const lookTarget = this.physics.position.clone().add(forwardOffset);

            this.camera.up.set(0, 1, 0).applyQuaternion(this.physics.quaternion);
            this.camera.lookAt(lookTarget);
        } else {
            // Cockpit First-Person
            this.camera.position.copy(this.physics.position);
            this.camera.quaternion.copy(this.physics.quaternion);
        }

        // Screen shake
        if (this.shakeIntensity > 0) {
            const shake = new THREE.Vector3(
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity
            );
            this.camera.position.add(shake);
            this.shakeIntensity = Math.max(0, this.shakeIntensity - deltaTime * 0.5);
        }
    }

    computeSpatialWaypoints() {
        const waypoints = [];
        const invQuat = this.camera.quaternion.clone().invert();

        const projectPoint = (worldPos, label, color) => {
            const dist = this.physics.position.distanceTo(worldPos);
            const rel = worldPos.clone().sub(this.camera.position).applyQuaternion(invQuat);
            const inFront = rel.z < -0.2;

            const proj = worldPos.clone().project(this.camera);
            const sx = (proj.x * 0.5 + 0.5) * window.innerWidth;
            const sy = (-proj.y * 0.5 + 0.5) * window.innerHeight;

            waypoints.push({
                label,
                color,
                dist,
                inFront,
                x: sx,
                y: sy,
                dirX: rel.x,
                dirY: rel.y
            });
        };

        // 1. Next Uncleared Slalom Ring (guides through Hub -> West Grotto -> East Vault -> North Sanctum)
        const nextRing = this.level.slalomRings.find(r => !r.isCleared);
        if (nextRing) {
            projectPoint(nextRing.position, `SLALOM ${nextRing.label}`, '#00f0ff');
        }

        // 2. Central Orbit Anchor Beacon
        if (this.drones.orbitAnchor && this.drones.orbitAnchor.isAlive && this.physics.position.z < -30) {
            projectPoint(this.drones.orbitAnchor.position, 'ORBIT ANCHOR', '#fbbf24');
        }

        // 3. Side Cavern Tunnel Beacons when inside the Grand Hub
        if (this.physics.position.z < -40 && Math.abs(this.physics.position.x) < 220) {
            projectPoint(new THREE.Vector3(-170, 0, -150), 'WEST CRYSTAL GROTTO', '#e879f9');
            projectPoint(new THREE.Vector3(170, 18, -160), 'EAST TURBINE VAULT', '#34d399');
            projectPoint(new THREE.Vector3(0, 1, -440), 'NORTH REACTOR SANCTUM', '#fb7185');
        }

        return waypoints;
    }

    render() {
        this.composer.render();

        // Calculate Prograde Marker Screen Projection
        let progradeScreen = null;
        const velLen = this.physics.velocity.length();
        if (velLen > 1.5) {
            const localV = this.physics.velocity.clone().applyQuaternion(this.physics.quaternion.clone().invert()).normalize();
            if (localV.z < -0.1) {
                progradeScreen = {
                    x: localV.x,
                    y: localV.y
                };
            }
        }

        const currentAcademyStep = this.academy.steps[this.academy.currentStep];

        // Render Cockpit Flight Telemetry HUD
        this.hud.render({
            shield: this.physics.shield,
            energy: this.physics.energy,
            speed: velLen,
            elevation: this.physics.position.y,
            headingDeg: this.physics.headingDeg,
            pitchDeg: this.physics.pitchDeg,
            rollDeg: this.physics.rollDeg,
            driftAngleDeg: this.physics.driftAngleDeg,
            gForce: this.physics.gForce,
            isBichording: this.physics.isBichording,
            isTrichording: this.physics.isTrichording,
            autoLevel: this.physics.autoLevelEnabled,
            weaponId: this.inputs.weaponSelect,
            laserLevel: this.weapons.laserLevel,
            vulcanAmmo: this.weapons.vulcanAmmo,
            missileAmmo: this.weapons.missileAmmo,
            clearedGates: this.level.getClearedGatesCount(),
            totalGates: this.level.slalomRings.length,
            activeInputs: {
                surge: this.inputs.surge,
                sway: this.inputs.sway,
                heave: this.inputs.heave,
                roll: this.inputs.roll,
                boost: this.inputs.boost || this.inputs.isBoosting
            },
            progradeScreen,
            waypoints: this.computeSpatialWaypoints(),
            tutorialState: {
                stepIndex: this.academy.currentStep + 1,
                totalSteps: this.academy.steps.length,
                title: currentAcademyStep.title,
                hint: currentAcademyStep.hint,
                completedSteps: this.academy.completed
            },
            viewMode: this.viewMode,
            isFlythrough: this.flythrough.isActive,
            isBloomActive: this.baseBloomStrength > 0.01,
            bloomModeText: this.bloomModes[this.currentBloomModeIdx].name
        });
    }
}

// Bootstrap with state check and on-screen error banner
function launchGame() {
    try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
        if (!gl) {
            throw new Error('WebGL hardware acceleration is not supported or disabled in your browser settings. Please enable WebGL / Hardware Acceleration.');
        }

        window.__descentGame = new DescentGame();
        window.__descentGame.isReady = true;
        window.dispatchEvent(new CustomEvent('descent-ready'));

        if (typeof window.__pendingStart === 'function') {
            window.__pendingStart();
            window.__pendingStart = null;
        }
    } catch (e) {
        console.error('Failed to initialize DescentGame:', e);
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;color:#ff4444;background:rgba(0,0,0,0.95);padding:20px;z-index:99999;font-family:monospace;font-size:14px;border:2px solid #ff4444;border-radius:4px;';
        errDiv.innerHTML = `<strong>Game Initialization Error:</strong><pre style="margin-top:10px;white-space:pre-wrap;">${e.message}\n${e.stack || ''}</pre>`;
        document.body.appendChild(errDiv);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', launchGame);
} else {
    launchGame();
}
