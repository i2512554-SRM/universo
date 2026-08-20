/**
 * Sistema de musica minimalista
 * Persiste estado play/pause durante la sesion (sessionStorage)
 */
const MusicPlayer = {

    el: null,
    playing: false,
    btnPlay: null,
    barsEl: null,
    nameEl: null,
    STORAGE_KEY: "universo-music",

    init() {
        this.btnPlay = document.getElementById("btn-play");
        this.barsEl = document.querySelector(".music-bars");
        this.nameEl = document.getElementById("music-name");
        this.nameEl.textContent = CONFIG.musica.nombre;
        this.btnPlay.addEventListener("click", () => this.toggle());

        if (sessionStorage.getItem(this.STORAGE_KEY) === "playing") {
            this.play();
        }
    },

    createAudio() {
        if (this.el) return;
        this.el = new window.Audio();
        this.el.src = CONFIG.musica.archivo;
        this.el.volume = CONFIG.musica.volumen;
        this.el.loop = true;
    },

    toggle() {
        this.playing ? this.pause() : this.play();
    },

    play() {
        this.createAudio();
        this.el.play().then(() => {
            this.playing = true;
            this.btnPlay.textContent = "\u23F8";
            this.barsEl.classList.add("playing");
            sessionStorage.setItem(this.STORAGE_KEY, "playing");
        }).catch(() => {});
    },

    pause() {
        if (!this.el) return;
        this.el.pause();
        this.playing = false;
        this.btnPlay.textContent = "\u25B6";
        this.barsEl.classList.remove("playing");
        sessionStorage.setItem(this.STORAGE_KEY, "paused");
    },

    show() {
        document.getElementById("music-player").classList.add("visible");
    }
};
