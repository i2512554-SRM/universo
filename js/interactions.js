/**
 * Interacciones — doble click para descubrir secretos
 * Saturno es la experiencia. Los textos son los secretos.
 */

const Interactions = {

    init(universe, saturn) {
        this.universe = universe;
        this.saturn = saturn;

        this.toastEl = document.getElementById("toast");
        this.toastTimer = null;
        this.cooldownMs = 1800;
        this.cooldownTimer = 0;

        this.surpriseEl = document.getElementById("surprise-overlay");
        this.finalEl = document.getElementById("final-screen");

        this.surpriseShown = false;

        this.lastClickTime = 0;
        this.lastClickX = 0;
        this.lastClickY = 0;
        this.doubleClickThreshold = 350;
        this.doubleClickDist = 40;

        this.setupListeners();
    },

    setupListeners() {
        const handler = (x, y) => {
            if (this.surpriseEl.classList.contains("visible")) return;
            if (this.finalEl.classList.contains("visible")) return;

            const now = Date.now();
            const dt = now - this.lastClickTime;
            const dd = Utils.dist(x, y, this.lastClickX, this.lastClickY);

            if (dt < this.doubleClickThreshold && dd < this.doubleClickDist) {
                this.lastClickTime = 0;
                this.handleDoubleClick(x, y);
            } else {
                this.lastClickTime = now;
                this.lastClickX = x;
                this.lastClickY = y;
            }
        };

        document.addEventListener("click", (e) => {
            if (e.target.closest("#music-player")) return;
            handler(e.clientX, e.clientY);
        });

        let lastTouchTime = 0, lastTouchX = 0, lastTouchY = 0;

        document.addEventListener("touchend", (e) => {
            if (e.target.closest("#music-player")) return;
            if (e.changedTouches.length !== 1) return;
            const t = e.changedTouches[0];
            const now = Date.now();
            const dt = now - lastTouchTime;
            const dd = Utils.dist(t.clientX, t.clientY, lastTouchX, lastTouchY);

            if (dt < this.doubleClickThreshold && dd < this.doubleClickDist) {
                lastTouchTime = 0;
                handler(t.clientX, t.clientY);
            } else {
                lastTouchTime = now;
                lastTouchX = t.clientX;
                lastTouchY = t.clientY;
            }
        }, { passive: true });
    },

    handleDoubleClick(x, y) {
        if (this.cooldownTimer > Date.now()) return;

        const special = this.universe.hitTestSpecial(x, y);
        if (special) {
            this.onSpecialStar(special);
            return;
        }

        if (this.saturn && this.saturn.checkClick(x, y)) {
            this.onSaturnDoubleClick();
            return;
        }
    },

    onSpecialStar(star) {
        this.cooldownTimer = Date.now() + this.cooldownMs;

        if (!star.discovered) {
            star.discovered = true;
            this.universe.discoveredStars++;
            this.checkSurprise();
        }

        this.showToast(Utils.pick(CONFIG.mensajesDescubribles));
    },

    onSaturnDoubleClick() {
        this.cooldownTimer = Date.now() + this.cooldownMs;
        if (this.saturn) this.saturn.triggerExplosion();
        this.showToast(Utils.pick(CONFIG.mensajesSaturno));
    },

    showToast(message) {
        if (this.toastTimer) clearTimeout(this.toastTimer);

        const el = this.toastEl;
        el.textContent = message;
        el.classList.remove("fade-out");
        el.classList.add("visible");

        this.toastTimer = setTimeout(() => {
            el.classList.add("fade-out");
            setTimeout(() => el.classList.remove("visible", "fade-out"), 600);
        }, 3000);
    },

    checkSurprise() {
        if (this.surpriseShown) return;
        if (this.universe.discoveredStars >= CONFIG.universo.objetosDesbloqueablesNecesarios) {
            this.surpriseShown = true;
            setTimeout(() => this.showSurprise(), 2000);
        }
    },

    showSurprise() {
        const el = this.surpriseEl;
        el.innerHTML = "";

        const title = document.createElement("div");
        title.className = "surprise-line";
        title.textContent = CONFIG.sorpresa.titulo;
        el.appendChild(title);

        for (const msg of CONFIG.sorpresa.mensajes) {
            const line = document.createElement("div");
            line.className = "surprise-line";
            line.textContent = msg;
            el.appendChild(line);
        }

        const btn = document.createElement("button");
        btn.className = "card-close";
        btn.style.marginTop = "20px";
        btn.textContent = "volver al universo";
        btn.addEventListener("click", () => el.classList.remove("visible"));
        el.appendChild(btn);

        el.classList.add("visible");
        el.querySelectorAll(".surprise-line").forEach((l, i) => {
            setTimeout(() => l.classList.add("visible"), 400 + i * 600);
        });

        setTimeout(() => this.showFinal(), 400 + el.querySelectorAll(".surprise-line").length * 600 + 2000);
    },

    showFinal() {
        this.surpriseEl.classList.remove("visible");
        const el = this.finalEl;
        el.innerHTML = "";

        for (const msg of CONFIG.final.mensajes) {
            const line = document.createElement("div");
            line.className = "final-line";
            line.textContent = msg;
            el.appendChild(line);
        }

        const btn = document.createElement("button");
        btn.id = "btn-back";
        btn.textContent = CONFIG.final.botonVolver;
        btn.addEventListener("click", () => {
            el.classList.remove("visible");
            this.surpriseShown = false;
            this.universe.discoveredStars = 0;
        });
        el.appendChild(btn);

        el.classList.add("visible");
        el.querySelectorAll(".final-line").forEach((l, i) => {
            setTimeout(() => l.classList.add("visible"), 300 + i * 700);
        });
        setTimeout(() => btn.classList.add("visible"), 300 + el.querySelectorAll(".final-line").length * 700 + 400);
    }
};
