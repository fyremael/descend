import * as THREE from 'three';

// 6DOF Rigid Body Physics with Authentic Descent Trichording, Swing-Arounds, Whip-Turns, and Trick Telemetry
export class ShipPhysics {
    constructor() {
        // Spatial State
        this.position = new THREE.Vector3(0, 0, 0);
        this.quaternion = new THREE.Quaternion();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.angularVelocity = new THREE.Vector3(0, 0, 0); // Local pitch, yaw, roll rates

        // Mass and Bounds (Covers full wingspan so ship never clips into walls)
        this.radius = 2.4; // Ship bounding sphere radius
        this.mass = 1200.0;

        // Linear Dynamics Tuning (Slick High-Speed 6DOF Glide + Crisp Counter-Thrust)
        this.surgeAccel = 65.0;   // m/s^2 forward/back
        this.swayAccel = 56.0;    // m/s^2 strafe left/right
        this.heaveAccel = 56.0;   // m/s^2 vertical slide
        this.maxVelocity = 42.0;  // m/s single-axis cruise (scaled for colossal 280m arena)
        this.maxBoostVelocity = 62.0;
        this.linearDrag = 1.9;    // Silky zero-G momentum glide on swing-arounds

        // Angular Dynamics Tuning (Ultra-slick carving & snap stops)
        this.pitchAccel = 19.5;   // rad/s^2
        this.yawAccel = 19.5;     // rad/s^2
        this.rollAccel = 24.0;    // rad/s^2
        this.maxAngularVelocity = 6.2;
        this.angularDrag = 9.0;   // Razor-sharp stops when releasing mouse/keys

        // Collision & Shields
        this.restitution = 0.45;  // Elastic bumper bounce (no harsh punishment in training)
        this.shield = 100.0;
        this.maxShield = 100.0;
        this.energy = 100.0;
        this.maxEnergy = 100.0;

        // Flight Assist & Trick States
        this.autoLevelEnabled = false;
        this.levelingTimer = 0.0;

        // Active Automated Maneuvers (Whip-Turn & Snap Barrel Roll)
        this.whipTurnTimer = 0.0;
        this.whipTurnDuration = 0.38;
        this.snapRollTimer = 0.0;
        this.snapRollDuration = 0.44;
        this.snapRollDir = 1;

        // Live 6DOF Telemetry & Maneuver Detection
        this.isBichording = false;
        this.isTrichording = false;
        this.chordMultiplier = 1.0;
        this.driftAngleDeg = 0.0;
        this.headingDeg = 0.0;
        this.pitchDeg = 0.0;
        this.rollDeg = 0.0;
        this.gForce = 0.0;

        // Trick accumulators & cooldowns
        this._accumulatedRoll = 0.0;
        this._swingAroundTimer = 0.0;
        this._retroDriftTimer = 0.0;
        this._trichordTimer = 0.0;
        this._trickCooldowns = {};
        this._pendingTrickEvent = null;

        // Temporary math vectors
        this._localForce = new THREE.Vector3();
        this._worldForce = new THREE.Vector3();
        this._localTorque = new THREE.Vector3();
        this._rotDelta = new THREE.Quaternion();
        this._axis = new THREE.Vector3();
        this._prevVelocity = new THREE.Vector3();
        this._invQuat = new THREE.Quaternion();
        this._localVel = new THREE.Vector3();
    }

    triggerWhipTurn() {
        if (this.whipTurnTimer > 0) return false;
        this.whipTurnTimer = this.whipTurnDuration;
        // Preserve or kick forward momentum before flipping so the pilot feels the classic retro-slide
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
        if (this.velocity.length() < 18.0) {
            this.velocity.addScaledVector(forward, 20.0);
        }
        this._emitTrick('180° RETRO WHIP-TURN', 'whip_turn');
        return true;
    }

    triggerSnapRoll(dir = 1) {
        if (this.snapRollTimer > 0) return false;
        this.snapRollTimer = this.snapRollDuration;
        this.snapRollDir = dir >= 0 ? 1 : -1;
        // Crisp lateral evade kick
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
        this.velocity.addScaledVector(right, this.snapRollDir * 14.0);
        this._emitTrick('360° SNAP BARREL ROLL', 'barrel_roll');
        return true;
    }

    triggerLevelOut() {
        this.levelingTimer = 0.55;
        this.autoLevelEnabled = !this.autoLevelEnabled;
        return this.autoLevelEnabled;
    }

    _emitTrick(label, id) {
        const now = performance.now() * 0.001;
        if (this._trickCooldowns[id] && now - this._trickCooldowns[id] < 3.5) return;
        this._trickCooldowns[id] = now;
        this._pendingTrickEvent = { label, id, time: now };
    }

    consumeTrickEvent() {
        const ev = this._pendingTrickEvent;
        this._pendingTrickEvent = null;
        return ev;
    }

    applyRecoil(forceMagnitude) {
        const backDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
        this.velocity.addScaledVector(backDir, forceMagnitude / this.mass);
    }

    applyImpulse(worldImpulse) {
        this.velocity.addScaledVector(worldImpulse, 1.0 / this.mass);
    }

    update(input, colliders, deltaTime) {
        deltaTime = Math.min(deltaTime, 0.05);
        this._prevVelocity.copy(this.velocity);

        // 1. Detect Multi-Axis Chording (Authentic Descent Bichording & Trichording)
        const activeSurge = Math.abs(input.surge) > 0.15 ? 1 : 0;
        const activeSway = Math.abs(input.sway) > 0.15 ? 1 : 0;
        const activeHeave = Math.abs(input.heave) > 0.15 ? 1 : 0;
        const activeAxes = activeSurge + activeSway + activeHeave;

        this.isBichording = (activeAxes === 2);
        this.isTrichording = (activeAxes === 3);
        this.chordMultiplier = this.isTrichording ? 1.36 : (this.isBichording ? 1.18 : 1.0);

        // 2. Calculate Local Thruster Forces with Smart Counter-Thrust Braking Authority
        this._invQuat.copy(this.quaternion).invert();
        this._localVel.copy(this.velocity).applyQuaternion(this._invQuat);

        const targetForceX = input.sway * this.swayAccel;
        const targetForceY = input.heave * this.heaveAccel;
        const targetForceZ = -input.surge * this.surgeAccel; // Three.js -Z is forward

        // When thrusters fire opposite to current local velocity along an axis, boost authority by 1.75x for snappy direction reversals
        const counterX = (targetForceX * this._localVel.x < -0.5) ? 1.75 : 1.0;
        const counterY = (targetForceY * this._localVel.y < -0.5) ? 1.75 : 1.0;
        const counterZ = (targetForceZ * this._localVel.z < -0.5) ? 1.75 : 1.0;

        const boost = input.isBoosting ? 1.48 : 1.0;
        this._localForce.set(
            targetForceX * counterX,
            targetForceY * counterY,
            targetForceZ * counterZ
        ).multiplyScalar(boost);

        // Transform local thrust force into world coordinate space
        this._worldForce.copy(this._localForce).applyQuaternion(this.quaternion);

        // Apply Linear Acceleration
        this.velocity.addScaledVector(this._worldForce, deltaTime);

        // Apply Linear Drag (reduced during active whip-turn so ship glides effortlessly on inertia)
        const activeDrag = (this.whipTurnTimer > 0) ? this.linearDrag * 0.25 : this.linearDrag;
        const dragFactor = Math.max(0, 1.0 - activeDrag * deltaTime);
        this.velocity.multiplyScalar(dragFactor);

        // Clamp max velocity (allowing Trichord Overdrive!)
        const baseMaxV = input.isBoosting ? this.maxBoostVelocity : this.maxVelocity;
        const maxV = baseMaxV * this.chordMultiplier;
        if (this.velocity.lengthSq() > maxV * maxV) {
            this.velocity.setLength(maxV);
        }

        // Compute G-Force
        const accelVec = this.velocity.clone().sub(this._prevVelocity).divideScalar(Math.max(0.001, deltaTime));
        this.gForce = Math.min(9.9, accelVec.length() / 9.81);

        // 3. Rotational Dynamics & Trick Execution
        // Subtle bank-on-strafe/yaw coordination for authentic Descent swing-around feel
        const swingBankAssist = (Math.abs(input.sway) > 0.1 && Math.abs(input.yaw) > 0.05 && Math.abs(input.roll) < 0.05)
            ? (input.sway * 0.42)
            : 0;

        this._localTorque.set(
            input.pitch * this.pitchAccel,
            -input.yaw * this.yawAccel,
            -(input.roll + swingBankAssist) * this.rollAccel
        );

        this.angularVelocity.addScaledVector(this._localTorque, deltaTime);

        // Apply Angular Drag
        const angDragFactor = Math.max(0, 1.0 - this.angularDrag * deltaTime);
        this.angularVelocity.multiplyScalar(angDragFactor);

        // Clamp angular rates
        if (this.angularVelocity.lengthSq() > this.maxAngularVelocity * this.maxAngularVelocity) {
            this.angularVelocity.setLength(this.maxAngularVelocity);
        }

        // Smooth Cosine-Eased 180° Whip-Turn (integral of (PI/2)*sin(PI*u) du from 0..1 is exactly 1.0 * PI)
        if (this.whipTurnTimer > 0) {
            const prevT = 1.0 - (this.whipTurnTimer / this.whipTurnDuration);
            const stepDt = Math.min(deltaTime, this.whipTurnTimer);
            this.whipTurnTimer -= stepDt;
            const nextT = 1.0 - (this.whipTurnTimer / this.whipTurnDuration);
            const angleDelta = 0.5 * Math.PI * (Math.cos(Math.PI * prevT) - Math.cos(Math.PI * nextT));
            const whipQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angleDelta);
            this.quaternion.multiply(whipQuat);
            this.angularVelocity.set(0, 0, 0);
        }

        // Smooth Cosine-Eased 360° Snap Barrel Roll
        if (this.snapRollTimer > 0) {
            const prevT = 1.0 - (this.snapRollTimer / this.snapRollDuration);
            const stepDt = Math.min(deltaTime, this.snapRollTimer);
            this.snapRollTimer -= stepDt;
            const nextT = 1.0 - (this.snapRollTimer / this.snapRollDuration);
            const angleDelta = -this.snapRollDir * Math.PI * (Math.cos(Math.PI * prevT) - Math.cos(Math.PI * nextT));
            const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angleDelta);
            this.quaternion.multiply(rollQuat);
        }

        // Integrate standard Quaternion Orientation via Angular Velocity
        const angSpeed = this.angularVelocity.length();
        if (angSpeed > 0.0001) {
            this._axis.copy(this.angularVelocity).normalize();
            this._rotDelta.setFromAxisAngle(this._axis, angSpeed * deltaTime);
            this.quaternion.multiply(this._rotDelta);
        }

        // Horizon Level-Out Assist (when [L] pressed or auto-level enabled with no roll input)
        if (this.levelingTimer > 0 || (this.autoLevelEnabled && Math.abs(input.roll) < 0.05 && this.snapRollTimer <= 0)) {
            if (this.levelingTimer > 0) this.levelingTimer = Math.max(0, this.levelingTimer - deltaTime);
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion).normalize();
            if (Math.abs(forward.y) < 0.92) {
                const worldUp = new THREE.Vector3(0, 1, 0);
                const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
                const orthoUp = new THREE.Vector3().crossVectors(right, forward).normalize();
                const rotMat = new THREE.Matrix4().makeBasis(right, orthoUp, forward.clone().negate());
                const targetQuat = new THREE.Quaternion().setFromRotationMatrix(rotMat);
                const lerpSpeed = this.levelingTimer > 0 ? 7.5 : 2.2;
                this.quaternion.slerp(targetQuat, Math.min(1.0, deltaTime * lerpSpeed));
            }
        }

        this.quaternion.normalize();

        // 4. Compute Attitude & Drift Telemetry + Detect Manual Tricks
        this._updateTelemetryAndTricks(input, deltaTime);

        // 5. Position Integration & Continuous Collision Resolution (CCD Sub-Stepping)
        const displacement = this.velocity.clone().multiplyScalar(deltaTime);
        this.lastCollisionImpact = 0.0;
        this.resolveCollisions(displacement, colliders);
    }

    _updateTelemetryAndTricks(input, deltaTime) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);

        // Heading (0..360 deg where 0 = North/-Z, 90 = East/+X)
        const headingRad = Math.atan2(forward.x, -forward.z);
        this.headingDeg = ((THREE.MathUtils.radToDeg(headingRad) % 360) + 360) % 360;

        // Pitch (-90..+90 deg)
        this.pitchDeg = THREE.MathUtils.radToDeg(Math.asin( THREE.MathUtils.clamp(forward.y, -1, 1) ));

        // Roll (-180..+180 deg)
        this.rollDeg = THREE.MathUtils.radToDeg(Math.atan2(-right.y, up.y));

        // Drift Angle (angle between nose direction and velocity vector)
        const speed = this.velocity.length();
        if (speed > 3.0) {
            const velDir = this.velocity.clone().divideScalar(speed);
            const dot = THREE.MathUtils.clamp(forward.dot(velDir), -1.0, 1.0);
            this.driftAngleDeg = THREE.MathUtils.radToDeg(Math.acos(dot));
        } else {
            this.driftAngleDeg = 0.0;
        }

        // Detect Manual 360° Barrel Roll
        if (Math.abs(this.angularVelocity.z) > 0.6) {
            this._accumulatedRoll += Math.abs(this.angularVelocity.z) * deltaTime;
            if (this._accumulatedRoll >= Math.PI * 1.85) {
                this._accumulatedRoll = 0;
                this._emitTrick('360° BARREL ROLL', 'barrel_roll');
            }
        } else {
            this._accumulatedRoll = Math.max(0, this._accumulatedRoll - deltaTime * 1.5);
        }

        // Detect Swing-Around / Orbit-Strafe (Lateral slide + opposition yaw turning at speed)
        const isOrbiting = (Math.abs(input.sway) > 0.4 && Math.abs(this.angularVelocity.y) > 0.45 && speed > 11.0 && this.driftAngleDeg > 45.0);
        if (isOrbiting) {
            this._swingAroundTimer += deltaTime;
            if (this._swingAroundTimer > 0.75) {
                this._swingAroundTimer = 0;
                this._emitTrick('SWING-AROUND ORBIT', 'swing_around');
            }
        } else {
            this._swingAroundTimer = Math.max(0, this._swingAroundTimer - deltaTime * 0.8);
        }

        // Detect Retro-Drift (Flying backward at high speed while nose faces opposite)
        if (speed > 13.0 && this.driftAngleDeg > 130.0) {
            this._retroDriftTimer += deltaTime;
            if (this._retroDriftTimer > 0.65) {
                this._retroDriftTimer = 0;
                this._emitTrick('RETRO-DRIFT BACKSLIDE', 'whip_turn');
            }
        } else {
            this._retroDriftTimer = Math.max(0, this._retroDriftTimer - deltaTime);
        }

        // Detect Sustained Trichording Overdrive
        if (this.isTrichording && speed > 26.0) {
            this._trichordTimer += deltaTime;
            if (this._trichordTimer > 0.6) {
                this._trichordTimer = 0;
                this._emitTrick('TRICHORD OVERDRIVE (1.36x)', 'trichord');
            }
        } else {
            this._trichordTimer = Math.max(0, this._trichordTimer - deltaTime * 0.5);
        }
    }

    resolveCollisions(displacement, colliders) {
        const totalDist = displacement.length();
        // Sub-step every 0.85m so the ship can NEVER tunnel through any wall even at 90+ m/s Trichord Overdrive
        const steps = Math.max(1, Math.min(12, Math.ceil(totalDist / 0.85)));
        const stepDisp = displacement.clone().divideScalar(steps);

        const closestPoint = new THREE.Vector3();
        const normal = new THREE.Vector3();
        let anyCollided = false;

        for (let s = 0; s < steps; s++) {
            this.position.add(stepDisp);

            if (!colliders || colliders.length === 0) continue;

            for (let i = 0; i < colliders.length; i++) {
                const box = colliders[i];
                if (!box) continue;

                // Fast AABB reject with radius margin
                if (this.position.x + this.radius < box.min.x || this.position.x - this.radius > box.max.x ||
                    this.position.y + this.radius < box.min.y || this.position.y - this.radius > box.max.y ||
                    this.position.z + this.radius < box.min.z || this.position.z - this.radius > box.max.z) {
                    continue;
                }

                box.clampPoint(this.position, closestPoint);
                const distSq = this.position.distanceToSquared(closestPoint);

                if (distSq < this.radius * this.radius) {
                    anyCollided = true;
                    const dist = Math.sqrt(distSq);
                    let penetration = 0;

                    if (dist > 0.0001) {
                        // Ship center is outside the box but sphere intersects
                        normal.subVectors(this.position, closestPoint).divideScalar(dist);
                        penetration = this.radius - dist;
                    } else {
                        // Ship center is INSIDE the AABB: find nearest face to push out cleanly!
                        const dxMin = Math.abs(this.position.x - box.min.x);
                        const dxMax = Math.abs(box.max.x - this.position.x);
                        const dyMin = Math.abs(this.position.y - box.min.y);
                        const dyMax = Math.abs(box.max.y - this.position.y);
                        const dzMin = Math.abs(this.position.z - box.min.z);
                        const dzMax = Math.abs(box.max.z - this.position.z);

                        const minFaceDist = Math.min(dxMin, dxMax, dyMin, dyMax, dzMin, dzMax);
                        if (minFaceDist === dxMin) normal.set(-1, 0, 0);
                        else if (minFaceDist === dxMax) normal.set(1, 0, 0);
                        else if (minFaceDist === dyMin) normal.set(0, -1, 0);
                        else if (minFaceDist === dyMax) normal.set(0, 1, 0);
                        else if (minFaceDist === dzMin) normal.set(0, 0, -1);
                        else normal.set(0, 0, 1);

                        penetration = this.radius + minFaceDist;
                    }

                    // Push ship out of wall
                    this.position.addScaledVector(normal, penetration + 0.03);

                    // Reflect inward velocity component and cancel remaining inward step displacement
                    const velDot = this.velocity.dot(normal);
                    if (velDot < 0) {
                        const impactSpeed = -velDot;
                        if (impactSpeed > (this.lastCollisionImpact || 0)) {
                            this.lastCollisionImpact = impactSpeed;
                        }
                        const impulse = -(1.0 + this.restitution) * velDot;
                        this.velocity.addScaledVector(normal, impulse);
                    }

                    const stepDot = stepDisp.dot(normal);
                    if (stepDot < 0) {
                        stepDisp.addScaledVector(normal, -stepDot);
                    }
                }
            }
        }

        return anyCollided;
    }

    takeDamage(amount) {
        this.shield = Math.max(25, this.shield - amount); // Never fatal in Level 1 training
        return false;
    }

    recharge(energyAmount, shieldAmount) {
        this.energy = Math.min(this.maxEnergy, this.energy + energyAmount);
        this.shield = Math.min(this.maxShield, this.shield + shieldAmount);
    }
}
