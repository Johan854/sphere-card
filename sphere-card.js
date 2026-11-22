{ // bloc isolé
/*
 * Sphere Card (FR)
 * Suivi et réglages des sphères vocales ESPHome (Xiaozhi / Spotpear) des enfants :
 * état de l'assistant, batterie, Wi-Fi, défis, histoires bonus, écran, volume, LED,
 * micro, sons, assistant, mot d'activation, zoom caméra, annonce vocale.
 * Style verre, thème clair/sombre automatique, éditeur visuel, textes en français.
 */
const CARD_VERSION = "1.0.0";

/* === NUANCE COMMUNE v2 (cartes Johan854) === */
const GV_NUANCES = [["braise", "Braise (rouge)", "#e0524f"], ["ocean", "Océan (bleu)", "#2f8fd8"], ["lagon", "Lagon (turquoise)", "#1fb5a8"], ["foret", "Forêt (vert)", "#3fae5a"], ["lavande", "Lavande (violet)", "#8a63d8"], ["framboise", "Framboise (rose)", "#e05597"], ["ambre", "Ambre (orange)", "#e8902c"], ["ardoise", "Ardoise (neutre)", "#7d8595"]];
const GV_DEFAULTS = { nuance: "theme", intensite: 1 };
const gvAccent = (c) => {
  const p = c && c.nuance_perso;
  if (c && c.nuance === "perso") {
    if (Array.isArray(p) && p.length === 3) return "#" + p.map((v) => Math.max(0, Math.min(255, Math.round(+v || 0))).toString(16).padStart(2, "0")).join("");
    if (typeof p === "string" && /^#?[0-9a-f]{6}$/i.test(p.trim())) return "#" + p.trim().replace("#", "");
  }
  const n = GV_NUANCES.find((x) => x[0] === (c && c.nuance));
  return n ? n[2] : "var(--carte-nuance)";
};
const gvStyle = (c, dark) => {
  const i = Number(c && c.intensite), ai = Number.isFinite(i) ? Math.max(0, Math.min(2, i)) : 1;
  const m = (pct, base) => `color-mix(in srgb,var(--acc-ui) ${+(pct * ai).toFixed(1)}%,${base})`;
  const bg = dark ? `linear-gradient(160deg,${m(5, "#1b1e32")} 0%,${m(11, "#1f1b2c")} 55%,${m(22, "#1c1620")} 100%)`
    : `linear-gradient(160deg,${m(2, "#f8f9fd")} 0%,${m(5, "#eef1f8")} 55%,${m(11, "#f8f8fa")} 100%)`;
  return `--acc-ui:${gvAccent(c)};--g-bg-x:${bg};--acc-ui-x:color-mix(in srgb,var(--acc-ui) ${dark ? "80%,#fff" : "82%,#000"})`;
};
const GV_FIELDS = [
  { name: "nuance", selector: { select: { mode: "dropdown", options: [{ value: "theme", label: "Selon le thème (couleurs d'origine)" }, ...GV_NUANCES.map((n) => ({ value: n[0], label: n[1] })), { value: "perso", label: "Personnalisée" }] } } },
  { name: "nuance_perso", selector: { color_rgb: {} } },
  { name: "intensite", selector: { number: { min: 0, max: 2, step: 0.1, mode: "slider" } } }];
const GV_LABELS = { nuance: "Nuance de couleur", nuance_perso: "Couleur personnalisée (nuance « Personnalisée »)", intensite: "Intensité de la nuance" };
/* === FIN NUANCE COMMUNE === */

const IMG = "https://github.com/Johan854/sphere-ai-images/raw/main/images";
const DEFAULTS = {
  name: "Sphère Shaun", theme: "auto", ...GV_DEFAULTS,
  prefix: "sphere_shaun",               // nom de l'appareil ESPHome dans les identifiants d'entités
  image: IMG + "/MaxDresseur/240x240/idle.png",
  counter: "counter.shaun_histoires_bonus", // compteur d'histoires bonus (facultatif)
  entities: {},                          // pour imposer une autre entité (clés : sat, mp, screen, led, ...)
  show_advanced: true,
};
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const BAD = ["unavailable", "unknown"];
const num = (st) => (st && !BAD.includes(st.state) && !isNaN(Number(st.state)) ? Number(st.state) : null);
const ETATS = {
  idle: ["Au repos", "mdi:sleep", "ok"], listening: ["Écoute", "mdi:microphone", "act"], processing: ["Réfléchit", "mdi:dots-horizontal-circle", "act"],
  responding: ["Répond", "mdi:account-voice", "act"], unavailable: ["Hors ligne", "mdi:lan-disconnect", "off"], unknown: ["Inconnu", "mdi:help-circle", "off"],
};
const WAKE = { no_wake_word: "Aucun", Alexa: "Alexa", "Hey Jarvis": "Hey Jarvis", "Okay Nabu": "Okay Nabu" };
const ent = (p) => ({
  sat: `assist_satellite.${p}_satellite_assist`, mp: `media_player.${p}`, screen: `light.${p}_screen`, led: `light.${p}`,
  mute: `switch.${p}_mute`, speaker: `switch.${p}_speaker_enable`, wake: `switch.${p}_wake_sound`, startup: `switch.${p}_startup_sound`, text: `switch.${p}_show_text`,
  bat: `sensor.${p}_batterie`, volt: `sensor.${p}_batterie_tension`, wifi: `sensor.${p}_${p}_wifi_signal_percent`, defis: `sensor.${p}_defis_reussis`,
  assistant: `select.${p}_assistant`, wakeword: `select.${p}_mot_d_activation`, zoom: `select.${p}_zoom_camera`, reset: `button.${p}_remise_a_zero_des_defis`,
});

class SphereCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._sig = ""; this._busy = false; this._msg = {}; this._armed = null; }
  static getConfigElement() { return document.createElement("sphere-card-editor"); }
  static getStubConfig() { return { ...DEFAULTS }; }
  setConfig(c) {
    this._config = { ...DEFAULTS, ...(c || {}) };
    if (!this._config.prefix) throw new Error("Indique le préfixe de la sphère (ex. prefix: sphere_shaun)");
    this._sig = ""; this._render();
  }
  getCardSize() { return 6; }
  _ids(s) { const e = { ...ent(s.prefix), ...(s.entities || {}) }; return { e, list: [...Object.values(e), s.counter].filter(Boolean) }; }
  set hass(h) {
    this._hass = h; const c = this._config; if (!c) return;
    const sig = this._ids(c).list.map((id) => { const st = h.states[id]; return st ? st.state + "|" + (st.attributes.brightness || "") + "|" + (st.attributes.volume_level || "") : "-"; }).join(",") + (h.themes && h.themes.darkMode);
    if (sig !== this._sig && !this._busy) { this._sig = sig; this._render(); }
  }
  _isDark() {
    const t = this._config.theme; if (t === "dark") return true; if (t === "light") return false;
    const dm = this._hass && this._hass.themes && this._hass.themes.darkMode;
    return typeof dm === "boolean" ? dm : !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  _etat(e) {
    const S = (id) => this._hass && this._hass.states[id];
    const sat = S(e.sat), mute = S(e.mute);
    if (!sat || BAD.includes(sat.state)) return ETATS.unavailable;
    if (mute && mute.state === "on" && sat.state === "idle") return ["Micro coupé", "mdi:microphone-off", "warn"];
    return ETATS[sat.state] || [sat.state, "mdi:robot", "ok"];
  }
  _render() {
    const c = this._config, h = this._hass; if (!c) return;
    const S = (id) => h && id && h.states[id];
    const on = (id) => { const s = S(id); return s && s.state === "on"; };
    const dark = this._isDark();
    const s = c, { e } = this._ids(s), st = this._etat(e), off = st[2] === "off";
    const bat = num(S(e.bat)), volt = num(S(e.volt)), wifi = num(S(e.wifi)), defis = num(S(e.defis)), stars = num(S(s.counter));
    const scr = S(e.screen), scrPct = scr && scr.state === "on" ? Math.round((scr.attributes.brightness || 0) / 2.55) : 0;
    const mp = S(e.mp), vol = mp && mp.attributes.volume_level != null ? Math.round(mp.attributes.volume_level * 100) : null;
    const batCol = bat == null ? "var(--mu)" : bat <= 20 ? "#e0524f" : bat <= 40 ? "#e8902c" : "#3fae5a";
    const tog = (id, label, icon, invert) => { const x = S(id); if (!x) return ""; const v = invert ? x.state !== "on" : x.state === "on";
      return `<button class="tg ${v ? "on" : ""}" data-tog="${esc(id)}" aria-pressed="${v}" ${BAD.includes(x.state) ? "disabled" : ""}><ha-icon icon="${icon}"></ha-icon>${label}</button>`; };
    const sel = (id, label, map) => { const x = S(id); if (!x) return ""; const opts = x.attributes.options || [];
      return `<label class="sl"><span>${label}</span><select data-sel="${esc(id)}" ${BAD.includes(x.state) ? "disabled" : ""}>${opts.map((o) => `<option value="${esc(o)}" ${o === x.state ? "selected" : ""}>${esc((map && map[o]) || (o === "preferred" ? "Préféré" : o))}</option>`).join("")}</select></label>`; };
    const msg = this._msg[s.prefix] || "";
    this.shadowRoot.innerHTML = `<style>
      * { box-sizing:border-box; }
      ha-card.dark { --tx:#f4f6fb; --mu:#a9afc0; --bg:var(--g-bg-x,linear-gradient(160deg,#1b1e32 0%,#1f1b2c 55%,#1c1620 100%)); --bd:rgba(255,255,255,.14); --sh:0 .6em 2em rgba(0,0,0,.35); --gl:rgba(255,255,255,.07); --glb:rgba(255,255,255,.13); --fi:rgba(255,255,255,.1); --fib:rgba(255,255,255,.18); }
      ha-card.light { --tx:#1c2030; --mu:#5d6477; --bg:var(--g-bg-x,linear-gradient(160deg,#f8f9fd 0%,#eef1f8 55%,#f8f8fa 100%)); --bd:rgba(20,24,40,.12); --sh:0 .4em 1.4em rgba(20,24,40,.12); --gl:rgba(255,255,255,.7); --glb:rgba(20,24,40,.1); --fi:rgba(20,24,40,.06); --fib:rgba(20,24,40,.14); }
      ha-card { --ac:var(--acc-ui-x,#8a63d8); display:flex; flex-direction:column; gap:12px; padding:16px; color:var(--tx); border-radius:24px; border:1px solid var(--bd); background:var(--bg); box-shadow:var(--sh); }
      .dot { width:.6em; height:.6em; border-radius:50%; background:#3fae5a; } .dot.act { background:#2f8fd8; } .dot.warn { background:#e8902c; } .dot.off { background:#e0524f; }
      .top { display:grid; grid-template-columns:auto minmax(0,1fr); gap:14px; align-items:center; }
      .pic { width:84px; height:84px; border-radius:50%; overflow:hidden; background:#000; border:3px solid ${off ? "#e0524f" : st[2] === "act" ? "#2f8fd8" : "var(--glb)"}; }
      .pic img { width:100%; height:100%; object-fit:cover; display:block; ${off ? "filter:grayscale(1) opacity(.6);" : ""} }
      .ttl b { font-size:1.05em; font-weight:650; } .chip { display:inline-flex; align-items:center; gap:.3em; margin-left:.4em; font-size:.75em; font-weight:700; padding:.15em .6em; border-radius:1em; vertical-align:middle; background:var(--fi); border:1px solid var(--fib); }
      .chip.act { background:#2f8fd8; color:#fff; border-color:#2f8fd8; } .chip.off { background:#e0524f; color:#fff; border-color:#e0524f; } .chip.warn { background:#e8902c; color:#fff; border-color:#e8902c; } .chip ha-icon { --mdc-icon-size:1.1em; }
      .meta { display:flex; flex-wrap:wrap; gap:10px; margin-top:6px; font-size:.82em; color:var(--mu); } .meta span { display:inline-flex; align-items:center; gap:.3em; } .meta ha-icon { --mdc-icon-size:1.2em; }
      .batt { display:inline-block; width:26px; height:12px; border:2px solid ${batCol}; border-radius:3px; position:relative; } .batt::after { content:""; position:absolute; right:-5px; top:2px; width:3px; height:4px; background:${batCol}; border-radius:1px; } .batt i { display:block; height:100%; width:${bat == null ? 0 : Math.max(4, Math.min(100, bat))}%; background:${batCol}; }
      .stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .st { padding:10px 12px; border-radius:16px; background:var(--gl); border:1px solid var(--glb); display:flex; align-items:center; gap:10px; }
      .st ha-icon { --mdc-icon-size:1.6em; color:var(--ac); } .st div { flex:1; min-width:0; } .st b { display:block; font-size:1.25em; font-variant-numeric:tabular-nums; } .st small { color:var(--mu); font-size:.75em; }
      .st .pm { display:flex; gap:4px; } .st .pm button { width:30px; height:30px; border-radius:50%; border:1px solid var(--fib); background:var(--fi); color:var(--tx); font:inherit; font-weight:700; cursor:pointer; }
      .box { display:flex; flex-direction:column; gap:10px; padding:12px; border-radius:16px; background:var(--gl); border:1px solid var(--glb); }
      .rg { display:grid; grid-template-columns:38px 5.5em minmax(0,1fr) 3.4em; align-items:center; gap:8px; font-size:.88em; }
      .rg ha-icon { --mdc-icon-size:1.3em; color:var(--mu); justify-self:center; } .rg output { text-align:right; font-variant-numeric:tabular-nums; font-weight:650; }
      input[type=range] { width:100%; accent-color:var(--ac); height:28px; }
      .rg .sw { width:38px; height:22px; border-radius:11px; border:1px solid var(--fib); background:var(--fi); position:relative; cursor:pointer; padding:0; }
      .rg .sw::after { content:""; position:absolute; top:2px; left:2px; width:16px; height:16px; border-radius:50%; background:var(--mu); transition:left .15s; }
      .rg .sw.on { background:var(--ac); border-color:var(--ac); } .rg .sw.on::after { left:18px; background:#fff; }
      .tgs { display:flex; flex-wrap:wrap; gap:6px; }
      .tg { font:inherit; font-size:.82em; font-weight:600; display:inline-flex; align-items:center; gap:.35em; min-height:38px; padding:.35em .85em; border-radius:2em; border:1px solid var(--fib); background:var(--fi); color:var(--mu); cursor:pointer; }
      .tg.on { background:color-mix(in srgb,var(--ac) 22%,transparent); border-color:var(--ac); color:var(--tx); } .tg ha-icon { --mdc-icon-size:1.15em; } .tg:disabled { opacity:.45; cursor:default; }
      .sels { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; }
      .sl { display:flex; flex-direction:column; gap:3px; font-size:.75em; color:var(--mu); }
      .sl select { font:inherit; font-size:1.15em; color:var(--tx); background:var(--fi); border:1px solid var(--fib); border-radius:10px; padding:.45em .5em; min-height:38px; }
      .sl select option { color:#1c2030; }
      .ann { display:flex; gap:6px; } .ann input { flex:1; min-width:0; font:inherit; color:var(--tx); background:var(--fi); border:1px solid var(--fib); border-radius:2em; padding:.55em 1em; min-height:40px; }
      .btn { font:inherit; font-size:.85em; font-weight:650; display:inline-flex; align-items:center; gap:.4em; padding:.5em 1em; min-height:40px; border-radius:2em; border:1px solid var(--fib); background:var(--fi); color:var(--tx); cursor:pointer; }
      .btn.main { background:var(--ac); border-color:var(--ac); color:#fff; } .btn.warn { background:#e8902c; border-color:#e8902c; color:#fff; } .btn ha-icon { --mdc-icon-size:1.2em; } .btn:disabled { opacity:.45; cursor:default; }
      .msg { font-size:.8em; color:var(--ac); min-height:1em; }
      .lbl { font-size:.72em; text-transform:uppercase; letter-spacing:.06em; color:var(--mu); font-weight:700; }
      button:focus-visible, select:focus-visible, input:focus-visible { outline:2px solid var(--ac); outline-offset:2px; }
      @media (max-width:420px) { .rg { grid-template-columns:38px minmax(0,1fr) 3.4em; } .rg .nm { display:none; } }
    </style>
    <ha-card class="${dark ? "dark" : "light"}" style="${gvStyle(c, dark)}">
      <div class="top">
        <div class="pic">${s.image ? `<img src="${esc(s.image)}" alt="">` : ""}</div>
        <div class="ttl"><b>${esc(s.name || "Sphère")}</b><span class="chip ${st[2]}"><ha-icon icon="${st[1]}"></ha-icon>${esc(st[0])}</span>
          <div class="meta">
            <span title="Batterie${volt != null ? " " + volt.toFixed(2) + " V" : ""}"><span class="batt"><i></i></span>${bat != null ? bat.toFixed(0) + " %" : "—"}${volt != null ? ` <small>(${volt.toFixed(2)} V)</small>` : ""}</span>
            <span><ha-icon icon="mdi:wifi${wifi == null ? "-off" : wifi > 70 ? "-strength-4" : wifi > 45 ? "-strength-3" : wifi > 25 ? "-strength-2" : "-strength-1"}"></ha-icon>${wifi != null ? wifi.toFixed(0) + " %" : "—"}</span>
          </div></div></div>
      <div class="stats">
        <div class="st"><ha-icon icon="mdi:star-circle"></ha-icon><div><b>${defis != null ? defis.toFixed(0) : "—"}</b><small>Défis réussis</small></div>
          ${S(e.reset) ? `<button class="btn ${this._armed === s.prefix ? "warn" : ""}" data-reset="${esc(e.reset)}" title="Remettre à zéro" aria-label="Remettre les défis à zéro"><ha-icon icon="mdi:restart"></ha-icon>${this._armed === s.prefix ? "Sûr ?" : ""}</button>` : ""}</div>
        ${s.counter && S(s.counter) ? `<div class="st"><ha-icon icon="mdi:book-open-variant"></ha-icon><div><b>${stars != null ? stars : "—"}</b><small>Histoires bonus</small></div>
          <div class="pm"><button data-cnt="decrement" aria-label="Retirer une histoire">−</button><button data-cnt="increment" aria-label="Offrir une histoire">+</button></div></div>` : ""}
      </div>
      <div class="box">
        <div class="lbl">Écran, son et lumière</div>
        ${scr ? `<div class="rg"><button class="sw ${scr.state === "on" ? "on" : ""}" data-tog="${esc(e.screen)}" aria-label="Écran allumé" aria-pressed="${scr.state === "on"}" ${off ? "disabled" : ""}></button><span class="nm">Écran</span><input type="range" min="5" max="100" step="5" value="${scrPct || 5}" data-bri="${esc(e.screen)}" aria-label="Luminosité de l'écran" ${off ? "disabled" : ""}><output>${scr.state === "on" ? scrPct + " %" : "éteint"}</output></div>` : ""}
        ${mp ? `<div class="rg"><ha-icon icon="mdi:volume-high"></ha-icon><span class="nm">Volume</span><input type="range" min="0" max="100" step="5" value="${vol != null ? vol : 0}" data-vol="${esc(e.mp)}" aria-label="Volume" ${off ? "disabled" : ""}><output>${vol != null ? vol + " %" : "—"}</output></div>` : ""}
        ${S(e.led) ? `<div class="rg"><button class="sw ${on(e.led) ? "on" : ""}" data-tog="${esc(e.led)}" aria-label="LED" aria-pressed="${on(e.led)}" ${off ? "disabled" : ""}></button><span class="nm">LED</span><span></span><output>${on(e.led) ? "allumée" : "éteinte"}</output></div>` : ""}
        <div class="tgs">
          ${tog(e.mute, "Micro", "mdi:microphone", true)}${tog(e.speaker, "Haut-parleur", "mdi:speaker")}${tog(e.wake, "Son de réveil", "mdi:bell-ring-outline")}${tog(e.startup, "Son de démarrage", "mdi:music-note")}${tog(e.text, "Texte à l'écran", "mdi:card-text-outline")}
        </div>
      </div>
      ${c.show_advanced ? `<div class="box"><div class="lbl">Assistant</div><div class="sels">${sel(e.assistant, "Assistant")}${sel(e.wakeword, "Mot d'activation", WAKE)}${sel(e.zoom, "Zoom caméra")}</div></div>` : ""}
      ${S(e.sat) ? `<div class="box"><div class="lbl">Message sur la sphère</div>
        <div class="ann"><input type="text" placeholder="Ex. : À table dans 5 minutes !" maxlength="200" aria-label="Message à annoncer" ${off ? "disabled" : ""}><button class="btn main" data-ann="${esc(e.sat)}" ${off ? "disabled" : ""}><ha-icon icon="mdi:bullhorn"></ha-icon>Annoncer</button></div>
        <div class="msg" aria-live="polite">${esc(msg)}</div></div>` : ""}
    </ha-card>`;
    const r = this.shadowRoot;
    const call = (d, sv, data) => h.callService(d, sv, data);
    r.querySelectorAll("[data-tog]").forEach((b) => b.addEventListener("click", () => { const id = b.dataset.tog; call(id.split(".")[0], "toggle", { entity_id: id }); }));
    r.querySelectorAll("select[data-sel]").forEach((x) => x.addEventListener("change", () => call("select", "select_option", { entity_id: x.dataset.sel, option: x.value })));
    const slide = (inp, fn, fmt) => {
      const out = inp.parentElement.querySelector("output");
      inp.addEventListener("pointerdown", () => { this._busy = true; });
      inp.addEventListener("input", () => { this._busy = true; if (out) out.textContent = fmt(inp.value); });
      inp.addEventListener("change", () => { fn(+inp.value); this._busy = false; this._sig = ""; });
    };
    r.querySelectorAll("[data-bri]").forEach((x) => slide(x, (v) => call("light", "turn_on", { entity_id: x.dataset.bri, brightness_pct: v }), (v) => v + " %"));
    r.querySelectorAll("[data-vol]").forEach((x) => slide(x, (v) => call("media_player", "volume_set", { entity_id: x.dataset.vol, volume_level: v / 100 }), (v) => v + " %"));
    r.querySelectorAll("[data-cnt]").forEach((b) => b.addEventListener("click", () => call("counter", b.dataset.cnt, { entity_id: s.counter })));
    r.querySelectorAll("[data-reset]").forEach((b) => b.addEventListener("click", () => {
      if (this._armed === s.prefix) { this._armed = null; clearTimeout(this._armT); call("button", "press", { entity_id: b.dataset.reset }); this._render(); return; }
      this._armed = s.prefix; this._render(); clearTimeout(this._armT); this._armT = setTimeout(() => { this._armed = null; this._render(); }, 4000);
    }));
    const inp = r.querySelector(".ann input");
    if (inp) {
      inp.addEventListener("focus", () => { this._busy = true; }); inp.addEventListener("blur", () => { this._busy = false; });
      if (this._draft) inp.value = this._draft; inp.addEventListener("input", () => { this._draft = inp.value; });
      const send = () => {
        const t = inp.value.trim(); if (!t) return; const p = s.prefix;
        call("assist_satellite", "announce", { entity_id: r.querySelector("[data-ann]").dataset.ann, message: t })
          .then(() => { this._msg[p] = "Message annoncé ✓"; }).catch((err) => { this._msg[p] = "Échec : " + ((err && err.message) || "sphère injoignable"); })
          .finally(() => { this._draft = ""; this._busy = false; this._render(); setTimeout(() => { this._msg[p] = ""; this._render(); }, 5000); });
      };
      r.querySelector("[data-ann]").addEventListener("click", send);
      inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") send(); });
    }
  }
}

const LABELS = { ...GV_LABELS, name: "Nom affiché", prefix: "Préfixe des entités (ex. sphere_shaun)", image: "Image du personnage (URL)", counter: "Compteur d'histoires bonus (facultatif)", show_advanced: "Afficher les réglages de l'assistant", theme: "Thème" };
class SphereCardEditor extends HTMLElement {
  setConfig(c) { this._config = { ...DEFAULTS, ...c }; if (!this._form) this._build(); else this._form.data = this._config; }
  set hass(h) { this._hass = h; if (this._form) this._form.hass = h; }
  _build() {
    const el = document.createElement("ha-form");
    el.hass = this._hass; el.data = this._config; el.computeLabel = (s) => LABELS[s.name] || s.name;
    el.schema = [
      { name: "name", selector: { text: {} } },
      { name: "prefix", selector: { text: {} } },
      { name: "image", selector: { text: {} } },
      { name: "counter", selector: { entity: { domain: "counter" } } },
      { type: "grid", name: "", schema: [
        { name: "show_advanced", selector: { boolean: {} } },
        { name: "theme", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: "Automatique" }, { value: "light", label: "Clair" }, { value: "dark", label: "Sombre" }] } } }] },
      { type: "expandable", name: "", title: "Nuance de couleur", schema: GV_FIELDS },
    ];
    el.addEventListener("value-changed", (ev) => { this._config = ev.detail.value; this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true })); });
    this._form = el; this.appendChild(el);
  }
}

if (!customElements.get("sphere-card")) customElements.define("sphere-card", SphereCard);
if (!customElements.get("sphere-card-editor")) customElements.define("sphere-card-editor", SphereCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((x) => x.type === "sphere-card")) window.customCards.push({ type: "sphere-card", name: "Sphere Card (FR)", description: "Suivi et réglages des sphères vocales des enfants", preview: true });
console.info(`%c SPHERE-CARD %c v${CARD_VERSION} `, "color:#fff;background:#8a63d8;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px", "color:#8a63d8;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px");
}
