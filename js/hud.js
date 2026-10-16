// High-Precision Aerospace 6DOF Cockpit HUD, Spatial Waypoint System & Flight Academy Interface
export class HUD {
    constructor(domContainer) {
        this.container = domContainer;
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'hud-canvas';
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.resize();

        // Major Banner Notifications (Gates / Academy Modules)
        this.gateNoticeText = '';
        this.gateNoticeTimer = 0;
        this.isGrandCelebration = false;

        // Live Trick / Maneuver Style Callout Badge
        this.trickText = '';
        this.trickColor = '#fbbf24';
        this.trickTimer = 0;
        this.trickMaxTimer = 2.4;

        window.addEventListener('resize', () => this.resize());
    }

    triggerGateNotice(text, isGrand = false) {
        this.gateNoticeText = text;
        this.gateNoticeTimer = isGrand ? 5.0 : 3.0;
        this.isGrandCelebration = isGrand;
    }

    triggerTrickCallout(text, color = '#fbbf24') {
        this.trickText = text;
        this.trickColor = color;
        this.trickTimer = 2.4;
        this.trickMaxTimer = 2.4;
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    // Helper: Draw angled sci-fi chamfered HUD panel with corner ticks
    drawChamferPanel(ctx, x, y, w, h, cut = 10, bg = 'rgba(8, 14, 24, 0.84)', border = 'rgba(56, 189, 248, 0.42)', accent = '#38bdf8') {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + cut, y);
        ctx.lineTo(x + w - cut, y);
        ctx.lineTo(x + w, y + cut);
        ctx.lineTo(x + w, y + h - cut);
        ctx.lineTo(x + w - cut, y + h);
        ctx.lineTo(x + cut, y + h);
        ctx.lineTo(x, y + h - cut);
        ctx.lineTo(x, y + cut);
        ctx.closePath();

        ctx.fillStyle = bg;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = border;
        ctx.stroke();

        // Glowing corner accents
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        // Top-left chamfer highlight
        ctx.moveTo(x, y + cut + 8);
        ctx.lineTo(x, y + cut);
        ctx.lineTo(x + cut, y);
        ctx.lineTo(x + cut + 12, y);
        // Bottom-right chamfer highlight
        ctx.moveTo(x + w, y + h - cut - 8);
        ctx.lineTo(x + w, y + h - cut);
        ctx.lineTo(x + w - cut, y + h);
        ctx.lineTo(x + w - cut - 12, y + h);
        ctx.stroke();
        ctx.restore();
    }

    render(gameState) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        const cx = this.width / 2;
        const cy = this.height / 2;
        const speed = gameState.speed || 0;
        const elevation = gameState.elevation || 0;
        const fontMain = '"Segoe UI", "Consolas", "Courier New", monospace';

        // 0. Optional First-Person Cockpit Canopy Struts (when in cockpit view)
        if (gameState.viewMode === 'cockpit') {
            this.renderCockpitCanopy(ctx, cx, cy, gameState);
        }

        // 1. 3D-to-2D Spatial Navigation Waypoints (Next Slalom Gate & Orbit Anchor)
        if (gameState.waypoints && gameState.waypoints.length > 0) {
            this.renderSpatialWaypoints(ctx, cx, cy, gameState.waypoints, fontMain);
        }

        // 2. 6DOF Prograde Flight Vector (Drift Marker + Tether Line)
        const laserColors = ['', '#00f0ff', '#10b981', '#c084fc', '#fbbf24'];
        const primaryColor = gameState.weaponId === 1 ? (laserColors[gameState.laserLevel || 1] || '#00f0ff') : '#f59e0b';

        if (gameState.progradeScreen) {
            const px = cx + gameState.progradeScreen.x * (cx * 0.72);
            const py = cy - gameState.progradeScreen.y * (cy * 0.72);
            const distFromCenter = Math.hypot(px - cx, py - cy);

            ctx.save();
            // Dashed Drift Vector Tether connecting Nose Aim to Actual Velocity Vector
            if (distFromCenter > 18) {
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
                ctx.lineWidth = 1.4;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(px, py);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            ctx.shadowColor = 'rgba(251, 191, 36, 0.85)';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(px, py, 10, 0, Math.PI * 2);
            ctx.moveTo(px - 16, py); ctx.lineTo(px - 10, py);
            ctx.moveTo(px + 10, py); ctx.lineTo(px + 16, py);
            ctx.moveTo(px, py - 16); ctx.lineTo(px, py - 10);
            ctx.stroke();

            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(px, py, 2.2, 0, Math.PI * 2);
            ctx.fill();

            if (distFromCenter > 42 && (gameState.driftAngleDeg || 0) > 20) {
                ctx.font = `bold 9px ${fontMain}`;
                ctx.fillStyle = '#fde047';
                ctx.textAlign = 'center';
                ctx.fillText(`DRIFT ${Math.round(gameState.driftAngleDeg)}°`, px, py + 21);
            }
            ctx.restore();
        }

        // 3. Center Flight Reticle with Weapon-Tuned Accents
        ctx.save();
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1.6;

        // Center precision dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Inner ring & ticks
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.moveTo(cx - 24, cy); ctx.lineTo(cx - 13, cy);
        ctx.moveTo(cx + 13, cy); ctx.lineTo(cx + 24, cy);
        ctx.moveTo(cx, cy - 24); ctx.lineTo(cx, cy - 13);
        ctx.moveTo(cx, cy + 13); ctx.lineTo(cx, cy + 24);
        ctx.stroke();

        // Outer angled cowling brackets
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx - 48, cy - 32); ctx.lineTo(cx - 38, cy - 32); ctx.lineTo(cx - 38, cy - 42);
        ctx.moveTo(cx + 48, cy - 32); ctx.lineTo(cx + 38, cy - 32); ctx.lineTo(cx + 38, cy - 42);
        ctx.moveTo(cx - 48, cy + 32); ctx.lineTo(cx - 38, cy + 32); ctx.lineTo(cx - 38, cy + 42);
        ctx.moveTo(cx + 48, cy + 32); ctx.lineTo(cx + 38, cy + 32); ctx.lineTo(cx + 38, cy + 42);
        ctx.stroke();
        ctx.restore();

        // 4. Top-Left: 6DOF Flight Dynamics, Attitude Horizon & Thruster Matrix
        const tX = 24;
        const tY = 20;
        const tW = 316;
        const tH = 148;
        this.drawChamferPanel(ctx, tX, tY, tW, tH, 10);

        ctx.font = `bold 11px ${fontMain}`;
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('PYRO-GX 6DOF FLIGHT TELEMETRY', tX + 14, tY + 18);

        // Speed & Chording status
        const isTri = !!gameState.isTrichording;
        const isBi = !!gameState.isBichording;
        const isBoost = !!gameState.activeInputs?.boost;

        ctx.font = `bold 13px ${fontMain}`;
        ctx.fillStyle = isTri ? '#e879f9' : (isBoost ? '#f59e0b' : '#67e8f9');
        ctx.fillText(`${speed.toFixed(1)} M/S`, tX + 14, tY + 37);

        let driveTag = 'CRUISE';
        if (isTri) driveTag = '★ TRICHORD 1.36x';
        else if (isBoost) driveTag = 'AFTERBURNER';
        else if (isBi) driveTag = 'BICHORD 1.18x';

        ctx.font = `bold 9px ${fontMain}`;
        ctx.fillStyle = isTri ? '#f0abfc' : (isBoost ? '#fbbf24' : '#94a3b8');
        ctx.fillText(driveTag, tX + 90, tY + 36);

        // Speed Bar
        const barX = tX + 14;
        const barY = tY + 43;
        const maxBarW = 195;
        const speedNorm = Math.min(1.0, speed / 75.0);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(barX, barY, maxBarW, 8);
        ctx.fillStyle = isTri ? '#d946ef' : (isBoost ? '#f59e0b' : '#06b6d4');
        ctx.fillRect(barX, barY, maxBarW * speedNorm, 8);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.strokeRect(barX, barY, maxBarW, 8);

        // Elevation, Drift Angle & G-Force
        ctx.font = `bold 10px ${fontMain}`;
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`ALT: ${elevation >= 0 ? '+' : ''}${elevation.toFixed(1)}m`, tX + 14, tY + 66);
        ctx.fillStyle = (gameState.driftAngleDeg || 0) > 45 ? '#fbbf24' : '#94a3b8';
        ctx.fillText(`DRIFT: ${Math.round(gameState.driftAngleDeg || 0)}°`, tX + 92, tY + 66);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`G: ${(gameState.gForce || 0).toFixed(1)}G`, tX + 166, tY + 66);

        // Mini Artificial Horizon / Attitude Ball on right side of telemetry card
        const ahX = tX + 266;
        const ahY = tY + 52;
        const ahR = 30;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ahX, ahY, ahR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.stroke();
        ctx.clip();

        const rollRad = THREE_MathUtils_degToRad(gameState.rollDeg || 0);
        const pitchOffset = THREE_MathUtils_clamp((gameState.pitchDeg || 0) * 0.45, -22, 22);
        ctx.translate(ahX, ahY);
        ctx.rotate(rollRad);

        // Ground hemisphere fill
        ctx.fillStyle = 'rgba(2, 132, 199, 0.22)';
        ctx.fillRect(-ahR, pitchOffset, ahR * 2, ahR * 2);

        // Horizon line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-ahR + 4, pitchOffset);
        ctx.lineTo(ahR - 4, pitchOffset);
        ctx.stroke();

        // Pitch ladder bars
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, pitchOffset - 10); ctx.lineTo(10, pitchOffset - 10);
        ctx.moveTo(-10, pitchOffset + 10); ctx.lineTo(10, pitchOffset + 10);
        ctx.stroke();
        ctx.restore();

        // Fixed aircraft wing reference on horizon ball
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(ahX - 12, ahY); ctx.lineTo(ahX - 4, ahY);
        ctx.moveTo(ahX + 4, ahY); ctx.lineTo(ahX + 12, ahY);
        ctx.stroke();

        ctx.font = `bold 8px ${fontMain}`;
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText(`BANK ${Math.round(gameState.rollDeg || 0)}°`, ahX, ahY + ahR + 11);
        ctx.textAlign = 'left';

        // 6DOF Thruster Indicator Matrix (Full Clear Labels!)
        const thrusters = [
            { label: 'FWD [W]', on: gameState.activeInputs?.surge > 0.1 },
            { label: 'REV [S]', on: gameState.activeInputs?.surge < -0.1 },
            { label: 'SLIDE-L', on: gameState.activeInputs?.sway < -0.1 },
            { label: 'SLIDE-R', on: gameState.activeInputs?.sway > 0.1 },
            { label: 'UP [SPC]', on: gameState.activeInputs?.heave > 0.1 },
            { label: 'DN [C]', on: gameState.activeInputs?.heave < -0.1 },
            { label: 'ROLL-L', on: gameState.activeInputs?.roll < -0.1 },
            { label: 'ROLL-R', on: gameState.activeInputs?.roll > 0.1 },
            { label: 'BOOST', on: !!gameState.activeInputs?.boost, warn: true }
        ];

        const cols = 3;
        const cellW = 64;
        const cellH = 16;
        const gapX = 5;
        const gapY = 4;
        ctx.font = `bold 9px ${fontMain}`;

        for (let i = 0; i < thrusters.length; i++) {
            const th = thrusters[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            const bx = tX + 14 + col * (cellW + gapX);
            const by = tY + 78 + row * (cellH + gapY);

            ctx.fillStyle = th.on
                ? (th.warn ? 'rgba(245, 158, 11, 0.9)' : 'rgba(2, 132, 199, 0.9)')
                : 'rgba(15, 23, 42, 0.75)';
            ctx.fillRect(bx, by, cellW, cellH);

            ctx.strokeStyle = th.on
                ? (th.warn ? '#fde047' : '#38bdf8')
                : 'rgba(51, 65, 85, 0.6)';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, cellW, cellH);

            ctx.fillStyle = th.on ? '#ffffff' : '#64748b';
            ctx.textAlign = 'center';
            ctx.fillText(th.label, bx + cellW / 2, by + 11);
        }
        ctx.textAlign = 'left';

        // 5. Top-Center: 360° Compass Tape + Interactive Flight Academy Coach & Slalom Tracker
        const cW = 470;
        const cH = 92;
        const cX = cx - cW / 2;
        const cY = 18;
        this.drawChamferPanel(ctx, cX, cY, cW, cH, 10, 'rgba(8, 14, 24, 0.88)', 'rgba(16, 185, 129, 0.45)', '#10b981');

        // 5a. Scrolling 360° Compass Tape at top of center card
        this.renderCompassTape(ctx, cx, cY + 4, 380, 18, gameState.headingDeg || 0, fontMain);

        // 5b. Flight Academy Active Module Prompt
        const tut = gameState.tutorialState || {
            stepIndex: 1,
            totalSteps: 5,
            title: '6DOF TRANSLATION & LAUNCH',
            hint: 'Fly out of the tube [W/S] and test pure vertical [Space/C] & lateral [A/D] sliding',
            completedCount: 0
        };

        ctx.font = `bold 11px ${fontMain}`;
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'left';
        ctx.fillText(`FLIGHT ACADEMY [${tut.stepIndex}/${tut.totalSteps}]: ${tut.title}`, cX + 16, cY + 40);

        ctx.font = `9px ${fontMain}`;
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'right';
        ctx.fillText('[T] NEXT MODULE', cX + cW - 16, cY + 40);

        ctx.font = `11px ${fontMain}`;
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'left';
        ctx.fillText(tut.hint, cX + 16, cY + 57);

        // Bottom row of center card: Academy Step Pips (Left) + Slalom Gate Pips (Right)
        const cleared = gameState.clearedGates || 0;
        const totalGates = gameState.totalGates || 4;

        ctx.font = `bold 10px ${fontMain}`;
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`SLALOM RINGS: ${cleared}/${totalGates}`, cX + 16, cY + 78);

        for (let g = 0; g < totalGates; g++) {
            const gx = cX + 128 + g * 17;
            const gy = cY + 74;
            const isCl = g < cleared;
            ctx.beginPath();
            ctx.arc(gx, gy, 5, 0, Math.PI * 2);
            if (isCl) {
                ctx.fillStyle = '#10b981';
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 6;
                ctx.fill();
            } else {
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        // Academy Module Completion Pips
        ctx.fillStyle = '#10b981';
        ctx.fillText('MANEUVERS:', cX + 245, cY + 78);
        for (let m = 0; m < tut.totalSteps; m++) {
            const mx = cX + 324 + m * 24;
            const my = cY + 69;
            const isDone = tut.completedSteps && tut.completedSteps[m];
            const isCurr = (m + 1) === tut.stepIndex;

            ctx.fillStyle = isDone ? '#10b981' : (isCurr ? 'rgba(56, 189, 248, 0.35)' : 'rgba(30, 41, 59, 0.7)');
            ctx.fillRect(mx, my, 18, 10);
            ctx.strokeStyle = isDone ? '#34d399' : (isCurr ? '#38bdf8' : '#475569');
            ctx.lineWidth = 1.2;
            ctx.strokeRect(mx, my, 18, 10);
        }

        // 6. Top-Right: View Mode, Flight Assist & GPU Pipeline Badge
        const vW = 264;
        const vH = 82;
        const vX = this.width - vW - 24;
        const vY = 20;
        this.drawChamferPanel(ctx, vX, vY, vW, vH, 10);

        ctx.font = `bold 11px ${fontMain}`;
        ctx.fillStyle = gameState.viewMode === 'tag_along' ? '#38bdf8' : '#fde047';
        ctx.fillText(gameState.viewMode === 'tag_along' ? 'CAMERA: CHASE VIEW [V]' : 'CAMERA: COCKPIT VIEW [V]', vX + 14, vY + 20);

        ctx.font = `bold 10px ${fontMain}`;
        ctx.fillStyle = gameState.autoLevel ? '#10b981' : '#cbd5e1';
        ctx.fillText(`HORIZON LEVELING: ${gameState.autoLevel ? 'AUTO [L]' : 'MANUAL [L]'}`, vX + 14, vY + 38);

        ctx.fillStyle = '#f59e0b';
        ctx.fillText('180° WHIP-TURN: READY [X]', vX + 14, vY + 54);

        ctx.font = `9px ${fontMain}`;
        ctx.fillStyle = gameState.isBloomActive !== false ? '#10b981' : '#94a3b8';
        ctx.fillText(gameState.bloomModeText || 'GPU: WEBGL2 + HDR BLOOM (4x MSAA)', vX + 14, vY + 71);

        // 7. Live Trick / Maneuver Style Callout Badge (Below or Above Reticle)
        if (this.trickTimer > 0) {
            this.trickTimer -= 0.016;
            const alpha = Math.min(1.0, this.trickTimer / 0.4);
            ctx.save();
            ctx.globalAlpha = alpha;
            const tw = 310;
            const th = 30;
            const tx = cx - tw / 2;
            const ty = cy + 62;

            this.drawChamferPanel(ctx, tx, ty, tw, th, 7, 'rgba(15, 23, 42, 0.92)', this.trickColor, this.trickColor);
            ctx.font = `bold 13px ${fontMain}`;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = this.trickColor;
            ctx.shadowBlur = 10;
            ctx.textAlign = 'center';
            ctx.fillText(`★ ${this.trickText} ★`, cx, ty + 20);
            ctx.restore();
            ctx.textAlign = 'left';
        }

        // 8. Center Celebratory Gate / Module Notice Banner
        if (this.gateNoticeTimer > 0) {
            this.gateNoticeTimer -= 0.016;
            ctx.save();
            const bW = this.isGrandCelebration ? 600 : 480;
            const bH = 38;
            const bX = cx - bW / 2;
            const bY = 122;

            const borderCol = this.isGrandCelebration ? '#10b981' : '#38bdf8';
            this.drawChamferPanel(ctx, bX, bY, bW, bH, 8, 'rgba(8, 20, 34, 0.92)', borderCol, borderCol);

            ctx.font = `bold ${this.isGrandCelebration ? 15 : 13}px ${fontMain}`;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = borderCol;
            ctx.shadowBlur = 10;
            ctx.textAlign = 'center';
            ctx.fillText(this.gateNoticeText, cx, bY + 24);
            ctx.restore();
            ctx.textAlign = 'left';
        }

        // 9. Autopilot Tour Banner
        if (gameState.isFlythrough) {
            ctx.save();
            const apW = 490;
            this.drawChamferPanel(ctx, cx - apW / 2, this.height - 86, apW, 28, 6, 'rgba(2, 132, 199, 0.9)', '#38bdf8', '#ffffff');
            ctx.font = `bold 11px ${fontMain}`;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('DEMO FLYTHROUGH ACTIVE — [V] TOGGLE VIEW — [WASD] TAKE MANUAL CONTROL', cx, this.height - 68);
            ctx.restore();
            ctx.textAlign = 'left';
        }

        // 10. Lower Left: Segmented Aerospace Shield & Energy Pod
        const lW = 290;
        const lH = 84;
        const lX = 24;
        const lY = this.height - lH - 48;
        this.drawChamferPanel(ctx, lX, lY, lW, lH, 10);

        const totalSegments = 16;
        const segW = 12;
        const segH = 12;
        const segGap = 4;

        // Shield
        const activeShieldSegs = Math.round((Math.max(0, gameState.shield) / 100) * totalSegments);
        ctx.font = `bold 10px ${fontMain}`;
        ctx.fillStyle = '#67e8f9';
        ctx.fillText(`SHIELD [${Math.round(gameState.shield)}%] — PEACEFUL TRAINING`, lX + 14, lY + 18);

        for (let i = 0; i < totalSegments; i++) {
            const sx = lX + 14 + i * (segW + segGap);
            const sy = lY + 24;
            ctx.fillStyle = i < activeShieldSegs ? '#06b6d4' : 'rgba(30, 45, 60, 0.55)';
            ctx.fillRect(sx, sy, segW, segH);
        }

        // Energy
        const activeEnergySegs = Math.round((Math.max(0, gameState.energy) / 100) * totalSegments);
        ctx.fillStyle = '#fde047';
        ctx.fillText(`ENERGY [${Math.round(gameState.energy)}%] — AUTO-RECHARGE`, lX + 14, lY + 54);

        for (let i = 0; i < totalSegments; i++) {
            const sx = lX + 14 + i * (segW + segGap);
            const sy = lY + 60;
            ctx.fillStyle = i < activeEnergySegs ? '#eab308' : 'rgba(50, 45, 30, 0.55)';
            ctx.fillRect(sx, sy, segW, segH);
        }

        // 11. Lower Right: Tactical Ordnance & Weapon Pod
        const rwW = 270;
        const rwH = 84;
        const rwX = this.width - rwW - 24;
        const rwY = this.height - rwH - 48;
        this.drawChamferPanel(ctx, rwX, rwY, rwW, rwH, 10);

        ctx.font = `bold 11px ${fontMain}`;
        const laserNames = ['', 'CYAN PULSE', 'EMERALD HEAVY', 'VIOLET PLASMA', 'SOLAR QUAD'];
        const currentLvl = gameState.laserLevel || 1;

        if (gameState.weaponId === 1) {
            ctx.fillStyle = laserColors[currentLvl] || '#38bdf8';
            ctx.fillText(`LASER: MK ${currentLvl} [${laserNames[currentLvl]}]`, rwX + 14, rwY + 20);

            for (let l = 1; l <= 4; l++) {
                ctx.fillStyle = l <= currentLvl ? laserColors[l] : '#1e293b';
                ctx.fillRect(rwX + 14 + (l - 1) * 32, rwY + 27, 26, 7);
            }
            ctx.font = `9px ${fontMain}`;
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('[1] CYCLE TIER', rwX + 150, rwY + 34);
        } else {
            ctx.fillStyle = '#f59e0b';
            ctx.fillText('PRIMARY: VULCAN CHAINGUN', rwX + 14, rwY + 20);
            ctx.fillText(`AMMO: ${gameState.vulcanAmmo} / 800`, rwX + 14, rwY + 36);
        }

        ctx.font = `bold 11px ${fontMain}`;
        ctx.fillStyle = '#f97316';
        ctx.fillText(`MISSILES: ${gameState.missileAmmo || 0} / 30 [CORKSCREW]`, rwX + 14, rwY + 56);

        for (let m = 0; m < Math.min(12, gameState.missileAmmo || 0); m++) {
            ctx.fillStyle = '#fb923c';
            ctx.fillRect(rwX + 14 + m * 16, rwY + 63, 11, 6);
        }

        // 12. Bottom-Center: Sleek Flight & Maneuver Reference Ribbon
        const ribbonW = Math.min(980, this.width - 40);
        const ribbonH = 26;
        const ribbonX = cx - ribbonW / 2;
        const ribbonY = this.height - 34;

        this.drawChamferPanel(ctx, ribbonX, ribbonY, ribbonW, ribbonH, 6, 'rgba(8, 14, 24, 0.85)', 'rgba(56, 189, 248, 0.3)', '#38bdf8');

        ctx.font = `bold 10px ${fontMain}`;
        ctx.fillStyle = '#cbd5e1';
        ctx.textAlign = 'center';
        ctx.fillText(
            '[WASD] Surge/Slide • [Space/C] Up/Down • [Q/E] Roll (2x Snap) • [X] 180° Whip-Turn • [L] Level Horizon • [1] Laser Tier • [V] View • [T] Academy',
            cx,
            ribbonY + 17
        );
        ctx.textAlign = 'left';
    }

    renderCompassTape(ctx, cx, y, w, h, headingDeg, fontMain) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx - w / 2, y, w, h);
        ctx.clip();

        const dirs = [
            { deg: 0, label: 'N' },
            { deg: 45, label: 'NE' },
            { deg: 90, label: 'E' },
            { deg: 135, label: 'SE' },
            { deg: 180, label: 'S' },
            { deg: 225, label: 'SW' },
            { deg: 270, label: 'W' },
            { deg: 315, label: 'NW' }
        ];

        const pxPerDeg = 3.2;
        ctx.font = `bold 9px ${fontMain}`;
        ctx.textAlign = 'center';

        // Draw ticks every 15 degrees
        for (let d = -90; d <= 450; d += 15) {
            const normD = ((d % 360) + 360) % 360;
            let diff = d - headingDeg;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;

            const tx = cx + diff * pxPerDeg;
            if (tx < cx - w / 2 || tx > cx + w / 2) continue;

            const dirObj = dirs.find(item => item.deg === normD);
            if (dirObj) {
                ctx.fillStyle = dirObj.label === 'N' ? '#38bdf8' : '#e2e8f0';
                ctx.fillText(dirObj.label, tx, y + 12);
            } else {
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
                ctx.beginPath();
                ctx.moveTo(tx, y + 4);
                ctx.lineTo(tx, y + 11);
                ctx.stroke();
            }
        }

        // Center lubber triangle
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(cx, y + 17);
        ctx.lineTo(cx - 4, y + 21);
        ctx.lineTo(cx + 4, y + 21);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    renderSpatialWaypoints(ctx, cx, cy, waypoints, fontMain) {
        const margin = 65;
        const usedScreenPositions = [];

        for (const wp of waypoints) {
            const color = wp.color || '#00f0ff';
            ctx.save();

            if (wp.inFront && wp.x >= margin && wp.x <= this.width - margin && wp.y >= margin && wp.y <= this.height - margin) {
                let drawY = wp.y;
                for (const prev of usedScreenPositions) {
                    if (Math.abs(wp.x - prev.x) < 110 && Math.abs(drawY - prev.y) < 22) {
                        drawY = prev.y - 24;
                    }
                }
                usedScreenPositions.push({ x: wp.x, y: drawY });

                // Draw on-screen diamond bracket
                const s = 12;
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.6;
                ctx.shadowColor = color;
                ctx.shadowBlur = 6;

                ctx.beginPath();
                ctx.moveTo(wp.x, wp.y - s);
                ctx.lineTo(wp.x + s, wp.y);
                ctx.lineTo(wp.x, wp.y + s);
                ctx.lineTo(wp.x - s, wp.y);
                ctx.closePath();
                ctx.stroke();

                ctx.font = `bold 10px ${fontMain}`;
                ctx.fillStyle = color;
                ctx.textAlign = 'center';
                ctx.fillText(`${wp.label} [${Math.round(wp.dist)}m]`, wp.x, drawY - s - 6);
            } else {
                // Draw edge-of-screen directional indicator arrow
                const angle = Math.atan2(wp.dirY, wp.dirX);
                const radiusX = cx - margin;
                const radiusY = cy - margin;
                const ex = cx + Math.cos(angle) * Math.min(radiusX, radiusY * 1.3);
                let ey = cy - Math.sin(angle) * Math.min(radiusX * 0.7, radiusY);

                for (const prev of usedScreenPositions) {
                    if (Math.abs(ex - prev.x) < 120 && Math.abs(ey - prev.y) < 24) {
                        ey = prev.y + (ey < cy ? 26 : -26);
                    }
                }
                usedScreenPositions.push({ x: ex, y: ey });

                ctx.translate(ex, ey);
                ctx.rotate(-angle);

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(10, 0);
                ctx.lineTo(-6, -6);
                ctx.lineTo(-3, 0);
                ctx.lineTo(-6, 6);
                ctx.closePath();
                ctx.fill();

                ctx.rotate(angle);
                ctx.font = `bold 9px ${fontMain}`;
                ctx.textAlign = 'center';
                ctx.fillText(`${wp.label} ${Math.round(wp.dist)}m`, 0, 16);
            }
            ctx.restore();
        }
    }

    renderCockpitCanopy(ctx, cx, cy, gameState) {
        ctx.save();
        ctx.strokeStyle = 'rgba(30, 58, 95, 0.45)';
        ctx.lineWidth = 6;

        // Upper & lower canopy frame struts
        ctx.beginPath();
        ctx.moveTo(0, 110);
        ctx.lineTo(cx - 290, 210);
        ctx.lineTo(cx - 340, this.height - 130);
        ctx.lineTo(0, this.height - 60);

        ctx.moveTo(this.width, 110);
        ctx.lineTo(cx + 290, 210);
        ctx.lineTo(cx + 340, this.height - 130);
        ctx.lineTo(this.width, this.height - 60);
        ctx.stroke();

        // Thin cyan structural highlight
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }
}

function THREE_MathUtils_degToRad(deg) {
    return deg * (Math.PI / 180);
}

function THREE_MathUtils_clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
