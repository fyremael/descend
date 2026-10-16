// 6DOF Input Controller with Silky Exponential Mouse Filtering, Analog Ramp, and Trick Hotkeys
export class InputController {
    constructor(domElement) {
        this.domElement = domElement || document.body;
        this.isPointerLocked = false;

        // Smoothed Translational inputs [-1.0, 1.0]
        this.surge = 0; // +Forward (W), -Backward (S)
        this.sway = 0;  // +Right (D), -Left (A)
        this.heave = 0; // +Up (Space), -Down (C)

        // Smoothed Rotational inputs
        this.pitch = 0; // +Up, -Down
        this.yaw = 0;   // +Right, -Left
        this.roll = 0;  // +Clockwise (E), -CounterClockwise (Q)

        // Internal smoothing state for slick movement
        this._smoothMouseYaw = 0;
        this._smoothMousePitch = 0;

        // Actions & Trick Triggers
        this.isPrimaryFiring = false;
        this.isSecondaryFiring = false;
        this.isFlareRequested = false;
        this.isBoosting = false;
        this.isMapRequested = false;
        this.isBloomToggleRequested = false;
        this.isViewToggleRequested = false;
        this.isAutopilotToggleRequested = false;
        this.isLaserLevelCycleRequested = false;

        // Signature Descent Trick Triggers
        this.isWhipTurnRequested = false;      // [X] 180-degree Retro Whip-Turn
        this.isLevelOutRequested = false;      // [L] Horizon Level-Out / Auto-Level
        this.isTutorialCycleRequested = false; // [T] Next / Reset Tutorial Step
        this.snapRollRequest = 0;              // Double-tap Q (-1) or E (+1) for 360 Snap Roll

        this.weaponSelect = 1; // 1: Laser, 2: Vulcan

        // Key states & double-tap timers
        this.keys = {};
        this._lastTapTime = { KeyQ: 0, KeyE: 0 };

        // Mouse delta accumulation
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        this.mouseSensitivity = 0.0028;

        this.initListeners();
    }

    initListeners() {
        this.domElement.addEventListener('click', () => {
            if (!this.isPointerLocked && document.pointerLockElement !== this.domElement) {
                this.domElement.requestPointerLock?.();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = (document.pointerLockElement === this.domElement);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isPointerLocked) {
                this.mouseDeltaX += e.movementX;
                this.mouseDeltaY += e.movementY;
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.isPrimaryFiring = true;
            if (e.button === 2) this.isSecondaryFiring = true;
            if (e.button === 1) this.isFlareRequested = true;
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.isPrimaryFiring = false;
            if (e.button === 2) this.isSecondaryFiring = false;
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('keydown', (e) => {
            const isInitialPress = !this.keys[e.code];
            this.keys[e.code] = true;

            if (e.code === 'KeyR') this.isFlareRequested = true;
            if (e.code === 'KeyF') this.isSecondaryFiring = true;
            if (e.code === 'ControlLeft' || e.code === 'ControlRight') this.isPrimaryFiring = true;

            if (e.code === 'Tab' || e.code === 'KeyM') {
                e.preventDefault();
                this.isMapRequested = !this.isMapRequested;
            }

            if (isInitialPress) {
                if (e.code === 'Digit1') {
                    if (this.weaponSelect === 1) {
                        this.isLaserLevelCycleRequested = true;
                    } else {
                        this.weaponSelect = 1;
                    }
                }
                if (e.code === 'Digit2') this.weaponSelect = 2;
                if (e.code === 'KeyV') this.isViewToggleRequested = true;
                if (e.code === 'KeyP') this.isAutopilotToggleRequested = true;
                if (e.code === 'KeyB') this.isBloomToggleRequested = true;
                if (e.code === 'KeyX') this.isWhipTurnRequested = true;
                if (e.code === 'KeyL') this.isLevelOutRequested = true;
                if (e.code === 'KeyT') this.isTutorialCycleRequested = true;

                // Double-tap Q or E for 360° Snap Barrel Roll
                if (e.code === 'KeyQ' || e.code === 'KeyE') {
                    const now = performance.now();
                    if (now - (this._lastTapTime[e.code] || 0) < 280) {
                        this.snapRollRequest = (e.code === 'KeyE') ? 1 : -1;
                        this._lastTapTime[e.code] = 0;
                    } else {
                        this._lastTapTime[e.code] = now;
                    }
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'KeyF') this.isSecondaryFiring = false;
            if (e.code === 'ControlLeft' || e.code === 'ControlRight') this.isPrimaryFiring = false;
        });
    }

    consumeLaserCycle() {
        const req = this.isLaserLevelCycleRequested;
        this.isLaserLevelCycleRequested = false;
        return req;
    }

    consumeViewToggle() {
        const req = this.isViewToggleRequested;
        this.isViewToggleRequested = false;
        return req;
    }

    consumeAutopilotToggle() {
        const req = this.isAutopilotToggleRequested;
        this.isAutopilotToggleRequested = false;
        return req;
    }

    consumeBloomToggle() {
        const req = this.isBloomToggleRequested;
        this.isBloomToggleRequested = false;
        return req;
    }

    consumeWhipTurn() {
        const req = this.isWhipTurnRequested;
        this.isWhipTurnRequested = false;
        return req;
    }

    consumeLevelOut() {
        const req = this.isLevelOutRequested;
        this.isLevelOutRequested = false;
        return req;
    }

    consumeTutorialCycle() {
        const req = this.isTutorialCycleRequested;
        this.isTutorialCycleRequested = false;
        return req;
    }

    consumeSnapRoll() {
        const req = this.snapRollRequest;
        this.snapRollRequest = 0;
        return req;
    }

    consumeFlare() {
        const req = this.isFlareRequested;
        this.isFlareRequested = false;
        return req;
    }

    update(deltaTime) {
        const safeDt = Math.max(0.004, Math.min(0.05, deltaTime));

        // --- 1. Target Keyboard Translation ---
        let rawSurge = 0;
        if (this.keys['KeyW']) rawSurge += 1.0;
        if (this.keys['KeyS']) rawSurge -= 1.0;

        let rawSway = 0;
        if (this.keys['KeyD']) rawSway += 1.0;
        if (this.keys['KeyA']) rawSway -= 1.0;

        let rawHeave = 0;
        if (this.keys['Space']) rawHeave += 1.0;
        if (this.keys['KeyC']) rawHeave -= 1.0;

        this.isBoosting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);

        // --- 2. Target Keyboard & Filtered Mouse Rotation ---
        let rawRoll = 0;
        if (this.keys['KeyE']) rawRoll += 1.0;
        if (this.keys['KeyQ']) rawRoll -= 1.0;

        let rawPitch = 0;
        let rawYaw = 0;
        if (this.keys['ArrowUp']) rawPitch += 1.25;
        if (this.keys['ArrowDown']) rawPitch -= 1.25;
        if (this.keys['ArrowRight']) rawYaw += 1.35;
        if (this.keys['ArrowLeft']) rawYaw -= 1.35;

        // Silky Exponential Mouse Velocity Filter (eliminates single-frame quantization stutter)
        if (this.isPointerLocked) {
            const instYaw = (this.mouseDeltaX * this.mouseSensitivity) / safeDt;
            const instPitch = -(this.mouseDeltaY * this.mouseSensitivity) / safeDt;
            this.mouseDeltaX = 0;
            this.mouseDeltaY = 0;

            const mouseBlend = 1.0 - Math.exp(-28.0 * safeDt);
            this._smoothMouseYaw += (instYaw - this._smoothMouseYaw) * mouseBlend;
            this._smoothMousePitch += (instPitch - this._smoothMousePitch) * mouseBlend;
        } else {
            this._smoothMouseYaw = 0;
            this._smoothMousePitch = 0;
        }

        rawYaw += this._smoothMouseYaw;
        rawPitch += this._smoothMousePitch;

        // --- 3. Gamepad Polling (HOSAS / Dual Stick) ---
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[0];
        if (gp) {
            const deadzone = 0.12;
            const applyDeadzone = (v) => Math.abs(v) > deadzone ? v : 0;

            rawSway += applyDeadzone(gp.axes[0]);
            rawSurge -= applyDeadzone(gp.axes[1]);

            rawYaw += applyDeadzone(gp.axes[2]) * 1.7;
            rawPitch -= applyDeadzone(gp.axes[3]) * 1.7;

            if (gp.buttons[4]?.pressed) rawRoll -= 1.0;
            if (gp.buttons[5]?.pressed) rawRoll += 1.0;
            if (gp.buttons[6]?.pressed) rawHeave -= 1.0;
            if (gp.buttons[7]?.pressed) rawHeave += 1.0;

            if (gp.buttons[0]?.pressed || gp.buttons[11]?.pressed) this.isPrimaryFiring = true;
            if (gp.buttons[1]?.pressed || gp.buttons[2]?.pressed) this.isSecondaryFiring = true;
        }

        // Fast, silky analog smoothing for translational & roll inputs
        const keyBlend = 1.0 - Math.exp(-32.0 * safeDt);
        this.surge = Math.abs(rawSurge) > 0.01 ? (this.surge + (rawSurge - this.surge) * keyBlend) : 0;
        this.sway = Math.abs(rawSway) > 0.01 ? (this.sway + (rawSway - this.sway) * keyBlend) : 0;
        this.heave = Math.abs(rawHeave) > 0.01 ? (this.heave + (rawHeave - this.heave) * keyBlend) : 0;

        this.surge = Math.max(-1.0, Math.min(1.0, this.surge));
        this.sway = Math.max(-1.0, Math.min(1.0, this.sway));
        this.heave = Math.max(-1.0, Math.min(1.0, this.heave));

        this.pitch = Math.max(-4.5, Math.min(4.5, rawPitch));
        this.yaw = Math.max(-4.5, Math.min(4.5, rawYaw));
        this.roll = Math.max(-2.0, Math.min(2.0, rawRoll));
    }
}
