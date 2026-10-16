import * as THREE from 'three';

// Studio-Grade 3D Procedural Mesh Model of the Iconic Pyro-GX 6DOF Gunship
export class PyroGXModel {
    static create() {
        const shipGroup = new THREE.Group();

        // High-End PBR Materials
        const hullDarkMat = new THREE.MeshStandardMaterial({
            color: 0x474f5d,
            roughness: 0.35,
            metalness: 0.75,
            flatShading: true
        });

        const hullLightMat = new THREE.MeshStandardMaterial({
            color: 0x8892a2,
            roughness: 0.3,
            metalness: 0.8,
            flatShading: true
        });

        const redTrimMat = new THREE.MeshStandardMaterial({
            color: 0xd92b1e, // Iconic Descent Crimson Trim
            roughness: 0.35,
            metalness: 0.45,
            emissive: 0x330502,
            flatShading: true
        });

        const metalDarkMat = new THREE.MeshStandardMaterial({
            color: 0x1a1c21,
            roughness: 0.4,
            metalness: 0.85
        });

        const canopyGlassMat = new THREE.MeshPhysicalMaterial ? new THREE.MeshPhysicalMaterial({
            color: 0x00d4ff,
            emissive: 0x002233,
            roughness: 0.08,
            metalness: 0.2,
            transmission: 0.6,
            transparent: true,
            opacity: 0.88,
            reflectivity: 0.9
        }) : new THREE.MeshStandardMaterial({
            color: 0x00d4ff,
            emissive: 0x002233,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.85
        });

        const cockpitInteriorMat = new THREE.MeshBasicMaterial({
            color: 0x0a141e
        });

        const cockpitConsoleGlowMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8
        });

        const engineIntakeMat = new THREE.MeshBasicMaterial({
            color: 0x08131d
        });

        const plumeOuterMat = new THREE.MeshBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const plumeCoreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // 1. Chiseled Aerodynamic Fuselage
        // Main upper hull wedge
        const upperFuselageGeom = new THREE.ConeGeometry(0.85, 3.4, 6);
        upperFuselageGeom.rotateX(-Math.PI / 2);
        upperFuselageGeom.scale(1.25, 0.45, 1.0);
        const upperFuselage = new THREE.Mesh(upperFuselageGeom, hullDarkMat);
        upperFuselage.position.set(0, 0.05, -0.1);
        shipGroup.add(upperFuselage);

        // Lower ventral armored belly plate
        const lowerBellyGeom = new THREE.ConeGeometry(0.75, 3.2, 5);
        lowerBellyGeom.rotateX(-Math.PI / 2);
        lowerBellyGeom.scale(1.15, 0.35, 1.0);
        const lowerBelly = new THREE.Mesh(lowerBellyGeom, hullLightMat);
        lowerBelly.position.set(0, -0.12, -0.05);
        shipGroup.add(lowerBelly);

        // Sharp needle nose cone
        const noseGeom = new THREE.ConeGeometry(0.35, 1.2, 4);
        noseGeom.rotateX(-Math.PI / 2);
        noseGeom.rotateZ(Math.PI / 4);
        const nose = new THREE.Mesh(noseGeom, redTrimMat);
        nose.position.set(0, 0.02, -1.9);
        shipGroup.add(nose);

        // 2. Cockpit Canopy & Interior Console
        // Interior tub
        const interiorGeom = new THREE.BoxGeometry(0.35, 0.25, 0.9);
        const interior = new THREE.Mesh(interiorGeom, cockpitInteriorMat);
        interior.position.set(0, 0.18, -0.3);
        shipGroup.add(interior);

        // Pilot HUD dashboard glow
        const consoleGeom = new THREE.BoxGeometry(0.25, 0.08, 0.15);
        const console = new THREE.Mesh(consoleGeom, cockpitConsoleGlowMat);
        console.position.set(0, 0.24, -0.6);
        console.rotation.x = -0.4;
        shipGroup.add(console);

        // Glass canopy bubble
        const canopyGeom = new THREE.ConeGeometry(0.42, 1.6, 5);
        canopyGeom.rotateX(-Math.PI / 2);
        canopyGeom.scale(0.95, 0.52, 1.0);
        const canopy = new THREE.Mesh(canopyGeom, canopyGlassMat);
        canopy.position.set(0, 0.28, -0.35);
        shipGroup.add(canopy);

        // Canopy reinforced titanium frame ribs
        const ribGeom = new THREE.TorusGeometry(0.24, 0.02, 4, 8, Math.PI);
        ribGeom.rotateY(Math.PI / 2);
        ribGeom.rotateZ(Math.PI);
        const canopyRib = new THREE.Mesh(ribGeom, metalDarkMat);
        canopyRib.position.set(0, 0.28, -0.35);
        shipGroup.add(canopyRib);

        // 3. Polyhedral Swept Wings (Left & Right)
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(2.6, 0.85);   // Wingtip forward
        wingShape.lineTo(2.45, 1.55);  // Wingtip aft
        wingShape.lineTo(0.6, 1.15);   // Inboard transition
        wingShape.lineTo(0, 0.7);      // Root trailing
        wingShape.closePath();

        const wingExtrudeSettings = { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 2 };
        const wingGeom = new THREE.ExtrudeGeometry(wingShape, wingExtrudeSettings);
        wingGeom.rotateX(Math.PI / 2);
        wingGeom.translate(0, 0, -0.7);

        // Right Wing
        const rightWing = new THREE.Mesh(wingGeom, hullLightMat);
        rightWing.position.set(0.42, 0.02, 0.1);
        rightWing.rotation.z = -0.05; // Slight anhedral drop
        shipGroup.add(rightWing);

        // Left Wing (Mirrored)
        const leftWing = new THREE.Mesh(wingGeom, hullLightMat);
        leftWing.scale.set(-1, 1, 1);
        leftWing.position.set(-0.42, 0.02, 0.1);
        leftWing.rotation.z = 0.05;
        shipGroup.add(leftWing);

        // Crimson Racing Stripe Slabs along Wings
        const stripeGeom = new THREE.BoxGeometry(1.8, 0.09, 0.38);
        const rStripe = new THREE.Mesh(stripeGeom, redTrimMat);
        rStripe.position.set(1.5, 0.06, 0.15);
        rStripe.rotation.y = -0.32;
        shipGroup.add(rStripe);

        const lStripe = new THREE.Mesh(stripeGeom, redTrimMat);
        lStripe.position.set(-1.5, 0.06, 0.15);
        lStripe.rotation.y = 0.32;
        shipGroup.add(lStripe);

        // Wing Leading-Edge Armor Slats
        const slatGeom = new THREE.BoxGeometry(1.9, 0.06, 0.12);
        const rSlat = new THREE.Mesh(slatGeom, hullDarkMat);
        rSlat.position.set(1.4, 0.04, -0.22);
        rSlat.rotation.y = -0.32;
        shipGroup.add(rSlat);

        const lSlat = new THREE.Mesh(slatGeom, hullDarkMat);
        lSlat.position.set(-1.4, 0.04, -0.22);
        lSlat.rotation.y = 0.32;
        shipGroup.add(lSlat);

        // 4. Heavy Wingtip Laser Cannon Pods
        const cannonHousingGeom = new THREE.BoxGeometry(0.24, 0.22, 1.4);
        const cannonBarrelGeom = new THREE.CylinderGeometry(0.05, 0.07, 1.8, 8);
        cannonBarrelGeom.rotateX(Math.PI / 2);

        const cannonMuzzleGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.32, 8);
        cannonMuzzleGeom.rotateX(Math.PI / 2);

        // Right Cannon Pod
        const rCannonGroup = new THREE.Group();
        rCannonGroup.position.set(2.55, 0.02, -0.2);

        const rHousing = new THREE.Mesh(cannonHousingGeom, hullDarkMat);
        rHousing.position.set(0, 0, 0.2);
        rCannonGroup.add(rHousing);

        const rBarrel = new THREE.Mesh(cannonBarrelGeom, metalDarkMat);
        rBarrel.position.set(0, 0, -0.5);
        rCannonGroup.add(rBarrel);

        const rMuzzle = new THREE.Mesh(cannonMuzzleGeom, redTrimMat);
        rMuzzle.position.set(0, 0, -1.35);
        rCannonGroup.add(rMuzzle);

        // Cooling fins
        for (let f = 0; f < 3; f++) {
            const finGeom = new THREE.BoxGeometry(0.18, 0.18, 0.04);
            const fin = new THREE.Mesh(finGeom, redTrimMat);
            fin.position.set(0, 0, -0.2 - f * 0.15);
            rCannonGroup.add(fin);
        }
        shipGroup.add(rCannonGroup);

        // Left Cannon Pod (Mirrored)
        const lCannonGroup = rCannonGroup.clone();
        lCannonGroup.position.set(-2.55, 0.02, -0.2);
        shipGroup.add(lCannonGroup);

        // 5. Heavy Dual Plasma Thruster Nacelles
        const nacelleGeom = new THREE.CylinderGeometry(0.32, 0.36, 1.2, 10);
        nacelleGeom.rotateX(Math.PI / 2);

        // Hollow dark titanium nozzle bells with open ends
        const nozzleGeom = new THREE.CylinderGeometry(0.35, 0.28, 0.5, 12, 1, true);
        nozzleGeom.rotateX(Math.PI / 2);
        const nozzleMat = new THREE.MeshStandardMaterial({
            color: 0x22262d,
            roughness: 0.35,
            metalness: 0.9,
            side: THREE.DoubleSide
        });

        const burnerDiscGeom = new THREE.CircleGeometry(0.24, 12);
        const burnerDiscMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });

        // Right Nacelle & Nozzle
        const rNacelle = new THREE.Mesh(nacelleGeom, metalDarkMat);
        rNacelle.position.set(0.55, 0.08, 1.15);
        shipGroup.add(rNacelle);

        const rNozzle = new THREE.Mesh(nozzleGeom, nozzleMat);
        rNozzle.position.set(0.55, 0.08, 1.85);
        shipGroup.add(rNozzle);

        const rBurner = new THREE.Mesh(burnerDiscGeom, burnerDiscMat);
        rBurner.position.set(0.55, 0.08, 1.62);
        shipGroup.add(rBurner);

        // Left Nacelle & Nozzle
        const lNacelle = new THREE.Mesh(nacelleGeom, metalDarkMat);
        lNacelle.position.set(-0.55, 0.08, 1.15);
        shipGroup.add(lNacelle);

        const lNozzle = new THREE.Mesh(nozzleGeom, nozzleMat);
        lNozzle.position.set(-0.55, 0.08, 1.85);
        shipGroup.add(lNozzle);

        const lBurner = new THREE.Mesh(burnerDiscGeom, burnerDiscMat);
        lBurner.position.set(-0.55, 0.08, 1.62);
        shipGroup.add(lBurner);

        // Turbine Intakes on front of nacelles
        const intakeGeom = new THREE.CircleGeometry(0.28, 8);
        const rIntake = new THREE.Mesh(intakeGeom, engineIntakeMat);
        rIntake.position.set(0.55, 0.08, 0.54);
        shipGroup.add(rIntake);

        const lIntake = new THREE.Mesh(intakeGeom, engineIntakeMat);
        lIntake.position.set(-0.55, 0.08, 0.54);
        shipGroup.add(lIntake);

        // 6. Volumetric Multi-Stage Plasma Exhaust Plumes
        const plumeGeomOuter = new THREE.ConeGeometry(0.24, 0.9, 10);
        plumeGeomOuter.rotateX(-Math.PI / 2);

        const plumeGeomCore = new THREE.ConeGeometry(0.13, 0.65, 10);
        plumeGeomCore.rotateX(-Math.PI / 2);

        // Right Plume Group
        const rPlumeGroup = new THREE.Group();
        rPlumeGroup.position.set(0.55, 0.08, 1.95);

        const rPlumeOuter = new THREE.Mesh(plumeGeomOuter, plumeOuterMat);
        rPlumeOuter.position.set(0, 0, 0.45);
        rPlumeGroup.add(rPlumeOuter);

        const rPlumeCore = new THREE.Mesh(plumeGeomCore, plumeCoreMat);
        rPlumeCore.position.set(0, 0, 0.32);
        rPlumeGroup.add(rPlumeCore);

        shipGroup.add(rPlumeGroup);

        // Left Plume Group
        const lPlumeGroup = new THREE.Group();
        lPlumeGroup.position.set(-0.55, 0.08, 1.95);

        const lPlumeOuter = new THREE.Mesh(plumeGeomOuter, plumeOuterMat);
        lPlumeOuter.position.set(0, 0, 0.45);
        lPlumeGroup.add(lPlumeOuter);

        const lPlumeCore = new THREE.Mesh(plumeGeomCore, plumeCoreMat);
        lPlumeCore.position.set(0, 0, 0.32);
        lPlumeGroup.add(lPlumeCore);

        shipGroup.add(lPlumeGroup);

        // Dynamic Thruster Point Light illuminating nearby geometry behind the ship
        const engineLight = new THREE.PointLight(0x00d4ff, 1.8, 12);
        engineLight.position.set(0, 0.08, 2.3);
        shipGroup.add(engineLight);

        // 7. Dynamic Animation Controller
        shipGroup.userData = {
            rPlumeGroup,
            lPlumeGroup,
            engineLight,
            updateThrusters: (speedRatio, isThrusting) => {
                const clampedRatio = Math.min(1.2, speedRatio);
                const flicker = 0.94 + Math.random() * 0.14;
                const scaleZ = isThrusting ? (0.75 + clampedRatio * 0.55) * flicker : (0.25 + clampedRatio * 0.2);
                const scaleXY = isThrusting ? (0.85 + clampedRatio * 0.2) : 0.45;

                rPlumeGroup.scale.set(scaleXY, scaleXY, scaleZ);
                lPlumeGroup.scale.set(scaleXY, scaleXY, scaleZ);

                plumeOuterMat.opacity = isThrusting ? 0.55 : 0.18;
                plumeCoreMat.opacity = isThrusting ? 0.78 : 0.25;

                engineLight.intensity = isThrusting ? (1.8 + clampedRatio * 1.6) * flicker : 0.4;
            }
        };

        // Enable real-time GPU shadow casting on all solid ship geometry
        shipGroup.traverse((node) => {
            if (node.isMesh && node.material !== plumeOuterMat && node.material !== plumeCoreMat) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        return shipGroup;
    }
}
