// Mouvement de la page : défilement doux (Lenis), révélations au défilement (GSAP ScrollTrigger),
// bandeau défilant sensible à la vitesse, boutons magnétiques et curseur personnalisé.
// Avec « animations réduites », rien ne bouge et tout le contenu reste visible.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const souris = () => matchMedia("(hover: hover) and (pointer: fine)").matches;

export function initialiserMouvement({ reduit }) {
  let lenis = null;
  if (!reduit) {
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Liens internes : défilement doux jusqu'à la section
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute("data-aller") || e.defaultPrevented) return;
    const id = a.getAttribute("href");
    const cible = id === "#haut" ? 0 : document.querySelector(id);
    if (cible == null) return;
    e.preventDefault();
    allerA(cible);
  });

  function allerA(cible) {
    if (lenis) lenis.scrollTo(cible, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else if (typeof cible === "number") scrollTo(0, cible);
    else cible.scrollIntoView();
  }

  if (!reduit) {
    document.documentElement.classList.add("js-anim");
    revelations();
    bandeau();
    if (souris()) { magnetiques(); curseur(); }
  }
  navigationQuiSeCache(lenis);
  return { lenis, allerA, rafraichir: () => ScrollTrigger.refresh() };
}

function revelations() {
  // titres : chaque ligne monte depuis son masque
  gsap.utils.toArray(".revele-lignes").forEach((titre) => {
    gsap.from(titre.querySelectorAll(".l > span"), {
      yPercent: 108, duration: 1.2, ease: "expo.out", stagger: 0.09,
      scrollTrigger: { trigger: titre, start: "top 88%" },
    });
  });
  // textes et blocs : fondu montant
  gsap.utils.toArray(".section-intro, .atouts, .contact-grille, .filtres, .section-tete .etiquette, .showroom-texte .etiquette, .contact > .etiquette").forEach((el) => {
    gsap.from(el, { y: 28, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" } });
  });
  // images : rideau qui se lève, image qui se pose
  gsap.utils.toArray(".revele-image").forEach((fig) => {
    const img = fig.querySelector("img");
    const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: "top 85%" } });
    tl.to(fig, { clipPath: "inset(0% 0 0 0)", duration: 1.3, ease: "expo.inOut" })
      .from(img, { scale: 1.3, duration: 1.8, ease: "expo.out" }, 0.1);
  });
  // parallaxe douce dans les cadres
  gsap.utils.toArray(".parallaxe").forEach((el) => {
    gsap.fromTo(el, { yPercent: -Number(el.dataset.vitesse || 0) / 2 }, {
      yPercent: Number(el.dataset.vitesse || 0) / 2, ease: "none",
      scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
  // pied de page : la marque monte en place
  gsap.from(".pied-marque", { yPercent: 40, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".pied", start: "top 90%" } });
}

// Cartes du catalogue (appelé à chaque changement de filtre)
export function revelerCartes(cartes) {
  if (!document.documentElement.classList.contains("js-anim")) return;
  gsap.fromTo(cartes, { y: 40, opacity: 0 }, {
    y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.07,
    scrollTrigger: { trigger: cartes[0]?.parentElement, start: "top 88%", once: true },
  });
}

function bandeau() {
  const piste = document.getElementById("bandeau-piste");
  if (!piste) return;
  piste.innerHTML += piste.innerHTML; // deux copies pour une boucle sans couture
  const boucle = gsap.to(piste, { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
  let sens = 1;
  ScrollTrigger.create({
    trigger: ".bandeau", start: "top bottom", end: "bottom top",
    onUpdate: (st) => {
      const v = st.getVelocity();
      if (v !== 0) sens = v > 0 ? 1 : -1;
      const vitesse = gsap.utils.clamp(1, 5, 1 + Math.abs(v) / 600);
      gsap.to(boucle, { timeScale: vitesse * sens, duration: 0.2, overwrite: true });
      gsap.to(boucle, { timeScale: sens, duration: 1.2, delay: 0.2, overwrite: false });
    },
  });
}

function magnetiques() {
  document.querySelectorAll(".magnetique").forEach((el) => {
    const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.25);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener("pointerleave", () => { x(0); y(0); });
  });
}

function curseur() {
  const c = document.getElementById("curseur");
  if (!c) return;
  const x = gsap.quickTo(c, "x", { duration: 0.35, ease: "power3.out" });
  const y = gsap.quickTo(c, "y", { duration: 0.35, ease: "power3.out" });
  addEventListener("pointermove", (e) => { x(e.clientX); y(e.clientY); }, { passive: true });
  document.addEventListener("pointerover", (e) => {
    const voir = e.target.closest(".vehicule-media");
    const lien = e.target.closest("a, button");
    c.classList.toggle("voir", !!voir);
    c.classList.toggle("survol", !voir && !!lien);
  });
  document.addEventListener("pointerleave", () => c.classList.remove("voir", "survol"));
}

// La barre de navigation s'efface quand on descend dans les sections, revient quand on remonte.
function navigationQuiSeCache(lenis) {
  const nav = document.getElementById("nav");
  const visite = document.getElementById("visite");
  let dernier = scrollY;
  const maj = () => {
    const y = scrollY;
    const apresVisite = visite ? y > visite.offsetTop + visite.offsetHeight - innerHeight : y > 200;
    nav.classList.toggle("cachee", apresVisite && y > dernier + 4 && !document.body.classList.contains("menu-ouvert"));
    if (y < dernier - 4 || !apresVisite) nav.classList.remove("cachee");
    dernier = y;
  };
  if (lenis) lenis.on("scroll", maj); else addEventListener("scroll", maj, { passive: true });
}
