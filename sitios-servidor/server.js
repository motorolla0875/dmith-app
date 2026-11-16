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
    req.on("data", (c) => { s += c; if (s.length > 10000) { no(err(413, "Muy grande")); req.destroy(); } });
    req.on("end", () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { no(err(400, "JSON inválido")); } });
  });
}
function send(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
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
    let aviso = "";
    if (!c.prueba) { try { await mpCancelar(viejo); } catch (e) { aviso = " ⚠️ No se pudo cancelar la suscripción vieja (" + viejo + "): cancelala a mano en Mercado Pago."; } }
    c.tareas = c.tareas || []; c.tareas.push({ id: crypto.randomBytes(6).toString("hex"), texto: "Pasó de " + planViejo + " a " + c.plan + ": activarle lo nuevo (panel propio)." + aviso, fecha: ahora(), hecha: false });
    c.mensajes = c.mensajes || []; c.mensajes.push({ de: "dmith", texto: "🎉 ¡Listo! Ya estás en el plan " + c.plan + ". Te avisamos por acá cuando tengas lo nuevo activado.", fecha: ahora() });
    c.admin_sin_leer = (c.admin_sin_leer || 0) + 1; c.cliente_sin_leer = (c.cliente_sin_leer || 0) + 1; save(d);
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
    return publico(c);
  },

  // Chat cliente -> Diego
  "POST /api/sitios/mensaje": async (req) => {
    const b = await body(req); const d = load(); const c = porToken(d, b.t);
    c.mensajes = c.mensajes || []; c.mensajes.push({ de: "cliente", texto: texto(b.texto), fecha: ahora() });
    c.mensajes = c.mensajes.slice(-200); c.admin_sin_leer = (c.admin_sin_leer || 0) + 1; save(d);
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
    return publico(c);
  },

  // ¿Esta web ya está pagada? (para sacar la franja de muestra)
  "GET /api/sitios/estado": async (req, q) => {
    const c = load().clientes.find((x) => x.slug === q.get("slug") && x.estado === "authorized" && !x.prueba);
    return { activo: !!c };
  },

  // Lista para Diego (clave en .env: ADMIN_KEY)
  "GET /api/sitios/admin": async (req, q) => {
    esAdmin(q.get("k"));
    return load().clientes.map((c) => ({ ...publico(c), id: c.preapproval_id, prueba: !!c.prueba, token: c.prueba ? c.token : undefined, email: c.email || "", dominio_aviso: c.dominio_aviso || "", admin_sin_leer: c.admin_sin_leer || 0 })).reverse();
  },
};

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const f = rutas[req.method + " " + u.pathname.replace(/\/$/, "")];
  if (!f) return send(res, 404, { error: "No existe" });
  try { send(res, 200, await f(req, u.searchParams)); }
  catch (e) { send(res, e.code >= 400 && e.code < 600 ? e.code : 500, { error: e.message }); }
}).listen(PORT, "127.0.0.1", () => console.log("dmith sitios en puerto " + PORT));
