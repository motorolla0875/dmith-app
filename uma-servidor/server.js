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
function sistema(lang, nombre) {
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
  ].filter(Boolean).join("\n");
}

// límite simple por IP y por día, para cuidar el cupo gratis
const usos = new Map(); let diaUsos = new Date().toDateString();
function permitir(ip, limite) {
  const hoy = new Date().toDateString();
  if (hoy !== diaUsos) { usos.clear(); diaUsos = hoy; }
  const n = (usos.get(ip) || 0) + 1;
  if (n > limite) return false;
  usos.set(ip, n); return true;
}

const leer = (req) => new Promise((ok, mal) => {
  let b = ""; req.on("data", (c) => { b += c; if (b.length > 60000) { mal(new Error("grande")); req.destroy(); } });
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
  const historia = (Array.isArray(datos.mensajes) ? datos.mensajes : []).slice(-14)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 3000) }));
  if (!historia.length || historia[historia.length - 1].role !== "user") return json(res, 400, { error: "pedido" });
  const mensajes = [{ role: "system", content: sistema(lang, nombre) }, ...historia];

  let r;
  try {
    r = await pedir(e.GROQ_API_KEY, e.UMA_MODELO || "openai/gpt-oss-120b", mensajes);
    if (!r.ok) {
      console.error("Groq (modelo principal)", r.status, (await r.text()).slice(0, 400));
      if (r.status === 401) return json(res, 502, { error: "clave" });
      r = await pedir(e.GROQ_API_KEY, RESERVA, mensajes);
    }
  } catch (x) { console.error("No pude conectar con Groq:", x.message); return json(res, 502, { error: "ia" }); }
  if (!r.ok) { console.error("Groq (reserva)", r.status, (await r.text()).slice(0, 400)); return json(res, r.status === 429 ? 429 : 502, { error: r.status === 429 ? "cupo" : r.status === 401 ? "clave" : "ia" }); }

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
