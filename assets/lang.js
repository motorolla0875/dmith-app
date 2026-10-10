// Idioma del sitio: el que eligió la persona, si no el del navegador (es / en / pt).
(function () {
  var ok = ["es", "en", "pt"];
  var saved = null;
  try { saved = localStorage.getItem("dmith-lang"); } catch (e) {}
  var nav = (navigator.language || "es").slice(0, 2).toLowerCase();
  var lang = ok.indexOf(saved) >= 0 ? saved : (ok.indexOf(nav) >= 0 ? nav : "en");
  var root = document.documentElement;

  function apply(l) {
    root.setAttribute("data-lang", l);
    root.setAttribute("lang", l);
    document.querySelectorAll(".langs button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-set") === l ? "true" : "false");
    });
    var t = document.querySelector('meta[name="title-' + l + '"]');
    if (t) document.title = t.content;
  }
  apply(lang);

  document.addEventListener("DOMContentLoaded", function () {
    apply(lang);
    document.querySelectorAll(".langs button").forEach(function (b) {
      b.addEventListener("click", function () {
        lang = b.getAttribute("data-set");
        try { localStorage.setItem("dmith-lang", lang); } catch (e) {}
        apply(lang);
      });
    });
  });
})();
