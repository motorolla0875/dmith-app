/* Motor de reservas de paquetes para los ejemplos de agencias de viajes.
   Cada web define sus colores con variables CSS (--vm-*) y llama:
     VM.iniciar({ buscador: "#id", resultados: "#id", paquetes: [...], prefijo: "BV", nombre: "Brújula Viajes" })
   Las reservas de la muestra se guardan en el navegador (localStorage "reservas-<slug>") y el panel de muestra las lee. */
window.VM = (function () {
  var slug = location.pathname.split("/").filter(Boolean).pop() || "";
  var KEY = "reservas-" + slug;
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var cfg, paquetes = [], filtro = { dest: "", mes: "", pax: 2 };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fecha(s) { var m = String(s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
  function corta(d) { return d.getDate() + "/" + (d.getMonth() + 1); }
  function larga(d) { return d.getDate() + " de " + MESES[d.getMonth()]; }
  function plata(n, mon) { return (mon || "$") + " " + Math.round(n || 0).toLocaleString("es-AR"); }
  function leer() { try { return JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { return []; } }
  function guardar(l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} }
  function ocupados(p, s) { return leer().filter(function (r) { return r.paquete === p.n && r.salida === s && r.estado !== "Cancelada"; }).reduce(function (a, r) { return a + (+r.pax || 0); }, 0); }
  function quedan(p, s) { return Math.max(0, (+p.cupos || 0) - ocupados(p, s)); }
  function futuras(p) { var hoy = new Date(); hoy.setHours(0, 0, 0, 0); return (p.salidas || []).filter(function (s) { var d = fecha(s); return d && d >= hoy; }).sort(function (a, b) { return fecha(a) - fecha(b); }); }
  function wa(t) { return "https://wa.me/?text=" + encodeURIComponent(t); }

  var ICO = {
    ok: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cerrar: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    wa: '<svg viewBox="0 0 32 32" width="19" height="19"><path fill="currentColor" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3Zm0 23.4c-2.1 0-4.1-.6-5.9-1.7l-.4-.3-3.8 1.2 1.2-3.7-.3-.4a10.6 10.6 0 0 1-1.7-5.7C5.1 10 10 5.2 16 5.2S26.9 10 26.9 15.9 22 26.4 16 26.4Zm6-7.8c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.9 5.1 2.2.9 3 1 4.1.8.7-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z"/></svg>'
  };

  var CSS = '\
.vm-busca{display:grid;grid-template-columns:1.4fr 1fr .8fr auto;gap:10px;align-items:end;background:var(--vm-caja,#fff);color:var(--vm-tinta);border-radius:var(--vm-radio,18px);padding:16px;box-shadow:0 20px 50px rgba(0,0,0,.18)}\
.vm-busca label{display:grid;gap:5px;font-size:13.5px;font-weight:700;color:var(--vm-suave);min-width:0}\
.vm-busca select{width:100%;min-width:0;border:1.5px solid var(--vm-linea);border-radius:12px;padding:12px;font-family:inherit;font-size:16px;font-weight:600;color:var(--vm-tinta);background:var(--vm-campo,#F4F6F9)}\
.vm-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:12px;padding:14px 22px;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;background:var(--vm-acento);color:var(--vm-acento-txt,#fff);text-decoration:none;white-space:nowrap}\
.vm-btn.sec{background:transparent;color:var(--vm-tinta);border:2px solid var(--vm-linea)}\
.vm-btn:disabled{opacity:.5;cursor:default}\
@media(max-width:820px){.vm-busca{grid-template-columns:1fr 1fr}.vm-busca .vm-btn{grid-column:1/-1}}\
@media(max-width:420px){.vm-busca{grid-template-columns:1fr}}\
.vm-res-cab{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;font-size:16px;color:var(--vm-suave)}\
.vm-res-cab b{color:var(--vm-tinta)}\
.vm-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:18px}\
.vm-card{background:var(--vm-caja,#fff);border-radius:var(--vm-radio,18px);overflow:hidden;display:flex;flex-direction:column;border:1px solid var(--vm-linea);color:var(--vm-tinta);min-width:0}\
.vm-card .vm-foto{position:relative;aspect-ratio:16/10;background:var(--vm-campo,#E8EDF3)}\
.vm-card .vm-foto img{width:100%;height:100%;object-fit:cover;display:block}\
.vm-card .vm-cod{position:absolute;right:12px;top:12px;background:var(--vm-acento);color:var(--vm-acento-txt,#fff);font-weight:900;border-radius:10px;padding:6px 10px;font-size:15px;letter-spacing:.04em}\
.vm-card .vm-zona{position:absolute;left:12px;top:12px;background:rgba(255,255,255,.95);color:#12263A;font-weight:700;border-radius:999px;padding:5px 11px;font-size:13px}\
.vm-card .vm-cuerpo{padding:16px 18px 18px;display:flex;flex-direction:column;gap:10px;flex:1}\
.vm-card h3{font-size:24px;margin:0;line-height:1.1}\
.vm-card .vm-noches{font-size:15px;color:var(--vm-suave);font-weight:600}\
.vm-inc{list-style:none;margin:0;padding:0;display:grid;gap:4px;font-size:15px}\
.vm-inc li{display:flex;gap:7px;align-items:flex-start}\
.vm-inc li svg{flex:none;margin-top:3px;color:var(--vm-ok,#1E9E6A)}\
.vm-sal{display:flex;flex-wrap:wrap;gap:6px}\
.vm-sal span{font-size:13.5px;font-weight:700;border-radius:9px;padding:5px 9px;background:var(--vm-campo,#EEF2F7);color:var(--vm-tinta)}\
.vm-sal span.poco{background:#FFF1D6;color:#8A5300}\
.vm-sal span.no{text-decoration:line-through;opacity:.55}\
.vm-pie{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:auto;border-top:1px solid var(--vm-linea);padding-top:12px}\
.vm-pie small{display:block;font-size:13px;color:var(--vm-suave)}\
.vm-pie b{font-size:23px;line-height:1.1}\
.vm-pie .vm-btn{padding:12px 16px;font-size:15px}\
.vm-vacio{background:var(--vm-caja,#fff);border-radius:var(--vm-radio,18px);padding:28px;text-align:center;border:1px dashed var(--vm-linea);color:var(--vm-tinta)}\
.vm-vacio p{color:var(--vm-suave);margin:8px 0 16px}\
.vm-modal{position:fixed;inset:0;z-index:2147482000;background:rgba(8,16,30,.6);display:flex;align-items:flex-end;justify-content:center;padding:0}\
.vm-hoja{background:#fff;color:#12263A;width:min(560px,100%);max-height:92vh;overflow:auto;border-radius:22px 22px 0 0;padding:20px max(18px,env(safe-area-inset-right)) calc(20px + env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));font-family:inherit}\
@media(min-width:700px){.vm-modal{align-items:center}.vm-hoja{border-radius:22px;padding:24px}}\
.vm-hoja .vm-top{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}\
.vm-hoja .vm-top div{flex:1;min-width:0}\
.vm-hoja h3{margin:0;font-size:24px;line-height:1.15;color:#12263A}\
.vm-hoja .vm-top small{color:#5A6A7B;font-size:14.5px}\
.vm-x{border:0;background:#EEF2F7;color:#12263A;border-radius:50%;width:40px;height:40px;display:grid;place-items:center;cursor:pointer;flex:none}\
.vm-pasos{display:flex;gap:6px;margin-bottom:16px}\
.vm-pasos i{flex:1;height:5px;border-radius:3px;background:#E3E8EE}\
.vm-pasos i.on{background:var(--vm-acento)}\
.vm-h4{font-weight:800;font-size:16px;margin:16px 0 8px;color:#12263A}\
.vm-opc{display:grid;gap:8px}\
.vm-opc label{display:flex;align-items:center;gap:10px;border:2px solid #E3E8EE;border-radius:14px;padding:12px 14px;cursor:pointer;color:#12263A}\
.vm-opc label:has(input:checked){border-color:var(--vm-acento);background:var(--vm-suave-bg,#F3F7FF)}\
.vm-opc label.no{opacity:.5;cursor:not-allowed}\
.vm-opc input{accent-color:var(--vm-acento);width:18px;height:18px}\
.vm-opc .t{flex:1;min-width:0}\
.vm-opc .t b{display:block;font-size:16px}\
.vm-opc .t small{color:#5A6A7B;font-size:14px}\
.vm-opc .q{font-size:13.5px;font-weight:700;color:#1E7A52;white-space:nowrap}\
.vm-opc .q.poco{color:#A85C00}\
.vm-cant{display:flex;align-items:center;gap:12px}\
.vm-cant button{width:44px;height:44px;border-radius:12px;border:2px solid #E3E8EE;background:#fff;font-size:22px;font-weight:700;cursor:pointer;color:#12263A}\
.vm-cant b{font-size:20px;min-width:90px;text-align:center}\
.vm-campos{display:grid;gap:10px}\
.vm-campos label{display:grid;gap:5px;font-size:14px;font-weight:700;color:#5A6A7B}\
.vm-campos input,.vm-campos select{width:100%;border:1.5px solid #D9E0E8;border-radius:12px;padding:12px;font-family:inherit;font-size:16px;font-weight:500;color:#12263A;background:#F7F9FB}\
.vm-total{display:flex;justify-content:space-between;align-items:flex-end;background:#F4F7FA;border-radius:14px;padding:14px 16px;margin-top:16px;color:#12263A}\
.vm-total small{display:block;color:#5A6A7B;font-size:13.5px}\
.vm-total b{font-size:26px}\
.vm-acc{display:grid;gap:8px;margin-top:16px}\
.vm-acc .vm-btn{width:100%}\
.vm-resumen{display:grid;gap:6px;background:#F4F7FA;border-radius:14px;padding:14px 16px;font-size:15px;color:#12263A}\
.vm-resumen div{display:flex;justify-content:space-between;gap:12px}\
.vm-resumen span{color:#5A6A7B}\
.vm-codigo{text-align:center;padding:10px 0 4px}\
.vm-codigo .vm-ok{width:64px;height:64px;border-radius:50%;background:#E3F6EC;color:#1E9E6A;display:grid;place-items:center;margin:0 auto 10px}\
.vm-codigo .vm-ok svg{width:32px;height:32px}\
.vm-codigo b{display:block;font-size:30px;letter-spacing:.06em;color:#12263A}\
.vm-nota{font-size:13.5px;color:#5A6A7B;background:#FFF8E6;border-radius:12px;padding:10px 12px;margin-top:10px}\
.vm-err{color:#C0392B;font-size:14px;min-height:1em;margin:6px 0 0}';

  function estilo() { if (document.getElementById("vm-css")) return; var s = document.createElement("style"); s.id = "vm-css"; s.textContent = CSS; document.head.appendChild(s); }

  // ---------- buscador ----------
  function pintarBuscador() {
    var box = document.querySelector(cfg.buscador); if (!box) return;
    var dests = []; paquetes.forEach(function (p) { if (p.n && dests.indexOf(p.n) < 0) dests.push(p.n); });
    var meses = [];
    paquetes.forEach(function (p) { futuras(p).forEach(function (s) { var d = fecha(s), k = d.getFullYear() + "-" + d.getMonth(); if (meses.indexOf(k) < 0) meses.push(k); }); });
    meses.sort(function (a, b) { var x = a.split("-"), y = b.split("-"); return (x[0] - y[0]) || (x[1] - y[1]); });
    box.innerHTML = '<form class="vm-busca" aria-label="Buscar paquetes">' +
      '<label>Destino<select name="dest"><option value="">Todos los destinos</option>' + dests.map(function (d) { return '<option' + (filtro.dest === d ? " selected" : "") + ">" + esc(d) + "</option>"; }).join("") + "</select></label>" +
      '<label>Mes de salida<select name="mes"><option value="">Cualquier mes</option>' + meses.map(function (k) { var x = k.split("-"); return '<option value="' + k + '"' + (filtro.mes === k ? " selected" : "") + ">" + MESES[+x[1]][0].toUpperCase() + MESES[+x[1]].slice(1) + " " + x[0] + "</option>"; }).join("") + "</select></label>" +
      '<label>Viajan<select name="pax">' + [1, 2, 3, 4, 5, 6].map(function (n) { return '<option value="' + n + '"' + (filtro.pax === n ? " selected" : "") + ">" + n + (n === 1 ? " persona" : " personas") + "</option>"; }).join("") + "</select></label>" +
      '<button class="vm-btn" type="submit">Buscar viajes</button></form>';
    box.querySelector("form").onsubmit = function (e) {
      e.preventDefault(); var f = e.target;
      filtro = { dest: f.dest.value, mes: f.mes.value, pax: +f.pax.value };
      pintarResultados();
      var r = document.querySelector(cfg.resultados); if (r) r.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }

  // ---------- resultados ----------
  function salidasDe(p) {
    return futuras(p).filter(function (s) { if (!filtro.mes) return true; var d = fecha(s); return d.getFullYear() + "-" + d.getMonth() === filtro.mes; });
  }
  function pintarResultados() {
    var box = document.querySelector(cfg.resultados); if (!box) return;
    var lista = paquetes.filter(function (p) { return p.n && (!filtro.dest || p.n === filtro.dest) && salidasDe(p).some(function (s) { return quedan(p, s) >= filtro.pax; }); });
    var cab = '<div class="vm-res-cab"><span><b>' + lista.length + (lista.length === 1 ? " paquete" : " paquetes") + "</b> con lugar para " + filtro.pax + (filtro.pax === 1 ? " persona" : " personas") + (filtro.dest ? " a " + esc(filtro.dest) : "") + "</span>" +
      (filtro.dest || filtro.mes ? '<button type="button" class="vm-btn sec" data-limpiar>Ver todos</button>' : "") + "</div>";
    if (!lista.length) {
      box.innerHTML = cab + '<div class="vm-vacio"><b>No hay salidas con lugar para esa búsqueda</b><p>Probá con otro mes o escribinos y te armamos el viaje a medida.</p><a class="vm-btn" target="_blank" rel="noopener" href="' + wa("Hola! Busco un viaje" + (filtro.dest ? " a " + filtro.dest : "") + " para " + filtro.pax + " personas. ¿Qué opciones tienen?") + '">' + ICO.wa + "Pedir viaje a medida</a></div>";
    } else {
      box.innerHTML = cab + '<div class="vm-lista">' + lista.map(function (p) {
        var sal = salidasDe(p).slice(0, 4);
        return '<article class="vm-card"><div class="vm-foto"><img src="' + esc(DEMO.img(p.img, 800)) + '" alt="' + esc(p.n) + '" loading="lazy">' +
          (p.z ? '<span class="vm-zona">' + esc(p.z) + "</span>" : "") + (p.cod ? '<span class="vm-cod">' + esc(p.cod) + "</span>" : "") + "</div>" +
          '<div class="vm-cuerpo"><div><h3>' + esc(p.n) + '</h3><span class="vm-noches">' + esc(p.noches) + " noches</span></div>" +
          '<ul class="vm-inc">' + (p.incluye || []).slice(0, 4).map(function (i) { return "<li>" + ICO.ok + "<span>" + esc(i) + "</span></li>"; }).join("") + "</ul>" +
          '<div class="vm-sal" aria-label="Próximas salidas">' + sal.map(function (s) { var q = quedan(p, s); return '<span class="' + (q < filtro.pax ? "no" : q <= 4 ? "poco" : "") + '">' + corta(fecha(s)) + (q < filtro.pax ? " agotado" : q <= 4 ? " · quedan " + q : "") + "</span>"; }).join("") + "</div>" +
          '<div class="vm-pie"><div><small>Por persona desde</small><b>' + plata(p.p, p.moneda) + '</b></div><button type="button" class="vm-btn" data-p="' + esc(p.n) + '">Ver salidas</button></div></div></article>';
      }).join("") + "</div>";
    }
    var l = box.querySelector("[data-limpiar]"); if (l) l.onclick = function () { filtro = { dest: "", mes: "", pax: filtro.pax }; pintarBuscador(); pintarResultados(); };
    box.querySelectorAll("[data-p]").forEach(function (b) { b.onclick = function () { abrir(paquetes.filter(function (p) { return p.n === b.dataset.p; })[0]); }; });
  }

  // ---------- reserva en 3 pasos ----------
  function abrir(p) {
    var r = { salida: null, pax: filtro.pax, hab: "Doble", nombre: "", tel: "", email: "" };
    var primera = salidasDe(p).concat(futuras(p)).filter(function (s) { return quedan(p, s) >= r.pax; })[0];
    r.salida = primera || null;
    var modal = document.createElement("div"); modal.className = "vm-modal"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
    var hoja = document.createElement("div"); hoja.className = "vm-hoja"; modal.appendChild(hoja);
    document.body.appendChild(modal); document.documentElement.style.overflow = "hidden";
    function cerrar() { modal.remove(); document.documentElement.style.overflow = ""; pintarResultados(); }
    modal.addEventListener("click", function (e) { if (e.target === modal) cerrar(); });
    document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { cerrar(); document.removeEventListener("keydown", k); } });
    function total() { var t = (+p.p || 0) * r.pax; if (r.hab === "Single") t *= 1.3; return t; }
    function cab(paso) {
      return '<div class="vm-top"><div><h3>' + esc(p.n) + "</h3><small>" + esc(p.noches) + " noches · " + plata(p.p, p.moneda) + ' por persona</small></div><button class="vm-x" type="button" aria-label="Cerrar">' + ICO.cerrar + "</button></div>" +
        '<div class="vm-pasos" aria-hidden="true"><i class="on"></i><i class="' + (paso > 1 ? "on" : "") + '"></i><i class="' + (paso > 2 ? "on" : "") + '"></i></div>';
    }
    function rango(s) { var d = fecha(s), v = new Date(d); v.setDate(v.getDate() + (+p.noches || 0)); return larga(d) + " al " + larga(v); }

    function paso1() {
      var sal = futuras(p);
      hoja.innerHTML = cab(1) +
        '<div class="vm-h4">Elegí la fecha de salida</div><div class="vm-opc">' + (sal.length ? sal.map(function (s) {
          var q = quedan(p, s), no = q < r.pax;
          return '<label class="' + (no ? "no" : "") + '"><input type="radio" name="sal" value="' + esc(s) + '"' + (r.salida === s ? " checked" : "") + (no ? " disabled" : "") + '><span class="t"><b>' + rango(s) + "</b><small>" + esc(p.noches) + ' noches</small></span><span class="q' + (q <= 4 ? " poco" : "") + '">' + (no ? (q ? "Quedan " + q : "Agotado") : "Quedan " + q) + "</span></label>";
        }).join("") : "<p>No hay salidas cargadas.</p>") + "</div>" +
        '<div class="vm-h4">¿Cuántos viajan?</div><div class="vm-cant"><button type="button" data-m="-1" aria-label="Uno menos">−</button><b>' + r.pax + (r.pax === 1 ? " persona" : " personas") + '</b><button type="button" data-m="1" aria-label="Uno más">+</button></div>' +
        '<div class="vm-h4">Habitación</div><div class="vm-opc">' + [["Doble", "Compartida de a dos"], ["Triple", "Ideal para familias"], ["Single", "Para uno solo (+30%)"]].map(function (h) {
          return '<label><input type="radio" name="hab" value="' + h[0] + '"' + (r.hab === h[0] ? " checked" : "") + '><span class="t"><b>' + h[0] + "</b><small>" + h[1] + "</small></span></label>";
        }).join("") + "</div>" +
        '<div class="vm-total"><div><small>Total para ' + r.pax + (r.pax === 1 ? " persona" : " personas") + "</small><b>" + plata(total(), p.moneda) + '</b></div><small>Seña ' + (+p.sena || 0) + "%: " + plata(total() * (+p.sena || 0) / 100, p.moneda) + "</small></div>" +
        '<div class="vm-acc"><button class="vm-btn" type="button" data-sig' + (r.salida ? "" : " disabled") + ">Continuar</button></div>";
      hoja.querySelector(".vm-x").onclick = cerrar;
      hoja.querySelectorAll("input[name=sal]").forEach(function (i) { i.onchange = function () { r.salida = i.value; paso1(); }; });
      hoja.querySelectorAll("input[name=hab]").forEach(function (i) { i.onchange = function () { r.hab = i.value; paso1(); }; });
      hoja.querySelectorAll("[data-m]").forEach(function (b) { b.onclick = function () {
        r.pax = Math.min(10, Math.max(1, r.pax + +b.dataset.m));
        if (r.salida && quedan(p, r.salida) < r.pax) r.salida = futuras(p).filter(function (s) { return quedan(p, s) >= r.pax; })[0] || null;
        paso1();
      }; });
      hoja.querySelector("[data-sig]").onclick = paso2;
    }
    function paso2() {
      hoja.innerHTML = cab(2) +
        '<div class="vm-resumen"><div><span>Salida</span><b>' + rango(r.salida) + '</b></div><div><span>Viajan</span><b>' + r.pax + (r.pax === 1 ? " persona" : " personas") + '</b></div><div><span>Habitación</span><b>' + r.hab + '</b></div><div><span>Total</span><b>' + plata(total(), p.moneda) + "</b></div></div>" +
        '<div class="vm-h4">Tus datos</div><form class="vm-campos" novalidate>' +
        '<label>Nombre y apellido<input name="nombre" autocomplete="name" value="' + esc(r.nombre) + '" required></label>' +
        '<label>WhatsApp<input name="tel" type="tel" autocomplete="tel" inputmode="tel" placeholder="Ej: 11 2345 6789" value="' + esc(r.tel) + '" required></label>' +
        '<label>Email<input name="email" type="email" autocomplete="email" value="' + esc(r.email) + '"></label>' +
        '<p class="vm-err" aria-live="polite"></p>' +
        '<div class="vm-acc"><button class="vm-btn" type="submit">Confirmar reserva</button><button class="vm-btn sec" type="button" data-atras>Volver</button></div></form>';
      hoja.querySelector(".vm-x").onclick = cerrar;
      hoja.querySelector("[data-atras]").onclick = paso1;
      hoja.querySelector("form").onsubmit = function (e) {
        e.preventDefault(); var f = e.target;
        r.nombre = f.nombre.value.trim(); r.tel = f.tel.value.trim(); r.email = f.email.value.trim();
        if (r.nombre.length < 3 || r.tel.replace(/\D/g, "").length < 8) { hoja.querySelector(".vm-err").textContent = "Completá tu nombre y un WhatsApp válido."; return; }
        if (quedan(p, r.salida) < r.pax) { hoja.querySelector(".vm-err").textContent = "Se ocuparon esos lugares. Elegí otra fecha."; return; }
        var lista = leer();
        var cod = (cfg.prefijo || "RV") + "-" + String(1000 + lista.length + Math.floor(Math.random() * 90)).slice(-4);
        var res = { cod: cod, paquete: p.n, salida: r.salida, noches: p.noches, pax: r.pax, hab: r.hab, total: Math.round(total()), sena: Math.round(total() * (+p.sena || 0) / 100), moneda: p.moneda || "$", nombre: r.nombre, tel: r.tel, email: r.email, estado: "Pendiente de seña", fecha: new Date().toISOString() };
        lista.unshift(res); guardar(lista);
        paso3(res);
      };
    }
    function paso3(res) {
      var texto = "Hola! Hice la reserva " + res.cod + ": " + res.paquete + ", salida " + rango(res.salida) + ", " + res.pax + " personas, habitación " + res.hab + ". Total " + plata(res.total, res.moneda) + ". A nombre de " + res.nombre + ".";
      hoja.innerHTML = cab(3) +
        '<div class="vm-codigo"><div class="vm-ok">' + ICO.ok + "</div><small>Tu reserva</small><b>" + esc(res.cod) + "</b></div>" +
        '<div class="vm-resumen"><div><span>Paquete</span><b>' + esc(res.paquete) + '</b></div><div><span>Salida</span><b>' + rango(res.salida) + '</b></div><div><span>Viajan</span><b>' + res.pax + '</b></div><div><span>Total</span><b>' + plata(res.total, res.moneda) + '</b></div><div><span>Seña para confirmar</span><b>' + plata(res.sena, res.moneda) + "</b></div></div>" +
        '<div class="vm-acc"><button class="vm-btn" type="button" data-mp>Pagar la seña con Mercado Pago</button><a class="vm-btn sec" target="_blank" rel="noopener" href="' + wa(texto) + '">' + ICO.wa + "Enviar la reserva por WhatsApp</a></div>" +
        '<p class="vm-nota" data-nota hidden>Esto es una muestra: en tu web, este botón abre el pago de la seña con Mercado Pago y la reserva queda confirmada sola.</p>';
      hoja.querySelector(".vm-x").onclick = cerrar;
      hoja.querySelector("[data-mp]").onclick = function () { hoja.querySelector("[data-nota]").hidden = false; };
    }
    paso1();
    var x = hoja.querySelector(".vm-x"); if (x) x.focus();
  }

  return {
    iniciar: function (c) {
      cfg = c; paquetes = c.paquetes || []; estilo();
      if (window.DEMO && DEMO.registro) DEMO.registro.reservas = KEY;
      pintarBuscador(); pintarResultados();
      addEventListener("storage", function (e) { if (e.key === KEY) pintarResultados(); });
    }
  };
})();
