// ============================================================
// HARIPRABODHAM — Global Interactive Particle Background
// Fixed full-page canvas, works on every page
// ============================================================

(function () {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W, H;
    let particles = [];
    let animId;
    const mouse = { x: -9999, y: -9999 };

    const COLORS = [
        '#fcd34d', // saffron-300
        '#f59e0b', // saffron-400
        '#d97706', // saffron-500
        '#a855f7', // violet
        '#c084fc', // violet-light
        '#e879a0', // rose
        '#fb923c', // orange
    ];

    const CONFIG = {
        count: 140,
        minRadius: 0.7,
        maxRadius: 2.8,
        speed: 0.22,
        mouseRadius: 140,
        mouseForce: 3.5,
        connectionDist: 110,
        connectionOpacity: 0.07,
    };

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function makeParticle() {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 0.6 + 0.1) * CONFIG.speed;
        return {
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * (CONFIG.maxRadius - CONFIG.minRadius) + CONFIG.minRadius,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: Math.random() * 0.5 + 0.25,
            pulseDelta: (Math.random() - 0.5) * 0.003,
            pulseMin: 0.18,
            pulseMax: 0.85,
        };
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < CONFIG.count; i++) {
            particles.push(makeParticle());
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        // Connection lines
        for (let i = 0; i < particles.length; i++) {
            const a = particles[i];
            for (let j = i + 1; j < particles.length; j++) {
                const b = particles[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONFIG.connectionDist) {
                    const t = 1 - dist / CONFIG.connectionDist;
                    ctx.save();
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(245,158,11,${CONFIG.connectionOpacity * t})`;
                    ctx.lineWidth = 0.6;
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }

        // Particles
        for (const p of particles) {
            // Mouse repulsion
            const dxm = p.x - mouse.x;
            const dym = p.y - mouse.y;
            const distM = Math.sqrt(dxm * dxm + dym * dym);
            if (distM < CONFIG.mouseRadius && distM > 0) {
                const force = (CONFIG.mouseRadius - distM) / CONFIG.mouseRadius;
                p.x += (dxm / distM) * force * CONFIG.mouseForce;
                p.y += (dym / distM) * force * CONFIG.mouseForce;
            }

            // Drift
            p.x += p.vx;
            p.y += p.vy;

            // Pulse alpha
            p.alpha += p.pulseDelta;
            if (p.alpha <= p.pulseMin || p.alpha >= p.pulseMax) p.pulseDelta = -p.pulseDelta;
            p.alpha = Math.max(p.pulseMin, Math.min(p.pulseMax, p.alpha));

            // Wrap edges
            if (p.x < -4) p.x = W + 4;
            if (p.x > W + 4) p.x = -4;
            if (p.y < -4) p.y = H + 4;
            if (p.y > H + 4) p.y = -4;

            // Glow halo
            ctx.save();
            ctx.globalAlpha = p.alpha * 0.3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();

            // Dot
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.restore();
        }

        animId = requestAnimationFrame(draw);
    }

    // Global mouse tracking
    document.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    document.addEventListener('mouseleave', () => {
        mouse.x = -9999;
        mouse.y = -9999;
    });

    // Resize
    window.addEventListener('resize', () => {
        if (animId) cancelAnimationFrame(animId);
        resize();
        initParticles();
        draw();
    });

    resize();
    initParticles();
    draw();
})();
