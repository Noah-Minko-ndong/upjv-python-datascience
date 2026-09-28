// Véhicule affiché à partir d'une série de photos détourées prises autour de lui.
// L'image montrée dépend de l'angle réel de la caméra autour de la voiture :
// quand la caméra fait le tour, on enchaîne les photos, et le décor bouge derrière de façon cohérente.
//
// Convention des photos (voir assets/vehicules/LISEZMOI.md) :
//   image 00 = face avant, puis on tourne autour du véhicule en passant par son côté droit
//   (côté passager), à pas réguliers, jusqu'à revenir devant.
import * as THREE from "three";

function chargerImage(url) {
  return new Promise((ok, echec) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => ok(img));
    img.onerror = () => echec(new Error(`Photo introuvable : ${url}`));
    img.src = url;
  });
}

export function creerPhotos360(rendu, { largeurEcran }) {
  const n = rendu.nombre || 36;
  const ext = rendu.extension || "webp";
  // Petites images sur téléphone, grandes sur ordinateur (deux jeux produits par outils/preparer_360.py).
  const dossier = rendu.dossier.replace(/\/?$/, "/") + (largeurEcran < 900 ? "960/" : "1600/");
  const url = (k) => `${dossier}${String(k).padStart(2, "0")}.${ext}`;
  const images = new Array(n).fill(null);

  const texture = new THREE.Texture();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;

  const largeur = rendu.largeurImage || 6.2;
  const sol = rendu.sol ?? 0.08;
  let hauteur = largeur * 0.62; // corrigé au chargement d'après le format réel des images
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.02, depthWrite: true, toneMapped: false });
  const panneau = new THREE.Mesh(geo, mat);
  const groupe = new THREE.Group();
  groupe.add(panneau);

  // Reflet dans le marbre : la même photo, placée dans le monde miroir sous le sol.
  const matReflet = mat.clone();
  matReflet.alphaTest = 0.02;
  const panneauReflet = new THREE.Mesh(geo, matReflet);
  const reflet = new THREE.Group();
  reflet.add(panneauReflet);

  function dimensionner(img) {
    hauteur = largeur * (img.naturalHeight / img.naturalWidth);
    // le reflet est placé dans le « monde miroir » (retourné sous le sol) : même réglage que l'original
    for (const p of [panneau, panneauReflet]) {
      p.scale.set(largeur, hauteur, 1);
      p.position.y = hauteur * (0.5 - sol);
    }
  }

  let actuelle = -1;
  function montrer(k) {
    // on prend la photo chargée la plus proche de l'angle voulu
    let meilleur = -1;
    for (let d = 0; d <= n / 2; d++) {
      if (images[(k + d) % n]) { meilleur = (k + d) % n; break; }
      if (images[(k - d + n) % n]) { meilleur = (k - d + n) % n; break; }
    }
    if (meilleur < 0 || meilleur === actuelle) return false;
    actuelle = meilleur;
    texture.image = images[meilleur];
    texture.needsUpdate = true;
    return true;
  }

  const v = new THREE.Vector3();
  const inverse = new THREE.Matrix4();
  return {
    groupe,
    reflet,
    // Chargement en deux temps : une photo sur trois d'abord (le tour est déjà fluide), puis le reste.
    async charger(progression = () => {}) {
      const ordre = [];
      for (let k = 0; k < n; k += 3) ordre.push(k);
      for (let k = 0; k < n; k++) if (k % 3) ordre.push(k);
      const premiere = await chargerImage(url(0));
      images[0] = premiere;
      dimensionner(premiere);
      montrer(0);
      let faites = 1;
      const suite = async (liste) => {
        await Promise.all(liste.map(async (k) => {
          try { images[k] = await chargerImage(url(k)); } catch (e) { /* photo manquante : on garde la voisine */ }
          progression(++faites / n);
        }));
      };
      await suite(ordre.slice(1, Math.ceil(n / 3)));
      suite(ordre.slice(Math.ceil(n / 3))); // en arrière-plan
    },
    // Oriente le panneau vers la caméra et choisit la photo. Renvoie true si l'image a changé.
    maj(camera, objet) {
      objet.updateMatrixWorld();
      inverse.copy(objet.matrixWorld).invert();
      v.copy(camera.position).applyMatrix4(inverse);
      const azimut = Math.atan2(-v.x, v.z); // 0 devant, positif côté droit du véhicule
      const k = Math.round((((azimut / (Math.PI * 2)) % 1 + 1) % 1) * n) % n;
      const angle = Math.atan2(v.x, v.z);
      panneau.rotation.y = angle;
      panneauReflet.rotation.y = angle;
      return montrer(k);
    },
  };
}
