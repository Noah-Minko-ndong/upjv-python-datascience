// Vitrine d'accueil : un carrousel « produit » par véhicule.
// Nom géant en capitales condensées, photo détourée au premier plan, ruban en forme de route qui
// serpente autour de la voiture, fond de palmes, éléments flottants en parallaxe, badge tournant,
// caractéristiques en pastilles, points et flèches pour passer au véhicule suivant.
import { gsap } from "gsap";

const SVGNS = "http://www.w3.org/2000/svg";
const deux = (n) => String(n).padStart(2, "0");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ————— Fond de palmes, dessiné par le code —————
function hasard(graine) {
  let s = graine;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// Une palme : nervure courbe et folioles effilées de part et d'autre.
function palme(r, x, y, angle, longueur, courbure) {
  const pts = [];
  const n = 26;
  const cx = x + Math.cos(angle) * longueur * 0.5 - Math.sin(angle) * courbure;
  const cy = y + Math.sin(angle) * longueur * 0.5 + Math.cos(angle) * courbure;
  const ex = x + Math.cos(angle) * longueur, ey = y + Math.sin(angle) * longueur;
  const point = (t) => [
    (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex,
    (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ey,
  ];
  let d = "";
  for (let i = 2; i <= n; i++) {
    const t = i / n;
    const [px, py] = point(t);
    const [qx, qy] = point(Math.min(1, t + 0.01));
    const tan = Math.atan2(qy - py, qx - px);
    const l = longueur * 0.42 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.75) * (0.85 + r() * 0.3);
    const w = l * 0.13;
    for (const cote of [-1, 1]) {
      const a = tan + cote * (0.75 + r() * 0.25) + 0.25; // folioles inclinées vers la pointe, légèrement tombantes
      const tx = px + Math.cos(a) * l, ty = py + Math.sin(a) * l;
      const mx = px + Math.cos(a) * l * 0.5, my = py + Math.sin(a) * l * 0.5;
      const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
      d += `M${px.toFixed(1)} ${py.toFixed(1)}Q${(mx + nx).toFixed(1)} ${(my + ny).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}Q${(mx - nx).toFixed(1)} ${(my - ny).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}Z`;
    }
  }
  const nervure = `M${x.toFixed(1)} ${y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  return { d, nervure };
}

function fondPalmes(svg) {
  const r = hasard(21);
  const W = 1600, H = 1000;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  const couches = [
    { classe: "palme-sombre", n: 9, taille: [520, 760] },
    { classe: "palme-moyenne", n: 8, taille: [420, 640] },
    { classe: "palme-vive", n: 7, taille: [360, 560] },
  ];
  let html = "";
  for (const c of couches) {
    for (let i = 0; i < c.n; i++) {
      // les palmes partent des bords et des coins vers l'intérieur
      const bord = i % 4;
      const x = bord === 0 ? -40 : bord === 1 ? W + 40 : r() * W;
      const y = bord === 2 ? -40 : bord === 3 ? H + 40 : r() * H;
      const versCentre = Math.atan2(H / 2 - y, W / 2 - x) + (r() - 0.5) * 1.3;
      const L = c.taille[0] + r() * (c.taille[1] - c.taille[0]);
      const p = palme(r, x, y, versCentre, L, (r() - 0.5) * L * 0.5);
      html += `<g class="${c.classe}"><path d="${p.d}"/><path class="nervure" d="${p.nervure}"/></g>`;
    }
  }
  svg.innerHTML = html;
}

// ————— Route-ruban —————
// Tracé commun (viewBox 1600 × 1000) : entre par la gauche à travers le nom, fait une boucle
// sous la voiture, ressort à droite.
const TRACE_ROUTE = "M-60 300 C 260 260, 420 420, 560 520 S 760 760, 900 740 S 1180 600, 1120 470 S 900 380, 960 560 S 1300 820, 1680 700";

function route(svg, avant) {
  svg.setAttribute("viewBox", "0 0 1600 1000");
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  svg.innerHTML = `
    ${avant ? '<defs><mask id="masque-route"><rect x="0" y="0" width="1600" height="1000" fill="black"/><rect x="780" y="560" width="900" height="460" fill="white"/></mask></defs>' : ""}
    <g ${avant ? 'mask="url(#masque-route)"' : ""}>
      <path class="route-ombre" d="${TRACE_ROUTE}"/>
      <path class="route-bande" d="${TRACE_ROUTE}"/>
      <path class="route-ligne" d="${TRACE_ROUTE}"/>
    </g>`;
}

// ————— Éléments flottants —————
const FLOTTANTS = [
  { type: "feuille", x: 14, y: 22, taille: 70, rot: -30, prof: 0.6 },
  { type: "roue", x: 78, y: 16, taille: 46, rot: 0, prof: 1.2 },
  { type: "feuille", x: 88, y: 62, taille: 96, rot: 140, prof: 0.9 },
  { type: "etincelle", x: 32, y: 70, taille: 14, rot: 0, prof: 1.6 },
  { type: "roue", x: 22, y: 84, taille: 34, rot: 0, prof: 0.8 },
  { type: "etincelle", x: 66, y: 30, taille: 10, rot: 0, prof: 2 },
  { type: "feuille", x: 58, y: 88, taille: 60, rot: 60, prof: 1.4 },
  { type: "etincelle", x: 92, y: 40, taille: 8, rot: 0, prof: 1.8 },
];
const FORMES = {
  feuille: '<svg viewBox="0 0 40 100"><path d="M20 100 Q44 50 20 0 Q-4 50 20 100Z" fill="currentColor"/><path d="M20 98 L20 6" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/></svg>',
  roue: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="currentColor"/><g fill="#FF5A1F"><circle cx="50" cy="50" r="7"/><ellipse cx="50" cy="24" rx="8" ry="10.5"/><ellipse cx="74.7" cy="42" rx="8" ry="10.5" transform="rotate(72 74.7 42)"/><ellipse cx="65.3" cy="71" rx="8" ry="10.5" transform="rotate(144 65.3 71)"/><ellipse cx="34.7" cy="71" rx="8" ry="10.5" transform="rotate(216 34.7 71)"/><ellipse cx="25.3" cy="42" rx="8" ry="10.5" transform="rotate(288 25.3 42)"/></g></svg>',
  etincelle: '<svg viewBox="0 0 20 20"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8Z" fill="currentColor"/></svg>',
};

export function vitrine({ racine, vehicules, valeur, prix, lienEssai, reduit, surPrete }) {
  const liste = vehicules.filter((v) => v.vitrine?.image);
  if (!liste.length) { racine.hidden = true; surPrete?.(); return; }

  // ————— Structure —————
  racine.innerHTML = `
    <svg class="vit-palmes" aria-hidden="true"></svg>
    <div class="vit-grain" aria-hidden="true"></div>
    <p class="vit-mot" aria-hidden="true"></p>
    <svg class="vit-route vit-route-arriere" aria-hidden="true"></svg>
    <div class="vit-voiture"><img alt="" decoding="async"></div>
    <svg class="vit-route vit-route-avant" aria-hidden="true"></svg>
    <div class="vit-flottants" aria-hidden="true">${FLOTTANTS.map((f) =>
      `<span class="vit-flottant vit-${f.type}" data-prof="${f.prof}" style="left:${f.x}%;top:${f.y}%;width:${f.taille}px;--rot:${f.rot}deg">${FORMES[f.type]}</span>`).join("")}</div>

    <div class="vit-gauche">
      <p class="vit-index"><span class="vit-num">01</span><span class="vit-total">/ ${deux(liste.length)}</span></p>
      <div class="vit-badge" aria-hidden="true">
        <svg viewBox="0 0 200 200"><defs><path id="cercle-badge" d="M100 100 m-78 0 a78 78 0 1 1 156 0 a78 78 0 1 1 -156 0"/></defs>
          <text><textPath href="#cercle-badge">BMB MOTORS • COCODY • ABIDJAN • SHOWROOM •</textPath></text></svg>
        <span class="vit-badge-centre">${FORMES.roue}</span>
      </div>
      <p class="vit-surtitre mono">— Exposé au showroom</p>
      <h2 class="vit-slogan"></h2>
      <p class="vit-texte"></p>
      <div class="vit-action">
        <a class="vit-essai magnetique" target="_blank" rel="noopener"><span>Réserver un essai</span><i aria-hidden="true">+</i></a>
        <p class="vit-prix"></p>
      </div>
    </div>

    <ul class="vit-specs" aria-label="Caractéristiques"></ul>

    <div class="vit-nav">
      <button type="button" class="vit-fleche vit-prec" aria-label="Véhicule précédent"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button>
      <div class="vit-points" role="tablist" aria-label="Choisir un véhicule">${liste.map((v, i) =>
        `<button type="button" role="tab" class="vit-point" aria-label="${esc(v.nom)}" data-i="${i}"><i></i></button>`).join("")}</div>
      <button type="button" class="vit-fleche vit-suiv" aria-label="Véhicule suivant"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
    </div>
    <p class="vit-annonce" aria-live="polite"></p>`;

  const $ = (s) => racine.querySelector(s);
  const mot = $(".vit-mot"), img = $(".vit-voiture img"), boite = $(".vit-voiture");
  fondPalmes($(".vit-palmes"));
  route($(".vit-route-arriere"), false);
  route($(".vit-route-avant"), true);
  const traits = [...racine.querySelectorAll(".route-bande, .route-ligne, .route-ombre")];
  const longueur = traits[0].getTotalLength ? traits[0].getTotalLength() : 3000;
  for (const t of traits) { t.style.strokeDasharray = t.classList.contains("route-ligne") ? "22 18" : `${longueur}`; }

  // Précharge toutes les photos ; la vitrine s'affiche dès que la première est prête.
  const images = liste.map((v) => { const i = new Image(); i.decoding = "async"; i.src = v.vitrine.image; return i; });
  const premiere = images[0].decode ? images[0].decode().catch(() => {}) : Promise.resolve();

  let actuel = -1, anim = null, minuterie = null, ouvert = true;
  const DUREE = 8000;

  function remplir(i) {
    const v = liste[i], t = v.vitrine;
    racine.style.setProperty("--vit-fond", t.fond);
    racine.style.setProperty("--vit-texte", t.texte);
    racine.style.setProperty("--vit-feuille", t.feuille);
    racine.style.setProperty("--vit-feuille-sombre", t.feuilleSombre);
    racine.dataset.cadrage = t.cadrage || "plein";
    mot.innerHTML = `<span class="vit-lettres">${[...String(v.nom).toUpperCase()].map((c) => `<span>${c === " " ? "&nbsp;" : esc(c)}</span>`).join("")}</span>`
      + `<em class="vit-categorie">${esc(v.categorie)}</em>`;
    mot.dataset.longueur = String(v.nom).length;
    img.src = t.image;
    img.alt = `${v.nom}, exposé au showroom BMB Motors`;
    $(".vit-num").textContent = deux(i + 1);
    $(".vit-slogan").innerHTML = (t.slogan || [v.nom]).map((l) => `<span class="l"><span>${esc(l)}</span></span>`).join("");
    $(".vit-texte").innerHTML = v.description ? esc(v.description) : "Exposé au showroom de Cocody. Fiche complète et essai sur demande.";
    const essai = lienEssai(v);
    const a = $(".vit-essai");
    a.href = essai || "#contact";
    if (essai) { a.target = "_blank"; } else { a.removeAttribute("target"); }
    $(".vit-prix").innerHTML = `<span class="mono">Prix</span>${prix(v.prix)}`;
    $(".vit-specs").innerHTML = [
      ["Moteur", v.moteur, "M4 7h11l3 3v7H4z M8 7V4h6 M18 12h3"],
      ["Puissance", v.puissance, "M13 2 4 14h7l-1 8 9-12h-7z"],
      ["Boîte", v.boite, "M6 4v16 M12 4v16 M18 4v8 M6 12h12"],
      ["Transmission", v.transmission, "M5 7a2 2 0 1 0 0 .01 M19 7a2 2 0 1 0 0 .01 M5 17a2 2 0 1 0 0 .01 M19 17a2 2 0 1 0 0 .01 M7 7h10 M7 17h10 M12 7v10"],
    ].map(([l, x, icone]) => `<li class="vit-spec"><span class="vit-spec-icone"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${icone}"/></svg></span><span class="vit-spec-texte"><span class="mono">${l}</span>${valeur(x)}</span></li>`).join("");
    racine.querySelectorAll(".vit-point").forEach((p, j) => { p.setAttribute("aria-selected", String(j === i)); p.tabIndex = j === i ? 0 : -1; });
    $(".vit-annonce").textContent = `${v.nom}, véhicule ${i + 1} sur ${liste.length}`;
    ajusterMot();
  }

  // Le nom occupe toute la largeur disponible, sans déborder.
  function ajusterMot() {
    mot.style.fontSize = "100px";
    const largeur = racine.clientWidth * (racine.clientWidth < 760 ? 0.92 : 0.74);
    const hauteurMax = racine.clientHeight * (racine.clientWidth < 760 ? 0.28 : 0.56);
    const lettres = [...mot.querySelectorAll(".vit-lettres > span")];
    const w = lettres.reduce((s, l) => s + l.getBoundingClientRect().width, 0) || 1;
    const taille = Math.min((100 * largeur) / w, hauteurMax / 0.8);
    mot.style.fontSize = `${taille}px`;
  }

  function aller(i, sens = 1) {
    i = (i + liste.length) % liste.length;
    if (i === actuel) return;
    const premiereFois = actuel < 0;
    anim?.progress(1);
    const sortir = () => {
      if (premiereFois || reduit) return Promise.resolve();
      return new Promise((ok) => {
        gsap.timeline({ onComplete: ok })
          .to(mot.querySelectorAll(".vit-lettres > span, em"), { yPercent: -110 * sens, duration: 0.5, ease: "power3.in", stagger: 0.03 }, 0)
          .to(boite, { xPercent: -30 * sens, opacity: 0, rotate: -4 * sens, filter: "blur(8px)", duration: 0.55, ease: "power3.in" }, 0)
          .to(traits.filter((t) => !t.classList.contains("route-ligne")), { strokeDashoffset: -longueur, duration: 0.6, ease: "power2.in" }, 0)
          .to(racine.querySelectorAll(".route-ligne"), { opacity: 0, duration: 0.3 }, 0)
          .to(racine.querySelectorAll(".vit-gauche > *, .vit-spec"), { y: -14, opacity: 0, duration: 0.35, stagger: 0.02, ease: "power2.in" }, 0);
      });
    };
    sortir().then(() => {
      actuel = i;
      remplir(i);
      if (reduit) { gsap.set(racine.querySelectorAll(".vit-gauche > *, .vit-spec"), { opacity: 1, y: 0 }); return; }
      anim = gsap.timeline()
        .set(traits.filter((t) => !t.classList.contains("route-ligne")), { strokeDashoffset: longueur })
        .fromTo(mot.querySelectorAll(".vit-lettres > span, em"), { yPercent: 110 * sens }, { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.05 }, 0.05)
        .fromTo(boite, { xPercent: 26 * sens, opacity: 0, scale: 0.94, rotate: 3 * sens, filter: "blur(10px)" },
          { xPercent: 0, opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)", duration: 1.3, ease: "expo.out" }, 0.1)
        .to(traits.filter((t) => !t.classList.contains("route-ligne")), { strokeDashoffset: 0, duration: 1.6, ease: "power3.inOut" }, 0.15)
        .fromTo(racine.querySelectorAll(".route-ligne"), { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.3)
        .fromTo(racine.querySelectorAll(".vit-gauche > *"), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: "power3.out" }, 0.3)
        .fromTo(racine.querySelectorAll(".vit-slogan .l > span"), { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: 0.08, ease: "expo.out" }, 0.45)
        .fromTo(racine.querySelectorAll(".vit-spec"), { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: "power3.out" }, 0.4);
    });
    relancer();
  }

  // défilement automatique, suspendu au survol, au toucher et quand la vitrine n'est pas visible
  let visible = true, suspendu = false;
  function relancer() {
    clearTimeout(minuterie);
    racine.style.setProperty("--vit-duree", `${DUREE}ms`);
    racine.classList.remove("vit-minute"); void racine.offsetWidth; racine.classList.add("vit-minute");
    if (reduit || liste.length < 2 || !ouvert) return;
    minuterie = setTimeout(() => { if (visible && !suspendu) aller(actuel + 1, 1); else relancer(); }, DUREE);
  }
  racine.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") suspendu = true; });
  racine.addEventListener("pointerleave", () => { suspendu = false; });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(racine);

  $(".vit-prec").addEventListener("click", () => aller(actuel - 1, -1));
  $(".vit-suiv").addEventListener("click", () => aller(actuel + 1, 1));
  $(".vit-points").addEventListener("click", (e) => {
    const b = e.target.closest(".vit-point");
    if (b) { const j = Number(b.dataset.i); aller(j, j > actuel ? 1 : -1); }
  });
  racine.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") aller(actuel + 1, 1);
    if (e.key === "ArrowLeft") aller(actuel - 1, -1);
  });
  // glisser du doigt
  let x0 = null, y0 = null;
  racine.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") { x0 = e.clientX; y0 = e.clientY; } });
  racine.addEventListener("pointerup", (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) aller(actuel + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    x0 = null;
  });

  // parallaxe : à la souris sur ordinateur, au défilement partout
  const flottants = [...racine.querySelectorAll(".vit-flottant")];
  if (!reduit) {
    const depl = flottants.map((f) => ({ x: gsap.quickTo(f, "x", { duration: 1, ease: "power3.out" }), y: gsap.quickTo(f, "y", { duration: 1, ease: "power3.out" }), p: Number(f.dataset.prof) }));
    const voitureX = gsap.quickTo(boite, "x", { duration: 1.2, ease: "power3.out" });
    const motX = gsap.quickTo(mot, "x", { duration: 1.4, ease: "power3.out" });
    racine.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = racine.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      for (const d of depl) { d.x(nx * 60 * d.p); d.y(ny * 40 * d.p); }
      voitureX(nx * -18);
      motX(nx * 24);
    });
    gsap.to(flottants, { yPercent: (i) => (i % 2 ? -1 : 1) * 30, rotate: (i) => (i % 2 ? 12 : -12), duration: (i) => 3 + (i % 3), ease: "sine.inOut", repeat: -1, yoyo: true });
    gsap.to(".vit-badge svg", { rotate: 360, duration: 22, ease: "none", repeat: -1 });
  }

  addEventListener("resize", ajusterMot);
  document.fonts?.ready.then(ajusterMot);
  // le défilement automatique attend la fin de l'écran d'ouverture
  ouvert = !document.body.classList.contains("intro-active");
  if (!ouvert) document.addEventListener("bmb:ouvert", () => { ouvert = true; relancer(); }, { once: true });
  premiere.then(() => { aller(0, 1); surPrete?.(); });
  return { aller };
}
