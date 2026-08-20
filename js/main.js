/**
 * Main: orquestador del universo
 * Saturno es la experiencia. Los textos son secretos.
 */

(function () {
    const canvas2D = document.getElementById("universe-canvas");
    const canvas3D = document.getElementById("saturn-canvas");
    const loadingScreen = document.getElementById("loading-screen");
    const loadingText = document.getElementById("loading-text");
    const loadingBar = document.getElementById("loading-bar");

    let universe = null;
    let saturn = null;
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

        saturn = new Saturn(canvas3D);

        MusicPlayer.init();
        Interactions.init(universe, saturn);

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
            saturn.setMouseNorm(x, y);
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
                saturn.resize();
            }, 250);
        });
    }

    function startLoop() {
        function loop(time) {
            const dt = Math.min(time - lastTime, 50);
            lastTime = time;
            universe.render(time);
            saturn.update(dt);
            saturn.render();
            animFrame = requestAnimationFrame(loop);
        }
        animFrame = requestAnimationFrame(loop);
    }

    startLoading();
})();
