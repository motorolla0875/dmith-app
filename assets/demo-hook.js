// Se agrega al final de la versión web de cada juego en dmith.app/<juego>/probar/app/.
// 1) En la prueba online solo se puede jugar por niveles: el resto de los modos queda desactivado.
// 2) Avisa a la página de "Probar online" cada vez que se completa un nivel.
(function () {
  var JUEGOS = {
    tintix: {
      fin: "winLevel",
      apagar: ["btnFree", "btnRush", "btnDuel", "btnDaily", "btnMissions", "btnWheel", "btnChest",
               "btnThemes", "btnLiga", "btnRecords", "btnPerfil", "btnMap", "btnTest"]
    },
    letravio: {
      fin: "celebrateLevelComplete",
      apagar: ["competirBtn", "worldsBtn", "albumBtn", "prizesBtn", "tiendaBtn", "homeDesafio",
               "homeRacha", "homeDiario", "perfilIconoHomeBtn"]
    }
  };
  var j = JUEGOS[window.DMITH_DEMO];
  if (!j) return;

  var css = j.apagar.map(function (id) { return "#" + id; }).join(",") +
    "{opacity:.3!important;filter:grayscale(1)!important;pointer-events:none!important}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);
  // Por si algún botón se activa con el teclado o por código: se corta el clic antes de que llegue al juego.
  document.addEventListener("click", function (e) {
    for (var el = e.target; el && el !== document; el = el.parentNode) {
      if (el.id && j.apagar.indexOf(el.id) >= 0) { e.stopPropagation(); e.preventDefault(); return; }
    }
  }, true);

  var original = window[j.fin];
  if (typeof original !== "function") return;
  window[j.fin] = function () {
    var r = original.apply(this, arguments);
    try { parent.postMessage({ dmith: "level-done" }, location.origin); } catch (e) {}
    return r;
  };
})();
