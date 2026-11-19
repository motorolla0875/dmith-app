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

  // Textos: todos los títulos y párrafos que ya están en la página (antes de que el script arme el resto)
  var raices = document.querySelectorAll("h1, h2, h3, p, .lead, .tag, .badge-hero");
  var vistos = [];
  Array.prototype.forEach.call(raices, function (el) {
    if (el.closest("script, style, [data-no-editar]") || vistos.some(function (v) { return v.contains(el); })) return;
    vistos.push(el);
    var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodos = [], n;
    while ((n = tw.nextNode())) if (n.nodeValue.trim().length > 1) nodos.push(n);
    var tipo = el.tagName === "H1" ? "Título principal" : /^H[23]$/.test(el.tagName) ? "Título" : "Texto";
    nodos.forEach(function (nodo, i) {
      var k = registro.textos.length;
      registro.textos.push({ k: k, tipo: tipo + (nodos.length > 1 ? " (parte " + (i + 1) + ")" : ""), def: nodo.nodeValue.trim() });
      var t = datos.textos && datos.textos[k];
      if (typeof t === "string") nodo.nodeValue = nodo.nodeValue.replace(nodo.nodeValue.trim(), t);
    });
  });

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
