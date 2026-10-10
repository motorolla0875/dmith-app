// Se agrega al final de la versión web de cada juego en dmith.app/<juego>/probar/app/.
// Avisa a la página de "Probar online" cada vez que se completa un nivel.
(function () {
  var fn = { tintix: "winLevel", letravio: "celebrateLevelComplete" }[window.DMITH_DEMO];
  if (!fn || typeof window[fn] !== "function") return;
  var original = window[fn];
  window[fn] = function () {
    var r = original.apply(this, arguments);
    try { parent.postMessage({ dmith: "level-done" }, location.origin); } catch (e) {}
    return r;
  };
})();
