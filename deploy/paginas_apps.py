"""Genera la página de cada app en dmith.app (usa assets/site.css y assets/lang.js)."""
import sys, os
ROOT = sys.argv[1]
PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7.5v7m-3-3 3 3 3-3"/></svg>'
L = lambda es, en, pt: f'<span data-l="es">{es}</span><span data-l="en">{en}</span><span data-l="pt">{pt}</span>'
def soon(store): return f'<span class="store soon">{PHONE}<span><small data-l="es">Próximamente</small><small data-l="en">Coming soon</small><small data-l="pt">Em breve</small><strong>{store}</strong></span></span>'

APPS = {
 "santa-biblia": dict(
   name="Santa Biblia", color="var(--coral)",
   title=("Santa Biblia · La Biblia gratis y sin anuncios", "Holy Bible · Free and ad-free", "Bíblia Sagrada · Grátis e sem anúncios"),
   tagline=L("La Biblia completa, gratis y sin anuncios. Para leerla, escucharla y orar cada día.",
             "The complete Bible, free and ad-free. To read, listen and pray every day.",
             "A Bíblia completa, grátis e sem anúncios. Para ler, ouvir e orar todos os dias."),
   shots=["img/captura-1.webp","img/captura-2.webp","img/captura-3.webp","img/captura-4.webp"],
   features=[
     L("Reina-Valera 1909, King James y Bíblia Livre, sin conexión","Reina-Valera 1909, King James and Bíblia Livre, offline","Reina-Valera 1909, King James e Bíblia Livre, sem internet"),
     L("Escuchá cualquier capítulo, con cada palabra resaltada","Listen to any chapter, with each word highlighted","Ouça qualquer capítulo, com cada palavra destacada"),
     L("Versículo, meditación y oración con tu nombre cada mañana","Verse, devotional and a prayer with your name every morning","Versículo, devocional e oração com o seu nome toda manhã"),
     L("Resaltá en colores, anotá y memorizá versículos","Highlight in colors, take notes and memorize verses","Destaque em cores, anote e memorize versículos"),
     L("Colores que cuidan la vista para leer de noche","Eye-friendly colors for reading at night","Cores que cuidam da vista para ler à noite"),
   ],
   legal=[("privacy/",L("Privacidad","Privacy","Privacidade")),("terms/",L("Términos","Terms","Termos")),("support/",L("Soporte","Support","Suporte")),("borrar-datos/",L("Borrar mis datos","Delete my data","Apagar meus dados"))],
 ),
 "letravio": dict(
   name="Letravio", color="var(--gold)",
   title=("Letravio · Juego de palabras", "Letravio · Word game", "Letravio · Jogo de palavras"),
   tagline=L("Uní las letras para formar palabras y completá el crucigrama.",
             "Connect the letters to form words and complete the crossword.",
             "Una as letras para formar palavras e complete as palavras cruzadas."),
   shots=[],
   features=[
     L("Deslizá el dedo por las letras para armar palabras","Swipe across the letters to make words","Deslize o dedo pelas letras para formar palavras"),
     L("En español, inglés y portugués","In English, Spanish and Portuguese","Em português, espanhol e inglês"),
     L("Pistas cuando te trabás y palabras bonus","Hints when you get stuck and bonus words","Dicas quando travar e palavras bônus"),
   ],
   legal=[("privacy/",L("Privacidad","Privacy","Privacidade")),("borrar-datos/",L("Borrar mis datos","Delete my data","Apagar meus dados"))],
 ),
 "paseo": dict(
   name="Paseo con Matilde", color="var(--coral)",
   title=("Paseo con Matilde · Juego de mascotas", "Walk with Matilde · Pet game", "Passeio com Matilde · Jogo de pets"),
   tagline=L("Cuidá y paseá a Matilde por 6 mundos: mini-juegos, ropa, aventuras y una historia de amor.",
             "Care for and walk Matilde through 6 worlds: mini-games, outfits, adventures and a love story.",
             "Cuide e passeie com a Matilde por 6 mundos: minijogos, roupas, aventuras e uma história de amor."),
   shots=[],
   features=[
     L("Paseos en 3D por el barrio, el centro, el parque, la playa, la montaña y la feria","3D walks through the neighborhood, downtown, the park, the beach, the mountains and the fair","Passeios em 3D pelo bairro, centro, parque, praia, montanha e feira"),
     L("Veterinario, peluquería, cumpleaños, concurso y muchos mini-juegos","Vet, groomer, birthday party, pet contest and lots of mini-games","Veterinário, pet salão, aniversário, concurso e muitos minijogos"),
     L("Matilde conoce a Congo… ¡y se casan!","Matilde meets Congo… and they get married!","Matilde conhece o Congo… e eles se casam!"),
     L("En español, inglés y portugués","In English, Spanish and Portuguese","Em português, espanhol e inglês"),
   ],
   legal=[("privacy/",L("Privacidad","Privacy","Privacidade"))],
 ),
}

for slug, a in APPS.items():
    shots = "".join(f'<img src="{s}" alt="" loading="lazy" width="270" height="480">' for s in a["shots"])
    shots_html = f'<div class="shots">{shots}</div>' if shots else ""
    feats = "".join(f"<li>{f}</li>" for f in a["features"])
    legal = "".join(f'<a href="{h}">{t}</a>' for h, t in a["legal"])
    t_es, t_en, t_pt = a["title"]
    html = f'''<!DOCTYPE html>
<html lang="es" data-lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t_es}</title>
<meta name="title-es" content="{t_es}">
<meta name="title-en" content="{t_en}">
<meta name="title-pt" content="{t_pt}">
<meta property="og:title" content="{t_es}">
<meta property="og:image" content="https://dmith.app/{slug}/icon.png">
<link rel="icon" href="icon.png">
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/lang.js"></script>
<style>
  .app-hero {{ display: grid; grid-template-columns: auto 1fr; gap: 28px; align-items: center; padding: 28px 0 36px; }}
  .app-hero .icon {{ width: 140px; height: 140px; border-radius: 32px; box-shadow: 0 0 0 10px {a["color"]}, 0 18px 40px rgba(5,6,30,.45); }}
  .app-hero h1 {{ font: 800 clamp(36px, 6vw, 56px)/1.02 var(--display); letter-spacing: -.02em; margin: 0 0 10px; }}
  .app-hero p {{ font-size: 18.5px; color: var(--soft); margin: 0 0 20px; max-width: 46ch; }}
  .shots {{ display: flex; gap: 14px; overflow-x: auto; padding: 4px 0 18px; scroll-snap-type: x mandatory; }}
  .shots img {{ width: 230px; height: auto; flex: none; border-radius: 22px; scroll-snap-align: start; border: 1px solid var(--line); }}
  .feats {{ list-style: none; padding: 0; margin: 28px 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0 32px; }}
  .feats li {{ padding: 14px 0 14px 26px; border-top: 1px solid var(--line); position: relative; color: var(--soft); }}
  .feats li::before {{ content: ""; position: absolute; left: 2px; top: 22px; width: 10px; height: 10px; border-radius: 3px; background: {a["color"]}; }}
  .soon-note {{ display: inline-block; font-weight: 700; font-size: 15px; color: var(--deep); background: var(--gold); padding: 9px 14px; border-radius: 10px; }}
  .back {{ color: var(--muted); text-decoration: none; font-size: 15px; }}
  .back:hover {{ color: var(--ink); }}
  @media (max-width: 640px) {{
    .app-hero {{ grid-template-columns: 1fr; gap: 26px; padding-top: 12px; }}
    .app-hero .icon {{ width: 108px; height: 108px; border-radius: 25px; box-shadow: 0 0 0 8px {a["color"]}, 0 14px 30px rgba(5,6,30,.45); margin-left: 8px; }}
    .shots img {{ width: 190px; }}
  }}
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <a class="logo" href="/"><span class="mark"><i></i><i></i><i></i><i></i></span><span>dmith<span class="dot">.</span>builds</span></a>
    <div class="langs" role="group" aria-label="Idioma">
      <button data-set="es">ES</button><button data-set="en">EN</button><button data-set="pt">PT</button>
    </div>
  </header>
  <a class="back" href="/">{L("Todas las apps","All apps","Todos os apps")}</a>

  <section class="app-hero">
    <img class="icon" src="icon.png" alt="{a["name"]}">
    <div>
      <h1>{a["name"]}</h1>
      <p>{a["tagline"]}</p>
      <span class="soon-note">{L("Próximamente en iPhone y Android","Coming soon to iPhone and Android","Em breve para iPhone e Android")}</span>
    </div>
  </section>

  {shots_html}
  <ul class="feats">{feats}</ul>

  <footer class="foot">
    <span>© 2026 dmith.builds</span>
    <nav>{legal}<a href="mailto:dmith.builds@gmail.com">dmith.builds@gmail.com</a></nav>
  </footer>
</div>
</body>
</html>
'''
    open(os.path.join(ROOT, slug, "index.html"), "w", encoding="utf-8").write(html)
    print("ok", slug)
