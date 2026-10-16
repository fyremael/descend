// High-Fidelity Procedural PBR Texture Generator with Tangent-Space Normal Maps
export class TextureGenerator {
    // Generates a tangent-space normal map from an input height/diffuse canvas using a Sobel filter
    static generateNormalMap(srcCanvas, strength = 2.5) {
        const w = srcCanvas.width;
        const h = srcCanvas.height;
        const srcCtx = srcCanvas.getContext('2d');
        const srcData = srcCtx.getImageData(0, 0, w, h).data;

        const normCanvas = document.createElement('canvas');
        normCanvas.width = w;
        normCanvas.height = h;
        const normCtx = normCanvas.getContext('2d');
        const normImg = normCtx.createImageData(w, h);
        const dst = normImg.data;

        const getLum = (x, y) => {
            const sx = (x + w) % w;
            const sy = (y + h) % h;
            const idx = (sy * w + sx) * 4;
            return (srcData[idx] * 0.299 + srcData[idx + 1] * 0.587 + srcData[idx + 2] * 0.114) / 255.0;
        };

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const tl = getLum(x - 1, y - 1);
                const t  = getLum(x,     y - 1);
                const tr = getLum(x + 1, y - 1);
                const l  = getLum(x - 1, y);
                const r  = getLum(x + 1, y);
                const bl = getLum(x - 1, y + 1);
                const b  = getLum(x,     y + 1);
                const br = getLum(x + 1, y + 1);

                // Sobel derivatives
                const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
                const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

                let nx = -dx * strength;
                let ny = -dy * strength;
                let nz = 1.0;
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                nx /= len;
                ny /= len;
                nz /= len;

                const idx = (y * w + x) * 4;
                dst[idx]     = Math.floor((nx * 0.5 + 0.5) * 255);
                dst[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
                dst[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
                dst[idx + 3] = 255;
            }
        }
        normCtx.putImageData(normImg, 0, 0);
        return normCanvas;
    }

    // Heavy Industrial Titanium/Steel Hull Plating
    static createHullPlate(width = 512, height = 512) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Dark gunmetal base with subtle gradient
        const baseGrad = ctx.createLinearGradient(0, 0, width, height);
        baseGrad.addColorStop(0, '#2b3038');
        baseGrad.addColorStop(1, '#1e2228');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, width, height);

        const cols = 2;
        const rows = 2;
        const cellW = width / cols;
        const cellH = height / rows;

        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const x = c * cellW;
                const y = r * cellH;

                // Main panel slab
                const slabGrad = ctx.createLinearGradient(x, y, x + cellW, y + cellH);
                slabGrad.addColorStop(0, '#3a414c');
                slabGrad.addColorStop(0.5, '#313742');
                slabGrad.addColorStop(1, '#262b33');
                ctx.fillStyle = slabGrad;
                ctx.fillRect(x + 4, y + 4, cellW - 8, cellH - 8);

                // Recessed inner sub-panel
                ctx.fillStyle = '#22262d';
                ctx.fillRect(x + 18, y + 18, cellW - 36, cellH - 36);

                const innerGrad = ctx.createLinearGradient(x, y, x, y + cellH);
                innerGrad.addColorStop(0, '#2e353f');
                innerGrad.addColorStop(1, '#242932');
                ctx.fillStyle = innerGrad;
                ctx.fillRect(x + 22, y + 22, cellW - 44, cellH - 44);

                // Inset mechanical vent lines
                ctx.fillStyle = '#111417';
                for (let v = 0; v < 5; v++) {
                    const vy = y + 36 + v * 8;
                    ctx.fillRect(x + 30, vy, cellW - 60, 3);
                }

                // Polished metallic highlight edges
                ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
                ctx.fillRect(x + 4, y + 4, cellW - 8, 2);
                ctx.fillRect(x + 4, y + 4, 2, cellH - 8);

                // Deep cast shadow grooves
                ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
                ctx.fillRect(x + 4, y + cellH - 6, cellW - 8, 2);
                ctx.fillRect(x + cellW - 6, y + 4, 2, cellH - 8);

                // Heavy hex-head bolts on corners
                const boltOffsets = [
                    [10, 10], [cellW - 10, 10],
                    [10, cellH - 10], [cellW - 10, cellH - 10],
                    [cellW / 2, 10], [cellW / 2, cellH - 10]
                ];
                for (const [bx, by] of boltOffsets) {
                    ctx.fillStyle = '#0a0d10';
                    ctx.beginPath();
                    ctx.arc(x + bx, y + by, 3.5, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#8e9aaf';
                    ctx.beginPath();
                    ctx.arc(x + bx - 0.5, y + by - 0.5, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Industrial stencil labels
        ctx.fillStyle = 'rgba(255, 200, 50, 0.4)';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('OUTPOST 0-Δ', 28, 45);
        ctx.fillText('BAY 04', width - 90, height - 30);

        // Fine brushed micro-scratches & noise
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 14;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }
        ctx.putImageData(imgData, 0, 0);

        return canvas;
    }

    // High-Contrast Weathered Hazard Stripes with 3D Corrugated Ridges
    static createHazardStripes(width = 512, height = 512) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Deep charcoal base
        ctx.fillStyle = '#18191c';
        ctx.fillRect(0, 0, width, height);

        // Vibrant high-vis industrial yellow & black stripes
        const stripeWidth = 44;
        ctx.save();
        for (let x = -height; x < width + height; x += stripeWidth * 2) {
            // Yellow stripe with bevel
            const yGrad = ctx.createLinearGradient(x, 0, x + stripeWidth, 0);
            yGrad.addColorStop(0, '#e5a510');
            yGrad.addColorStop(0.5, '#f5ba1a');
            yGrad.addColorStop(1, '#c98a08');
            ctx.fillStyle = yGrad;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + stripeWidth, 0);
            ctx.lineTo(x + stripeWidth + height, height);
            ctx.lineTo(x + height, height);
            ctx.closePath();
            ctx.fill();

            // Black stripe with rubber/carbon texture
            const bGrad = ctx.createLinearGradient(x + stripeWidth, 0, x + stripeWidth * 2, 0);
            bGrad.addColorStop(0, '#1c1d20');
            bGrad.addColorStop(0.5, '#282a30');
            bGrad.addColorStop(1, '#141517');
            ctx.fillStyle = bGrad;

            ctx.beginPath();
            ctx.moveTo(x + stripeWidth, 0);
            ctx.lineTo(x + stripeWidth * 2, 0);
            ctx.lineTo(x + stripeWidth * 2 + height, height);
            ctx.lineTo(x + stripeWidth + height, height);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // 3D Metal treadplate / corrugated horizontal ribs
        for (let y = 0; y < height; y += 8) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(0, y, width, 1.5);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(0, y + 1.5, width, 2);
        }

        // Industrial weathered edge borders
        ctx.fillStyle = '#111315';
        ctx.fillRect(0, 0, width, 10);
        ctx.fillRect(0, height - 10, width, 10);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(0, 10, width, 2);
        ctx.fillRect(0, height - 12, width, 2);

        // Heavy paint chips & grease splatters
        ctx.fillStyle = '#2a2f35';
        for (let i = 0; i < 40; i++) {
            const rx = Math.random() * width;
            const ry = Math.random() * height;
            ctx.fillRect(rx, ry, Math.random() * 8 + 3, Math.random() * 4 + 1);
        }

        return canvas;
    }

    // Fractured Volcanic Basalt Rock with High-Relief Granite Veins
    static createRockBasalt(width = 512, height = 512) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Dark volcanic basalt base
        const rockGrad = ctx.createRadialGradient(width/2, height/2, 20, width/2, height/2, width * 0.7);
        rockGrad.addColorStop(0, '#2e2621');
        rockGrad.addColorStop(1, '#191411');
        ctx.fillStyle = rockGrad;
        ctx.fillRect(0, 0, width, height);

        // Multiscale fractured cliff facets
        for (let pass = 0; pass < 3; pass++) {
            const numCracks = 25 - pass * 6;
            ctx.lineWidth = 5 - pass * 1.5;

            for (let i = 0; i < numCracks; i++) {
                ctx.strokeStyle = Math.random() > 0.4 ? '#4a3d35' : '#0d0a08';
                ctx.beginPath();
                let px = Math.random() * width;
                let py = Math.random() * height;
                ctx.moveTo(px, py);

                for (let step = 0; step < 7; step++) {
                    px += (Math.random() - 0.5) * 70;
                    py += (Math.random() - 0.5) * 70;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }
        }

        // Mineral crystal flecks (pyrite and quartz veins)
        for (let i = 0; i < 400; i++) {
            const shiny = Math.random() > 0.85;
            ctx.fillStyle = shiny ? '#aa8855' : (Math.random() > 0.5 ? '#3c3029' : '#140f0c');
            const s = shiny ? 2.5 : Math.random() * 3 + 1;
            ctx.fillRect(Math.random() * width, Math.random() * height, s, s);
        }

        return canvas;
    }

    // Heavy Diamond Ventilation Grate with Cutouts & Bevels
    static createGrate(width = 256, height = 256) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, width, height);

        // Outer structural iron frame
        ctx.fillStyle = '#2d333b';
        ctx.fillRect(0, 0, width, height);

        // Frame highlight & shadow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(2, 2, width - 4, 3);
        ctx.fillRect(2, 2, 3, height - 4);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(2, height - 5, width - 4, 3);
        ctx.fillRect(width - 5, 2, 3, height - 4);

        // Diamond wire mesh cutouts
        const step = 22;
        const margin = 12;
        for (let x = margin; x < width - margin; x += step) {
            for (let y = margin; y < height - margin; y += step) {
                ctx.save();
                ctx.translate(x + step / 2, y + step / 2);
                ctx.rotate(Math.PI / 4);

                // Cut hole
                ctx.clearRect(-6, -6, 12, 12);

                // Bevel border around diamond opening
                ctx.strokeStyle = '#4e5866';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(-6.5, -6.5, 13, 13);
                ctx.restore();
            }
        }

        // Corner heavy mounting bolts
        const corners = [[6, 6], [width - 6, 6], [6, height - 6], [width - 6, height - 6]];
        for (const [bx, by] of corners) {
            ctx.fillStyle = '#111417';
            ctx.beginPath();
            ctx.arc(bx, by, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8892a0';
            ctx.beginPath();
            ctx.arc(bx - 0.5, by - 0.5, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        return canvas;
    }

    // Animated/Dynamic Thermal Lava Texture with Radiant Heat Glow
    static createLava(width = 512, height = 512) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Intense core radiance
        const grad = ctx.createRadialGradient(width/2, height/2, 25, width/2, height/2, width * 0.7);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.15, '#ffea44');
        grad.addColorStop(0.4, '#ff5500');
        grad.addColorStop(0.7, '#991100');
        grad.addColorStop(1, '#330500');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Cooled basalt crust tectonic floes
        for (let i = 0; i < 35; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#1a100c' : '#281812';
            ctx.beginPath();
            let x = Math.random() * width;
            let y = Math.random() * height;
            const r = Math.random() * 45 + 20;
            const sides = Math.floor(Math.random() * 4 + 4);
            for (let s = 0; s < sides; s++) {
                const a = (s / sides) * Math.PI * 2;
                const dist = r * (0.7 + Math.random() * 0.6);
                const px = x + Math.cos(a) * dist;
                const py = y + Math.sin(a) * dist;
                if (s === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }

        // White-hot plasma fissures cracking between the crust
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 8;
        for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            let x = Math.random() * width;
            let y = Math.random() * height;
            ctx.moveTo(x, y);
            for (let step = 0; step < 5; step++) {
                x += (Math.random() - 0.5) * 60;
                y += (Math.random() - 0.5) * 60;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        return canvas;
    }

    // High-Tech Cyber Energy Station Grid
    static createEnergyGrid(width = 256, height = 256) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#03141f';
        ctx.fillRect(0, 0, width, height);

        // Glowing cyan energy matrix lines
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.8;
        const step = 32;
        for (let x = 0; x <= width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y <= height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Central ionic power ring
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 45, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 35, 0, Math.PI * 2);
        ctx.fill();

        return canvas;
    }

    // Heavy Armored Security Door
    static createDoorTexture(colorType = 'blue', width = 256, height = 256) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Outer heavy armor border
        ctx.fillStyle = '#17191d';
        ctx.fillRect(0, 0, width, height);

        let colorHex = '#00b4d8';
        let darkHex = '#005f73';
        if (colorType === 'yellow') {
            colorHex = '#ffb703';
            darkHex = '#996500';
        }
        if (colorType === 'red') {
            colorHex = '#e63946';
            darkHex = '#7a1c22';
        }

        // Bevelled sliding door leaves
        ctx.fillStyle = '#2b3038';
        ctx.fillRect(10, 10, width - 20, height - 20);

        // Security keycard band
        ctx.fillStyle = colorHex;
        ctx.fillRect(16, 20, width - 32, 16);
        ctx.fillRect(16, height - 36, width - 32, 16);

        // Vertical interlocking seal groove
        ctx.fillStyle = '#0a0c0e';
        ctx.fillRect(width / 2 - 4, 0, 8, height);

        // Locking teeth
        for (let y = 30; y < height - 30; y += 30) {
            ctx.fillStyle = '#495057';
            ctx.fillRect(width / 2 - 12, y, 24, 10);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(width / 2 - 12, y, 24, 2);
        }

        // Central clearance crest
        ctx.fillStyle = darkHex;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 36, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(colorType[0].toUpperCase(), width / 2, height / 2);

        return canvas;
    }
}
