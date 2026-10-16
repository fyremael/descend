// Studio-Grade Web Audio API Synthesizer with Master Compressor, Subterranean Cavern Reverb,
// Dual-Detuned Plasma Thrusters, Jet Afterburner Whoosh, and Acoustic Wall Bounce Feedback
export class SoundSystem {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.initialized = false;

        // Master Bus & Acoustic Space
        this.masterGain = null;
        this.compressor = null;
        this.reverbConvolver = null;
        this.reverbSend = null;

        // Pre-computed 2-second White Noise Buffer (Zero per-frame allocation)
        this.noiseBuffer = null;

        // Continuous Dual-Detuned Thruster + Jet Afterburner Nodes
        this.thrusterOsc1 = null;
        this.thrusterOsc2 = null;
        this.thrusterSub = null;
        this.thrusterNoise = null;
        this.thrusterFilter = null;
        this.thrusterNoiseFilter = null;
        this.thrusterGain = null;
        this.thrusterNoiseGain = null;

        // Cooldowns to prevent audio spam
        this.lastBounceTime = 0;
        this.lastRechargeTime = 0;

        // Siren loop
        this.sirenOsc = null;
        this.sirenGain = null;
        this.sirenInterval = null;
        this.isSirenPlaying = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;

            this._setupMasterBusAndReverb();
            this._createSharedNoiseBuffer();
            this.initThrusterHum();
        } catch (e) {
            console.warn('Web Audio not supported or blocked:', e);
        }
    }

    ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    _setupMasterBusAndReverb() {
        if (!this.ctx) return;

        // Master Dynamics Compressor prevents clipping during rapid quad-laser + missile salvos
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(18, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);

        // Procedural Subterranean Cavern Stereo Impulse Response (1.4s lush decay)
        const rate = this.ctx.sampleRate;
        const length = Math.floor(rate * 1.4);
        const impulse = this.ctx.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const t = i / length;
            // Exponential cavern decay with early reflection modulation
            const env = Math.pow(1.0 - t, 2.6) * (1.0 + 0.25 * Math.sin(t * 45.0));
            left[i] = (Math.random() * 2 - 1) * env;
            right[i] = (Math.random() * 2 - 1) * env;
        }

        this.reverbConvolver = this.ctx.createConvolver();
        this.reverbConvolver.buffer = impulse;

        this.reverbSend = this.ctx.createGain();
        this.reverbSend.gain.setValueAtTime(0.24, this.ctx.currentTime);

        // Lowpass filter on reverb tail for warm subterranean acoustics
        const revFilter = this.ctx.createBiquadFilter();
        revFilter.type = 'lowpass';
        revFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);

        this.reverbSend.connect(this.reverbConvolver);
        this.reverbConvolver.connect(revFilter);
        revFilter.connect(this.compressor);
    }

    _createSharedNoiseBuffer() {
        if (!this.ctx) return;
        const bufferSize = Math.floor(this.ctx.sampleRate * 2.0);
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    }

    // Connect a sound node to both Dry Master Bus and Wet Cavern Reverb
    _connectToSpace(node, reverbMix = 0.28) {
        if (!this.ctx || !this.masterGain) return;
        node.connect(this.masterGain);
        if (this.reverbSend && reverbMix > 0.01) {
            const send = this.ctx.createGain();
            send.gain.setValueAtTime(reverbMix, this.ctx.currentTime);
            node.connect(send);
            send.connect(this.reverbSend);
        }
    }

    initThrusterHum() {
        if (!this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;

        // 1. Dual detuned warm plasma oscillators + deep sub-octave sine (No harsh buzzing!)
        this.thrusterOsc1 = this.ctx.createOscillator();
        this.thrusterOsc1.type = 'triangle';
        this.thrusterOsc1.frequency.setValueAtTime(52, t);

        this.thrusterOsc2 = this.ctx.createOscillator();
        this.thrusterOsc2.type = 'sawtooth';
        this.thrusterOsc2.frequency.setValueAtTime(52.4, t); // Slight chorus detune

        this.thrusterSub = this.ctx.createOscillator();
        this.thrusterSub.type = 'sine';
        this.thrusterSub.frequency.setValueAtTime(26, t);

        this.thrusterFilter = this.ctx.createBiquadFilter();
        this.thrusterFilter.type = 'lowpass';
        this.thrusterFilter.frequency.setValueAtTime(135, t);
        this.thrusterFilter.Q.setValueAtTime(1.8, t);

        this.thrusterGain = this.ctx.createGain();
        this.thrusterGain.gain.setValueAtTime(0.001, t);

        this.thrusterOsc1.connect(this.thrusterFilter);
        this.thrusterOsc2.connect(this.thrusterFilter);
        this.thrusterSub.connect(this.thrusterFilter);
        this.thrusterFilter.connect(this.thrusterGain);
        this.thrusterGain.connect(this.masterGain);

        this.thrusterOsc1.start(t);
        this.thrusterOsc2.start(t);
        this.thrusterSub.start(t);

        // 2. Looping filtered jet turbine airflow noise (gives authentic aerospace whoosh on thrust/boost)
        if (this.noiseBuffer) {
            this.thrusterNoise = this.ctx.createBufferSource();
            this.thrusterNoise.buffer = this.noiseBuffer;
            this.thrusterNoise.loop = true;

            this.thrusterNoiseFilter = this.ctx.createBiquadFilter();
            this.thrusterNoiseFilter.type = 'bandpass';
            this.thrusterNoiseFilter.frequency.setValueAtTime(320, t);
            this.thrusterNoiseFilter.Q.setValueAtTime(1.4, t);

            this.thrusterNoiseGain = this.ctx.createGain();
            this.thrusterNoiseGain.gain.setValueAtTime(0.0001, t);

            this.thrusterNoise.connect(this.thrusterNoiseFilter);
            this.thrusterNoiseFilter.connect(this.thrusterNoiseGain);
            this.thrusterNoiseGain.connect(this.masterGain);
            this.thrusterNoise.start(t);
        }
    }

    updateThruster(speedRatio, isThrusting, isBoosting = false, isTrichording = false) {
        if (!this.ctx || !this.thrusterGain) return;
        const clampedRatio = Math.min(1.6, Math.max(0, speedRatio));
        const overdrive = (isBoosting || isTrichording) ? 1.28 : 1.0;

        const targetVol = isThrusting
            ? Math.min(0.16, (0.04 + clampedRatio * 0.08) * overdrive)
            : (clampedRatio > 0.05 ? clampedRatio * 0.035 : 0.002);

        const baseFreq = (48 + clampedRatio * 58) * (isTrichording ? 1.12 : 1.0);
        const targetFilter = 120 + clampedRatio * 290 * overdrive;

        const t = this.ctx.currentTime;
        this.thrusterGain.gain.setTargetAtTime(targetVol, t, 0.07);
        this.thrusterOsc1.frequency.setTargetAtTime(baseFreq, t, 0.07);
        this.thrusterOsc2.frequency.setTargetAtTime(baseFreq * 1.008, t, 0.07);
        this.thrusterSub.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.07);
        this.thrusterFilter.frequency.setTargetAtTime(targetFilter, t, 0.07);

        if (this.thrusterNoiseGain && this.thrusterNoiseFilter) {
            const jetVol = isThrusting ? Math.min(0.09, (0.015 + clampedRatio * 0.045) * overdrive) : 0.0001;
            const jetFreq = 260 + clampedRatio * 520 * overdrive;
            this.thrusterNoiseGain.gain.setTargetAtTime(jetVol, t, 0.08);
            this.thrusterNoiseFilter.frequency.setTargetAtTime(jetFreq, t, 0.08);
        }
    }

    playWallBounce(impactSpeed = 10.0) {
        if (!this.ctx || this.isMuted) return;
        this.ensureContext();

        const now = performance.now() * 0.001;
        if (now - this.lastBounceTime < 0.14) return;
        this.lastBounceTime = now;

        const t = this.ctx.currentTime;
        const intensity = Math.min(1.0, Math.max(0.15, impactSpeed / 35.0));

        // 1. Deep Hull Bumper Thud
        const thud = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(115 + intensity * 45, t);
        thud.frequency.exponentialRampToValueAtTime(34, t + 0.16);

        thudGain.gain.setValueAtTime(0.32 * intensity, t);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        thud.connect(thudGain);
        this._connectToSpace(thudGain, 0.35);
        thud.start(t);
        thud.stop(t + 0.19);

        // 2. Crisp Energy Shield Deflection Shimmer
        const shimmer = this.ctx.createOscillator();
        const shimGain = this.ctx.createGain();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(520, t);
        shimmer.frequency.exponentialRampToValueAtTime(190, t + 0.12);

        shimGain.gain.setValueAtTime(0.14 * intensity, t);
        shimGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

        shimmer.connect(shimGain);
        this._connectToSpace(shimGain, 0.4);
        shimmer.start(t);
        shimmer.stop(t + 0.14);
    }

    playManeuverThruster(isWhipTurn = false) {
        if (!this.ctx || this.isMuted) return;
        this.ensureContext();

        const t = this.ctx.currentTime;

        // Pneumatic RCS thruster burst + harmonic sweep
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(isWhipTurn ? 450 : 650, t);
            filter.frequency.exponentialRampToValueAtTime(isWhipTurn ? 1600 : 1200, t + 0.22);
            filter.Q.setValueAtTime(2.2, t);

            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.18, t);
            nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

            noise.connect(filter);
            filter.connect(nGain);
            this._connectToSpace(nGain, 0.3);
            noise.start(t);
            noise.stop(t + 0.26);
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isWhipTurn ? 220 : 320, t);
        osc.frequency.exponentialRampToValueAtTime(isWhipTurn ? 580 : 480, t + 0.18);

        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        this._connectToSpace(gain, 0.25);
        osc.start(t);
        osc.stop(t + 0.21);
    }

    playLaser(level = 1) {
        if (!this.ctx || this.isMuted) return;
        this.ensureContext();

        const t = this.ctx.currentTime;

        // 1. Sub-bass punch + transient snap
        const snapOsc = this.ctx.createOscillator();
        const snapGain = this.ctx.createGain();
        snapOsc.type = 'sine';
        snapOsc.frequency.setValueAtTime(2400, t);
        snapOsc.frequency.exponentialRampToValueAtTime(520, t + 0.018);
        snapGain.gain.setValueAtTime(0.18, t);
        snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
        snapOsc.connect(snapGain);
        this.masterGain.connect ? snapGain.connect(this.masterGain) : snapGain.connect(this.ctx.destination);
        snapOsc.start(t);
        snapOsc.stop(t + 0.022);

        // 2. Dual-Oscillator Harmonic Plasma Bolt with Cavern Reverb
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        if (level === 1) {
            osc1.type = 'sawtooth';
            osc2.type = 'triangle';
            osc1.frequency.setValueAtTime(880, t);
            osc1.frequency.exponentialRampToValueAtTime(145, t + 0.12);
            osc2.frequency.setValueAtTime(440, t);
            osc2.frequency.exponentialRampToValueAtTime(72, t + 0.12);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(3000, t);
            filter.frequency.exponentialRampToValueAtTime(380, t + 0.12);
            gain.gain.setValueAtTime(0.16, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        } else if (level === 2) {
            osc1.type = 'triangle';
            osc2.type = 'sawtooth';
            osc1.frequency.setValueAtTime(1080, t);
            osc1.frequency.exponentialRampToValueAtTime(125, t + 0.14);
            osc2.frequency.setValueAtTime(542, t);
            osc2.frequency.exponentialRampToValueAtTime(62, t + 0.14);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(3600, t);
            filter.frequency.exponentialRampToValueAtTime(420, t + 0.14);
            gain.gain.setValueAtTime(0.20, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        } else if (level === 3) {
            osc1.type = 'sawtooth';
            osc2.type = 'sawtooth';
            osc1.frequency.setValueAtTime(1320, t);
            osc1.frequency.exponentialRampToValueAtTime(180, t + 0.15);
            osc2.frequency.setValueAtTime(990, t);
            osc2.frequency.exponentialRampToValueAtTime(135, t + 0.15);
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1750, t);
            filter.Q.value = 2.6;
            gain.gain.setValueAtTime(0.22, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        } else {
            osc1.type = 'sawtooth';
            osc2.type = 'triangle';
            osc1.frequency.setValueAtTime(1520, t);
            osc1.frequency.exponentialRampToValueAtTime(95, t + 0.17);
            osc2.frequency.setValueAtTime(380, t);
            osc2.frequency.exponentialRampToValueAtTime(48, t + 0.17);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(4500, t);
            filter.frequency.exponentialRampToValueAtTime(240, t + 0.17);
            gain.gain.setValueAtTime(0.24, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        }

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        this._connectToSpace(gain, 0.25);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.19);
        osc2.stop(t + 0.19);
    }

    playVulcan() {
        if (!this.ctx || this.isMuted || !this.noiseBuffer) return;
        this.ensureContext();

        const t = this.ctx.currentTime;
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1150;
        filter.Q.value = 2.5;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

        whiteNoise.connect(filter);
        filter.connect(gain);
        this._connectToSpace(gain, 0.2);

        whiteNoise.start(t, Math.random() * 1.5, 0.05);
    }

    playMissileLaunch() {
        if (!this.ctx || this.isMuted) return;
        this.ensureContext();

        const t = this.ctx.currentTime;

        // Stage 1: Pneumatic bay ejection thump
        const thump = this.ctx.createOscillator();
        const thumpGain = this.ctx.createGain();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(175, t);
        thump.frequency.exponentialRampToValueAtTime(42, t + 0.09);
        thumpGain.gain.setValueAtTime(0.32, t);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        thump.connect(thumpGain);
        this._connectToSpace(thumpGain, 0.25);
        thump.start(t);
        thump.stop(t + 0.11);

        // Stage 2: Filtered Jet Noise + Sawtooth Rocket Motor Ignition Roar
        const ignTime = t + 0.05;
        if (this.noiseBuffer) {
            const jet = this.ctx.createBufferSource();
            jet.buffer = this.noiseBuffer;

            const jetFilter = this.ctx.createBiquadFilter();
            jetFilter.type = 'bandpass';
            jetFilter.frequency.setValueAtTime(450, ignTime);
            jetFilter.frequency.exponentialRampToValueAtTime(1850, ignTime + 0.38);
            jetFilter.Q.value = 1.6;

            const jetGain = this.ctx.createGain();
            jetGain.gain.setValueAtTime(0.01, ignTime);
            jetGain.gain.linearRampToValueAtTime(0.28, ignTime + 0.08);
            jetGain.gain.exponentialRampToValueAtTime(0.001, ignTime + 0.44);

            jet.connect(jetFilter);
            jetFilter.connect(jetGain);
            this._connectToSpace(jetGain, 0.38);
            jet.start(ignTime, 0, 0.45);
        }

        const ignOsc = this.ctx.createOscillator();
        const ignGain = this.ctx.createGain();
        ignOsc.type = 'sawtooth';
        ignOsc.frequency.setValueAtTime(110, ignTime);
        ignOsc.frequency.exponentialRampToValueAtTime(480, ignTime + 0.35);

        const ignFilter = this.ctx.createBiquadFilter();
        ignFilter.type = 'lowpass';
        ignFilter.frequency.setValueAtTime(950, ignTime);

        ignGain.gain.setValueAtTime(0.16, ignTime);
        ignGain.gain.exponentialRampToValueAtTime(0.001, ignTime + 0.38);

        ignOsc.connect(ignFilter);
        ignFilter.connect(ignGain);
        this._connectToSpace(ignGain, 0.3);
        ignOsc.start(ignTime);
        ignOsc.stop(ignTime + 0.4);
    }

    playFlare() {
        this.playManeuverThruster(true);
    }

    playExplosion(isBig = false) {
        if (!this.ctx || this.isMuted) return;
        this.ensureContext();

        const t = this.ctx.currentTime;
        const duration = isBig ? 1.25 : 0.48;

        // 1. Supersonic initial detonation punch
        const snap = this.ctx.createOscillator();
        const snapGain = this.ctx.createGain();
        snap.type = 'triangle';
        snap.frequency.setValueAtTime(isBig ? 280 : 210, t);
        snap.frequency.exponentialRampToValueAtTime(32, t + 0.14);
        snapGain.gain.setValueAtTime(0.38, t);
        snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        snap.connect(snapGain);
        this._connectToSpace(snapGain, 0.45);
        snap.start(t);
        snap.stop(t + 0.16);

        // 2. Shared Noise Buffer Blast (Zero array allocation during gameplay!)
        if (this.noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(isBig ? 750 : 480, t);
            filter.frequency.exponentialRampToValueAtTime(40, t + duration);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(isBig ? 0.55 : 0.32, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

            noise.connect(filter);
            filter.connect(noiseGain);
            this._connectToSpace(noiseGain, 0.5);
            noise.start(t, Math.random() * 0.5, duration);
        }

        // 3. Sub-bass acoustic cavern rumble
        if (isBig) {
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(75, t);
            sub.frequency.exponentialRampToValueAtTime(26, t + 0.7);
            subGain.gain.setValueAtTime(0.5, t);
            subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
            sub.connect(subGain);
            this._connectToSpace(subGain, 0.45);
            sub.start(t);
            sub.stop(t + 0.78);
        }
    }

    playWeaponSwitch() {
        if (!this.ctx || this.isMuted) return;
        this.ensureContext();

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, t); // D5
        osc.frequency.setValueAtTime(880.0, t + 0.045); // A5
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
        osc.connect(gain);
        this._connectToSpace(gain, 0.2);
        osc.start(t);
        osc.stop(t + 0.12);
    }

    playShieldHit() {
        this.playWallBounce(20.0);
    }

    playGateChime(gateNum = 1) {
        if (!this.ctx || this.isMuted) return;
        this.ensureContext();

        const t = this.ctx.currentTime;
        // Ascending Lydian/Major harmonic root notes across all 6 Slalom Gates
        const roots = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
        const root = roots[Math.min(Math.max(0, gateNum - 1), roots.length - 1)];

        // Play a lush 2-note fifth chord with cavern reverb
        [root, root * 1.498].forEach((freq, idx) => {
            const startT = t + idx * 0.045;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startT);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.01, startT + 0.38);

            gain.gain.setValueAtTime(0.18, startT);
            gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.42);

            osc.connect(gain);
            this._connectToSpace(gain, 0.45);

            osc.start(startT);
            osc.stop(startT + 0.44);
        });
    }

    playEnergyRecharge() {
        if (!this.ctx || this.isMuted) return;
        const now = performance.now() * 0.001;
        if (now - this.lastRechargeTime < 0.09) return;
        this.lastRechargeTime = now;

        this.ensureContext();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25 + Math.random() * 130, t);
        osc.frequency.exponentialRampToValueAtTime(1046.5, t + 0.08);

        gain.gain.setValueAtTime(0.07, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        osc.connect(gain);
        this._connectToSpace(gain, 0.3);

        osc.start(t);
        osc.stop(t + 0.1);
    }

    playKeyPickup() {
        if (!this.ctx || this.isMuted) return;
        this.ensureContext();

        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5 E5 G5 C6 E6
        notes.forEach((freq, idx) => {
            const t = this.ctx.currentTime + idx * 0.065;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.16, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

            osc.connect(gain);
            this._connectToSpace(gain, 0.45);

            osc.start(t);
            osc.stop(t + 0.24);
        });
    }
}
