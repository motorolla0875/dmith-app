"""Genera la página "Probar online" de cada app.

Juegos (Tintix, Letravio): se juegan los primeros niveles; al completarlos aparece la
invitación a descargar, y al volver a empezar se borra lo guardado, así arranca de cero.
Santa Biblia: vista previa sin límite.

Uso: python3 deploy/demos.py .
La versión web de cada app va en <app>/probar/app/ (se copia del repo de cada juego).
"""
import os, sys

ROOT = sys.argv[1]
NIVELES = 3
TOPE_MIN = 15   # por si juegan un modo sin niveles


def L(es, en, pt):
    return f'<span data-l="es">{es}</span><span data-l="en">{en}</span><span data-l="pt">{pt}</span>'


APPS = {
    "tintix": dict(name="Tintix", mode="levels"),
    "letravio": dict(name="Letravio", mode="levels"),
    "santa-biblia": dict(name="Santa Biblia", mode="free"),
}


def inyectar_aviso(slug):
    """Agrega al final de la versión web el script que avisa cuando se completa un nivel."""
    path = os.path.join(ROOT, slug, "probar", "app", "index.html")
    html = open(path, encoding="utf-8").read()
    tag = f'<script>window.DMITH_DEMO="{slug}";</script><script src="/assets/demo-hook.js"></script>'
    if tag in html:
        return
    i = html.rfind("</body>")
    html = html[:i] + tag + "\n" + html[i:] if i >= 0 else html + tag
    open(path, "w", encoding="utf-8").write(html)


SCRIPT_NIVELES = """
  var NIVELES = %d, TOPE_MIN = %d;
  var frame = document.getElementById("app"), end = document.getElementById("end"), n = document.getElementById("n");
  var hechos = 0, ultimo = 0, tope = null;

  // Borra lo que guardó la versión web (menos el idioma del sitio): así arranca de cero.
  function limpiar() {
    try {
      var keep = localStorage.getItem("dmith-lang");
      localStorage.clear();
      if (keep) localStorage.setItem("dmith-lang", keep);
      sessionStorage.clear();
    } catch (e) {}
  }
  function terminar() {
    clearTimeout(tope);
    frame.src = "about:blank";
    limpiar();
    end.hidden = false;
  }
  function empezar() {
    limpiar();
    hechos = 0; n.textContent = 1;
    end.hidden = true;
    frame.src = "app/index.html?t=" + Date.now();
    clearTimeout(tope);
    tope = setTimeout(terminar, TOPE_MIN * 60 * 1000);
  }
  window.addEventListener("message", function (e) {
    if (e.origin !== location.origin || !e.data || e.data.dmith !== "level-done") return;
    if (Date.now() - ultimo < 3000) return;              // un mismo nivel puede avisar dos veces
    ultimo = Date.now();
    hechos++;
    n.textContent = Math.min(hechos + 1, NIVELES);
    if (hechos >= NIVELES) setTimeout(terminar, 3500);   // deja ver el festejo del último nivel
  });
  document.getElementById("again").addEventListener("click", empezar);
  empezar();
""" % (NIVELES, TOPE_MIN)

SCRIPT_LIBRE = """
  document.getElementById("app").src = "app/index.html";
"""

CSS = """
  html, body { height: 100%; overflow: hidden; }
  body { display: flex; flex-direction: column; }
  .bar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; padding-top: max(10px, env(safe-area-inset-top)); }
  .bar img { width: 34px; height: 34px; border-radius: 9px; }
  .bar .name { font: 700 18px/1 var(--display); flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pill { font: 700 15px/1 var(--body); color: var(--deep); background: var(--gold); padding: 8px 12px; border-radius: 10px; white-space: nowrap; }
  .bar a.x { color: var(--muted); text-decoration: none; font-size: 14.5px; }
  .stage { flex: 1; display: flex; justify-content: center; min-height: 0; padding: 0 0 env(safe-area-inset-bottom); position: relative; }
  iframe { border: 0; width: 100%; height: 100%; background: #000; }
  @media (min-width: 700px) {
    .stage { padding: 6px 0 18px; }
    iframe { max-width: 430px; border-radius: 26px; box-shadow: 0 20px 50px rgba(5,6,30,.55); }
  }
  .end { position: absolute; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(16,18,58,.94); }
  .end[hidden] { display: none; }
  .card { max-width: 380px; text-align: center; }
  .card img { width: 96px; height: 96px; border-radius: 22px; margin: 0 auto 18px; }
  .card h1 { font: 800 30px/1.1 var(--display); margin: 0 0 10px; }
  .card p { color: var(--soft); margin: 0 0 22px; }
  .card button, .card a { display: block; width: 100%; font: 700 17px/1 var(--body); padding: 15px; border-radius: 14px; border: 0; cursor: pointer; text-decoration: none; margin-bottom: 10px; }
  .card button { background: var(--gold); color: var(--deep); }
  .card a { background: rgba(255,255,255,.1); color: var(--ink); }
"""

for slug, a in APPS.items():
    name = a["name"]
    levels = a["mode"] == "levels"
    if levels:
        inyectar_aviso(slug)
        pill = '<span class="pill">' + L("Nivel", "Level", "Nível") + f' <b id="n">1</b>/{NIVELES}</span>'
        end = (
            '<div class="end" id="end" hidden><div class="card">'
            '<img src="../icon.png" alt="">'
            "<h1>" + L(f"¡Completaste {NIVELES} niveles!", f"You beat {NIVELES} levels!", f"Você completou {NIVELES} níveis!") + "</h1>"
            "<p>" + L("Esta es una prueba online. Seguí jugando sin límite en la app, que sale pronto para iPhone y Android.",
                      "This is an online preview. Keep playing with no limit in the app, coming soon to iPhone and Android.",
                      "Esta é uma prévia online. Continue jogando sem limite no app, que sai em breve para iPhone e Android.") + "</p>"
            '<button id="again">' + L("Volver a empezar", "Start over", "Começar de novo") + "</button>"
            '<a href="../">' + L("Ver más de ", "More about ", "Mais sobre ") + name + "</a>"
            "</div></div>"
        )
        script = SCRIPT_NIVELES
    else:
        pill = '<span class="pill">' + L("Vista previa", "Preview", "Prévia") + "</span>"
        end = ""
        script = SCRIPT_LIBRE

    html = (
        '<!DOCTYPE html>\n<html lang="es" data-lang="es">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n'
        f"<title>{name} · Probar online</title>\n"
        f'<meta name="title-es" content="{name} · Probar online">\n'
        f'<meta name="title-en" content="{name} · Try it online">\n'
        f'<meta name="title-pt" content="{name} · Experimente online">\n'
        '<meta name="robots" content="noindex">\n<link rel="icon" href="../icon.png">\n'
        '<link rel="stylesheet" href="/assets/site.css">\n<script src="/assets/lang.js"></script>\n'
        f"<style>{CSS}</style>\n</head>\n<body>\n"
        f'  <div class="bar"><img src="../icon.png" alt=""><span class="name">{name}</span>{pill}'
        f'<a class="x" href="../">' + L("Salir", "Exit", "Sair") + "</a></div>\n"
        f'  <div class="stage"><iframe id="app" title="{name}" allow="autoplay; fullscreen"></iframe>{end}</div>\n'
        f"<script>{script}</script>\n</body>\n</html>\n"
    )
    open(os.path.join(ROOT, slug, "probar", "index.html"), "w", encoding="utf-8").write(html)
    print("ok", slug, a["mode"])
