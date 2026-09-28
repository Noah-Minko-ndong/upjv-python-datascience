// Point d'entrée : fiches, catalogue, contact et pilotage de la visite par le défilement.
// Le moteur 3D (three.js) est chargé à part, une fois la page affichée.
import { CONTACT, VISITE, CATALOGUE, AMBIANCE } from "./donnees.js";
import { etapes, chapitres, fenetreFiche } from "./plan.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const A_COMPLETER = '<span class="a-completer">À compléter</span>';
const val = (v) => (v == null || v === "" ? A_COMPLETER : esc(v));
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function prixFCFA(n) {
  if (n == null) return A_COMPLETER;
  return `${esc(Number(n).toLocaleString("fr-FR"))}&nbsp;FCFA`;
}

// ————— Liens de contact —————
function lienWhatsApp(message) {
  if (!CONTACT.whatsapp) return null;
  return `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}
function lienTel() {
  return CONTACT.telephone ? `tel:${CONTACT.telephone.replace(/[^+\d]/g, "")}` : null;
}
const ICONES = {
  tel: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  wa: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.8-2-1-1 1a4 4 0 0 1-2.7-2.7l1-1-1-2z"/></svg>',
  route: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
};
// Tant qu'un numéro manque, le bouton renvoie vers la section contact au lieu d'un lien mort.
function bouton(classe, lien, icone, texte, externe = false) {
  const href = lien || "#contact";
  const cible = externe && lien ? ' target="_blank" rel="noopener"' : "";
  return `<a class="btn ${classe}" href="${esc(href)}"${cible}>${icone}<span>${texte}</span></a>`;
}
function remplirContact() {
  for (const el of $$("[data-contact]")) {
    const k = el.dataset.contact;
    el.innerHTML = k === "adresse" ? `${val(CONTACT.adresse)}${CONTACT.adresse ? ", " : " · "}${esc(CONTACT.ville)}` : val(CONTACT[k]);
  }
  const msg = "Bonjour BMB Motors, je souhaite des informations sur un véhicule.";
  for (const el of $$("[data-actions-contact]")) {
    el.innerHTML =
      bouton("btn-bmb", lienTel(), ICONES.tel, "Appeler") +
      bouton("btn-ligne", lienWhatsApp(msg), ICONES.wa, "WhatsApp", true) +
      bouton("btn-ligne", CONTACT.itineraire, ICONES.route, "Itinéraire", true);
  }
  for (const el of $$("[data-itineraire]")) el.href = CONTACT.itineraire;
}

// ————— Fiches de la visite —————
function ficheVisite(v, i, n) {
  const maquette = (v.rendu?.type || "maquette") === "maquette";
  const titre = v.version ? `${esc(v.nom)} <span class="fiche-version">${esc(v.version)}</span>` : `${esc(v.nom)} <span class="fiche-version">${A_COMPLETER}</span>`;
  return `<article class="panneau fiche-visite" data-panneau="fiche-${i}" aria-label="Fiche du véhicule ${esc(v.nom)}">
    <p class="fiche-place"><span class="pastille">P${i + 1}</span>Place ${i + 1} sur ${n} · ${esc(v.categorie)}</p>
    <h2>${titre}</h2>
    <p class="fiche-description">${val(v.description)}</p>
    <dl class="specs">
      <div><dt>Moteur</dt><dd>${val(v.moteur)}</dd></div>
      <div><dt>Puissance</dt><dd>${val(v.puissance)}</dd></div>
      <div><dt>Boîte</dt><dd>${val(v.boite)}</dd></div>
      <div><dt>Transmission</dt><dd>${val(v.transmission)}</dd></div>
    </dl>
    <div class="fiche-pied">
      <p class="fiche-prix"><span>Prix</span><strong>${prixFCFA(v.prix)}</strong></p>
      ${bouton("btn-bmb", lienWhatsApp(`Bonjour BMB Motors, je souhaite essayer le véhicule ${v.nom}${v.version ? " " + v.version : ""}.`), ICONES.wa, "Demander un essai", true)}
    </div>
    <p class="fiche-note">${maquette ? "Visuel 3D provisoire, en attendant les photos du véhicule." : "Faites défiler pour tourner autour du véhicule."}</p>
  </article>`;
}

// ————— Catalogue —————
function catalogue() {
  const zCat = $("#filtre-categorie"), zEn = $("#filtre-energie"), zGrille = $("#grille"), zCompte = $("#compte");
  const uniques = (k) => [...new Set(CATALOGUE.map((v) => v[k]).filter(Boolean))];
  const cats = ["Toutes", ...uniques("categorie")];
  const energies = uniques("energie");
  const etat = { categorie: "Toutes", energie: "Toutes" };

  function puces(v) {
    return [v.energie, v.boite, v.etat].filter(Boolean).map((p) => `<span>${esc(p)}</span>`).join("");
  }
  function carte(v) {
    const idx = VISITE.findIndex((x) => x.id === v.visite);
    const voir = idx >= 0 ? `<a class="lien-visite" href="#visite" data-aller="tour-${idx}">Voir sur sa place P${idx + 1}</a>` : "";
    return `<article class="carte">
      <div class="carte-img"><img loading="lazy" src="${esc(v.photo)}" style="object-position:${esc(v.cadrage || "center")};transform-origin:${esc(v.cadrage || "center")};transform:scale(${Number(v.zoom) || 1})" alt="${esc(v.alt || v.nom)}"><span class="carte-cat">${esc(v.categorie)}</span></div>
      <div class="carte-corps">
        <h3>${esc(v.nom)} <span class="fiche-version">${v.version ? esc(v.version) : ""}</span></h3>
        <div class="puces">${puces(v)}</div>
        <p class="carte-prix"><span>Prix</span><strong>${prixFCFA(v.prix)}</strong></p>
        <div class="carte-actions">
          ${bouton("btn-bmb btn-petit", lienWhatsApp(`Bonjour BMB Motors, je souhaite essayer le véhicule ${v.nom}.`), "", "Demander un essai", true)}
          ${voir}
        </div>
      </div>
    </article>`;
  }
  function chips(zone, liste, cle) {
    zone.innerHTML = `<span class="filtres-libelle">${zone.getAttribute("aria-label")}</span>` + liste.map((c) => `<button type="button" class="filtre" aria-pressed="${c === etat[cle]}" data-valeur="${esc(c)}">${esc(c)}</button>`).join("");
  }
  function rendre() {
    chips(zCat, cats, "categorie");
    if (energies.length) chips(zEn, ["Toutes", ...energies], "energie"); else zEn.hidden = true;
    const liste = CATALOGUE.filter((v) => (etat.categorie === "Toutes" || v.categorie === etat.categorie) && (etat.energie === "Toutes" || v.energie === etat.energie));
    zCompte.textContent = `${liste.length} véhicule${liste.length > 1 ? "s" : ""}`;
    zGrille.innerHTML = liste.length ? liste.map(carte).join("") :
      `<div class="vide"><p>Aucun véhicule ne correspond à ces filtres.</p><button type="button" class="btn btn-ligne btn-petit" id="reinitialiser">Voir tous les véhicules</button></div>`;
  }
  for (const [zone, cle] of [[zCat, "categorie"], [zEn, "energie"]]) {
    zone.addEventListener("click", (e) => {
      const b = e.target.closest(".filtre");
      if (!b) return;
      etat[cle] = b.dataset.valeur;
      rendre();
      zone.querySelector(`[data-valeur="${CSS.escape(etat[cle])}"]`)?.focus();
    });
  }
  zGrille.addEventListener("click", (e) => {
    if (e.target.id === "reinitialiser") { etat.categorie = etat.energie = "Toutes"; rendre(); }
  });
  rendre();
}

// ————— Visite pilotée par le défilement —————
function visite() {
  const section = $("#visite"), ecran = $("#visite-ecran");
  const decoupage = etapes(VISITE);
  const chaps = chapitres(VISITE, decoupage);
  const E = Object.fromEntries(decoupage.liste.map((e) => [e.id, e]));
  section.style.setProperty("--unites", decoupage.unites.toFixed(2));

  // fiches
  $(".panneau-fin").insertAdjacentHTML("beforebegin", VISITE.map((v, i) => ficheVisite(v, i, VISITE.length)).join(""));

  // fenêtres d'affichage des panneaux
  const fenetres = [
    { el: $('[data-panneau="accueil"]'), de: -1, a: E.arrivee.a + (E.entree.a - E.entree.de) * 0.12, fiche: true, bureauSeul: true },
    ...VISITE.map((_, i) => ({ el: $(`[data-panneau="fiche-${i}"]`), ...fenetreFiche(decoupage, i), fiche: true })),
    { el: $('[data-panneau="fin"]'), de: E.sortie.de + (E.sortie.a - E.sortie.de) * 0.6, a: 2 },
  ];

  // barre des chapitres
  const barre = $("#chapitres-barre"), titre = $("#chapitres-titre");
  barre.innerHTML = chaps.map((c) => `<span class="chap" style="flex:${(c.a - c.de).toFixed(4)}"><i></i></span>`).join("");
  const segments = $$(".chap i", barre);

  function progressionDefilement() {
    const r = section.getBoundingClientRect();
    const course = r.height - innerHeight;
    return course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 0;
  }
  function allerA(p) {
    const r = section.getBoundingClientRect();
    const course = r.height - innerHeight;
    const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollTo({ top: scrollY + r.top + p * course + 2, behavior: reduit ? "auto" : "smooth" });
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-aller]");
    if (!a || section.classList.contains("visite--statique")) return;
    const id = a.dataset.aller;
    const etape = E[id];
    if (!etape) return;
    e.preventDefault();
    // au milieu du tour : la voiture est de profil, la fiche est affichée
    allerA(id.startsWith("tour") ? etape.de + (etape.a - etape.de) * 0.45 : etape.de + 0.001);
  });

  let chapActuel = -1, indiceVu = false;
  function majPanneaux(q) {
    for (const f of fenetres) {
      const visible = q >= f.de && q < f.a;
      if (f.el.classList.contains("actif") !== visible) {
        f.el.classList.toggle("actif", visible);
        f.el.inert = !visible;
      }
    }
    chaps.forEach((c, i) => {
      segments[i].style.transform = `scaleX(${Math.min(1, Math.max(0, (q - c.de) / (c.a - c.de)))})`;
    });
    const i = chaps.findIndex((c) => q >= c.de && q < c.a);
    const k = i < 0 ? chaps.length - 1 : i;
    if (k !== chapActuel) { chapActuel = k; titre.textContent = chaps[k].titre; }
    if (!indiceVu && q > 0.01) { indiceVu = true; $("#indice").classList.add("cache"); }
  }

  // Zone libre de l'écran (hors fiche) pour y centrer la voiture.
  function decalage(q) {
    const f = fenetres.find((x) => x.fiche && q >= x.de - 0.02 && q < x.a + 0.02);
    if (!f || (f.bureauSeul && ecran.clientWidth < 900)) return { x: 0, y: 0 };
    const force = lisse(f.de - 0.02, f.de + 0.01, q) * (1 - lisse(f.a - 0.01, f.a + 0.02, q));
    const r = f.el.getBoundingClientRect(), e = ecran.getBoundingClientRect();
    const hautLibre = 70; // barre de navigation et chapitres
    if (e.width >= 900) {
      const libreX = r.right - e.left + 24;
      return { x: force * (libreX / 2), y: 0 };
    }
    const basLibre = r.top - e.top - 8;
    return { x: 0, y: force * ((hautLibre + basLibre) / 2 - e.height / 2) };
  }

  let moteur = null;
  let enAttente = false;
  function surDefilement() {
    const p = progressionDefilement();
    if (moteur) moteur.definirProgression(p);
    else majPanneaux(p);
  }
  addEventListener("scroll", () => {
    if (enAttente) return;
    enAttente = true;
    requestAnimationFrame(() => { enAttente = false; surDefilement(); });
  }, { passive: true });
  addEventListener("resize", surDefilement);
  surDefilement();

  // Faut-il la 3D ? Pas si les animations sont réduites, en mode économie de données, ou sans WebGL.
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const economie = navigator.connection?.saveData;
  const webgl = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } })();

  function modeStatique(raison) {
    section.classList.add("visite--statique");
    $("#visite-statique").hidden = false;
    $("#chargement").hidden = true;
    for (const f of fenetres) { f.el.classList.add("actif"); f.el.inert = false; }
    const bouton = $("#forcer-3d");
    if (raison !== "webgl") {
      bouton.hidden = false;
      bouton.onclick = () => {
        section.classList.remove("visite--statique");
        $("#visite-statique").hidden = true;
        $("#chargement").hidden = false;
        for (const f of fenetres) f.el.classList.remove("actif");
        lancer();
      };
    }
  }

  async function lancer() {
    const texte = $("#chargement-texte");
    try {
      const { demarrer } = await import("./visite/visite.js");
      moteur = await demarrer({
        canvas: $("#visite-canvas"),
        conteneur: ecran,
        vehicules: VISITE,
        ambiance: AMBIANCE,
        decoupage,
        surProgres: (x) => { texte.textContent = `Préparation du showroom… ${Math.round(x * 100)} %`; },
        surImage: majPanneaux,
      });
      moteur.definirDecalage(decalage);
      window.bmbVisite = moteur; // accès pour les tests et la console
      moteur.sauterA(progressionDefilement());
      section.classList.add("visite--prete");
      setTimeout(() => { $("#chargement").hidden = true; }, 600);
    } catch (e) {
      console.error("BMB Motors : la visite 3D n'a pas pu démarrer.", e);
      modeStatique("webgl");
    }
  }

  if (!webgl) modeStatique("webgl");
  else if (reduit || economie) modeStatique("choix");
  else {
    // on laisse la page s'afficher d'abord
    const go = () => lancer();
    if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 600 }); else setTimeout(go, 150);
  }

  // Barre de contact mobile : visible une fois la visite passée.
  const barreMobile = $("#barre-mobile");
  new IntersectionObserver(([e]) => barreMobile.classList.toggle("visible", !e.isIntersecting && e.boundingClientRect.top < 0))
    .observe(section);
}

remplirContact();
visite();
catalogue();
