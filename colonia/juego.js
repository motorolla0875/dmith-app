// Brotitos — colonia infinita en 3D (archipiélago de islas + eras)
import * as THREE from "three";
import { OrbitControls } from "./lib/OrbitControls.js";

// ======================= Utilidades =======================
const $ = (id) => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const elegir = (arr) => arr[Math.random() * arr.length | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function semilla(n) { let t = n * 2654435761 >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
const SILABAS = ["bu", "ri", "to", "mo", "pi", "la", "ku", "ne", "zi", "po", "ta", "mi", "lu", "fa", "do", "be"];
const nombre = () => { const s = elegir(SILABAS) + elegir(SILABAS); return s[0].toUpperCase() + s.slice(1); };
const balbuceo = (n = 2) => Array.from({ length: n }, () => elegir(SILABAS) + (Math.random() < .3 ? elegir(SILABAS) : "")).join(" ");
const ICONO = { comida: "🍎", madera: "🪵", piedra: "🪨", gemas: "💎" };
const TIPO_RECURSO = { arbol: "madera", roca: "piedra", arbusto: "comida", huerta: "comida" };
const OFICIO = { madera: "lenador", comida: "granjero", piedra: "minero", gemas: "minero" };

// Día y noche
const DIA = 240, NOCHE = 172;
const esNoche = () => (E.tiempo % DIA) > NOCHE;
function luz() {
  const t = E.tiempo % DIA;
  if (t < 12) return .25 + t / 12 * .75;
  if (t < NOCHE - 14) return 1;
  if (t < NOCHE) return 1 - (t - (NOCHE - 14)) / 14 * .75;
  return .25;
}

// Metas por población
const METAS = [
  { pob: 5, tipo: "huerta", g: "🌱", t: "Huerta", s: "Comida sin tener que buscar arbustos" },
  { pob: 10, tipo: "mina", g: "⛏️", t: "Mina", s: "Cavan hondo: piedra y gemas 💎" },
  { pob: 16, nivel: 3, g: "🏢", t: "Casas de 3 pisos", s: "Entran más Brotitos en cada casa" },
  { pob: 25, tipo: "escuela", g: "🏫", t: "Escuela", s: "Los bebés crecen el doble y suma sabiduría 🧠" },
  { pob: 40, tipo: "torre", g: "🗼", t: "Torre", s: "Desde arriba se ve todo y están más contentos" },
  { pob: 55, nivel: 4, g: "🏙️", t: "Casas de 4 pisos", s: "Necesitan gemas 💎 para el último piso" },
  { pob: 75, tipo: "huerta", g: "🌽", t: "Segunda huerta", s: "Más comida para más Brotitos" },
  { pob: 100, tipo: "biblioteca", g: "📚", t: "Biblioteca", s: "Mucha más sabiduría 🧠" },
  { pob: 150, tipo: "huerta", g: "🥕", t: "Tercera huerta", s: "Para una colonia gigante" },
  { pob: 220, tipo: "biblioteca", g: "🎓", t: "Universidad", s: "Todavía más sabiduría 🧠" },
  { pob: 320, tipo: "torre", g: "🏰", t: "Segunda torre", s: "La colonia se ve desde lejos" },
];
// Eras
const ERAS = [
  { g: "🪵", n: "Chozas", sab: 0 },
  { g: "🧱", n: "Ladrillo", sab: 1500, edif: "molino", s: "Molino 🌾 + carretillas: llevan el doble" },
  { g: "⚙️", n: "Máquinas", sab: 8000, edif: "fabrica", s: "Fábrica 🏭: más madera y piedra, caminan más rápido" },
  { g: "⚡", n: "Electricidad", sab: 30000, edif: "central", s: "Central ⚡: luces de noche y turno nocturno" },
  { g: "🚀", n: "Espacial", sab: 90000, edif: "base", s: "Base espacial: cohetes que traen gemas del cielo" },
];

// ======================= Islas (mundo infinito) =======================
const SEP = 74, DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
const centroHex = (q, r) => ({ x: SEP * (q + r / 2), z: SEP * (r * Math.sqrt(3) / 2) });
const BIOMAS = { pradera: { pasto: "#7ACB6B", arbol: .42, arbusto: .74 }, bosque: { pasto: "#5DB25A", arbol: .7, arbusto: .85 }, rocosa: { pasto: "#9CC77A", arbol: .25, arbusto: .45 }, frutal: { pasto: "#86D46E", arbol: .3, arbusto: .8 } };
function crearIsla(q, r) {
  const c = centroHex(q, r), rd = semilla(q * 7919 + r * 104729 + 17);
  const isla = { id: E.id++, q, r, x: c.x + (rd() - .5) * 10, z: c.z + (rd() - .5) * 10, radio: q === 0 && r === 0 ? 28 : 23 + rd() * 8, bioma: q === 0 && r === 0 ? "pradera" : elegir(Object.keys(BIOMAS)), colonizada: false, nLugar: 0 };
  E.islas.push(isla); sembrar(isla); return isla;
}
const islaDe = (id) => E.islas.find((i) => i.id === id);
function lugares(isla) {
  if (isla._lug) return isla._lug;
  const rd = semilla(isla.id * 31 + 7), l = [];
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
    if (!i && !j && isla.capital) continue;
    const x = i * 7 + (rd() - .5) * 1.4, z = j * 7 + (rd() - .5) * 1.4, d = Math.hypot(x, z);
    if (d < isla.radio - 5) l.push({ x: isla.x + x, z: isla.z + z, d: d + rd() * .5 });
  }
  return (isla._lug = l.sort((a, b) => a.d - b.d));
}
const lugarLibre = (isla) => isla.colonizada && isla.nLugar < lugares(isla).length;
function vecinasNuevas() {
  for (const i of E.islas.filter((i) => i.colonizada)) for (const [dq, dr] of DIRS) {
    if (!E.islas.some((o) => o.q === i.q + dq && o.r === i.r + dr)) crearIsla(i.q + dq, i.r + dr);
  }
}
function puntosPuente(p) {
  const a = islaDe(p.a), b = islaDe(p.b), d = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / d, uz = (b.z - a.z) / d;
  return { ini: { x: a.x + ux * (a.radio - 1.2), z: a.z + uz * (a.radio - 1.2) }, fin: { x: b.x - ux * (b.radio - 1.2), z: b.z - uz * (b.radio - 1.2) }, ux, uz };
}
function dentro(p, isla) {
  const dx = p.x - isla.x, dz = p.z - isla.z, r = Math.hypot(dx, dz), max = isla.radio - 2;
  if (r > max) { p.x = isla.x + dx * max / r; p.z = isla.z + dz * max / r; } return p;
}

// ======================= Estado =======================
const CLAVE = "brotitos-3d-v2";
let E;
let sigId = 1;
function crearBicho(x, z, adulto, isla) {
  return { id: sigId++, n: nombre(), isla, x, z, y: 0, dx: 0, dz: 1, est: "quieto", obj: null, carga: null, cant: 0, edad: adulto ? 999 : 0,
    susto: 0, hue: rnd(140, 200) | 0, fase: Math.random() * 6, trabajo: 0, charla: null, charlaT: 0, quieto: rnd(0.5, 2), oficio: null, adentro: false };
}
function nuevoEstado() {
  E = { t: Date.now(), tiempo: 30, id: 1, comida: 6, madera: 4, piedra: 2, gemas: 0, animo: 80, energia: 10,
    nacidos: 1, explotados: 0, meta: 0, maxNivel: 2, sab: 0, era: 0, islas: [], puentes: [], bichos: [], recursos: [], edificios: [], mina: null,
    pedido: null, proxPedido: 25, cohete: 150 };
  const isla = crearIsla(0, 0); isla.colonizada = true; isla.capital = true; isla._lug = null;
  E.edificios.push({ id: E.id++, tipo: "fogata", isla: isla.id, x: isla.x, z: isla.z, prog: 1, nivel: 1, era: 0 });
  E.recursos = E.recursos.filter((r) => Math.hypot(r.x - isla.x, r.z - isla.z) > 4);
  E.bichos.push(crearBicho(isla.x + 1.5, isla.z + 1.5, true, isla.id));
  vecinasNuevas();
  return E;
}
const limpio = (o) => { const c = {}; for (const k in o) if (k[0] !== "_") c[k] = o[k]; return c; };
function guardar() {
  try {
    E.t = Date.now(); E.sigId = sigId;
    localStorage.setItem(CLAVE, JSON.stringify({ ...E, bichos: E.bichos.map(limpio), recursos: E.recursos.map(limpio), edificios: E.edificios.map(limpio), islas: E.islas.map(limpio), puentes: E.puentes.map(limpio) }));
  } catch (e) {}
}
function cargar() {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE));
    if (!s || !s.bichos) return null;
    sigId = s.sigId || 1000;
    for (const b of s.bichos) { if (b.y < 0 || b.est === "cruzar") { b.y = 0; b.est = "quieto"; b.quieto = .5; } b.adentro = false; }
    return s;
  } catch (e) { return null; }
}

// ======================= Mundo =======================
const listo = (e) => e.prog >= 1;
const pisosListos = (e) => listo(e) ? e.nivel : e.nivel - 1;
const capacidad = () => E.edificios.reduce((s, e) => s + (e.tipo === "casa" ? pisosListos(e) * 3 : e.tipo === "fogata" ? 2 : 0), 0);
const casas = () => E.edificios.filter((e) => e.tipo === "casa" && pisosListos(e) > 0);
const almacenesDe = (islaId) => E.edificios.filter((e) => e.isla === islaId && ((e.tipo === "casa" && pisosListos(e) > 0) || e.tipo === "fogata"));
const todosAlmacenes = () => E.edificios.filter((e) => (e.tipo === "casa" && pisosListos(e) > 0) || e.tipo === "fogata");
const hay = (tipo) => E.edificios.some((e) => e.tipo === tipo && listo(e));
const cuantos = (tipo) => E.edificios.filter((e) => e.tipo === tipo && listo(e)).length;
function cercano(lista, p) { let m = null, d = 1e9; for (const o of lista) { const dd = Math.hypot(o.x - p.x, o.z - p.z); if (dd < d) { d = dd; m = o; } } return m; }

function sembrar(isla) {
  const bio = BIOMAS[isla.bioma], n = Math.round(Math.PI * isla.radio * isla.radio / 22);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (isla.radio - 2.5);
    const x = isla.x + Math.cos(a) * r, z = isla.z + Math.sin(a) * r;
    const q = Math.random(), tipo = q < bio.arbol ? "arbol" : q < bio.arbusto ? "arbusto" : "roca";
    const max = tipo === "arbol" ? 6 : 5;
    E.recursos.push({ id: E.id++, isla: isla.id, tipo, x, z, cant: max, max, crece: 0 });
  }
}
function nuevoEdificio(tipo, preferirCapital) {
  let isla = preferirCapital ? E.islas.find((i) => i.capital && lugarLibre(i)) : null;
  if (!isla) { const libres = E.islas.filter(lugarLibre); isla = libres.sort((a, b) => a.nLugar - b.nLugar)[0]; }
  if (!isla) return null;
  const p = lugares(isla)[isla.nLugar++];
  const e = { id: E.id++, tipo, isla: isla.id, x: p.x, z: p.z, prog: 0, nivel: 1, era: E.era };
  if (tipo === "huerta") { e.cant = 4; e.max = 8; e.crece = 0; }
  E.edificios.push(e);
  E.recursos = E.recursos.filter((r) => Math.hypot(r.x - e.x, r.z - e.z) > 4.2);
  return e;
}
function nuevoPuente() {
  const coloniz = E.islas.filter((i) => i.colonizada);
  let mejor = null;
  for (const a of coloniz) for (const [dq, dr] of DIRS) {
    const b = E.islas.find((o) => o.q === a.q + dq && o.r === a.r + dr);
    if (!b || b.colonizada || E.puentes.some((p) => p.b === b.id)) continue;
    const d = Math.hypot(b.x, b.z) + Math.random() * 20;
    if (!mejor || d < mejor.d) mejor = { a, b, d };
  }
  if (!mejor) return null;
  const p = { id: E.id++, tipo: "puente", a: mejor.a.id, b: mejor.b.id, isla: mejor.a.id, prog: 0 };
  const pp = puntosPuente(p); p.x = pp.ini.x; p.z = pp.ini.z;
  E.puentes.push(p); return p;
}

// ======================= Simulación =======================
const VEL = 2.3, VEL_BEBE = 1.6, GRANDE = 45;
let eventos = [];
let activas = new Set(); // islas que se simulan Brotito por Brotito (las que estás mirando)
function paso(dt, offline) {
  E.tiempo += dt;
  const noche = esNoche();
  for (const r of E.recursos) if (r.cant < r.max) { r.crece += dt; if (r.crece > (r.tipo === "arbusto" ? 14 : 24)) { r.crece = 0; r.cant++; } }
  for (const h of E.edificios) if (h.tipo === "huerta" && listo(h) && h.cant < h.max) { h.crece += dt; if (h.crece > 4) { h.crece = 0; h.cant++; } }
  E.energia = Math.min(10, E.energia + dt / 6);
  E.animo = clamp(E.animo + ((E.comida > 0 ? 0.25 : -0.6) + (hay("torre") ? .15 : 0)) * dt, 0, 100);
  E.comerT = (E.comerT || 0) + dt;
  if (E.comerT > 40) { E.comerT = 0; E.comida = Math.max(0, E.comida - Math.ceil(E.bichos.length / 3)); }
  // producción de los edificios especiales
  const prod = (k, v) => { E["_" + k] = (E["_" + k] || 0) + v * dt; if (E["_" + k] >= 1) { const n = E["_" + k] | 0; E[k] += n; E["_" + k] -= n; } };
  if (cuantos("molino") && E.comida < 30 + E.bichos.length) prod("comida", .15 * cuantos("molino"));
  if (cuantos("fabrica")) { if (E.madera < 40 + E.bichos.length * .3) prod("madera", .12 * cuantos("fabrica")); if (E.piedra < 30 + E.bichos.length * .3) prod("piedra", .1 * cuantos("fabrica")); }
  // sabiduría
  const adultos = E.bichos.reduce((s, b) => s + (b.edad > GRANDE ? 1 : 0), 0);
  E.sab += dt * (Math.sqrt(adultos) * .15 + cuantos("escuela") * .2 + cuantos("biblioteca") * .6);
  const sig = ERAS[E.era + 1];
  if (sig && E.sab >= sig.sab) {
    E.era++; eventos.push({ tipo: "era" });
    if (sig.edif) nuevoEdificio(sig.edif, true);
  }
  // renovar casas viejas al estilo de la era nueva (de a poco)
  E.renovarT = (E.renovarT || 0) + dt;
  if (E.renovarT > 3) { E.renovarT = 0; const vieja = E.edificios.find((e) => e.tipo === "casa" && listo(e) && e.era < E.era); if (vieja) vieja.era = E.era; }
  // cohetes de la era espacial
  if (hay("base")) { E.cohete -= dt; if (E.cohete <= 0) { E.cohete = 150; E.gemas += E.gemas < 60 ? 5 : 0; eventos.push({ tipo: "cohete" }); } }

  // Brotitos: detallados en las islas que mirás, en resumen en el resto
  for (const b of E.bichos) {
    if (!offline && activas.has(b.isla)) actualizarBicho(b, dt, offline, noche);
    else { b.edad += dt * (hay("escuela") && b.edad < GRANDE ? 2 : 1); if (b.charlaT > 0) b.charlaT -= dt; b._congelado = true; if (b.est === "cruzar") { b.isla = b.destino; const i = islaDe(b.isla); b.x = i.x + rnd(-4, 4); b.z = i.z + rnd(-4, 4); b.est = "quieto"; } }
  }
  E.resumenT = (E.resumenT || 0) + dt;
  if (E.resumenT >= 1) { resumen(E.resumenT, offline, noche); E.resumenT = 0; }

  // nacimientos
  E.nacerT = (E.nacerT || 0) + dt;
  if (!noche && E.nacerT > 6 * (E.animo < 30 ? 2 : 1)) {
    E.nacerT = 0;
    if (E.bichos.length < capacidad() && E.comida >= 4 && adultos > 0) {
      E.comida -= 4;
      const casa = elegir(todosAlmacenes());
      const bebe = crearBicho(casa.x + rnd(-2, 2), casa.z + rnd(2, 3), false, casa.isla);
      E.bichos.push(bebe); E.nacidos++;
      eventos.push({ tipo: "nace", b: bebe });
      if (!offline && activas.has(bebe.isla)) { corazones(bebe); hablar(bebe, "¡" + elegir(SILABAS) + "!", true); }
    }
  }
  // metas
  const m = METAS[E.meta];
  if (m && E.bichos.length >= m.pob) {
    E.meta++;
    if (m.tipo) nuevoEdificio(m.tipo, true);
    if (m.nivel) E.maxNivel = m.nivel;
    eventos.push({ tipo: "meta", m });
  }
  // más lugar: piso nuevo, casa nueva o puente a otra isla
  const obraCasa = E.edificios.some((e) => e.tipo === "casa" && !listo(e));
  if (!obraCasa && E.bichos.length >= capacidad() - 1) {
    const subible = casas().filter((c) => c.nivel < E.maxNivel);
    const c = subible.length && Math.random() < .65 ? elegir(subible) : null;
    if (c) {
      const k = { madera: 6 + c.nivel * 3, piedra: 4 + c.nivel * 3, gemas: c.nivel >= 3 ? 2 : 0 };
      if (E.madera >= k.madera && E.piedra >= k.piedra && E.gemas >= k.gemas) { E.madera -= k.madera; E.piedra -= k.piedra; E.gemas -= k.gemas; c.nivel++; c.prog = 0; eventos.push({ tipo: "piso" }); }
    } else if (E.islas.some(lugarLibre)) {
      if (E.madera >= 8 && E.piedra >= 4) { E.madera -= 8; E.piedra -= 4; nuevoEdificio("casa"); eventos.push({ tipo: "obra" }); }
    } else if (!E.puentes.some((p) => p.prog < 1) && E.madera >= 20 && E.piedra >= 10) {
      E.madera -= 20; E.piedra -= 10; if (nuevoPuente()) eventos.push({ tipo: "puente" });
    }
  }
  // islas con lugar: si todas las casas posibles están hechas, preparar puente antes de llenarse
  if (!E.puentes.some((p) => p.prog < 1) && E.islas.filter(lugarLibre).every((i) => lugares(i).length - i.nLugar < 3) && E.madera >= 30 && E.piedra >= 15) {
    E.madera -= 20; E.piedra -= 10; if (nuevoPuente()) eventos.push({ tipo: "puente" });
  }
  if (!offline) {
    if (E.pedido) { E.pedido.t -= dt; if (E.pedido.t <= 0) { E.pedido = null; E.animo = clamp(E.animo - 8, 0, 100); aviso("No llegaste a tiempo… 😕"); E.proxPedido = rnd(30, 60); } }
    else if (!noche) { E.proxPedido -= dt; if (E.proxPedido <= 0 && E.bichos.length) nuevoPedido(); }
  }
}
// islas que no estás mirando: cuentas simples en vez de mover a cada Brotito
function resumen(dt, offline, noche) {
  const porIsla = new Map();
  for (const b of E.bichos) if ((offline || !activas.has(b.isla)) && b.edad > GRANDE) porIsla.set(b.isla, (porIsla.get(b.isla) || 0) + 1);
  const trabajan = noche && E.era < 3 ? 0 : noche ? .5 : 1;
  const llevar = E.era >= 1 ? 2 : 1, rapido = E.era >= 2 ? 1.3 : 1;
  for (const [islaId, n] of porIsla) {
    let gente = n * trabajan;
    // construir
    for (const o of E.edificios.concat(E.puentes)) if (o.isla === islaId && !listo(o) && gente > 0) {
      const usan = Math.min(gente, o.tipo === "casa" ? 4 : 6); gente -= usan;
      avanzarObra(o, usan * dt * .05, offline);
    }
    // juntar (más o menos lo que hace uno que va y vuelve)
    const tasa = gente * .045 * llevar * rapido * dt;
    const pob = E.bichos.length;
    const falta = { comida: E.comida > 30 + pob ? 0 : Math.max(.5, 6 + pob * .6 - E.comida), madera: E.madera > 20 + pob * .2 ? 0 : Math.max(.3, 12 - E.madera), piedra: E.piedra > 14 + pob * .2 ? 0 : Math.max(.3, 8 - E.piedra) };
    const tot = falta.comida + falta.madera + falta.piedra; if (!tot) continue;
    for (const k in falta) { E["_r" + k] = (E["_r" + k] || 0) + tasa * falta[k] / tot; if (E["_r" + k] >= 1) { const v = E["_r" + k] | 0; E[k] += v; E["_r" + k] -= v; } }
    if (E.mina && islaId === E.mina.isla && E.gemas < 12 + E.era * 6) { E._rgemas = (E._rgemas || 0) + tasa * .04 * E.mina.prof; if (E._rgemas >= 1) { E.gemas++; E._rgemas--; } }
  }
}
function avanzarObra(o, cuanto, offline) {
  const lento = { torre: .4, cohete: .25, escuela: .6, mina: .7, biblioteca: .5, molino: .6, fabrica: .45, central: .4, base: .3, puente: .5 }[o.tipo] || 1;
  o.prog = Math.min(1, o.prog + cuanto * lento);
  if (listo(o)) {
    if (o.tipo === "mina" && !E.mina) E.mina = { x: o.x, z: o.z, isla: o.isla, prof: 1, cavado: 0, id: o.id };
    if (o.tipo === "puente") { const b = islaDe(o.b); b.colonizada = true; b._lug = null; vecinasNuevas(); migrar(o); }
    eventos.push({ tipo: "listo", e: o });
    if (!offline && activas.has(o.isla)) festejo(o);
  }
}
function migrar(p) {
  const desde = E.bichos.filter((b) => b.isla === p.a && b.edad > GRANDE && b.y === 0).slice(0, 5);
  for (const b of desde) { b.est = "cruzar"; b.destino = p.b; b.puente = p.id; b.tramo = 0; b.adentro = false; }
  if (!desde.length) { const i = islaDe(p.b); E.bichos.push(crearBicho(i.x, i.z, true, i.id)); }
}
function buscar(id) { return E.recursos.find((r) => r.id === id) || E.edificios.find((e) => e.id === id) || E.puentes.find((p) => p.id === id); }

function actualizarBicho(b, dt, offline, noche) {
  if (b._congelado) { b._congelado = false; if (b.carga) { E[b.carga] += b.cant || 1; b.carga = null; } b.est = "quieto"; b.quieto = rnd(0, 1.5); b.y = 0; b.adentro = false; }
  b.edad += dt * (hay("escuela") && b.edad < GRANDE ? 2 : 1); b.fase += dt * 10;
  if (b.charlaT > 0) b.charlaT -= dt;
  const isla = islaDe(b.isla); if (!isla) return;
  const adulto = b.edad > GRANDE, vel = (adulto ? VEL : VEL_BEBE) * (E.animo < 30 ? .7 : 1) * (E.era >= 2 ? 1.3 : 1);
  if (b.susto > 0 && b.y === 0 && b.est !== "cruzar") {
    b.susto -= dt; b.adentro = false;
    b.x += b.dx * vel * 1.8 * dt; b.z += b.dz * vel * 1.8 * dt; dentro(b, isla);
    return;
  }
  const mover = (p, sep = 0) => {
    const dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
    if (d <= sep + .25) return true;
    b.dx = dx / d; b.dz = dz / d; const paso = Math.min(d - sep, vel * dt);
    b.x += b.dx * paso; b.z += b.dz * paso; return false;
  };
  const almacenCercano = () => cercano(almacenesDe(b.isla), b) || cercano(todosAlmacenes(), b);
  switch (b.est) {
    case "quieto": b.quieto -= dt; if (b.quieto <= 0) decidir(b, adulto, noche, isla); break;
    case "pasear": if (mover(b.obj)) { b.est = "quieto"; b.quieto = rnd(1, 3); if (Math.random() < .25) hablar(b, balbuceo(rnd(1, 3) | 0)); } break;
    case "a_dormir": { const c = buscar(b.obj); if (!c) { b.est = "quieto"; b.quieto = .5; break; } if (mover(c, 1.6)) { b.adentro = true; b.est = "durmiendo"; } break; }
    case "durmiendo": if (!noche || (E.era >= 3 && b.id % 2)) { b.adentro = false; b.est = "quieto"; b.quieto = rnd(.1, 2.5); } break;
    case "ir_recurso": { const r = buscar(b.obj); if (!r || r.cant <= 0) { b.est = "quieto"; b.quieto = .3; break; } if (mover(r, r.tipo === "huerta" ? 2.6 : 1.1)) { b.est = "juntar"; b.trabajo = r.tipo === "huerta" ? 1.2 : 1.6; b.dx = r.x - b.x; b.dz = r.z - b.z; } break; }
    case "juntar": {
      b.trabajo -= dt;
      if (b.trabajo <= 0) { const r = buscar(b.obj); if (r && r.cant > 0) { const k = Math.min(r.cant, E.era >= 1 ? 2 : 1); r.cant -= k; b.carga = TIPO_RECURSO[r.tipo]; b.cant = k; b.est = "llevar"; b.obj = (almacenCercano() || {}).id; } else { b.est = "quieto"; b.quieto = .3; } }
      break;
    }
    case "llevar": { const a = buscar(b.obj) || almacenCercano(); if (!a) { b.est = "quieto"; break; } if (mover(a, 1.8)) { E[b.carga] += b.cant || 1; b.carga = null; b.cant = 0; b.est = "quieto"; b.quieto = rnd(.2, .8); } break; }
    case "construir": {
      const o = buscar(b.obj); if (!o || listo(o)) { b.est = "quieto"; b.quieto = .5; break; }
      const meta = o.tipo === "puente" ? { x: o.x + Math.cos(b.ang) * 1.2, z: o.z + Math.sin(b.ang) * 1.2 } : { x: o.x + Math.cos(b.ang) * 2.7, z: o.z + Math.sin(b.ang) * 2.7 };
      if (mover(dentro(meta, isla))) {
        b.dx = o.x - b.x || .01; b.dz = o.z - b.z;
        avanzarObra(o, dt * .05, offline);
        if (listo(o) && Math.random() < .5) hablar(b, "¡" + balbuceo(1) + "!", true);
      }
      break;
    }
    case "cruzar": {
      const p = E.puentes.find((x) => x.id === b.puente); if (!p) { b.est = "quieto"; break; }
      const pp = puntosPuente(p), dest = islaDe(b.destino);
      const metas = [pp.ini, pp.fin, { x: dest.x + rnd(-1, 1) * 0 + (pp.fin.x - dest.x) * .6, z: dest.z + (pp.fin.z - dest.z) * .6 }];
      if (mover(metas[b.tramo])) { b.tramo++; if (b.tramo === 2) b.isla = b.destino; if (b.tramo > 2) { b.est = "quieto"; b.quieto = 1; hablar(b, "¡" + balbuceo(1) + "!"); } }
      break;
    }
    case "ir_mina": if (!E.mina) { b.est = "quieto"; break; } if (mover(E.mina)) b.est = "bajar"; break;
    case "bajar": b.y -= vel * .8 * dt; if (b.y <= -2.4) { b.y = -3; b.est = "abajo"; b.trabajo = rnd(5, 8); } break;
    case "abajo": {
      b.trabajo -= dt;
      if (b.trabajo <= 0) {
        const m = E.mina; m.cavado++;
        b.carga = Math.random() < .1 + m.prof * .05 ? "gemas" : "piedra"; b.cant = E.era >= 1 ? 2 : 1;
        if (m.cavado >= 8 + m.prof * 6) { m.cavado = 0; m.prof++; eventos.push({ tipo: "nivelMina" }); }
        b.est = "subir"; b.y = -2.4;
      }
      break;
    }
    case "subir": b.y += vel * .8 * dt; if (b.y >= 0) { b.y = 0; b.est = "llevar"; b.obj = (almacenCercano() || {}).id; } break;
  }
}
function decidir(b, adulto, noche, isla) {
  if (noche && !(E.era >= 3 && b.id % 2)) { const c = cercano(almacenesDe(b.isla), b); if (c) { b.est = "a_dormir"; b.obj = c.id; b.oficio = null; return; } }
  if (!adulto) {
    const esc = E.edificios.find((e) => e.tipo === "escuela" && listo(e) && e.isla === b.isla);
    const base = esc && Math.random() < .5 ? esc : b;
    b.est = "pasear"; b.obj = dentro({ x: base.x + rnd(-4, 4), z: base.z + rnd(-4, 4) }, isla); return;
  }
  const obra = E.edificios.concat(E.puentes).find((o) => o.isla === b.isla && !listo(o) && E.bichos.filter((x) => x.est === "construir" && x.obj === o.id).length < (o.tipo === "casa" ? 4 : 6));
  if (obra && Math.random() < .7) { b.est = "construir"; b.obj = obra.id; b.ang = Math.random() * Math.PI * 2; b.oficio = "constructor"; return; }
  const pob = E.bichos.length;
  const falta = {
    comida: 6 + pob * .6 - E.comida + (E.pedido && E.pedido.tipo === "comida" ? 5 : 0),
    madera: E.madera > 20 + pob * .2 ? -99 : 12 - E.madera,
    piedra: E.piedra > 14 + pob * .2 ? -99 : 8 - E.piedra,
    gemas: E.mina ? (E.gemas > 8 ? -99 : 4 - E.gemas) : -999,
  };
  const tipos = Object.keys(falta).sort((a, c) => falta[c] - falta[a]);
  const utiles = tipos.filter((t) => falta[t] > -50);
  if (!utiles.length) { const c = cercano(almacenesDe(b.isla), b) || b; b.oficio = null; b.est = "pasear"; b.obj = dentro({ x: c.x + rnd(-6, 6), z: c.z + rnd(-6, 6) }, isla); if (Math.random() < .3) b.quieto = rnd(2, 5); return; }
  const tipo = Math.random() < .7 || utiles.length < 2 ? tipos[0] : elegir(utiles);
  b.oficio = OFICIO[tipo];
  if (E.mina && E.mina.isla === b.isla && (tipo === "gemas" || (tipo === "piedra" && Math.random() < .6))) {
    const abajo = E.bichos.filter((o) => ["ir_mina", "bajar", "abajo", "subir"].includes(o.est)).length;
    if (abajo < 4 + E.mina.prof * 2) { b.est = "ir_mina"; return; }
  }
  const objetivos = tipo === "comida" ? ["arbusto", "huerta"] : tipo === "madera" ? ["arbol"] : ["roca"];
  const cands = E.recursos.filter((r) => r.isla === b.isla && objetivos.includes(r.tipo)).concat(E.edificios.filter((e) => e.isla === b.isla && objetivos.includes(e.tipo) && listo(e)));
  const libres = cands.filter((r) => r.cant > 0 && E.bichos.filter((o) => o.obj === r.id && o.est === "ir_recurso").length < (r.tipo === "huerta" ? 4 : 2));
  const r = cercano(libres, { x: b.x + rnd(-6, 6), z: b.z + rnd(-6, 6) });
  if (r) { b.est = "ir_recurso"; b.obj = r.id; return; }
  b.oficio = null; b.est = "pasear"; b.obj = dentro({ x: b.x + rnd(-8, 8), z: b.z + rnd(-8, 8) }, isla);
}

// ======================= Jugador =======================
function nuevoPedido() {
  const tipo = elegir(["comida", "madera", "piedra"]);
  const vis = E.bichos.filter((b) => b.edad > GRANDE && !b.adentro && b.y === 0 && activas.has(b.isla));
  const pide = elegir(vis) || E.bichos[0];
  E.pedido = { tipo, cant: 3 + Math.min(20, E.bichos.length / 8 | 0), dado: 0, t: 25, total: 25 };
  hablar(pide, ICONO[tipo] + "? " + balbuceo(1), true);
}
function dar(tipo) {
  if (E.energia < 1) { aviso("Sin energía ⚡ esperá un poquito"); return; }
  E.energia -= 1; E[tipo] += 1 + E.era;
  const cerca = cercano(E.bichos.filter((b) => !b.adentro && b.y === 0 && activas.has(b.isla)), controles.target);
  if (cerca) { corazones(cerca); if (Math.random() < .4) hablar(cerca, "¡" + ICONO[tipo] + "!"); }
  sonido("dar");
  if (E.pedido && E.pedido.tipo === tipo) {
    E.pedido.dado++;
    if (E.pedido.dado >= E.pedido.cant) {
      E.pedido = null; E.proxPedido = rnd(35, 70); E.animo = clamp(E.animo + 20, 0, 100);
      for (const b of E.bichos) if (!b.adentro && activas.has(b.isla) && Math.random() < .5) hablar(b, elegir(["¡yei!", "¡bu bu!", "¡riii!", "💚"]), false);
      festejo(controles.target); aviso("¡Pedido cumplido! Están felices 💚"); sonido("festejo");
    }
  }
  pintarHUD();
}
$("d-comida").onclick = () => dar("comida");
$("d-madera").onclick = () => dar("madera");
$("d-piedra").onclick = () => dar("piedra");

function explotar(b) {
  E.bichos = E.bichos.filter((o) => o !== b); E.explotados++;
  E.animo = clamp(E.animo - 15, 0, 100);
  const esc = b.edad < GRANDE ? .55 + b.edad / GRANDE * .3 : 1;
  quitarMallaBicho(b);
  aplastado(b, esc);
  const rojo = new THREE.Color("#C8102E");
  for (let i = 0; i < 22; i++) particula({ x: b.x, y: .6, z: b.z }, { x: rnd(-4.5, 4.5), y: rnd(2.5, 7), z: rnd(-4.5, 4.5) }, rojo, rnd(.6, 1.1), rnd(.07, .16), null, true);
  onda(b);
  for (const o of E.bichos) {
    if (o.adentro || o.y !== 0 || o.isla !== b.isla || o.est === "cruzar") continue;
    const d = dist(o, b);
    if (d < 10) { o.susto = rnd(6, 10); o.dx = (o.x - b.x) / (d || 1); o.dz = (o.z - b.z) / (d || 1); o.carga = null; o.est = "quieto"; o.quieto = 1; if (Math.random() < .75) setTimeout(() => hablar(o, elegir(["¡no no!", "¡ayyy!", "¡no no no!", "😱", "¡aaay!"]), true), rnd(150, 700)); }
  }
  sonido("aplastar"); sonido("ay", b);
  if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
  if (!E.bichos.length) setTimeout(() => { aviso("No queda ninguno… nace uno nuevo 🌱"); const i = E.islas.find((x) => x.capital); E.bichos.push(crearBicho(i.x + 1.5, i.z + 1.5, true, i.id)); }, 1500);
}

// ======================= Sonido =======================
let AC = null, sonidoOn = true;
try { sonidoOn = localStorage.getItem("brotitos-sonido") !== "0"; } catch (e) {}
function audio() { if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); } if (AC.state === "suspended") AC.resume(); return AC; }
function blip(ctx, t0, f, dur, tipo = "triangle", vol = .18) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = tipo;
  o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * rnd(.85, 1.25), t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .01); g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
  o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + dur + .02);
}
function ruido(ctx, t, dur, vol, f0, f1) {
  const n = ctx.sampleRate * dur, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur * .8);
  s.buffer = buf; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(t);
}
function sonido(tipo, b) {
  if (!sonidoOn) return; const ctx = audio(); if (!ctx) return; const t = ctx.currentTime + .01;
  if (tipo === "habla") { const base = (b && b.edad < GRANDE ? 1100 : 820) + ((b ? b.hue : 170) - 170) * 3; for (let i = 0; i < 3 + (Math.random() * 3 | 0); i++) blip(ctx, t + i * .09, base * rnd(.85, 1.15), .07, "sine", .12); }
  if (tipo === "susto") { const base = 1250 + ((b ? b.hue : 170) - 170) * 3; for (let i = 0; i < 2; i++) blip(ctx, t + i * .16, base * (1 - i * .15), .13, "triangle", .14); }
  if (tipo === "dar") blip(ctx, t, 660, .1, "sine", .15);
  if (tipo === "festejo") [660, 880, 990, 1320].forEach((f, i) => blip(ctx, t + i * .08, f, .12, "triangle", .14));
  if (tipo === "logro") [523, 659, 784, 1047, 1319].forEach((f, i) => blip(ctx, t + i * .11, f, .2, "triangle", .16));
  if (tipo === "aplastar") {
    ruido(ctx, t, .25, .7, 2200, 300);
    const o = ctx.createOscillator(), go = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(70, t + .18);
    go.gain.setValueAtTime(.35, t); go.gain.exponentialRampToValueAtTime(.001, t + .2); o.connect(go); go.connect(ctx.destination); o.start(t); o.stop(t + .22);
  }
  if (tipo === "ay") {
    const base = (b && b.edad < GRANDE ? 1300 : 1000);
    const o = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(base * 1.25, t); o.frequency.exponentialRampToValueAtTime(base * .45, t + .55);
    vib.frequency.value = 22; vg.gain.value = 40; vib.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22, t + .03); g.gain.setValueAtTime(.22, t + .3); g.gain.exponentialRampToValueAtTime(.001, t + .6);
    o.connect(g); g.connect(ctx.destination); o.start(t); vib.start(t); o.stop(t + .62); vib.stop(t + .62);
  }
  if (tipo === "cohete") { ruido(ctx, t, 2.2, .35, 1800, 200); }
}
let ultimaVoz = 0;
function hablar(b, txt, fuerte) {
  b.charla = txt; b.charlaT = 2.6;
  if (activas.has(b.isla) && enPantalla(b) && (fuerte || performance.now() - ultimaVoz > 900)) { ultimaVoz = performance.now(); sonido(b.susto > 0 ? "susto" : "habla", b); }
}
$("b-sonido").textContent = sonidoOn ? "🔊" : "🔈";
$("b-sonido").onclick = () => { sonidoOn = !sonidoOn; $("b-sonido").textContent = sonidoOn ? "🔊" : "🔈"; try { localStorage.setItem("brotitos-sonido", sonidoOn ? "1" : "0"); } catch (e) {} };

let avisoT, logroT;
function aviso(t) { const a = $("aviso"); a.textContent = t; a.classList.add("ver"); clearTimeout(avisoT); avisoT = setTimeout(() => a.classList.remove("ver"), 2600); }
function logro(gl, t, s) { $("logro-g").textContent = gl; $("logro-t").textContent = t; $("logro-s").textContent = s; $("logro").classList.add("ver"); clearTimeout(logroT); logroT = setTimeout(() => $("logro").classList.remove("ver"), 3800); sonido("logro"); }

// ======================= 3D: escena =======================
const render = new THREE.WebGLRenderer({ antialias: true });
render.setPixelRatio(Math.min(2, devicePixelRatio || 1));
render.setSize(innerWidth, innerHeight);
render.shadowMap.enabled = true; render.shadowMap.type = THREE.PCFSoftShadowMap;
$("lienzo").appendChild(render.domElement);
const escena = new THREE.Scene();
const CIELO_DIA = new THREE.Color("#9FE3F5"), CIELO_NOCHE = new THREE.Color("#1B1C48");
escena.background = CIELO_DIA.clone();
escena.fog = new THREE.Fog(CIELO_DIA.clone(), 220, 520);
const camara = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .5, 1400);
camara.position.set(0, 17, 22);
const controles = new OrbitControls(camara, render.domElement);
controles.enableDamping = true; controles.dampingFactor = .12;
controles.minDistance = 7; controles.maxDistance = 420; controles.maxPolarAngle = 1.32; controles.minPolarAngle = .25;
controles.screenSpacePanning = false;
controles.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
controles.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
addEventListener("resize", () => { camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix(); render.setSize(innerWidth, innerHeight); });

const hemi = new THREE.HemisphereLight("#ffffff", "#7a6a50", .9); escena.add(hemi);
const sol = new THREE.DirectionalLight("#fff4dd", 1.7);
sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -.0006; sol.shadow.normalBias = .03;
{ const s = sol.shadow.camera; s.left = -55; s.right = 55; s.top = 55; s.bottom = -55; s.near = 1; s.far = 400; }
escena.add(sol, sol.target);
const estrellas = (() => {
  const g = new THREE.BufferGeometry(), p = [];
  for (let i = 0; i < 700; i++) { const a = Math.random() * Math.PI * 2, e = rnd(.12, 1.4), r = 900; p.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: "#ffffff", size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
  escena.add(pts); return pts;
})();

const MAT = {};
const mat = (c) => MAT[c] || (MAT[c] = new THREE.MeshLambertMaterial({ color: c }));
const VENTANA = new THREE.MeshLambertMaterial({ color: "#FFF3B0", emissive: "#FFC75A", emissiveIntensity: .1 });
const NEON = new THREE.MeshLambertMaterial({ color: "#B8F3FF", emissive: "#5FE3FF", emissiveIntensity: .2 });
const LLAMA = new THREE.MeshBasicMaterial({ color: "#FF9A3D" }), LLAMA2 = new THREE.MeshBasicMaterial({ color: "#FFE07A" });
const G = {
  esfera: new THREE.SphereGeometry(.5, 20, 14), caja: new THREE.BoxGeometry(1, 1, 1),
  cil: new THREE.CylinderGeometry(.5, .5, 1, 16), cono: new THREE.ConeGeometry(.5, 1, 16), piramide: new THREE.ConeGeometry(.5, 1, 4),
  ojo: new THREE.SphereGeometry(.09, 10, 8), media: new THREE.SphereGeometry(.5, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  roca: new THREE.DodecahedronGeometry(.5, 0), hoja: new THREE.SphereGeometry(.5, 10, 8),
};
const GEO_FIJAS = new Set(Object.values(G));
const malla = (geo, material, sx = 1, sy = 1, sz = 1, x = 0, y = 0, z = 0, sombra = true) => { const m = new THREE.Mesh(geo, material); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = sombra; m.receiveShadow = true; return m; };
function liberar(g) { escena.remove(g); g.traverse((o) => { if (o.geometry && !GEO_FIJAS.has(o.geometry)) o.geometry.dispose(); }); }

// ---- islas ----
const mallasIsla = new Map(); // id → { g, detalle }
function mallaIsla(isla, detalle) {
  const g = new THREE.Group(), r = isla.radio, seg = detalle ? 56 : 28, bio = BIOMAS[isla.bioma];
  const tono = isla.colonizada ? bio.pasto : new THREE.Color(bio.pasto).lerp(new THREE.Color("#9FB5A0"), .35).getStyle();
  const pasto = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .6, seg), mat(tono)); pasto.position.y = -.3; pasto.receiveShadow = true;
  const borde = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.002, r * .97, .9, seg), mat("#63B257")); borde.position.y = -.9;
  const alto = r * .45 + 4;
  const tierra = new THREE.Mesh(new THREE.CylinderGeometry(r * .97, r * .55, alto, seg), mat("#B9875A")); tierra.position.y = -1.35 - alto / 2;
  const punta = new THREE.Mesh(new THREE.ConeGeometry(r * .55, r * .5, seg), mat("#9C6E45")); punta.rotation.x = Math.PI; punta.position.y = tierra.position.y - alto / 2 - r * .25;
  g.add(pasto, borde, tierra, punta);
  if (detalle) { const rd = semilla(isla.id); for (let i = 0; i < r * 5; i++) { const a = rd() * 6.3, d = Math.sqrt(rd()) * (r - 1); g.add(malla(G.cono, mat(rd() < .5 ? "#5DB85A" : "#8FD67A"), .25, .5, .25, Math.cos(a) * d, .2, Math.sin(a) * d, false)); } }
  // isla salvaje: niebla suave encima para que se note que falta conquistarla
  if (!isla.colonizada) { const n = new THREE.Mesh(new THREE.CylinderGeometry(r * .9, r * .9, .2, seg), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: .18, depthWrite: false })); n.position.y = .4; g.add(n); }
  g.position.set(isla.x, 0, isla.z);
  return g;
}

// ---- puentes ----
const mallasPuente = new Map();
function mallaPuente(p) {
  const g = new THREE.Group(), pp = puntosPuente(p), L = Math.hypot(pp.fin.x - pp.ini.x, pp.fin.z - pp.ini.z), ang = Math.atan2(pp.ux, pp.uz);
  const tablas = Math.max(1, Math.round(L / .9 * p.prog));
  for (let i = 0; i < tablas; i++) { const d = i * .9 + .45; g.add(malla(G.caja, mat(i % 2 ? "#A97C50" : "#9A6E44"), 2.4, .18, .8, 0, -.05, d)); }
  for (let i = 0; i <= L * p.prog; i += 3) for (const s of [-1, 1]) g.add(malla(G.cil, mat("#7A4B2A"), .14, 1.2, .14, s * 1.2, .5, i));
  if (p.prog >= 1) for (const s of [-1, 1]) { const c = malla(G.cil, mat("#C9A36B"), .05, L, .05, s * 1.2, 1, L / 2, false); c.rotation.x = Math.PI / 2; g.add(c); }
  g.position.set(pp.ini.x, 0, pp.ini.z); g.rotation.y = ang;
  return g;
}

// ---- recursos ----
function mallaRecurso(r) {
  const g = new THREE.Group(), k = .5 + .5 * (r.cant / r.max);
  if (r.tipo === "arbol") {
    g.add(malla(G.cil, mat("#8A5A36"), .45, 1.8, .45, 0, .9, 0));
    if (r.cant > 0) { g.add(malla(G.cono, mat("#3FA35B"), 2.4 * k, 2.4 * k, 2.4 * k, 0, 2.2 + 1.2 * k, 0)); g.add(malla(G.cono, mat("#4DB866"), 1.8 * k, 2 * k, 1.8 * k, 0, 3 + 1.6 * k, 0)); }
  } else if (r.tipo === "roca") {
    if (r.cant > 0) { g.add(malla(G.roca, mat("#9AA3AE"), 1.8 * k, 1.3 * k, 1.6 * k, 0, .5 * k, 0)); g.add(malla(G.roca, mat("#B8C0C9"), .9 * k, .7 * k, .8 * k, .7 * k, .3, .4 * k)); }
  } else {
    g.add(malla(G.esfera, mat("#4CB863"), 1.8, 1.3, 1.8, 0, .6, 0));
    for (let i = 0; i < r.cant; i++) { const a = i / 5 * Math.PI * 2; g.add(malla(G.esfera, mat("#E8424F"), .22, .22, .22, Math.cos(a) * .75, .75 + (i % 2) * .3, Math.sin(a) * .75, false)); }
  }
  g.rotation.y = (r.id * 1.7) % 6.28;
  return g;
}

// ---- edificios ----
const LINEA_ANDAMIO = new THREE.LineBasicMaterial({ color: "#A0703F" });
function andamio(g, w, h, d, prog, y0 = 0) {
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), LINEA_ANDAMIO); l.position.y = y0 + h / 2; g.add(l);
  for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(malla(G.cil, mat("#A0703F"), .12, h, .12, a * w / 2, y0 + h / 2, c * d / 2));
  if (prog > 0) g.add(malla(G.caja, mat("#E8C79A"), w * .96, h * prog, d * .96, 0, y0 + h * prog / 2, 0));
}
const PISO = 2;
const ESTILOS = [
  (id) => ({ pared: `hsl(${26 + id % 12},42%,${52 + id % 10}%)`, techo: "#D9B45A", tipoTecho: "paja" }),
  (id) => ({ pared: `hsl(${8 + id % 10},48%,${44 + id % 8}%)`, techo: "#8E3B2E", tipoTecho: "teja" }),
  (id) => ({ pared: `hsl(215,${6 + id % 8}%,${58 + id % 10}%)`, techo: "#4A5568", tipoTecho: "teja", chimenea: true }),
  (id) => ({ pared: `hsl(${200 + id % 20},25%,${86 + id % 6}%)`, techo: "#5DADE2", tipoTecho: "plano", farol: true }),
  (id) => ({ pared: "#F4F7FB", techo: "#7FE7F2", tipoTecho: "cupula", farol: true }),
];
function techo(g, est, y, w) {
  if (est.tipoTecho === "plano") { g.add(malla(G.caja, mat(est.techo), w + .3, .3, w + .3, 0, y + .15, 0)); g.add(malla(G.cil, mat("#888"), .05, 1.2, .05, w * .3, y + .9, w * .3)); g.add(malla(G.esfera, NEON, .2, .2, .2, w * .3, y + 1.5, w * .3, false)); return; }
  if (est.tipoTecho === "cupula") { g.add(malla(G.media, new THREE.MeshLambertMaterial({ color: est.techo, transparent: true, opacity: .85 }), w * 1.1, w * .8, w * 1.1, 0, y, 0)); g.add(malla(G.cil, NEON, w + .1, .12, w + .1, 0, y, 0, false)); return; }
  const t = malla(G.piramide, mat(est.techo), w * 1.5, est.tipoTecho === "paja" ? 2 : 1.6, w * 1.5, 0, y + (est.tipoTecho === "paja" ? 1 : .8), 0); t.rotation.y = Math.PI / 4; g.add(t);
}
function mallaEdificio(e, simple) {
  const g = new THREE.Group();
  if (e.tipo === "fogata") {
    for (let i = 0; i < 3; i++) { const l = malla(G.cil, mat("#7A4B2A"), .25, 1.6, .25, 0, .2, 0); l.rotation.z = Math.PI / 2; l.rotation.y = i * 1.05; g.add(l); }
    const ll = malla(G.cono, LLAMA, .8, 1.4, .8, 0, .9, 0, false); g.add(ll, malla(G.cono, LLAMA2, .45, .8, .45, 0, .7, 0, false)); g.userData.llama = ll;
    if (!simple) { const luzF = new THREE.PointLight("#FF9A4D", 0, 18, 1.6); luzF.position.y = 1.4; g.add(luzF); g.userData.luz = luzF; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; g.add(malla(G.roca, mat("#8C939C"), .4, .3, .4, Math.cos(a) * .9, .1, Math.sin(a) * .9)); } }
    return g;
  }
  if (e.tipo === "casa") {
    const hechos = pisosListos(e), est = ESTILOS[e.era || 0](e.id), w = 3.2;
    if (simple) { if (hechos) { g.add(malla(G.caja, mat(est.pared), w, hechos * PISO, w, 0, hechos * PISO / 2, 0, false)); g.add(malla(G.caja, VENTANA, w + .02, .5, .5, 0, hechos * PISO * .6, 0, false)); techo(g, est, hechos * PISO, w); } return g; }
    const pared = mat(est.pared);
    for (let i = 0; i < hechos; i++) {
      g.add(malla(G.caja, pared, w, PISO, w, 0, i * PISO + PISO / 2, 0));
      g.add(malla(G.caja, mat("#6B4A33"), w + .1, .14, w + .1, 0, i * PISO + .07, 0, false));
      const vent = (e.era || 0) >= 3 ? [[0, 1.61, 0, 2.2], [1.61, 0, Math.PI / 2, 2.2], [-1.61, 0, Math.PI / 2, 2.2], [0, -1.61, 0, 2.2]] : [[-.75, 1.61, 0, .55], [.75, 1.61, 0, .55], [1.61, 0, Math.PI / 2, .55], [-1.61, 0, Math.PI / 2, .55], [-.75, -1.61, 0, .55], [.75, -1.61, 0, .55]];
      for (const [vx, vz, ry, ancho] of vent) { if (i === 0 && vz > 1.6 && vx <= 0 && ancho < 1) continue; const v = malla(G.caja, VENTANA, ancho, .55, .06, vx, i * PISO + 1.1, vz, false); v.rotation.y = ry; g.add(v); }
    }
    if (hechos > 0) g.add(malla(G.caja, mat("#6B4A33"), .7, 1.15, .1, (e.era || 0) >= 3 ? 1.1 : -.75, .58, 1.62, false));
    if (hechos > 0 && est.chimenea) { g.add(malla(G.caja, mat("#6E6E6E"), .5, 1.6, .5, 1, hechos * PISO + .8, -.8)); g.userData.humo = { x: 1, y: hechos * PISO + 1.7, z: -.8 }; }
    if (hechos > 0 && est.farol) { g.add(malla(G.cil, mat("#555"), .08, 2.4, .08, 2.2, 1.2, 2.2)); g.add(malla(G.esfera, NEON, .3, .3, .3, 2.2, 2.5, 2.2, false)); }
    const yt = hechos * PISO;
    if (!listo(e)) andamio(g, w, PISO, w, e.prog, yt);
    if (hechos > 0 || listo(e)) techo(g, est, listo(e) ? yt : yt + PISO, w);
    return g;
  }
  if (!listo(e)) { const [w, h, d] = { torre: [3, 9, 3], cohete: [3, 7, 3], escuela: [5, 3.5, 4], biblioteca: [5.5, 4, 4.5], huerta: [5.5, .8, 4.5], mina: [3.5, 2.5, 3.5], molino: [3, 6, 3], fabrica: [5, 4, 4], central: [5, 5, 5], base: [5, 1.5, 5] }[e.tipo] || [3, 3, 3]; andamio(g, w, h, d, e.prog); return g; }
  if (e.tipo === "huerta") {
    g.add(malla(G.caja, mat("#7A5230"), 5.5, .3, 4.5, 0, .15, 0));
    if (simple) { g.add(malla(G.caja, mat("#3F9F4F"), 5, .6, 4, 0, .6, 0, false)); return g; }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const x = -1.95 + i * 1.3, z = -1.3 + j * 1.3; g.add(malla(G.cono, mat("#3F9F4F"), .5, .9, .5, x, .75, z)); if (i * 3 + j < (e.cant || 0) * 1.5) g.add(malla(G.esfera, mat((i + j) % 2 ? "#FF9F1C" : "#E8424F"), .3, .3, .3, x + .2, .85, z + .15, false)); }
    for (let i = 0; i <= 10; i++) { const t = i / 10; for (const [x, z] of [[-2.9 + t * 5.8, 2.4], [-2.9 + t * 5.8, -2.4]]) g.add(malla(G.cil, mat("#C9A36B"), .1, .7, .1, x, .35, z, false)); }
    return g;
  }
  if (e.tipo === "mina") {
    const prof = E.mina ? E.mina.prof : 1, alto = 2.5 + Math.min(prof, 12) * .9;
    g.add(malla(G.cil, mat("#2B1A10"), 2.2, .1, 2.2, 0, .05, 0, false));
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(malla(G.cil, mat("#8A5A36"), .22, alto, .22, x * 1.05, alto / 2, z * 1.05));
    if (!simple) for (let y = 1; y < alto; y += 1.2) { g.add(malla(G.caja, mat("#8A5A36"), 2.3, .15, .15, 0, y, 1.05)); g.add(malla(G.caja, mat("#8A5A36"), 2.3, .15, .15, 0, y, -1.05)); }
    const rueda = new THREE.Mesh(new THREE.TorusGeometry(.7, .1, 8, 20), mat("#555")); rueda.position.set(0, alto + .4, 0); g.add(rueda); g.userData.rueda = rueda;
    g.add(malla(G.caja, mat("#7A4B2A"), 2.6, .3, 2.6, 0, alto, 0));
    cartel(`⛏️ ${prof}`, 0, alto + 1.8, g);
    return g;
  }
  if (e.tipo === "escuela" || e.tipo === "biblioteca") {
    const bib = e.tipo === "biblioteca";
    g.add(malla(G.caja, mat(bib ? "#C9B79C" : "#F2C57C"), bib ? 5.5 : 5, bib ? 4 : 3.2, bib ? 4.5 : 4, 0, bib ? 2 : 1.6, 0));
    const t = malla(G.piramide, mat(bib ? "#5B6C8F" : "#D9534F"), 6.8, 1.8, 6.8, 0, (bib ? 4 : 3.2) + .9, 0); t.rotation.y = Math.PI / 4; g.add(t);
    if (bib) for (let i = -2; i <= 2; i++) g.add(malla(G.cil, mat("#EDE6D6"), .35, 3.6, .35, i * 1.1, 1.8, 2.4));
    for (const x of [-1.6, 1.6]) g.add(malla(G.caja, VENTANA, .8, .8, .06, x, 2, (bib ? 2.26 : 2.01), false));
    g.add(malla(G.caja, mat("#6B4A33"), .9, 1.5, .1, 0, .75, bib ? 2.27 : 2.02, false));
    if (!bib) { g.add(malla(G.cil, mat("#666"), .08, 3, .08, 2, 6, 0)); g.add(malla(G.caja, mat("#4FB477"), 1, .6, .05, 2.5, 7.1, 0)); }
    else cartel("📚", 0, 6.4, g);
    return g;
  }
  if (e.tipo === "torre") {
    g.add(malla(G.cil, mat("#A7ADB8"), 2.6, 9, 2.6, 0, 4.5, 0));
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; g.add(malla(G.caja, mat("#A7ADB8"), .5, .6, .5, Math.cos(a) * 1.25, 9.3, Math.sin(a) * 1.25)); }
    for (const y of [3, 6]) g.add(malla(G.caja, VENTANA, .5, .8, .06, 0, y, 1.31, false));
    g.add(malla(G.cil, mat("#666"), .07, 2.4, .07, 0, 10.4, 0));
    const b = malla(G.caja, mat("#FF6F91"), 1.1, .6, .05, .55, 11.2, 0, false); g.add(b); g.userData.bandera = b;
    return g;
  }
  if (e.tipo === "molino") {
    g.add(malla(G.cono, mat("#E8D9B5"), 3, 6, 3, 0, 3, 0));
    g.add(malla(G.caja, mat("#6B4A33"), .7, 1.1, .1, 0, .55, 1.3, false));
    const aspas = new THREE.Group(); aspas.position.set(0, 5.2, 1.1);
    for (let i = 0; i < 4; i++) { const a = malla(G.caja, mat("#8A5A36"), .45, 3.4, .08, 0, 1.7, 0); const piv = new THREE.Group(); piv.rotation.z = i * Math.PI / 2; piv.add(a); aspas.add(piv); }
    g.add(aspas); g.userData.aspas = aspas;
    return g;
  }
  if (e.tipo === "fabrica") {
    g.add(malla(G.caja, mat("#9C5B3E"), 5, 3.2, 4, 0, 1.6, 0));
    for (let i = 0; i < 3; i++) { const t = malla(G.caja, mat("#7E4A33"), 1.6, .8, 4, -1.7 + i * 1.7, 3.4, 0); t.rotation.z = .5; g.add(t); }
    for (const x of [-1.6, 1.6]) g.add(malla(G.cil, mat("#6E6E6E"), .7, 4, .7, x, 4.5, -1.3));
    for (const x of [-1.5, 0, 1.5]) g.add(malla(G.caja, VENTANA, .8, .6, .06, x, 1.8, 2.01, false));
    g.userData.humo = [{ x: -1.6, y: 6.6, z: -1.3 }, { x: 1.6, y: 6.6, z: -1.3 }];
    return g;
  }
  if (e.tipo === "central") {
    g.add(malla(G.caja, mat("#DDE3EA"), 5, 3, 5, 0, 1.5, 0));
    for (const x of [-1.4, 1.4]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.3, 5, 16), mat("#C9D1DA")); c.position.set(x, 4, -.8); c.castShadow = true; g.add(c); }
    g.add(malla(G.esfera, NEON, .8, .8, .8, 0, 3.6, 1.8, false));
    cartel("⚡", 0, 7.2, g);
    return g;
  }
  if (e.tipo === "base") {
    g.add(malla(G.cil, mat("#888888"), 5.5, .4, 5.5, 0, .2, 0));
    g.add(malla(G.cil, NEON, 5.7, .1, 5.7, 0, .45, 0, false));
    for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28; g.add(malla(G.caja, mat("#AAB2BD"), .3, 6, .3, Math.cos(a) * 2.2, 3, Math.sin(a) * 2.2)); }
    const coh = cohete(); g.add(coh); g.userData.coheteBase = coh;
    return g;
  }
  return g;
}
function cohete() {
  const g = new THREE.Group();
  g.add(malla(G.cil, mat("#F4F4F8"), 1.6, 5, 1.6, 0, 3, 0));
  g.add(malla(G.cono, mat("#E8424F"), 1.6, 1.8, 1.6, 0, 6.4, 0));
  for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28; const f = malla(G.caja, mat("#E8424F"), .1, 1.6, 1, Math.cos(a) * .85, 1.3, Math.sin(a) * .85); f.rotation.y = -a; g.add(f); }
  g.add(malla(G.esfera, mat("#6EC6FF"), .6, .6, .3, 0, 4.2, .78, false));
  const fuego = malla(G.cono, LLAMA, 1, 2.2, 1, 0, -.6, 0, false); fuego.rotation.x = Math.PI; fuego.visible = false; g.add(fuego); g.userData.fuego = fuego;
  return g;
}
const TEXTURAS = {};
function texturaTexto(t, tam = 64) {
  if (TEXTURAS[t]) return TEXTURAS[t];
  const c = document.createElement("canvas"); c.width = tam * 4; c.height = tam * 1.4; const x = c.getContext("2d");
  x.font = `600 ${tam}px Fredoka, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(t, c.width / 2, c.height / 2);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return (TEXTURAS[t] = tx);
}
function texturaGrito(t) {
  const k = "grito:" + t; if (TEXTURAS[k]) return TEXTURAS[k];
  const c = document.createElement("canvas"); c.width = 256; c.height = 90; const x = c.getContext("2d");
  x.font = "700 54px Fredoka, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round";
  x.lineWidth = 10; x.strokeStyle = "#2E2440"; x.strokeText(t, 128, 46); x.fillStyle = "#ffffff"; x.fillText(t, 128, 46);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return (TEXTURAS[k] = tx);
}
function cartel(t, x, y, padre, escala = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaTexto(t), transparent: true, depthWrite: false }));
  s.scale.set(2.8 * escala, 1 * escala, 1); s.position.set(x, y, 0); padre.add(s); return s;
}

// ---- carga de pedazos: qué islas se dibujan y con cuánto detalle ----
const mallas = new Map(); // id de recurso/edificio → { g, clave }
let islasDetalle = new Set(), islasVisibles = new Set();
function elegirIslas() {
  const t = controles.target, camD = camara.position.distanceTo(t);
  const orden = E.islas.map((i) => ({ i, d: Math.hypot(i.x - t.x, i.z - t.z) })).sort((a, b) => a.d - b.d);
  islasVisibles = new Set(orden.filter((o) => o.d < 260 + camD * 1.1).slice(0, 60).map((o) => o.i.id));
  const det = camD < 170 ? orden.filter((o) => o.d < 60 + camD * .5).slice(0, camD < 80 ? 4 : 3) : [];
  islasDetalle = new Set(det.map((o) => o.i.id));
  activas = new Set(islasDetalle);
}
function claveDe(o, simple) {
  if (o.tipo === "casa") return `c${o.nivel}-${o.era || 0}-${listo(o) ? "L" : (o.prog * 10 | 0)}${simple ? "s" : ""}`;
  if (!E.edificios.includes(o)) return `${o.tipo}${o.cant}`;
  if (!listo(o)) return `${o.tipo}x${o.prog * 10 | 0}`;
  if (o.tipo === "huerta") return `h${simple ? "s" : o.cant}`;
  if (o.tipo === "mina") return `m${E.mina ? E.mina.prof : 1}${simple ? "s" : ""}`;
  return o.tipo + (simple ? "s" : "");
}
function sincronizar() {
  elegirIslas();
  // islas
  for (const isla of E.islas) {
    const ver = islasVisibles.has(isla.id), det = islasDetalle.has(isla.id), clave = `${det}${isla.colonizada}`;
    let m = mallasIsla.get(isla.id);
    if (!ver) { if (m) { liberar(m.g); mallasIsla.delete(isla.id); } continue; }
    if (!m || m.clave !== clave) { if (m) liberar(m.g); const g = mallaIsla(isla, det); escena.add(g); mallasIsla.set(isla.id, { g, clave }); }
  }
  // puentes
  for (const p of E.puentes) {
    const ver = islasVisibles.has(p.a) || islasVisibles.has(p.b), clave = Math.round(p.prog * 20);
    let m = mallasPuente.get(p.id);
    if (!ver) { if (m) { liberar(m.g); mallasPuente.delete(p.id); } continue; }
    if (!m || m.clave !== clave) { if (m) liberar(m.g); const g = mallaPuente(p); escena.add(g); mallasPuente.set(p.id, { g, clave }); }
  }
  // recursos (solo de cerca) y edificios (simples de lejos)
  const vivos = new Set();
  for (const o of E.edificios) {
    if (!islasVisibles.has(o.isla)) continue;
    const simple = !islasDetalle.has(o.isla);
    vivos.add(o.id); poner(o, claveDe(o, simple), () => mallaEdificio(o, simple), true);
  }
  for (const o of E.recursos) {
    if (!islasDetalle.has(o.isla)) continue;
    vivos.add(o.id); poner(o, claveDe(o), () => mallaRecurso(o), false);
  }
  for (const [id, m] of mallas) if (!vivos.has(id)) { liberar(m.g); mallas.delete(id); }
  // Brotitos de islas que dejaste de mirar
  for (const b of E.bichos) if (b._m && !islasDetalle.has(b.isla) && b.est !== "cruzar") quitarMallaBicho(b);
}
function poner(o, k, crear, esEdificio) {
  let m = mallas.get(o.id);
  if (m && m.clave === k) return;
  if (m) liberar(m.g);
  const g = crear(); g.position.set(o.x, 0, o.z);
  if (esEdificio && o.tipo !== "fogata") { const i = islaDe(o.isla); g.rotation.y = Math.round(Math.atan2(i.x - o.x, i.z - o.z) / (Math.PI / 2)) * Math.PI / 2; }
  escena.add(g); mallas.set(o.id, { g, clave: k });
}

// ======================= 3D: Brotitos =======================
const MAT_HUE = {};
const matHue = (h, triste) => { const q = Math.round(h / 8) * 8, k = q + (triste ? "t" : ""); return MAT_HUE[k] || (MAT_HUE[k] = new THREE.MeshLambertMaterial({ color: new THREE.Color(`hsl(${q},${triste ? 22 : 58}%,${triste ? 58 : 62}%)`) })); };
const matPie = (h) => { const q = Math.round(h / 8) * 8, k = "p" + q; return MAT_HUE[k] || (MAT_HUE[k] = new THREE.MeshLambertMaterial({ color: new THREE.Color(`hsl(${q},45%,45%)`) })); };
const NEGRO = new THREE.MeshBasicMaterial({ color: "#2E2440" }), BLANCO = new THREE.MeshBasicMaterial({ color: "#ffffff" });
const GORROS = {
  lenador: () => { const g = new THREE.Group(); g.add(malla(G.media, mat("#D84B4B"), 1.15, .9, 1.15, 0, 0, 0, false)); g.add(malla(G.esfera, mat("#ffffff"), .28, .28, .28, 0, .48, 0, false)); return g; },
  granjero: () => { const g = new THREE.Group(); g.add(malla(G.cil, mat("#E9C46A"), 1.9, .06, 1.9, 0, .02, 0, false)); g.add(malla(G.media, mat("#E9C46A"), .95, .7, .95, 0, 0, 0, false)); g.add(malla(G.cil, mat("#C0392B"), .97, .1, .97, 0, .08, 0, false)); return g; },
  minero: () => { const g = new THREE.Group(); g.add(malla(G.media, mat("#F4C430"), 1.15, .95, 1.15, 0, 0, 0, false)); g.add(malla(G.cil, mat("#F4C430"), 1.35, .06, 1.35, 0, .02, 0, false)); g.add(malla(G.esfera, new THREE.MeshBasicMaterial({ color: "#FFF7C2" }), .22, .22, .12, 0, .25, .52, false)); return g; },
  constructor: () => { const g = new THREE.Group(); g.add(malla(G.media, mat("#FF8A3D"), 1.15, .9, 1.15, 0, 0, 0, false)); g.add(malla(G.cil, mat("#FF8A3D"), 1.4, .06, 1.4, 0, .02, .1, false)); g.add(malla(G.caja, mat("#E06A20"), .1, .5, .9, 0, .3, 0, false)); return g; },
};
const cuerpos = [];
function crearMallaBicho(b) {
  const g = new THREE.Group();
  const cuerpo = malla(G.esfera, matHue(b.hue), 1.6, 1.85, 1.5, 0, .95, 0); cuerpo.userData.b = b;
  const o1 = malla(G.ojo, NEGRO, 1, 1.4, 1, -.25, 1.15, .7, false), o2 = malla(G.ojo, NEGRO, 1, 1.4, 1, .25, 1.15, .7, false);
  const b1 = malla(G.ojo, BLANCO, 1.9, 1.9, 1, -.25, 1.15, .66, false), b2 = malla(G.ojo, BLANCO, 1.9, 1.9, 1, .25, 1.15, .66, false); b1.visible = b2.visible = false;
  const boca = malla(G.ojo, NEGRO, 1.4, .5, .5, 0, .86, .74, false);
  const tallo = malla(G.cil, mat("#3E9A4E"), .07, .5, .07, 0, 2, 0, false);
  const hoja1 = malla(G.hoja, mat("#5CC86B"), .55, .14, .28, .22, 2.25, 0, false); hoja1.rotation.z = -.4;
  const hoja2 = malla(G.hoja, mat("#5CC86B"), .45, .12, .24, -.2, 2.15, 0, false); hoja2.rotation.z = .4;
  const pies = [malla(G.esfera, matPie(b.hue), .55, .3, .65, -.35, .1, .1, false), malla(G.esfera, matPie(b.hue), .55, .3, .65, .35, .1, .1, false)];
  g.add(cuerpo, o1, o2, b1, b2, boca, tallo, hoja1, hoja2, ...pies);
  const gorros = {}; for (const k in GORROS) { const h = GORROS[k](); h.position.y = 1.62; h.visible = false; g.add(h); gorros[k] = h; }
  const carga = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); carga.scale.set(2.4, .85, 1); carga.position.y = 3; carga.visible = false; g.add(carga);
  escena.add(g); cuerpos.push(cuerpo);
  b._m = { g, cuerpo, o1, o2, b1, b2, boca, gorros, carga, pies, hoja2, cargaTxt: null, triste: null, lejos: false };
}
function quitarMallaBicho(b) { if (!b._m) return; escena.remove(b._m.g); const i = cuerpos.indexOf(b._m.cuerpo); if (i >= 0) cuerpos.splice(i, 1); b._m = null; }
function actualizarMallaBicho(b, ahora) {
  if (!islasDetalle.has(b.isla) && b.est !== "cruzar") return;
  if (!b._m) crearMallaBicho(b);
  const m = b._m, g = m.g, bebe = b.edad < GRANDE;
  g.visible = !b.adentro && b.y > -2.3;
  if (!g.visible) return;
  const trabaja = b.est === "juntar" || b.est === "construir";
  const camina = !trabaja && !["quieto", "bajar", "subir", "durmiendo"].includes(b.est);
  const salto = camina ? Math.abs(Math.sin(b.fase)) * .3 : trabaja ? Math.abs(Math.sin(b.fase * 1.5)) * .15 : 0;
  const esc = bebe ? .55 + b.edad / GRANDE * .3 : 1;
  const tiembla = b.susto > 0 ? Math.sin(ahora / 25) * .08 : 0;
  g.position.set(b.x + tiembla, Math.min(0, b.y) + salto + (b.est === "cruzar" ? .1 : 0), b.z);
  g.scale.setScalar(esc);
  g.rotation.y = Math.atan2(b.dx, b.dz);
  g.rotation.x = trabaja ? Math.sin(b.fase * 1.5) * .15 : 0;
  const lejos = camara.position.distanceToSquared(g.position) > 70 * 70;
  if (m.lejos !== lejos) { m.lejos = lejos; for (const o of [m.o1, m.o2, m.boca, m.pies[0], m.pies[1], m.hoja2]) o.visible = !lejos; }
  const triste = E.animo < 30 && b.susto <= 0;
  if (m.triste !== triste) { m.cuerpo.material = matHue(b.hue, triste); m.triste = triste; }
  const susto = b.susto > 0, parpadeo = (ahora / 1000 + b.hue) % 4 < .12;
  m.b1.visible = m.b2.visible = susto && !lejos;
  m.o1.scale.y = m.o2.scale.y = parpadeo ? .2 : 1.4;
  m.o1.position.z = m.o2.position.z = susto ? .78 : .7;
  m.boca.scale.set(susto ? 1.2 : 1.4, susto ? 1.4 : (triste ? .3 : .5), .5);
  for (const k in m.gorros) m.gorros[k].visible = !bebe && b.oficio === k && !lejos;
  m.pies[0].position.z = .1 + (camina ? Math.sin(b.fase) * .2 : 0); m.pies[1].position.z = .1 - (camina ? Math.sin(b.fase) * .2 : 0);
  if (b.carga !== m.cargaTxt) { m.cargaTxt = b.carga; m.carga.visible = !!b.carga; if (b.carga) { m.carga.material.map = texturaTexto(ICONO[b.carga]); m.carga.material.needsUpdate = true; } }
}

// ---- partículas, humo, restos ----
const particulas = [];
const GEO_P = new THREE.SphereGeometry(1, 8, 6);
function particula(p, v, color, t, s, emoji, gota) {
  let m;
  if (emoji) { m = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaTexto(emoji), transparent: true, depthWrite: false })); m.scale.set(2, .7, 1); }
  else { m = new THREE.Mesh(GEO_P, new THREE.MeshLambertMaterial({ color, transparent: !!s && s > .3 })); m.scale.setScalar(s); }
  m.position.set(p.x, p.y, p.z); escena.add(m);
  particulas.push({ m, v, t, t0: t, emoji, gota });
}
function humo(x, y, z) { const m = new THREE.Mesh(GEO_P, new THREE.MeshLambertMaterial({ color: "#D8D8D8", transparent: true, opacity: .7, depthWrite: false })); m.scale.setScalar(.3); m.position.set(x, y, z); escena.add(m); particulas.push({ m, v: { x: rnd(-.2, .2), y: rnd(.8, 1.3), z: rnd(-.2, .2) }, t: 3, t0: 3, humo: true }); }
function corazones(b) { for (let i = 0; i < 3; i++) particula({ x: b.x + rnd(-.4, .4), y: 2.4, z: b.z }, { x: rnd(-.6, .6), y: rnd(1.5, 2.4), z: 0 }, null, 1.2, 0, "💚"); }
function festejo(p) { for (let i = 0; i < 26; i++) particula({ x: p.x + rnd(-1, 1), y: 3, z: p.z + rnd(-1, 1) }, { x: rnd(-5, 5), y: rnd(4, 10), z: rnd(-5, 5) }, new THREE.Color(elegir(["#FFC23D", "#FF6F91", "#6EC6FF", "#7ED957"])), rnd(1, 1.6), rnd(.1, .18)); }
function onda(p) { const m = new THREE.Mesh(new THREE.RingGeometry(.8, 1.1, 32), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(p.x, .1, p.z); escena.add(m); particulas.push({ m, onda: true, t: .45, t0: .45 }); }
function actualizarParticulas(dt) {
  for (const p of particulas) {
    p.t -= dt;
    if (p.onda) { const k = 1 - p.t / p.t0; p.m.scale.setScalar(1 + k * 7); p.m.material.opacity = 1 - k; continue; }
    p.m.position.x += p.v.x * dt; p.m.position.y += p.v.y * dt; p.m.position.z += p.v.z * dt;
    if (p.humo) { const k = 1 - p.t / p.t0; p.m.scale.setScalar(.3 + k * 1.2); p.m.material.opacity = .7 * (1 - k); continue; }
    if (!p.emoji) { p.v.y -= 18 * dt; if (p.m.position.y < .1) { if (p.gota) { p.m.position.y = .04; p.v.x = p.v.y = p.v.z = 0; p.m.scale.set(p.m.scale.x * 1.6, .02, p.m.scale.z * 1.6); p.gota = false; p.t = 60; } else { p.m.position.y = .1; p.v.y *= -.3; p.v.x *= .6; p.v.z *= .6; } } }
    else p.m.material.opacity = Math.min(1, p.t);
  }
  for (let i = particulas.length - 1; i >= 0; i--) if (particulas[i].t <= 0) { const p = particulas[i]; escena.remove(p.m); p.m.material.dispose(); if (p.onda) p.m.geometry.dispose(); particulas.splice(i, 1); }
}
const restos = [];
const GEO_DISCO = new THREE.CircleGeometry(1, 20);
function aplastado(b, esc) {
  const g = new THREE.Group(), mats = [];
  const m = (geo, color, sx, sy, sz, x, y, z) => { const mt = new THREE.MeshLambertMaterial({ color, transparent: true }); mats.push(mt); const me = new THREE.Mesh(geo, mt); me.scale.set(sx, sy, sz); me.position.set(x, y, z); me.receiveShadow = true; g.add(me); return me; };
  for (let i = 0; i < 6; i++) { const r = i ? rnd(.25, .6) : rnd(1.3, 1.7); const d = m(GEO_DISCO, "#B3122A", r, r * rnd(.7, 1), 1, i ? rnd(-1.9, 1.9) : 0, .03 + i * .002, i ? rnd(-1.9, 1.9) : 0); d.rotation.x = -Math.PI / 2; }
  m(G.esfera, new THREE.Color(`hsl(${Math.round(b.hue / 8) * 8},50%,58%)`), 2.1, .32, 1.9, 0, .14, 0);
  for (const ox of [-.32, .32]) for (const r of [.8, -.8]) { const x = m(G.caja, "#2E2440", .3, .05, .06, ox, .3, .35); x.rotation.y = r; }
  m(G.ojo, "#2E2440", 1.6, .3, 1.2, 0, .3, .62);
  const hoja = m(G.hoja, "#5CC86B", .6, .14, .3, 1.15, .1, -.3); hoja.rotation.y = .6;
  m(G.cil, "#3E9A4E", .07, .7, .07, .85, .08, -.2).rotation.z = Math.PI / 2;
  g.position.set(b.x, 0, b.z); g.rotation.y = Math.random() * 6.28;
  escena.add(g);
  const grito = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaGrito(elegir(["¡aaay!", "¡ayyy!", "¡ay no!"])), transparent: true, depthWrite: false }));
  grito.scale.set(2.2, .78, 1); grito.position.set(0, 2.4, 0); g.add(grito); mats.push(grito.material);
  g.scale.set(esc, esc * 3, esc);
  restos.push({ g, mats, grito, t: 0, esc });
}
function actualizarRestos(dt) {
  for (const r of restos) {
    r.t += dt;
    r.g.scale.y = r.t < .12 ? r.esc * (3 - r.t / .12 * 2) : r.esc;
    r.grito.position.y = 2.4 + r.t * .6; r.grito.material.opacity = clamp(1.6 - r.t, 0, 1);
    if (r.t > 75) { const a = clamp(1 - (r.t - 75) / 15, 0, 1); for (const mt of r.mats) mt.opacity = a; }
  }
  for (let i = restos.length - 1; i >= 0; i--) if (restos[i].t > 90 || restos.length - i > 40) { escena.remove(restos[i].g); for (const mt of restos[i].mats) mt.dispose(); restos.splice(i, 1); }
}
// cohete que despega (era espacial)
let vuelo = null;
function despegar() {
  const base = E.edificios.find((e) => e.tipo === "base" && listo(e)); if (!base) return;
  const m = mallas.get(base.id); const desde = m && m.g.userData.coheteBase;
  const c = cohete(); c.position.set(base.x, 0, base.z); c.userData.fuego.visible = true; escena.add(c);
  if (desde) desde.visible = false;
  vuelo = { c, t: 0, desde };
  if (islasVisibles.has(base.isla)) sonido("cohete");
}
function actualizarVuelo(dt) {
  if (!vuelo) return;
  vuelo.t += dt; const v = vuelo;
  v.c.position.y = Math.pow(v.t, 2.2) * 3; v.c.userData.fuego.scale.y = 2.2 + Math.sin(v.t * 40) * .4;
  if (Math.random() < .6) humo(v.c.position.x + rnd(-.5, .5), v.c.position.y - 1, v.c.position.z + rnd(-.5, .5));
  if (v.t > 7) { liberar(v.c); if (v.desde) v.desde.visible = true; vuelo = null; }
}

// ---- globos de charla ----
const capaGlobos = $("globos"), poolGlobos = [];
const vtmp = new THREE.Vector3(), vtmp2 = new THREE.Vector3();
function enPantalla(b) { vtmp.set(b.x, 1, b.z).project(camara); return vtmp.z < 1 && Math.abs(vtmp.x) < 1.1 && Math.abs(vtmp.y) < 1.1; }
function actualizarGlobos() {
  let n = 0;
  for (const b of E.bichos) {
    if (b.charlaT <= 0 || b.adentro || b.y < -1 || n >= 14 || !islasDetalle.has(b.isla)) continue;
    const esc = b.edad < GRANDE ? .7 : 1;
    vtmp2.set(b.x, 0, b.z); if (camara.position.distanceTo(vtmp2) > 95) continue;
    vtmp.set(b.x, (b.carga ? 3.7 : 2.9) * esc, b.z).project(camara);
    if (vtmp.z > 1 || Math.abs(vtmp.x) > 1.05 || Math.abs(vtmp.y) > 1.05) continue;
    let d = poolGlobos[n]; if (!d) { d = document.createElement("div"); d.className = "globo"; capaGlobos.appendChild(d); poolGlobos.push(d); }
    d.style.display = "block"; if (d.textContent !== b.charla) d.textContent = b.charla;
    d.style.opacity = Math.min(1, b.charlaT * 2);
    d.style.transform = `translate(${(vtmp.x + 1) / 2 * innerWidth}px, ${(1 - vtmp.y) / 2 * innerHeight}px) translate(-50%, -100%)`;
    n++;
  }
  for (let i = n; i < poolGlobos.length; i++) poolGlobos[i].style.display = "none";
}

// ======================= Tocar =======================
const ray = new THREE.Raycaster(), puntero = new THREE.Vector2();
const toques = new Map(); let multitoque = false;
render.domElement.addEventListener("pointerdown", (e) => { audio(); toques.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() }); if (toques.size > 1) multitoque = true; });
render.domElement.addEventListener("pointerup", (e) => {
  const t0 = toques.get(e.pointerId); toques.delete(e.pointerId);
  const fueMulti = multitoque; if (toques.size === 0) multitoque = false;
  if (!t0 || fueMulti) return;
  if (Math.hypot(e.clientX - t0.x, e.clientY - t0.y) > 8 || performance.now() - t0.t > 450) return;
  puntero.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(puntero, camara);
  const hit = ray.intersectObjects(cuerpos.filter((c) => c.parent && c.parent.visible), false)[0];
  if (hit && hit.object.userData.b && E.bichos.includes(hit.object.userData.b)) explotar(hit.object.userData.b);
});
render.domElement.addEventListener("pointercancel", (e) => { toques.delete(e.pointerId); if (!toques.size) multitoque = false; });
function verTodo() {
  const col = E.islas.filter((i) => i.colonizada);
  const cx = col.reduce((s, i) => s + i.x, 0) / col.length, cz = col.reduce((s, i) => s + i.z, 0) / col.length;
  const r = Math.max(...col.map((i) => Math.hypot(i.x - cx, i.z - cz) + i.radio));
  controles.target.set(cx, 0, cz);
  const dir = camara.position.clone().sub(controles.target).normalize();
  camara.position.copy(controles.target).add(dir.multiplyScalar(clamp(r * 2.6, 24, 400)));
}
$("b-ver").onclick = verTodo;
$("b-info").onclick = () => $("c-info").classList.add("ver");
$("info-ok").onclick = () => { $("c-info").classList.remove("ver"); audio(); };
$("reiniciar").onclick = () => {
  const b = $("reiniciar");
  if (!b.dataset.ok) { b.dataset.ok = "1"; b.textContent = "¿Seguro? Se pierde esta colonia"; return; }
  try { localStorage.removeItem(CLAVE); } catch (e) {} location.reload();
};

// ======================= HUD =======================
function pintarHUD() {
  const era = ERAS[E.era], sig = ERAS[E.era + 1];
  $("h-era").textContent = `${era.g} Era ${E.era + 1}`;
  $("h-pob").textContent = "👥 " + E.bichos.length + "/" + capacidad();
  $("h-comida").textContent = "🍎 " + E.comida; $("h-madera").textContent = "🪵 " + E.madera; $("h-piedra").textContent = "🪨 " + E.piedra;
  $("h-gemas").hidden = !E.mina && !E.gemas; $("h-gemas").textContent = "💎 " + E.gemas;
  $("h-hora").textContent = esNoche() ? "🌙" : "☀️";
  const a = $("h-animo"); a.style.width = E.animo + "%"; a.style.background = E.animo < 30 ? "#FF6F61" : E.animo < 60 ? "#FFB74D" : "#5BBF7A";
  $("h-energia").style.width = E.energia * 10 + "%";
  for (const id of ["d-comida", "d-madera", "d-piedra"]) $(id).disabled = E.energia < 1;
  const m = METAS[E.meta];
  if (m) {
    const antes = E.meta ? METAS[E.meta - 1].pob : 1;
    $("meta-txt").textContent = `🎯 ${m.pob} Brotitos → ${m.g} ${m.t}`; $("meta-sub").textContent = m.s;
    $("meta-bar").style.width = clamp((E.bichos.length - antes) / (m.pob - antes), 0, 1) * 100 + "%";
  } else { $("meta-txt").textContent = `🌟 Colonia legendaria: ${E.bichos.length} Brotitos`; $("meta-sub").textContent = `${E.islas.filter((i) => i.colonizada).length} islas conquistadas`; $("meta-bar").style.width = "100%"; }
  if (sig) { $("era-txt").textContent = `🧠 Sabiduría → ${sig.g} Era de ${sig.n}`; $("era-bar").style.width = clamp((E.sab - era.sab) / (sig.sab - era.sab), 0, 1) * 100 + "%"; }
  else { $("era-txt").textContent = "🧠 ¡Llegaron a la era espacial!"; $("era-bar").style.width = "100%"; }
  const p = $("pedido");
  if (E.pedido) { p.classList.add("ver"); $("pedido-txt").textContent = `Te piden ${ICONO[E.pedido.tipo]} ${E.pedido.dado}/${E.pedido.cant}`; $("pedido-t").style.width = E.pedido.t / E.pedido.total * 100 + "%"; }
  else p.classList.remove("ver");
}
let eraNoche = null;
function mostrarEventos() {
  for (const ev of eventos) {
    if (ev.tipo === "nace") aviso(`🌱 ¡Nació ${ev.b.n}! (${E.bichos.length} en la colonia)`);
    if (ev.tipo === "meta") { logro(ev.m.g, "¡Desbloqueaste: " + ev.m.t + "!", ev.m.s); festejo(controles.target); }
    if (ev.tipo === "era") { const e = ERAS[E.era]; logro(e.g, `¡Era de ${e.n}!`, e.s || ""); festejo(controles.target); }
    if (ev.tipo === "listo") {
      const nom = { casa: "una casa", huerta: "la huerta", mina: "la mina ⛏️ ¡Ya pueden cavar!", escuela: "la escuela 🏫", torre: "la torre 🗼", biblioteca: "la biblioteca 📚", molino: "el molino 🌾", fabrica: "la fábrica 🏭", central: "la central eléctrica ⚡", base: "la base espacial 🚀", puente: "el puente 🌉 ¡Isla nueva!" }[ev.e.tipo] || ev.e.tipo;
      aviso(ev.e.tipo === "casa" && ev.e.nivel > 1 ? `🏢 ¡Terminaron el piso ${ev.e.nivel}!` : `🎉 Terminaron ${nom}`); sonido("festejo");
    }
    if (ev.tipo === "obra") aviso("🔨 Empezaron una casa nueva");
    if (ev.tipo === "piso") aviso("🏗️ Están subiendo un piso");
    if (ev.tipo === "puente") aviso("🌉 La isla se llenó: ¡construyen un puente a otra isla!");
    if (ev.tipo === "nivelMina") aviso(`⛏️ ¡La mina ya tiene ${E.mina.prof} niveles! Más hondo, más gemas`);
    if (ev.tipo === "cohete") { aviso("🚀 ¡Despegó un cohete! Trajo 5 💎"); despegar(); }
  }
  eventos = [];
  const n = esNoche();
  if (eraNoche !== null && n !== eraNoche) aviso(n ? (E.era >= 3 ? "🌙 De noche: la mitad sigue trabajando con luz ⚡" : "🌙 Se hizo de noche: a dormir") : "☀️ ¡Buen día! A trabajar");
  eraNoche = n;
}

// ======================= Arranque =======================
E = cargar();
const primeraVez = !E;
if (!E) nuevoEstado();
{ const c = E.islas.find((i) => i.capital) || E.islas[0]; controles.target.set(c.x, 0, c.z); camara.position.set(c.x, 17, c.z + 22); }
if (!primeraVez) {
  const fuera = (Date.now() - E.t) / 1000, sim = Math.min(fuera / 4, 3600);
  if (sim > 20) {
    const antes = { n: E.bichos.length, c: capacidad(), m: E.meta, era: E.era, islas: E.islas.filter((i) => i.colonizada).length };
    activas = new Set();
    for (let t = 0; t < sim; t += 2) paso(2, true);
    eventos = [];
    const nacieron = E.bichos.length - antes.n, lugar = capacidad() - antes.c, partes = [];
    if (nacieron > 0) partes.push(`nacieron <b>${nacieron}</b> Brotitos`);
    if (lugar > 0) partes.push(`hicieron lugar para <b>${lugar}</b> más`);
    if (E.meta > antes.m) partes.push(`desbloquearon <b>${METAS.slice(antes.m, E.meta).map((m) => m.g + " " + m.t).join(", ")}</b>`);
    const islasN = E.islas.filter((i) => i.colonizada).length - antes.islas;
    if (islasN > 0) partes.push(`conquistaron <b>${islasN}</b> ${islasN === 1 ? "isla nueva" : "islas nuevas"} 🌉`);
    if (E.era > antes.era) partes.push(`¡pasaron a la <b>Era de ${ERAS[E.era].n}</b> ${ERAS[E.era].g}!`);
    $("vuelta-txt").innerHTML = partes.length ? "Mientras no estabas " + partes.join(", ") + ". 🎉" : "Tus Brotitos estuvieron juntando cosas mientras no estabas.";
    $("c-vuelta").classList.add("ver");
  }
}
$("vuelta-ok").onclick = () => { $("c-vuelta").classList.remove("ver"); audio(); };
if (primeraVez) $("c-info").classList.add("ver");
$("cargando").remove();

let ultimo = performance.now(), guardarT = 0, hudT = 0, syncT = 1, humoT = 0;
function dibujarTodo(ahora, dt) {
  syncT += dt; if (syncT > .3) { syncT = 0; sincronizar(); }
  const L = luz(), t = controles.target;
  escena.background.copy(CIELO_NOCHE).lerp(CIELO_DIA, (L - .25) / .75); escena.fog.color.copy(escena.background);
  hemi.intensity = .3 + .65 * L; sol.intensity = .15 + 1.6 * L;
  const ang = (E.tiempo % DIA) / DIA * Math.PI * 2;
  sol.position.set(t.x + Math.cos(ang) * 60, 70, t.z + Math.sin(ang) * 40 + 30); sol.target.position.set(t.x, 0, t.z);
  estrellas.position.copy(camara.position); estrellas.material.opacity = clamp((1 - L) * 1.3, 0, 1);
  VENTANA.emissiveIntensity = .05 + (1 - L) * 1.6; NEON.emissiveIntensity = .3 + (1 - L) * 1.8;
  humoT += dt; const tocaHumo = humoT > .5; if (tocaHumo) humoT = 0;
  for (const [, m] of mallas) {
    const u = m.g.userData;
    if (u.llama) { const f = 1 + Math.sin(ahora / 110) * .12; u.llama.scale.set(.8, 1.4 * f, .8); if (u.luz) u.luz.intensity = (1 - L) * 60; }
    if (u.rueda) u.rueda.rotation.z += dt * 2;
    if (u.aspas) u.aspas.rotation.z += dt * 1.2;
    if (u.bandera) u.bandera.rotation.y = Math.sin(ahora / 400) * .3;
    if (u.humo && tocaHumo && Math.random() < .5) { const hs = Array.isArray(u.humo) ? u.humo : [u.humo]; for (const h of hs) { vtmp.set(h.x, h.y, h.z).applyMatrix4(m.g.matrixWorld); if (vtmp.distanceTo(camara.position) < 120) humo(vtmp.x, vtmp.y, vtmp.z); } }
  }
  for (const b of E.bichos) actualizarMallaBicho(b, ahora);
  actualizarParticulas(dt); actualizarRestos(dt); actualizarVuelo(dt);
  controles.target.y = 0;
  controles.update();
  render.render(escena, camara);
  actualizarGlobos();
}
function bucle(ahora) {
  const dt = Math.min(.05, (ahora - ultimo) / 1000); ultimo = ahora;
  paso(dt, false);
  dibujarTodo(ahora, dt);
  hudT += dt; if (hudT > .2) { hudT = 0; pintarHUD(); mostrarEventos(); }
  guardarT += dt; if (guardarT > 5) { guardarT = 0; guardar(); }
  requestAnimationFrame(bucle);
}
document.addEventListener("visibilitychange", () => { if (document.hidden) guardar(); });
addEventListener("pagehide", guardar);
window.__col = { get E() { return E; }, paso, explotar, camara, controles, verTodo, dibujarTodo, sincronizar, limpiarEventos: () => { eventos = []; }, capacidad, casas, setActivas: (s) => { activas = s; } };
requestAnimationFrame(bucle);
