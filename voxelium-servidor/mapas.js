'use strict';
// ═════════ VOXELIUM — MAPAS DE LA COMUNIDAD ═════════
// Los jugadores suben sus mapas (.voxel) con una foto. Quedan "pendientes" hasta que el dueño
// del juego los aprueba desde /voxws/admin?clave=... (la clave está en ~/voxelium-admin.txt).
// Todo se guarda FUERA de la carpeta del sitio web.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const DIR = process.env.MAPAS || path.join(os.homedir(), 'voxelium-mapas');
const PEND = path.join(DIR, 'pendientes'), APROB = path.join(DIR, 'aprobados');
for (const d of [PEND, APROB]) fs.mkdirSync(d, { recursive: true });
const ARCH_CLAVE = process.env.CLAVE_ADMIN_ARCH || path.join(os.homedir(), 'voxelium-admin.txt');
let CLAVE = ''; try { CLAVE = fs.readFileSync(ARCH_CLAVE, 'utf8').trim(); } catch (e) {}
if (!/^[a-f0-9]{24,}$/.test(CLAVE)) { CLAVE = crypto.randomBytes(16).toString('hex'); try { fs.writeFileSync(ARCH_CLAVE, CLAVE + '\n', { mode: 0o600 }); } catch (e) {} }

const AUTOR_OFICIAL = process.env.AUTOR_OFICIAL || 'Voxelium';   // nombre con el que salen los mapas del creador del juego
const MAX_VOXEL = 6 * 1024 * 1024, MAX_FOTO = 400 * 1024, MAX_PEND = 300;
const TIPOS = ['', 'skyblock', 'parkour'], MODOS = ['aventura', 'supervivencia', 'creativo'];
const guardarMeta = (dir, m) => fs.writeFileSync(path.join(dir, m.id + '.json'), JSON.stringify(m));
const idOk = id => /^[a-z0-9]{6,24}$/.test(id || '');
const leerJSON = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const listar = dir => fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => leerJSON(path.join(dir, f))).filter(Boolean);
// Mapas oficiales que vienen con el código (carpeta oficiales/): se copian una sola vez.
// Si después los borras desde el panel, no vuelven (queda anotado en .sembrados).
{ const ORIG = path.join(__dirname, 'oficiales'), MARCA = path.join(DIR, '.sembrados');
  let hechos = []; try { hechos = fs.readFileSync(MARCA, 'utf8').split('\n').filter(Boolean); } catch (e) {}
  try { for (const f of fs.readdirSync(ORIG).filter(f => f.endsWith('.json'))) {
    const m = leerJSON(path.join(ORIG, f)); if (!m || !idOk(m.id) || hechos.includes(m.id)) continue;
    m.autor = AUTOR_OFICIAL; m.oficial = true; m.fecha = m.aprobado = Date.now(); m.descargas = 0;
    for (const ext of ['.voxel', '.jpg']) fs.copyFileSync(path.join(ORIG, m.id + ext), path.join(APROB, m.id + ext));
    guardarMeta(APROB, m); hechos.push(m.id); fs.writeFileSync(MARCA, hechos.join('\n') + '\n'); console.log('mapa oficial agregado:', m.nombre);
  } } catch (e) { console.log('oficiales:', e.message); } }
let aprobados = listar(APROB);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const publico = m => ({ id: m.id, nombre: m.nombre, desc: m.desc, autor: m.autor, oficial: !!m.oficial, modo: m.modo, tipo: m.tipo, plano: !!m.plano, tam: m.tam, peso: m.peso, fecha: m.fecha, aprobado: m.aprobado, descargas: m.descargas || 0 });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
function json(res, code, obj) { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, CORS)); res.end(JSON.stringify(obj)); }
function leerCuerpo(req, max) {
  return new Promise((ok, mal) => { const partes = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > max) { mal(new Error('grande')); req.destroy(); } else partes.push(c); });
    req.on('end', () => ok(Buffer.concat(partes))); req.on('error', mal); });
}
// cuántas veces subió cada IP (para frenar abusos)
const subidas = new Map();
let descSucio = false;
setInterval(() => { if (!descSucio) return; descSucio = false; for (const m of aprobados) if (m._sucio) { delete m._sucio; try { guardarMeta(APROB, m); } catch (e) {} } }, 15000);

// devuelve true si atendió el pedido
function atender(req, res, nombreValido, log) {
  const u = new URL(req.url, 'http://x'), p = u.pathname.replace(/^\/voxws/, '');
  if (!p.startsWith('/mapas') && !p.startsWith('/admin')) return false;
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return true; }

  // ── lista de mapas aprobados ──
  if (req.method === 'GET' && p === '/mapas') {
    const orden = u.searchParams.get('orden') === 'populares' ? (a, b) => (b.descargas || 0) - (a.descargas || 0) || b.aprobado - a.aprobado : (a, b) => b.aprobado - a.aprobado;
    json(res, 200, { mapas: aprobados.slice().sort(orden).slice(0, 300).map(publico) }); return true;
  }
  // ── foto de un mapa ──
  let m = p.match(/^\/mapas\/foto\/([a-z0-9]+)$/);
  if (req.method === 'GET' && m && idOk(m[1])) {
    const enAprob = path.join(APROB, m[1] + '.jpg'), enPend = path.join(PEND, m[1] + '.jpg');
    const f = fs.existsSync(enAprob) ? enAprob : (u.searchParams.get('clave') === CLAVE && fs.existsSync(enPend) ? enPend : null);
    if (!f) { res.writeHead(404, CORS); res.end(); return true; }
    res.writeHead(200, Object.assign({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' }, CORS)); fs.createReadStream(f).pipe(res); return true;
  }
  // ── descargar un mapa ──
  m = p.match(/^\/mapas\/archivo\/([a-z0-9]+)$/);
  if (req.method === 'GET' && m && idOk(m[1])) {
    const admin = u.searchParams.get('clave') === CLAVE, meta = aprobados.find(x => x.id === m[1]);
    const f = meta ? path.join(APROB, m[1] + '.voxel') : admin ? path.join(PEND, m[1] + '.voxel') : null;
    if (!f || !fs.existsSync(f)) { res.writeHead(404, CORS); res.end(); return true; }
    if (meta && !admin) { meta.descargas = (meta.descargas || 0) + 1; meta._sucio = true; descSucio = true; }
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${m[1]}.voxel"` }, CORS)); fs.createReadStream(f).pipe(res); return true;
  }
  // ── subir un mapa (queda pendiente) ──
  if (req.method === 'POST' && p === '/mapas/subir') {
    const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const ult = subidas.get(ip) || 0;
    leerCuerpo(req, MAX_VOXEL * 1.4 + MAX_FOTO * 1.4 + 20000).then(buf => {
      let d; try { d = JSON.parse(buf.toString('utf8')); } catch (e) { return json(res, 400, { error: 'datos' }); }
      const oficial = d.clave === CLAVE;   // el creador del juego publica directo, como oficial
      if (!oficial && Date.now() - ult < 90 * 1000) return json(res, 429, { error: 'espera' });
      const nombre = String(d.nombre || '').trim().slice(0, 30), desc = String(d.desc || '').trim().slice(0, 200), autor = oficial ? AUTOR_OFICIAL : String(d.autor || '');
      if (nombre.length < 3 || (!oficial && !nombreValido(autor))) return json(res, 400, { error: 'datos' });
      const voxel = Buffer.from(String(d.voxel || ''), 'base64'); if (voxel.length < 50 || voxel.length > MAX_VOXEL) return json(res, 400, { error: 'grande' });
      const fm = String(d.foto || '').match(/^data:image\/jpeg;base64,(.+)$/); const foto = fm ? Buffer.from(fm[1], 'base64') : null; if (!foto || foto.length > MAX_FOTO) return json(res, 400, { error: 'foto' });
      if (!oficial && fs.readdirSync(PEND).filter(f => f.endsWith('.json')).length >= MAX_PEND) return json(res, 503, { error: 'lleno' });
      const id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
      const meta = { id, nombre, desc, autor, dev: String(d.dev || '').slice(0, 40), ip, modo: MODOS.includes(d.modo) ? d.modo : 'aventura', tipo: TIPOS.includes(d.tipo) ? d.tipo : '', plano: !!d.plano, tam: [96, 160, 256, 352].includes(+d.tam) ? +d.tam : 160, peso: voxel.length, fecha: Date.now(), descargas: 0 };
      if (oficial) { meta.oficial = true; meta.aprobado = Date.now(); const dir = APROB; fs.writeFileSync(path.join(dir, id + '.voxel'), voxel); fs.writeFileSync(path.join(dir, id + '.jpg'), foto); guardarMeta(dir, meta); aprobados = listar(APROB); log('mapa oficial publicado', id, nombre); return json(res, 200, { ok: true, id, oficial: true }); }
      fs.writeFileSync(path.join(PEND, id + '.voxel'), voxel); fs.writeFileSync(path.join(PEND, id + '.jpg'), foto); guardarMeta(PEND, meta);
      subidas.set(ip, Date.now()); log('mapa subido (pendiente)', id, nombre, autor);
      json(res, 200, { ok: true, id });
    }).catch(() => json(res, 413, { error: 'grande' }));
    return true;
  }
  // ── panel para aprobar (solo con la clave) ──
  if (p === '/admin' || p === '/admin/accion') {
    if (req.method === 'POST' && p === '/admin/accion') {
      leerCuerpo(req, 4000).then(buf => {
        const f = new URLSearchParams(buf.toString('utf8')); if (f.get('clave') !== CLAVE) { res.writeHead(403); return res.end('No'); }
        const id = f.get('id'), acc = f.get('acc'); if (!idOk(id)) { res.writeHead(400); return res.end('id'); }
        const mover = (de, a) => { for (const ext of ['.voxel', '.jpg']) { try { fs.renameSync(path.join(de, id + ext), path.join(a, id + ext)); } catch (e) {} } };
        const borrar = dir => { for (const ext of ['.voxel', '.jpg', '.json']) { try { fs.unlinkSync(path.join(dir, id + ext)); } catch (e) {} } };
        if (acc === 'aprobar') { const meta = leerJSON(path.join(PEND, id + '.json')); if (meta) { meta.aprobado = Date.now(); mover(PEND, APROB); guardarMeta(APROB, meta); try { fs.unlinkSync(path.join(PEND, id + '.json')); } catch (e) {} aprobados = listar(APROB); log('mapa aprobado', id, meta.nombre); } }
        else if (acc === 'rechazar') { borrar(PEND); log('mapa rechazado', id); }
        else if (acc === 'quitar') { borrar(APROB); aprobados = listar(APROB); log('mapa quitado', id); }
        res.writeHead(303, { Location: '/voxws/admin?clave=' + CLAVE }); res.end();
      }).catch(() => { res.writeHead(400); res.end(); });
      return true;
    }
    if (u.searchParams.get('clave') !== CLAVE) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Acceso no permitido'); return true; }
    const pend = listar(PEND).sort((a, b) => a.fecha - b.fecha), k = esc(CLAVE);
    const fecha = t => new Date(t).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    const kb = n => (n / 1024).toFixed(0) + ' KB';
    const tarjeta = (x, pendiente) => `<div class="t"><img src="/voxws/mapas/foto/${x.id}?clave=${k}" alt=""><div class="i"><b>${esc(x.nombre)}${x.oficial ? ' <span style="background:#ffd23a;color:#1b2a6b;border-radius:6px;padding:0 6px;font-size:12px">OFICIAL</span>' : ''}</b><small>${esc(x.autor)} · ${esc(x.modo)}${x.tipo ? ' · ' + esc(x.tipo) : ''} · ${kb(x.peso)} · ${fecha(x.fecha)}${pendiente ? '' : ' · ' + (x.descargas || 0) + ' descargas'}</small><p>${esc(x.desc) || '<i>sin descripción</i>'}</p>
      <a href="/voxws/mapas/archivo/${x.id}?clave=${k}">Descargar para probar</a>
      <form method="post" action="/voxws/admin/accion"><input type="hidden" name="clave" value="${k}"><input type="hidden" name="id" value="${x.id}">${pendiente ? '<button name="acc" value="aprobar" class="si">Aprobar</button><button name="acc" value="rechazar" class="no">Rechazar</button>' : '<button name="acc" value="quitar" class="no">Quitar</button>'}</form></div></div>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
    res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Voxelium · Mapas</title>
<style>body{font-family:system-ui,sans-serif;background:#0d153d;color:#fff;margin:0;padding:16px}h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:22px 0 8px;color:#ffe14a}.t{display:flex;gap:12px;background:#1b2a6b;border-radius:12px;padding:10px;margin-bottom:10px;flex-wrap:wrap}.t img{width:220px;max-width:100%;border-radius:8px;background:#000}.i{flex:1;min-width:220px}.i small{display:block;color:#b8c4f0;margin:2px 0 6px}.i p{margin:0 0 8px}a{color:#7fe3ff}form{margin-top:8px}button{font-size:16px;padding:8px 16px;border:0;border-radius:8px;margin-right:8px;font-weight:700}.si{background:#3fae4a;color:#fff}.no{background:#c0392b;color:#fff}.v{color:#b8c4f0}</style></head><body>
<h1>Voxelium · Mapas de la comunidad</h1><div class="v">Revisa cada mapa antes de aprobarlo: el nombre, la descripción y la foto se ven en el juego.</div>
<h2>Pendientes (${pend.length})</h2>${pend.map(x => tarjeta(x, true)).join('') || '<div class="v">No hay mapas esperando.</div>'}
<h2>Publicados (${aprobados.length})</h2>${aprobados.slice().sort((a, b) => b.aprobado - a.aprobado).map(x => tarjeta(x, false)).join('') || '<div class="v">Todavía no hay mapas publicados.</div>'}
</body></html>`);
    return true;
  }
  return false;
}
module.exports = { atender, CLAVE: () => CLAVE, DIR };
