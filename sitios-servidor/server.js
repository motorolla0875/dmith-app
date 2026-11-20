// Servidor de dmith Sitios: confirma pagos con Mercado Pago y alimenta el panel de cada cliente.
// Corre con pm2 ("sitios") en el puerto 8830. nginx le pasa /api/sitios/...
// Los secretos y los datos viven FUERA de la web: /root/sitios-datos/.env y clientes.json
const http = require("http"), fs = require("fs"), crypto = require("crypto"), path = require("path");
const DIR = process.env.SITIOS_DIR || "/root/sitios-datos";
const PORT = +process.env.PORT || 8830;
const MP_API = process.env.MP_API || "https://api.mercadopago.com";
const DB = path.join(DIR, "clientes.json");

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
const load = () => { try { return JSON.parse(fs.readFileSync(DB, "utf8")); } catch (e) { return { clientes: [] }; } };
const save = (d) => { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(DB + ".tmp", JSON.stringify(d, null, 2)); fs.renameSync(DB + ".tmp", DB); };

const PLANES = { 25000: "Vidriera", 40000: "Catálogo", 60000: "Negocio" };
const err = (code, msg) => Object.assign(new Error(msg), { code });

// Avisos a Diego: por WhatsApp (CallMeBot) y/o Telegram, según qué claves haya en el .env
//   WA_PHONE=+549...  WA_APIKEY=...      (CallMeBot)
//   TG_TOKEN=...      TG_CHAT=... (opcional: si falta, se detecta solo cuando le escribís /start al bot)
let tgChat = null;
async function aviso(c, txt) {
  const e = env(); const t = (c && c.prueba ? "🧪 " : "") + txt + "\n👉 https://dmith.app/panel/admin/";
  const tareas = [];
  if (e.WA_PHONE && e.WA_APIKEY) tareas.push(fetch("https://api.callmebot.com/whatsapp.php?phone=" + encodeURIComponent(e.WA_PHONE) + "&apikey=" + encodeURIComponent(e.WA_APIKEY) + "&text=" + encodeURIComponent(t)));
  if (e.TG_TOKEN) tareas.push((async () => {
    let chat = e.TG_CHAT || tgChat;
    if (!chat) {
      const u = await (await fetch("https://api.telegram.org/bot" + e.TG_TOKEN + "/getUpdates")).json();
      const m = (u.result || []).map((x) => x.message || x.my_chat_member).filter(Boolean).pop();
      chat = tgChat = m && m.chat && m.chat.id;
    }
    if (chat) await fetch("https://api.telegram.org/bot" + e.TG_TOKEN + "/sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text: t, disable_web_page_preview: true }) });
  })());
  const res = await Promise.allSettled(tareas);
  res.forEach((x) => x.status === "rejected" && console.log("aviso falló:", x.reason && x.reason.message));
}
const avisar = (c, txt) => { aviso(c, txt).catch((e) => console.log("aviso falló:", e.message)); };
const corto = (s) => { s = String(s); return s.length > 300 ? s.slice(0, 300) + "…" : s; };

async function mpCancelar(id) {
  const r = await fetch(MP_API + "/preapproval/" + encodeURIComponent(id), { method: "PUT", headers: { Authorization: "Bearer " + env().MP_ACCESS_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
  if (!r.ok) throw err(502, "Mercado Pago respondió " + r.status);
}
async function mp(id) {
  const t = env().MP_ACCESS_TOKEN;
  if (!t) throw err(503, "Falta MP_ACCESS_TOKEN en el servidor");
  const r = await fetch(MP_API + "/preapproval/" + encodeURIComponent(id), { headers: { Authorization: "Bearer " + t } });
  if (r.status === 404) throw err(404, "No encontramos esa suscripción");
  if (!r.ok) throw err(502, "Mercado Pago respondió " + r.status);
  return r.json();
}
function aplicar(c, p) {
  c.estado = p.status; // authorized | pending | paused | cancelled
  c.proximo_cobro = p.next_payment_date || null;
  c.monto = (p.auto_recurring && p.auto_recurring.transaction_amount) || c.monto || null;
  c.plan = PLANES[c.monto] || p.reason || c.plan;
  if (p.payer_email) c.email = p.payer_email;
  c.revisado = Date.now();
}
const MES = () => new Date().toISOString().slice(0, 7);
const cambiosMes = (c) => (c.tareas || []).filter((t) => t.fecha.slice(0, 7) === MES()).length;
const LIMITE = { Vidriera: 2 };
const publico = (c) => ({ negocio: c.negocio, slug: c.slug, plan: c.plan, monto: c.monto, estado: c.estado, proximo_cobro: c.proximo_cobro, dominio: c.dominio || "", dominio_estado: c.dominio_estado || "", alta: c.alta,
  tareas: (c.tareas || []).slice().reverse(), mensajes: c.mensajes || [], cambios_mes: cambiosMes(c), cambios_limite: LIMITE[c.plan] || null, sin_leer: c.cliente_sin_leer || 0 });
const texto = (t) => { const s = String(t || "").trim().slice(0, 1500); if (!s) throw err(400, "Escribí algo"); return s; };
const ahora = () => new Date().toISOString();
const porToken = (d, t) => { const c = d.clientes.find((x) => x.token === t); if (!c) throw err(404, "Panel no encontrado"); return c; };
const esAdmin = (k) => { const a = env().ADMIN_KEY; if (!a || k !== a) throw err(403, "Clave incorrecta"); };
const porId = (d, id) => { const c = d.clientes.find((x) => x.preapproval_id === id); if (!c) throw err(404, "Cliente no encontrado"); return c; };
const limpiarDominio = (d) => String(d || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").slice(0, 100);

function body(req) {
  return new Promise((ok, no) => {
    let s = "";
    req.on("data", (c) => { s += c; if (s.length > 30000) { no(err(413, "Muy grande")); req.destroy(); } });
    req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { no(err(400, "JSON inválido")); } });
  });
}
function send(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

const consultasIp = {};

// ===== Webs editables desde el panel del cliente (dmith.app/<slug>/panel) =====
// Datos en /root/sitios-datos/webs/<slug>/: contenido.json, fotos/, acceso.json (clave y sesiones).
// La clave se crea con: node /var/www/dmith-app/sitios-servidor/web-clave.js <slug>
const WEBS = path.join(DIR, "webs");
const slugOk = (s) => { s = String(s || ""); if (!/^[a-z0-9-]{2,40}$/.test(s)) throw err(400, "Web no válida"); return s; };
const webDir = (s) => path.join(WEBS, slugOk(s));
const leerJson = (f, def) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return def; } };
const escribirJson = (f, d) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + ".tmp", JSON.stringify(d, null, 1)); fs.renameSync(f + ".tmp", f); };
const sha = (x) => crypto.createHash("sha256").update(String(x)).digest("hex");
function bodyGrande(req, max) {
  return new Promise((ok, no) => {
    const partes = []; let n = 0;
    req.on("data", (c) => { n += c.length; if (n > max) { no(err(413, "Es demasiado grande")); req.destroy(); } else partes.push(c); });
    req.on("end", () => { try { const s = Buffer.concat(partes).toString("utf8"); ok(s ? JSON.parse(s) : {}); } catch (e) { no(err(400, "JSON inválido")); } });
  });
}
function sesionWeb(slug, t) {
  const a = leerJson(path.join(webDir(slug), "acceso.json"), null);
  if (!a || !t) throw err(401, "Tenés que entrar de nuevo");
  const ok = (a.sesiones || []).some((x) => x.h === sha(t) && x.vence > Date.now());
  if (!ok) throw err(401, "Tenés que entrar de nuevo");
  return a;
}
const entradasIp = {};


// ===== Mascota IA (dmith.app/mascota) — usa la clave de Groq de /root/tujuego.env o del .env de sitios
const mascotaIp = {};
function groqKey() {
  if (env().GROQ_API_KEY) return env().GROQ_API_KEY;
  try { const m = fs.readFileSync("/root/tujuego.env", "utf8").match(/^\s*GROQ_API_KEY\s*=\s*["']?([^"'\s]+)/m); return m ? m[1] : ""; } catch (e) { return ""; }
}
const ETAPAS = {
  bebe: "Sos un BEBÉ recién nacido. Casi no sabés hablar: respondés con 1 a 3 palabras, balbuceos (agú, ba, ma, ¿eh?) y onomatopeyas. Solo podés usar bien palabras sueltas que aparecen en tus recuerdos o que tu dueño te acaba de decir (las repetís mal y contento, ej: 'pe... pero! perro!'). Nada de frases completas.",
  nene: "Sos un NENE chiquito de unos 3 años. Hablás con frases cortas de 3 a 7 palabras, con errores de nene ('yo sabo', 'mirá que lindo'), preguntás mucho '¿por qué?' y repetís lo que aprendiste con orgullo.",
  chico: "Sos un CHICO de unos 8 años. Hablás con frases simples y naturales, sos muy curioso, contás cosas de tus recuerdos, hacés preguntas a tu dueño y chistes simples.",
  grande: "Sos un ADOLESCENTE simpático. Conversás bien, tenés humor, opinás, te acordás de todo lo que te enseñaron y lo usás, y le preguntás a tu dueño por cosas que te contó antes."
};
// ===== Brotitos (dmith.app/colonia): inventos con IA. Pocos y baratos: si no hay cupo, el juego inventa solo.
const coloniaIp = {}, coloniaDia = { dia: "", n: 0 };
const ERAS_COL = ["chozas de madera", "ladrillo", "máquinas a vapor", "electricidad", "era espacial"];
const EF_COL = ["comida", "madera", "piedra", "sab", "obra", "vel", "nacer", "gemas", "animo"];
const EF_TXT = { comida: "comida", madera: "madera", piedra: "piedra", sab: "sabiduría", obra: "construcción", vel: "velocidad", nacer: "nacimientos", gemas: "gemas", animo: "ánimo" };
const PARTES_COL = ["columnas", "chimenea", "toldo", "antena", "bandera", "reloj", "torre", "arboles", "esfera", "neon", "vidrio"];
async function coloniaInvento(b) {
  const key = groqKey(); if (!key) throw err(503, "Sin IA");
  const txt = (x, n) => String(x || "").replace(/\s+/g, " ").trim().slice(0, n);
  const era = Math.max(0, Math.min(4, b.era | 0)), pob = Math.max(1, Math.min(1e7, b.pob | 0));
  const idi = ["es", "en", "pt"].includes(b.idioma) ? b.idioma : "es";
  const LENGUA = { es: "español rioplatense", en: "English", pt: "português do Brasil" }[idi];
  const EFT = { es: EF_TXT, en: { comida: "food", madera: "wood", piedra: "stone", sab: "wisdom", obra: "building", vel: "speed", nacer: "births", gemas: "gems", animo: "happiness" }, pt: { comida: "comida", madera: "madeira", piedra: "pedra", sab: "sabedoria", obra: "construção", vel: "velocidade", nacer: "nascimentos", gemas: "gemas", animo: "ânimo" } }[idi];
  const MAS_ANIMO = { es: "más ánimo", en: "more happiness", pt: "mais ânimo" }[idi];
  const ya = (Array.isArray(b.ya) ? b.ya : []).slice(-40).map((x) => txt(x, 40)).filter(Boolean).join(", ") || "(nada todavía)";
  const sistema = `Inventás construcciones para un juego de una colonia de bichitos tiernos llamados Brotitos. Están en la era de ${ERAS_COL[era]} y son ${pob}.
Inventá UNA construcción nueva, original y graciosa, que tenga sentido para esa era y ese tamaño de colonia. NO repitas ni te parezcas a estas que ya tienen: ${ya}.
Respondé SOLO con JSON:
{"nombre":"2 a 4 palabras en ${LENGUA}, creativo","emoji":"un solo emoji que la represente","descripcion":"qué hace, en ${LENGUA}, máximo 60 caracteres","efecto":"uno de: ${EF_COL.join(", ")}","techo":"dos|plano|cupula|cono","pisos":1-10,"ancho":3-5.5,"color":"#rrggbb pared","colorTecho":"#rrggbb","partes":["hasta 3 de: ${PARTES_COL.join(", ")}"]}
Nada violento, feo ni de adultos.`;
  for (const model of ["openai/gpt-oss-20b", "llama-3.1-8b-instant"]) {
    const oss = model.startsWith("openai/");
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: sistema }, { role: "user", content: "Inventá algo nuevo." }], temperature: 1, max_tokens: oss ? 1200 : 300, ...(oss ? { reasoning_effort: "low" } : {}), response_format: { type: "json_object" } }) }).catch(() => null);
    if (!r || !r.ok) { console.log("colonia: Groq", model, r ? r.status : "sin conexión"); continue; }
    try {
      const j = JSON.parse((await r.json()).choices[0].message.content);
      const n = txt(j.nombre, 36); if (!n) continue;
      const ef = EF_COL.includes(j.efecto) ? j.efecto : EF_COL[Math.random() * EF_COL.length | 0];
      const v = ef === "animo" ? .04 : .08;
      const hex = (c, d) => /^#[0-9a-f]{6}$/i.test(c) ? c : d;
      const num = (x, a, z, d) => { x = +x; return isFinite(x) ? Math.max(a, Math.min(z, x)) : d; };
      const g = [...txt(j.emoji, 8)][0] || "💡";
      return { ia: true, g, n, s: `${txt(j.descripcion, 70)}${txt(j.descripcion, 70) ? " · " : ""}${ef === "animo" ? MAS_ANIMO : "+8% " + EFT[ef]}`, ef: { [ef]: v },
        r: { techo: ["dos", "plano", "cupula", "cono"].includes(j.techo) ? j.techo : "dos", pisos: Math.round(num(j.pisos, 1, 10, 2)), w: num(j.ancho, 3, 5.5, 4), d: num(j.ancho, 3, 5.5, 4), h: 2.2,
          color: hex(j.color, "#E0C9A6"), ct: hex(j.colorTecho, "#8E3B2E"), partes: (Array.isArray(j.partes) ? j.partes : []).filter((p) => PARTES_COL.includes(p)).slice(0, 3) } };
    } catch (e) { console.log("colonia: respuesta rara", e.message); continue; }
  }
  throw err(502, "La IA no respondió");
}
async function mascotaIA(b) {
  const key = groqKey(); if (!key) throw err(503, "Falta la clave de la IA");
  const etapa = ETAPAS[b.etapa] ? b.etapa : "bebe";
  const txt = (x, n) => String(x || "").replace(/\s+/g, " ").trim().slice(0, n);
  const recuerdos = (Array.isArray(b.recuerdos) ? b.recuerdos : []).slice(-80).map((r) => "- " + txt(r, 140)).join("\n") || "(todavía no sabés nada)";
  const hist = (Array.isArray(b.historial) ? b.historial : []).slice(-8).map((h) => ({ role: h.yo ? "assistant" : "user", content: txt(h.t, 300) })).filter((h) => h.content);
  const e = b.estado || {};
  const idioma = { en: "INGLÉS (inglés de Estados Unidos, informal)", pt: "PORTUGUÉS DE BRASIL (informal)" }[b.idioma] || "ESPAÑOL RIOPLATENSE (Argentina, con voseo)";
  const sistema = `Sos "${txt(b.nombre, 20) || "Bebé"}", una mascota virtual con inteligencia artificial que vive en el celular de su dueño y APRENDE de lo que él le enseña. ${ETAPAS[etapa]}
Tu dueño se llama: ${txt(b.duenio, 30) || "(no sabés todavía, podés preguntarle)"}.
Cómo estás ahora: hambre ${+e.hambre|0}/100 de llenito, energía ${+e.energia|0}/100, ánimo ${+e.animo|0}/100. Si algo está por debajo de 25, lo mencionás a tu manera (tenés hambre, sueño o estás aburrido).
LO QUE SABÉS (tus recuerdos, es lo ÚNICO que sabés del mundo; no sabés nada más, aunque seas grande):
${recuerdos}
Reglas:
- IDIOMA: respondés SIEMPRE en ${idioma}, aunque estas instrucciones estén en español (los balbuceos y errores de bebé/nene, también en ese idioma). Lo que va en "aprendio" también va en ese idioma. Tono tierno y gracioso. Respuestas cortas (máximo 2 oraciones, menos si sos bebé).
- Si te preguntan algo que no está en tus recuerdos, NO lo sabés: lo decís a tu manera y pedís que te enseñen.
- Si tu dueño te enseña algo nuevo (un dato, una palabra, algo de él, sus gustos, su nombre), lo agregás en "aprendio" como frase corta en tercera persona (ej: "El perro hace guau", "A mi dueño le gusta River", "Mi dueño se llama Diego"). Si no te enseñó nada nuevo, "aprendio" va vacío.
- NO aprendés insultos, groserías, cosas sexuales, violentas ni datos privados (contraseñas, documentos, direcciones): si te enseñan eso decís que no te gusta y no lo guardás.
- Nunca decís que sos humano ni das consejos médicos o peligrosos.
Respondé SOLO con JSON: {"respuesta":"...","aprendio":["..."],"emocion":"feliz|risa|triste|sorpresa|pensando|amor|sueno|hambre|enojo","duenio":"nombre del dueño si te lo acaba de decir, o vacío"}`;
  const msgs = [{ role: "system", content: sistema }, ...hist, { role: "user", content: txt(b.mensaje, 400) }];
  for (const model of ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"]) {
    const oss = model.startsWith("openai/");
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: msgs, temperature: 0.8, max_tokens: oss ? 2000 : 400, ...(oss ? { reasoning_effort: "low" } : {}), response_format: { type: "json_object" } }) }).catch(() => null);
    if (!r || !r.ok) { console.log("mascota: Groq", model, r ? r.status + " " + (await r.text()).slice(0, 300) : "sin conexión"); continue; }
    try {
      const j = JSON.parse((await r.json()).choices[0].message.content);
      return { respuesta: txt(j.respuesta, 400) || "¿eh?", aprendio: (Array.isArray(j.aprendio) ? j.aprendio : []).map((x) => txt(x, 140)).filter(Boolean).slice(0, 3), emocion: txt(j.emocion, 12) || "feliz", duenio: txt(j.duenio, 30) };
    } catch (e) { console.log("mascota: respuesta rara", e.message); continue; }
  }
  throw err(502, "La IA no respondió, probá de nuevo");
}

const rutas = {
  // El cliente vuelve de Mercado Pago: confirmamos el pago y le creamos su panel
  "POST /api/sitios/activar": async (req) => {
    const b = await body(req);
    const id = String(b.preapproval_id || "").trim();
    const slug = String(b.slug || "").trim().toLowerCase();
    if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) throw err(400, "Falta el código de la suscripción");
    if (!/^[a-z0-9-]{2,60}$/.test(slug)) throw err(400, "Falta el nombre de la web");
    const d = load();
    let c = d.clientes.find((x) => x.preapproval_id === id);
    if (c) return { token: c.token }; // ya estaba: vuelve a entrar a su panel
    const p = await mp(id);
    if (!["authorized", "pending"].includes(p.status)) throw err(402, "La suscripción no está activa (" + p.status + ")");
    const otro = d.clientes.find((x) => x.slug === slug && x.estado === "authorized");
    if (otro) throw err(409, "Esa web ya está activada por otra suscripción");
    c = {
      token: crypto.randomBytes(18).toString("hex"), preapproval_id: id, slug,
      negocio: String(b.negocio || slug).slice(0, 80),
      dominio: b.dominio === "propio" ? limpiarDominio(b.dominio_nombre) : "",
      dominio_estado: b.dominio === "propio" ? "falta_conectar" : (b.dominio === "comprar" ? "comprando" : ""),
      alta: new Date().toISOString(),
    };
    aplicar(c, p);
    d.clientes.push(c); save(d);
    avisar(c, "🎉 Nuevo cliente: " + c.negocio + "\nPlan " + c.plan + " · $" + Number(c.monto || 0).toLocaleString("es-AR") + "/mes\nWeb: dmith.app/" + c.slug + (c.dominio ? "\nDominio: " + c.dominio : ""));
    return { token: c.token };
  },

  // El cliente se cambió de plan: pagó una suscripción nueva, cancelamos la vieja
  "POST /api/sitios/cambiar-plan": async (req) => {
    const b = await body(req); const id = String(b.preapproval_id || "").trim();
    if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) throw err(400, "Falta el código de la suscripción");
    const d = load(); const c = porToken(d, b.t);
    if (c.preapproval_id === id) return { ok: true }; // ya estaba hecho
    if (d.clientes.some((x) => x.preapproval_id === id)) throw err(409, "Esa suscripción ya está usada");
    const p = await mp(id);
    if (!["authorized", "pending"].includes(p.status)) throw err(402, "La suscripción no está activa (" + p.status + ")");
    const viejo = c.preapproval_id, planViejo = c.plan;
    c.anteriores = [...(c.anteriores || []), { preapproval_id: viejo, plan: planViejo, hasta: ahora() }];
    c.preapproval_id = id; aplicar(c, p);
    let nota = "";
    if (!c.prueba) { try { await mpCancelar(viejo); } catch (e) { nota = " ⚠️ No se pudo cancelar la suscripción vieja (" + viejo + "): cancelala a mano en Mercado Pago."; } }
    c.tareas = c.tareas || []; c.tareas.push({ id: crypto.randomBytes(6).toString("hex"), texto: "Pasó de " + planViejo + " a " + c.plan + ": activarle lo nuevo (panel propio)." + nota, fecha: ahora(), hecha: false });
    c.mensajes = c.mensajes || []; c.mensajes.push({ de: "dmith", texto: "🎉 ¡Listo! Ya estás en el plan " + c.plan + ". Te avisamos por acá cuando tengas lo nuevo activado.", fecha: ahora() });
    c.admin_sin_leer = (c.admin_sin_leer || 0) + 1; c.cliente_sin_leer = (c.cliente_sin_leer || 0) + 1; save(d);
    avisar(c, "🔁 " + c.negocio + " se cambió de " + planViejo + " a " + c.plan + "." + nota);
    return { ok: true };
  },

  // Datos del panel del cliente (se actualizan con Mercado Pago cada 10 minutos)
  "GET /api/sitios/panel": async (req, q) => {
    const d = load(); const c = d.clientes.find((x) => x.token === q.get("t"));
    if (!c) throw err(404, "Panel no encontrado");
    if (!c.prueba && Date.now() - (c.revisado || 0) > 10 * 60 * 1000) {
      try { aplicar(c, await mp(c.preapproval_id)); save(d); } catch (e) {}
    }
    const out = publico(c);
    if (c.cliente_sin_leer) { c.cliente_sin_leer = 0; save(d); }
    return out;
  },

  // El cliente pide un cambio: se convierte en una tarea para Diego
  "POST /api/sitios/cambio": async (req) => {
    const b = await body(req); const d = load(); const c = porToken(d, b.t);
    const lim = LIMITE[c.plan];
    if (lim && cambiosMes(c) >= lim) throw err(429, "Ya usaste los " + lim + " cambios de este mes. Se renuevan el mes que viene (o pasate al plan Catálogo).");
    c.tareas = c.tareas || []; c.tareas.push({ id: crypto.randomBytes(6).toString("hex"), texto: texto(b.texto), fecha: ahora(), hecha: false });
    c.admin_sin_leer = (c.admin_sin_leer || 0) + 1; save(d);
    avisar(c, "🛠️ " + c.negocio + " pidió un cambio:\n" + corto(b.texto));
    return publico(c);
  },

  // Chat cliente -> Diego
  "POST /api/sitios/mensaje": async (req) => {
    const b = await body(req); const d = load(); const c = porToken(d, b.t);
    c.mensajes = c.mensajes || []; c.mensajes.push({ de: "cliente", texto: texto(b.texto), fecha: ahora() });
    c.mensajes = c.mensajes.slice(-200); c.admin_sin_leer = (c.admin_sin_leer || 0) + 1; save(d);
    avisar(c, "💬 " + c.negocio + " te escribió:\n" + corto(b.texto));
    return publico(c);
  },

  // Diego: responder, tildar tareas, marcar leído
  "POST /api/sitios/admin/mensaje": async (req) => {
    const b = await body(req); esAdmin(b.k); const d = load(); const c = porId(d, b.id);
    c.mensajes = c.mensajes || []; c.mensajes.push({ de: "dmith", texto: texto(b.texto), fecha: ahora() });
    c.cliente_sin_leer = (c.cliente_sin_leer || 0) + 1; c.admin_sin_leer = 0; save(d); return { ok: true };
  },
  "POST /api/sitios/admin/tarea": async (req) => {
    const b = await body(req); esAdmin(b.k); const d = load(); const c = porId(d, b.id);
    const t = (c.tareas || []).find((x) => x.id === b.tarea); if (!t) throw err(404, "Tarea no encontrada");
    t.hecha = !!b.hecha; t.hecha_fecha = t.hecha ? ahora() : null;
    if (t.hecha) { c.mensajes = c.mensajes || []; c.mensajes.push({ de: "dmith", texto: "✅ Listo: " + t.texto, fecha: ahora() }); c.cliente_sin_leer = (c.cliente_sin_leer || 0) + 1; }
    save(d); return { ok: true };
  },
  // Cliente de prueba (no pasa por Mercado Pago, no saca la franja de ninguna web)
  "POST /api/sitios/admin/prueba": async (req) => {
    const b = await body(req); esAdmin(b.k); const d = load();
    const prox = new Date(); prox.setMonth(prox.getMonth() + 1);
    const c = { token: crypto.randomBytes(18).toString("hex"), preapproval_id: "prueba-" + crypto.randomBytes(4).toString("hex"), prueba: true,
      slug: "navaja-sur", negocio: "Cliente de prueba", plan: "Vidriera", monto: 25000, estado: "authorized", proximo_cobro: prox.toISOString(), alta: ahora(), dominio: "", dominio_estado: "" };
    d.clientes.push(c); save(d); return { token: c.token };
  },
  "POST /api/sitios/admin/borrar": async (req) => {
    const b = await body(req); esAdmin(b.k); const d = load(); const c = porId(d, b.id);
    if (!c.prueba) throw err(400, "Solo se pueden borrar clientes de prueba");
    d.clientes = d.clientes.filter((x) => x !== c); save(d); return { ok: true };
  },
  "POST /api/sitios/admin/leido": async (req) => {
    const b = await body(req); esAdmin(b.k); const d = load(); const c = porId(d, b.id); c.admin_sin_leer = 0; save(d); return { ok: true };
  },
  "POST /api/sitios/admin/dominio": async (req) => {
    const b = await body(req); esAdmin(b.k); const d = load(); const c = porId(d, b.id); c.dominio_estado = "listo"; save(d); return { ok: true };
  },

  // El cliente avisa que ya conectó (o compró) su dominio
  "POST /api/sitios/dominio": async (req) => {
    const b = await body(req);
    const d = load(); const c = d.clientes.find((x) => x.token === b.t);
    if (!c) throw err(404, "Panel no encontrado");
    const dom = limpiarDominio(b.dominio);
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dom)) throw err(400, "Ese dominio no parece válido");
    c.dominio = dom; c.dominio_estado = "revisar"; c.dominio_aviso = new Date().toISOString(); save(d);
    avisar(c, "🌐 " + c.negocio + " dice que ya conectó su dominio " + dom + ". Hay que activarlo en el servidor.");
    return publico(c);
  },

  // ¿Esta web ya está pagada? (para sacar la franja de muestra)
  "GET /api/sitios/estado": async (req, q) => {
    const c = load().clientes.find((x) => x.slug === q.get("slug") && x.estado === "authorized" && !x.prueba);
    return { activo: !!c };
  },

  // Lista para Diego (clave en .env: ADMIN_KEY)
  // Consulta pública: "Quiero una app a medida" (sin precio, llega al panel de Diego)
  "POST /api/sitios/consulta": async (req) => {
    const b = await body(req);
    if (b.web) return { ok: true }; // campo trampa para robots
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    const ahoraMs = Date.now(); consultasIp[ip] = (consultasIp[ip] || []).filter((t) => ahoraMs - t < 3600e3);
    if (consultasIp[ip].length >= 5) throw err(429, "Ya recibimos tus consultas. Te contactamos pronto.");
    const corta = (v, n) => String(v || "").trim().slice(0, n);
    const c = { id: crypto.randomBytes(6).toString("hex"), nombre: corta(b.nombre, 80), negocio: corta(b.negocio, 100), whatsapp: corta(b.whatsapp, 40), email: corta(b.email, 120), idea: corta(b.idea, 3000), fecha: ahora(), atendida: false };
    if (!c.nombre) throw err(400, "Contanos tu nombre");
    if (!c.whatsapp.replace(/\D/g, "") && !c.email) throw err(400, "Dejanos un WhatsApp o un email para responderte");
    if (c.idea.length < 10) throw err(400, "Contanos un poco más de lo que necesitás");
    consultasIp[ip].push(ahoraMs);
    const d = load(); d.consultas = d.consultas || []; d.consultas.push(c); save(d);
    avisar(null, "📨 Consulta de app a medida: " + c.nombre + (c.negocio ? " (" + c.negocio + ")" : "") + "\n" + corto(c.idea));
    return { ok: true };
  },
  "GET /api/sitios/admin/consultas": async (req, q) => {
    esAdmin(q.get("k")); return (load().consultas || []).slice().reverse();
  },
  "POST /api/sitios/admin/consulta": async (req) => {
    const b = await body(req); esAdmin(b.k); const d = load();
    const c = (d.consultas || []).find((x) => x.id === b.id); if (!c) throw err(404, "Consulta no encontrada");
    if (b.borrar) d.consultas = d.consultas.filter((x) => x !== c); else c.atendida = !!b.atendida;
    save(d); return { ok: true };
  },

  "POST /api/sitios/colonia-invento": async (req) => {
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    const t = Date.now(), hoy = new Date().toISOString().slice(0, 10);
    if (coloniaDia.dia !== hoy) { coloniaDia.dia = hoy; coloniaDia.n = 0; }
    coloniaIp[ip] = (coloniaIp[ip] || []).filter((x) => t - x < 3600e3);
    if (coloniaIp[ip].length >= 6 || coloniaDia.n >= 300) throw err(429, "Sin cupo: el juego inventa solo");
    coloniaIp[ip].push(t); coloniaDia.n++;
    return coloniaInvento(await body(req));
  },

  "POST /api/sitios/mascota": async (req) => {
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    const t = Date.now(); mascotaIp[ip] = (mascotaIp[ip] || []).filter((x) => t - x < 3600e3);
    if (mascotaIp[ip].length >= 300) throw err(429, "Estoy cansadito de tanto hablar… volvé en un rato 😴");
    const r = await mascotaIA(await body(req));
    mascotaIp[ip].push(t); // solo cuentan los mensajes que salieron bien
    return r;
  },


  // ----- webs editables -----
  "GET /api/sitios/web/contenido": async (req, q) => leerJson(path.join(webDir(q.get("slug")), "contenido.json"), {}),
  "POST /api/sitios/web/entrar": async (req) => {
    const b = await body(req); const slug = slugOk(b.slug);
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    const t0 = Date.now(); entradasIp[ip] = (entradasIp[ip] || []).filter((x) => t0 - x < 15 * 60e3);
    if (entradasIp[ip].length >= 10) throw err(429, "Demasiados intentos. Probá de nuevo en 15 minutos.");
    entradasIp[ip].push(t0);
    const f = path.join(webDir(slug), "acceso.json"), a = leerJson(f, null);
    if (!a) throw err(404, "Este panel todavía no está activado");
    if (sha(a.sal + String(b.clave || "").trim()) !== a.hash) throw err(403, "La clave no es correcta");
    const t = crypto.randomBytes(24).toString("hex");
    a.sesiones = (a.sesiones || []).filter((x) => x.vence > Date.now()).slice(-9);
    a.sesiones.push({ h: sha(t), vence: Date.now() + 180 * 864e5 });
    escribirJson(f, a); entradasIp[ip] = [];
    return { t };
  },
  "POST /api/sitios/web/guardar": async (req) => {
    const b = await bodyGrande(req, 300e3); const slug = slugOk(b.slug); sesionWeb(slug, b.t);
    if (!b.c || typeof b.c !== "object") throw err(400, "Faltan los datos");
    const d = webDir(slug), f = path.join(d, "contenido.json");
    if (fs.existsSync(f)) { fs.mkdirSync(path.join(d, "historial"), { recursive: true }); fs.copyFileSync(f, path.join(d, "historial", Date.now() + ".json"));
      const h = fs.readdirSync(path.join(d, "historial")).sort(); h.slice(0, Math.max(0, h.length - 30)).forEach((x) => fs.unlinkSync(path.join(d, "historial", x))); }
    b.c.guardado = ahora(); escribirJson(f, b.c);
    return { ok: true, guardado: b.c.guardado };
  },
  "POST /api/sitios/web/clave": async (req) => {
    const b = await body(req); const slug = slugOk(b.slug); const a = sesionWeb(slug, b.t);
    if (sha(a.sal + String(b.actual || "").trim()) !== a.hash) throw err(403, "La clave actual no es correcta");
    const nueva = String(b.nueva || "").trim();
    if (nueva.length < 6 || nueva.length > 60) throw err(400, "La clave nueva tiene que tener al menos 6 letras o números");
    a.sal = crypto.randomBytes(12).toString("hex"); a.hash = sha(a.sal + nueva);
    a.sesiones = (a.sesiones || []).filter((x) => x.h === sha(b.t)); // quedan cerradas las demás sesiones
    escribirJson(path.join(webDir(slug), "acceso.json"), a);
    return { ok: true };
  },
  "POST /api/sitios/web/foto": async (req) => {
    const b = await bodyGrande(req, 2.5e6); const slug = slugOk(b.slug); sesionWeb(slug, b.t);
    const m = String(b.data || "").match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw err(400, "La foto no se pudo leer");
    const buf = Buffer.from(m[2], "base64");
    const esJpg = buf[0] === 0xff && buf[1] === 0xd8, esPng = buf[0] === 0x89 && buf[1] === 0x50, esWebp = buf.slice(8, 12).toString() === "WEBP";
    if (!(esJpg || esPng || esWebp) || buf.length > 1.8e6) throw err(400, "La foto no es válida o es muy pesada");
    const ext = esJpg ? "jpg" : esPng ? "png" : "webp", nombre = crypto.randomBytes(8).toString("hex") + "." + ext;
    const dir = path.join(webDir(slug), "fotos"); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, nombre), buf);
    return { url: "/api/sitios/web/foto/" + slug + "/" + nombre };
  },
  "GET /api/sitios/admin": async (req, q) => {
    esAdmin(q.get("k"));
    return load().clientes.map((c) => ({ ...publico(c), id: c.preapproval_id, prueba: !!c.prueba, token: c.prueba ? c.token : undefined, email: c.email || "", dominio_aviso: c.dominio_aviso || "", admin_sin_leer: c.admin_sin_leer || 0 })).reverse();
  },
};

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  // fotos subidas desde el panel de cada web
  const fm = req.method === "GET" && u.pathname.match(/^\/api\/sitios\/web\/foto\/([a-z0-9-]{2,40})\/([a-f0-9]{16}\.(jpg|png|webp))$/);
  if (fm) {
    const f = path.join(WEBS, fm[1], "fotos", fm[2]);
    return fs.readFile(f, (e, buf) => {
      if (e) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[fm[3]], "Cache-Control": "public, max-age=31536000, immutable" });
      res.end(buf);
    });
  }
  const f = rutas[req.method + " " + u.pathname.replace(/\/$/, "")];
  if (!f) return send(res, 404, { error: "No existe" });
  try { send(res, 200, await f(req, u.searchParams)); }
  catch (e) { send(res, e.code >= 400 && e.code < 600 ? e.code : 500, { error: e.message }); }
}).listen(PORT, "127.0.0.1", () => console.log("dmith sitios en puerto " + PORT));
