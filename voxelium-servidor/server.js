'use strict';
// ═════════ VOXELIUM — servidor de salas para jugar con amigos ═════════
// Un mundo lo "abre" un jugador (el dueño) desde su celular. El servidor solo une a los jugadores
// y les pasa los mensajes: posiciones, bloques, animales, la hora, frases rápidas.
// Salas privadas (con código de 4 números) y públicas (aparecen en la lista del juego).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const mapas = require('./mapas');   // mapas de la comunidad (subir, aprobar, descargar)

const PUERTO = +process.env.PUERTO || 8820;
const MAX_JUG = 8;                       // jugadores por sala, contando al dueño
const MAX_SALAS = 2000;
// los reportes se guardan FUERA de la carpeta del sitio web (no se pueden descargar)
const REPORTES = process.env.REPORTES || path.join(require('os').homedir(), 'voxelium-reportes.log');
// los reportes se guardan hasta 12 meses (lo dice la política de privacidad): al arrancar y una vez por día se borran los más viejos
function limpiarReportes() { try { const lim = Date.now() - 365 * 864e5; const l = fs.readFileSync(REPORTES, 'utf8').split('\n').filter(x => { if (!x) return false; try { return Date.parse(JSON.parse(x).fecha) > lim; } catch (e) { return false; } });
  fs.writeFileSync(REPORTES, l.length ? l.join('\n') + '\n' : ''); } catch (e) {} }
limpiarReportes(); setInterval(limpiarReportes, 864e5);

// nombres: se arman con estas dos listas + un número (así nadie puede ponerse un nombre feo)
const ADJ = ['Super', 'Mega', 'Pixel', 'Turbo', 'Rayo', 'Cubo', 'Ninja', 'Gran', 'Mini', 'Cosmo', 'Neon', 'Lava', 'Hielo', 'Trueno', 'Bloque', 'Veloz', 'Feliz', 'Dorado', 'Cristal', 'Fuego'];
const SUS = ['Panda', 'Zorro', 'Dragon', 'Lobo', 'Gato', 'Conejo', 'Buho', 'Tigre', 'Tiburon', 'Robot', 'Caballero', 'Mago', 'Minero', 'Constructor', 'Pinguino', 'Koala', 'Halcon', 'Pulpo', 'Leon', 'Oso'];
const nombreValido = n => typeof n === 'string' && /^[A-Za-z]{3,24}\d{0,3}$/.test(n) && ADJ.some(a => n.startsWith(a) && SUS.some(s => n.slice(a.length).replace(/\d+$/, '') === s));
const FRASES = 12;                        // cantidad de frases rápidas (índices 0..11)

// ─── récords en línea: Parkour de lava (menos tiempo) y Noche de zombis (más oleadas) ───
// se guardan FUERA de la carpeta del sitio web; por cada celular (dev) queda su mejor marca
const RECORDS = process.env.RECORDS || path.join(require('os').homedir(), 'voxelium-records.json');
const TABLAS = { parkour: { menor: true, min: 25, max: 3600 }, oleadas: { menor: false, min: 1, max: 500 }, caceria: { menor: false, min: 1, max: 20000 }, guerra: { menor: false, min: 1, max: 50000 } };   // caceria: puntos de la Cacería de Umbrak · guerra: puntos de la Guerra de Aldeas
let rec = { parkour: {}, oleadas: {}, caceria: {}, guerra: {} };
try { const r = JSON.parse(fs.readFileSync(RECORDS, 'utf8')); for (const k in TABLAS) if (r && r[k]) rec[k] = r[k]; } catch (e) {}
let recSucio = false;
setInterval(() => { if (!recSucio) return; recSucio = false; const tmp = RECORDS + '.tmp'; fs.writeFile(tmp, JSON.stringify(rec), e => { if (!e) fs.rename(tmp, RECORDS, () => {}); }); }, 10000);
const semanaHoy = () => Math.floor((Date.now() / 86400000 + 3) / 7);   // las semanas empiezan el lunes
const mejorQue = (T, a, b) => T.menor ? a < b : a > b;
function tablaPara(tabla, dev, nuevo) {
  const T = TABLAS[tabla], s = semanaHoy(), todos = Object.entries(rec[tabla]), ord = (a, b) => T.menor ? a[2] - b[2] : b[2] - a[2];
  const siempre = todos.map(([d, e]) => [d, e.n, e.v]).sort(ord), semana = todos.filter(([, e]) => e.s === s).map(([d, e]) => [d, e.n, e.vs]).sort(ord);
  const pos = l => { const k = l.findIndex(x => x[0] === dev); return k < 0 ? null : [k + 1, l[k][2]]; };
  const top = l => l.slice(0, 20).map(x => [x[1], x[2]]);
  return { t: 'records', tabla, siempre: top(siempre), semana: top(semana), yoS: pos(siempre), yoW: pos(semana), total: siempre.length, nuevo: !!nuevo };
}

const salas = new Map();                  // codigo -> sala
let sigId = 1;
const ahora = () => Date.now();

function nuevoCodigo() { for (let k = 0; k < 50; k++) { const c = String(1000 + Math.floor(Math.random() * 9000)); if (!salas.has(c)) return c; } return null; }
const enviar = (ws, m) => { if (ws && ws.readyState === 1) ws.send(typeof m === 'string' ? m : JSON.stringify(m)); };
function aTodos(sala, m, menos) { const s = JSON.stringify(m); for (const j of sala.jug.values()) if (j.ws !== menos) enviar(j.ws, s); }
const resumen = s => ({ codigo: s.codigo, nombre: s.nombre, dueno: s.dueno.nombre, modo: s.modo, tipo: s.tipo, jug: s.jug.size, max: MAX_JUG });
const listaPublica = () => [...salas.values()].filter(s => s.publica && s.jug.size < MAX_JUG).sort((a, b) => b.jug.size - a.jug.size).slice(0, 40).map(resumen);
const datosJug = j => ({ id: j.id, nombre: j.nombre, skin: j.skin });

function salir(ws, motivo) {
  const c = ws.sala; if (!c) return; ws.sala = null; const sala = salas.get(c); if (!sala) return;
  sala.jug.delete(ws.id);
  if (sala.dueno.ws === ws) {               // se fue el dueño: se cierra la sala
    for (const j of sala.jug.values()) { enviar(j.ws, { t: 'cerrada', motivo: motivo || 'dueno' }); j.ws.sala = null; }
    salas.delete(c); log('sala cerrada', c);
  } else aTodos(sala, { t: 'sale', id: ws.id, motivo: motivo || '' });
}
function log(...a) { console.log(new Date().toISOString().slice(0, 19), ...a); }

// ─── servidor http (para saber si está vivo) + websocket ───
const srv = http.createServer((req, res) => {
  if (req.url.startsWith('/voxws/estado') || req.url === '/estado') { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); return res.end(JSON.stringify({ ok: true, salas: salas.size, jugadores: [...salas.values()].reduce((s, x) => s + x.jug.size, 0) })); }
  try { if (mapas.atender(req, res, nombreValido, log)) return; } catch (e) { log('error mapas', e.message); res.writeHead(500); return res.end(); }
  res.writeHead(404); res.end();
});
const wss = new WebSocketServer({ server: srv, maxPayload: 8 * 1024 * 1024, perMessageDeflate: { threshold: 2048 } });

wss.on('connection', ws => {
  ws.id = sigId++; ws.vivo = true; ws.sala = null; ws.nombre = null; ws.cupo = 0; ws.cupoT = ahora();
  ws.on('pong', () => { ws.vivo = true; });
  ws.on('close', () => salir(ws, 'desconectado'));
  ws.on('message', (raw, esBinario) => {
    // límite: ~80 mensajes por segundo por jugador
    const t = ahora(); if (t - ws.cupoT > 1000) { ws.cupoT = t; ws.cupo = 0; } if (++ws.cupo > 80) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; } if (!m || typeof m.t !== 'string') return;
    const sala = ws.sala ? salas.get(ws.sala) : null, dueno = sala && sala.dueno.ws === ws;
    switch (m.t) {
      case 'hola': {
        if (!nombreValido(m.nombre)) return enviar(ws, { t: 'error', e: 'nombre' });
        ws.nombre = m.nombre; ws.skin = (m.skin && JSON.stringify(m.skin).length < 6000) ? m.skin : null;
        return enviar(ws, { t: 'bienvenida', id: ws.id });
      }
      case 'lista': return enviar(ws, { t: 'lista', salas: listaPublica() });
      case 'borrarDatos': {   // "Borrar mis datos" desde el juego: récords y mapas subidos desde ese celular
        const dev = String(m.dev || ''); if (!/^[a-z0-9]{8,40}$/.test(dev)) return enviar(ws, { t: 'datosBorrados', ok: false });
        let r = 0; for (const k in rec) if (rec[k][dev]) { delete rec[k][dev]; r++; } if (r) recSucio = true;
        let mp = 0; try { mp = mapas.borrarDeDev(dev); } catch (e) {}
        log('datos borrados', dev.slice(0, 6) + '…', 'records', r, 'mapas', mp);
        return enviar(ws, { t: 'datosBorrados', ok: true, records: r, mapas: mp });
      }
      case 'records': { if (!TABLAS[m.tabla]) return; if (t - (ws.recPideT || 0) < 700) return; ws.recPideT = t; return enviar(ws, tablaPara(m.tabla, String(m.dev || '').slice(0, 40))); }
      case 'record': {
        const T = TABLAS[m.tabla], dev = String(m.dev || ''); if (!T || !ws.nombre || !/^[a-z0-9]{8,40}$/.test(dev)) return;
        let v = +m.v; if (!Number.isFinite(v) || v < T.min || v > T.max) return; v = T.menor ? Math.round(v * 100) / 100 : Math.floor(v);
        if (t - (ws.recT || 0) < 3000) return; ws.recT = t;
        const tb = rec[m.tabla], s = semanaHoy(); let e = tb[dev], nuevo = false;
        if (!e) { if (Object.keys(tb).length >= 50000) return; e = tb[dev] = { n: ws.nombre, v, vs: v, s }; nuevo = true; }
        else { e.n = ws.nombre; if (mejorQue(T, v, e.v)) e.v = v; if (e.s !== s) { e.s = s; e.vs = v; nuevo = true; } else if (mejorQue(T, v, e.vs)) { e.vs = v; nuevo = true; } }
        recSucio = true; if (nuevo) log('record', m.tabla, ws.nombre, v);
        return enviar(ws, tablaPara(m.tabla, dev, nuevo));
      }

      case 'crear': {
        if (!ws.nombre) return; if (ws.sala) salir(ws);
        if (salas.size >= MAX_SALAS) return enviar(ws, { t: 'error', e: 'lleno' });
        const codigo = nuevoCodigo(); if (!codigo) return enviar(ws, { t: 'error', e: 'lleno' });
        const yo = { id: ws.id, nombre: ws.nombre, skin: ws.skin, ws };
        const s = { codigo, publica: !!m.publica, nombre: String(m.nombreMundo || '').slice(0, 30), modo: String(m.modo || '').slice(0, 14), tipo: String(m.tipo || '').slice(0, 14),
          dueno: yo, jug: new Map([[ws.id, yo]]), echados: new Set(), creada: ahora() };
        salas.set(codigo, s); ws.sala = codigo; log('sala nueva', codigo, s.publica ? 'publica' : 'privada', ws.nombre);
        return enviar(ws, { t: 'creada', codigo, publica: s.publica });
      }
      case 'publica': { if (!dueno) return; sala.publica = !!m.v; return enviar(ws, { t: 'creada', codigo: sala.codigo, publica: sala.publica }); }
      case 'unirse': {
        if (!ws.nombre) return; const s = salas.get(String(m.codigo || ''));
        if (!s) return enviar(ws, { t: 'error', e: 'noExiste' });
        if (s.jug.size >= MAX_JUG) return enviar(ws, { t: 'error', e: 'llena' });
        if (s.echados.has(ws.nombre)) return enviar(ws, { t: 'error', e: 'echado' });
        if (ws.sala) salir(ws);
        const yo = { id: ws.id, nombre: ws.nombre, skin: ws.skin, ws };
        s.jug.set(ws.id, yo); ws.sala = s.codigo;
        enviar(ws, { t: 'unido', codigo: s.codigo, dueno: s.dueno.id, jugadores: [...s.jug.values()].filter(j => j.ws !== ws).map(datosJug), modo: s.modo, tipo: s.tipo, nombre: s.nombre });
        aTodos(s, { t: 'entra', ...datosJug(yo) }, ws);
        return;
      }
      case 'salir': return salir(ws);
      case 'echar': {
        if (!dueno) return; const j = sala.jug.get(+m.id); if (!j || j.ws === ws) return;
        sala.echados.add(j.nombre); enviar(j.ws, { t: 'cerrada', motivo: 'echado' }); salir(j.ws, 'echado'); return;
      }
      case 'reportar': {
        if (!sala) return; const j = sala.jug.get(+m.id); if (!j) return;
        const r = { fecha: new Date().toISOString(), sala: sala.codigo, publica: sala.publica, quien: ws.nombre, a: j.nombre, motivo: String(m.motivo || '').slice(0, 20) };
        fs.appendFile(REPORTES, JSON.stringify(r) + '\n', () => {}); log('reporte', r.a, r.motivo); return enviar(ws, { t: 'reportado' });
      }
      case 'skin': { if (!sala) return; ws.skin = (m.skin && JSON.stringify(m.skin).length < 6000) ? m.skin : null; const j = sala.jug.get(ws.id); if (j) j.skin = ws.skin; aTodos(sala, { t: 'skin', id: ws.id, skin: ws.skin }, ws); return; }
      // ── mensajes de juego que se reparten ──
      case 'e':   // posición y animación (muchas veces por segundo)
      case 'b':   // bloques cambiados
        if (!sala) return; m.id = ws.id; aTodos(sala, m, ws); return;
      case 'f':   // frase rápida
        if (!sala || !(m.k >= 0 && m.k < FRASES)) return; aTodos(sala, { t: 'f', id: ws.id, k: m.k | 0 }, ws); return;
      case 'g':   // un invitado le pegó a un bicho: va al dueño
        if (!sala || dueno) return; m.id = ws.id; enviar(sala.dueno.ws, m); return;
      case 'm':   // animales y monstruos (los manda el dueño)
      case 'h':   // la hora del día y reglas
        if (!dueno) return; aTodos(sala, m, ws); return;
      case 'mundo': // el dueño le manda el mundo a quien acaba de entrar
      case 'uno':   // mensaje del dueño para un solo jugador (lo que soltó un bicho, daño, etc.)
        if (!dueno) return; { const j = sala.jug.get(+m.para); if (j) enviar(j.ws, m); } return;
    }
  });
});

// los que se cuelgan sin avisar se sacan solos
setInterval(() => { for (const ws of wss.clients) { if (!ws.vivo) { ws.terminate(); continue; } ws.vivo = false; try { ws.ping(); } catch (e) {} } }, 20000);
srv.listen(PUERTO, '127.0.0.1', () => log('Voxelium salas escuchando en el puerto', PUERTO));
module.exports = { ADJ, SUS };
