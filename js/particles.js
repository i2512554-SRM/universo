/**
 * Sistema de partículas 2D para polvo ambiental
 */

class Particle {
    constructor(x, y, opts = {}) {
        this.x = x;
        this.y = y;
        this.vx = opts.vx || Utils.rand(-0.15, 0.15);
        this.vy = opts.vy || Utils.rand(-0.15, 0.15);
        this.size = opts.size || Utils.rand(0.5, 2);
        this.alpha = opts.alpha || Utils.rand(0.2, 0.6);
        this.maxAlpha = this.alpha;
        this.color = opts.color || "255,255,255";
        this.life = opts.life || Infinity;
        this.maxLife = this.life;
        this.friction = opts.friction || 1;
        this.flee = opts.flee || false;
        this.attract = opts.attract || false;
    }

    update(mouse, w, h) {
        if (this.life !== Infinity) {
            this.life--;
            this.alpha = this.maxAlpha * (this.life / this.maxLife);
            if (this.life <= 0) return false;
        }

        if (mouse.active) {
            const d = Utils.dist(this.x, this.y, mouse.x, mouse.y);
            const radius = 120;

            if (this.flee && d < radius) {
                const force = (1 - d / radius) * 0.8;
                const angle = Math.atan2(this.y - mouse.y, this.x - mouse.x);
                this.vx += Math.cos(angle) * force;
                this.vy += Math.sin(angle) * force;
            }

            if (this.attract && d < radius) {
                const force = (1 - d / radius) * 0.3;
                const angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
                this.vx += Math.cos(angle) * force;
                this.vy += Math.sin(angle) * force;
            }
        }

        this.vx *= this.friction;
        this.vy *= this.friction;
        this.x += this.vx;
        this.y += this.vy;

        if (this.life === Infinity) {
            if (this.x < -10) this.x = w + 10;
            if (this.x > w + 10) this.x = -10;
            if (this.y < -10) this.y = h + 10;
            if (this.y > h + 10) this.y = -10;
        }

        return true;
    }

    draw(ctx) {
        if (this.alpha <= 0.01) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color},${this.alpha})`;
        ctx.fill();
    }
}
