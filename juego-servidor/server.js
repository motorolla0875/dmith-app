// dmith.app/juego — servidor de juegos personalizados.
// Sin dependencias: solo Node. Guarda cada juego como un .json y sus imágenes en DATOS.
// Variables: PUERTO (8830), DATOS (/var/lib/dmith-juego), PAGO_SIMULADO (1), ADMIN_CLAVE, DEV (sirve también los archivos estáticos)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUERTO = +process.env.PUERTO || 8830;
const DATOS = process.env.DATOS || '/var/lib/dmith-juego';
const SIMULADO = process.env.PAGO_SIMULADO !== '0';
const ADMIN = process.env.ADMIN_CLAVE || '';
const DEV = !!process.env.DEV;
const RAIZ = path.join(__dirname, '..');

for (const d of ['juegos', 'img', 'denuncias']) fs.mkdirSync(path.join(DATOS, d), { recursive: true });

// ─── catálogo: precios y qué campos acepta cada plantilla ───
const PLANTILLAS = {
  amor:   { nombre: 'Juego de amor',      precio: 14990, mensual: false },
  cumple: { nombre: 'Juego de cumpleaños', precio: 12990, mensual: false },
  ruleta: { nombre: 'Ruleta de premios',  precio: 24990, mensual: true }
};
const LIM = { texto: 60, largo: 600, premios: 12 };

// ─── utilidades ───
const LETRAS = 'abcdefghjkmnpqrstuvwxyz23456789';
const nuevoId = () => { let s; do { s = ''; for (let i = 0; i < 6; i++) s += LETRAS[crypto.randomInt(LETRAS.length)]; } while (fs.existsSync(archivo(s))); return s; };
const archivo = id => path.join(DATOS, 'juegos', id + '.json');
const idOk = id => /^[a-z0-9]{6}$/.test(id || '');
function leer(id) { try { return JSON.parse(fs.readFileSync(archivo(id), 'utf8')); } catch (e) { return null; } }
function guardar(j) { const tmp = archivo(j.id) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(j)); fs.renameSync(tmp, archivo(j.id)); }
const hoy = () => new Date().toISOString().slice(0, 10);
const claveOk = (j, c) => j && typeof c === 'string' && c.length === 32 && crypto.timingSafeEqual(Buffer.from(c), Buffer.from(j.clave));

function enviar(res, cod, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(cod, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(b);
}
function cuerpo(req, max) {
  return new Promise((ok, mal) => {
    let n = 0; const partes = [];
    req.on('data', c => { n += c.length; if (n > max) { mal(new Error('grande')); req.destroy(); } else partes.push(c); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(partes).toString('utf8') || '{}')); } catch (e) { mal(new Error('json')); } });
    req.on('error', mal);
  });
}

// límite de pedidos por IP (por hora)
const cupo = new Map();
function permitido(req, tipo, max) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const k = tipo + ip, ahora = Date.now(), v = cupo.get(k) || { n: 0, t: ahora };
  if (ahora - v.t > 3600e3) { v.n = 0; v.t = ahora; }
  v.n++; cupo.set(k, v);
  return v.n <= max;
}
setInterval(() => { const a = Date.now(); for (const [k, v] of cupo) if (a - v.t > 3600e3) cupo.delete(k); }, 600e3).unref();

// ─── limpiar lo que llega del formulario ───
const txt = (v, max = LIM.texto) => String(v == null ? '' : v).replace(/[\u0000-\u0009\u000B-\u001F<>]/g, '').slice(0, max);
const color = (v, def) => /^#[0-9a-fA-F]{6}$/.test(v || '') ? v.toLowerCase() : def;
function limpiar(plantilla, d) {
  d = d || {};
  if (plantilla === 'ruleta') {
    const premios = (Array.isArray(d.premios) ? d.premios : []).slice(0, LIM.premios).map(p => ({
      texto: txt(p.texto, 28), peso: Math.max(0, Math.min(100, Math.round(+p.peso || 0))), pierde: !!p.pierde
    })).filter(p => p.texto);
    return {
      local: txt(d.local, 40), titulo: txt(d.titulo, 40), color: color(d.color, '#f2b65a'), fondo: color(d.fondo, '#2b1a12'),
      instagram: /^https:\/\/(www\.)?instagram\.com\/[\w.\-\/]*$/.test(d.instagram || '') ? d.instagram : '',
      prefijo: txt(d.prefijo, 5).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PREMIO', vence: txt(d.vence, 120),
      una_por_dia: d.una_por_dia !== false, premios
    };
  }
  return {
    para: txt(d.para, 30), de: txt(d.de, 30), titulo: txt(d.titulo, 50), mensaje: txt(d.mensaje, LIM.largo),
    pregunta: txt(d.pregunta, 120), respuesta_si: txt(d.respuesta_si, 120),
    frases: (Array.isArray(d.frases) ? d.frases : []).slice(0, 3).map(f => txt(f, 30)),
    meta: Math.max(5, Math.min(40, Math.round(+d.meta || 15))),
    tema: txt(d.tema, 20), color: color(d.color, '#ff4f7b'), fondo1: color(d.fondo1, '#2b0f3a'), fondo2: color(d.fondo2, '#7a1f5c'),
    objeto: ['corazon', 'estrella', 'moneda', 'flor', 'globo'].includes(d.objeto) ? d.objeto : 'corazon'
  };
}
// imagen en dataURL → archivo (jpg o png, hasta 1,5 MB)
function guardarImagen(id, cual, dataurl) {
  if (!dataurl) return null;
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataurl);
  if (!m) throw new Error('imagen');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 1.5e6) throw new Error('imagen grande');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const firma = buf.slice(0, 4).toString('hex');
  if (!(firma.startsWith('ffd8') || firma === '89504e47' || firma === '52494646')) throw new Error('imagen');
  for (const e of ['jpg', 'png', 'webp']) fs.rmSync(path.join(DATOS, 'img', `${id}-${cual}.${e}`), { force: true });
  const nombre = `${id}-${cual}.${ext}`;
  fs.writeFileSync(path.join(DATOS, 'img', nombre), buf);
  return nombre;
}
const imgUrl = (j, cual) => j[cual] ? `/juego/api/img/${j[cual]}?v=${j.version || 1}` : '';

function publico(j, conClave) {
  const activo = j.pagado && (!j.vence || j.vence > Date.now()) && !j.oculto;
  const r = { id: j.id, plantilla: j.plantilla, datos: Object.assign({}, j.datos, { foto: imgUrl(j, 'foto'), logo: imgUrl(j, 'logo') }), activo };
  if (j.oculto) r.oculto = true;
  if (conClave) {
    r.pagado = !!j.pagado; r.vence = j.vence || null; r.creado = j.creado;
    if (j.plantilla === 'ruleta') r.stats = j.stats || {};
    r.precio = PLANTILLAS[j.plantilla].precio; r.mensual = PLANTILLAS[j.plantilla].mensual;
  }
  return r;
}

// ─── rutas ───
async function api(req, res, ruta, q) {
  const [, , , accion, id] = ruta.split('/'); // /juego/api/<accion>/<id>
  const M = req.method;

  if (accion === 'salud') return enviar(res, 200, { ok: true, juegos: fs.readdirSync(path.join(DATOS, 'juegos')).length, simulado: SIMULADO });
  if (accion === 'catalogo') return enviar(res, 200, { plantillas: PLANTILLAS, simulado: SIMULADO });

  if (accion === 'img' && M === 'GET') {
    if (!/^[a-z0-9]{6}-(foto|logo)\.(jpg|png|webp)$/.test(id || '')) return enviar(res, 404, { error: 'no' });
    const f = path.join(DATOS, 'img', id);
    if (!fs.existsSync(f)) return enviar(res, 404, { error: 'no' });
    const j = leer(id.slice(0, 6)); if (j && j.oculto) return enviar(res, 404, { error: 'no' });
    res.writeHead(200, { 'Content-Type': { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[id.split('.').pop()], 'Cache-Control': 'public, max-age=604800' });
    return fs.createReadStream(f).pipe(res);
  }

  if (accion === 'crear' && M === 'POST') {
    if (!permitido(req, 'crear', 40)) return enviar(res, 429, { error: 'Demasiados intentos, probá en un rato.' });
    const b = await cuerpo(req, 4e6);
    if (!PLANTILLAS[b.plantilla]) return enviar(res, 400, { error: 'plantilla' });
    const j = { id: nuevoId(), clave: crypto.randomBytes(16).toString('hex'), plantilla: b.plantilla,
      datos: limpiar(b.plantilla, b.datos), creado: Date.now(), pagado: false, version: 1 };
    j.foto = guardarImagen(j.id, 'foto', b.foto);
    j.logo = guardarImagen(j.id, 'logo', b.logo);
    guardar(j);
    return enviar(res, 200, { id: j.id, clave: j.clave });
  }

  if (!idOk(id)) return enviar(res, 404, { error: 'No existe ese juego.' });
  const j = leer(id);
  if (!j) return enviar(res, 404, { error: 'No existe ese juego.' });

  if (accion === 'juego' && M === 'GET') return enviar(res, 200, publico(j, claveOk(j, q.get('clave'))));

  if (accion === 'editar' && M === 'POST') {
    const b = await cuerpo(req, 4e6);
    if (!claveOk(j, b.clave)) return enviar(res, 403, { error: 'Clave incorrecta.' });
    j.datos = limpiar(j.plantilla, b.datos);
    if (b.foto && b.foto.startsWith('data:')) j.foto = guardarImagen(j.id, 'foto', b.foto);
    if (b.logo && b.logo.startsWith('data:')) j.logo = guardarImagen(j.id, 'logo', b.logo);
    j.version = (j.version || 1) + 1; j.editado = Date.now();
    guardar(j);
    return enviar(res, 200, publico(j, true));
  }

  if (accion === 'pagar' && M === 'POST') {
    const b = await cuerpo(req, 1e4);
    if (!claveOk(j, b.clave)) return enviar(res, 403, { error: 'Clave incorrecta.' });
    if (!SIMULADO) return enviar(res, 501, { error: 'El pago real todavía no está conectado.' });
    const P = PLANTILLAS[j.plantilla];
    j.pagado = true; j.pagos = (j.pagos || []).concat({ t: Date.now(), monto: P.precio, simulado: true });
    if (P.mensual) j.vence = Math.max(Date.now(), j.vence || 0) + 30 * 864e5;
    guardar(j);
    return enviar(res, 200, publico(j, true));
  }

  if (accion === 'tiro' && M === 'POST') { // estadísticas de la ruleta
    if (j.plantilla !== 'ruleta' || !permitido(req, 'tiro' + id, 30)) return enviar(res, 200, { ok: false });
    const b = await cuerpo(req, 2e3);
    const d = hoy(), s = j.stats || (j.stats = { total: 0, premios: {}, dias: {} });
    const premio = txt(b.premio, 28) || '?';
    s.total++; s.premios[premio] = (s.premios[premio] || 0) + 1;
    s.dias[d] = (s.dias[d] || 0) + 1;
    const dias = Object.keys(s.dias).sort(); while (dias.length > 60) delete s.dias[dias.shift()];
    guardar(j);
    return enviar(res, 200, { ok: true });
  }

  if (accion === 'denunciar' && M === 'POST') {
    if (!permitido(req, 'den', 10)) return enviar(res, 429, { error: 'Ya recibimos tu aviso.' });
    const b = await cuerpo(req, 4e3);
    fs.appendFileSync(path.join(DATOS, 'denuncias', 'lista.txt'), `${new Date().toISOString()}\t${id}\t${txt(b.motivo, 300).replace(/\s+/g, ' ')}\n`);
    j.denuncias = (j.denuncias || 0) + 1;
    if (j.denuncias >= 3) j.oculto = true; // se oculta solo hasta que lo revises
    guardar(j);
    return enviar(res, 200, { ok: true });
  }

  if (accion === 'admin' && ADMIN && q.get('key') === ADMIN) {
    if (q.get('hacer') === 'ocultar') { j.oculto = true; guardar(j); }
    if (q.get('hacer') === 'mostrar') { j.oculto = false; j.denuncias = 0; guardar(j); }
    if (q.get('hacer') === 'activar') { j.pagado = true; guardar(j); }
    return enviar(res, 200, j);
  }
  return enviar(res, 404, { error: 'no' });
}

// ─── modo DEV: sirve los archivos del sitio como lo haría nginx ───
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
function estatico(req, res, ruta) {
  if (/^\/juego\/j\/[a-z0-9]{6}\/?$/.test(ruta)) ruta = '/juego/j/index.html';
  let f = path.join(RAIZ, decodeURIComponent(ruta));
  if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname.startsWith('/juego/api/')) return await api(req, res, u.pathname, u.searchParams);
    if (DEV) return estatico(req, res, u.pathname);
    enviar(res, 404, { error: 'no' });
  } catch (e) {
    const msg = { grande: 'La imagen es muy pesada.', json: 'Datos inválidos.', imagen: 'Esa imagen no se puede usar.', 'imagen grande': 'La imagen es muy pesada.' }[e.message];
    if (!msg) console.error(e);
    if (!res.headersSent) enviar(res, msg ? 400 : 500, { error: msg || 'Error del servidor.' });
  }
}).listen(PUERTO, '127.0.0.1', () => console.log(`juegos en :${PUERTO}${DEV ? ' (DEV)' : ''} datos=${DATOS} simulado=${SIMULADO}`));
