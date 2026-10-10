"""Genera la página "Probar online" de cada app: la versión web corre 3 minutos
y después se corta. Al volver a empezar se borra lo guardado, así arranca de cero.

Uso: python3 deploy/demos.py .
La versión web de cada app va en <app>/probar/app/ (se copia del repo de cada juego).
"""
import os, sys

ROOT = sys.argv[1]
MINUTOS = 3


def L(es, en, pt):
    return f'<span data-l="es">{es}</span><span data-l="en">{en}</span><span data-l="pt">{pt}</span>'


APPS = {
    "tintix": dict(name="Tintix", phone=True,
                   verbo=L("Jugá", "Play", "Jogue"), cosa=L("el juego", "the game", "o jogo")),
    "letravio": dict(name="Letravio", phone=True,
                     verbo=L("Jugá", "Play", "Jogue"), cosa=L("el juego", "the game", "o jogo")),
    "santa-biblia": dict(name="Santa Biblia", phone=True,
                         verbo=L("Probá", "Try", "Experimente"), cosa=L("la app", "the app", "o app")),
}

for slug, a in APPS.items():
    html = f'''<!DOCTYPE html>
<html lang="es" data-lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>{a["name"]} · Probar online</title>
<meta name="title-es" content="{a["name"]} · Probar online">
<meta name="title-en" content="{a["name"]} · Try it online">
<meta name="title-pt" content="{a["name"]} · Experimente online">
<meta name="robots" content="noindex">
<link rel="icon" href="../icon.png">
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/lang.js"></script>
<style>
  html, body {{ height: 100%; overflow: hidden; }}
  body {{ display: flex; flex-direction: column; }}
  .bar {{ display: flex; align-items: center; gap: 12px; padding: 10px 16px; padding-top: max(10px, env(safe-area-inset-top)); }}
  .bar img {{ width: 34px; height: 34px; border-radius: 9px; }}
  .bar .name {{ font: 700 18px/1 var(--display); flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
  .clock {{ font: 700 16px/1 var(--body); font-variant-numeric: tabular-nums; color: var(--deep); background: var(--gold); padding: 8px 12px; border-radius: 10px; }}
  .clock.low {{ background: var(--coral); color: #fff; }}
  .bar a.x {{ color: var(--muted); text-decoration: none; font-size: 14.5px; }}
  .stage {{ flex: 1; display: flex; justify-content: center; min-height: 0; padding: 0 0 env(safe-area-inset-bottom); position: relative; }}
  iframe {{ border: 0; width: 100%; height: 100%; background: #000; }}
  @media (min-width: 700px) {{
    .stage {{ padding: 6px 0 18px; }}
    iframe {{ max-width: 430px; border-radius: 26px; box-shadow: 0 20px 50px rgba(5,6,30,.55); }}
  }}
  .end {{ position: absolute; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(16,18,58,.92); }}
  .end[hidden] {{ display: none; }}
  .card {{ max-width: 380px; text-align: center; }}
  .card img {{ width: 96px; height: 96px; border-radius: 22px; margin: 0 auto 18px; }}
  .card h1 {{ font: 800 30px/1.1 var(--display); margin: 0 0 10px; }}
  .card p {{ color: var(--soft); margin: 0 0 22px; }}
  .card button, .card a {{ display: block; width: 100%; font: 700 17px/1 var(--body); padding: 15px; border-radius: 14px; border: 0; cursor: pointer; text-decoration: none; margin-bottom: 10px; }}
  .card button {{ background: var(--gold); color: var(--deep); }}
  .card a {{ background: rgba(255,255,255,.1); color: var(--ink); }}
</style>
</head>
<body>
  <div class="bar">
    <img src="../icon.png" alt="">
    <span class="name">{a["name"]}</span>
    <span class="clock" id="clock" aria-live="off">{MINUTOS}:00</span>
    <a class="x" href="../">{L("Salir", "Exit", "Sair")}</a>
  </div>
  <div class="stage">
    <iframe id="app" title="{a["name"]}" allow="autoplay; fullscreen"></iframe>
    <div class="end" id="end" hidden>
      <div class="card">
        <img src="../icon.png" alt="">
        <h1>{L("Se terminaron los 3 minutos", "Your 3 minutes are up", "Seus 3 minutos acabaram")}</h1>
        <p>{L("Esta es una prueba online. Para seguir sin límite, descargá " , "This is an online preview. To keep going with no limit, download ", "Esta é uma prévia online. Para continuar sem limite, baixe ")}{a["cosa"]}{L(" cuando salga en iPhone y Android.", " when it comes out on iPhone and Android.", " quando sair para iPhone e Android.")}</p>
        <button id="again">{L("Volver a empezar", "Start over", "Começar de novo")}</button>
        <a href="../">{L("Ver más de ", "More about ", "Mais sobre ")}{a["name"]}</a>
      </div>
    </div>
  </div>
<script>
  var SEGUNDOS = {MINUTOS} * 60;
  var frame = document.getElementById("app"), clock = document.getElementById("clock"), end = document.getElementById("end");
  var timer = null, fin = 0;

  // Borra todo lo que la versión web guardó, menos el idioma del sitio: así arranca de cero.
  function limpiar() {{
    try {{
      var keep = localStorage.getItem("dmith-lang");
      localStorage.clear();
      if (keep) localStorage.setItem("dmith-lang", keep);
      sessionStorage.clear();
    }} catch (e) {{}}
  }}
  function pintar(s) {{
    var m = Math.floor(s / 60), r = s % 60;
    clock.textContent = m + ":" + (r < 10 ? "0" : "") + r;
    clock.classList.toggle("low", s <= 30);
  }}
  function terminar() {{
    clearInterval(timer);
    pintar(0);
    frame.src = "about:blank";
    limpiar();
    end.hidden = false;
  }}
  function empezar() {{
    limpiar();
    end.hidden = true;
    frame.src = "app/index.html?t=" + Date.now();
    fin = Date.now() + SEGUNDOS * 1000;
    pintar(SEGUNDOS);
    clearInterval(timer);
    timer = setInterval(function () {{
      var s = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
      pintar(s);
      if (s === 0) terminar();
    }}, 250);
  }}
  document.getElementById("again").addEventListener("click", empezar);
  empezar();
</script>
</body>
</html>
'''
    path = os.path.join(ROOT, slug, "probar", "index.html")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8").write(html)
    print("ok", slug)
