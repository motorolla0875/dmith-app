/* Franja de "muestra" para las webs de clientes que todavía no activaron.
   Uso, al final del <body> de la muestra:
   <script src="/m/franja.js" data-negocio="Barbería Juan" data-slug="barberia-juan"></script>
   Cuando el cliente paga, se borra esta línea y la web queda limpia. */
(function () {
  var me = document.currentScript;
  var negocio = (me && me.dataset.negocio) || "tu negocio";
  var slug = (me && me.dataset.slug) || location.pathname.split("/").filter(Boolean).pop() || "";
  var IG = "https://ig.me/m/dmith_app";

  var listo = false;
  fetch("/api/sitios/estado?slug=" + encodeURIComponent(slug)).then(function (r) { return r.json(); }).then(function (j) { listo = true; if (!j.activo) mostrar(); }).catch(function () { if (!listo) { listo = true; mostrar(); } });
  setTimeout(function () { if (!listo) { listo = true; mostrar(); } }, 2500);

  function mostrar() {
  var css = document.createElement("style");
  css.textContent =
    "#dm-franja{position:fixed;top:0;left:0;right:0;z-index:2147483000;background:#181B4A;color:#fff;" +
    "font:500 14px/1.3 'DM Sans',system-ui,sans-serif;display:flex;align-items:center;gap:10px;padding:8px 12px;" +
    "box-shadow:0 2px 12px rgba(0,0,0,.25)}" +
    "#dm-franja .t{flex:1;min-width:0}#dm-franja b{color:#FFC23D}" +
    "#dm-franja a{flex:none;text-decoration:none;font-weight:700;border-radius:10px;padding:9px 12px;font-size:14px;white-space:nowrap}" +
    "#dm-franja .c{color:#fff;border:1.5px solid rgba(255,255,255,.35)}" +
    "#dm-franja .a{background:#FFC23D;color:#15172E}" +
    "#dm-hint{position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:2147483001;background:#15172E;color:#fff;" +
    "font:500 14px 'DM Sans',system-ui,sans-serif;padding:10px 14px;border-radius:10px;display:none;max-width:90vw;text-align:center}" +
    "@media(max-width:560px){#dm-franja{flex-wrap:wrap}#dm-franja .t{flex-basis:100%;text-align:center}#dm-franja a{flex:1;text-align:center}}";
  document.head.appendChild(css);

  var bar = document.createElement("div");
  bar.id = "dm-franja";
  bar.innerHTML =
    '<div class="t">🎁 Esta es la <b>muestra gratis</b> de ' + esc(negocio) + ". ¿Te gusta?</div>" +
    '<a class="c" href="' + IG + '" id="dm-cambios">Quiero cambios</a>' +
    '<a class="a" href="/activar/?n=' + encodeURIComponent(negocio) + "&s=" + encodeURIComponent(slug) + '">Activar mi web</a>';
  var hint = document.createElement("div");
  hint.id = "dm-hint";
  document.body.appendChild(bar);
  document.body.appendChild(hint);

  function pad() { document.body.style.paddingTop = bar.offsetHeight + "px"; }
  pad(); addEventListener("resize", pad);

  document.getElementById("dm-cambios").addEventListener("click", function (e) {
    var txt = "Hola! Vi la muestra de " + negocio + ". Quiero estos cambios: ";
    if (navigator.clipboard) {
      e.preventDefault();
      navigator.clipboard.writeText(txt).catch(function () {}).then(function () {
        hint.textContent = "Mensaje copiado. Pegalo en el chat y contanos qué cambiar.";
        hint.style.display = "block";
        setTimeout(function () { location.href = IG; }, 1200);
      });
    }
  });

  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
})();
