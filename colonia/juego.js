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

// ======================= Catálogo: cada vez más cosas, como una ciudad de verdad =======================
// ef: mejoras (.1 = +10%); animo suma ánimo por segundo. r: cómo se arma con piezas.
const CATALOGO = [
  { id: "pozo", g: "💧", n: "Pozo de agua", era: 0, pob: 6, ef: { animo: .05 }, s: "Agua fresca: están más contentos", r: { techo: "pozo", ct: "#8E5B3A" } },
  { id: "granero", g: "🌾", n: "Granero", era: 0, pob: 14, ef: { comida: .1 }, s: "+10% comida", r: { w: 4, d: 3.4, pisos: 1, h: 2.6, color: "#B5442F", techo: "dos", ct: "#6B3A2A", partes: ["cruz"] } },
  { id: "lenera", g: "🪓", n: "Leñera", era: 0, pob: 18, ef: { madera: .1 }, s: "+10% madera", r: { w: 3.6, d: 2.6, pisos: 1, color: "#9C6E45", techo: "dos", ct: "#D9B45A", partes: ["troncos"] } },
  { id: "cantera", g: "🪨", n: "Cantera", era: 0, pob: 24, ef: { piedra: .1 }, s: "+10% piedra", r: { techo: "cantera" } },
  { id: "totem", g: "🗿", n: "Tótem de la colonia", era: 0, pob: 30, ef: { animo: .05, sab: .05 }, s: "Los une: más ánimo y sabiduría", r: { techo: "totem" } },
  { id: "cocina", g: "🍲", n: "Cocina comunal", era: 0, pob: 40, ef: { nacer: .1 }, s: "Comen juntos: nacen más rápido", r: { w: 4.2, d: 3.6, pisos: 1, color: "#D8B27A", techo: "dos", ct: "#D9B45A", partes: ["chimenea", "toldo"] } },
  { id: "plaza", g: "⛲", n: "Plaza con fuente", era: 1, pob: 50, ef: { animo: .1 }, s: "El centro del pueblo: mucho más ánimo", r: { techo: "fuente" } },
  { id: "mercado", g: "🛒", n: "Mercado", era: 1, pob: 60, ef: { comida: .05, madera: .05, piedra: .05 }, s: "+5% de todo", r: { techo: "mercado" } },
  { id: "panaderia", g: "🍞", n: "Panadería", era: 1, pob: 70, ef: { comida: .15 }, s: "+15% comida", r: { w: 3.6, d: 3.4, pisos: 2, color: "#F1D3A5", techo: "dos", ct: "#B5442F", partes: ["toldo", "chimenea"] } },
  { id: "herreria", g: "⚒️", n: "Herrería", era: 1, pob: 80, ef: { obra: .15 }, s: "Mejores herramientas: construyen +15% rápido", r: { w: 4, d: 3.4, pisos: 1, h: 2.6, color: "#6E6E6E", techo: "dos", ct: "#3E3E3E", partes: ["chimenea", "chimenea2"] } },
  { id: "carpinteria", g: "🪚", n: "Carpintería", era: 1, pob: 90, ef: { madera: .15 }, s: "+15% madera", r: { w: 4.2, d: 3.6, pisos: 1, h: 2.6, color: "#C08552", techo: "dos", ct: "#7A4B2A", partes: ["troncos"] } },
  { id: "correo", g: "✉️", n: "Correo", era: 1, pob: 100, ef: { vel: .05 }, s: "Se organizan mejor: caminan +5% rápido", r: { w: 3.6, d: 3.4, pisos: 2, color: "#F2C14E", techo: "dos", ct: "#2E5AAC", partes: ["bandera"] } },
  { id: "teatro", g: "🎭", n: "Teatro", era: 1, pob: 115, ef: { animo: .1 }, s: "Funciones todas las noches: más ánimo", r: { w: 5, d: 4.4, pisos: 2, h: 2.4, color: "#8E2C48", techo: "cupula", ct: "#E0B84F", partes: ["columnas"] } },
  { id: "estacion", g: "🚂", n: "Estación de tren", era: 2, pob: 130, ef: { vel: .1 }, s: "Viajan más rápido: +10% velocidad", r: { w: 5.4, d: 3.6, pisos: 1, h: 3, color: "#B5442F", techo: "dos", ct: "#3E3E3E", partes: ["reloj", "vias"] } },
  { id: "aserradero", g: "🏭", n: "Aserradero", era: 2, pob: 140, ef: { madera: .2 }, s: "+20% madera", r: { w: 5, d: 4, pisos: 1, h: 3.2, color: "#8C6A4F", techo: "plano", ct: "#5E4A3A", partes: ["chimenea", "rueda", "troncos"] } },
  { id: "hospital", g: "🏥", n: "Hospital", era: 2, pob: 155, ef: { nacer: .15 }, s: "Bebés sanos: nacen +15% rápido", r: { w: 5.2, d: 4.2, pisos: 3, color: "#F4F4F4", techo: "plano", ct: "#D9534F", partes: ["cruzroja"] } },
  { id: "banco", g: "🏦", n: "Banco", era: 2, pob: 170, ef: { gemas: .15 }, s: "Guardan bien las gemas: +15%", r: { w: 4.8, d: 4, pisos: 2, h: 2.4, color: "#E9E1CF", techo: "dos", ct: "#A08C6A", partes: ["columnas"] } },
  { id: "museo", g: "🏛️", n: "Museo", era: 2, pob: 185, ef: { sab: .15 }, s: "Aprenden del pasado: +15% sabiduría", r: { w: 5.4, d: 4.4, pisos: 2, h: 2.4, color: "#EDE6D6", techo: "cupula", ct: "#8EA6C8", partes: ["columnas"] } },
  { id: "puerto", g: "⚓", n: "Puerto", era: 2, pob: 200, ef: { comida: .2 }, s: "Pescado fresco: +20% comida", r: { techo: "puerto" } },
  { id: "reloj", g: "🕰️", n: "Torre del reloj", era: 2, pob: 215, ef: { obra: .1 }, s: "Llegan puntuales: construyen +10% rápido", r: { w: 2.6, d: 2.6, pisos: 5, h: 2.2, color: "#A8946E", techo: "cono", ct: "#3E5A7A", partes: ["reloj"] } },
  { id: "estadio", g: "🏟️", n: "Estadio", era: 3, pob: 240, ef: { animo: .15 }, s: "¡Partidos! Mucho más ánimo", r: { techo: "estadio" } },
  { id: "parque", g: "🎡", n: "Parque de diversiones", era: 3, pob: 260, ef: { animo: .1, nacer: .1 }, s: "Más ánimo y más bebés", r: { techo: "parque" } },
  { id: "cine", g: "🎬", n: "Cine", era: 3, pob: 280, ef: { animo: .1 }, s: "Pochoclo y películas: más ánimo", r: { w: 5, d: 4, pisos: 2, h: 2.4, color: "#2E2440", techo: "plano", ct: "#E8424F", partes: ["neon", "toldo"] } },
  { id: "laboratorio", g: "🔬", n: "Laboratorio", era: 3, pob: 300, ef: { sab: .2 }, s: "Experimentos: +20% sabiduría", r: { w: 4.6, d: 4, pisos: 3, color: "#DDE6EE", techo: "cupula", ct: "#9FD8F0", partes: ["antena", "neon"] } },
  { id: "rascacielos", g: "🏙️", n: "Rascacielos", era: 3, pob: 330, ef: { nacer: .1, alto: 2 }, s: "Casas de 2 pisos más", r: { w: 3.6, d: 3.6, pisos: 12, h: 1.8, color: "#9DB4C8", techo: "plano", ct: "#5D6D7E", partes: ["vidrio", "antena"] } },
  { id: "aeropuerto", g: "✈️", n: "Aeropuerto", era: 3, pob: 360, ef: { vel: .1 }, s: "Vuelan de un lado al otro: +10% velocidad", r: { techo: "aeropuerto" } },
  { id: "radio", g: "📡", n: "Antena de radio", era: 3, pob: 390, ef: { sab: .1 }, s: "Se enteran de todo: +10% sabiduría", r: { techo: "antenota" } },
  { id: "observatorio", g: "🔭", n: "Observatorio", era: 4, pob: 420, ef: { sab: .2 }, s: "Miran las estrellas: +20% sabiduría", r: { w: 4, d: 4, pisos: 2, color: "#F4F7FB", techo: "cupula", ct: "#B8C4D6", partes: ["telescopio"] } },
  { id: "granjavertical", g: "🥬", n: "Granja vertical", era: 4, pob: 460, ef: { comida: .25 }, s: "Huertas en el aire: +25% comida", r: { w: 3.8, d: 3.8, pisos: 7, h: 1.9, color: "#BFF0C8", techo: "plano", ct: "#4FB477", partes: ["vidrio", "plantas"] } },
  { id: "robots", g: "🤖", n: "Taller de robots", era: 4, pob: 500, ef: { obra: .25 }, s: "Robots que ayudan: +25% construcción", r: { w: 5, d: 4.2, pisos: 2, h: 2.6, color: "#C9D1DA", techo: "cupula", ct: "#7FE7F2", partes: ["neon", "antena"] } },
  { id: "teletransporte", g: "🌀", n: "Teletransportador", era: 4, pob: 550, ef: { vel: .15 }, s: "Aparecen donde quieren: +15% velocidad", r: { techo: "portal" } },
  { id: "domo", g: "🔮", n: "Domo de cristal", era: 4, pob: 600, ef: { animo: .15 }, s: "Jardín bajo el vidrio: mucho ánimo", r: { techo: "domo" } },
  { id: "ascensor", g: "🛰️", n: "Ascensor espacial", era: 4, pob: 700, ef: { gemas: .3 }, s: "Suben al espacio: +30% gemas", r: { techo: "ascensor" } },
];
const CAT = Object.fromEntries(CATALOGO.map((c) => [c.id, c]));
// mejoras acumuladas de todo lo construido
let BONOS = {};
const TOPE = { vel: 1, nacer: 3, obra: 3 };
const bono = (k) => 1 + Math.min(BONOS[k] || 0, TOPE[k] ?? 1e9);
function calcularBonos() {
  const b = {};
  const sumarEf = (ef) => { for (const k in ef) b[k] = (b[k] || 0) + ef[k]; };
  for (const e of E.edificios) if (listo(e)) { if (e.tipo === "cat" && CAT[e.cat]) sumarEf(CAT[e.cat].ef); else if (e.tipo === "inv" && e.inv) sumarEf(e.inv.ef || {}); }
  if (typeof bonosPoder === "function") sumarEf(bonosPoder());
  BONOS = b;
}
// ======================= Poder: más Brotitos, más poder (niveles sin fin) =======================
const MEJORAS = [
  { k: "vel", v: .04, t: "Caminan +4% más rápido" },
  { k: "comida", v: .05, t: "+5% comida" },
  { k: "obra", v: .05, t: "Construyen +5% más rápido" },
  { k: "madera", v: .05, t: "+5% madera" },
  { k: "sab", v: .05, t: "+5% sabiduría" },
  { k: "piedra", v: .05, t: "+5% piedra" },
  { k: "nacer", v: .05, t: "Nacen +5% más rápido" },
  { k: "animo", v: .02, t: "Están más contentos" },
  { k: "gemas", v: .05, t: "+5% gemas" },
  { k: "alto", v: 1, t: "Las casas pueden tener 1 piso más" },
];
const nivelPoder = (pob) => Math.floor(Math.sqrt(pob) / 2);
const pobParaNivel = (n) => 4 * n * n;
const mejoraDe = (n) => MEJORAS[(n - 1) % MEJORAS.length];
function bonosPoder() {
  const b = {};
  for (let n = 1; n <= (E.poder || 0); n++) { const m = mejoraDe(n); b[m.k] = (b[m.k] || 0) + m.v; }
  if (b.alto) b.alto = Math.min(b.alto, 20);
  return b;
}
function sumar(k, v) { E["_r" + k] = (E["_r" + k] || 0) + v; if (E["_r" + k] >= 1) { const n = E["_r" + k] | 0; E[k] += n; E["_r" + k] -= n; } }
const costoCat = (c) => ({ madera: Math.round(10 + c.pob * .12), piedra: Math.round(6 + c.pob * .08), gemas: c.era >= 2 ? Math.min(6, 1 + c.era) : 0 });
const proximoCat = () => CATALOGO.find((c) => !E.hechos[c.id] && E.era >= c.era && E.bichos.length >= c.pob);
const siguienteCat = () => CATALOGO.find((c) => !E.hechos[c.id]);
// ---- edificios combinados: piezas al azar → algo que nunca se vio ----
const TIPOS_INV = [
  { n: "Torre", g: ["🗼", "🏰"], techo: ["cono", "cupula"], p: [3, 7], w: [2.4, 3.2] },
  { n: "Salón", g: ["🎪", "🏛️"], techo: ["dos", "cupula"], p: [1, 2], w: [4.5, 5.5] },
  { n: "Taller", g: ["🛠️", "⚙️"], techo: ["dos", "plano"], p: [1, 2], w: [3.6, 4.6] },
  { n: "Palacio", g: ["👑", "🏯"], techo: ["cupula", "dos"], p: [2, 4], w: [5, 5.6] },
  { n: "Templo", g: ["⛩️", "🕍"], techo: ["dos", "cupula"], p: [1, 3], w: [4, 5] },
  { n: "Club", g: ["🎳", "🎲"], techo: ["plano", "dos"], p: [1, 3], w: [4, 5] },
  { n: "Fábrica", g: ["🏭", "🧪"], techo: ["plano"], p: [1, 3], w: [4.6, 5.4] },
  { n: "Faro", g: ["🗼", "💡"], techo: ["cono"], p: [4, 8], w: [2.2, 2.8] },
  { n: "Academia", g: ["🎓", "📐"], techo: ["dos", "cupula"], p: [2, 4], w: [4.4, 5.2] },
  { n: "Mirador", g: ["🔭", "🌄"], techo: ["cupula", "plano"], p: [3, 6], w: [2.8, 3.6] },
  { n: "Galería", g: ["🖼️", "🎨"], techo: ["plano", "dos"], p: [1, 2], w: [4.8, 5.6] },
  { n: "Casa de juegos", g: ["🧸", "🎠"], techo: ["cupula", "cono"], p: [1, 3], w: [3.6, 4.6] },
  { n: "Invernadero", g: ["🌱", "🌻"], techo: ["cupula"], p: [1, 2], w: [4.4, 5.4] },
  { n: "Laboratorio", g: ["🧬", "⚗️"], techo: ["cupula", "plano"], p: [2, 5], w: [3.6, 4.4] },
];
const EF_INV = [["comida", "comida"], ["madera", "madera"], ["piedra", "piedra"], ["sab", "sabiduría"], ["obra", "construcción"], ["vel", "velocidad"], ["nacer", "nacimientos"], ["gemas", "gemas"], ["animo", "ánimo"]];
const PARTES_INV = ["columnas", "chimenea", "toldo", "antena", "bandera", "reloj", "torre", "arboles", "esfera", "neon", "vidrio"];
function inventar(sem) {
  const rd = semilla(sem), en = (a) => a[rd() * a.length | 0], entre = (a, b) => a + rd() * (b - a);
  const t = en(TIPOS_INV), sil = () => en(SILABAS);
  const nom = (sil() + sil()); 
  const [k, txt] = en(EF_INV), v = k === "animo" ? .03 : Math.round(entre(3, 7)) / 100;
  const extra = Math.min(8, (E.poder || 0) / 6 | 0);
  const partes = []; const np = 1 + (rd() * 3 | 0);
  for (let i = 0; i < np; i++) { const p = en(PARTES_INV); if ((p === "neon" || p === "vidrio") && E.era < 3) continue; if (!partes.includes(p)) partes.push(p); }
  const w = entre(...t.w);
  return {
    g: en(t.g), n: `${t.n} ${nom[0].toUpperCase() + nom.slice(1)}`, s: k === "animo" ? "Están más contentos" : `+${Math.round(v * 100)}% ${txt}`, ef: { [k]: v },
    r: { w, d: w * entre(.8, 1.1), pisos: Math.round(entre(t.p[0], t.p[1] + extra)), h: entre(1.9, 2.5), color: `hsl(${rd() * 360 | 0},${35 + rd() * 30 | 0}%,${62 + rd() * 22 | 0}%)`, ct: `hsl(${rd() * 360 | 0},${40 + rd() * 30 | 0}%,${38 + rd() * 20 | 0}%)`, techo: en(t.techo), partes },
  };
}
// ---- inventor con IA: muy de vez en cuando; si falla o no hay cupo, siguen los edificios combinados ----
let pensando = false;
async function pedirInvento() {
  if (pensando) return; pensando = true;
  try {
    const ya = E.edificios.filter((e) => e.tipo === "inv").slice(-30).map((e) => e.inv.n).concat((E.colaInv || []).map((v) => v.n), CATALOGO.filter((c) => E.hechos[c.id]).slice(-10).map((c) => c.n));
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 25000);
    const r = await fetch("/api/sitios/colonia-invento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ era: E.era, pob: E.bichos.length, ya }), signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok) return;
    const v = await r.json();
    if (!v || !v.n || !v.r || !v.ef) return;
    (E.colaInv = E.colaInv || []).push(v);
    aviso(`💡 A los más sabios se les ocurrió algo: ${v.g} ${v.n}`);
  } catch (e) {} finally { pensando = false; }
}
function construirInvento() {
  E.invT = (E.invT || 0);
  if (E.invT < 180 || E.bichos.length < 40) return;
  const inv = (E.colaInv && E.colaInv.length) ? E.colaInv[0] : inventar(E.id * 7 + (E.inventos || 0) * 131);
  const k = { madera: Math.min(160, 20 + E.bichos.length * .05 | 0), piedra: Math.min(120, 12 + E.bichos.length * .04 | 0), gemas: E.era >= 2 && E.mina ? 2 : 0 };
  if (E.madera < k.madera || E.piedra < k.piedra || E.gemas < k.gemas) return;
  inv.r.icono = inv.g;
  const e = nuevoEdificio("inv"); if (!e) return;
  if (E.colaInv && E.colaInv.length) E.colaInv.shift();
  E.madera -= k.madera; E.piedra -= k.piedra; E.gemas -= k.gemas;
  e.inv = inv; E.invT = 0; E.inventos = (E.inventos || 0) + 1;
  eventos.push({ tipo: "obraInv", g: inv.g, n: inv.n, ia: !!inv.ia });
}
function construirCatalogo() {
  if (E.edificios.some((e) => (e.tipo === "cat" || e.tipo === "inv") && !listo(e))) return;
  const c = proximoCat(); if (!c) { construirInvento(); return; }
  const k = costoCat(c);
  if (E.madera < k.madera || E.piedra < k.piedra || E.gemas < k.gemas) return;
  const e = nuevoEdificio("cat", c.era <= 1); if (!e) return;
  E.madera -= k.madera; E.piedra -= k.piedra; E.gemas -= k.gemas;
  e.cat = c.id; E.hechos[c.id] = 1;
  eventos.push({ tipo: "obraCat", g: c.g, n: c.n });
}

// ======================= Islas (mundo infinito) =======================
const SEP = 74, DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
const centroHex = (q, r) => ({ x: SEP * (q + r / 2), z: SEP * (r * Math.sqrt(3) / 2) });
const BIOMAS = { pradera: { arbol: .42, arbusto: .74 }, bosque: { arbol: .7, arbusto: .85 }, rocosa: { arbol: .25, arbusto: .45 }, frutal: { arbol: .3, arbusto: .8 } };
const PASTO = "#7ACB6B";
// un solo mundo hecho de pedazos hexagonales pegados (sin agua en el medio)
const RI = SEP / 2, RH = SEP / Math.sqrt(3), CELDA = 8.6;
const EJES = [[1, 0], [.5, Math.sqrt(3) / 2], [-.5, Math.sqrt(3) / 2]];
const hexK = (dx, dz, m) => Math.max(...EJES.map(([ux, uz]) => Math.abs(dx * ux + dz * uz))) / (RI - m);
const enHex = (dx, dz, m) => hexK(dx, dz, m) <= 1;
function crearIsla(q, r) {
  const c = centroHex(q, r);
  const isla = { id: E.id++, q, r, x: c.x, z: c.z, radio: RI, bioma: q === 0 && r === 0 ? "pradera" : elegir(Object.keys(BIOMAS)), colonizada: false, nLugar: 0 };
  E.islas.push(isla); return isla;
}
function colonizar(isla) { isla.colonizada = true; isla._lug = null; sembrar(isla); }
const islaDe = (id) => E.islas.find((i) => i.id === id);
function lugares(isla) {
  if (isla._lug) return isla._lug;
  const rd = semilla(isla.id * 31 + 7), l = [];
  for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
    if (!i && !j && isla.capital) continue;
    const x = i * CELDA, z = j * CELDA, d = Math.hypot(x, z);
    if (enHex(x, z, 5)) l.push({ x: isla.x + x, z: isla.z + z, d: d + rd() * .5 });
  }
  return (isla._lug = l.sort((a, b) => a.d - b.d));
}
const lugarLibre = (isla) => isla.colonizada && isla.nLugar < lugares(isla).length;
function vecinasNuevas() {
  for (const i of E.islas.filter((i) => i.colonizada)) for (const [dq, dr] of DIRS) {
    if (!E.islas.some((o) => o.q === i.q + dq && o.r === i.r + dr)) crearIsla(i.q + dq, i.r + dr);
  }
}
function dentro(p, isla) {
  const dx = p.x - isla.x, dz = p.z - isla.z, k = hexK(dx, dz, 2);
  if (k > 1) { p.x = isla.x + dx / k; p.z = isla.z + dz / k; } return p;
}

// ======================= Estado =======================
const CLAVE = "brotitos-3d-v3";
let E;
let sigId = 1;
function crearBicho(x, z, adulto, isla) {
  return { id: sigId++, n: nombre(), isla, x, z, y: 0, dx: 0, dz: 1, est: "quieto", obj: null, carga: null, cant: 0, edad: adulto ? 999 : 0,
    susto: 0, hue: Math.random() * 360 | 0, hc: 1, fase: Math.random() * 6, trabajo: 0, charla: null, charlaT: 0, quieto: rnd(0.5, 2), oficio: null, adentro: false };
}
function nuevoEstado() {
  E = { t: Date.now(), tiempo: 30, id: 1, comida: 6, madera: 4, piedra: 2, gemas: 0, animo: 80, energia: 10,
    nacidos: 1, explotados: 0, meta: 0, maxNivel: 2, sab: 0, era: 0, islas: [], puentes: [], bichos: [], recursos: [], edificios: [], mina: null,
    pedido: null, proxPedido: 25, cohete: 150, hechos: {}, poder: 0 };
  const isla = crearIsla(0, 0); isla.capital = true; colonizar(isla);
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
    s.hechos = s.hechos || {};
    for (const b of s.bichos) if (!b.hc) { b.hue = semilla(b.id * 7 + 3)() * 360 | 0; b.hc = 1; }
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
  const bio = BIOMAS[isla.bioma], n = 140;
  for (let i = 0; i < n; i++) {
    let dx, dz; do { dx = rnd(-RH, RH); dz = rnd(-RH, RH); } while (!enHex(dx, dz, 2.5));
    const x = isla.x + dx, z = isla.z + dz;
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
  E.recursos = E.recursos.filter((r) => Math.hypot(r.x - e.x, r.z - e.z) > 5.6);
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
  const p = { id: E.id++, tipo: "tierra", a: mejor.a.id, b: mejor.b.id, isla: mejor.a.id, prog: 0 };
  const ux = (mejor.b.x - mejor.a.x) / SEP, uz = (mejor.b.z - mejor.a.z) / SEP;
  p.x = mejor.a.x + ux * (RI - 4); p.z = mejor.a.z + uz * (RI - 4);
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
  E.animo = clamp(E.animo + ((E.comida > 0 ? 0.25 : -0.6) + (hay("torre") ? .15 : 0) + (BONOS.animo || 0)) * dt, 0, 100);
  E.comerT = (E.comerT || 0) + dt;
  if (E.comerT > 40) { E.comerT = 0; E.comida = Math.max(0, E.comida - Math.ceil(E.bichos.length / 3)); }
  // producción de los edificios especiales
  const prod = (k, v) => { E["_" + k] = (E["_" + k] || 0) + v * dt; if (E["_" + k] >= 1) { const n = E["_" + k] | 0; E[k] += n; E["_" + k] -= n; } };
  if (cuantos("molino") && E.comida < 30 + E.bichos.length) prod("comida", .15 * cuantos("molino"));
  if (cuantos("fabrica")) { if (E.madera < 40 + E.bichos.length * .3) prod("madera", .12 * cuantos("fabrica")); if (E.piedra < 30 + E.bichos.length * .3) prod("piedra", .1 * cuantos("fabrica")); }
  // sabiduría
  const adultos = E.bichos.reduce((s, b) => s + (b.edad > GRANDE ? 1 : 0), 0);
  E.sab += dt * (Math.sqrt(adultos) * .15 + cuantos("escuela") * .2 + cuantos("biblioteca") * .6) * bono("sab");
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
  if (!noche && E.nacerT > 6 * (E.animo < 30 ? 2 : 1) / bono("nacer")) {
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
    const subible = casas().filter((c) => c.nivel < E.maxNivel + (BONOS.alto || 0));
    const c = subible.length && Math.random() < .65 ? elegir(subible) : null;
    if (c) {
      const k = { madera: 6 + c.nivel * 3, piedra: 4 + c.nivel * 3, gemas: c.nivel >= 3 ? 2 : 0 };
      if (E.madera >= k.madera && E.piedra >= k.piedra && E.gemas >= k.gemas) { E.madera -= k.madera; E.piedra -= k.piedra; E.gemas -= k.gemas; c.nivel++; c.prog = 0; eventos.push({ tipo: "piso" }); }
    } else if (E.islas.some(lugarLibre)) {
      if (E.madera >= 8 && E.piedra >= 4) { E.madera -= 8; E.piedra -= 4; nuevoEdificio("casa"); eventos.push({ tipo: "obra" }); }
    } else if (!E.puentes.some((p) => p.prog < 1) && E.madera >= 20 && E.piedra >= 10) {
      E.madera -= 20; E.piedra -= 10; if (nuevoPuente()) eventos.push({ tipo: "tierra" });
    }
  }
  // islas con lugar: si todas las casas posibles están hechas, preparar puente antes de llenarse
  // ¿subieron de poder?
  const np = nivelPoder(E.bichos.length);
  if (np > (E.poder || 0)) { E.poder = np; calcularBonos(); eventos.push({ tipo: "poder", n: np, m: mejoraDe(np) }); }
  E.catT = (E.catT || 0) + dt; E.invT = (E.invT || 0) + dt;
  if (E.catT > 5) { E.catT = 0; construirCatalogo(); }
  if (!E.puentes.some((p) => p.prog < 1) && E.islas.filter(lugarLibre).every((i) => lugares(i).length - i.nLugar < 3) && E.madera >= 30 && E.piedra >= 15) {
    E.madera -= 20; E.piedra -= 10; if (nuevoPuente()) eventos.push({ tipo: "tierra" });
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
    for (const k in falta) sumar(k, tasa * falta[k] / tot * bono(k));
    if (E.mina && islaId === E.mina.isla && E.gemas < 12 + E.era * 6) { sumar("gemas", tasa * .04 * E.mina.prof * bono("gemas")); }
  }
}
function avanzarObra(o, cuanto, offline) {
  const lento = { torre: .4, cohete: .25, escuela: .6, mina: .7, biblioteca: .5, molino: .6, fabrica: .45, central: .4, base: .3, tierra: .5, cat: .6, inv: .55 }[o.tipo] || 1;
  o.prog = Math.min(1, o.prog + cuanto * lento * bono("obra"));
  if (listo(o)) {
    if (o.tipo === "mina" && !E.mina) E.mina = { x: o.x, z: o.z, isla: o.isla, prof: 1, cavado: 0, id: o.id };
    if (o.tipo === "tierra") { colonizar(islaDe(o.b)); vecinasNuevas(); migrar(o); }
    if (o.tipo === "cat" || o.tipo === "inv") calcularBonos();
    eventos.push({ tipo: "listo", e: o });
    if (!offline && activas.has(o.isla)) festejo(o);
  }
}
function migrar(p) {
  const desde = E.bichos.filter((b) => b.isla === p.a && b.edad > GRANDE && b.y === 0).slice(0, 5);
  for (const b of desde) { b.est = "cruzar"; b.destino = p.b; b.adentro = false; }
  if (!desde.length) { const i = islaDe(p.b); E.bichos.push(crearBicho(i.x, i.z, true, i.id)); }
}
function buscar(id) { return E.recursos.find((r) => r.id === id) || E.edificios.find((e) => e.id === id) || E.puentes.find((p) => p.id === id); }

function actualizarBicho(b, dt, offline, noche) {
  if (b._congelado) { b._congelado = false; if (b.carga) { E[b.carga] += b.cant || 1; b.carga = null; } b.est = "quieto"; b.quieto = rnd(0, 1.5); b.y = 0; b.adentro = false; }
  b.edad += dt * (hay("escuela") && b.edad < GRANDE ? 2 : 1); b.fase += dt * 10;
  if (b.charlaT > 0) b.charlaT -= dt;
  const isla = islaDe(b.isla); if (!isla) return;
  if (b.caida > 0) { // lo chocó el rey: se cae para atrás, se levanta asustado y se va
    b.caida -= dt; const k = Math.max(0, b.caida - 1.1) * 4;
    b.x += b.kx * k * dt; b.z += b.kz * k * dt; dentro(b, isla);
    if (b.caida <= 0) { b.caida = 0; b.susto = rnd(3, 5); b.dx = b.kx; b.dz = b.kz; b.est = "quieto"; b.quieto = 1; hablar(b, elegir(["¡no no!", "😨", "¡ayyy!", "¡" + balbuceo(1) + "!"]), true); }
    return;
  }
  const adulto = b.edad > GRANDE, vel = (adulto ? VEL : VEL_BEBE) * (E.animo < 30 ? .7 : 1) * (E.era >= 2 ? 1.3 : 1) * bono("vel");
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
    case "llevar": { const a = buscar(b.obj) || almacenCercano(); if (!a) { b.est = "quieto"; break; } if (mover(a, 1.8)) { sumar(b.carga, (b.cant || 1) * bono(b.carga)); b.carga = null; b.cant = 0; b.est = "quieto"; b.quieto = rnd(.2, .8); } break; }
    case "construir": {
      const o = buscar(b.obj); if (!o || listo(o)) { b.est = "quieto"; b.quieto = .5; break; }
      const meta = o.tipo === "tierra" ? { x: o.x + Math.cos(b.ang) * 1.2, z: o.z + Math.sin(b.ang) * 1.2 } : { x: o.x + Math.cos(b.ang) * 2.7, z: o.z + Math.sin(b.ang) * 2.7 };
      if (mover(dentro(meta, isla))) {
        b.dx = o.x - b.x || .01; b.dz = o.z - b.z;
        avanzarObra(o, dt * .05, offline);
        if (listo(o) && Math.random() < .5) hablar(b, "¡" + balbuceo(1) + "!", true);
      }
      break;
    }
    case "cruzar": {
      const dest = islaDe(b.destino); if (!dest) { b.est = "quieto"; break; }
      if (!b.meta) b.meta = { x: dest.x + rnd(-6, 6), z: dest.z + rnd(-6, 6) };
      if (mover(b.meta)) { b.isla = b.destino; b.meta = null; b.est = "quieto"; b.quieto = 1; hablar(b, "¡" + balbuceo(1) + "!"); }
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
// cuánto das por toque: crece con la población y la era
const porToque = () => 1 + E.era + (E.bichos.length / 12 | 0);
function nuevoPedido() {
  const tipo = elegir(["comida", "madera", "piedra"]);
  const vis = E.bichos.filter((b) => b.edad > GRANDE && !b.adentro && b.y === 0 && activas.has(b.isla));
  const pide = elegir(vis) || E.bichos[0];
  // el pedido se mide en toques (3 a 6): siempre alcanza la energía, aunque la colonia sea enorme
  E.pedido = { tipo, cant: (3 + (Math.random() * 4 | 0)) * porToque(), dado: 0, t: 25, total: 25 };
  hablar(pide, ICONO[tipo] + "? " + balbuceo(1), true);
}
function dar(tipo) {
  if (E.energia < 1) { aviso("Sin energía ⚡ esperá un poquito"); return; }
  const k = porToque(); E.energia -= 1; E[tipo] += k;
  const cerca = cercano(E.bichos.filter((b) => !b.adentro && b.y === 0 && activas.has(b.isla)), controles.target);
  if (cerca) { corazones(cerca); if (Math.random() < .4) hablar(cerca, "¡" + ICONO[tipo] + "!"); }
  if (E.pedido && E.pedido.tipo === tipo) {
    E.pedido.dado = Math.min(E.pedido.cant, E.pedido.dado + k);
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
  if (!muestra("aplastar", .9, rnd(.95, 1.08))) { sonido("aplastar"); sonido("ay", b); }
  if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
  if (!E.bichos.length) setTimeout(() => { aviso("No queda ninguno… nace uno nuevo 🌱"); const i = E.islas.find((x) => x.capital); E.bichos.push(crearBicho(i.x + 1.5, i.z + 1.5, true, i.id)); }, 1500);
}

// ======================= Sonido =======================
let AC = null, sonidoOn = true;
try { sonidoOn = localStorage.getItem("brotitos-sonido") !== "0"; } catch (e) {}
function audio() { if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); cargarSonidos(); } if (AC.state === "suspended") AC.resume(); return AC; }
// ---- sonidos grabados (colonia/sonidos) ----
const MUESTRAS = { aplastar: ["aplastar1", "aplastar2", "aplastar3"], rebotar: ["rebotar1", "rebotar2", "rebotar3"], pasos: ["paso1", "paso2", "paso3", "paso4"], desbloqueo: ["desbloqueo"], boton: ["boton"] };
const BUF = {};
function cargarSonidos() {
  for (const k in MUESTRAS) for (const n of MUESTRAS[k]) {
    fetch(`sonidos/${n}.mp3`).then((r) => r.arrayBuffer()).then((a) => new Promise((ok, mal) => AC.decodeAudioData(a, ok, mal))).then((b) => { BUF[n] = b; }).catch(() => {});
  }
}
function muestra(k, vol = 1, vel = 1) {
  if (!sonidoOn || !AC) return null;
  const lista = MUESTRAS[k].filter((n) => BUF[n]); if (!lista.length) return null;
  const src = AC.createBufferSource(), g = AC.createGain();
  src.buffer = BUF[elegir(lista)]; src.playbackRate.value = vel; g.gain.value = vol;
  src.connect(g).connect(AC.destination); src.start(); return { src, g };
}
document.addEventListener("pointerdown", (e) => { if (e.target.closest && e.target.closest("button, #anillo")) { audio(); muestra("boton", .6); } }, true);
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
const tono = (b) => b ? ((b.hue * 7) % 60 - 30) * 4 : 0;
function sonido(tipo, b) {
  if (!sonidoOn) return; const ctx = audio(); if (!ctx) return; const t = ctx.currentTime + .01;
  if (tipo === "habla") { const base = (b && b.edad < GRANDE ? 1100 : 820) + tono(b); for (let i = 0; i < 3 + (Math.random() * 3 | 0); i++) blip(ctx, t + i * .09, base * rnd(.85, 1.15), .07, "sine", .12); }
  if (tipo === "susto") { const base = 1250 + tono(b); for (let i = 0; i < 2; i++) blip(ctx, t + i * .16, base * (1 - i * .15), .13, "triangle", .14); }
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
function logro(gl, t, s) { $("logro-g").textContent = gl; $("logro-t").textContent = t; $("logro-s").textContent = s; $("logro").classList.add("ver"); clearTimeout(logroT); logroT = setTimeout(() => $("logro").classList.remove("ver"), 3800); if (!muestra("desbloqueo", .8)) sonido("logro"); }

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
function mallaIsla(isla, detalle, prog = 1) {
  const g = new THREE.Group(), r = RH * 1.004;
  const pasto = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .6, 6), mat(PASTO)); pasto.position.y = -.3; pasto.receiveShadow = true;
  const tierra = new THREE.Mesh(new THREE.CylinderGeometry(r * .999, r * .999, 9, 6), mat("#B9875A")); tierra.position.y = -5.1;
  const roca = new THREE.Mesh(new THREE.CylinderGeometry(r * .99, r * .6, 8, 6), mat("#9C6E45")); roca.position.y = -13.6;
  const rd0 = semilla(isla.id * 13 + 5);
  const punta = new THREE.Mesh(new THREE.ConeGeometry(r * .6, 10 + rd0() * 14, 6), mat("#8A5E3A")); punta.rotation.x = Math.PI; punta.position.y = -17.6 - punta.geometry.parameters.height / 2;
  g.add(pasto, tierra, roca, punta);
  if (prog >= 1 && isla.colonizada) calles(g, isla);
  if (detalle && prog >= 1) { const rd = semilla(isla.id); for (let i = 0; i < 180; i++) { const dx = (rd() - .5) * 2 * r, dz = (rd() - .5) * 2 * r; if (!enHex(dx, dz, 1)) continue; g.add(malla(G.cono, mat(rd() < .5 ? "#5DB85A" : "#8FD67A"), .25, .5, .25, dx, .2, dz, false)); } }
  g.position.set(isla.x, -(1 - prog) * 26, isla.z);
  if (prog < 1) { const k = .55 + .45 * prog; g.scale.set(k, 1, k); }
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
// ---- edificios armados con piezas (catálogo, combinados e inventos) ----
const VIDRIO = new THREE.MeshLambertMaterial({ color: "#BFE6FF", emissive: "#5FA8D8", emissiveIntensity: .15, transparent: true, opacity: .75 });
const altoReceta = (r) => ({ pozo: 3, fuente: 2, cantera: 2, totem: 4.5, mercado: 3, puerto: 2.5, estadio: 3, parque: 7, aeropuerto: 3, antenota: 14, portal: 5, domo: 4, ascensor: 22 }[r.techo] || (r.pisos ?? 1) * (r.h || 2.2) + 1.5);
function armar(r, simple, sem = 1) {
  const g = new THREE.Group(), rd = semilla(sem), H = r.h || 2.2, n = r.pisos ?? 1, alto = n * H, W = r.w || 4, D = r.d || W;
  const pared = mat(r.color || "#E0C9A6"), ct = mat(r.ct || "#8E3B2E");
  const partes = new Set(r.partes || []);
  const listoCon = (y) => { if (!simple && r.icono) cartel(r.icono, 0, y, g, .9); return g; };
  switch (r.techo) {
    case "pozo":
      g.add(malla(G.cil, mat("#8C939C"), 2.2, 1, 2.2, 0, .5, 0), malla(G.cil, mat("#3A7BD5"), 1.8, .05, 1.8, 0, 1.02, 0, false));
      for (const s of [-1, 1]) g.add(malla(G.cil, mat("#7A4B2A"), .15, 2.2, .15, s * .95, 1.6, 0));
      { const t = malla(G.piramide, ct, 2.6, .9, 1.8, 0, 3.1, 0); t.rotation.y = Math.PI / 4; g.add(t); }
      return listoCon(4.6);
    case "fuente":
      g.add(malla(G.cil, mat("#D8D2C4"), 7, .12, 7, 0, .06, 0, false), malla(G.cil, mat("#B9B2A3"), 3.2, .6, 3.2, 0, .3, 0), malla(G.cil, mat("#5EC8F2"), 2.8, .05, 2.8, 0, .62, 0, false));
      g.add(malla(G.cil, mat("#B9B2A3"), .4, 1.6, .4, 0, 1, 0), malla(G.cil, mat("#B9B2A3"), 1.3, .2, 1.3, 0, 1.8, 0), malla(G.esfera, mat("#9FE3F5"), .6, .5, .6, 0, 2.1, 0, false));
      if (!simple) for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + .78; g.add(malla(G.cil, mat("#7A4B2A"), .15, 1, .15, Math.cos(a) * 2.9, .5, Math.sin(a) * 2.9), malla(G.esfera, mat("#4FAE5A"), 1.2, 1.2, 1.2, Math.cos(a) * 2.9, 1.4, Math.sin(a) * 2.9)); }
      return listoCon(3.8);
    case "cantera":
      for (let i = 0; i < 7; i++) g.add(malla(G.roca, mat(i % 2 ? "#8C939C" : "#A7ADB8"), 1.2 + rd() * 1.3, .8 + rd() * 1.4, 1.2 + rd() * 1.3, rd() * 4 - 2, .5, rd() * 4 - 2));
      g.add(malla(G.caja, mat("#7A4B2A"), 1.6, .5, 1, 1.8, .25, 1.6));
      return listoCon(3.4);
    case "totem":
      for (let i = 0; i < 3; i++) { g.add(malla(G.cil, mat(["#B5442F", "#2E8B57", "#E0B84F"][i], ), 1.2, 1.3, 1.2, 0, .65 + i * 1.3, 0)); g.add(malla(G.ojo, NEGRO, 1.6, 1.6, 1, -.25, .85 + i * 1.3, .6, false), malla(G.ojo, NEGRO, 1.6, 1.6, 1, .25, .85 + i * 1.3, .6, false)); }
      g.add(malla(G.caja, mat("#E0B84F"), 3, .25, .5, 0, 3.6, 0));
      return listoCon(5.2);
    case "mercado":
      for (let i = 0; i < 3; i++) { const x = -2.2 + i * 2.2, c = ["#E8424F", "#4FB477", "#3A7BD5"][i]; g.add(malla(G.caja, mat("#9C6E45"), 1.8, .9, 1.2, x, .45, 0)); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(malla(G.cil, mat("#7A4B2A"), .08, 2.2, .08, x + a * .85, 1.1, b * .55, false)); const t = malla(G.caja, mat(c), 2, .12, 1.6, x, 2.25, 0); t.rotation.x = .2; g.add(t); if (!simple) for (let k = 0; k < 3; k++) g.add(malla(G.esfera, mat(["#FF9F1C", "#E8424F", "#7ED957"][k]), .3, .3, .3, x - .5 + k * .5, 1, .1, false)); }
      return listoCon(3.6);
    case "puerto":
      g.add(malla(G.caja, mat("#2E86C1"), 7, .1, 4, 0, .05, 1, false), malla(G.caja, mat("#9C6E45"), 7, .3, 1.4, 0, .3, -1.6));
      for (let i = 0; i < 5; i++) g.add(malla(G.cil, mat("#6B4A33"), .2, 1, .2, -3 + i * 1.5, .2, -.9, false));
      { const bote = new THREE.Group(); bote.add(malla(G.caja, mat("#F4F4F4"), 2.4, .6, 1, 0, .4, 0), malla(G.cil, mat("#7A4B2A"), .08, 2, .08, 0, 1.6, 0), malla(G.piramide, mat("#ffffff"), 1, 1.6, .1, .4, 1.7, 0, false)); bote.position.set(1, 0, 1.5); g.add(bote); }
      return listoCon(3.6);
    case "estadio": {
      const anillo = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 2.4, 28, 1, true), new THREE.MeshLambertMaterial({ color: "#D9DEE5", side: THREE.DoubleSide })); anillo.position.y = 1.2; anillo.castShadow = true; g.add(anillo);
      g.add(malla(G.cil, mat("#4FAE5A"), 6, .1, 6, 0, .1, 0, false), malla(G.cil, mat("#E8424F"), 7.3, .3, 7.3, 0, 2.5, 0, false));
      if (!simple) for (const s of [-1, 1]) g.add(malla(G.cil, mat("#555"), .1, 4.5, .1, s * 3.4, 2.2, 0), malla(G.caja, NEON, .8, .4, .3, s * 3.4, 4.5, 0, false));
      return listoCon(5.8);
    }
    case "parque": {
      const rueda = new THREE.Group(); rueda.position.set(0, 3.6, 0);
      rueda.add(new THREE.Mesh(new THREE.TorusGeometry(3, .12, 8, 32), mat("#E8424F")));
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, rayo = malla(G.cil, mat("#F4F4F4"), .06, 3, .06, Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0, false); rayo.rotation.z = a - Math.PI / 2; rueda.add(rayo); rueda.add(malla(G.caja, mat(["#F2C14E", "#4FB477", "#3A7BD5", "#FF6F91"][i % 4]), .7, .6, .7, Math.cos(a) * 3, Math.sin(a) * 3 - .4, 0, false)); }
      g.add(rueda); g.userData.rueda = rueda;
      for (const s of [-1, 1]) { const p = malla(G.cil, mat("#9AA3AD"), .2, 4, .2, s * 1.3, 1.8, 0); p.rotation.z = s * .35; g.add(p); }
      if (!simple) g.add(malla(G.cono, mat("#FF6F91"), 1.6, 1.4, 1.6, 3.6, .7, 2.4), malla(G.cil, mat("#F4F4F4"), 1.5, 1, 1.5, 3.6, .2, 2.4));
      return listoCon(7.8);
    }
    case "aeropuerto":
      g.add(malla(G.caja, mat("#4E4E58"), 8, .1, 2, 0, .06, 1.5, false), malla(G.caja, mat("#DDE3EA"), 4, 2, 2.4, 0, 1, -1.5));
      for (let i = 0; i < 6; i++) g.add(malla(G.caja, mat("#ffffff"), .7, .02, .15, -3.2 + i * 1.3, .12, 1.5, false));
      g.add(malla(G.cil, mat("#DDE3EA"), .6, 3, .6, 2.6, 2.5, -1.8), malla(G.cil, VIDRIO, 1.2, .8, 1.2, 2.6, 4.2, -1.8, false));
      { const av = new THREE.Group(); av.add(malla(G.cil, mat("#F4F4F4"), .5, 3.2, .5, 0, 0, 0), malla(G.caja, mat("#F4F4F4"), 3.4, .1, .7, 0, 0, 0), malla(G.caja, mat("#3A7BD5"), .1, .8, .5, 0, .4, -1.4)); av.children[0].rotation.x = Math.PI / 2; av.position.set(-2, .5, 1.5); av.rotation.y = Math.PI / 2; g.add(av); }
      return listoCon(5.6);
    case "antenota":
      for (let i = 0; i < 4; i++) { const t = malla(G.caja, mat("#C0392B"), .2, 12, .2, (i % 2 ? 1 : -1) * .5, 6, (i < 2 ? 1 : -1) * .5); g.add(t); }
      for (let y = 1; y < 12; y += 1.5) g.add(malla(G.caja, mat("#F4F4F4"), 1.2, .1, 1.2, 0, y, 0, false));
      g.add(malla(G.esfera, NEON, .5, .5, .5, 0, 12.4, 0, false));
      { const plato = malla(G.media, mat("#F4F4F4"), 2.2, .8, 2.2, 1.6, 2.2, 0); plato.rotation.z = 1.2; g.add(plato); }
      return listoCon(14);
    case "portal": {
      const aro = new THREE.Mesh(new THREE.TorusGeometry(2, .35, 12, 32), mat("#8E7CFF")); aro.position.y = 2.6; aro.castShadow = true; g.add(aro);
      g.add(malla(G.cil, NEON, 3.3, .05, 3.3, 0, 2.6, 0, false)); g.children[g.children.length - 1].rotation.x = Math.PI / 2;
      g.add(malla(G.cil, mat("#5D6D7E"), 3.6, .4, 2, 0, .2, 0));
      g.userData.rueda = aro;
      return listoCon(6);
    }
    case "domo":
      g.add(malla(G.cil, mat("#DDE3EA"), 7, .3, 7, 0, .15, 0), malla(G.media, VIDRIO, 6.8, 4, 6.8, 0, .3, 0, false));
      if (!simple) for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; g.add(malla(G.esfera, mat("#4FAE5A"), 1, 1.3, 1, Math.cos(a) * 1.8, 1, Math.sin(a) * 1.8, false)); }
      return listoCon(5);
    case "ascensor":
      g.add(malla(G.cil, mat("#5D6D7E"), 3.6, 1, 3.6, 0, .5, 0), malla(G.cil, mat("#C9D1DA"), .5, 22, .5, 0, 11, 0), malla(G.cil, NEON, .7, 22, .7, 0, 11, 0, false));
      g.children[g.children.length - 1].material = new THREE.MeshLambertMaterial({ color: "#B8F3FF", emissive: "#5FE3FF", emissiveIntensity: .4, transparent: true, opacity: .25 });
      { const cab = malla(G.caja, VIDRIO, 1.4, 1.4, 1.4, 0, 6, 0, false); g.add(cab); g.userData.cabina = cab; }
      return listoCon(23.5);
  }
  // edificio común: cuerpo + ventanas + techo + piezas
  if (n > 0) g.add(malla(G.caja, partes.has("vidrio") ? VIDRIO : pared, W, alto, D, 0, alto / 2, 0));
  if (partes.has("vidrio") && n > 0) for (let i = 1; i <= n; i++) g.add(malla(G.caja, pared, W + .12, .12, D + .12, 0, i * H, 0, false));
  if (!simple && n > 0 && !partes.has("vidrio")) {
    const cols = Math.max(1, Math.round(W / 1.3));
    for (let i = 0; i < n; i++) {
      const y = i * H + H * .55;
      for (let c = 0; c < cols; c++) { const x = -W / 2 + (c + .5) * W / cols; if (i === 0 && Math.abs(x) < .7) continue; g.add(malla(G.caja, VENTANA, W / cols * .45, H * .35, .06, x, y, D / 2 + .01, false)); }
      for (const s of [-1, 1]) g.add(malla(G.caja, VENTANA, .06, H * .35, D * .35, s * (W / 2 + .01), y, 0, false));
    }
  }
  if (!simple && n > 0) g.add(malla(G.caja, mat("#6B4A33"), .9, Math.min(1.5, H * .7), .1, 0, Math.min(1.5, H * .7) / 2, D / 2 + .03, false));
  let top = alto;
  switch (r.techo) {
    case "plano": g.add(malla(G.caja, ct, W + .3, .3, D + .3, 0, alto + .15, 0)); top += .3; break;
    case "cupula": g.add(malla(G.media, ct, Math.min(W, D) * 1.02, Math.min(W, D) * .7, Math.min(W, D) * 1.02, 0, alto, 0)); top += Math.min(W, D) * .35; break;
    case "cono": g.add(malla(G.cono, ct, W * 1.2, 2.6, D * 1.2, 0, alto + 1.3, 0)); top += 2.6; break;
    default: { const t = malla(G.piramide, ct, W * 1.45, 1.7, D * 1.45, 0, alto + .85, 0); t.rotation.y = Math.PI / 4; g.add(t); top += 1.7; }
  }
  if (!simple) {
    if (partes.has("columnas")) { for (let i = 0; i < 4; i++) g.add(malla(G.cil, mat("#F4F0E6"), .32, Math.min(alto, H * 2), .32, -W / 2 + .5 + i * (W - 1) / 3, Math.min(alto, H * 2) / 2, D / 2 + .5)); g.add(malla(G.caja, mat("#F4F0E6"), W + .2, .3, 1.2, 0, Math.min(alto, H * 2) + .15, D / 2 + .3)); }
    if (partes.has("chimenea")) { g.add(malla(G.caja, mat("#6E6E6E"), .5, 1.8, .5, W * .3, top + .2, -D * .25)); g.userData.humo = [{ x: W * .3, y: top + 1.2, z: -D * .25 }]; }
    if (partes.has("chimenea2")) { g.add(malla(G.caja, mat("#6E6E6E"), .5, 2.2, .5, -W * .3, top + .4, -D * .25)); (g.userData.humo = g.userData.humo || []).push({ x: -W * .3, y: top + 1.6, z: -D * .25 }); }
    if (partes.has("toldo")) for (let i = 0; i < 5; i++) { const t = malla(G.caja, mat(i % 2 ? "#ffffff" : (r.ct || "#E8424F")), W / 5, .1, 1.1, -W / 2 + (i + .5) * W / 5, H * .9, D / 2 + .5, false); t.rotation.x = .35; g.add(t); }
    if (partes.has("antena")) g.add(malla(G.cil, mat("#888"), .06, 2.6, .06, W * .25, top + 1.3, D * .25), malla(G.esfera, NEON, .25, .25, .25, W * .25, top + 2.7, D * .25, false));
    if (partes.has("bandera")) { g.add(malla(G.cil, mat("#666"), .06, 2.4, .06, -W * .3, top + 1.2, 0)); const b = malla(G.caja, mat(r.ct || "#FF6F91"), 1, .55, .05, -W * .3 + .5, top + 2.1, 0, false); g.add(b); g.userData.bandera = b; }
    if (partes.has("neon")) g.add(malla(G.caja, NEON, W + .05, .18, D + .05, 0, Math.min(alto - .3, H * 1.05), 0, false));
    if (partes.has("reloj")) g.add(malla(G.cil, mat("#F4F4F4"), 1.3, .08, 1.3, 0, alto - H * .5, D / 2 + .05, false)), g.children[g.children.length - 1].rotation.x = Math.PI / 2;
    if (partes.has("cruz")) { g.add(malla(G.caja, mat("#F4F4F4"), .15, 1.6, .06, 0, H * .55, D / 2 + .03, false)); const c2 = malla(G.caja, mat("#F4F4F4"), .15, 1.6, .06, 0, H * .55, D / 2 + .03, false); c2.rotation.z = Math.PI / 2; g.add(c2); }
    if (partes.has("cruzroja")) { g.add(malla(G.caja, mat("#E8424F"), .4, 1.4, .06, 0, alto - 1, D / 2 + .03, false), malla(G.caja, mat("#E8424F"), 1.4, .4, .06, 0, alto - 1, D / 2 + .03, false)); }
    if (partes.has("troncos")) for (let i = 0; i < 3; i++) { const t = malla(G.cil, mat("#8A5A36"), .4, 1.8, .4, W / 2 + .7, .25 + i * .4, -.5 + (i % 2) * .5); t.rotation.x = Math.PI / 2; g.add(t); }
    if (partes.has("rueda")) { const ru = new THREE.Mesh(new THREE.TorusGeometry(1.1, .14, 8, 20), mat("#7A4B2A")); ru.position.set(W / 2 + .2, 1.2, 0); ru.rotation.y = Math.PI / 2; g.add(ru); g.userData.rueda = ru; }
    if (partes.has("vias")) for (const s of [-.5, .5]) g.add(malla(G.caja, mat("#555"), W + 3, .08, .1, 0, .08, D / 2 + 1.3 + s, false));
    if (partes.has("telescopio")) { const t = malla(G.cil, mat("#3E5A7A"), .5, 2.6, .5, .3, top + .6, 0); t.rotation.z = -.7; g.add(t); }
    if (partes.has("plantas")) for (let i = 0; i < n; i++) g.add(malla(G.caja, mat("#4FAE5A"), W * .8, H * .4, D * .8, 0, i * H + H * .3, 0, false));
    if (partes.has("torre")) { g.add(malla(G.cil, pared, 1.4, alto + 3, 1.4, W / 2, (alto + 3) / 2, -D / 2), malla(G.cono, ct, 1.9, 1.8, 1.9, W / 2, alto + 3.9, -D / 2)); top = Math.max(top, alto + 4.8); }
    if (partes.has("arboles")) for (const [a, b] of [[-1, 1], [1, 1]]) g.add(malla(G.cil, mat("#7A4B2A"), .15, 1, .15, a * (W / 2 + .9), .5, b * (D / 2 + .5)), malla(G.esfera, mat("#4FAE5A"), 1.1, 1.1, 1.1, a * (W / 2 + .9), 1.4, b * (D / 2 + .5)));
    if (partes.has("esfera")) g.add(malla(G.esfera, NEON, 1, 1, 1, 0, top + .8, 0, false)), top += 1.3;
  }
  return listoCon(top + 1.6);
}
// ---- calles: crecen alrededor de lo construido y mejoran con la era ----
const COLOR_CALLE = ["#C8A46E", "#B9B1A6", "#9A9A9A", "#55555F", "#454B5A"];
function calles(g, isla) {
  const L = lugares(isla), usados = L.slice(0, isla.nLugar).map((p) => ({ x: p.x - isla.x, z: p.z - isla.z }));
  if (isla.capital) usados.push({ x: 0, z: 0 });
  if (!usados.length) return;
  const h = CELDA / 2, segs = new Map(), esquinas = new Map();
  const k = (v) => Math.round(v * 2) / 2;
  for (const p of usados) {
    for (const [ax, az, hor] of [[0, -h, 1], [0, h, 1], [-h, 0, 0], [h, 0, 0]]) { const x = k(p.x + ax), z = k(p.z + az); segs.set(x + "," + z, { x, z, hor }); }
    for (const [ax, az] of [[-h, -h], [h, -h], [-h, h], [h, h]]) { const x = k(p.x + ax), z = k(p.z + az); esquinas.set(x + "," + z, { x, z }); }
  }
  const im = new THREE.InstancedMesh(G.caja, mat(COLOR_CALLE[Math.min(E.era, 4)]), segs.size), m4 = new THREE.Matrix4(); let i = 0;
  for (const s of segs.values()) { m4.makeScale(s.hor ? CELDA + 2 : 2.1, .08, s.hor ? 2.1 : CELDA + 2); m4.setPosition(s.x, .04, s.z); im.setMatrixAt(i++, m4); }
  im.receiveShadow = true; g.add(im);
  if (E.era >= 3) {
    const lista = [...esquinas.values()].filter((_, j) => j % 2 === 0);
    const postes = new THREE.InstancedMesh(G.cil, mat("#555"), lista.length), luces = new THREE.InstancedMesh(G.esfera, NEON, lista.length);
    lista.forEach((c, j) => { m4.makeScale(.1, 2.6, .1); m4.setPosition(c.x + 1.2, 1.3, c.z + 1.2); postes.setMatrixAt(j, m4); m4.makeScale(.4, .4, .4); m4.setPosition(c.x + 1.2, 2.7, c.z + 1.2); luces.setMatrixAt(j, m4); });
    g.add(postes, luces);
  }
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
  if (e.tipo === "cat" || e.tipo === "inv") {
    const r = e.tipo === "cat" ? { ...CAT[e.cat].r, icono: CAT[e.cat].g } : e.inv.r;
    if (!listo(e)) { andamio(g, r.w || 4.4, Math.min(8, altoReceta(r) - 1), r.d || r.w || 4.4, e.prog); return g; }
    return armar(r, simple, e.id);
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
  const orden = E.islas.filter((i) => i.colonizada).map((i) => ({ i, d: Math.hypot(i.x - t.x, i.z - t.z) })).sort((a, b) => a.d - b.d);
  islasVisibles = new Set(orden.filter((o) => o.d < 260 + camD * 1.1).slice(0, 60).map((o) => o.i.id));
  const det = camD < 170 ? orden.filter((o) => o.d < 60 + camD * .5).slice(0, camD < 80 ? 4 : 3) : [];
  islasDetalle = new Set(det.map((o) => o.i.id));
  if (dentroMundo && yo.isla) { islasDetalle.add(yo.isla); islasVisibles.add(yo.isla); }
  activas = new Set(islasDetalle);
}
function claveDe(o, simple) {
  if (o.tipo === "cat" || o.tipo === "inv") return `${o.tipo}${o.id}${listo(o) ? "L" : (o.prog * 10 | 0)}${simple ? "s" : ""}`;
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
  const creciendo = new Map(E.puentes.filter((p) => !listo(p) && islasVisibles.has(p.a)).map((p) => [p.b, p.prog]));
  for (const isla of E.islas) {
    const crece = creciendo.get(isla.id);
    const ver = (isla.colonizada && islasVisibles.has(isla.id)) || crece !== undefined, det = islasDetalle.has(isla.id);
    const clave = crece !== undefined ? "c" + Math.round(crece * 30) : `${det}-${isla.nLugar}-${E.era}`;
    let m = mallasIsla.get(isla.id);
    if (!ver) { if (m) { liberar(m.g); mallasIsla.delete(isla.id); } continue; }
    if (!m || m.clave !== clave) { if (m) liberar(m.g); const g = mallaIsla(isla, det, crece === undefined ? 1 : crece); escena.add(g); mallasIsla.set(isla.id, { g, clave }); }
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
const FORMAS = [[1.6, 1.85, 1.5], [1.9, 1.6, 1.75], [1.42, 2.15, 1.38], [1.7, 1.75, 1.6]];
function estiloDe(b) {
  if (b.id < 0) return { a: 0, f: 0, m: false };
  const rd = semilla(b.id * 13 + 1);
  return { a: rd() * 7 | 0, f: rd() * FORMAS.length | 0, m: rd() < .3, o: rd() < .25 };
}
function adorno(g, est, b) {
  const h = b.hue, comp = (h + 180) % 360, alto = FORMAS[est.f][1] * .5 + .95;
  const add = (...o) => { g.add(...o); return o[0]; };
  switch (est.a) {
    case 1: { // flor
      add(malla(G.cil, mat("#3E9A4E"), .07, .45, .07, 0, alto + .15, 0, false));
      const c = mat(elegirDe(b, ["#FF8FB1", "#FFFFFF", "#FFD43B", "#B39DFF", "#FF7A59"]));
      for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; g.add(malla(G.esfera, c, .26, .14, .26, Math.cos(a) * .22, alto + .42, Math.sin(a) * .22, false)); }
      return add(malla(G.esfera, mat("#FFC23D"), .22, .16, .22, 0, alto + .45, 0, false));
    }
    case 2: { // antenitas
      for (const s of [-1, 1]) { const a = malla(G.cil, mat("#3B3350"), .05, .7, .05, s * .25, alto + .2, 0, false); a.rotation.z = -s * .35; g.add(a); g.add(malla(G.esfera, matHue(comp), .2, .2, .2, s * .38, alto + .55, 0, false)); }
      return g.children[g.children.length - 1];
    }
    case 3: { // copete
      for (let i = -1; i <= 1; i++) { const c = malla(G.cono, matPie(h), .22, .55, .22, i * .18, alto + .1, -.05 * Math.abs(i), false); c.rotation.z = -i * .4; g.add(c); }
      return g.children[g.children.length - 1];
    }
    case 4: // orejitas
      for (const s of [-1, 1]) g.add(malla(G.esfera, matHue(h), .42, .55, .3, s * .55, alto - .15, 0, false), malla(G.esfera, mat("#FFB3C7"), .22, .32, .1, s * .55, alto - .15, .12, false));
      return g.children[g.children.length - 1];
    case 5: { // honguito
      add(malla(G.media, mat("#E8424F"), .9, .6, .9, 0, alto - .05, 0, false));
      for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + .5; g.add(malla(G.esfera, BLANCO, .14, .1, .14, Math.cos(a) * .26, alto + .17, Math.sin(a) * .26, false)); }
      return g.children[g.children.length - 1];
    }
    case 6: // rulito
      { const r = new THREE.Mesh(new THREE.TorusGeometry(.18, .05, 6, 14, 5), matPie(h)); r.position.set(0, alto + .2, 0); r.rotation.y = Math.PI / 2; g.add(r); return r; }
    default: { // hojitas (las de siempre)
      g.add(malla(G.cil, mat("#3E9A4E"), .07, .5, .07, 0, alto + .05, 0, false));
      const hoja1 = malla(G.hoja, mat("#5CC86B"), .55, .14, .28, .22, alto + .3, 0, false); hoja1.rotation.z = -.4;
      const hoja2 = malla(G.hoja, mat("#5CC86B"), .45, .12, .24, -.2, alto + .2, 0, false); hoja2.rotation.z = .4;
      g.add(hoja1, hoja2); return hoja2;
    }
  }
}
const elegirDe = (b, arr) => arr[Math.abs(b.id * 31 + 7) % arr.length];
function crearMallaBicho(b) {
  const g = new THREE.Group(); g.rotation.order = "YXZ";
  const est = estiloDe(b), [fx, fy, fz] = FORMAS[est.f];
  const cuerpo = malla(G.esfera, matHue(b.hue), fx, fy, fz, 0, .95, 0); cuerpo.userData.b = b;
  const o1 = malla(G.ojo, NEGRO, 1, 1.4, 1, -.25, 1.15, .7, false), o2 = malla(G.ojo, NEGRO, 1, 1.4, 1, .25, 1.15, .7, false);
  const b1 = malla(G.ojo, BLANCO, 1.9, 1.9, 1, -.25, 1.15, .66, false), b2 = malla(G.ojo, BLANCO, 1.9, 1.9, 1, .25, 1.15, .66, false); b1.visible = b2.visible = false;
  const boca = malla(G.ojo, NEGRO, 1.4, .5, .5, 0, .86, .74, false);
  const pies = [malla(G.esfera, matPie(b.hue), .55, .3, .65, -.35, .1, .1, false), malla(G.esfera, matPie(b.hue), .55, .3, .65, .35, .1, .1, false)];
  g.add(cuerpo, o1, o2, b1, b2, boca, ...pies);
  const hoja2 = adorno(g, est, b);
  if (est.m) for (const [x, y, z] of [[.5, 1.2, -.45], [-.45, .75, -.55], [.1, 1.45, -.6], [-.62, 1.15, .1]]) g.add(malla(G.esfera, matPie(b.hue), .32, .26, .2, x * fx / 1.6, y, z * fz / 1.5, false));
  if (est.o) for (const s of [-1, 1]) g.add(malla(G.esfera, mat("#FF9AB0"), .25, .14, .08, s * .48, .95, .68, false));
  const gorros = {}; for (const k in GORROS) { const h = GORROS[k](); h.position.y = fy * .5 + .72; h.visible = false; g.add(h); gorros[k] = h; }
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
  const camina = !trabaja && !b.caida && !["quieto", "bajar", "subir", "durmiendo"].includes(b.est);
  const salto = camina ? Math.abs(Math.sin(b.fase)) * .3 : trabaja ? Math.abs(Math.sin(b.fase * 1.5)) * .15 : 0;
  const esc = bebe ? .55 + b.edad / GRANDE * .3 : 1;
  const tiembla = b.susto > 0 ? Math.sin(ahora / 25) * .08 : 0;
  g.position.set(b.x + tiembla, Math.min(0, b.y) + salto + (b.est === "cruzar" ? .1 : 0), b.z);
  g.scale.setScalar(esc);
  g.rotation.y = Math.atan2(b.dx, b.dz);
  g.rotation.x = trabaja ? Math.sin(b.fase * 1.5) * .15 : 0;
  if (b.caida > 0) { const t = 1.8 - b.caida, k = t < .3 ? t / .3 : b.caida < .45 ? b.caida / .45 : 1; g.rotation.x = -1.35 * k; g.position.y = .25 * k; }
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
  for (const b of dentroMundo ? [yo, ...E.bichos] : E.bichos) {
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
const num = (n) => n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "") + "M" : n >= 1e4 ? (n / 1e3 | 0) + "k" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(".0", "") + "k" : String(n);
let metaT;
function verMeta() { $("meta").classList.add("ver"); clearTimeout(metaT); metaT = setTimeout(() => $("meta").classList.remove("ver"), 5000); }
$("anillo").onclick = () => { audio(); if ($("meta").classList.contains("ver")) { $("meta").classList.remove("ver"); clearTimeout(metaT); } else verMeta(); };
$("meta").onclick = () => { $("meta").classList.remove("ver"); clearTimeout(metaT); };
function pintarHUD() {
  const era = ERAS[E.era], sig = ERAS[E.era + 1];
  $("h-era").textContent = era.g;
  $("h-pob").textContent = "👥 " + num(E.bichos.length);
  $("h-poder").textContent = "⚡" + (E.poder || 0);
  { const t = $("poder-txt"), n = E.poder || 0, txt = `⚡ Poder nivel ${n} → nivel ${n + 1} con ${num(pobParaNivel(n + 1))} Brotitos (${mejoraDe(n + 1).t.toLowerCase()})`; if (t.textContent !== txt) t.textContent = txt; }
  $("h-comida").textContent = "🍎 " + num(E.comida); $("h-madera").textContent = "🪵 " + num(E.madera); $("h-piedra").textContent = "🪨 " + num(E.piedra);
  $("h-gemas").hidden = !E.mina && !E.gemas; $("h-gemas").textContent = "💎 " + num(E.gemas);
  $("h-hora").textContent = esNoche() ? "🌙" : "☀️";
  const a = $("h-animo"); a.style.width = E.animo + "%"; a.style.background = E.animo < 30 ? "#FF6F61" : E.animo < 60 ? "#FFB74D" : "#5BBF7A";
  $("h-energia").style.width = E.energia * 10 + "%";
  for (const id of ["d-comida", "d-madera", "d-piedra"]) $(id).disabled = E.energia < 1;
  const m = METAS[E.meta];
  if (m) {
    const antes = E.meta ? METAS[E.meta - 1].pob : 1;
    $("meta-txt").textContent = `🎯 ${E.bichos.length}/${m.pob} Brotitos → ${m.g} ${m.t}`; $("meta-sub").textContent = m.s;
    $("meta-bar").style.width = clamp((E.bichos.length - antes) / (m.pob - antes), 0, 1) * 100 + "%";
    $("anillo").style.setProperty("--p", $("meta-bar").style.width); $("anillo-g").textContent = m.g;
  } else { $("anillo").style.setProperty("--p", "100%"); $("anillo-g").textContent = "🌟"; $("meta-txt").textContent = `🌟 Colonia legendaria: ${E.bichos.length} Brotitos`; $("meta-sub").textContent = `el mundo ya creció ${E.islas.filter((i) => i.colonizada).length - 1} veces`; $("meta-bar").style.width = "100%"; }
  if (sig) { $("era-txt").textContent = `🧠 Sabiduría → ${sig.g} Era de ${sig.n}`; $("era-bar").style.width = clamp((E.sab - era.sab) / (sig.sab - era.sab), 0, 1) * 100 + "%"; $("anillo").style.setProperty("--s", $("era-bar").style.width); }
  else { $("era-txt").textContent = "🧠 ¡Llegaron a la era espacial!"; $("era-bar").style.width = "100%"; $("anillo").style.setProperty("--s", "100%"); }
  { const c = siguienteCat(), t = $("cat-txt");
    const txt = (c ? `🏗️ Próxima construcción: ${c.g} ${c.n} (${E.era < c.era ? "Era de " + ERAS[c.era].n : c.pob + " Brotitos"})` : `🏗️ ¡Catálogo completo! Ahora inventan cosas nuevas`) + (E.inventos ? ` · 💡 ${E.inventos} creaciones propias` : "");
    if (t.textContent !== txt) t.textContent = txt; }
  { const k = "+" + porToque(); for (const t of ["comida", "madera", "piedra"]) { const sp = $("d-" + t).querySelector("small"); if (sp && sp.textContent !== k) sp.textContent = k; } }
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
    if (ev.tipo === "listo" && ev.e.tipo === "cat") { const c = CAT[ev.e.cat]; logro(c.g, `¡Construyeron ${c.n}!`, c.s); festejo(ev.e); continue; }
    if (ev.tipo === "listo" && ev.e.tipo === "inv") { const v = ev.e.inv; logro(v.g, v.ia ? `💡 ¡Inventaron ${v.n}!` : `¡Terminaron ${v.n}!`, v.s); festejo(ev.e); continue; }
    if (ev.tipo === "listo") {
      const nom = { casa: "una casa", huerta: "la huerta", mina: "la mina ⛏️ ¡Ya pueden cavar!", escuela: "la escuela 🏫", torre: "la torre 🗼", biblioteca: "la biblioteca 📚", molino: "el molino 🌾", fabrica: "la fábrica 🏭", central: "la central eléctrica ⚡", base: "la base espacial 🚀", tierra: "tierra nueva 🌱 ¡El mundo creció!" }[ev.e.tipo] || ev.e.tipo;
      aviso(ev.e.tipo === "casa" && ev.e.nivel > 1 ? `🏢 ¡Terminaron el piso ${ev.e.nivel}!` : `🎉 Terminaron ${nom}`); sonido("festejo");
    }
    if (ev.tipo === "obra") aviso("🔨 Empezaron una casa nueva");
    if (ev.tipo === "poder") { logro("⚡", `¡Poder nivel ${ev.n}!`, ev.m.t); continue; }
    if (ev.tipo === "obraInv") aviso(ev.ia ? `💡 ¡Inventaron algo nuevo! ${ev.g} ${ev.n}` : `🏗️ Construyen algo nunca visto: ${ev.g} ${ev.n}`);
    if (ev.tipo === "obraCat" || ev.tipo === "obraInv") muestra("desbloqueo", .45);
    if (ev.tipo === "obraCat") aviso(`🏗️ Empezaron a construir: ${ev.g} ${ev.n}`);
    if (ev.tipo === "piso") aviso("🏗️ Están subiendo un piso");
    if (ev.tipo === "tierra") aviso("🌱 Se quedaron sin lugar: ¡están agrandando el mundo!");
    if (ev.tipo === "nivelMina") aviso(`⛏️ ¡La mina ya tiene ${E.mina.prof} niveles! Más hondo, más gemas`);
    if (ev.tipo === "cohete") { aviso("🚀 ¡Despegó un cohete! Trajo 5 💎"); despegar(); }
  }
  eventos = [];
  const n = esNoche();
  if (eraNoche !== null && n !== eraNoche) aviso(n ? (E.era >= 3 ? "🌙 De noche: la mitad sigue trabajando con luz ⚡" : "🌙 Se hizo de noche: a dormir") : "☀️ ¡Buen día! A trabajar");
  eraNoche = n;
}

// ======================= Entrar al mundo: vos como un Brotito más =======================
const yo = { id: -1, n: "Vos", x: 0, z: 0, y: 0, dx: 0, dz: 1, edad: 999, hue: 48, fase: 0, est: "quieto", susto: 0, carga: null, cant: 0, oficio: null, adentro: false, isla: null, alto: 0, vy: 0, golpe: 0 };
let dentroMundo = false, accion = null, accionT = 0, avisoCarga = 0;
const joy = { x: 0, y: 0, id: null }, teclas = {};
const ORBITA_AFUERA = { touches: controles.touches, mouse: controles.mouseButtons, min: controles.minDistance, max: controles.maxDistance };
function tierraEn(x, z) {
  for (const i of E.islas) if (i.colonizada && Math.abs(i.x - x) < RH + 1 && Math.abs(i.z - z) < RH + 1 && enHex(x - i.x, z - i.z, 1.2)) return i;
  return null;
}
function entrar() {
  audio();
  const t = controles.target, cap = E.islas.find((i) => i.capital);
  const isla = tierraEn(t.x, t.z);
  if (isla) { yo.x = t.x; yo.z = t.z; } else { yo.x = cap.x + 3; yo.z = cap.z + 3; }
  yo.isla = (tierraEn(yo.x, yo.z) || cap).id; yo.alto = 0; yo.vy = 0; yo.carga = null; yo.cant = 0;
  if (!yo._m) {
    crearMallaBicho(yo);
    const i = cuerpos.indexOf(yo._m.cuerpo); if (i >= 0) cuerpos.splice(i, 1); // a vos no te podés aplastar
    const oro = mat("#FFD43B"), c = new THREE.Group();
    c.add(malla(G.cil, oro, .95, .28, .95, 0, 0, 0, false));
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; c.add(malla(G.cono, oro, .2, .35, .2, Math.sin(a) * .42, .3, Math.cos(a) * .42, false)); }
    c.add(malla(G.esfera, mat("#FF4F79"), .18, .18, .18, 0, .05, .48, false));
    c.position.y = 1.78; yo._m.g.add(c);
  }
  yo._m.g.visible = true;
  dentroMundo = true; document.body.classList.add("dentro");
  controles.enablePan = false;
  controles.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controles.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controles.minDistance = 5; controles.maxDistance = 34;
  controles.maxPolarAngle = 1.05; controles.target.set(yo.x, 0, yo.z); { const k = camara.aspect < 1 ? 1.6 : 1; camara.position.set(yo.x, 11 * k, yo.z + 8 * k); }
  syncT = 1;
  aviso("👑 ¡Entraste! Sos el Brotito dorado");
  for (const b of E.bichos) if (b._m && !b.adentro && dist(b, yo) < 8 && b.susto <= 0 && Math.random() < .6) hablar(b, elegir(["¿¿" + balbuceo(1) + "??", "¡oh!", "😮", "¡" + balbuceo(1) + "!"]));
}
// pasos del rey: uno por cada pisada, al ritmo de la caminata
let ultimoPie = 0;
function pasos(on) {
  if (!on) return;
  const pie = Math.floor(yo.fase / Math.PI);
  if (pie !== ultimoPie) { ultimoPie = pie; muestra("pasos", .5, rnd(.9, 1.1)); }
}
function salir() {
  dentroMundo = false; document.body.classList.remove("dentro");
  if (yo._m) yo._m.g.visible = false;
  if (yo.carga) { E[yo.carga] += yo.cant; yo.carga = null; yo.cant = 0; }
  controles.enablePan = true; controles.touches = ORBITA_AFUERA.touches; controles.mouseButtons = ORBITA_AFUERA.mouse;
  controles.minDistance = ORBITA_AFUERA.min; controles.maxDistance = ORBITA_AFUERA.max; controles.maxPolarAngle = 1.32;
  const dir = camara.position.clone().sub(controles.target).normalize();
  camara.position.copy(controles.target).add(dir.multiplyScalar(32));
}
function sumarPedido(tipo, k) {
  if (!E.pedido || E.pedido.tipo !== tipo) return;
  E.pedido.dado += k;
  if (E.pedido.dado >= E.pedido.cant) {
    E.pedido = null; E.proxPedido = rnd(35, 70); E.animo = clamp(E.animo + 20, 0, 100);
    for (const b of E.bichos) if (!b.adentro && activas.has(b.isla) && Math.random() < .5) hablar(b, elegir(["¡yei!", "¡bu bu!", "¡riii!", "💚"]), false);
    festejo(yo); aviso("¡Pedido cumplido! Están felices 💚"); sonido("festejo");
  }
}
const cercaDeMi = (lista, max) => { let m = null, d = max; for (const o of lista) { const dd = Math.hypot(o.x - yo.x, o.z - yo.z); if (dd < d) { d = dd; m = o; } } return m; };
function elegirAccion() {
  // ¿hay una obra cerca? ayudar
  const obra = cercaDeMi(E.edificios.concat(E.puentes).filter((o) => !listo(o)), 5.5);
  if (obra) return { tipo: "ayudar", o: obra, txt: "🔨 Ayudar" };
  const objs = E.recursos.filter((r) => r.cant > 0).concat(E.edificios.filter((e) => e.tipo === "huerta" && listo(e) && e.cant > 0));
  const r = cercaDeMi(objs, 3.6);
  if (r) {
    const tipo = TIPO_RECURSO[r.tipo];
    if (!yo.carga || (yo.carga === tipo && yo.cant < 6)) return { tipo: "juntar", o: r, txt: "✋ Juntar " + ICONO[tipo] };
    return { tipo: "lleno", txt: yo.carga === tipo ? "🎒 Lleno: llevalo a una casa" : "🎒 Primero llevá lo que tenés" };
  }
  if (yo.carga) return { tipo: "lleno", txt: `🏠 Llevá ${yo.cant} ${ICONO[yo.carga]} a una casa` };
  return null;
}
function hacer() {
  audio();
  const a = accion; if (!a || yo.golpe > 0) return;
  if (a.tipo === "ayudar") {
    yo.golpe = .28; avanzarObra(a.o, .035, false); sonido("dar");
    yo.dx = a.o.x - yo.x; yo.dz = a.o.z - yo.z;
    if (Math.random() < .25) { const b = cercaDeMi(E.bichos.filter((x) => x.est === "construir" && x.obj === a.o.id), 8); if (b) hablar(b, elegir(["¡bu bu!", "¡" + balbuceo(1) + "!", "💪"])); }
  } else if (a.tipo === "juntar") {
    yo.golpe = .28; a.o.cant--; yo.carga = TIPO_RECURSO[a.o.tipo]; yo.cant++; sonido("dar");
    yo.dx = a.o.x - yo.x; yo.dz = a.o.z - yo.z;
    if (yo.cant === 1 && avisoCarga++ < 2) aviso("Juntá varios y llevalos a una casa 🏠");
  }
  accionT = 0;
}
function saludar() {
  audio();
  const cerca = E.bichos.filter((b) => b._m && !b.adentro && b.y === 0 && dist(b, yo) < 6).slice(0, 5);
  hablar(yo, "¡" + balbuceo(1) + "!", true);
  if (!cerca.length) { aviso("No hay nadie cerca para saludar"); return; }
  for (const b of cerca) {
    if (b.susto > 0) { hablar(b, elegir(["😨", "¡no no!"])); continue; }
    b.dx = yo.x - b.x; b.dz = yo.z - b.z; b.est = "quieto"; b.quieto = rnd(1.5, 3);
    setTimeout(() => { hablar(b, elegir(["¡" + balbuceo(1) + "!", "¡" + balbuceo(2) + "!", "💚", "¡bu!"])); corazones(b); }, rnd(100, 600));
  }
  E.animo = clamp(E.animo + 1, 0, 100);
}
function saltar() { audio(); if (yo.alto > 0 || yo.vy !== 0) return; yo.vy = 10; }
// ---- choques: el rey no atraviesa nada ----
const RADIO_EDIF = { casa: 1.9, fogata: 1, huerta: 2.6, mina: 1.5, escuela: 2.6, biblioteca: 2.8, torre: 1.5, molino: 1.6, fabrica: 2.6, central: 2.7, base: 2.8, cohete: 1.5 };
const RADIO_TECHO = { pozo: 1.3, fuente: 3.3, cantera: 2.3, totem: .8, mercado: 3.3, puerto: 3.4, estadio: 3.7, parque: 2, aeropuerto: 3.8, antenota: 1, portal: 2.2, domo: 3.5, ascensor: 1.9 };
function radioDe(o) {
  if (o.tipo === "cat" || o.tipo === "inv") { const r = o.tipo === "cat" ? CAT[o.cat].r : o.inv.r; return RADIO_TECHO[r.techo] || Math.max(r.w || 4, r.d || r.w || 4) / 2 + .1; }
  if (o.tipo === "arbol") return .7; if (o.tipo === "roca") return .8; if (o.tipo === "arbusto") return .6;
  return RADIO_EDIF[o.tipo] || 1.6;
}
let obstaculos = [], obsT = 1;
function choca(x, z) {
  for (const o of obstaculos) { const r = o.r + .55; if ((o.x - x) ** 2 + (o.z - z) ** 2 < r * r) return true; }
  return false;
}
function chocarBichos(mx, mz) {
  for (const b of E.bichos) {
    if (b.adentro || b.y !== 0) continue;
    const dx = b.x - yo.x, dz = b.z - yo.z, d2 = dx * dx + dz * dz;
    if (d2 > 1.7 * 1.7) continue;
    const d = Math.sqrt(d2) || .01;
    // lo empujás solo si vas hacia él
    if (!(b.caida > 0) && (dx * mx + dz * mz) / d > .3) {
      b.caida = 1.8; b.kx = dx / d; b.kz = dz / d; b.dx = -b.kx; b.dz = -b.kz; b.carga = null; b.adentro = false;
      if (Math.random() < .7) setTimeout(() => hablar(b, elegir(["¡ay!", "¡ayyy!", "¡uy!", "😵"]), true), 80);
      if (!muestra("rebotar", .9, rnd(.95, 1.1))) sonido("ay", b);
      for (const o of E.bichos) if (o !== b && !o.adentro && o.y === 0 && !o.caida && dist(o, b) < 6) { o.susto = rnd(2, 4); const dd = dist(o, yo) || 1; o.dx = (o.x - yo.x) / dd; o.dz = (o.z - yo.z) / dd; }
      E.animo = clamp(E.animo - .5, 0, 100);
    }
    // y no lo atravesás
    const empuje = 1.7 - d; yo.x -= dx / d * empuje; yo.z -= dz / d * empuje;
  }
}
function actualizarYo(dt, ahora) {
  if (!dentroMundo) return;
  // mover
  let jx = joy.x, jy = joy.y;
  if (teclas.KeyA || teclas.ArrowLeft) jx -= 1; if (teclas.KeyD || teclas.ArrowRight) jx += 1;
  if (teclas.KeyW || teclas.ArrowUp) jy += 1; if (teclas.KeyS || teclas.ArrowDown) jy -= 1;
  const largo = Math.hypot(jx, jy); if (largo > 1) { jx /= largo; jy /= largo; }
  const fx = controles.target.x - camara.position.x, fz = controles.target.z - camara.position.z, fl = Math.hypot(fx, fz) || 1;
  const ux = fx / fl, uz = fz / fl;
  const mx = ux * jy - uz * jx, mz = uz * jy + ux * jx;
  const moviendo = Math.hypot(mx, mz) > .1, vel = 6.5 * Math.min(1, Math.hypot(mx, mz));
  obsT += dt;
  if (obsT > .25) { // lo que está cerca y no se puede atravesar
    obsT = 0;
    obstaculos = [];
    for (const o of E.edificios) { const r = radioDe(o); if (Math.abs(o.x - yo.x) < r + 10 && Math.abs(o.z - yo.z) < r + 10) obstaculos.push({ x: o.x, z: o.z, r }); }
    for (const o of E.recursos) if (Math.abs(o.x - yo.x) < 8 && Math.abs(o.z - yo.z) < 8) obstaculos.push({ x: o.x, z: o.z, r: radioDe(o) });
  }
  if (moviendo) {
    const nx = yo.x + mx / Math.hypot(mx, mz) * vel * dt, nz = yo.z + mz / Math.hypot(mx, mz) * vel * dt;
    const libre = (x, z) => tierraEn(x, z) && (yo.alto > 2.5 || !choca(x, z));
    if (choca(yo.x, yo.z)) { yo.x = nx; yo.z = nz; } // si quedaste encima de algo, dejarte salir
    else if (libre(nx, nz)) { yo.x = nx; yo.z = nz; } else if (libre(nx, yo.z)) yo.x = nx; else if (libre(yo.x, nz)) yo.z = nz;
    if (yo.alto < 1) chocarBichos(mx, mz);
    yo.dx += (mx - yo.dx) * Math.min(1, dt * 12); yo.dz += (mz - yo.dz) * Math.min(1, dt * 12);
    yo.fase += dt * 12;
  }
  const t = tierraEn(yo.x, yo.z); if (t) yo.isla = t.id;
  pasos(moviendo && yo.alto === 0, vel);
  // saltar y caer encima de alguno
  if (yo.vy !== 0 || yo.alto > 0) {
    yo.vy -= 28 * dt; yo.alto += yo.vy * dt;
    if (yo.alto <= 0) {
      yo.alto = 0; yo.vy = 0;
      const abajo = E.bichos.filter((b) => !b.adentro && b.y === 0 && dist(b, yo) < 1.4);
      for (const b of abajo) explotar(b);
      if (!abajo.length) onda(yo);
    }
  }
  if (yo.golpe > 0) { yo.golpe -= dt; yo.fase += dt * 10; }
  yo.est = yo.golpe > 0 ? "juntar" : moviendo ? "pasear" : "quieto";
  if (yo.charlaT > 0) yo.charlaT -= dt;
  // dejar lo que llevo si paso por una casa
  if (yo.carga) {
    const casa = cercaDeMi(todosAlmacenes(), 3.8);
    if (casa) {
      sumar(yo.carga, yo.cant * bono(yo.carga)); aviso(`+${yo.cant} ${ICONO[yo.carga]} ¡Gracias! 💚`); sonido("dar");
      sumarPedido(yo.carga, yo.cant);
      const b = cercaDeMi(E.bichos.filter((x) => !x.adentro && x.y === 0), 7); if (b) { hablar(b, "¡" + ICONO[yo.carga] + "!"); corazones(b); }
      E.animo = clamp(E.animo + 1, 0, 100); yo.carga = null; yo.cant = 0; accionT = 1;
    }
  }
  // botón que cambia según lo que tenés cerca
  accionT += dt;
  if (accionT > .15) {
    accionT = 0; accion = elegirAccion();
    const bt = $("a-hacer");
    bt.style.visibility = accion ? "visible" : "hidden";
    if (accion) { if (bt.textContent !== accion.txt) bt.textContent = accion.txt; bt.disabled = accion.tipo === "lleno"; }
  }
  // dibujo
  actualizarMallaBicho(yo, ahora);
  yo._m.g.position.y += yo.alto;
  // la cámara te sigue
  const ddx = yo.x - controles.target.x, ddz = yo.z - controles.target.z;
  controles.target.x += ddx; controles.target.z += ddz; camara.position.x += ddx; camara.position.z += ddz;
}
$("d-entrar").onclick = entrar;
$("b-salir").onclick = salir;
$("a-hacer").onclick = hacer;
$("a-saludar").onclick = saludar;
$("a-saltar").onclick = saltar;
{
  const pad = $("joy"), palo = pad.querySelector("i");
  const mover = (e) => {
    const r = pad.getBoundingClientRect(), R = r.width / 2;
    let x = (e.clientX - r.left - R) / (R * .7), y = -(e.clientY - r.top - R) / (R * .7);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    joy.x = x; joy.y = y; palo.style.transform = `translate(${x * R * .55}px, ${-y * R * .55}px)`;
  };
  const soltar = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; palo.style.transform = ""; };
  pad.addEventListener("pointerdown", (e) => { audio(); joy.id = e.pointerId; pad.setPointerCapture(e.pointerId); mover(e); e.preventDefault(); });
  pad.addEventListener("pointermove", (e) => { if (e.pointerId === joy.id) mover(e); });
  pad.addEventListener("pointerup", soltar); pad.addEventListener("pointercancel", soltar);
}
addEventListener("keydown", (e) => {
  if (!dentroMundo) return;
  teclas[e.code] = true;
  if (e.code === "Space") { saltar(); e.preventDefault(); }
  if (e.code === "KeyE") hacer();
  if (e.code === "KeyQ") saludar();
  if (e.code === "Escape") salir();
});
addEventListener("keyup", (e) => { teclas[e.code] = false; });

// ======================= Arranque =======================
E = cargar();
const primeraVez = !E;
if (!E) nuevoEstado();
calcularBonos();
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
    if (islasN > 0) partes.push(`agrandaron el mundo <b>${islasN}</b> ${islasN === 1 ? "vez" : "veces"} 🌱`);
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
    if (u.cabina) u.cabina.position.y = 2 + (Math.sin(ahora / 2500) + 1) * 9.5;
    if (u.bandera) u.bandera.rotation.y = Math.sin(ahora / 400) * .3;
    if (u.humo && tocaHumo && Math.random() < .5) { const hs = Array.isArray(u.humo) ? u.humo : [u.humo]; for (const h of hs) { vtmp.set(h.x, h.y, h.z).applyMatrix4(m.g.matrixWorld); if (vtmp.distanceTo(camara.position) < 120) humo(vtmp.x, vtmp.y, vtmp.z); } }
  }
  for (const b of E.bichos) actualizarMallaBicho(b, ahora);
  actualizarYo(dt, ahora);
  actualizarParticulas(dt); actualizarRestos(dt); actualizarVuelo(dt);
  controles.target.y = 0;
  controles.update();
  render.render(escena, camara);
  actualizarGlobos();
}
function bucle(ahora) {
  const dt = Math.min(.05, (ahora - ultimo) / 1000); ultimo = ahora;
  paso(dt, false);
  // cada 15 minutos de juego, si son bastantes, piensan un invento con IA
  E.iaT = (E.iaT ?? 600) + dt;
  if (E.iaT > 900 && E.bichos.length >= 40 && (E.colaInv || []).length < 2 && navigator.onLine !== false) { E.iaT = 0; pedirInvento(); }
  dibujarTodo(ahora, dt);
  hudT += dt; if (hudT > .2) { hudT = 0; pintarHUD(); mostrarEventos(); }
  guardarT += dt; if (guardarT > 5) { guardarT = 0; guardar(); }
  requestAnimationFrame(bucle);
}
document.addEventListener("visibilitychange", () => { if (document.hidden) guardar(); });
addEventListener("pagehide", guardar);
window.__col = { get E() { return E; }, inventar, pedirInvento, yo, entrar, salir, hacer, saludar, saltar, joy, paso, explotar, camara, controles, verTodo, dibujarTodo, sincronizar, limpiarEventos: () => { eventos = []; }, capacidad, casas, setActivas: (s) => { activas = s; } };
requestAnimationFrame(bucle);
