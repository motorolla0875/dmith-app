/* Uma en cualquier página de dmith: <script src="/uma/widget.js" data-contexto="sitios" data-wa="5491150540357" defer></script>
   Dibuja una burbuja con la cara de Uma que abre un chat. Habla con /api/uma/chat. */
(function () {
  if (window.__uma) return; window.__uma = true;
  const yo = document.currentScript || document.querySelector('script[src*="uma/widget.js"]');
  const CONTEXTO = (yo && yo.dataset.contexto) || "";
  const WA = (yo && yo.dataset.wa) || "";
  const KEY = "uma-widget-" + (CONTEXTO || "general");

  const CARA = `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="60" fill="#EFEAFF"/><ellipse cx="60" cy="24" rx="17" ry="15" fill="#3A2340"/><path d="M22 70c-6-30 10-50 38-50s44 20 38 50c-3 16-6 30-14 40H36c-8-10-11-24-14-40Z" fill="#3A2340"/><path d="M40 104c2-8 10-12 20-12s18 4 20 12v16H40Z" fill="#6B4EFF"/><rect x="53" y="82" width="14" height="14" rx="6" fill="#D99A74"/><ellipse cx="60" cy="62" rx="27" ry="29" fill="#E9AE86"/><path d="M33 56c2-17 14-26 29-26 13 0 24 8 26 22-10-1-19-6-25-14-5 9-17 16-30 18Z" fill="#3A2340"/><g class="u-cejas"><path d="M43 55q6-4 12 0" stroke="#3A2340" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M65 55q6-4 12 0" stroke="#3A2340" stroke-width="2.4" fill="none" stroke-linecap="round"/></g><g class="u-ojos"><ellipse cx="49" cy="63" rx="4.6" ry="5.4" fill="#fff"/><ellipse cx="71" cy="63" rx="4.6" ry="5.4" fill="#fff"/><g class="u-pupilas"><circle cx="49" cy="64" r="3.4" fill="#24152B"/><circle cx="71" cy="64" r="3.4" fill="#24152B"/><circle cx="50.2" cy="62.6" r="1.1" fill="#fff"/><circle cx="72.2" cy="62.6" r="1.1" fill="#fff"/></g></g><ellipse cx="42" cy="73" rx="5" ry="3" fill="#F08F7A" opacity=".45"/><ellipse cx="78" cy="73" rx="5" ry="3" fill="#F08F7A" opacity=".45"/><g class="u-boca"><path d="M52 78q8 8 16 0q-8 3-16 0Z" fill="#B3404E"/></g></svg>`;
  const WSVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;

  const css = `
  .uma-w, .uma-w * { box-sizing: border-box; font-family: Onest, system-ui, -apple-system, sans-serif; }
  .uma-btn { position: fixed; z-index: 2147483000; right: max(16px, env(safe-area-inset-right)); bottom: calc(max(16px, env(safe-area-inset-bottom)) + 72px);
    width: 62px; height: 62px; border-radius: 50%; border: 3px solid #fff; padding: 0; cursor: pointer; background: #EFEAFF; box-shadow: 0 10px 28px rgba(28,20,51,.28); overflow: hidden; }
  .uma-btn svg { width: 100%; height: 100%; display: block; }
  .uma-btn .u-ojos { transform-origin: 50% 54%; animation: uma-parp 5s infinite; }
  @keyframes uma-parp { 0%,92%,100% { transform: scaleY(1); } 95% { transform: scaleY(.08); } }
  .uma-tip { position: fixed; z-index: 2147483000; right: calc(max(16px, env(safe-area-inset-right)) + 72px); bottom: calc(max(16px, env(safe-area-inset-bottom)) + 82px);
    max-width: 230px; background: #fff; color: #1C1433; border-radius: 18px 18px 4px 18px; padding: 11px 32px 11px 14px; font-size: 15px; line-height: 1.35; box-shadow: 0 10px 28px rgba(28,20,51,.2); cursor: pointer; }
  .uma-tip b { color: #6B4EFF; }
  .uma-tip button { position: absolute; top: 4px; right: 6px; border: 0; background: none; font-size: 18px; color: #8a83a3; cursor: pointer; line-height: 1; padding: 4px; }
  .uma-panel { position: fixed; z-index: 2147483001; right: max(16px, env(safe-area-inset-right)); bottom: calc(max(16px, env(safe-area-inset-bottom)) + 72px);
    width: 380px; height: min(600px, calc(100dvh - 120px)); background: #FAF8FF; color: #1C1433; border-radius: 24px; box-shadow: 0 24px 60px rgba(28,20,51,.3);
    display: none; flex-direction: column; overflow: hidden; border: 1px solid #E4DEF5; }
  .uma-panel.abierto { display: flex; }
  .uma-cab { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #fff; border-bottom: 1px solid #E4DEF5; }
  .uma-cab .uma-av { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; flex: none; }
  .uma-cab .uma-av svg { width: 40px; height: 40px; display: block; }
  .uma-cab b { display: block; font-size: 17px; }
  .uma-cab small { color: #6E6785; font-size: 13px; }
  .uma-cab .uma-x { margin-left: auto; width: 36px; height: 36px; border-radius: 10px; border: 1px solid #E4DEF5; background: #fff; cursor: pointer; font-size: 20px; color: #1C1433; }
  .uma-lista { flex: 1; overflow-y: auto; padding: 16px 14px 6px; font-size: 15.5px; line-height: 1.5; }
  .uma-m { margin: 0 0 14px; display: flex; }
  .uma-m.yo { justify-content: flex-end; }
  .uma-m.yo div { background: #6B4EFF; color: #fff; border-radius: 18px 18px 5px 18px; padding: 9px 13px; max-width: 85%; white-space: pre-wrap; word-wrap: break-word; }
  .uma-m.ella div { background: #fff; border: 1px solid #ECE7F8; border-radius: 18px 18px 18px 5px; padding: 10px 13px; max-width: 92%; word-wrap: break-word; }
  .uma-m p { margin: 0 0 8px; } .uma-m p:last-child { margin: 0; }
  .uma-m ul, .uma-m ol { margin: 4px 0 8px; padding-left: 20px; }
  .uma-m a { color: #5236E6; font-weight: 600; }
  .uma-wa { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; background: #1FAF5A; color: #fff !important; text-decoration: none; font-weight: 700; border-radius: 999px; padding: 10px 14px; }
  .uma-wa svg { width: 18px; height: 18px; }
  .uma-sug { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 8px; }
  .uma-sug button { border: 1px solid #DCD3F5; background: #fff; color: #3d2f6b; border-radius: 999px; padding: 7px 12px; font-size: 14px; cursor: pointer; }
  .uma-form { display: flex; gap: 8px; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #E4DEF5; }
  .uma-form textarea { flex: 1; resize: none; border: 1.5px solid #E4DEF5; border-radius: 18px; padding: 10px 12px; font-size: 16px; max-height: 110px; outline: 0; color: #1C1433; background: #FAF8FF; }
  .uma-form textarea:focus { border-color: #6B4EFF; }
  .uma-form button { width: 44px; height: 44px; border-radius: 50%; border: 0; background: #6B4EFF; color: #fff; cursor: pointer; flex: none; font-size: 20px; }
  .uma-form button:disabled { background: #CFC6EE; }
  .uma-puntos { display: inline-flex; gap: 4px; } .uma-puntos i { width: 7px; height: 7px; border-radius: 50%; background: #6B4EFF; opacity: .35; animation: uma-p 1s infinite; }
  .uma-puntos i:nth-child(2) { animation-delay: .15s; } .uma-puntos i:nth-child(3) { animation-delay: .3s; }
  @keyframes uma-p { 50% { opacity: 1; } }
  .uma-aviso { background: #FFE3D6; color: #7A3A1B; border-radius: 14px; padding: 10px 12px; }
  @media (max-width: 520px) {
    .uma-panel { right: 0; left: 0; bottom: 0; width: 100%; height: 100dvh; border-radius: 0; border: 0; }
  }
  @media (prefers-reduced-motion: reduce) { .uma-btn .u-ojos, .uma-puntos i { animation: none; } }`;

  const SUG = CONTEXTO === "sitios"
    ? ["¿Cuánto sale la página?", "Tengo una pizzería, ¿me sirve?", "¿Qué es eso del dominio?", "Contame un chiste"]
    : ["¿Qué podés hacer?", "Una receta rápida", "Contame un chiste"];
  const HOLA = CONTEXTO === "sitios"
    ? "¡Hola! Soy **Uma** 👋 Te ayudo con lo que quieras: dudas sobre tu página web, ideas para tu negocio o lo que se te ocurra. ¿En qué te doy una mano?"
    : "¡Hola! Soy **Uma** 👋 ¿En qué te ayudo?";
  const TIP = CONTEXTO === "sitios" ? "¿Dudas con tu página? <b>Preguntame</b>, te respondo al toque." : "¡Hola! Soy <b>Uma</b>, ¿charlamos?";
  const ERR = { sin_clave: "Uma todavía no está conectada.", limite: "Por hoy llegaste al límite de mensajes. ¡Volvé mañana!", cupo: "Estoy atendiendo a mucha gente, probá en un ratito.", clave: "Uma tuvo un problema de configuración.", ia: "Tuve un problema para responder, probá de nuevo.", red: "No me pude conectar. Revisá tu internet." };

  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const raiz = document.createElement("div"); raiz.className = "uma-w";
  raiz.innerHTML = `<button class="uma-btn" type="button" aria-label="Abrir chat con Uma">${CARA}</button>
    <div class="uma-panel" role="dialog" aria-label="Chat con Uma">
      <div class="uma-cab"><div class="uma-av">${CARA}</div><div><b>Uma</b><small class="uma-est">Asistente de dmith · En línea</small></div><button class="uma-x" type="button" aria-label="Cerrar">×</button></div>
      <div class="uma-lista" aria-live="polite"></div>
      <div class="uma-sug"></div>
      <form class="uma-form"><textarea rows="1" placeholder="Escribile a Uma…" aria-label="Mensaje"></textarea><button type="submit" aria-label="Enviar" disabled>↑</button></form>
    </div>`;
  document.body.appendChild(raiz);
  const $ = s => raiz.querySelector(s);
  const btn = $(".uma-btn"), panel = $(".uma-panel"), lista = $(".uma-lista"), ta = $("textarea"), env = $(".uma-form button");

  let msgs = []; try { msgs = JSON.parse(sessionStorage.getItem(KEY) || "[]"); } catch (e) {}
  const guardar = () => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30))); } catch (e) {} };
  let ocupada = false;

  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function md(s) {
    let wsp = null;
    s = s.replace(/\[\[WSP:\s*([\s\S]*?)\]\]/, (_, m) => { wsp = m.trim(); return ""; }).replace(/\[\[WSP:[^\]]*$/, "");
    const linkear = x => x.replace(/\b((?:https?:\/\/)?dmith\.app\/[^\s<)]*[^\s<).,])/g, u => `<a href="${u.startsWith("http") ? u : "https://" + u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//, "")}</a>`);
    const inl = x => linkear(x.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"));
    let out = "", lst = null; const cerrar = () => { if (lst) { out += `</${lst}>`; lst = null; } };
    for (const l of esc(s.trim()).split("\n")) {
      let m;
      if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (lst !== "ul") { cerrar(); out += "<ul>"; lst = "ul"; } out += `<li>${inl(m[1])}</li>`; }
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (lst !== "ol") { cerrar(); out += "<ol>"; lst = "ol"; } out += `<li>${inl(m[1])}</li>`; }
      else if (!l.trim()) cerrar();
      else { cerrar(); out += `<p>${inl(l.replace(/^#+\s*/, ""))}</p>`; }
    }
    cerrar();
    if (wsp && WA) out += `<a class="uma-wa" href="https://wa.me/${WA}?text=${encodeURIComponent(wsp)}" target="_blank" rel="noopener">${WSVG}Hablar con Diego por WhatsApp</a>`;
    return out;
  }
  function fila(role, html) { const d = document.createElement("div"); d.className = "uma-m " + (role === "user" ? "yo" : "ella"); const c = document.createElement("div"); if (role === "user") c.textContent = html; else c.innerHTML = html; d.appendChild(c); lista.appendChild(d); lista.scrollTop = lista.scrollHeight; return c; }
  function pintar() {
    lista.innerHTML = ""; fila("assistant", md(HOLA)); msgs.forEach(m => fila(m.role, m.role === "user" ? m.content : md(m.content)));
    $(".uma-sug").innerHTML = msgs.length ? "" : SUG.map(s => `<button type="button">${esc(s)}</button>`).join("");
  }
  function abrir() { panel.classList.add("abierto"); btn.style.display = "none"; const tip = raiz.querySelector(".uma-tip"); if (tip) tip.remove(); pintar(); if (!matchMedia("(pointer: coarse)").matches) ta.focus(); try { sessionStorage.setItem(KEY + "-visto", "1"); } catch (e) {} }
  function cerrarP() { panel.classList.remove("abierto"); btn.style.display = ""; }
  btn.addEventListener("click", abrir); $(".uma-x").addEventListener("click", cerrarP);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && panel.classList.contains("abierto")) cerrarP(); });
  $(".uma-sug").addEventListener("click", e => { const b = e.target.closest("button"); if (b) enviar(b.textContent); });
  ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 110) + "px"; env.disabled = ocupada || !ta.value.trim(); });
  ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !matchMedia("(pointer: coarse)").matches) { e.preventDefault(); enviar(ta.value); } });
  $(".uma-form").addEventListener("submit", e => { e.preventDefault(); enviar(ta.value); });

  async function enviar(texto) {
    texto = (texto || "").trim(); if (!texto || ocupada) return;
    $(".uma-sug").innerHTML = ""; msgs.push({ role: "user", content: texto }); fila("user", texto);
    ta.value = ""; ta.style.height = "auto"; ocupada = true; env.disabled = true; $(".uma-est").textContent = "Escribiendo…";
    const caja = fila("assistant", `<span class="uma-puntos"><i></i><i></i><i></i></span>`);
    let r, txt = "";
    try {
      r = await fetch("/api/uma/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensajes: msgs, lang: "es", contexto: CONTEXTO }) });
      if (!r.ok) { let e = "red"; try { e = (await r.json()).error; } catch (x) {} throw Object.assign(new Error(e), { tipo: e }); }
      const lec = r.body.getReader(), dec = new TextDecoder();
      for (;;) { const { value, done } = await lec.read(); if (done) break; txt += dec.decode(value, { stream: true }); caja.innerHTML = md(txt); lista.scrollTop = lista.scrollHeight; }
      if (!txt.trim()) throw Object.assign(new Error("vacia"), { tipo: "cupo" });
      msgs.push({ role: "assistant", content: txt }); guardar();
    } catch (e) { msgs.pop(); guardar(); caja.innerHTML = `<div class="uma-aviso">${esc(ERR[e.tipo] || ERR.red)}</div>`; }
    ocupada = false; $(".uma-est").textContent = "Asistente de dmith · En línea"; env.disabled = !ta.value.trim();
  }

  // cartelito de saludo, una sola vez por visita
  let visto = false; try { visto = !!sessionStorage.getItem(KEY + "-visto"); } catch (e) {}
  if (!visto) setTimeout(() => {
    if (panel.classList.contains("abierto")) return;
    const tip = document.createElement("div"); tip.className = "uma-tip"; tip.innerHTML = TIP + `<button type="button" aria-label="Cerrar">×</button>`;
    tip.addEventListener("click", e => { if (e.target.tagName === "BUTTON") { tip.remove(); try { sessionStorage.setItem(KEY + "-visto", "1"); } catch (x) {} } else abrir(); });
    raiz.appendChild(tip);
  }, 6000);
})();
