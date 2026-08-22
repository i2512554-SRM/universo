/**
 * Main: orquestador del universo
 * El agujero negro es la experiencia. Los textos son secretos.
 */

(function () {
    const canvas2D = document.getElementById("universe-canvas");
    const canvas3D = document.getElementById("hole-canvas");
    const loadingScreen = document.getElementById("loading-screen");
    const loadingText = document.getElementById("loading-text");
    const loadingBar = document.getElementById("loading-bar");

    let universe = null;
    let hole = null;
    let animFrame = null;
    let lastTime = 0;

    function startLoading() {
        const msgs = CONFIG.carga.mensajes;
        const total = CONFIG.carga.duracionTotal;
        const step = total / msgs.length;
        let i = 0;

        function tick() {
            if (i < msgs.length) {
                loadingText.textContent = msgs[i];
                loadingBar.style.width = ((i + 1) / msgs.length * 100) + "%";
                i++;
                setTimeout(tick, step);
            } else {
                setTimeout(finishLoading, 400);
            }
        }
        tick();
    }

    function finishLoading() {
        loadingScreen.classList.add("fade-out");
        setTimeout(() => {
            loadingScreen.style.display = "none";
            initUniverse();
        }, 800);
    }

    function initUniverse() {
        universe = new Universe(canvas2D);
        universe.init();

        hole = new BlackHole(canvas3D);

        MusicPlayer.init();
        Interactions.init(universe, hole);
        FloatingWords.init(hole.camera);
        setupSpeedControl();
        setupWordInput();
        setupGlowControl();

        setupInput();
        startLoop();
        MusicPlayer.show();
    }

    function setupInput() {
        let resizeTimer = null;
        let lastMove = 0;

        function onMove(x, y) {
            const now = performance.now();
            if (now - lastMove < 16) return;
            lastMove = now;
            universe.setMouse(x, y, true);
            hole.setMouseNorm(x, y);
        }

        document.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));

        document.addEventListener("touchmove", (e) => {
            if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        document.addEventListener("mouseleave", () => {
            universe.setMouse(universe.mouse.x, universe.mouse.y, false);
        });

        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const saved = universe.discoveredStars;
                universe.resize();
                universe.init();
                universe.discoveredStars = saved;
                hole.resize();
            }, 250);
        });
    }

    function startLoop() {
        function loop(time) {
            const dt = Math.min(time - lastTime, 50);
            lastTime = time;
            universe.render(time);
            hole.update(dt);
            hole.render();
            FloatingWords.update(time);
            animFrame = requestAnimationFrame(loop);
        }
        animFrame = requestAnimationFrame(loop);
    }

    function setupSpeedControl() {
        const el = document.getElementById("speed-control");
        const valEl = document.getElementById("speed-value");
        const btnDown = document.getElementById("speed-down");
        const btnUp = document.getElementById("speed-up");

        const speeds = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0];
        let idx = 3;

        function apply() {
            hole.speedMultiplier = speeds[idx];
            valEl.textContent = speeds[idx] + "x";
        }

        btnDown.addEventListener("click", () => {
            if (idx > 0) { idx--; apply(); }
        });

        btnUp.addEventListener("click", () => {
            if (idx < speeds.length - 1) { idx++; apply(); }
        });

        el.classList.add("visible");
    }

    function setupWordInput() {
        const el = document.getElementById("word-input");
        const input = document.getElementById("word-text");
        const btn = document.getElementById("word-send");

        function send() {
            const val = input.value.trim();
            if (!val) return;
            FloatingWords.addCustomWord(val);
            input.value = "";
        }

        btn.addEventListener("click", send);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") send();
        });

        el.classList.add("visible");
    }

    function setupGlowControl() {
        const el = document.getElementById("glow-control");
        const valEl = document.getElementById("glow-value");
        const btnDown = document.getElementById("glow-down");
        const btnUp = document.getElementById("glow-up");

        const levels = [0.3, 0.5, 0.7, 1.0, 1.3, 1.6, 2.0];
        const labels = ["30%", "50%", "70%", "100%", "130%", "160%", "200%"];
        let idx = 3;

        function apply() {
            FloatingWords.brightness = levels[idx];
            valEl.textContent = labels[idx];
        }

        btnDown.addEventListener("click", () => {
            if (idx > 0) { idx--; apply(); }
        });

        btnUp.addEventListener("click", () => {
            if (idx < levels.length - 1) { idx++; apply(); }
        });

        el.classList.add("visible");
    }

    startLoading();
})();
