/**
 * Renderizado 2D: estrellas y estrellas especiales
 */

class Universe {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.stars = [];
        this.specialStars = [];
        this.particles = [];
        this.mouse = { x: 0, y: 0, active: false };
        this.parallaxX = 0;
        this.parallaxY = 0;
        this.discoveredStars = 0;
        this.frozen = false;
        this.resize();
    }

    resize() {
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = this.w * this.dpr;
        this.canvas.height = this.h * this.dpr;
        this.canvas.style.width = this.w + "px";
        this.canvas.style.height = this.h + "px";
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.cx = this.w / 2;
        this.cy = this.h / 2;
        this.isMobile = Utils.isMobile();
    }

    init() {
        this.stars = [];
        this.specialStars = [];
        this.particles = [];
        this.createStars();
        this.createSpecialStars();
        this.createAmbientParticles();
    }

    createStars() {
        const base = CONFIG.universo.cantidadEstrellas;
        const count = this.isMobile ? Math.floor(base * 0.5) : base;
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Utils.rand(0, this.w),
                y: Utils.rand(0, this.h),
                size: Utils.rand(0.3, 2),
                alpha: Utils.rand(0.15, 0.8),
                baseAlpha: Utils.rand(0.15, 0.8),
                twinkleSpeed: Utils.rand(0.005, 0.02),
                twinkleOffset: Utils.rand(0, Math.PI * 2),
                color: Utils.pick(["255,255,255", "168,216,255", "200,168,255", "128,222,234"]),
                depth: Utils.rand(0.2, 1)
            });
        }
    }

    createSpecialStars() {
        const count = CONFIG.universo.estrellasEspecialesCount;
        const data = Utils.shuffle([...CONFIG.estrellasEspeciales]).slice(0, count);
        const margin = 60;

        for (let i = 0; i < count; i++) {
            let x, y, tries = 0;
            do {
                x = Utils.rand(margin, this.w - margin);
                y = Utils.rand(margin, this.h - margin);
                tries++;
            } while (Utils.dist(x, y, this.cx, this.cy) < 200 && tries < 30);

            this.specialStars.push({
                x,
                y,
                size: Utils.rand(2, 3.8),
                alpha: Utils.rand(0.4, 0.75),
                baseAlpha: Utils.rand(0.4, 0.75),
                color: Utils.pick(["0,229,255", "200,168,255", "168,216,255"]),
                data: data[i],
                discovered: false,
                pulseAngle: Utils.rand(0, Math.PI * 2),
                clickRadius: this.isMobile ? 30 : 20
            });
        }
    }

    createAmbientParticles() {
        const count = this.isMobile ? 15 : 50;
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(
                Utils.rand(0, this.w),
                Utils.rand(0, this.h),
                {
                    size: Utils.rand(0.4, 1.2),
                    alpha: Utils.rand(0.03, 0.12),
                    color: Utils.pick(["255,255,255", "79,195,247", "200,168,255"]),
                    vx: Utils.rand(-0.05, 0.05),
                    vy: Utils.rand(-0.04, 0.04),
                    friction: 0.999,
                    flee: Math.random() > 0.7,
                    attract: Math.random() > 0.8
                }
            ));
        }
    }

    setMouse(x, y, active) {
        this.mouse.x = x;
        this.mouse.y = y;
        this.mouse.active = active;
        this.parallaxX = (x - this.cx) / this.cx;
        this.parallaxY = (y - this.cy) / this.cy;
    }

    drawBackground() {
        const g = this.ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, this.w * 0.7);
        g.addColorStop(0, "rgba(26, 10, 62, 0.25)");
        g.addColorStop(0.5, "rgba(10, 10, 46, 0.15)");
        g.addColorStop(1, "rgba(3, 1, 8, 0)");
        this.ctx.fillStyle = g;
        this.ctx.fillRect(0, 0, this.w, this.h);
    }

    drawStars(time) {
        for (const s of this.stars) {
            if (s.exploded) {
                s.x += s.vx;
                s.y += s.vy;
                s.vx *= 0.98;
                s.vy *= 0.98;
                s.baseAlpha *= 0.995;
            }
            const px = s.x + this.parallaxX * s.depth * 15;
            const py = s.y + this.parallaxY * s.depth * 15;
            const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkleOffset);
            s.alpha = s.baseAlpha * (0.6 + twinkle * 0.4);
            if (s.alpha < 0.02) continue;

            this.ctx.beginPath();
            this.ctx.arc(px, py, s.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${s.color},${s.alpha})`;
            this.ctx.fill();
        }
    }

    drawSpecialStars(time) {
        for (const s of this.specialStars) {
            if (s.exploded) {
                s.x += s.vx;
                s.y += s.vy;
                s.vx *= 0.97;
                s.vy *= 0.97;
                s.baseAlpha *= 0.99;
            }
            s.pulseAngle += 0.025;
            const pulse = 1 + Math.sin(s.pulseAngle) * 0.2;
            const a = s.discovered
                ? s.baseAlpha * 0.3
                : s.baseAlpha * (0.7 + pulse * 0.3);

            if (a < 0.02) continue;

            const sg = this.ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 6);
            sg.addColorStop(0, `rgba(${s.color},${a * 0.2})`);
            sg.addColorStop(1, "rgba(0,0,0,0)");
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.size * 6, 0, Math.PI * 2);
            this.ctx.fillStyle = sg;
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.size * pulse, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${s.color},${a})`;
            this.ctx.fill();
        }
    }

    drawParticles(time) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (!p.update(this.mouse, this.w, this.h)) {
                this.particles.splice(i, 1);
                continue;
            }
            p.draw(this.ctx);
        }
    }

    render(time) {
        this.ctx.clearRect(0, 0, this.w, this.h);
        if (this.frozen) return;
        this.drawBackground();
        this.drawStars(time);
        this.drawSpecialStars(time);
        this.drawParticles(time);
    }

    hitTestSpecial(x, y) {
        for (const s of this.specialStars) {
            if (Utils.dist(x, y, s.x, s.y) < s.clickRadius) return s;
        }
        return null;
    }

    explode() {
        for (const s of this.stars) {
            const angle = Math.atan2(s.y - this.cy, s.x - this.cx);
            s.exploded = true;
            s.vx = Math.cos(angle) * Utils.rand(2, 8);
            s.vy = Math.sin(angle) * Utils.rand(2, 8);
        }
        for (const s of this.specialStars) {
            const angle = Math.atan2(s.y - this.cy, s.x - this.cx);
            s.exploded = true;
            s.vx = Math.cos(angle) * Utils.rand(3, 10);
            s.vy = Math.sin(angle) * Utils.rand(3, 10);
        }
    }
}
