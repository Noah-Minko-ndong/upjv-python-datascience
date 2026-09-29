// Moteur de la visite 3D. Chargé à part (import dynamique) après l'affichage de la page.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { centrePlace } from "../plan.js";
import { construireDecor } from "./decor.js";
import { construireParcours } from "./parcours.js";
import { creerVehicule } from "./vehicules/index.js";
import { creerMaquette } from "./vehicules/maquette.js";
import { reglerAnisotropie, POLICE_TITRE } from "./textures.js";

const lisse = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function detecterQualite() {
  const force = new URLSearchParams(location.search).get("qualite");
  if (["bas", "moyen", "haut"].includes(force)) return force;
  const tactile = matchMedia("(pointer: coarse)").matches;
  const petit = Math.min(screen.width, screen.height) < 520;
  const memoire = navigator.deviceMemory || 4;
  const coeurs = navigator.hardwareConcurrency || 4;
  if (memoire <= 2 || (coeurs <= 4 && (petit || tactile))) return "bas";
  if (petit || tactile) return "moyen";
  return "haut";
}

async function chargerPolices() {
  if (!document.fonts?.load) return;
  const attente = new Promise((ok) => setTimeout(ok, 2500));
  await Promise.race([
    Promise.all([document.fonts.load(`900 100px ${POLICE_TITRE}`), document.fonts.load(`500 100px ${POLICE_TITRE}`)]),
    attente,
  ]).catch(() => {});
}

export async function demarrer({ canvas, conteneur, vehicules, ambiance, decoupage, amorti = 5.5, surProgres = () => {}, surImage = () => {} }) {
  const qualite = detecterQualite();
  const plafondPixels = { haut: 2, moyen: 1.5, bas: 1 }[qualite];
  surProgres(0.05);
  await chargerPolices();
  surProgres(0.15);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: qualite !== "bas", powerPreference: "high-performance", stencil: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, plafondPixels));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  reglerAnisotropie(Math.min(qualite === "bas" ? 4 : 8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.fog = new THREE.Fog(0xe9c9a8, 70, 260);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);

  // Lumières : soleil de fin d'après-midi dehors, éclairage zénithal dedans, et une
  // « douche » de lumière sur le véhicule qu'on regarde.
  const ciel = new THREE.HemisphereLight(0xfff1df, 0x8a847c, 1.1);
  const soleil = new THREE.DirectionalLight(0xffc084, 2.6);
  soleil.position.set(-22, 12, 20);
  const plafond = new THREE.DirectionalLight(0xffffff, 0);
  plafond.position.set(2, 10, 3);
  const douche = new THREE.SpotLight(0xfff4e4, 0, 14, 0.62, 0.75, 1.2);
  scene.add(ciel, soleil, plafond, douche, douche.target);
  surProgres(0.25);

  const decor = construireDecor({ scene, nbPlaces: vehicules.length, qualite });
  decor.nommerPlaces(vehicules);
  surProgres(0.55);

  const ctx = { qualite, largeurEcran: innerWidth };
  const voitures = vehicules.map((def, i) => {
    const v = creerVehicule(def, ctx);
    const c = centrePlace(i);
    v.objet.position.set(c.x, 0, c.z);
    v.objet.rotation.y = -Math.PI / 2; // l'avant regarde l'allée
    scene.add(v.objet);
    decor.miroir.add(v.reflet);
    return v;
  });
  decor.ambiance.forEach((pos, i) => {
    const def = ambiance[i % ambiance.length];
    const m = creerMaquette({ ...def, qualite: qualite === "haut" ? "moyen" : qualite });
    m.position.set(pos.x, 0, pos.z);
    m.rotation.y = pos.rotation;
    scene.add(m);
    if (qualite !== "bas") {
      const r = m.clone();
      decor.miroir.add(r);
    }
    const ombre = decor.places[0]?.groupe.children.at(-1)?.clone();
    if (ombre) { ombre.position.set(pos.x, 0.005, pos.z); scene.add(ombre); }
  });
  surProgres(0.75);

  // Fenêtres d'activité de chaque place (liseré et halo allumés, douche de lumière).
  const E = Object.fromEntries(decoupage.liste.map((e) => [e.id, e]));
  const fenetres = vehicules.map((_, i) => ({ de: E[`approche-${i}`].de, a: E[`tour-${i}`].a }));

  let parcours = null, portraitActuel = -1;
  const taille = { w: 1, h: 1 };
  function redimensionner() {
    const r = conteneur.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === taille.w && h === taille.h) return;
    taille.w = w; taille.h = h;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    const portrait = lisse(1.1, 0.55, aspect);
    camera.fov = THREE.MathUtils.lerp(50, 64, portrait);
    camera.updateProjectionMatrix();
    if (Math.abs(portrait - portraitActuel) > 0.04) {
      portraitActuel = portrait;
      parcours = construireParcours(vehicules, decoupage, { portrait });
    }
    sale = true;
  }

  // État animé
  let cible = 0, q = 0, sale = true;
  let decalageVoulu = () => ({ x: 0, y: 0 });
  const decalage = { x: 0, y: 0 };
  const pos = new THREE.Vector3(), vise = new THREE.Vector3();
  const activites = new Array(vehicules.length).fill(0);
  const infos = { angle: null };

  function appliquer() {
    parcours.echantillonner(q, pos, vise);
    camera.position.copy(pos);
    camera.lookAt(vise);

    // dehors → dedans
    const dehors = lisse(-1.5, 2.5, pos.z);
    soleil.intensity = 2.6 * dehors;
    plafond.intensity = 0.9 * (1 - dehors);
    ciel.intensity = THREE.MathUtils.lerp(0.5, 1.0, dehors);
    ciel.color.setHex(dehors > 0.5 ? 0xfff1df : 0xf6f7fb);
    scene.environmentIntensity = THREE.MathUtils.lerp(0.55, 0.45, dehors);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(0.9, 0.9, dehors);
    decor.lettres.emissiveIntensity = THREE.MathUtils.lerp(0.2, 0.6, dehors);
    decor.ouvrirPortes(lisse(8, 2.2, pos.z));

    // places
    let meilleure = -1, max = 0;
    fenetres.forEach((f, i) => {
      const a = lisse(f.de - 0.03, f.de + 0.02, q) * (1 - lisse(f.a - 0.005, f.a + 0.04, q));
      activites[i] = a;
      if (a > max) { max = a; meilleure = i; }
    });
    decor.eclairerPlaces(activites);
    infos.angle = null;
    if (meilleure >= 0) {
      const c = centrePlace(meilleure);
      // angle de la caméra autour du véhicule : 0° face à l'avant, croissant par son côté droit
      infos.angle = ((Math.atan2(c.z - pos.z, c.x - pos.x) * 180) / Math.PI + 360) % 360;
      douche.position.set(c.x - 1.2, 5.5, c.z + 0.4);
      douche.target.position.set(c.x, 0.4, c.z);
    }
    douche.intensity = 60 * max;

    // cadrage : la voiture se place dans la zone libre de l'écran (hors fiche)
    const d = decalageVoulu(q);
    decalage.x += (d.x - decalage.x) * 0.12;
    decalage.y += (d.y - decalage.y) * 0.12;
    if (Math.abs(decalage.x) > 0.5 || Math.abs(decalage.y) > 0.5) {
      camera.setViewOffset(taille.w, taille.h, -decalage.x, -decalage.y, taille.w, taille.h);
    } else camera.clearViewOffset();

    for (const v of voitures) v.maj(camera);
    return Math.abs(d.x - decalage.x) > 0.5 || Math.abs(d.y - decalage.y) > 0.5;
  }

  // Qualité adaptative : si l'appareil peine, on réduit la résolution.
  let ratio = renderer.getPixelRatio();
  const durees = [];
  let dernier = 0;
  function mesurer(t) {
    if (dernier) durees.push(t - dernier);
    dernier = t;
    if (durees.length >= 40) {
      durees.sort((a, b) => a - b);
      const mediane = durees[20];
      durees.length = 0;
      if (mediane > 28 && ratio > 0.8) {
        ratio = Math.max(0.8, ratio * 0.8);
        renderer.setPixelRatio(ratio);
        taille.w = 0; redimensionner();
      }
    }
  }

  let actif = true, boucle = 0, precedent = performance.now();
  function image(t) {
    boucle = requestAnimationFrame(image);
    const dt = Math.min(0.1, (t - precedent) / 1000);
    precedent = t;
    const ecart = cible - q;
    const bouge = Math.abs(ecart) > 0.00002;
    if (bouge) q += ecart * (1 - Math.exp(-dt * amorti));
    else q = cible;
    if (!bouge && !sale) { dernier = 0; return; }
    const encore = appliquer();
    renderer.render(scene, camera);
    surImage(q, infos);
    sale = encore;
    if (bouge) mesurer(t); else dernier = 0;
  }

  const observateur = new IntersectionObserver(([e]) => {
    actif = e.isIntersecting;
    if (actif && !boucle) { precedent = performance.now(); boucle = requestAnimationFrame(image); }
    if (!actif && boucle) { cancelAnimationFrame(boucle); boucle = 0; }
  });
  observateur.observe(conteneur);
  const ro = new ResizeObserver(() => redimensionner());
  ro.observe(conteneur);
  redimensionner();

  // Première image : compilée d'avance pour éviter un à-coup au premier défilement.
  appliquer();
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  surProgres(1);

  // Photos 360° ou modèles .glb : chargés ensuite, sans bloquer la visite.
  voitures.forEach((v) => v.charger(() => {}).then(() => { sale = true; }));

  return {
    qualite,
    definirProgression(p) { cible = Math.min(1, Math.max(0, p)); },
    sauterA(p) { cible = q = p; sale = true; },
    definirDecalage(fn) { decalageVoulu = fn; sale = true; },
    rafraichir() { sale = true; },
    get progression() { return q; },
    detruire() {
      cancelAnimationFrame(boucle); observateur.disconnect(); ro.disconnect(); renderer.dispose();
    },
  };
}
