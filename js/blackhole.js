/**
 * BlackHole — agujero negro 3D formado por particulas
 * Three.js + PointsMaterial + BufferGeometry
 * Disco de acrecion volumetrico + multiples corrientes + materia cayendo
 */

class BlackHole {
    constructor(canvas) {
        this.canvas = canvas;
        this.isMobile = Utils.isMobile();

        this.quality = this.isMobile ? 0.4 : 1.0;
        if (!this.isMobile && window.innerWidth < 1200) this.quality = 0.7;

        this.diskCount = Math.floor((this.isMobile ? 3500 : 6000) * this.quality);
        this.streamCount = Math.floor((this.isMobile ? 1500 : 2400) * this.quality);
        this.horizonCount = Math.floor((this.isMobile ? 350 : 600) * this.quality);
        this.bgCount = Math.floor((this.isMobile ? 800 : 1500) * this.quality);
        this.jetCount = Math.floor((this.isMobile ? 200 : 400) * this.quality);

        this.mouseNorm = { x: 0, y: 0 };
        this.targetYaw = 0;
        this.targetPitch = Math.PI * 0.35;
        this.yaw = 0;
        this.pitch = Math.PI * 0.35;
        this.velocityYaw = 0;
        this.velocityPitch = 0;
        this.autoRotateSpeed = 0.0008;
        this.isInteracting = false;
        this.idleTimer = 0;
        this.zoom = 1;
        this.targetZoom = 1;
        this.isInitialized = false;
        this.orbitRadius = 10;
        this.speedMultiplier = 1.0;

        this.HORIZON_R = 1.5;
        this.time = 0;

        this.heartClicks = 0;
        this.heartClickTimer = null;
        this.heartReady = false;
        this.proposalActive = false;

        this.textParticles = null;
        this.textAnim = null;
        this.particlesFrozen = false;
        this.particlesFade = 0;

        this.raycaster = new THREE.Raycaster();
        this.mouseVec = new THREE.Vector2();

        this.setup();
    }

    setup() {
        this.scene = new THREE.Scene();

        const w = window.innerWidth;
        const h = window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 300);
        this.camera.position.set(0, 0, 10);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: !this.isMobile,
            alpha: true
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.createDisk();
        this.createStreams();
        this.createEventHorizon();
        this.createBackground();
        this.createJets();
        this.createLensing();
        this.createHeart();
        this.setupZoom();
        this.isInitialized = true;
    }

    /* ===== DISCO DE ACRECION VOLUMETRICO ===== */

    createDisk() {
        const total = this.diskCount;
        const positions = new Float32Array(total * 3);
        const colors = new Float32Array(total * 3);
        const sizes = new Float32Array(total);

        this.dAngle = new Float32Array(total);
        this.dRadius = new Float32Array(total);
        this.dY = new Float32Array(total);
        this.dOmega = new Float32Array(total);
        this.dYDrift = new Float32Array(total);

        for (let i = 0; i < total; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 1.8 + Math.random() * 6.5;
            const baseThickness = 0.12 + (r - 1.8) * 0.065;
            const thickness = baseThickness + Math.random() * baseThickness * 1.2;
            const y = (Math.random() - 0.5) * thickness;

            positions[i * 3] = Math.cos(angle) * r;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = Math.sin(angle) * r;

            const t = Utils.clamp((r - 1.5) / 7.0, 0, 1);
            const [cr, cg, cb] = this.tempToColor(t);
            const v = Utils.rand(-0.04, 0.04);
            colors[i * 3] = Utils.clamp(cr + v, 0, 1);
            colors[i * 3 + 1] = Utils.clamp(cg + v, 0, 1);
            colors[i * 3 + 2] = Utils.clamp(cb + v, 0, 1);

            sizes[i] = Utils.rand(0.015, 0.055);

            this.dAngle[i] = angle;
            this.dRadius[i] = r;
            this.dY[i] = y;
            this.dOmega[i] = 0.35 / Math.pow(r, 1.5);
            this.dYDrift[i] = Utils.rand(-0.0001, 0.0001);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.04,
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.diskMesh = new THREE.Points(geo, mat);
        this.group.add(this.diskMesh);
    }

    tempToColor(t) {
        if (t < 0.4) {
            const f = t / 0.4;
            return [0.75 + f * 0.25, 0.20 + f * 0.25, 0.01 + f * 0.04];
        } else if (t < 0.7) {
            const f = (t - 0.4) / 0.3;
            return [1.0, 0.45 + f * 0.35, 0.05 + f * 0.15];
        } else {
            const f = (t - 0.7) / 0.3;
            return [1.0, 0.80 + f * 0.20, 0.20 + f * 0.60];
        }
    }

    /* ===== MULTIPLES CORRIENTES DE MATERIA ===== */

    createStreams() {
        const numStreams = this.isMobile ? 6 : 8;
        const perStream = Math.floor(this.streamCount / numStreams);
        const total = perStream * numStreams;

        const positions = new Float32Array(total * 3);
        const colors = new Float32Array(total * 3);
        const sizes = new Float32Array(total);

        this.sAngle = new Float32Array(total);
        this.sRadius = new Float32Array(total);
        this.sProgress = new Float32Array(total);
        this.sSpeed = new Float32Array(total);
        this.sBaseAngle = new Float32Array(total);
        this.sSpread = new Float32Array(total);
        this.sYOffset = new Float32Array(total);
        this.sZOffset = new Float32Array(total);
        this.sInclination = new Float32Array(total);
        this.sStreamIdx = new Uint8Array(total);

        const streamDefs = [];
        for (let si = 0; si < numStreams; si++) {
            streamDefs.push({
                baseAngle: (si / numStreams) * Math.PI * 2 + Utils.rand(-0.4, 0.4),
                inclination: Utils.rand(-1.0, 1.0),
                spread: Utils.rand(2.0, 4.0),
                startR: Utils.rand(9, 14)
            });
        }

        let idx = 0;
        for (let si = 0; si < numStreams; si++) {
            const sd = streamDefs[si];
            for (let j = 0; j < perStream && idx < total; j++) {
                const progress = Math.random();
                const r = sd.startR * (1 - progress * 0.93);
                const angle = sd.baseAngle + progress * Utils.rand(0.5, 1.4);
                const spread = sd.spread * (0.3 + progress * 0.7);
                const yOff = (Math.random() - 0.5) * spread * 0.7;
                const zOff = (Math.random() - 0.5) * spread * 0.5;

                const finalX = Math.cos(angle) * r + Math.cos(angle + Math.PI / 2) * zOff;
                const finalY = yOff + Math.sin(progress * Math.PI) * sd.inclination;
                const finalZ = Math.sin(angle) * r + Math.sin(angle + Math.PI / 2) * zOff;

                positions[idx * 3] = finalX;
                positions[idx * 3 + 1] = finalY;
                positions[idx * 3 + 2] = finalZ;

                const t = Utils.clamp(r / 14.0, 0, 1);
                const cool = t;
                const bVar = Utils.rand(-0.08, 0.08);
                colors[idx * 3] = Utils.clamp(0.15 + (1 - cool) * 0.55 + bVar, 0, 1);
                colors[idx * 3 + 1] = Utils.clamp(0.25 + (1 - cool) * 0.35 + bVar, 0, 1);
                colors[idx * 3 + 2] = Utils.clamp(0.55 + (1 - cool) * 0.25 + bVar, 0, 1);

                sizes[idx] = Utils.rand(0.015, 0.045);

                this.sAngle[idx] = angle;
                this.sRadius[idx] = r;
                this.sProgress[idx] = progress;
                this.sSpeed[idx] = Utils.rand(0.0008, 0.003);
                this.sBaseAngle[idx] = sd.baseAngle;
                this.sSpread[idx] = sd.spread;
                this.sYOffset[idx] = yOff;
                this.sZOffset[idx] = zOff;
                this.sInclination[idx] = sd.inclination;
                this.sStreamIdx[idx] = si;

                idx++;
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions.slice(0, idx * 3), 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors.slice(0, idx * 3), 3));

        const mat = new THREE.PointsMaterial({
            size: 0.035,
            vertexColors: true,
            transparent: true,
            opacity: 0.50,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.streamMesh = new THREE.Points(geo, mat);
        this.group.add(this.streamMesh);
        this.streamGeo = geo;
    }

    /* ===== HORIZONTE DE EVENTOS ===== */

    createEventHorizon() {
        const count = this.horizonCount;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = this.HORIZON_R + Utils.rand(-0.4, 0.4);
            const y = (Math.random() - 0.5) * 0.12;

            positions[i * 3] = Math.cos(angle) * r;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = Math.sin(angle) * r;

            const v = Utils.rand(0, 1);
            colors[i * 3] = 0.03 + v * 0.05;
            colors[i * 3 + 1] = 0.03 + v * 0.04;
            colors[i * 3 + 2] = 0.06 + v * 0.08;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.04,
            vertexColors: true,
            transparent: true,
            opacity: 0.45,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.horizonMesh = new THREE.Points(geo, mat);
        this.group.add(this.horizonMesh);
    }

    /* ===== PARTÍCULAS DE FONDO ===== */

    createBackground() {
        const count = this.bgCount;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = Utils.rand(-40, 40);
            positions[i * 3 + 1] = Utils.rand(-30, 30);
            positions[i * 3 + 2] = Utils.rand(-40, 40);

            const t = Math.random();
            if (t < 0.5) {
                colors[i * 3] = Utils.rand(0.4, 0.7);
                colors[i * 3 + 1] = Utils.rand(0.45, 0.75);
                colors[i * 3 + 2] = Utils.rand(0.7, 1.0);
            } else if (t < 0.8) {
                colors[i * 3] = Utils.rand(0.8, 1.0);
                colors[i * 3 + 1] = Utils.rand(0.7, 0.9);
                colors[i * 3 + 2] = Utils.rand(0.5, 0.7);
            } else {
                colors[i * 3] = Utils.rand(0.9, 1.0);
                colors[i * 3 + 1] = Utils.rand(0.9, 1.0);
                colors[i * 3 + 2] = Utils.rand(0.9, 1.0);
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.03,
            vertexColors: true,
            transparent: true,
            opacity: 0.30,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.bgMesh = new THREE.Points(geo, mat);
        this.scene.add(this.bgMesh);
    }

    /* ===== CHORROS POLARES ===== */

    createJets() {
        const count = this.jetCount;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        this.jHeight = new Float32Array(count);
        this.jSpeed = new Float32Array(count);
        this.jAngle = new Float32Array(count);
        this.jSpread = new Float32Array(count);
        this.jDir = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const dir = i < count / 2 ? 1 : -1;
            const h = Utils.rand(0.3, 8.0) * dir;
            const spread = Utils.rand(0.02, 0.25);
            const angle = Math.random() * Math.PI * 2;

            positions[i * 3] = Math.cos(angle) * spread;
            positions[i * 3 + 1] = h;
            positions[i * 3 + 2] = Math.sin(angle) * spread;

            const intensity = 1.0 - Math.abs(h) / 8.0;
            colors[i * 3] = Utils.clamp(0.3 + intensity * 0.5, 0, 1);
            colors[i * 3 + 1] = Utils.clamp(0.4 + intensity * 0.4, 0, 1);
            colors[i * 3 + 2] = Utils.clamp(0.7 + intensity * 0.3, 0, 1);

            this.jHeight[i] = h;
            this.jSpeed[i] = Utils.rand(0.005, 0.02) * dir;
            this.jAngle[i] = angle;
            this.jSpread[i] = spread;
            this.jDir[i] = dir;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.03,
            vertexColors: true,
            transparent: true,
            opacity: 0.40,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.jetMesh = new THREE.Points(geo, mat);
        this.group.add(this.jetMesh);
        this.jetGeo = geo;
    }

    /* ===== LENTE GRAVITACIONAL ===== */

    createLensing() {
        const count = this.isMobile ? 100 : 250;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Utils.rand(1.6, 2.4);
            const y = (Math.random() - 0.5) * 0.25;

            positions[i * 3] = Math.cos(angle) * r;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = Math.sin(angle) * r;

            colors[i * 3] = Utils.rand(0.2, 0.4);
            colors[i * 3 + 1] = Utils.rand(0.25, 0.45);
            colors[i * 3 + 2] = Utils.rand(0.5, 0.75);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.035,
            vertexColors: true,
            transparent: true,
            opacity: 0.30,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.lensingMesh = new THREE.Points(geo, mat);
        this.group.add(this.lensingMesh);
    }

    /* ===== CORAZON DE PARTICULAS ===== */

    createHeart() {
        const layers = 3;
        const ptsPerLayer = this.isMobile ? 120 : 220;
        const total = layers * ptsPerLayer;
        const positions = new Float32Array(total * 3);
        const colors = new Float32Array(total * 3);

        const scale = 0.065;
        const zSpread = 0.12;
        let idx = 0;

        for (let layer = 0; layer < layers; layer++) {
            const zOff = (layer - (layers - 1) / 2) * zSpread;

            for (let i = 0; i < ptsPerLayer; i++) {
                const t = (i / ptsPerLayer) * Math.PI * 2;
                const hx = 16 * Math.pow(Math.sin(t), 3);
                const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

                const jitter = Utils.rand(-0.15, 0.15);

                positions[idx * 3] = (hx + jitter) * scale;
                positions[idx * 3 + 1] = (hy + jitter) * scale;
                positions[idx * 3 + 2] = zOff + Utils.rand(-0.03, 0.03);

                const glow = Utils.rand(0.7, 1.0);
                colors[idx * 3] = glow;
                colors[idx * 3 + 1] = 0.43 * glow;
                colors[idx * 3 + 2] = 0.78 * glow;

                idx++;
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions.slice(0, idx * 3), 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors.slice(0, idx * 3), 3));

        const mat = new THREE.PointsMaterial({
            size: 0.035,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.heartMesh = new THREE.Points(geo, mat);
        this.group.add(this.heartMesh);
    }

    /* ===== ZOOM ===== */

    setupZoom() {
        this.canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            this.targetZoom += e.deltaY * 0.001;
            this.targetZoom = Utils.clamp(this.targetZoom, 0.5, 2.0);
        }, { passive: false });

        let pinchDist = 0;
        this.canvas.addEventListener("touchstart", (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchDist = Math.sqrt(dx * dx + dy * dy);
            }
        }, { passive: true });

        this.canvas.addEventListener("touchmove", (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const newDist = Math.sqrt(dx * dx + dy * dy);
                this.targetZoom += (pinchDist - newDist) * 0.005;
                this.targetZoom = Utils.clamp(this.targetZoom, 0.5, 2.0);
                pinchDist = newDist;
            }
        }, { passive: true });
    }

    setMouseNorm(x, y) {
        this.mouseNorm.x = (x / window.innerWidth) * 2 - 1;
        this.mouseNorm.y = -(y / window.innerHeight) * 2 + 1;
    }

    /* ===== CLICK ===== */

    checkClick(clientX, clientY) {
        if (!this.isInitialized) return false;
        const nx = (clientX / window.innerWidth) * 2 - 1;
        const ny = -(clientY / window.innerHeight) * 2 + 1;
        const v = new THREE.Vector3(nx, ny, 0.5);
        v.unproject(this.camera);
        const dir = v.sub(this.camera.position).normalize();
        const dist = -this.camera.position.z / dir.z;
        const pt = this.camera.position.clone().add(dir.multiplyScalar(dist));
        const gPt = this.group.worldToLocal(pt.clone());
        const d = Math.sqrt(gPt.x * gPt.x + gPt.z * gPt.z);
        return d < 6.0;
    }

    /* ===== ABSORCION (click) ===== */

    triggerAbsorption() {
        const burst = this.isMobile ? 80 : 200;

        for (let i = 0; i < burst; i++) {
            const idx = Math.floor(Math.random() * this.diskCount);
            this.dRadius[idx] = Utils.rand(0.2, 1.8);
            this.dOmega[idx] *= 3.0;
        }

        for (let i = 0; i < burst; i++) {
            const idx = Math.floor(Math.random() * this.streamCount);
            this.sProgress[idx] = Utils.rand(0.7, 0.95);
            this.sSpeed[idx] *= 3.0;
        }
    }

    triggerMassiveExplosion() {
        for (let i = 0; i < this.diskCount; i++) {
            this.dRadius[i] = Utils.rand(3, 8);
            this.dOmega[i] *= 5.0;
        }
        for (let i = 0; i < this.streamCount; i++) {
            this.sProgress[i] = 0.95;
            this.sSpeed[i] *= 4.0;
        }
        if (this.jetMesh) this.jetMesh.material.opacity = 0.8;
    }

    /* ===== TRIPLE CLICK EN CORAZON ===== */

    checkHeartClick(clientX, clientY) {
        if (!this.isInitialized || !this.heartMesh || this.proposalActive) return false;

        this.mouseVec.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouseVec.y = -(clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouseVec, this.camera);
        return this.raycaster.intersectObject(this.heartMesh).length > 0;
    }

    onHeartClick() {
        if (this.proposalActive) return;

        this.heartClicks++;
        clearTimeout(this.heartClickTimer);
        this.heartClickTimer = setTimeout(() => { this.heartClicks = 0; }, 800);

        if (this.heartClicks >= 3) {
            this.heartClicks = 0;
            this.heartReady = true;
            this.proposalActive = true;
            if (typeof Interactions !== "undefined" && Interactions.showProposal) {
                Interactions.showProposal();
            }
        }
    }

    /* ===== TEXTO CON PARTICULAS ===== */

    getTextPositions(text, count) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 512;
        canvas.height = 128;

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, 512, 128);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 72px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 256, 64);

        const data = ctx.getImageData(0, 0, 512, 128).data;
        const points = [];
        for (let y = 0; y < 128; y += 2) {
            for (let x = 0; x < 512; x += 2) {
                if (data[(y * 512 + x) * 4] > 128) {
                    points.push({
                        x: (x - 256) / 256 * 4.5,
                        y: -(y - 64) / 64 * 1.2
                    });
                }
            }
        }

        const result = [];
        for (let i = 0; i < count; i++) {
            const p = points[Math.floor(Math.random() * points.length)];
            result.push({ x: p.x, y: p.y, z: Utils.rand(-0.1, 0.1) });
        }
        return result;
    }

    triggerTextFormation(text, callback) {
        const count = this.isMobile ? 300 : 600;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const targets = this.getTextPositions(text, count);
        const velocities = [];

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const angle = Math.random() * Math.PI * 2;
            const r = Utils.rand(0.5, 3.0);
            positions[i3] = Math.cos(angle) * r;
            positions[i3 + 1] = Math.sin(angle) * r;
            positions[i3 + 2] = Utils.rand(-1, 1);

            colors[i3] = 1.0;
            colors[i3 + 1] = 0.43;
            colors[i3 + 2] = 0.78;

            velocities.push({
                vx: Utils.rand(-0.05, 0.05),
                vy: Utils.rand(-0.05, 0.05),
                vz: Utils.rand(-0.02, 0.02)
            });
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.045,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const mesh = new THREE.Points(geo, mat);
        this.scene.add(mesh);

        this.textAnim = {
            mesh: mesh,
            geo: geo,
            mat: mat,
            positions: positions,
            targets: targets,
            velocities: velocities,
            count: count,
            phase: "explode",
            timer: 0,
            holdTime: 3000,
            callback: callback
        };

        this.setParticlesFrozen(true);
    }

    updateTextFormation(dt) {
        if (!this.textAnim) return;
        const a = this.textAnim;
        const pos = a.positions;

        a.timer += dt;

        if (a.phase === "explode") {
            for (let i = 0; i < a.count; i++) {
                const i3 = i * 3;
                pos[i3] += a.velocities[i].vx;
                pos[i3 + 1] += a.velocities[i].vy;
                pos[i3 + 2] += a.velocities[i].vz;
                a.velocities[i].vx *= 0.97;
                a.velocities[i].vy *= 0.97;
                a.velocities[i].vz *= 0.97;
            }
            if (a.timer > 1200) {
                a.phase = "form";
                a.timer = 0;
            }
        } else if (a.phase === "form") {
            const t = Math.min(a.timer / 1500, 1.0);
            const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            for (let i = 0; i < a.count; i++) {
                const i3 = i * 3;
                const tgt = a.targets[i];
                pos[i3] += (tgt.x - pos[i3]) * ease * 0.08;
                pos[i3 + 1] += (tgt.y - pos[i3 + 1]) * ease * 0.08;
                pos[i3 + 2] += (tgt.z - pos[i3 + 2]) * ease * 0.08;
            }
            if (a.timer > 1500) {
                a.phase = "hold";
                a.timer = 0;
            }
        } else if (a.phase === "hold") {
            for (let i = 0; i < a.count; i++) {
                const i3 = i * 3;
                pos[i3 + 1] += Math.sin(this.time * 2 + i * 0.1) * 0.0003;
            }
            if (a.timer > a.holdTime) {
                a.phase = "fade";
                a.timer = 0;
            }
        } else if (a.phase === "fade") {
            a.mat.opacity = Math.max(0, 1.0 - a.timer / 1500);
            if (a.timer > 1500) {
                this.scene.remove(a.mesh);
                a.mesh.geometry.dispose();
                a.mesh.material.dispose();
                this.textAnim = null;
                this.setParticlesFrozen(false);
                if (a.callback) a.callback();
                return;
            }
        }

        a.geo.attributes.position.needsUpdate = true;
    }

    /* ===== UPDATE ===== */

    update(dt) {
        if (!this.isInitialized) return;

        this.time += dt * 0.001;

        const sm = this.isMobile ? 0.035 : 0.055;
        const damping = 0.88;

        if (this.isInteracting) {
            this.targetYaw = this.mouseNorm.x * Math.PI;
            this.targetPitch = (1 - this.mouseNorm.y) * Math.PI * 0.5;
        }

        this.velocityYaw += (this.targetYaw - this.yaw) * sm;
        this.velocityPitch += (this.targetPitch - this.pitch) * sm;
        this.yaw += this.velocityYaw;
        this.pitch += this.velocityPitch;
        this.pitch = Utils.clamp(this.pitch, 0.02, Math.PI - 0.02);

        this.velocityYaw *= damping;
        this.velocityPitch *= damping;

        if (!this.isInteracting) {
            this.idleTimer += dt;
            if (this.idleTimer > 2000) {
                this.yaw += this.autoRotateSpeed;
            }
        }

        this.zoom = Utils.lerp(this.zoom, this.targetZoom, 0.05);
        this.orbitRadius = 10 / this.zoom;

        const sinP = Math.sin(this.pitch);
        const cosP = Math.cos(this.pitch);
        const sinY = Math.sin(this.yaw);
        const cosY = Math.cos(this.yaw);

        this.camera.position.set(
            this.orbitRadius * sinP * sinY,
            this.orbitRadius * cosP,
            this.orbitRadius * sinP * cosY
        );

        this.camera.lookAt(0, 0, 0);

        if (Math.abs(this.pitch) < 0.15 || Math.abs(this.pitch - Math.PI) < 0.15) {
            this.camera.up.set(0, 0, sinY > 0 ? -1 : 1);
        } else {
            this.camera.up.set(0, 1, 0);
        }

        this.updateDisk();
        this.updateStreams();
        this.updateJets();
        this.horizonMesh.rotation.y += 0.0003;
        if (this.heartMesh) this.heartMesh.rotation.y += 0.004;
        this.updateLensing();
        this.updateTextFormation(dt);
        this.updateParticleFade(dt);
    }

    setParticlesFrozen(frozen) {
        this.particlesFrozen = frozen;
        if (!frozen) {
            this.particlesFade = 0;
            if (this.diskMesh) this.diskMesh.material.opacity = 0.9;
            if (this.streamMesh) this.streamMesh.material.opacity = 0.5;
            if (this.backgroundMesh) this.backgroundMesh.material.opacity = 0.25;
            if (this.horizonMesh) this.horizonMesh.material.opacity = 0.5;
            if (this.jetMesh) this.jetMesh.material.opacity = 0.4;
            if (this.lensingMesh) this.lensingMesh.material.opacity = 0.3;
        }
    }

    updateParticleFade(dt) {
        if (!this.particlesFrozen) return;
        this.particlesFade = Math.min(this.particlesFade + dt * 0.0015, 1.0);
        const o = 1.0 - this.particlesFade;
        if (this.diskMesh) this.diskMesh.material.opacity = 0.9 * o;
        if (this.streamMesh) this.streamMesh.material.opacity = 0.5 * o;
        if (this.backgroundMesh) this.backgroundMesh.material.opacity = 0.25 * o;
        if (this.horizonMesh) this.horizonMesh.material.opacity = 0.5 * o;
        if (this.jetMesh) this.jetMesh.material.opacity = 0.4 * o;
        if (this.lensingMesh) this.lensingMesh.material.opacity = 0.3 * o;
    }

    updateDisk() {
        if (!this.diskMesh) return;
        const pos = this.diskMesh.geometry.attributes.position.array;
        const col = this.diskMesh.geometry.attributes.color.array;

        for (let i = 0; i < this.diskCount; i++) {
            const i3 = i * 3;
            let angle = this.dAngle[i];
            let r = this.dRadius[i];
            let y = this.dY[i];
            const omega = this.dOmega[i] * this.speedMultiplier;

            angle += omega;
            r -= 0.0004 * this.speedMultiplier;
            y += this.dYDrift[i];

            if (r < this.HORIZON_R || Math.abs(y) > 1.2) {
                r = Utils.rand(5.0, 8.3);
                angle = Math.random() * Math.PI * 2;
                const baseT = 0.12 + (r - 1.8) * 0.065;
                y = (Math.random() - 0.5) * (baseT + Math.random() * baseT * 1.2);
                this.dOmega[i] = 0.35 / Math.pow(r, 1.5);
                this.dYDrift[i] = Utils.rand(-0.0001, 0.0001);
            }

            this.dAngle[i] = angle;
            this.dRadius[i] = r;
            this.dY[i] = y;

            const jitter = Math.sin(this.time * 2.0 + i * 0.3) * 0.02;
            pos[i3] = Math.cos(angle) * r;
            pos[i3 + 1] = y + jitter;
            pos[i3 + 2] = Math.sin(angle) * r;

            const t = Utils.clamp((r - 1.5) / 7.0, 0, 1);
            const [cr, cg, cb] = this.tempToColor(t);
            const v = Utils.rand(-0.02, 0.02);
            col[i3] = Utils.clamp(cr + v, 0, 1);
            col[i3 + 1] = Utils.clamp(cg + v, 0, 1);
            col[i3 + 2] = Utils.clamp(cb + v, 0, 1);
        }

        this.diskMesh.geometry.attributes.position.needsUpdate = true;
        this.diskMesh.geometry.attributes.color.needsUpdate = true;
    }

    updateStreams() {
        if (!this.streamMesh) return;
        const pos = this.streamGeo.attributes.position.array;
        const col = this.streamGeo.attributes.color.array;

        for (let i = 0; i < this.streamCount; i++) {
            const i3 = i * 3;
            let progress = this.sProgress[i];
            let r = this.sRadius[i];
            let angle = this.sAngle[i];
            let speed = this.sSpeed[i];

            progress += speed * 0.5 * this.speedMultiplier;
            r -= speed * 8.0 * this.speedMultiplier;
            angle += speed * 1.5 * this.speedMultiplier;

            if (r < 0.3 || progress > 1.0) {
                const si = this.sStreamIdx[i];
                const numStreams = this.isMobile ? 6 : 8;
                const sd = this._streamDefs || this._initStreamDefs(numStreams);
                const def = sd[si];

                progress = Utils.rand(0, 0.1);
                r = def.startR;
                angle = def.baseAngle + Utils.rand(-0.4, 0.4);
                this.sYOffset[i] = (Math.random() - 0.5) * def.spread * 0.6;
                this.sZOffset[i] = (Math.random() - 0.5) * def.spread * 0.4;
                speed = Utils.rand(0.0008, 0.003);
            }

            this.sProgress[i] = progress;
            this.sRadius[i] = r;
            this.sAngle[i] = angle;
            this.sSpeed[i] = speed;

            const spread = this.sSpread[i] * (0.2 + progress * 0.8);
            const yJitter = Math.sin(this.time * 1.5 + i * 0.7) * spread * 0.15;
            const zJitter = Math.cos(this.time * 1.2 + i * 0.9) * spread * 0.10;

            const px = Math.cos(angle) * r + Math.cos(angle + Math.PI / 2) * (this.sZOffset[i] + zJitter);
            const py = this.sYOffset[i] + yJitter + Math.sin(progress * Math.PI) * this.sInclination[i];
            const pz = Math.sin(angle) * r + Math.sin(angle + Math.PI / 2) * (this.sZOffset[i] + zJitter);

            pos[i3] = px;
            pos[i3 + 1] = py;
            pos[i3 + 2] = pz;

            const t = Utils.clamp(r / 13.0, 0, 1);
            const heat = 1 - t;
            col[i3] = 0.15 + heat * 0.75;
            col[i3 + 1] = 0.25 + heat * 0.50;
            col[i3 + 2] = 0.55 + heat * 0.20;
        }

        this.streamGeo.attributes.position.needsUpdate = true;
        this.streamGeo.attributes.color.needsUpdate = true;
    }

    updateJets() {
        if (!this.jetMesh) return;
        const pos = this.jetGeo.attributes.position.array;
        const col = this.jetGeo.attributes.color.array;

        for (let i = 0; i < this.jetCount; i++) {
            const i3 = i * 3;
            let h = this.jHeight[i];
            const speed = this.jSpeed[i];
            const dir = this.jDir[i];
            const maxH = 8.0;

            h += speed;
            this.jAngle[i] += 0.01;
            const spread = this.jSpread[i] * (0.3 + Math.abs(h) / maxH * 0.7);
            const wobble = Math.sin(this.time * 3.0 + i * 0.5) * spread * 0.3;

            if (Math.abs(h) > maxH) {
                h = Utils.rand(0.2, 1.0) * dir;
                this.jSpread[i] = Utils.rand(0.02, 0.25);
                this.jAngle[i] = Math.random() * Math.PI * 2;
            }

            this.jHeight[i] = h;

            pos[i3] = Math.cos(this.jAngle[i]) * spread + wobble;
            pos[i3 + 1] = h;
            pos[i3 + 2] = Math.sin(this.jAngle[i]) * spread + wobble;

            const intensity = 1.0 - Math.abs(h) / maxH;
            col[i3] = Utils.clamp(0.3 + intensity * 0.5, 0, 1);
            col[i3 + 1] = Utils.clamp(0.4 + intensity * 0.4, 0, 1);
            col[i3 + 2] = Utils.clamp(0.7 + intensity * 0.3, 0, 1);
        }

        this.jetGeo.attributes.position.needsUpdate = true;
        this.jetGeo.attributes.color.needsUpdate = true;
    }

    _initStreamDefs(numStreams) {
        this._streamDefs = [];
        for (let si = 0; si < numStreams; si++) {
            this._streamDefs.push({
                baseAngle: (si / numStreams) * Math.PI * 2 + Utils.rand(-0.4, 0.4),
                inclination: Utils.rand(-1.0, 1.0),
                spread: Utils.rand(2.0, 4.0),
                startR: Utils.rand(9, 14)
            });
        }
        return this._streamDefs;
    }

    updateLensing() {
        if (!this.lensingMesh) return;
        const pos = this.lensingMesh.geometry.attributes.position.array;
        const t = this.time;

        for (let i = 0; i < this.lensingMesh.geometry.attributes.position.count; i++) {
            const i3 = i * 3;
            const baseR = 1.6 + (i % 5) * 0.16;
            const angle = t * 0.3 + i * 0.13;
            const yOsc = Math.sin(t * 0.8 + i * 0.3) * 0.1;

            pos[i3] = Math.cos(angle) * baseR;
            pos[i3 + 1] = yOsc;
            pos[i3 + 2] = Math.sin(angle) * baseR;
        }

        this.lensingMesh.geometry.attributes.position.needsUpdate = true;
    }

    /* ===== RENDER ===== */

    render() {
        if (!this.isInitialized) return;
        this.renderer.render(this.scene, this.camera);
    }

    resize() {
        if (!this.isInitialized) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }
}
