/**
 * ============================================
 *  CONFIGURACION CENTRAL
 *  Edita este archivo para personalizar todo.
 * ============================================
 */
const CONFIG = {

    nombre: "",

    /**
     * Mensajes descubribles — aparecen al hacer doble click
     * en estrellas especiales o en Saturno.
     * Se selecciona uno aleatoriamente.
     */
    mensajesDescubribles: [
        "JAJAJA, encontraste una.",
        "¿Qué haces haciendo doble click? 😂",
        "Esta estrella estaba escondida.",
        "Dato completamente innecesario.",
        "Ok, esta sí era importante.",
        "No había nada aquí... mentira.",
        "Tocaste una estrella. ¿Y ahora qué? 😂",
        "Eso era un secreto.",
        "No deberías estar haciendo esto.",
        "Ok... esta sí estaba escondida.",
        "Literalmente no sirve para nada esto.",
        "Pero qué curioso eres 😂",
        "Si sigues así vas a encontrar todo.",
        "Esto es lo más random que vas a ver hoy.",
        "Una estrella cualquiera. Mentira."
    ],

    /**
     * Mensaje al hacer doble click sobre Saturno
     */
    mensajesSaturno: [
        "¿También encontraste esto? 😂",
        "Saturno no es un juguete.",
        "Oye, con cuidado 😂",
        "Eso fue bonito, pero no lo vuelvas a hacer.",
        "¿En serio le estás haciendo doble click a un planeta? 😂"
    ],

    estrellasEspeciales: [
        { icono: "⭐" },
        { icono: "💫" },
        { icono: "🌟" },
        { icono: "✨" },
        { icono: "⭐" },
        { icono: "💫" },
        { icono: "🌟" },
        { icono: "✨" }
    ],

    carga: {
        mensajes: ["INICIALIZANDO...", "CARGANDO UNIVERSO...", "Universo listo."],
        duracionTotal: 2500
    },

    sorpresa: {
        titulo: "Encontraste el pequeño secreto.",
        mensajes: [
            "Bueno... ese era mi pequeño regalo 😂",
            "Espero que te haya gustado :)"
        ]
    },

    final: {
        mensajes: [
            "Bueno, eso era todo.",
            "Solo quería hacerte una pequeña tontería.",
            "Espero que te haya sacado una sonrisa."
        ],
        botonVolver: "Volver al universo"
    },

    musica: {
        archivo: "assets/audio/universo1.mp3",
        nombre: "universo1",
        volumen: 0.25
    },

    universo: {
        cantidadEstrellas: 200,
        estrellasEspecialesCount: 8,
        objetosDesbloqueablesNecesarios: 5
    }
};
