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
