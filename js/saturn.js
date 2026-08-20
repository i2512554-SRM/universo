/**
 * Saturno 3D interactivo formado por particulas
 * Three.js + PointsMaterial + BufferGeometry
 */

class Saturn {
    constructor(canvas) {
        this.canvas = canvas;
        this.isMobile = Utils.isMobile();

        this.quality = this.isMobile ? 0.4 : 1.0;
        if (!this.isMobile && window.innerWidth < 1200) this.quality = 0.7;

        this.planetCount = Math.floor((this.isMobile ? 6000 : 14000) * this.quality);
        this.ringCount = Math.floor((this.isMobile ? 3000 : 8000) * this.quality);
        this.dustCount = Math.floor((this.isMobile ? 80 : 200) * this.quality);

        this.mouseNorm = { x: 0, y: 0 };
        this.targetRotY = 0;
        this.targetRotX = 0;
        this.currentRotY = 0;
        this.currentRotX = 0;
        this.velocityY = 0;
        this.velocityX = 0;
        this.autoRotateSpeed = 0.001;
        this.isInteracting = false;
        this.idleTimer = 0;
        this.zoom = 1;
        this.targetZoom = 1;
        this.isInitialized = false;
        this.explosions = [];
        this._basePlanetColors = null;

        this.setup();
    }

    setup() {
        this.scene = new THREE.Scene();

        const w = window.innerWidth;
        const h = window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
        this.camera.position.set(0, 0, 10);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: !this.isMobile,
            alpha: true
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);

        this.raycaster = new THREE.Raycaster();
        this.mouseVec = new THREE.Vector2();

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.createPlanet();
        this.createRings();
        this.createDust();
        this.setupInput();
        this.isInitialized = true;
    }

    /* ===== PLANETA ===== */

    createPlanet() {
        const count = this.planetCount;
        const radius = 2.6;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        const palette = [
            { r: 0.92, g: 0.82, b: 0.60 },
            { r: 0.88, g: 0.76, b: 0.52 },
            { r: 0.85, g: 0.72, b: 0.48 },
            { r: 0.80, g: 0.68, b: 0.45 },
            { r: 0.78, g: 0.65, b: 0.50 },
            { r: 0.90, g: 0.80, b: 0.55 },
            { r: 0.82, g: 0.70, b: 0.42 }
        ];

        for (let i = 0; i < count; i++) {
            const phi = Math.acos(1 - 2 * (i + 0.5) / count);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);

            const lat = Math.abs(Math.cos(phi));
            const band = Math.floor(lat * 5.5 + Math.sin(theta * 3) * 0.6) % palette.length;
            const c = palette[Math.abs(band)];
            const v = Utils.rand(-0.04, 0.04);
            colors[i * 3] = Utils.clamp(c.r + v, 0, 1);
            colors[i * 3 + 1] = Utils.clamp(c.g + v, 0, 1);
            colors[i * 3 + 2] = Utils.clamp(c.b + v, 0, 1);

            sizes[i] = Utils.rand(0.025, 0.065) * this.quality;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.06,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true,
            depthWrite: true,
            blending: THREE.NormalBlending
        });

        this.planetMesh = new THREE.Points(geo, mat);
        this.group.add(this.planetMesh);
        this.planetRadius = radius;
    }

    /* ===== ANILLOS ===== */

    createRings() {
        const bands = [
            { inner: 3.4,  outer: 3.9,  density: 0.25, size: 0.030, color: [0.90, 0.85, 0.75] },
            { inner: 4.05, outer: 4.55, density: 0.75, size: 0.042, color: [0.88, 0.82, 0.70] },
            { inner: 4.7,  outer: 5.15, density: 0.55, size: 0.035, color: [0.85, 0.78, 0.65] },
            { inner: 5.3,  outer: 5.9,  density: 0.85, size: 0.048, color: [0.92, 0.86, 0.72] },
            { inner: 6.05, outer: 6.35, density: 0.35, size: 0.028, color: [0.80, 0.74, 0.62] },
            { inner: 6.5,  outer: 7.0,  density: 0.60, size: 0.038, color: [0.86, 0.80, 0.68] }
        ];

        const total = this.ringCount;
        const positions = new Float32Array(total * 3);
        const colors = new Float32Array(total * 3);
        const totalDensity = bands.reduce((s, b) => s + b.density, 0);

        let idx = 0;
        for (const band of bands) {
            const n = Math.floor(total * band.density / totalDensity);
            for (let j = 0; j < n && idx < total; j++) {
                const angle = Math.random() * Math.PI * 2;
                const r = band.inner + Math.random() * (band.outer - band.inner);

                positions[idx * 3] = Math.cos(angle) * r;
                positions[idx * 3 + 1] = (Math.random() - 0.5) * 0.08;
                positions[idx * 3 + 2] = Math.sin(angle) * r;

                const v = Utils.rand(-0.06, 0.06);
                colors[idx * 3] = Utils.clamp(band.color[0] + v, 0, 1);
                colors[idx * 3 + 1] = Utils.clamp(band.color[1] + v, 0, 1);
                colors[idx * 3 + 2] = Utils.clamp(band.color[2] + v, 0, 1);
                idx++;
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions.slice(0, idx * 3), 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors.slice(0, idx * 3), 3));

        const mat = new THREE.PointsMaterial({
            size: 0.04,
            vertexColors: true,
            transparent: true,
            opacity: 0.65,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        });

        this.ringMesh = new THREE.Points(geo, mat);
        this.ringMesh.rotation.x = -0.35;
        this.group.add(this.ringMesh);

        this.ringOriginalColors = new Float32Array(colors.slice(0, idx * 3));
    }

    /* ===== POLVO EXTERIOR ===== */

    createDust() {
        const count = this.dustCount;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        const dc = [[0.6, 0.7, 0.9], [0.7, 0.6, 0.9], [0.8, 0.8, 0.9], [0.9, 0.85, 0.7]];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = Utils.rand(-25, 25);
            positions[i * 3 + 1] = Utils.rand(-18, 18);
            positions[i * 3 + 2] = Utils.rand(-25, 25);

            const c = Utils.pick(dc);
            colors[i * 3] = c[0];
            colors[i * 3 + 1] = c[1];
            colors[i * 3 + 2] = c[2];
        }

        this.dustGeo = new THREE.BufferGeometry();
        this.dustGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        this.dustGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.03,
            vertexColors: true,
            transparent: true,
            opacity: 0.25,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.dustMesh = new THREE.Points(this.dustGeo, mat);
        this.scene.add(this.dustMesh);
    }

    /* ===== INPUT ===== */

    setupInput() {
        document.addEventListener("mousemove", (e) => {
            this.mouseNorm.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseNorm.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.isInteracting = true;
            this.idleTimer = 0;
        });

        document.addEventListener("mouseleave", () => {
            this.isInteracting = false;
        });

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
            } else if (e.touches.length === 1) {
                this.mouseNorm.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
                this.mouseNorm.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
                this.isInteracting = true;
                this.idleTimer = 0;
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
            } else if (e.touches.length === 1) {
                this.mouseNorm.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
                this.mouseNorm.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
            }
        }, { passive: true });

        this.canvas.addEventListener("touchend", () => {
            this.isInteracting = false;
        }, { passive: true });
    }

    setMouseNorm(x, y) {
        this.mouseNorm.x = (x / window.innerWidth) * 2 - 1;
        this.mouseNorm.y = -(y / window.innerHeight) * 2 + 1;
    }

    /* ===== CLICK / TAP ===== */

    checkClick(clientX, clientY) {
        if (!this.isInitialized) return false;
        this.mouseVec.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouseVec.y = -(clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouseVec, this.camera);
        return this.raycaster.intersectObject(this.planetMesh).length > 0;
    }

    triggerExplosion() {
        const count = this.isMobile ? 250 : 500;
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const speed = Utils.rand(0.01, 0.08);

            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
            velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
            velocities[i * 3 + 2] = Math.cos(phi) * speed;

            const c = Utils.pick([[1, 0.85, 0.4], [1, 0.75, 0.3], [0.95, 0.9, 0.6], [1, 1, 0.8]]);
            colors[i * 3] = c[0];
            colors[i * 3 + 1] = c[1];
            colors[i * 3 + 2] = c[2];
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const mesh = new THREE.Points(geo, mat);
        this.group.add(mesh);
        this.explosions.push({ mesh, velocities, life: 1.0, positions });
    }

    /* ===== UPDATE ===== */

    update(dt) {
        if (!this.isInitialized) return;

        const sm = this.isMobile ? 0.04 : 0.06;

        if (this.isInteracting) {
            this.targetRotY = this.mouseNorm.x * Math.PI * 0.5;
            this.targetRotX = this.mouseNorm.y * Math.PI * 0.15;
        }

        this.velocityY += (this.targetRotY - this.currentRotY) * sm;
        this.velocityX += (this.targetRotX - this.currentRotX) * sm;
        this.currentRotY += this.velocityY;
        this.currentRotX += this.velocityX;
        this.currentRotX = Utils.clamp(this.currentRotX, -0.6, 0.6);

        this.velocityY *= 0.92;
        this.velocityX *= 0.92;

        if (!this.isInteracting) {
            this.idleTimer += dt;
            if (this.idleTimer > 2000) {
                this.currentRotY += this.autoRotateSpeed;
            }
        }

        this.group.rotation.y = this.currentRotY;
        this.group.rotation.x = this.currentRotX;

        this.zoom = Utils.lerp(this.zoom, this.targetZoom, 0.05);
        this.camera.position.z = 10 / this.zoom;

        this.updatePlanetLighting();
        this.updateRingLighting();
        this.updateDust();
        this.updateExplosions();
    }

    /* ===== ILUMINACION ===== */

    _getLightDir() {
        const t = Date.now() * 0.0003;
        let lx = Math.cos(t) * 0.7;
        let ly = 0.45;
        let lz = Math.sin(t) * 0.55;
        const len = Math.sqrt(lx * lx + ly * ly + lz * lz);
        lx /= len; ly /= len; lz /= len;

        // Transformar a espacio local del grupo
        const gy = -this.group.rotation.y;
        const cosY = Math.cos(gy), sinY = Math.sin(gy);
        const t1 = lx * cosY + lz * sinY;
        const t2 = -lx * sinY + lz * cosY;
        lx = t1; lz = t2;

        const gx = -this.group.rotation.x;
        const cosX = Math.cos(gx), sinX = Math.sin(gx);
        const t3 = ly * cosX - lz * sinX;
        lz = ly * sinX + lz * cosX;
        ly = t3;

        return { x: lx, y: ly, z: lz };
    }

    updatePlanetLighting() {
        if (!this.planetMesh) return;
        const pos = this.planetMesh.geometry.attributes.position.array;
        const col = this.planetMesh.geometry.attributes.color.array;
        const count = this.planetCount;

        if (!this._basePlanetColors) {
            this._basePlanetColors = new Float32Array(col);
        }

        const l = this._getLightDir();

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const nx = pos[i3], ny = pos[i3 + 1], nz = pos[i3 + 2];
            const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            const dot = (nx / nLen) * l.x + (ny / nLen) * l.y + (nz / nLen) * l.z;
            const light = Utils.clamp(dot * 0.45 + 0.55, 0.12, 1.0);

            col[i3] = this._basePlanetColors[i3] * light;
            col[i3 + 1] = this._basePlanetColors[i3 + 1] * light;
            col[i3 + 2] = this._basePlanetColors[i3 + 2] * light;
        }

        this.planetMesh.geometry.attributes.color.needsUpdate = true;
    }

    updateRingLighting() {
        if (!this.ringMesh) return;
        const pos = this.ringMesh.geometry.attributes.position.array;
        const col = this.ringMesh.geometry.attributes.color.array;
        const base = this.ringOriginalColors;
        const count = pos.length / 3;

        const l = this._getLightDir();

        // Adicional: inversa de la rotacion del anillo
        const rr = 0.35;
        const cosR = Math.cos(rr), sinR = Math.sin(rr);
        const ry = l.y * cosR - l.z * sinR;
        const rz = l.y * sinR + l.z * cosR;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const nx = pos[i3], nz = pos[i3 + 2];
            const nLen = Math.sqrt(nx * nx + nz * nz) || 1;
            const dot = (nx / nLen) * l.x + (nz / nLen) * rz;
            const light = Utils.clamp(dot * 0.3 + 0.7, 0.35, 1.0);

            col[i3] = base[i3] * light;
            col[i3 + 1] = base[i3 + 1] * light;
            col[i3 + 2] = base[i3 + 2] * light;
        }

        this.ringMesh.geometry.attributes.color.needsUpdate = true;
    }

    updateDust() {
        if (!this.dustMesh) return;
        const pos = this.dustGeo.attributes.position.array;
        const t = Date.now() * 0.0001;
        for (let i = 0; i < this.dustCount; i++) {
            const i3 = i * 3;
            pos[i3] += Math.sin(t + i * 0.5) * 0.002;
            pos[i3 + 1] += Math.cos(t + i * 0.3) * 0.0015;
            pos[i3 + 2] += Math.sin(t + i * 0.7) * 0.001;
        }
        this.dustGeo.attributes.position.needsUpdate = true;
    }

    updateExplosions() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            const pos = exp.mesh.geometry.attributes.position.array;
            const vel = exp.velocities;
            const count = pos.length / 3;

            for (let j = 0; j < count; j++) {
                const j3 = j * 3;
                pos[j3] += vel[j3];
                pos[j3 + 1] += vel[j3 + 1];
                pos[j3 + 2] += vel[j3 + 2];
                vel[j3] *= 0.98;
                vel[j3 + 1] *= 0.98;
                vel[j3 + 2] *= 0.98;
            }

            exp.life -= 0.015;
            exp.mesh.material.opacity = Math.max(0, exp.life);
            exp.mesh.geometry.attributes.position.needsUpdate = true;

            if (exp.life <= 0) {
                this.group.remove(exp.mesh);
                exp.mesh.geometry.dispose();
                exp.mesh.material.dispose();
                this.explosions.splice(i, 1);
            }
        }
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
