/**
 * MusicPlayer — reproductor compacto con playlist
 * Boton ♫ minimalista que expande panel flotante.
 * Persiste estado durante la sesion (sessionStorage).
 * Si un archivo no existe, lo omite sin errores visibles.
 */
const MusicPlayer = {

    el: null,
    playing: false,
    currentIdx: 0,
    playlist: [],
    STORAGE_KEY: "universo-music",
    STORAGE_IDX: "universo-music-idx",
    STORAGE_VOL: "universo-music-vol",
    ready: false,

    /* ---- init ---- */
    init() {
        this.loadPlaylist();
        this.cacheDOM();
        this.bindEvents();
        this.restoreState();
    },

    loadPlaylist() {
        const valid = [];
        for (const track of MEDIA_CONFIG.playlist) {
            if (track && track.file) {
                valid.push({ title: track.title || "Sin titulo", file: track.file });
            }
        }
        this.playlist = valid;
    },

    cacheDOM() {
        this.toggleWrap = document.getElementById("music-toggle");
        this.toggleBtn = document.getElementById("player-toggle");
        this.panel = document.getElementById("player-panel");
        this.closeBtn = document.getElementById("player-close");
        this.playBtn = document.getElementById("player-play");
        this.prevBtn = document.getElementById("player-prev");
        this.nextBtn = document.getElementById("player-next");
        this.progress = document.getElementById("player-progress");
        this.progressFill = document.getElementById("player-progress-fill");
        this.progressWrap = document.getElementById("player-progress-wrap");
        this.timeEl = document.getElementById("player-time");
        this.titleEl = document.getElementById("player-title");
        this.volumeSlider = document.getElementById("player-volume");
        this.playlistEl = document.getElementById("player-playlist");
        this.shuffleBtn = document.getElementById("player-shuffle");
        this.repeatBtn = document.getElementById("player-repeat");
    },

    bindEvents() {
        this.toggleBtn.addEventListener("click", () => this.open());
        this.closeBtn.addEventListener("click", () => this.close());
        this.playBtn.addEventListener("click", () => this.togglePlay());
        this.prevBtn.addEventListener("click", () => this.prev());
        this.nextBtn.addEventListener("click", () => this.next());
        this.shuffleBtn.addEventListener("click", () => this.toggleShuffle());
        this.repeatBtn.addEventListener("click", () => this.toggleRepeat());

        this.progressWrap.addEventListener("click", (e) => {
            if (!this.el) return;
            const rect = this.progressWrap.getBoundingClientRect();
            const pct = Utils.clamp((e.clientX - rect.left) / rect.width, 0, 1);
            this.el.currentTime = pct * this.el.duration;
        });

        this.volumeSlider.addEventListener("input", (e) => {
            const v = parseFloat(e.target.value);
            if (this.el) this.el.volume = v;
            sessionStorage.setItem(this.STORAGE_VOL, String(v));
        });

        this.renderPlaylist();
    },

    restoreState() {
        const vol = sessionStorage.getItem(this.STORAGE_VOL);
        const volVal = vol !== null ? parseFloat(vol) : MEDIA_CONFIG.defaultVolume;
        this.volumeSlider.value = volVal;

        const savedIdx = sessionStorage.getItem(this.STORAGE_IDX);
        if (savedIdx !== null) this.currentIdx = parseInt(savedIdx, 10) || 0;
        if (this.currentIdx >= this.playlist.length) this.currentIdx = 0;

        this.updateTitle();
    },

    /* ---- audio ---- */
    createAudio() {
        if (this.el) return;
        this.el = new window.Audio();
        this.el.volume = parseFloat(this.volumeSlider.value);
        this.el.addEventListener("timeupdate", () => this.onTimeUpdate());
        this.el.addEventListener("ended", () => this.onEnded());
        this.el.addEventListener("error", () => this.onError());
    },

    loadTrack(idx) {
        if (!this.playlist.length) return;
        this.currentIdx = ((idx % this.playlist.length) + this.playlist.length) % this.playlist.length;
        sessionStorage.setItem(this.STORAGE_IDX, String(this.currentIdx));
        this.updateTitle();
        this.renderPlaylist();
        if (this.el) {
            this.el.src = this.playlist[this.currentIdx].file;
            this.el.load();
        }
    },

    onError() {
        this.errorCount = (this.errorCount || 0) + 1;
        if (this.errorCount >= this.playlist.length) {
            this.errorCount = 0;
            this.pause();
            return;
        }
    },

    /* ---- controls ---- */
    togglePlay() {
        this.playing ? this.pause() : this.play();
    },

    play() {
        this.createAudio();
        this.errorCount = 0;
        if (!this.el.src || this.el.src === location.href) {
            this.el.src = this.playlist[this.currentIdx].file;
        }
        this.el.play().then(() => {
            this.playing = true;
            this.playBtn.innerHTML = "&#9646;&#9646;";
            this.toggleBtn.classList.add("playing");
            sessionStorage.setItem(this.STORAGE_KEY, "playing");
        }).catch(() => {});
    },

    pause() {
        if (!this.el) return;
        this.el.pause();
        this.playing = false;
        this.playBtn.innerHTML = "&#9654;";
        this.toggleBtn.classList.remove("playing");
        sessionStorage.setItem(this.STORAGE_KEY, "paused");
    },

    next() {
        const wasPlaying = this.playing;
        if (this.shuffle) {
            let r;
            do { r = Math.floor(Math.random() * this.playlist.length); }
            while (r === this.currentIdx && this.playlist.length > 1);
            this.loadTrack(r);
        } else {
            this.loadTrack(this.currentIdx + 1);
        }
        if (wasPlaying) this.play();
    },

    prev() {
        if (this.el && this.el.currentTime > 3) {
            this.el.currentTime = 0;
            return;
        }
        const wasPlaying = this.playing;
        this.loadTrack(this.currentIdx - 1);
        if (wasPlaying) this.play();
    },

    toggleShuffle() {
        this.shuffle = !this.shuffle;
        this.shuffleBtn.classList.toggle("active", this.shuffle);
    },

    toggleRepeat() {
        this.repeat = !this.repeat;
        this.repeatBtn.classList.toggle("active", this.repeat);
        if (this.el) this.el.loop = this.repeat;
    },

    /* ---- time update ---- */
    onTimeUpdate() {
        if (!this.el || !this.el.duration) return;
        const pct = this.el.currentTime / this.el.duration;
        this.progressFill.style.width = (pct * 100) + "%";
        this.timeEl.textContent = this.fmt(this.el.currentTime) + " / " + this.fmt(this.el.duration);
    },

    onEnded() {
        if (this.repeat) return;
        if (this.currentIdx < this.playlist.length - 1 || this.shuffle) {
            this.next();
        } else {
            this.pause();
            this.el.currentTime = 0;
            this.progressFill.style.width = "0%";
        }
    },

    fmt(s) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return m + ":" + (sec < 10 ? "0" : "") + sec;
    },

    /* ---- UI ---- */
    updateTitle() {
        if (this.playlist[this.currentIdx]) {
            this.titleEl.textContent = this.playlist[this.currentIdx].title;
        }
    },

    renderPlaylist() {
        this.playlistEl.innerHTML = "";
        for (let i = 0; i < this.playlist.length; i++) {
            const li = document.createElement("div");
            li.className = "player-track" + (i === this.currentIdx ? " active" : "");
            li.textContent = this.playlist[i].title;
            li.addEventListener("click", () => {
                this.loadTrack(i);
                this.play();
            });
            this.playlistEl.appendChild(li);
        }
    },

    open() {
        this.panel.classList.add("open");
        this.toggleBtn.classList.add("hidden");
    },

    close() {
        this.panel.classList.remove("open");
        this.toggleBtn.classList.remove("hidden");
    },

    show() {
        this.toggleWrap.classList.add("visible");
    }
};
