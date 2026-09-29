// Point d'entrée : écran d'ouverture, menu, fiches, catalogue, contact et pilotage de la visite.
// Le moteur 3D (three.js) est chargé à part, une fois la page affichée.
import { CONTACT, VISITE, CATALOGUE, AMBIANCE } from "./donnees.js";
import { etapes, chapitres, fenetreFiche } from "./plan.js";
import { initialiserMouvement, revelerCartes } from "./animations.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const A_COMPLETER = '<span class="a-completer">À compléter</span>';
const val = (v) => (v == null || v === "" ? A_COMPLETER : esc(v));
const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const deux = (n) => String(n).padStart(2, "0");
const REDUIT = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function prixFCFA(n) {
  if (n == null) return A_COMPLETER;
  return `${esc(Number(n).toLocaleString("fr-FR"))}&nbsp;FCFA`;
}

// ————— Contact —————
function lienWhatsApp(message) {
  return CONTACT.whatsapp ? `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}` : null;
}
function lienTel() {
  return CONTACT.telephone ? `tel:${CONTACT.telephone.replace(/[^+\d]/g, "")}` : null;
}
// Tant qu'un numéro manque, le bouton renvoie vers la section contact au lieu d'un lien mort.
function bouton(classe, lien, texte, externe = false) {
  const cible = externe && lien ? ' target="_blank" rel="noopener"' : "";
  return `<a class="bouton ${classe}" href="${esc(lien || "#contact")}"${cible}><span>${texte}</span></a>`;
}
const FLECHE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function remplirContact() {
  for (const el of $$("[data-contact]")) {
    const k = el.dataset.contact;
    el.innerHTML = k === "adresse" ? `${CONTACT.adresse ? esc(CONTACT.adresse) + ", " : A_COMPLETER + " — "}${esc(CONTACT.ville)}` : val(CONTACT[k]);
  }
  const msg = "Bonjour BMB Motors, je souhaite des informations sur un véhicule.";
  for (const el of $$("[data-actions-contact]")) {
    const compact = el.dataset.actionsContact === "compact";
    el.innerHTML =
      bouton(`bouton-plein${compact ? "" : " magnetique"}`, lienTel(), "Appeler") +
      bouton(`bouton-ligne${compact ? "" : " magnetique"}`, lienWhatsApp(msg), "WhatsApp", true) +
      bouton(`bouton-ligne${compact ? "" : " magnetique"}`, CONTACT.itineraire, "Itinéraire", true);
  }
  const lignes = [
    { titre: "Appeler", detail: CONTACT.telephone ? esc(CONTACT.telephone) : "Numéro à compléter", lien: lienTel() },
    { titre: "WhatsApp", detail: CONTACT.whatsapp ? "Réponse rapide, photos et devis" : "Numéro WhatsApp à compléter", lien: lienWhatsApp(msg), externe: true },
    { titre: "Itinéraire", detail: `${CONTACT.adresse ? esc(CONTACT.adresse) + " — " : ""}${esc(CONTACT.ville)}`, lien: CONTACT.itineraire, externe: true },
  ];
  $("[data-lignes-contact]").innerHTML = lignes.map((l) =>
    `<a class="ligne-lien" href="${esc(l.lien || "#contact")}"${l.externe && l.lien ? ' target="_blank" rel="noopener"' : ""}>
      <span class="ligne-titre">${l.titre}</span><span class="ligne-detail mono">${l.detail}</span><span class="ligne-fleche">${FLECHE}</span>
    </a>`).join("");
}

// Heure d'Abidjan dans la barre de navigation et le pied de page.
function horloge() {
  const f = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Abidjan", hour: "2-digit", minute: "2-digit" });
  const maj = () => { const t = f.format(new Date()); for (const el of $$("#heure, [data-heure]")) el.textContent = t; };
  maj();
  setInterval(maj, 20000);
}

// ————— Menu plein écran —————
function menu(mouvement) {
  const b = $("#bouton-menu"), m = $("#menu");
  const ouvrir = (o) => {
    b.setAttribute("aria-expanded", String(o));
    b.querySelector(".nav-menu-texte").textContent = o ? "Fermer" : "Menu";
    document.body.classList.toggle("menu-ouvert", o);
    if (o) { m.hidden = false; requestAnimationFrame(() => m.classList.add("ouvert")); mouvement.lenis?.stop(); }
    else { m.classList.remove("ouvert"); setTimeout(() => { if (!m.classList.contains("ouvert")) m.hidden = true; }, 800); mouvement.lenis?.start(); }
    $("main").inert = o;
  };
  b.addEventListener("click", () => ouvrir(b.getAttribute("aria-expanded") !== "true"));
  m.addEventListener("click", (e) => { if (e.target.closest("a")) ouvrir(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && b.getAttribute("aria-expanded") === "true") { ouvrir(false); b.focus(); } });
}

// ————— Écran d'ouverture —————
function intro() {
  const el = $("#intro"), compteur = $("#intro-compteur"), barre = $("#intro-barre");
  $$(".intro-marque span").forEach((s, i) => { s.style.animationDelay = `${0.15 + i * 0.045}s`; });
  if (REDUIT) { el.remove(); return { progres() {}, terminer(cb) { cb?.(); } }; }
  document.body.classList.add("intro-active");
  const debut = performance.now();
  let affiche = 0, cible = 0.1, fini = false, surFin = null, ferme = false, precedent = debut;
  const boucle = () => {
    if (ferme) return;
    // le compteur avance au moins au rythme du temps, et suit le chargement réel du showroom
    const maintenant = performance.now();
    const temps = Math.min(0.9, (maintenant - debut) / 2200);
    const but = fini ? 1 : Math.max(cible, temps);
    // rattrapage indexé sur le temps écoulé, pas sur le nombre d'images : même vitesse sur tous les appareils
    const dt = Math.min(0.25, (maintenant - precedent) / 1000);
    precedent = maintenant;
    affiche += (but - affiche) * (1 - Math.exp(-dt * 7));
    compteur.textContent = String(Math.round(affiche * 100)).padStart(3, "0");
    barre.style.transform = `scaleX(${affiche})`;
    if (fini && affiche > 0.99) { compteur.textContent = "100"; fermer(); return; }
    requestAnimationFrame(boucle);
  };
  requestAnimationFrame(boucle);
  function fermer() {
    ferme = true;
    el.classList.add("fin");
    document.body.classList.remove("intro-active");
    surFin?.();
    document.dispatchEvent(new Event("bmb:ouvert"));
    setTimeout(() => el.remove(), 1300);
  }
  // sécurité : on n'attend jamais plus de 6 secondes
  setTimeout(() => { fini = true; }, 6000);
  return {
    progres(x) { cible = Math.max(cible, Math.min(1, x)); },
    terminer(cb) { surFin = cb; setTimeout(() => { fini = true; }, Math.max(0, 1300 - (performance.now() - debut))); },
  };
}

// ————— Fiches de la visite —————
function ficheVisite(v, i, n) {
  const maquette = (v.rendu?.type || "maquette") === "maquette";
  const essai = lienWhatsApp(`Bonjour BMB Motors, je souhaite essayer le véhicule ${v.nom}${v.version ? " " + v.version : ""}.`);
  return `<article class="panneau fiche" data-panneau="fiche-${i}" aria-label="Fiche du véhicule ${esc(v.nom)}">
    <header class="fiche-tete">
      <p class="etiquette"><span class="point" aria-hidden="true"></span>Place P${i + 1} — ${esc(v.categorie)}</p>
      <p class="fiche-angle mono" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg><span data-angle>000°</span></p>
    </header>
    <h2 class="fiche-nom"><span class="l"><span>${esc(v.nom)}</span></span></h2>
    <p class="fiche-version">Version · ${val(v.version)}</p>
    <p class="fiche-texte">${val(v.description)}</p>
    <dl class="fiche-specs">
      <div><dt class="mono">Moteur</dt><dd>${val(v.moteur)}</dd></div>
      <div><dt class="mono">Puissance</dt><dd>${val(v.puissance)}</dd></div>
      <div><dt class="mono">Boîte</dt><dd>${val(v.boite)}</dd></div>
      <div><dt class="mono">Transmission</dt><dd>${val(v.transmission)}</dd></div>
    </dl>
    <div class="fiche-pied">
      <p class="fiche-prix"><span class="mono">Prix</span><strong>${prixFCFA(v.prix)}</strong></p>
      ${bouton("bouton-plein magnetique", essai, "Réserver un essai", true)}
    </div>
    <p class="fiche-note">${maquette ? `Visuel 3D provisoire — place ${i + 1} sur ${n}.` : `Défilez pour tourner autour — place ${i + 1} sur ${n}.`}</p>
  </article>`;
}

// ————— Catalogue —————
function catalogue() {
  const zCat = $("#filtre-categorie"), zEn = $("#filtre-energie"), zGrille = $("#grille"), zCompte = $("#compte"), zPos = $("#galerie-position");
  const uniques = (k) => [...new Set(CATALOGUE.map((v) => v[k]).filter(Boolean))];
  const cats = ["Tous", ...uniques("categorie")];
  const energies = uniques("energie");
  const etat = { categorie: "Tous", energie: "Toutes" };

  function carte(v) {
    const idx = VISITE.findIndex((x) => x.id === v.visite);
    const details = [v.energie, v.boite, v.etat].filter(Boolean).join(" · ") || "Détails à compléter";
    const essai = lienWhatsApp(`Bonjour BMB Motors, je souhaite essayer le véhicule ${v.nom}.`);
    return `<article class="vehicule">
      <a class="vehicule-media" href="${idx >= 0 ? "#visite" : esc(essai || "#contact")}"${idx >= 0 ? ` data-aller="tour-${idx}"` : ""} aria-label="${esc(v.nom)}${idx >= 0 ? " — voir sur sa place" : ""}">
        <img loading="lazy" src="${esc(v.photo)}" style="object-position:${esc(v.cadrage || "center")};transform-origin:${esc(v.cadrage || "center")};transform:scale(${Number(v.zoom) || 1})" alt="${esc(v.alt || v.nom)}">
        <span class="vehicule-cat mono">${esc(v.categorie)}</span>
        ${idx >= 0 ? `<span class="vehicule-p3d mono">3D · P${idx + 1}</span>` : ""}
        <span class="vehicule-nom">${esc(v.nom)}</span>
      </a>
      <div class="vehicule-infos"><span class="vehicule-details mono">${esc(details)}</span><span class="vehicule-prix">${prixFCFA(v.prix)}</span></div>
      <div class="vehicule-actions">
        <a class="lien-fleche orange" href="${esc(essai || "#contact")}"${essai ? ' target="_blank" rel="noopener"' : ""}>Réserver un essai</a>
        ${idx >= 0 ? `<a class="lien-fleche" href="#visite" data-aller="tour-${idx}">Voir sur sa place</a>` : ""}
      </div>
    </article>`;
  }
  function segments(zone, liste, cle, libelle) {
    zone.innerHTML = (libelle ? `<span class="segments-libelle mono">${libelle}</span>` : '<span class="indicateur" aria-hidden="true"></span>') +
      liste.map((c) => `<button type="button" class="segment" aria-pressed="${c === etat[cle]}" data-valeur="${esc(c)}">${esc(c)}</button>`).join("");
    placerIndicateur(zone);
  }
  function placerIndicateur(zone) {
    const ind = zone.querySelector(".indicateur"), actif = zone.querySelector('[aria-pressed="true"]');
    if (!ind || !actif) return;
    ind.style.width = `${actif.offsetWidth}px`;
    ind.style.transform = `translateX(${actif.offsetLeft}px)`;
  }
  function rendre() {
    segments(zCat, cats, "categorie");
    if (energies.length) segments(zEn, ["Toutes", ...energies], "energie", "Énergie"); else zEn.hidden = true;
    const liste = CATALOGUE.filter((v) => (etat.categorie === "Tous" || v.categorie === etat.categorie) && (etat.energie === "Toutes" || v.energie === etat.energie));
    zCompte.textContent = `(${deux(liste.length)})`;
    zGrille.innerHTML = liste.length ? liste.map(carte).join("") :
      `<div class="vide"><p>Aucun véhicule ne correspond à ces filtres.</p><button type="button" class="bouton bouton-ligne bouton-petit" id="reinitialiser"><span>Voir tous les véhicules</span></button></div>`;
    zGrille.scrollLeft = 0;
    majPosition();
    revelerCartes($$(".vehicule", zGrille));
  }
  function majPosition() {
    const cartes = $$(".vehicule", zGrille);
    if (!cartes.length) { zPos.textContent = ""; return; }
    const pas = cartes[1] ? cartes[1].offsetLeft - cartes[0].offsetLeft : 1;
    const i = Math.min(cartes.length - 1, Math.max(0, Math.round(zGrille.scrollLeft / pas)));
    zPos.textContent = `${deux(i + 1)} / ${deux(cartes.length)} — faites glisser`;
  }
  zGrille.addEventListener("scroll", majPosition, { passive: true });
  for (const [zone, cle] of [[zCat, "categorie"], [zEn, "energie"]]) {
    zone.addEventListener("click", (e) => {
      const b = e.target.closest(".segment");
      if (!b) return;
      etat[cle] = b.dataset.valeur;
      rendre();
      zone.querySelector(`[data-valeur="${CSS.escape(etat[cle])}"]`)?.focus();
    });
  }
  zGrille.addEventListener("click", (e) => {
    if (e.target.closest("#reinitialiser")) { etat.categorie = "Tous"; etat.energie = "Toutes"; rendre(); }
  });
  addEventListener("resize", () => placerIndicateur(zCat));
  document.fonts?.ready.then(() => placerIndicateur(zCat));
  rendre();
}

// ————— Visite pilotée par le défilement —————
function visite(mouvement, ouverture) {
  const section = $("#visite"), ecran = $("#visite-ecran");
  const decoupage = etapes(VISITE);
  const chaps = chapitres(VISITE, decoupage);
  const E = Object.fromEntries(decoupage.liste.map((e) => [e.id, e]));
  section.style.setProperty("--unites", decoupage.unites.toFixed(2));

  $(".panneau-fin").insertAdjacentHTML("beforebegin", VISITE.map((v, i) => ficheVisite(v, i, VISITE.length)).join(""));

  const fenetres = [
    { el: $('[data-panneau="accueil"]'), de: -1, a: E.arrivee.a + (E.entree.a - E.entree.de) * 0.12, cadrer: "bureau" },
    ...VISITE.map((_, i) => ({ el: $(`[data-panneau="fiche-${i}"]`), ...fenetreFiche(decoupage, i), cadrer: "toujours", fiche: true })),
    { el: $('[data-panneau="fin"]'), de: E.sortie.de + (E.sortie.a - E.sortie.de) * 0.6, a: 2 },
  ];
  const angles = fenetres.map((f) => f.el.querySelector("[data-angle]"));

  // chapitres
  const barre = $("#chapitres-barre"), liste = $("#chapitres-liste");
  barre.innerHTML = chaps.map((c) => `<span class="chap" style="flex:${(c.a - c.de).toFixed(4)}"><i></i></span>`).join("");
  liste.innerHTML = chaps.map((c, i) => `<li><button type="button" data-chap="${i}"><span>${deux(i + 1)}</span>${esc(c.titre)}</button></li>`).join("");
  $("#chap-total").textContent = deux(chaps.length);
  const segmentsBarre = $$(".chap i", barre), items = $$("li", liste);

  function progressionDefilement() {
    const r = section.getBoundingClientRect();
    const course = r.height - innerHeight;
    return course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 0;
  }
  function allerA(p) {
    const course = section.offsetHeight - innerHeight;
    mouvement.allerA(section.offsetTop + p * course + 2);
  }
  liste.addEventListener("click", (e) => {
    const b = e.target.closest("[data-chap]");
    if (b) allerA(chaps[Number(b.dataset.chap)].de + 0.002);
  });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-aller]");
    if (!a || section.classList.contains("visite--statique")) return;
    const etape = E[a.dataset.aller];
    if (!etape) return;
    e.preventDefault();
    // au milieu du tour : la voiture est de profil, la fiche est affichée
    allerA(a.dataset.aller.startsWith("tour") ? etape.de + (etape.a - etape.de) * 0.45 : etape.de + 0.001);
  });

  let chapActuel = -1, indiceVu = false, ficheActive = false;
  function majPanneaux(q, infos) {
    let avecFiche = false;
    fenetres.forEach((f, i) => {
      const visible = q >= f.de && q < f.a;
      if (f.el.classList.contains("actif") !== visible) {
        f.el.classList.toggle("actif", visible);
        f.el.inert = !visible;
      }
      if (visible && f.fiche) {
        avecFiche = true;
        if (angles[i] && infos?.angle != null) angles[i].textContent = `${String(Math.round(infos.angle)).padStart(3, "0")}°`;
      }
    });
    if (avecFiche !== ficheActive) { ficheActive = avecFiche; ecran.classList.toggle("avec-fiche", avecFiche); }
    chaps.forEach((c, i) => {
      segmentsBarre[i].style.transform = `scaleX(${Math.min(1, Math.max(0, (q - c.de) / (c.a - c.de)))})`;
    });
    const i = chaps.findIndex((c) => q >= c.de && q < c.a);
    const k = i < 0 ? chaps.length - 1 : i;
    if (k !== chapActuel) {
      chapActuel = k;
      $("#chap-num").textContent = deux(k + 1);
      $("#chap-titre").textContent = chaps[k].titre;
      items.forEach((li, j) => li.classList.toggle("actif", j === k));
    }
    if (!indiceVu && q > 0.01) { indiceVu = true; $("#indice").classList.add("cache"); }
  }

  // Zone libre de l'écran (hors texte) pour y centrer la voiture ou la façade.
  function decalage(q) {
    const f = fenetres.find((x) => x.cadrer && q >= x.de - 0.02 && q < x.a + 0.02);
    const large = ecran.clientWidth >= 900;
    if (!f || (f.cadrer === "bureau" && !large)) return { x: 0, y: 0 };
    const sortie = 1 - lisse(f.a - 0.01, f.a + 0.02, q);
    const force = f.de < 0 ? sortie : lisse(f.de - 0.02, f.de + 0.01, q) * sortie;
    const e = ecran.getBoundingClientRect();
    if (f.cadrer === "bureau") return { x: 0, y: force * -(e.height * 0.12) }; // la façade monte au-dessus du titre
    const r = f.el.getBoundingClientRect();
    if (large) return { x: force * ((r.right - e.left + 24) / 2), y: 0 };
    const hautLibre = 110, basLibre = r.top - e.top - 8;
    return { x: 0, y: force * ((hautLibre + basLibre) / 2 - e.height / 2) };
  }

  let moteur = null, enAttente = false;
  function surDefilement() {
    const p = progressionDefilement();
    if (moteur) moteur.definirProgression(p); else majPanneaux(p);
  }
  const planifier = () => {
    if (enAttente) return;
    enAttente = true;
    requestAnimationFrame(() => { enAttente = false; surDefilement(); });
  };
  if (mouvement.lenis) mouvement.lenis.on("scroll", planifier); else addEventListener("scroll", planifier, { passive: true });
  addEventListener("resize", surDefilement);
  surDefilement();

  const economie = navigator.connection?.saveData;
  const webgl = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } })();

  function modeStatique(raison) {
    section.classList.add("visite--statique");
    $("#visite-statique").hidden = false;
    for (const f of fenetres) { f.el.classList.add("actif"); f.el.inert = false; }
    ouverture.terminer();
    const b = $("#forcer-3d");
    if (raison !== "webgl") {
      b.hidden = false;
      b.onclick = () => {
        section.classList.remove("visite--statique");
        $("#visite-statique").hidden = true;
        for (const f of fenetres) f.el.classList.remove("actif");
        lancer();
      };
    }
    mouvement.rafraichir();
  }

  async function lancer() {
    try {
      const { demarrer } = await import("./visite/visite.js");
      moteur = await demarrer({
        canvas: $("#visite-canvas"),
        conteneur: ecran,
        vehicules: VISITE,
        ambiance: AMBIANCE,
        decoupage,
        amorti: mouvement.lenis ? 9 : 5.5,
        surProgres: (x) => ouverture.progres(0.1 + x * 0.9),
        surImage: majPanneaux,
      });
      moteur.definirDecalage(decalage);
      moteur.sauterA(progressionDefilement());
      window.bmbVisite = moteur; // accès pour les tests et la console
      section.classList.add("visite--prete");
      ouverture.terminer();
    } catch (e) {
      console.error("BMB Motors : la visite 3D n'a pas pu démarrer.", e);
      modeStatique("webgl");
    }
  }

  if (!webgl) modeStatique("webgl");
  else if (REDUIT || economie) modeStatique("choix");
  else lancer();

  // Barre de contact mobile : visible une fois la visite passée.
  const barreMobile = $("#barre-mobile");
  new IntersectionObserver(([e]) => barreMobile.classList.toggle("visible", !e.isIntersecting && e.boundingClientRect.top < 0)).observe(section);
}

const ouverture = intro();
const mouvement = initialiserMouvement({ reduit: REDUIT });
if (document.body.classList.contains("intro-active")) {
  mouvement.lenis?.stop();
  document.addEventListener("bmb:ouvert", () => mouvement.lenis?.start(), { once: true });
}
remplirContact();
horloge();
menu(mouvement);
visite(mouvement, ouverture);
catalogue();
