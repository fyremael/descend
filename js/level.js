import * as THREE from 'three';
import { TextureGenerator } from './textures.js';

// Level Builder: Interconnected 6DOF Subterranean Complex
// Features: Calibration Tube -> Colossal Grand Hub Arena (340m x 140m x 400m) +
// West Crystal Grotto + East Hydro-Turbine Vault + Deep North Reactor Sanctum + South Bypass Loop Tunnel
export class LevelBuilder {
    constructor(scene) {
        this.scene = scene;
        this.colliders = []; // Bounding boxes for physics collisions
        this.interactables = []; // Energy Centers, Reactor Core, Destructible Grates

        // 1. Procedural Diffuse Textures
        this.hullTex = new THREE.CanvasTexture(TextureGenerator.createHullPlate());
        this.hullTex.wrapS = THREE.RepeatWrapping;
        this.hullTex.wrapT = THREE.RepeatWrapping;

        this.hazardTex = new THREE.CanvasTexture(TextureGenerator.createHazardStripes());
        this.hazardTex.wrapS = THREE.RepeatWrapping;
        this.hazardTex.wrapT = THREE.RepeatWrapping;

        this.rockTex = new THREE.CanvasTexture(TextureGenerator.createRockBasalt());
        this.rockTex.wrapS = THREE.RepeatWrapping;
        this.rockTex.wrapT = THREE.RepeatWrapping;

        this.energyTex = new THREE.CanvasTexture(TextureGenerator.createEnergyGrid());

        // 2. Tangent-Space Normal Maps
        this.hullNorm = new THREE.CanvasTexture(TextureGenerator.generateNormalMap(this.hullTex.image, 2.4));
        this.hullNorm.wrapS = THREE.RepeatWrapping;
        this.hullNorm.wrapT = THREE.RepeatWrapping;

        this.hazardNorm = new THREE.CanvasTexture(TextureGenerator.generateNormalMap(this.hazardTex.image, 2.2));
        this.hazardNorm.wrapS = THREE.RepeatWrapping;
        this.hazardNorm.wrapT = THREE.RepeatWrapping;

        this.rockNorm = new THREE.CanvasTexture(TextureGenerator.generateNormalMap(this.rockTex.image, 2.8));
        this.rockNorm.wrapS = THREE.RepeatWrapping;
        this.rockNorm.wrapT = THREE.RepeatWrapping;

        // 3. High-Visibility PBR Surface Materials
        this.hullMat = new THREE.MeshStandardMaterial({
            map: this.hullTex,
            normalMap: this.hullNorm,
            normalScale: new THREE.Vector2(1.1, 1.1),
            color: 0xdbeafe,
            roughness: 0.42,
            metalness: 0.55
        });

        this.arenaWallMat = new THREE.MeshStandardMaterial({
            map: this.hullTex,
            normalMap: this.hullNorm,
            normalScale: new THREE.Vector2(1.0, 1.0),
            color: 0xbac8dc,
            roughness: 0.48,
            metalness: 0.45
        });

        this.hazardMat = new THREE.MeshStandardMaterial({
            map: this.hazardTex,
            normalMap: this.hazardNorm,
            normalScale: new THREE.Vector2(1.2, 1.2),
            color: 0xffffff,
            roughness: 0.38,
            metalness: 0.45
        });

        this.rockMat = new THREE.MeshStandardMaterial({
            map: this.rockTex,
            normalMap: this.rockNorm,
            normalScale: new THREE.Vector2(1.1, 1.1),
            roughness: 0.68,
            metalness: 0.22,
            color: 0xcbd5e1
        });

        this.grottoRockMat = new THREE.MeshStandardMaterial({
            map: this.rockTex,
            normalMap: this.rockNorm,
            normalScale: new THREE.Vector2(1.2, 1.2),
            roughness: 0.62,
            metalness: 0.28,
            color: 0xd8b4fe
        });

        this.sanctumRockMat = new THREE.MeshStandardMaterial({
            map: this.rockTex,
            normalMap: this.rockNorm,
            normalScale: new THREE.Vector2(1.2, 1.2),
            roughness: 0.65,
            metalness: 0.25,
            color: 0xfed7aa
        });

        this.energyMat = new THREE.MeshBasicMaterial({
            map: this.energyTex,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        this.archMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.35,
            metalness: 0.75
        });

        // Glowing Architectural Light Strip Materials
        this.lightStripMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
        this.warmStripMat = new THREE.MeshBasicMaterial({ color: 0xfcd34d });
        this.emeraldStripMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
        this.violetStripMat = new THREE.MeshBasicMaterial({ color: 0xe879f9 });
        this.crimsonStripMat = new THREE.MeshBasicMaterial({ color: 0xfb7185 });

        this.pipeMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.3,
            metalness: 0.8
        });

        // State trackers
        this.hasBlueKey = true;
        this.hasYellowKey = true;
        this.hasRedKey = false;
        this.isReactorDestroyed = false;

        // Dynamic meshes
        this.reactorMesh = null;
        this.reactorGyroRings = [];
        this.turbineRotors = [];
        this.floatingCrystals = [];
        this.slalomRings = [];
        this.spaceDust = null;
    }

    buildAll() {
        this.buildCalibrationTube();      // 1. Entry Launch Runway (Z: +15 to -40)
        this.buildGrandHubArena();        // 2. Colossal 340m x 140m x 400m Central Hub Arena (Z: -40 to -440)
        this.buildWestCrystalGrotto();    // 3. West Twin Tunnels & Bioluminescent Crystal Grotto (X: -170 to -390)
        this.buildEastTurbineVault();     // 4. East Twin Tunnels & Hydro-Cooling Turbine Vault (X: +170 to +390)
        this.buildNorthReactorSanctum();  // 5. North Twin Tunnels & Deep Magma Reactor Sanctum (Z: -440 to -680)
        this.buildSouthBypassLoop();      // 6. High-Altitude South Overlook Bypass Tunnel (Y: +36, Z: -130 to -40)
        this.buildSlalomCourse();         // 7. 6-Gate Multi-Cavern 6DOF Slalom Course
        this.createSpaceDust();           // 8. 4,800-Particle 3D Velocity & Drift Reference Field
        this.setupLighting();             // 9. Multi-Cavern Low-Decay Stadium & Tunnel Lighting
    }

    cloneTiledMaterial(material, uvRepeat = [2, 2]) {
        const mat = material.clone();
        if (mat.map) {
            mat.map = mat.map.clone();
            mat.map.repeat.set(uvRepeat[0], uvRepeat[1]);
            mat.map.needsUpdate = true;
        }
        if (mat.normalMap) {
            mat.normalMap = mat.normalMap.clone();
            mat.normalMap.repeat.set(uvRepeat[0], uvRepeat[1]);
            mat.normalMap.needsUpdate = true;
        }
        mat.side = THREE.DoubleSide;
        return mat;
    }

    // Helper: Build a wall panel along the X-axis (constant Z) with rectangular portal cutouts
    // portals: array of { xMin, xMax, yMin, yMax }
    buildZWallWithPortals(z, xMin, xMax, yMin, yMax, portals, material, uvScale = 0.05) {
        let rects = [{ xMin, xMax, yMin, yMax }];
        for (const p of portals) {
            const nextRects = [];
            for (const r of rects) {
                if (p.xMax <= r.xMin || p.xMin >= r.xMax || p.yMax <= r.yMin || p.yMin >= r.yMax) {
                    nextRects.push(r);
                    continue;
                }
                if (p.xMin > r.xMin) {
                    nextRects.push({ xMin: r.xMin, xMax: p.xMin, yMin: r.yMin, yMax: r.yMax });
                }
                if (p.xMax < r.xMax) {
                    nextRects.push({ xMin: p.xMax, xMax: r.xMax, yMin: r.yMin, yMax: r.yMax });
                }
                const overlapXMin = Math.max(r.xMin, p.xMin);
                const overlapXMax = Math.min(r.xMax, p.xMax);
                if (p.yMin > r.yMin) {
                    nextRects.push({ xMin: overlapXMin, xMax: overlapXMax, yMin: r.yMin, yMax: p.yMin });
                }
                if (p.yMax < r.yMax) {
                    nextRects.push({ xMin: overlapXMin, xMax: overlapXMax, yMin: p.yMax, yMax: r.yMax });
                }
            }
            rects = nextRects;
        }

        const t = 4.0;
        for (const r of rects) {
            const w = r.xMax - r.xMin;
            const h = r.yMax - r.yMin;
            if (w <= 0.05 || h <= 0.05) continue;
            const cx = (r.xMin + r.xMax) * 0.5;
            const cy = (r.yMin + r.yMax) * 0.5;

            const mat = this.cloneTiledMaterial(material, [Math.max(1, Math.round(w * uvScale)), Math.max(1, Math.round(h * uvScale))]);
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            mesh.position.set(cx, cy, z);
            mesh.receiveShadow = true;
            this.scene.add(mesh);

            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(r.xMin, r.yMin, z - t * 0.5),
                new THREE.Vector3(r.xMax, r.yMax, z + t * 0.5)
            ));
        }

        // Add glowing neon portal frames around each cutout
        for (const p of portals) {
            this.addZPortalFrame(z, (p.xMin + p.xMax) * 0.5, (p.yMin + p.yMax) * 0.5, p.xMax - p.xMin, p.yMax - p.yMin, p.colorMat || this.lightStripMat);
        }
    }

    // Helper: Build a wall panel along the Z-axis (constant X) with rectangular portal cutouts
    // portals: array of { zMin, zMax, yMin, yMax, colorMat }
    buildXWallWithPortals(x, zMin, zMax, yMin, yMax, portals, material, uvScale = 0.05) {
        let rects = [{ zMin, zMax, yMin, yMax }];
        for (const p of portals) {
            const nextRects = [];
            for (const r of rects) {
                if (p.zMax <= r.zMin || p.zMin >= r.zMax || p.yMax <= r.yMin || p.yMin >= r.yMax) {
                    nextRects.push(r);
                    continue;
                }
                if (p.zMin > r.zMin) {
                    nextRects.push({ zMin: r.zMin, zMax: p.zMin, yMin: r.yMin, yMax: r.yMax });
                }
                if (p.zMax < r.zMax) {
                    nextRects.push({ zMin: p.zMax, zMax: r.zMax, yMin: r.yMin, yMax: r.yMax });
                }
                const overlapZMin = Math.max(r.zMin, p.zMin);
                const overlapZMax = Math.min(r.zMax, p.zMax);
                if (p.yMin > r.yMin) {
                    nextRects.push({ zMin: overlapZMin, zMax: overlapZMax, yMin: r.yMin, yMax: p.yMin });
                }
                if (p.yMax < r.yMax) {
                    nextRects.push({ zMin: overlapZMin, zMax: overlapZMax, yMin: p.yMax, yMax: r.yMax });
                }
            }
            rects = nextRects;
        }

        const t = 4.0;
        for (const r of rects) {
            const d = r.zMax - r.zMin;
            const h = r.yMax - r.yMin;
            if (d <= 0.05 || h <= 0.05) continue;
            const cz = (r.zMin + r.zMax) * 0.5;
            const cy = (r.yMin + r.yMax) * 0.5;

            const mat = this.cloneTiledMaterial(material, [Math.max(1, Math.round(d * uvScale)), Math.max(1, Math.round(h * uvScale))]);
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d, h), mat);
            mesh.position.set(x, cy, cz);
            mesh.rotation.y = Math.PI / 2;
            mesh.receiveShadow = true;
            this.scene.add(mesh);

            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(x - t * 0.5, r.yMin, r.zMin),
                new THREE.Vector3(x + t * 0.5, r.yMax, r.zMax)
            ));
        }

        for (const p of portals) {
            this.addXPortalFrame(x, (p.zMin + p.zMax) * 0.5, (p.yMin + p.yMax) * 0.5, p.zMax - p.zMin, p.yMax - p.yMin, p.colorMat || this.lightStripMat);
        }
    }

    addZPortalFrame(z, cx, cy, w, h, neonMat) {
        const group = new THREE.Group();
        group.position.set(cx, cy, z);

        const jambT = 1.4;
        const depth = 2.2;
        const top = new THREE.Mesh(new THREE.BoxGeometry(w + jambT * 2, jambT, depth), this.archMat);
        top.position.y = h * 0.5 + jambT * 0.5;
        group.add(top);

        const btm = new THREE.Mesh(new THREE.BoxGeometry(w + jambT * 2, jambT, depth), this.archMat);
        btm.position.y = -h * 0.5 - jambT * 0.5;
        group.add(btm);

        const left = new THREE.Mesh(new THREE.BoxGeometry(jambT, h, depth), this.archMat);
        left.position.x = -w * 0.5 - jambT * 0.5;
        group.add(left);

        const right = new THREE.Mesh(new THREE.BoxGeometry(jambT, h, depth), this.archMat);
        right.position.x = w * 0.5 + jambT * 0.5;
        group.add(right);

        // Glowing neon header & side strips
        const nTop = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.35, 2.4), neonMat);
        nTop.position.y = h * 0.5 - 0.2;
        group.add(nTop);

        const nLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, h * 0.8, 2.4), neonMat);
        nLeft.position.x = -w * 0.5 + 0.2;
        group.add(nLeft);

        const nRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, h * 0.8, 2.4), neonMat);
        nRight.position.x = w * 0.5 - 0.2;
        group.add(nRight);

        this.scene.add(group);
    }

    addXPortalFrame(x, cz, cy, d, h, neonMat) {
        const group = new THREE.Group();
        group.position.set(x, cy, cz);
        group.rotation.y = Math.PI / 2;

        const jambT = 1.4;
        const depth = 2.2;
        const top = new THREE.Mesh(new THREE.BoxGeometry(d + jambT * 2, jambT, depth), this.archMat);
        top.position.y = h * 0.5 + jambT * 0.5;
        group.add(top);

        const btm = new THREE.Mesh(new THREE.BoxGeometry(d + jambT * 2, jambT, depth), this.archMat);
        btm.position.y = -h * 0.5 - jambT * 0.5;
        group.add(btm);

        const left = new THREE.Mesh(new THREE.BoxGeometry(jambT, h, depth), this.archMat);
        left.position.x = -d * 0.5 - jambT * 0.5;
        group.add(left);

        const right = new THREE.Mesh(new THREE.BoxGeometry(jambT, h, depth), this.archMat);
        right.position.x = d * 0.5 + jambT * 0.5;
        group.add(right);

        const nTop = new THREE.Mesh(new THREE.BoxGeometry(d * 0.85, 0.35, 2.4), neonMat);
        nTop.position.y = h * 0.5 - 0.2;
        group.add(nTop);

        const nLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, h * 0.8, 2.4), neonMat);
        nLeft.position.x = -d * 0.5 + 0.2;
        group.add(nLeft);

        const nRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, h * 0.8, 2.4), neonMat);
        nRight.position.x = d * 0.5 - 0.2;
        group.add(nRight);

        this.scene.add(group);
    }

    addHollowBox(center, size, material, uvRepeat = [2, 2], openFaces = ['front', 'back']) {
        const group = new THREE.Group();
        const mat = this.cloneTiledMaterial(material, uvRepeat);

        const halfX = size.x / 2;
        const halfY = size.y / 2;
        const halfZ = size.z / 2;
        const openSet = new Set(openFaces);

        if (!openSet.has('left')) {
            const p = new THREE.Mesh(new THREE.PlaneGeometry(size.z, size.y), mat);
            p.position.set(center.x - halfX, center.y, center.z);
            p.rotation.y = Math.PI / 2;
            p.receiveShadow = true;
            group.add(p);
        }
        if (!openSet.has('right')) {
            const p = new THREE.Mesh(new THREE.PlaneGeometry(size.z, size.y), mat);
            p.position.set(center.x + halfX, center.y, center.z);
            p.rotation.y = -Math.PI / 2;
            p.receiveShadow = true;
            group.add(p);
        }
        if (!openSet.has('top') && !openSet.has('ceiling')) {
            const p = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.z), mat);
            p.position.set(center.x, center.y + halfY, center.z);
            p.rotation.x = Math.PI / 2;
            p.receiveShadow = true;
            group.add(p);
        }
        if (!openSet.has('bottom') && !openSet.has('floor')) {
            const p = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.z), mat);
            p.position.set(center.x, center.y - halfY, center.z);
            p.rotation.x = -Math.PI / 2;
            p.receiveShadow = true;
            group.add(p);
        }
        if (!openSet.has('back') && !openSet.has('+z')) {
            const p = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.y), mat);
            p.position.set(center.x, center.y, center.z + halfZ);
            p.rotation.y = Math.PI;
            p.receiveShadow = true;
            group.add(p);
        }
        if (!openSet.has('front') && !openSet.has('-z')) {
            const p = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.y), mat);
            p.position.set(center.x, center.y, center.z - halfZ);
            p.receiveShadow = true;
            group.add(p);
        }

        this.scene.add(group);

        const t = 4.0;
        if (!openSet.has('left')) {
            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(center.x - halfX - t, center.y - halfY, center.z - halfZ),
                new THREE.Vector3(center.x - halfX, center.y + halfY, center.z + halfZ)
            ));
        }
        if (!openSet.has('right')) {
            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(center.x + halfX, center.y - halfY, center.z - halfZ),
                new THREE.Vector3(center.x + halfX + t, center.y + halfY, center.z + halfZ)
            ));
        }
        if (!openSet.has('bottom') && !openSet.has('floor')) {
            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(center.x - halfX, center.y - halfY - t, center.z - halfZ),
                new THREE.Vector3(center.x + halfX, center.y - halfY, center.z + halfZ)
            ));
        }
        if (!openSet.has('top') && !openSet.has('ceiling')) {
            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(center.x - halfX, center.y + halfY, center.z - halfZ),
                new THREE.Vector3(center.x + halfX, center.y + halfY + t, center.z + halfZ)
            ));
        }
        if (!openSet.has('back') && !openSet.has('+z')) {
            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(center.x - halfX, center.y - halfY, center.z + halfZ),
                new THREE.Vector3(center.x + halfX, center.y + halfY, center.z + halfZ + t)
            ));
        }
        if (!openSet.has('front') && !openSet.has('-z')) {
            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(center.x - halfX, center.y - halfY, center.z - halfZ - t),
                new THREE.Vector3(center.x + halfX, center.y + halfY, center.z - halfZ)
            ));
        }

        return { group, bounds: new THREE.Box3().setFromCenterAndSize(center, size) };
    }

    addCorridorArchesZ(xCenter, yCenter, zPositions, width = 18, height = 14, stripMat = this.lightStripMat) {
        const halfW = width / 2;
        const halfH = height / 2;
        const thick = 0.7;
        const depth = 0.9;

        for (const z of zPositions) {
            const archGroup = new THREE.Group();
            archGroup.position.set(xCenter, yCenter, z);

            const lCol = new THREE.Mesh(new THREE.BoxGeometry(thick, height, depth), this.archMat);
            lCol.position.set(-halfW + thick / 2, 0, 0);
            archGroup.add(lCol);

            const rCol = new THREE.Mesh(new THREE.BoxGeometry(thick, height, depth), this.archMat);
            rCol.position.set(halfW - thick / 2, 0, 0);
            archGroup.add(rCol);

            const topBeam = new THREE.Mesh(new THREE.BoxGeometry(width, thick, depth), this.archMat);
            topBeam.position.set(0, halfH - thick / 2, 0);
            archGroup.add(topBeam);

            const btmBeam = new THREE.Mesh(new THREE.BoxGeometry(width, thick, depth), this.archMat);
            btmBeam.position.set(0, -halfH + thick / 2, 0);
            archGroup.add(btmBeam);

            const topLight = new THREE.Mesh(new THREE.BoxGeometry(width * 0.65, 0.22, 0.4), stripMat);
            topLight.position.set(0, halfH - thick - 0.08, 0);
            archGroup.add(topLight);

            const lLight = new THREE.Mesh(new THREE.BoxGeometry(0.18, height * 0.6, 0.35), stripMat);
            lLight.position.set(-halfW + thick + 0.08, 0, 0);
            archGroup.add(lLight);

            const rLight = new THREE.Mesh(new THREE.BoxGeometry(0.18, height * 0.6, 0.35), stripMat);
            rLight.position.set(halfW - thick - 0.08, 0, 0);
            archGroup.add(rLight);

            this.scene.add(archGroup);
        }
    }

    addCorridorArchesX(xPositions, yCenter, zCenter, depthZ = 28, height = 22, stripMat = this.lightStripMat) {
        const halfD = depthZ / 2;
        const halfH = height / 2;
        const thick = 0.8;

        for (const x of xPositions) {
            const archGroup = new THREE.Group();
            archGroup.position.set(x, yCenter, zCenter);
            archGroup.rotation.y = Math.PI / 2;

            const lCol = new THREE.Mesh(new THREE.BoxGeometry(thick, height, thick), this.archMat);
            lCol.position.set(-halfD + thick / 2, 0, 0);
            archGroup.add(lCol);

            const rCol = new THREE.Mesh(new THREE.BoxGeometry(thick, height, thick), this.archMat);
            rCol.position.set(halfD - thick / 2, 0, 0);
            archGroup.add(rCol);

            const topBeam = new THREE.Mesh(new THREE.BoxGeometry(depthZ, thick, thick), this.archMat);
            topBeam.position.set(0, halfH - thick / 2, 0);
            archGroup.add(topBeam);

            const btmBeam = new THREE.Mesh(new THREE.BoxGeometry(depthZ, thick, thick), this.archMat);
            btmBeam.position.set(0, -halfH + thick / 2, 0);
            archGroup.add(btmBeam);

            const topLight = new THREE.Mesh(new THREE.BoxGeometry(depthZ * 0.68, 0.28, 0.45), stripMat);
            topLight.position.set(0, halfH - thick - 0.1, 0);
            archGroup.add(topLight);

            const lLight = new THREE.Mesh(new THREE.BoxGeometry(0.22, height * 0.65, 0.4), stripMat);
            lLight.position.set(-halfD + thick + 0.1, 0, 0);
            archGroup.add(lLight);

            const rLight = new THREE.Mesh(new THREE.BoxGeometry(0.22, height * 0.65, 0.4), stripMat);
            rLight.position.set(halfD - thick - 0.1, 0, 0);
            archGroup.add(rLight);

            this.scene.add(archGroup);
        }
    }

    // --- 1. The Calibration Flight Tube (Z: +15 to -40) ---
    buildCalibrationTube() {
        this.addHollowBox(
            new THREE.Vector3(0, 0, -12.5),
            new THREE.Vector3(18, 14, 55),
            this.hullMat,
            [4, 2],
            ['front']
        );

        this.addCorridorArchesZ(0, 0, [6, -2, -10, -18, -26, -34], 18, 14, this.lightStripMat);

        // Floor hazard chevron guide strip + glowing cyan edge rails
        const floorStripeGeom = new THREE.PlaneGeometry(3.2, 52);
        floorStripeGeom.rotateX(-Math.PI / 2);
        const floorStripe = new THREE.Mesh(floorStripeGeom, this.hazardMat);
        floorStripe.position.set(0, -6.92, -12.5);
        this.scene.add(floorStripe);

        const railGeom = new THREE.BoxGeometry(0.18, 0.12, 52);
        const lRail = new THREE.Mesh(railGeom, this.lightStripMat);
        lRail.position.set(-2.2, -6.9, -12.5);
        this.scene.add(lRail);

        const rRail = new THREE.Mesh(railGeom, this.lightStripMat);
        rRail.position.set(2.2, -6.9, -12.5);
        this.scene.add(rRail);
    }

    // --- 2. The Colossal Grand Hub Arena (340m Wide x 140m High x 400m Long) ---
    buildGrandHubArena() {
        // Extends: X [-170, +170], Y [-55, +85], Z [-40, -440] (Centered at 0, 15, -240)
        // Only build Ceiling (+Y) and Floor (-Y) via addHollowBox; we build custom Portal Walls for Left, Right, Front, and Back!
        this.addHollowBox(
            new THREE.Vector3(0, 15, -240),
            new THREE.Vector3(340, 140, 400),
            this.arenaWallMat,
            [18, 14],
            ['left', 'right', 'front', 'back']
        );

        // South Entry Wall (Z = -40) with 2 Portals:
        // 1) Main Calibration Launch Tube Portal (X: -9..+9, Y: -7..+7)
        // 2) Upper South Overlook Bypass Tunnel Portal (X: -62..-38, Y: +27..+45)
        this.buildZWallWithPortals(
            -40, -170, 170, -55, 85,
            [
                { xMin: -9, xMax: 9, yMin: -7, yMax: 7, colorMat: this.lightStripMat },
                { xMin: -62, xMax: -38, yMin: 27, yMax: 45, colorMat: this.warmStripMat }
            ],
            this.hullMat, 0.04
        );

        // North Sanctum Wall (Z = -440) with Twin Side-by-Side Tunnels into the Deep Reactor Sanctum:
        // 1) Northwest Sanctum Tunnel (X: -64..-36, Y: -10..+12)
        // 2) Northeast Sanctum Tunnel (X: +36..+64, Y: -10..+12)
        this.buildZWallWithPortals(
            -440, -170, 170, -55, 85,
            [
                { xMin: -64, xMax: -36, yMin: -10, yMax: 12, colorMat: this.crimsonStripMat },
                { xMin: 36, xMax: 64, yMin: -10, yMax: 12, colorMat: this.crimsonStripMat }
            ],
            this.arenaWallMat, 0.04
        );

        // West Wall (X = -170) with 3 Portals:
        // 1) West-South Tunnel into Crystal Grotto (Z: -164..-136, Y: -11..+11)
        // 2) West-North Tunnel into Crystal Grotto (Z: -344..-316, Y: +9..+31)
        // 3) South Overlook Bypass Lateral Entry (Z: -112..-88, Y: +27..+45)
        this.buildXWallWithPortals(
            -170, -440, -40, -55, 85,
            [
                { zMin: -164, zMax: -136, yMin: -11, yMax: 11, colorMat: this.violetStripMat },
                { zMin: -344, zMax: -316, yMin: 9, yMax: 31, colorMat: this.violetStripMat },
                { zMin: -112, zMax: -88, yMin: 27, yMax: 45, colorMat: this.warmStripMat }
            ],
            this.arenaWallMat, 0.04
        );

        // East Wall (X = +170) with Twin Tunnels into the Hydro-Cooling Turbine Vault:
        // 1) East-South Tunnel (Z: -174..-146, Y: +7..+29)
        // 2) East-North Tunnel (Z: -334..-306, Y: -23..-1)
        this.buildXWallWithPortals(
            170, -440, -40, -55, 85,
            [
                { zMin: -174, zMax: -146, yMin: 7, yMax: 29, colorMat: this.emeraldStripMat },
                { zMin: -334, zMax: -306, yMin: -23, yMax: -1, colorMat: this.emeraldStripMat }
            ],
            this.arenaWallMat, 0.04
        );

        // --- Architectural Illuminated Ceiling & Floor Reference Strips ---
        const crossStripGeom = new THREE.BoxGeometry(310, 0.6, 0.9);
        for (let z = -75; z >= -410; z -= 48) {
            const ceilBar = new THREE.Mesh(crossStripGeom, this.lightStripMat);
            ceilBar.position.set(0, 84.4, z);
            this.scene.add(ceilBar);

            const floorBar = new THREE.Mesh(crossStripGeom, this.warmStripMat);
            floorBar.position.set(0, -54.5, z);
            this.scene.add(floorBar);
        }

        // --- 6 Colossal Illuminated Swing-Around Pillars in the Grand Hub ---
        const addArenaPillar = (x, z, radius = 5.2, ringColorMat = this.lightStripMat) => {
            const pGroup = new THREE.Group();
            pGroup.position.set(x, 15, z);

            const cylGeom = new THREE.CylinderGeometry(radius, radius * 1.1, 140, 18);
            const cyl = new THREE.Mesh(cylGeom, this.hazardMat);
            cyl.castShadow = true;
            cyl.receiveShadow = true;
            pGroup.add(cyl);

            const ringGeom = new THREE.TorusGeometry(radius + 0.4, 0.32, 8, 32);
            ringGeom.rotateX(Math.PI / 2);
            for (const ry of [-45, -18, 8, 34, 58]) {
                const rMesh = new THREE.Mesh(ringGeom, ry === -18 ? this.warmStripMat : ringColorMat);
                rMesh.position.y = ry;
                pGroup.add(rMesh);
            }

            this.scene.add(pGroup);
            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(x - radius, -55, z - radius),
                new THREE.Vector3(x + radius, 85, z + radius)
            ));
        };

        // 6 Pillars arranged in a grand 3-row colonnade (140m wide lateral spacing!)
        addArenaPillar(-70, -135, 5.2, this.lightStripMat);
        addArenaPillar(70, -135, 5.2, this.lightStripMat);

        addArenaPillar(-76, -240, 5.5, this.violetStripMat);
        addArenaPillar(76, -240, 5.5, this.emeraldStripMat);

        addArenaPillar(-70, -345, 5.2, this.crimsonStripMat);
        addArenaPillar(70, -345, 5.2, this.crimsonStripMat);

        // --- 3 Multi-Tier Observation Sky-Bridges ---
        const addBridge = (x, y, z, w, d) => {
            const b = new THREE.Mesh(new THREE.BoxGeometry(w, 1.8, d), this.hullMat);
            b.position.set(x, y, z);
            b.castShadow = true;
            b.receiveShadow = true;
            this.scene.add(b);
            this.colliders.push(new THREE.Box3().setFromObject(b));

            const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, 0.4), this.lightStripMat);
            edge.position.set(x, y + 0.9, z + d * 0.5);
            this.scene.add(edge);
        };

        addBridge(0, 34, -135, 140, 10);
        addBridge(0, -18, -240, 152, 12);
        addBridge(0, 26, -345, 140, 10);
    }

    // --- 3. West Wing: Twin Side Tunnels & Bioluminescent Crystal Grotto Cavern ---
    buildWestCrystalGrotto() {
        // Tunnel W1 (South-West Entry): X [-170, -250], Y [-11, +11] (center 0, H=22), Z [-164, -136] (center -150, D=28)
        this.addHollowBox(
            new THREE.Vector3(-210, 0, -150),
            new THREE.Vector3(80, 22, 28),
            this.hullMat,
            [4, 2],
            ['left', 'right']
        );
        this.addCorridorArchesX([-185, -210, -235], 0, -150, 28, 22, this.violetStripMat);

        // Tunnel W2 (North-West High Exit): X [-170, -250], Y [+9, +31] (center 20, H=22), Z [-344, -316] (center -330, D=28)
        this.addHollowBox(
            new THREE.Vector3(-210, 20, -330),
            new THREE.Vector3(80, 22, 28),
            this.hullMat,
            [4, 2],
            ['left', 'right']
        );
        this.addCorridorArchesX([-185, -210, -235], 20, -330, 28, 22, this.violetStripMat);

        // West Crystal Grotto Cavern: X [-390, -250] (W=140), Y [-45, +65] (H=110), Z [-370, -110] (L=260)
        // Center: (-320, 10, -240)
        this.addHollowBox(
            new THREE.Vector3(-320, 10, -240),
            new THREE.Vector3(140, 110, 260),
            this.grottoRockMat,
            [10, 8],
            ['right']
        );

        // East Wall of Grotto (X = -250) with cutouts for Tunnel W1 and Tunnel W2
        this.buildXWallWithPortals(
            -250, -370, -110, -45, 65,
            [
                { zMin: -164, zMax: -136, yMin: -11, yMax: 11, colorMat: this.violetStripMat },
                { zMin: -344, zMax: -316, yMin: 9, yMax: 31, colorMat: this.violetStripMat }
            ],
            this.grottoRockMat, 0.04
        );

        // Giant Glowing Amethyst & Cyan Crystal Spires inside the Grotto
        const crystalMatViolet = new THREE.MeshStandardMaterial({
            color: 0xd946ef,
            emissive: 0xa21caf,
            emissiveIntensity: 1.6,
            roughness: 0.15,
            metalness: 0.8
        });
        const crystalMatCyan = new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            emissive: 0x0284c7,
            emissiveIntensity: 1.5,
            roughness: 0.15,
            metalness: 0.8
        });

        const addCrystalSpire = (x, z, radius, height, isCeiling = false, mat = crystalMatViolet) => {
            const geom = new THREE.ConeGeometry(radius, height, 6);
            const mesh = new THREE.Mesh(geom, mat);
            if (isCeiling) {
                mesh.rotation.x = Math.PI;
                mesh.position.set(x, 65 - height * 0.5, z);
                this.colliders.push(new THREE.Box3(
                    new THREE.Vector3(x - radius * 0.65, 65 - height, z - radius * 0.65),
                    new THREE.Vector3(x + radius * 0.65, 65, z + radius * 0.65)
                ));
            } else {
                mesh.position.set(x, -45 + height * 0.5, z);
                this.colliders.push(new THREE.Box3(
                    new THREE.Vector3(x - radius * 0.65, -45, z - radius * 0.65),
                    new THREE.Vector3(x + radius * 0.65, -45 + height, z + radius * 0.65)
                ));
            }
            this.scene.add(mesh);
        };

        // Floor & Ceiling Crystal Clusters (Great for weaving & swing-around slaloms!)
        addCrystalSpire(-320, -185, 6.5, 58, false, crystalMatViolet);
        addCrystalSpire(-355, -240, 7.0, 66, true, crystalMatCyan);
        addCrystalSpire(-295, -285, 6.0, 54, false, crystalMatCyan);
        addCrystalSpire(-345, -145, 5.5, 48, true, crystalMatViolet);
        addCrystalSpire(-340, -320, 6.0, 50, false, crystalMatViolet);

        // Central Floating Zero-G Crystal Monolith (Orbit Anchor inside West Grotto)
        const monoGroup = new THREE.Group();
        monoGroup.position.set(-320, 12, -240);
        const monoMesh = new THREE.Mesh(new THREE.OctahedronGeometry(7.5, 0), crystalMatViolet);
        monoGroup.add(monoMesh);
        const monoRing = new THREE.Mesh(new THREE.TorusGeometry(11.0, 0.35, 8, 36), this.violetStripMat);
        monoRing.rotation.x = Math.PI / 3;
        monoGroup.add(monoRing);
        this.scene.add(monoGroup);
        this.floatingCrystals.push(monoGroup);
        this.colliders.push(new THREE.Box3(
            new THREE.Vector3(-326, 5, -246),
            new THREE.Vector3(-314, 19, -234)
        ));
    }

    // --- 4. East Wing: Twin Side Tunnels & Hydro-Cooling Turbine Vault Cavern ---
    buildEastTurbineVault() {
        // Tunnel E1 (South-East High Entry): X [+170, +250], Y [+7, +29] (center 18, H=22), Z [-174, -146] (center -160, D=28)
        this.addHollowBox(
            new THREE.Vector3(210, 18, -160),
            new THREE.Vector3(80, 22, 28),
            this.hullMat,
            [4, 2],
            ['left', 'right']
        );
        this.addCorridorArchesX([185, 210, 235], 18, -160, 28, 22, this.emeraldStripMat);

        // Tunnel E2 (North-East Low Exit): X [+170, +250], Y [-23, -1] (center -12, H=22), Z [-334, -306] (center -320, D=28)
        this.addHollowBox(
            new THREE.Vector3(210, -12, -320),
            new THREE.Vector3(80, 22, 28),
            this.hullMat,
            [4, 2],
            ['left', 'right']
        );
        this.addCorridorArchesX([185, 210, 235], -12, -320, 28, 22, this.emeraldStripMat);

        // East Hydro-Cooling Turbine Vault: X [+250, +390] (W=140), Y [-45, +65] (H=110), Z [-370, -110] (L=260)
        // Center: (+320, 10, -240)
        this.addHollowBox(
            new THREE.Vector3(320, 10, -240),
            new THREE.Vector3(140, 110, 260),
            this.hullMat,
            [12, 8],
            ['left']
        );

        // West Wall of Turbine Vault (X = +250) with cutouts for Tunnel E1 and Tunnel E2
        this.buildXWallWithPortals(
            250, -370, -110, -45, 65,
            [
                { zMin: -174, zMax: -146, yMin: 7, yMax: 29, colorMat: this.emeraldStripMat },
                { zMin: -334, zMax: -306, yMin: -23, yMax: -1, colorMat: this.emeraldStripMat }
            ],
            this.hullMat, 0.04
        );

        // 2 Colossal Vertical Hydro-Cooling Turbine Shafts with Animated Rotating Blades
        const addTurbineColumn = (x, z) => {
            const colGroup = new THREE.Group();
            colGroup.position.set(x, 10, z);

            const coreShaft = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 110, 16), this.pipeMat);
            colGroup.add(coreShaft);

            // Rotating rotor assemblies at 3 altitudes (player can fly above/below/around them!)
            for (const ry of [-22, 6, 34]) {
                const rotorGroup = new THREE.Group();
                rotorGroup.position.y = ry;

                const shroud = new THREE.Mesh(new THREE.TorusGeometry(13.5, 0.5, 8, 32), this.emeraldStripMat);
                shroud.rotation.x = Math.PI / 2;
                rotorGroup.add(shroud);

                for (let b = 0; b < 4; b++) {
                    const blade = new THREE.Mesh(new THREE.BoxGeometry(25, 0.6, 2.8), this.hazardMat);
                    blade.rotation.y = (b * Math.PI) / 4;
                    rotorGroup.add(blade);
                }

                colGroup.add(rotorGroup);
                this.turbineRotors.push(rotorGroup);
            }

            this.scene.add(colGroup);
            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(x - 4.5, -45, z - 4.5),
                new THREE.Vector3(x + 4.5, 65, z + 4.5)
            ));
        };

        addTurbineColumn(320, -195);
        addTurbineColumn(320, -285);

        // Energy Recharge Station inside the East Turbine Vault
        const energyPlat = new THREE.Mesh(new THREE.BoxGeometry(24, 1.8, 24), this.hullMat);
        energyPlat.position.set(355, -10, -240);
        this.scene.add(energyPlat);

        const energyPad = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 18), this.energyMat);
        energyPad.position.set(355, -8.8, -240);
        this.scene.add(energyPad);

        this.interactables.push({
            type: 'energy_center',
            position: new THREE.Vector3(355, -5.0, -240),
            radius: 14.0
        });
    }

    // --- 5. North Wing: Twin Tunnels & Deep Reactor Sanctum Cavern ---
    buildNorthReactorSanctum() {
        // Tunnel N1 (Northwest): X [-64, -36] (center -50, W=28), Y [-10, +12] (center +1, H=22), Z [-510, -440] (center -475, L=70)
        this.addHollowBox(
            new THREE.Vector3(-50, 1, -475),
            new THREE.Vector3(28, 22, 70),
            this.hullMat,
            [3, 2],
            ['front', 'back']
        );
        this.addCorridorArchesZ(-50, 1, [-455, -475, -495], 28, 22, this.crimsonStripMat);

        // Tunnel N2 (Northeast): X [+36, +64] (center +50, W=28), Y [-10, +12] (center +1, H=22), Z [-510, -440] (center -475, L=70)
        this.addHollowBox(
            new THREE.Vector3(50, 1, -475),
            new THREE.Vector3(28, 22, 70),
            this.hullMat,
            [3, 2],
            ['front', 'back']
        );
        this.addCorridorArchesZ(50, 1, [-455, -475, -495], 28, 22, this.crimsonStripMat);

        // Deep North Reactor Sanctum Cavern: X [-120, +120] (W=240), Y [-50, +70] (H=120), Z [-680, -510] (L=170)
        // Center: (0, 10, -595)
        this.addHollowBox(
            new THREE.Vector3(0, 10, -595),
            new THREE.Vector3(240, 120, 170),
            this.sanctumRockMat,
            [12, 8],
            ['back']
        );

        // South Wall of Reactor Sanctum (Z = -510) with cutouts for Tunnel N1 and Tunnel N2
        this.buildZWallWithPortals(
            -510, -120, 120, -50, 70,
            [
                { xMin: -64, xMax: -36, yMin: -10, yMax: 12, colorMat: this.crimsonStripMat },
                { xMin: 36, xMax: 64, yMin: -10, yMax: 12, colorMat: this.crimsonStripMat }
            ],
            this.sanctumRockMat, 0.04
        );

        // Glowing Magma / Thermal Floor Conduits in Reactor Sanctum
        const magmaStripGeom = new THREE.BoxGeometry(180, 0.6, 2.2);
        for (const mz of [-545, -595, -645]) {
            const mBar = new THREE.Mesh(magmaStripGeom, this.crimsonStripMat);
            mBar.position.set(0, -49.5, mz);
            this.scene.add(mBar);
        }

        // 2 Sanctum Guard Pylons flanking the Reactor Core
        for (const px of [-55, 55]) {
            const pCyl = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.0, 120, 16), this.hazardMat);
            pCyl.position.set(px, 10, -595);
            this.scene.add(pCyl);
            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(px - 4.8, -50, -599.8),
                new THREE.Vector3(px + 4.8, 70, -590.2)
            ));
        }

        // --- Colossal Calibration Reactor Core inside the North Sanctum (0, 12, -595) ---
        const coreGroup = new THREE.Group();
        coreGroup.position.set(0, 12, -595);

        const coreSphere = new THREE.Mesh(
            new THREE.DodecahedronGeometry(7.5),
            new THREE.MeshStandardMaterial({
                color: 0xff4400,
                emissive: 0xff3300,
                emissiveIntensity: 1.9,
                roughness: 0.25,
                metalness: 0.8
            })
        );
        coreGroup.add(coreSphere);

        const coreCage = new THREE.Mesh(
            new THREE.IcosahedronGeometry(9.6, 1),
            new THREE.MeshBasicMaterial({ color: 0xffbb00, wireframe: true })
        );
        coreGroup.add(coreCage);

        const gyro1 = new THREE.Mesh(new THREE.TorusGeometry(13.0, 0.6, 8, 36), this.archMat);
        coreGroup.add(gyro1);
        this.reactorGyroRings.push(gyro1);

        const gyro2 = new THREE.Mesh(new THREE.TorusGeometry(16.0, 0.65, 8, 36), this.archMat);
        gyro2.rotation.x = Math.PI / 2;
        coreGroup.add(gyro2);
        this.reactorGyroRings.push(gyro2);

        const coreLight = new THREE.PointLight(0xff5500, 14.0, 130, 0.85);
        coreGroup.add(coreLight);

        this.scene.add(coreGroup);
        this.reactorMesh = coreGroup;

        this.interactables.push({
            type: 'reactor_core',
            group: coreGroup,
            position: new THREE.Vector3(0, 12, -595),
            radius: 11.0,
            hp: 600,
            maxHp: 600,
            isAlive: true,
            takeDamage: (dmg) => {
                const core = this.interactables.find(i => i.type === 'reactor_core');
                if (!core || !core.isAlive) return;
                core.hp -= dmg;
                if (core.hp <= 0) {
                    core.isAlive = false;
                    this.isReactorDestroyed = true;
                }
            }
        });
    }

    // --- 6. High-Altitude South Overlook Bypass Loop Tunnel ---
    // Enters from West Wall of Hub (X = -170, Y: +27..+45, Z: -112..-88), turns 90° East, and exits high on South Wall (Z = -40, X: -62..-38, Y: +27..+45)!
    buildSouthBypassLoop() {
        // West-East segment: X [-194, -62], Y [+27, +45] (center 36, H=18), Z [-112, -88] (center -100, D=24)
        this.addHollowBox(
            new THREE.Vector3(-128, 36, -100),
            new THREE.Vector3(132, 18, 24),
            this.hullMat,
            [6, 2],
            ['right']
        );
        this.addCorridorArchesX([-160, -130, -100, -75], 36, -100, 24, 18, this.warmStripMat);

        // Corner Junction Chamber: X [-62, -38] (W=24), Y [+27, +45] (H=18), Z [-112, -88] (D=24)
        this.addHollowBox(
            new THREE.Vector3(-50, 36, -100),
            new THREE.Vector3(24, 18, 24),
            this.hazardMat,
            [2, 2],
            ['left', 'back']
        );

        // North-South segment exiting through South Wall at Z = -40:
        // X [-62, -38] (center -50, W=24), Y [+27, +45] (center 36, H=18), Z [-88, -40] (center -64, L=48)
        this.addHollowBox(
            new THREE.Vector3(-50, 36, -64),
            new THREE.Vector3(24, 18, 48),
            this.hullMat,
            [3, 2],
            ['front', 'back']
        );
        this.addCorridorArchesZ(-50, 36, [-78, -62, -48], 24, 18, this.warmStripMat);
    }

    // --- 7. 6-Gate Multi-Cavern Slalom Course (Traverses Hub + Side Tunnels + Caverns!) ---
    buildSlalomCourse() {
        const addSlalomRing = (x, y, z, rotX, rotY, rotZ, label) => {
            const ringGroup = new THREE.Group();
            ringGroup.position.set(x, y, z);
            ringGroup.rotation.set(rotX, rotY, rotZ);

            const torusGeom = new THREE.TorusGeometry(9.0, 0.65, 10, 42);
            const torus = new THREE.Mesh(torusGeom, this.archMat);
            torus.castShadow = true;
            torus.receiveShadow = true;
            ringGroup.add(torus);

            const rimGeom = new THREE.TorusGeometry(8.2, 0.28, 8, 42);
            const rimMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
            const rim = new THREE.Mesh(rimGeom, rimMat);
            ringGroup.add(rim);

            this.scene.add(ringGroup);

            this.slalomRings.push({
                id: this.slalomRings.length + 1,
                position: new THREE.Vector3(x, y, z),
                radius: 9.8,
                isCleared: false,
                group: ringGroup,
                rim: rim,
                rimMat: rimMat,
                label: label
            });
        };

        // Gate 1 (R1): South Grand Hub Entry
        addSlalomRing(0, 10, -85, 0.06, 0, 0, 'R1 (HUB SOUTH)');

        // Gate 2 (R2): Banking West toward the Crystal Grotto Tunnel
        addSlalomRing(-125, 2, -150, 0, Math.PI * 0.38, 0.2, 'R2 (WEST TUNNEL)');

        // Gate 3 (R3): Deep inside the West Bioluminescent Crystal Grotto!
        addSlalomRing(-320, 12, -210, 0.1, 0, 0, 'R3 (CRYSTAL GROTTO)');

        // Gate 4 (R4): Emerging back into the Central Grand Hub
        addSlalomRing(0, 16, -280, 0, -Math.PI * 0.2, 0, 'R4 (HUB CENTER)');

        // Gate 5 (R5): Inside the East Hydro-Cooling Turbine Vault!
        addSlalomRing(320, 4, -240, -0.1, 0, 0, 'R5 (TURBINE VAULT)');

        // Gate 6 (R6): North Sanctum Threshold before the Reactor Core
        addSlalomRing(0, 10, -415, 0, 0, 0, 'R6 (NORTH SANCTUM)');
    }

    createSpaceDust() {
        const particleCount = 4800;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const region = Math.random();
            let x, y, z;

            if (region < 0.08) {
                // Launch Tube
                x = (Math.random() - 0.5) * 16;
                y = (Math.random() - 0.5) * 12;
                z = 15 - Math.random() * 55;
            } else if (region < 0.58) {
                // Colossal Grand Hub Arena
                x = (Math.random() - 0.5) * 330;
                y = -50 + Math.random() * 130;
                z = -40 - Math.random() * 395;
            } else if (region < 0.74) {
                // West Crystal Grotto & Tunnels
                x = -170 - Math.random() * 215;
                y = -40 + Math.random() * 100;
                z = -115 - Math.random() * 250;
            } else if (region < 0.90) {
                // East Turbine Vault & Tunnels
                x = 170 + Math.random() * 215;
                y = -40 + Math.random() * 100;
                z = -115 - Math.random() * 250;
            } else {
                // North Reactor Sanctum & Tunnels
                x = (Math.random() - 0.5) * 230;
                y = -45 + Math.random() * 110;
                z = -440 - Math.random() * 235;
            }

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            const tone = 0.7 + Math.random() * 0.3;
            colors[i * 3] = 0.42 * tone;
            colors[i * 3 + 1] = 0.88 * tone;
            colors[i * 3 + 2] = 1.0 * tone;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.35, 'rgba(120, 215, 255, 0.85)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);

        const dustTex = new THREE.CanvasTexture(canvas);
        const dustMat = new THREE.PointsMaterial({
            size: 0.25,
            map: dustTex,
            vertexColors: true,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.spaceDust = new THREE.Points(geometry, dustMat);
        this.scene.add(this.spaceDust);
    }

    applyAnisotropy(maxAnisotropy) {
        if (!maxAnisotropy || maxAnisotropy <= 1) return;
        const textures = [
            this.hullTex, this.hazardTex, this.rockTex, this.energyTex,
            this.hullNorm, this.hazardNorm, this.rockNorm
        ];
        for (const t of textures) {
            if (t) {
                t.anisotropy = maxAnisotropy;
                t.needsUpdate = true;
            }
        }
        this.scene.traverse((obj) => {
            if (obj.isMesh && obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                for (const m of mats) {
                    if (m.map) {
                        m.map.anisotropy = maxAnisotropy;
                        m.map.needsUpdate = true;
                    }
                    if (m.normalMap) {
                        m.normalMap.anisotropy = maxAnisotropy;
                        m.normalMap.needsUpdate = true;
                    }
                }
            }
        });
    }

    checkSlalomGates(shipPos, onGateCleared) {
        let anyCleared = false;
        for (let i = 0; i < this.slalomRings.length; i++) {
            const ring = this.slalomRings[i];
            if (!ring.isCleared && shipPos.distanceTo(ring.position) < ring.radius) {
                ring.isCleared = true;
                if (ring.rimMat) ring.rimMat.color.setHex(0x10b981);
                anyCleared = true;
                if (onGateCleared) {
                    onGateCleared(ring, this.getClearedGatesCount(), this.slalomRings.length);
                }
            }
        }
        return anyCleared;
    }

    getClearedGatesCount() {
        return this.slalomRings.filter(r => r.isCleared).length;
    }

    resetSlalomGates() {
        for (const ring of this.slalomRings) {
            ring.isCleared = false;
            if (ring.rimMat) ring.rimMat.color.setHex(0x00f0ff);
        }
    }

    setupLighting() {
        // 1. High-Efficiency Global Illumination (Zero per-pixel PointLight cubemap overhead!)
        const amb = new THREE.AmbientLight(0xdbeafe, 1.25);
        this.scene.add(amb);

        const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 1.55);
        this.scene.add(hemi);

        // 3 Angled Directional Lights provide crisp normal-map relief across all walls, tunnels, and caverns at 1/10th the GPU cost of PointLights
        const dirLight1 = new THREE.DirectionalLight(0xf0f9ff, 1.25);
        dirLight1.position.set(90, 140, -110);
        this.scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0xbae6fd, 1.05);
        dirLight2.position.set(-100, 110, -360);
        this.scene.add(dirLight2);

        const dirLight3 = new THREE.DirectionalLight(0xfef08a, 0.75);
        dirLight3.position.set(0, -90, -240);
        this.scene.add(dirLight3);

        // 2. Consolidated 8 Regional Low-Decay PointLights (No shadow-map cubemaps -> 60+ FPS locked!)
        const addLight = (color, intensity, dist, x, y, z) => {
            const p = new THREE.PointLight(color, intensity, dist, 0.75);
            p.position.set(x, y, z);
            this.scene.add(p);
            return p;
        };

        // Launch Tube & South Entry
        addLight(0x38bdf8, 8.5, 110, 0, 5, -20);

        // Grand Hub Arena (3 Stadium Nodes)
        addLight(0xf0f9ff, 14.0, 340, 0, 62, -130);
        addLight(0xfffbeb, 14.0, 340, 0, 62, -250);
        addLight(0xe0f2fe, 14.0, 340, 0, 62, -370);

        // West Crystal Grotto (Bioluminescent Violet/Cyan Node)
        addLight(0xd946ef, 15.0, 300, -310, 30, -240);

        // East Hydro-Cooling Turbine Vault (Industrial Emerald/Gold Node)
        addLight(0x10b981, 15.0, 300, 310, 30, -240);

        // Deep North Reactor Sanctum (Magma Orange Node)
        addLight(0xf97316, 15.0, 300, 0, 45, -580);
    }

    update(deltaTime, playerPhysics, sound) {
        for (const item of this.interactables) {
            if (item.type === 'energy_center') {
                if (playerPhysics.position.distanceTo(item.position) < item.radius) {
                    playerPhysics.recharge(deltaTime * 40.0, deltaTime * 20.0);
                    sound.playEnergyRecharge();
                }
            } else if (item.type === 'reactor_core') {
                if (item.group) {
                    item.group.rotation.y += deltaTime * 0.9;
                    item.group.rotation.x += deltaTime * 0.45;
                }
            }
        }

        if (this.reactorGyroRings.length >= 2) {
            this.reactorGyroRings[0].rotation.z += deltaTime * 1.2;
            this.reactorGyroRings[1].rotation.x += deltaTime * 0.8;
        }

        for (let i = 0; i < this.turbineRotors.length; i++) {
            const dir = (i % 2 === 0) ? 1 : -1;
            this.turbineRotors[i].rotation.y += deltaTime * 1.8 * dir;
        }

        for (let i = 0; i < this.floatingCrystals.length; i++) {
            this.floatingCrystals[i].rotation.y += deltaTime * 0.65;
        }

        const t = performance.now() * 0.002;
        for (let i = 0; i < this.slalomRings.length; i++) {
            const ring = this.slalomRings[i];
            if (!ring.isCleared && ring.rim) {
                const s = 1.0 + Math.sin(t + i * 1.1) * 0.025;
                ring.rim.scale.set(s, s, 1);
            }
        }
    }
}
