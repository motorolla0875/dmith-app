/* Modo muestra de los ejemplos: permite editar la web desde el panel de muestra (ejemplos/panel/).
   Los cambios se guardan solo en el navegador de quien lo prueba (localStorage).
   Uso en cada ejemplo, justo antes del <script> principal:
     <script src="../demo.js"></script>
   y en el script:  const productos = DEMO.lista("productos", [ ... ]);   y   DEMO.img(x.img, 700)  */
window.DEMO = (function () {
  var slug = location.pathname.split("/").filter(Boolean).pop() || "";
  var KEY = "demo-" + slug;
  var datos = {};
  try { datos = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
  var registro = { listas: {}, textos: [] };

  registro.fotos = []; registro.colores = [];

  // Textos: todo el texto que ya está en la página (antes de que el script arme el resto)
  function tipoDe(el) {
    var t = el.tagName;
    if (t === "H1") return "Título principal";
    if (/^H[2-4]$/.test(t)) return "Título";
    if (el.closest("a, button")) return "Botón o link";
    if (el.closest("li")) return "Ítem de lista";
    if (el.closest("footer")) return "Pie de página";
    if (el.closest("header, nav")) return "Menú de arriba";
    return "Texto";
  }
  var tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) { return n.parentElement && !n.parentElement.closest("script, style, svg, noscript, [data-no-editar]") && n.nodeValue.trim().length > 1 ? 1 : 3; }
  });
  var n;
  while ((n = tw.nextNode())) {
    var k = registro.textos.length;
    registro.textos.push({ k: k, tipo: tipoDe(n.parentElement), def: n.nodeValue.trim() });
    var t = datos.textos && datos.textos[k];
    if (typeof t === "string") n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), t);
  }

  // Fotos fijas de la página (portada, local, etc.)
  Array.prototype.forEach.call(document.images, function (img, k) {
    registro.fotos.push({ k: k, def: img.getAttribute("src"), alt: img.alt || "" });
    var f = datos.fotos && datos.fotos[k];
    if (f) { img.src = f; img.removeAttribute("srcset"); }
  });

  // Colores de la marca (variables de color en :root)
  Array.prototype.forEach.call(document.styleSheets, function (hoja) {
    var reglas = []; try { reglas = hoja.cssRules || []; } catch (e) {}
    Array.prototype.forEach.call(reglas, function (r) {
        if (r.selectorText !== ":root") return;
        for (var i = 0; i < r.style.length; i++) {
          var nombre = r.style[i], v = r.style.getPropertyValue(nombre).trim();
          if (nombre.indexOf("--") === 0 && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) && !registro.colores.some(function (c) { return c.nombre === nombre; }))
            registro.colores.push({ nombre: nombre, def: v.length === 4 ? "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3] : v });
        }
    });
  });
  if (datos.colores) for (var c in datos.colores) document.documentElement.style.setProperty(c, datos.colores[c]);

  // WhatsApp del negocio: los botones de pedido van a ese número
  if (datos.whatsapp) {
    var num = "549" + String(datos.whatsapp).replace(/\D/g, "").replace(/^(549|54|0)/, "");
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href*="wa.me/"]');
      if (a) a.href = a.href.replace(/wa\.me\/\d*/, "wa.me/" + num);
    }, true);
  }

  function copia(x) { return JSON.parse(JSON.stringify(x)); }
  return {
    KEY: KEY,
    registro: registro,
    datos: datos,
    // Devuelve la lista editada en el panel, o la original
    lista: function (nombre, def, opc) {
      registro.listas[nombre] = { def: copia(def), opc: opc || {} };
      return datos.listas && datos.listas[nombre] ? datos.listas[nombre] : def;
    },
    // Foto: id de Unsplash, foto subida en el panel o dirección completa
    img: function (v, w) {
      if (!v) return "";
      if (/^(data:|https?:|\/)/.test(v)) return v;
      return "https://unsplash.com/photos/" + v + "/download?w=" + (w || 700);
    }
  };
})();

// Botón para volver a la página principal (no se muestra dentro del panel de muestra)
(function () {
  if (window.top !== window) return;
  var a = document.createElement("a");
  a.href = "/sitios/#ejemplos";
  a.id = "dm-volver";
  a.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>Volver a dmith';
  var css = document.createElement("style");
  css.textContent = "#dm-volver{position:fixed;left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));z-index:2147483000;display:inline-flex;align-items:center;gap:6px;" +
    "background:#181B4A;color:#fff;font:700 14px/1 'DM Sans',system-ui,-apple-system,sans-serif;text-decoration:none;padding:11px 15px 11px 11px;border-radius:999px;box-shadow:0 8px 22px rgba(21,23,46,.35)}" +
    "#dm-volver:focus-visible{outline:3px solid #FFC23D;outline-offset:2px}";
  document.head.appendChild(css);
  document.body.appendChild(a);
  // si la web tiene una barra fija abajo (carrito, reservar), el botón se pone arriba de ella
  function acomodar() {
    var alto = 0;
    Array.prototype.forEach.call(document.body.querySelectorAll("*"), function (el) {
      if (el === a || el.contains(a)) return;
      var cs = getComputedStyle(el);
      if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") return;
      var r = el.getBoundingClientRect();
      if (r.width > innerWidth * 0.6 && r.bottom >= innerHeight - 4 && r.height < innerHeight * 0.5) alto = Math.max(alto, r.height);
    });
    a.style.bottom = alto ? "calc(" + Math.round(alto + 10) + "px + env(safe-area-inset-bottom))" : "";
  }
  setTimeout(acomodar, 300); setInterval(acomodar, 1500); addEventListener("resize", acomodar);
})();
