/**
 * Interacciones — doble click para descubrir secretos
 * El agujero negro es la experiencia. Los textos son los secretos.
 */

const Interactions = {

    init(universe, hole) {
        this.universe = universe;
        this.hole = hole;

        this.toastEl = document.getElementById("toast");
        this.toastTimer = null;
        this.cooldownMs = 1800;
        this.cooldownTimer = 0;

        this.lastClickTime = 0;
        this.lastClickX = 0;
        this.lastClickY = 0;
        this.doubleClickThreshold = 350;
        this.doubleClickDist = 40;

        this.setupListeners();
    },

    setupListeners() {
        const handler = (x, y) => {
            if (this.hole && this.hole.proposalActive) return;

            if (this.hole && this.hole.checkHeartClick(x, y)) {
                this.hole.onHeartClick();
                return;
            }

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
            if (e.target.closest("#music-toggle") || e.target.closest("#player-panel")) return;
            handler(e.clientX, e.clientY);
        });

        let lastTouchTime = 0, lastTouchX = 0, lastTouchY = 0;

        document.addEventListener("touchend", (e) => {
            if (e.target.closest("#music-toggle") || e.target.closest("#player-panel")) return;
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

        if (this.hole && this.hole.checkClick(x, y)) {
            this.onHoleDoubleClick();
            return;
        }
    },

    onSpecialStar(star) {
        this.cooldownTimer = Date.now() + this.cooldownMs;

        if (!star.discovered) {
            star.discovered = true;
            this.universe.discoveredStars++;
        }

        this.showToast(Utils.pick(CONFIG.mensajesDescubribles));
    },

    onHoleDoubleClick() {
        this.cooldownTimer = Date.now() + this.cooldownMs;
        if (this.hole) this.hole.triggerAbsorption();
        this.showToast(Utils.pick(CONFIG.mensajesDescubribles));
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

    /* ===== PROPUESTA (triple click en corazon) ===== */

    showProposal() {
        if (document.getElementById("proposal-overlay")) return;

        const overlay = document.createElement("div");
        overlay.id = "proposal-overlay";
        overlay.className = "proposal-overlay";

        const card = document.createElement("div");
        card.className = "proposal-card";

        const q = document.createElement("div");
        q.className = "proposal-question";
        q.textContent = "¿Quieres ser mi novia?";
        card.appendChild(q);

        const btnRow = document.createElement("div");
        btnRow.className = "proposal-buttons";

        const btnYes = document.createElement("button");
        btnYes.className = "proposal-btn proposal-btn-yes";
        btnYes.textContent = "Si";
        btnYes.addEventListener("click", () => this.onProposalYes());

        const btnNo = document.createElement("button");
        btnNo.className = "proposal-btn proposal-btn-no";
        btnNo.textContent = "No";
        btnNo.addEventListener("click", () => this.onProposalNo());

        btnRow.appendChild(btnYes);
        btnRow.appendChild(btnNo);
        card.appendChild(btnRow);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => overlay.classList.add("visible"));
    },

    onProposalYes() {
        const overlay = document.getElementById("proposal-overlay");
        if (overlay) overlay.remove();

        if (this.hole) {
            this.hole.triggerMassiveExplosion();
            setTimeout(() => {
                this.universe.frozen = true;
                FloatingWords.frozen = true;
                this.hole.triggerTextFormation("TE AMO", () => {
                    this.hole.proposalActive = false;
                    this.hole.heartReady = false;
                    this.universe.frozen = false;
                    FloatingWords.frozen = false;
                });
            }, 1300);
        }
    },

    onProposalNo() {
        const overlay = document.getElementById("proposal-overlay");
        if (overlay) overlay.remove();

        this.universe.frozen = true;
        FloatingWords.frozen = true;

        if (this.hole) {
            this.hole.triggerMassiveExplosion();
            setTimeout(() => {
                this.hole.triggerTextFormation("SE INTENTO", () => {
                    this.hole.proposalActive = false;
                    this.hole.heartReady = false;
                    this.universe.frozen = false;
                    FloatingWords.frozen = false;
                });
            }, 1500);
        }
    }
};
