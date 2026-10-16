import * as THREE from 'three';

// Automated Cinematic 6DOF Flythrough Controller touring the Colossal Hub, Side Tunnels & All 3 Caverns
export class FlythroughController {
    constructor(game) {
        this.game = game;
        this.isActive = false;
        this.progress = 0.0;
        this.duration = 48.0;

        this.waypoints = [
            // 1. Calibration Flight Tube Launch
            { pos: new THREE.Vector3(0, 0, 4), roll: 0, time: 0.0, callout: 'DEMO: RUNWAY LAUNCH & SURGE' },
            { pos: new THREE.Vector3(0, 0, -22), roll: 0, time: 0.05 },
            { pos: new THREE.Vector3(0, 1, -46), roll: 0, time: 0.09 },

            // 2. Burst into Colossal 340m x 140m x 400m Grand Hub & Gate 1
            { pos: new THREE.Vector3(0, 10, -85), roll: 0.15, time: 0.15, callout: 'DEMO: COLOSSAL GRAND HUB ARENA (GATE 1)' },

            // 3. Align & Fly Straight Through West Tunnel W1 (Y=0, Z=-150, X: -170..-250)
            { pos: new THREE.Vector3(-125, 0, -150), roll: 0.45, time: 0.22, action: 'fire_laser', callout: 'DEMO: ENTERING WEST SIDE TUNNEL (GATE 2)' },
            { pos: new THREE.Vector3(-210, 0, -150), roll: 0.1, time: 0.27 },
            { pos: new THREE.Vector3(-275, 4, -155), roll: -0.25, time: 0.31 },

            // 4. Carve through Bioluminescent West Crystal Grotto (Gate 3) & Exit Straight Through Tunnel W2 (Y=20, Z=-330)
            { pos: new THREE.Vector3(-320, 12, -210), roll: -0.45, time: 0.36, callout: 'DEMO: WEST CRYSTAL GROTTO CAVERN (GATE 3)' },
            { pos: new THREE.Vector3(-315, 20, -285), roll: -0.35, time: 0.41, action: 'fire_drone' },
            { pos: new THREE.Vector3(-275, 20, -330), roll: 0, time: 0.45 },
            { pos: new THREE.Vector3(-210, 20, -330), roll: 0, time: 0.49, callout: 'DEMO: EXITING NORTHWEST TUNNEL' },
            { pos: new THREE.Vector3(-140, 19, -325), roll: 0.2, time: 0.53 },

            // 5. Cross Central Grand Hub (Gate 4) & Align With East Tunnel E1 (Y=18, Z=-160, X: 170..250)
            { pos: new THREE.Vector3(0, 16, -280), roll: Math.PI * 2, time: 0.59, action: 'barrel_roll', callout: 'DEMO: 360° BARREL ROLL ACROSS GRAND HUB (GATE 4)' },
            { pos: new THREE.Vector3(135, 18, -162), roll: -0.35, time: 0.65 },
            { pos: new THREE.Vector3(210, 18, -160), roll: 0, time: 0.69, callout: 'DEMO: ENTERING EAST TURBINE TUNNEL' },
            { pos: new THREE.Vector3(275, 14, -168), roll: 0.3, time: 0.73 },

            // 6. Dive through East Hydro-Cooling Turbine Vault (Gate 5) & Exit Straight Through Low Tunnel E2 (Y=-12, Z=-320)
            { pos: new THREE.Vector3(320, 4, -240), roll: 0.45, time: 0.78, action: 'fire_laser', callout: 'DEMO: EAST HYDRO-TURBINE VAULT (GATE 5)' },
            { pos: new THREE.Vector3(275, -12, -318), roll: 0.15, time: 0.82 },
            { pos: new THREE.Vector3(210, -12, -320), roll: 0, time: 0.86 },
            { pos: new THREE.Vector3(135, -4, -335), roll: -0.2, time: 0.89 },

            // 7. Thread Gate 6 & Fly Straight Through North Tunnel N2 (X=50, Y=1, Z: -440..-510) into Reactor Sanctum
            { pos: new THREE.Vector3(0, 10, -415), roll: 0, time: 0.93, callout: 'DEMO: NORTH SANCTUM GATE (GATE 6)' },
            { pos: new THREE.Vector3(50, 1, -445), roll: -0.15, time: 0.96 },
            { pos: new THREE.Vector3(50, 1, -505), roll: 0, time: 0.98 },
            { pos: new THREE.Vector3(0, 14, -555), roll: 0.3, time: 1.0, action: 'attack_reactor', callout: 'DEMO: DEEP NORTH REACTOR SANCTUM' }
        ];

        const points = this.waypoints.map(w => w.pos);
        this.spline = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.22);

        this.actionsTriggered = new Set();
        this.calloutsTriggered = new Set();
    }

    start() {
        this.isActive = true;
        this.progress = 0.0;
        this.actionsTriggered.clear();
        this.calloutsTriggered.clear();
        this.game.viewMode = 'tag_along';
    }

    stop() {
        this.isActive = false;
    }

    update(deltaTime, currentTime) {
        if (!this.isActive) return;

        this.progress += (deltaTime / this.duration);
        if (this.progress >= 1.0) {
            this.progress = 0.0;
            this.actionsTriggered.clear();
            this.calloutsTriggered.clear();
        }

        const t = Math.max(0, Math.min(1.0, this.progress));

        const pos = this.spline.getPoint(t);
        const tangent = this.spline.getTangent(t).normalize();
        this.game.physics.position.copy(pos);

        let wpA = this.waypoints[0];
        let wpB = this.waypoints[this.waypoints.length - 1];
        for (let i = 0; i < this.waypoints.length - 1; i++) {
            if (t >= this.waypoints[i].time && t <= this.waypoints[i + 1].time) {
                wpA = this.waypoints[i];
                wpB = this.waypoints[i + 1];
                break;
            }
        }

        const segFactor = (wpB.time > wpA.time) ? (t - wpA.time) / (wpB.time - wpA.time) : 0;
        const currentRoll = THREE.MathUtils.lerp(wpA.roll, wpB.roll, segFactor);

        const lookQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), tangent);
        const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), currentRoll);
        lookQuat.multiply(rollQuat);
        this.game.physics.quaternion.slerp(lookQuat, 0.24);

        const speed = 44.0;
        this.game.physics.velocity.copy(tangent).multiplyScalar(speed);
        this.game.physics._updateTelemetryAndTricks(this.game.inputs, deltaTime);

        for (let i = 0; i < this.waypoints.length; i++) {
            const wp = this.waypoints[i];
            if (wp.action && !this.actionsTriggered.has(i) && Math.abs(t - wp.time) < 0.03) {
                this.actionsTriggered.add(i);
                this.executeAction(wp.action, currentTime);
            }
            if (wp.callout && !this.calloutsTriggered.has(i) && Math.abs(t - wp.time) < 0.025) {
                this.calloutsTriggered.add(i);
                this.game.hud.triggerTrickCallout(wp.callout, '#38bdf8');
            }
        }
    }

    executeAction(action, currentTime) {
        if (action === 'fire_laser' || action === 'fire_drone') {
            this.game.weapons.firePrimary(this.game.physics, 1, currentTime);
            setTimeout(() => this.game.weapons.firePrimary(this.game.physics, 1, currentTime + 0.15), 150);
        } else if (action === 'barrel_roll') {
            this.game.sound.playLaser(1);
        } else if (action === 'attack_reactor') {
            this.game.weapons.firePrimary(this.game.physics, 1, currentTime);
            this.game.weapons.fireSecondary(this.game.physics, currentTime, this.game.drones.drones);
        }
    }
}
