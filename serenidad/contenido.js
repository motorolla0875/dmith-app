// Contenido inicial de la web. Lo que la clienta guarda en el panel reemplaza esto (se guarda en el servidor).
window.WEB_SLUG = "serenidad";
// Web en pausa: true muestra el cartel en la web y en el panel. Para reactivarla, poner false.
window.WEB_PAUSA = true;
window.CONTENIDO_BASE = {
  contacto: {
    persona: "Gabriela",
    nombre_completo: "Gabriela Paola Granizo",
    profesion: "Masoterapeuta",
    whatsapp: "2622 608800",
    direccion: "Juan Cobos 652",
    localidad: "Villa Nueva, Guaymallén, Mendoza",
    instagram: "serenidad_masajes_bienestar"
  },
  inicio: {
    rotulo: "Masoterapia holística · Guaymallén",
    titulo: "Un momento para vos,",
    titulo2: "un espacio para reconectar",
    bajada: "Masajes y terapias de bienestar para hacer una pausa, soltar tensiones y volver a sentirte bien.",
    foto: "masaje.jpg",
    destacados: [
      { t: "Masajes", s: "relajantes y descontracturantes" },
      { t: "Faciales", s: "limpieza y cuidado natural" },
      { t: "Energía", s: "reiki y sonoterapia" }
    ]
  },
  sello: { activo: true, grande: "15%", texto: "de descuento en tu paquete de 4 sesiones, todo noviembre" },
  frase: { texto: "Te espero para hacer una pausa, soltar tensiones y reencontrar tu bienestar." },
  secciones: {
    tratamientos: { rotulo: "Nuestros tratamientos", titulo: "Un espacio para", titulo2: "volver a vos", texto: "Cada sesión se adapta a lo que necesitás ese día. Si no sabés cuál elegir, escribime y lo vemos juntas." },
    galeria: { rotulo: "Mi espacio", titulo: "Un lugar pensado", titulo2: "para tu descanso", texto: "Conocé el espacio donde te voy a recibir." },
    reservar: { rotulo: "Reservá tu turno", titulo: "Elegí tu momento", titulo2: "y te confirmo por WhatsApp", texto: "Marcá el tratamiento, el día y si preferís mañana o tarde. Se abre WhatsApp con el mensaje listo para enviar." }
  },
  tratamientos: [
    { nombre: "Masajes", texto: "Para soltar la tensión de la espalda, el cuello y los hombros, y descansar de verdad.", etiquetas: "Relajación, Descontracturante, Terapéutico" },
    { nombre: "Faciales Yugen", texto: "Cuidado del rostro con limpieza profunda, rejuvenecimiento y productos naturales.", etiquetas: "Limpieza, Rejuvenecimiento, Natural" },
    { nombre: "Técnica Metamórfica", texto: "Una técnica suave de autoconocimiento y desarrollo personal, con toques delicados en pies, manos y cabeza.", etiquetas: "Transformación interior" },
    { nombre: "Sonoterapia", texto: "Las vibraciones de los diapasones acompañan una relajación profunda del cuerpo y la mente.", etiquetas: "Con diapasones" },
    { nombre: "Reiki y armonización", texto: "Un momento de calma para equilibrar tu energía y sentirte en armonía.", etiquetas: "Reiki, Equilibrio, Bienestar integral" }
  ],
  galeria: [
    { foto: "", texto: "La sala de masajes" },
    { foto: "", texto: "Un tratamiento facial" },
    { foto: "", texto: "Los detalles del espacio" },
    { foto: "", texto: "Vos, Gabriela, en acción" }
  ],
  promo: {
    activa: true,
    rotulo: "Especial noviembre",
    titulo: "15% de descuento",
    titulo2: "en tu paquete de 4 sesiones",
    texto: "Elegí tu tratamiento favorito o combiná los cuatro. El descuento se aplica al reservar el paquete completo.",
    boton: "Quiero mi paquete",
    nota: "por sesión en el paquete",
    items: [
      { n: "Pausa y Descanso", m: 60, p: 35000, d: 29750 },
      { n: "Espalda Libre", m: 40, p: 30000, d: 25500 },
      { n: "Ritual de Renovación", m: 60, p: 35000, d: 29750 },
      { n: "Renacer", m: 75, p: 40000, d: 34000 }
    ],
    pack: { activo: true, n: "Paquete de 4 sesiones", texto: "Podés combinar los 4 tratamientos", p: 140000, d: 119000 }
  },
  turnos: [
    { n: "Pausa y Descanso", m: 60, p: 35000 },
    { n: "Espalda Libre", m: 40, p: 30000 },
    { n: "Ritual de Renovación", m: 60, p: 35000 },
    { n: "Renacer", m: 75, p: 40000 },
    { n: "Facial Yugen", m: 0, p: 0 },
    { n: "Técnica Metamórfica", m: 0, p: 0 },
    { n: "Sonoterapia", m: 0, p: 0 },
    { n: "Reiki", m: 0, p: 0 }
  ],
  agenda: { cerrado: [0] },
  regalo: {
    activo: true,
    titulo: "Regalá un momento",
    titulo2: "de bienestar",
    texto: "Para un cumpleaños, el Día de la Madre o simplemente porque sí. Elegí el tratamiento y te preparo una tarjeta de regalo con el nombre de quien lo va a disfrutar.",
    foto: "regalo.jpg"
  }
};

// Cartel de "web en pausa" (tapa la web y el panel)
(function () {
  if (!window.WEB_PAUSA) return;
  var panel = /\/panel(\/|$)/.test(location.pathname);
  function poner() {
    if (document.getElementById("web-pausa")) return;
    var base = panel ? "../" : "";
    var css = document.createElement("style");
    css.textContent = "#web-pausa{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px max(16px,env(safe-area-inset-right)) 24px max(16px,env(safe-area-inset-left));" +
      "background:radial-gradient(circle at 15% 10%,#E3CFF2 0,transparent 45%),radial-gradient(circle at 90% 90%,#F5DDBF 0,transparent 45%),#FBF7F2;font:400 17px/1.55 Jost,system-ui,-apple-system,'Segoe UI',sans-serif;color:#3A2D45;text-align:center}" +
      "#web-pausa .c{max-width:420px;background:#fff;border:1px solid #E6DAEE;border-radius:28px;padding:34px 26px;box-shadow:0 24px 50px rgba(61,30,87,.10)}" +
      "#web-pausa img{height:80px;width:auto;margin:0 auto 18px;display:block}" +
      "#web-pausa h1{font:600 34px/1.1 'Cormorant Garamond',Georgia,serif;color:#3D1E57;margin:0 0 10px}" +
      "#web-pausa p{margin:0;color:#7A6B86}";
    document.head.appendChild(css);
    var d = document.createElement("div");
    d.id = "web-pausa"; d.setAttribute("role", "alert");
    d.innerHTML = '<div class="c"><img src="' + base + 'logo.png" alt="SERenidad"><h1>' + (panel ? "Tu web está en pausa" : "La web está en pausa") + "</h1><p>" +
      (panel ? "Por ahora no se pueden hacer cambios. Para reactivarla, escribinos." : "Volvé a visitarnos pronto.") + "</p></div>";
    document.body.appendChild(d);
    document.documentElement.style.overflow = "hidden";
  }
  if (document.body) poner(); else document.addEventListener("DOMContentLoaded", poner);
})();
