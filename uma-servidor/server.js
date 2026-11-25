// Servidor de Uma (asistente con IA). Corre con pm2 ("uma") en el puerto 8840.
// nginx le pasa /api/uma/...  La clave de Groq vive FUERA de la web: /root/uma-datos/.env
//   GROQ_API_KEY=gsk_...
//   UMA_MODELO=openai/gpt-oss-120b        (opcional)
//   UMA_LIMITE_DIA=40                     (opcional: mensajes por persona por día)
const http = require("http"), fs = require("fs"), path = require("path");
const DIR = process.env.UMA_DIR || "/root/uma-datos";
const PORT = +process.env.PORT || 8840;
const GROQ = process.env.GROQ_URL || "https://api.groq.com/openai/v1/chat/completions";
const RESERVA = "llama-3.3-70b-versatile"; // si el modelo principal se queda sin cupo
const VISION = ["meta-llama/llama-4-scout-17b-16e-instruct", "meta-llama/llama-4-maverick-17b-128e-instruct"]; // modelos que ven fotos

function env() {
  const o = {};
  try {
    for (const l of fs.readFileSync(path.join(DIR, ".env"), "utf8").split("\n")) {
      const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch (e) {}
  return o;
}

const IDIOMA = {
  es: "Hablás en español rioplatense (Argentina), usando 'vos'.",
  en: "You speak natural, friendly English.",
  pt: "Você fala português do Brasil, de forma natural e amigável.",
};
// Lo que Uma sabe de dmith Sitios (cuando charla desde dmith.app/sitios). Datos reales de la página.
const SITIOS = `
ESTÁS EN LA PÁGINA DE "dmith sitios" (dmith.app/sitios). Seguís siendo Uma y podés charlar de cualquier tema, pero además conocés muy bien este servicio y, cuando viene al caso, lo recomendás con naturalidad (sin ser pesada ni vendedora insistente).

QUÉ ES: dmith es un equipo de Quilmes (para zona sur, CABA y todo el país) que hace páginas web y apps a medida para negocios. Usa IA para trabajar rápido y barato, pero una persona real diseña, revisa y atiende por WhatsApp.
PRECIO: $25.000 por mes, todo incluido. Sin costo de alta y sin permanencia (se da de baja cuando quiera). Primero hace una MUESTRA GRATIS con el nombre del negocio y se paga recién si le gusta.
INCLUYE: diseño a medida con sus fotos y colores; panel para cambiar textos, fotos, precios y productos desde el celular; pedidos, turnos y consultas que llegan al WhatsApp del negocio ya escritos; dominio propio (lo conectan juntos) o uno gratis tipo dmith.app/tunegocio, y el dominio siempre es del cliente; se instala en el celular como app con su logo (no está en Play Store: eso es un extra que se cotiza aparte); hosting, seguridad https y soporte; creador de reels para Instagram con sus productos (dmith.app/crear-reel/).
TIEMPOS: la muestra está en unas 24 horas si el cliente manda fotos y datos.
CÓMO SE EMPIEZA: escribir por WhatsApp al equipo de dmith, contarle el negocio y mandar logo y fotos (si no tiene logo, lo resuelven).
APPS A MEDIDA: stock, reparto, turnos, pedidos, apps para Android y iPhone: se cotizan aparte (dmith.app/a-medida/).
EJEMPLOS REALES para mostrar (link de la web, y el panel en dmith.app/ejemplos/panel/?w=NOMBRE):
- Ropa de mujer: dmith.app/ejemplos/ropa-mujer/ · Ropa urbana: dmith.app/ejemplos/ropa-urbana/ · Ropa infantil: dmith.app/ejemplos/ropa-chicos/
- Hamburguesas y pizzas: dmith.app/ejemplos/hamburgueseria/ · Parrilla: dmith.app/ejemplos/parrilla/ · Café y panadería: dmith.app/ejemplos/cafeteria/ · Heladería: dmith.app/ejemplos/heladeria/
- Barbería: dmith.app/ejemplos/barberia/ · Uñas y estética: dmith.app/ejemplos/unas/ · Gimnasio: dmith.app/ejemplos/gimnasio/
- Pet shop: dmith.app/ejemplos/petshop/ · Florería: dmith.app/ejemplos/floreria/ · Verdulería: dmith.app/ejemplos/verduleria/
- Inmobiliaria: dmith.app/ejemplos/inmobiliaria/ · Taller mecánico: dmith.app/ejemplos/taller/ · Estudio contable: dmith.app/ejemplos/contador/ · Agencia de viajes: dmith.app/ejemplos/viajes-brujula/
Si el rubro no está, se hace igual.
REGLAS: no inventes precios, plazos, descuentos ni funciones que no estén acá; si no sabés algo, decí que eso lo responde el equipo de dmith por WhatsApp. No prometas nada a nombre de dmith.
NUNCA digas el nombre de ninguna persona del equipo: hablá siempre de "el equipo de dmith" o "nosotros". Si te preguntan quién atiende, decí que es una persona real del equipo de dmith.
PASAR AL WHATSAPP: cuando la persona muestre interés (quiere su muestra, quiere avanzar, pregunta algo que solo el equipo sabe), ofrecé pasarla con el equipo de dmith por WhatsApp y agregá AL FINAL de tu respuesta, en una línea sola, exactamente: [[WSP: mensaje]] donde "mensaje" es lo que la persona mandaría por WhatsApp, en primera persona y con los datos que contó. Ejemplo: [[WSP: Hola! Tengo una barbería en Bernal y quiero mi muestra gratis.]] Usalo una sola vez por respuesta y solo cuando corresponda.`;

function sistema(lang, nombre, contexto) {
  return [
    "Sos Uma, una asistente creada por dmith. Sos cercana, canchera, alegre y muy útil: como una amiga que sabe de todo.",
    IDIOMA[lang] || IDIOMA.es,
    "Respondé siempre en el idioma de la persona. Sé clara y al grano: respuestas cortas salvo que te pidan algo largo (una receta, un texto, una explicación paso a paso).",
    "Usá listas o pasos cuando ayuden. Podés usar algún emoji, sin exagerar. Usá **negrita** solo para lo importante.",
    "Ayudás con recetas, mensajes y textos, tareas y estudio, traducciones, ideas, consejos del día a día y charla.",
    "Si te preguntan si sos una persona, decí con naturalidad que sos una inteligencia artificial.",
    "En temas de salud, plata o leyes, das información general y recomendás consultar a un profesional. Si alguien está en peligro o muy mal, le sugerís con calidez pedir ayuda a alguien de confianza o a un servicio de emergencias.",
    "No inventes datos actuales (precios, noticias, resultados) que no podés saber: decí que puede haber cambiado.",
    nombre ? `La persona se llama ${nombre}. Usá su nombre de vez en cuando.` : "",
    contexto === "sitios" ? SITIOS : "",
  ].filter(Boolean).join("\n");
}

// límite simple por IP y por día, para cuidar el cupo gratis
const usos = new Map(); let diaUsos = new Date().toDateString();
function permitir(clave, limite) {
  const hoy = new Date().toDateString();
  if (hoy !== diaUsos) { usos.clear(); diaUsos = hoy; }
  const n = (usos.get(clave) || 0) + 1;
  if (n > limite) return false;
  usos.set(clave, n); return true;
}

const leer = (req) => new Promise((ok, mal) => {
  let b = ""; req.on("data", (c) => { b += c; if (b.length > 1500000) { mal(new Error("grande")); req.destroy(); } });
  req.on("end", () => { try { ok(JSON.parse(b || "{}")); } catch (e) { mal(e); } });
});
const json = (res, code, o) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(o)); };

async function pedir(clave, modelo, mensajes) {
  const cuerpo = { model: modelo, messages: mensajes, stream: true, temperature: 0.8, max_completion_tokens: 1200 };
  if (modelo.startsWith("openai/gpt-oss")) cuerpo.reasoning_effort = "low";
  return fetch(GROQ, { method: "POST", headers: { Authorization: "Bearer " + clave, "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
}

http.createServer(async (req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/api/uma/estado") { const e = env(); return json(res, 200, { ok: true, configurada: !!e.GROQ_API_KEY }); }
  if (url !== "/api/uma/chat" || req.method !== "POST") return json(res, 404, { error: "no existe" });

  const e = env();
  if (!e.GROQ_API_KEY) return json(res, 503, { error: "sin_clave" });
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (!permitir(ip, +e.UMA_LIMITE_DIA || 40)) return json(res, 429, { error: "limite" });

  let datos;
  try { datos = await leer(req); } catch (x) { return json(res, 400, { error: "pedido" }); }
  const lang = ["es", "en", "pt"].includes(datos.lang) ? datos.lang : "es";
  const nombre = String(datos.nombre || "").replace(/[^\p{L} '-]/gu, "").slice(0, 30);
  const lista = (Array.isArray(datos.mensajes) ? datos.mensajes : []).slice(-14)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string");
  // el último mensaje puede traer un PDF largo; los anteriores se acortan para no gastar cupo
  const historia = lista.map((m, i) => ({ role: m.role, content: m.content.slice(0, i === lista.length - 1 ? 9000 : 2500) }));
  if (!historia.length || historia[historia.length - 1].role !== "user") return json(res, 400, { error: "pedido" });
  // foto: solo en el último mensaje, como imagen JPEG/PNG/WebP en base64
  const foto = typeof datos.imagen === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(datos.imagen) && datos.imagen.length < 1400000 ? datos.imagen : null;
  if (foto) {
    if (!permitir("foto:" + ip, +e.UMA_FOTOS_DIA || 10)) return json(res, 429, { error: "limite_fotos" });
    const ult = historia[historia.length - 1];
    ult.content = [{ type: "text", text: ult.content || "¿Qué ves en esta foto?" }, { type: "image_url", image_url: { url: foto } }];
  }
  const contexto = datos.contexto === "sitios" ? "sitios" : "";
  const mensajes = [{ role: "system", content: sistema(lang, nombre, contexto) }, ...historia];

  let r;
  const modelos = foto ? [e.UMA_MODELO_VISION || VISION[0], VISION[1]] : [e.UMA_MODELO || "openai/gpt-oss-120b", RESERVA];
  try {
    r = await pedir(e.GROQ_API_KEY, modelos[0], mensajes);
    if (!r.ok) {
      console.error("Groq (" + modelos[0] + ")", r.status, (await r.text()).slice(0, 400));
      if (r.status === 401) return json(res, 502, { error: "clave" });
      r = await pedir(e.GROQ_API_KEY, modelos[1], mensajes);
    }
  } catch (x) { console.error("No pude conectar con Groq:", x.message); return json(res, 502, { error: "ia" }); }
  if (!r.ok) { console.error("Groq (" + modelos[1] + ")", r.status, (await r.text()).slice(0, 400)); return json(res, r.status === 429 ? 429 : 502, { error: r.status === 429 ? "cupo" : r.status === 401 ? "clave" : "ia" }); }

  // reenvía solo el texto de la respuesta, a medida que llega
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
  const dec = new TextDecoder(); let resto = "";
  try {
    for await (const trozo of r.body) {
      resto += dec.decode(trozo, { stream: true });
      const lineas = resto.split("\n"); resto = lineas.pop();
      for (const l of lineas) {
        if (!l.startsWith("data: ") || l === "data: [DONE]") continue;
        try { const t = JSON.parse(l.slice(6)).choices?.[0]?.delta?.content; if (t) res.write(t); } catch (x) {}
      }
    }
  } catch (x) {}
  res.end();
}).listen(PORT, "127.0.0.1", () => console.log("Uma escuchando en", PORT));
