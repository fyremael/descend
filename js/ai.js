import * as THREE from 'three';

// Non-Adversarial Aerospace Calibration Buoys & Swing-Around Orbit Anchors (Level 1 Flight Academy)
export class DroneManager {
    constructor(scene, weaponsManager, soundSystem) {
        this.scene = scene;
        this.weapons = weaponsManager;
        this.sound = soundSystem;

        this.drones = []; // Calibration Holo-Buoys
        this.orbitAnchor = null;

        this.coreGeom = new THREE.IcosahedronGeometry(1.3, 1);
        this.innerRingGeom = new THREE.TorusGeometry(2.0, 0.12, 8, 32);
        this.outerRingGeom = new THREE.TorusGeometry(2.7, 0.14, 8, 36);

        this.coreMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x0284c7,
            emissiveIntensity: 1.5,
            metalness: 0.7,
            roughness: 0.2
        });

        this.ringMatCyan = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.9
        });

        this.ringMatGold = new THREE.MeshBasicMaterial({
            color: 0xfbbf24,
            transparent: true,
            opacity: 0.95
        });
    }

    spawnCalibrationBuoy(label, position, isPrimaryAnchor = false) {
        const spawnPos = position.clone();
        const group = new THREE.Group();
        group.position.copy(position);

        const scale = isPrimaryAnchor ? 1.8 : 1.15;
        const cMat = this.coreMat.clone();
        if (isPrimaryAnchor) {
            cMat.color.setHex(0xfbbf24);
            cMat.emissive.setHex(0xd97706);
        }

        const core = new THREE.Mesh(this.coreGeom, cMat);
        core.scale.setScalar(scale);
        group.add(core);

        const ring1 = new THREE.Mesh(this.innerRingGeom, isPrimaryAnchor ? this.ringMatGold : this.ringMatCyan);
        ring1.scale.setScalar(scale);
        group.add(ring1);

        const ring2 = new THREE.Mesh(this.outerRingGeom, this.ringMatCyan);
        ring2.scale.setScalar(scale);
        ring2.rotation.x = Math.PI / 2;
        group.add(ring2);

        // Grand 22-meter Horizontal Holographic Orbit Guide Ring around Primary Anchor
        if (isPrimaryAnchor) {
            const trackGeom = new THREE.RingGeometry(21.0, 22.2, 72);
            trackGeom.rotateX(-Math.PI / 2);
            const orbitTrackMat = new THREE.MeshBasicMaterial({
                color: 0x00f0ff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.45,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const trackMesh = new THREE.Mesh(trackGeom, orbitTrackMat);
            group.add(trackMesh);
        }

        this.scene.add(group);

        const buoy = {
            type: isPrimaryAnchor ? 'orbit_beacon' : 'holo_buoy',
            label,
            group,
            ring1,
            ring2,
            spawnPos,
            position: group.position,
            velocity: new THREE.Vector3(0, 0, 0),
            radius: isPrimaryAnchor ? 4.2 : 2.6,
            hp: isPrimaryAnchor ? 300 : 90,
            maxHp: isPrimaryAnchor ? 300 : 90,
            isAlive: true,
            phaseOffset: Math.random() * Math.PI * 2,
            respawnTimer: 0,
            takeDamage: (dmg) => {
                if (!buoy.isAlive) return;
                buoy.hp -= dmg;
                cMat.emissiveIntensity = 3.5;
                setTimeout(() => { if (cMat) cMat.emissiveIntensity = 1.5; }, 90);

                if (buoy.hp <= 0) {
                    buoy.isAlive = false;
                    buoy.respawnTimer = 4.0;
                    this.weapons.spawnExplosion(buoy.position, isPrimaryAnchor);
                    this.scene.remove(buoy.group);
                }
            }
        };

        this.drones.push(buoy);
        if (isPrimaryAnchor) {
            this.orbitAnchor = buoy;
        }
        return buoy;
    }

    populateLevel() {
        // Non-Adversarial Holo-Calibration Buoys across the Grand Hub & Side Caverns
        this.spawnCalibrationBuoy('CAL-BUOY ALPHA (HUB)', new THREE.Vector3(38, 16, -125), false);
        this.spawnCalibrationBuoy('CAL-BUOY BETA (HUB)', new THREE.Vector3(-42, -6, -210), false);
        this.spawnCalibrationBuoy('CAL-BUOY GAMMA (GROTTO)', new THREE.Vector3(-320, 26, -265), false);
        this.spawnCalibrationBuoy('CAL-BUOY DELTA (VAULT)', new THREE.Vector3(320, 18, -240), false);
        this.spawnCalibrationBuoy('CAL-BUOY EPSILON (SANCTUM)', new THREE.Vector3(0, 22, -545), false);

        // Central Swing-Around Orbit Anchor Beacon in the center of the Colossal Grand Hub
        this.spawnCalibrationBuoy('ORBIT ANCHOR', new THREE.Vector3(0, 10, -240), true);
    }

    update(deltaTime, playerPos, currentTime) {
        for (let i = 0; i < this.drones.length; i++) {
            const b = this.drones[i];

            if (!b.isAlive) {
                b.respawnTimer -= deltaTime;
                if (b.respawnTimer <= 0) {
                    b.isAlive = true;
                    b.hp = b.maxHp;
                    b.position.copy(b.spawnPos);
                    this.scene.add(b.group);
                }
                continue;
            }

            b.position.y = b.spawnPos.y + Math.sin(currentTime * 1.4 + b.phaseOffset) * 0.85;
            if (b.ring1) b.ring1.rotation.y += deltaTime * 1.4;
            if (b.ring2) b.ring2.rotation.z -= deltaTime * 1.1;
        }
    }
}
