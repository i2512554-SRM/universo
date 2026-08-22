/**
 * FloatingWords — palabras flotantes neon alrededor del agujero negro
 * Proyecta posiciones 3D a 2D y posiciona DOM elements
 * Soporta palabras custom con vida de 3 vueltas
 *
 * DONDE ESTAN LAS PALABRAS FLOTANTES:
 * - Lista de palabras: linea 9-13 (array `words`)
 * - Creacion de cada palabra DOM: linea 36-63 (metodo `_addWord`)
 *   -> Crea un div.floating-word y lo agrega al contenedor #floating-words
 *   -> Cada palabra orbita en 3D alrededor del agujero negro
 * - Posicionamiento 3D->2D: linea 116-135 (metodo `update`)
 *   -> Proyecta coordenadas 3D del circulo orbital a posicion 2D en pantalla
 *   -> Fade por profundidad (depthFade) y brillo (brightness)
 * - Palabras custom del usuario: linea 66-72 (metodo `addCustomWord`)
 *   -> 5 copias de cada palabra, distribuidas uniformemente en angulo
 *   -> Desaparecen despues de 3 vueltas completas (6π radianes)
 * - Control de brillo: propiedad `brightness` (0.0 a 2.0), lineas 20, 135
 * - Freeze (para secuencia de propuesta): linea 21, 77-80
 */

const FloatingWords = {

    // PALABRAS QUE APARECEN FLOTANDO — editar aqui para cambiar/agregar palabras
    words: [
        "risas", "miradas", "quimica", "locura",
        "complicidad", "confianza", "cariño", "aventuras",
        "momentos", "sonrisas", "magia", "contigo"
    ],

    elements: [],       // Array de elementos DOM (div.floating-word)
    positions3D: [],    // Posiciones orbitales 3D de cada palabra
    container: null,    // Contenedor DOM #floating-words
    camera: null,       // Referencia a la camara de Three.js
    currentTime: 0,
    brightness: 1.0,    // Brillo global (controlado por glow-control)
    frozen: false,      // true = oculta todas las palabras (durante propuesta)

    // INICIALIZACION — crea las 12 palabras orbitando al agujero negro
    init(camera) {
        this.camera = camera;
        this.container = document.getElementById("floating-words");

        for (let i = 0; i < this.words.length; i++) {
            this._addWord(this.words[i], false);
        }

        requestAnimationFrame(() => {
            this.elements.forEach(el => el.classList.add("visible"));
        });
    },

    // CREACION DE UNA PALABRA — genera div DOM + posicion 3D orbital
    _addWord(text, isCustom, fixedAngle) {
        const el = document.createElement("div");
        el.className = "floating-word";
        el.textContent = text;
        this.container.appendChild(el);
        this.elements.push(el);

        const angle = fixedAngle !== undefined ? fixedAngle : Math.random() * Math.PI * 2;
        const radius = 5.5 + Math.random() * 3.0;   // distancia al centro
        const height = (Math.random() - 0.5) * 4.0;  // altura Y
        const speed = 0.0003 + Math.random() * 0.0002; // velocidad orbital

        this.positions3D.push({
            baseAngle: angle,
            radius: radius,
            y: height,
            speed: speed,
            phase: Math.random() * Math.PI * 2,
            yOscAmp: 0.3 + Math.random() * 0.5,
            yOscSpeed: 0.0004 + Math.random() * 0.0003,
            custom: isCustom,
            totalAngle: 0,
            prevAngle: angle + this.currentTime * speed,
            alive: true
        });

        requestAnimationFrame(() => el.classList.add("visible"));
        return this.elements.length - 1;
    },

    // PALABRAS CUSTOM DEL USUARIO — 5 copias en circulo, viven 3 vueltas
    addCustomWord(text) {
        if (!text || !text.trim()) return;
        const count = 5;
        const startAngle = Math.random() * Math.PI * 2;
        for (let i = 0; i < count; i++) {
            this._addWord(text.trim(), true, startAngle + (i / count) * Math.PI * 2);
        }
    },

    // ACTUALIZACION FRAME A FRAME — proyecta 3D->2D y posiciona cada div
    update(time) {
        if (!this.camera) return;
        if (this.frozen) {
            for (const el of this.elements) el.style.opacity = "0";
            return;
        }
        this.currentTime = time;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const halfW = w * 0.5;
        const halfH = h * 0.5;
        const v = new THREE.Vector3();

        for (let i = this.elements.length - 1; i >= 0; i--) {
            const p = this.positions3D[i];
            const el = this.elements[i];

            if (!p.alive) continue;

            const angle = p.baseAngle + time * p.speed;

            // Palabras custom: contar rotaciones para vida limitada
            if (p.custom) {
                let dAngle = angle - p.prevAngle;
                if (dAngle < 0) dAngle += Math.PI * 2;
                if (dAngle > Math.PI) dAngle -= Math.PI * 2;
                p.totalAngle += Math.abs(dAngle);
                p.prevAngle = angle;

                if (p.totalAngle >= Math.PI * 2 * 3) {
                    p.alive = false;
                    el.classList.remove("visible");
                    setTimeout(() => {
                        if (el.parentNode) el.parentNode.removeChild(el);
                    }, 1600);
                    continue;
                }
            }

            const yOff = Math.sin(time * p.yOscSpeed + p.phase) * p.yOscAmp;

            // PROYECCION 3D -> 2D: calcula posicion orbital y proyecta con la camara
            v.set(
                Math.cos(angle) * p.radius,
                p.y + yOff,
                Math.sin(angle) * p.radius
            );

            v.project(this.camera);

            if (v.z > 1 || v.z < -1) {
                el.style.opacity = "0";
                continue;
            }

            const x = (v.x * halfW) + halfW;
            const y = -(v.y * halfH) + halfH;

            const depthFade = Utils.clamp(1.0 - Math.abs(v.z) * 0.4, 0.3, 1.0);

            el.style.transform = "translate(-50%, -50%) translate(" + x + "px," + y + "px)";
            el.style.opacity = String(depthFade * this.brightness);
        }
    }
};
