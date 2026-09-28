// Maquettes 3D génériques : des silhouettes volontairement simples (tout-terrain, SUV),
// sans reproduire le design d'un constructeur. Elles servent en attendant les photos 360°
// ou un modèle sous licence, et de voitures d'ambiance dans le showroom.
// Repère local : l'avant de la voiture regarde +z, les roues touchent y = 0.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const cacheMateriaux = new Map();

function materiaux(couleur, toit, qualite) {
  const cle = `${couleur}|${toit}|${qualite}`;
  if (cacheMateriaux.has(cle)) return cacheMateriaux.get(cle);
  const peinture = (c) => qualite === "haut"
    ? new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.45, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.06 })
    : new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.28 });
  const m = {
    caisse: peinture(couleur),
    toit: peinture(toit || couleur),
    vitre: new THREE.MeshStandardMaterial({ color: 0x0b0e12, metalness: 0.9, roughness: 0.06 }),
    plastique: new THREE.MeshStandardMaterial({ color: 0x1a1c1f, metalness: 0.1, roughness: 0.72 }),
    pneu: new THREE.MeshStandardMaterial({ color: 0x0f1011, metalness: 0, roughness: 0.92 }),
    jante: new THREE.MeshStandardMaterial({ color: 0x5f646b, metalness: 0.85, roughness: 0.32 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.14 }),
    phare: new THREE.MeshStandardMaterial({ color: 0xf4f6f8, emissive: 0xfff3dc, emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.1 }),
    feu: new THREE.MeshStandardMaterial({ color: 0x6b0a0a, emissive: 0xe0141a, emissiveIntensity: 0.7, roughness: 0.3 }),
  };
  cacheMateriaux.set(cle, m);
  return m;
}

// Accumule des géométries par matériau, puis les fusionne : 1 appel de dessin par matériau.
class Atelier {
  constructor() { this.parts = new Map(); }
  ajouter(nom, geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = {}) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    );
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
    if (!this.parts.has(nom)) this.parts.set(nom, []);
    this.parts.get(nom).push(g);
  }
  boite(nom, l, h, p, pos, rayon = 0.06, seg = 2) {
    this.ajouter(nom, rayon > 0 ? new RoundedBoxGeometry(l, h, p, seg, rayon) : new THREE.BoxGeometry(l, h, p), pos);
  }
  construire(mats) {
    const groupe = new THREE.Group();
    for (const [nom, geos] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(geos), mats[nom]);
      mesh.name = nom;
      groupe.add(mesh);
    }
    return groupe;
  }
}

function roues(a, { rayon, largeur, voie, empattement }) {
  const pneu = new THREE.CylinderGeometry(rayon, rayon, largeur, 32, 1);
  const flanc = new THREE.TorusGeometry(rayon - 0.05, 0.05, 8, 32);
  const jante = new THREE.CylinderGeometry(rayon * 0.66, rayon * 0.66, largeur + 0.012, 24, 1);
  const moyeu = new THREE.CylinderGeometry(rayon * 0.16, rayon * 0.16, largeur + 0.03, 12, 1);
  const rayonJ = new THREE.BoxGeometry(largeur + 0.02, rayon * 1.1, 0.07);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * voie / 2, z = sz * empattement / 2;
    a.ajouter("pneu", pneu, { x, y: rayon, z, rz: Math.PI / 2 });
    a.ajouter("pneu", flanc, { x: x + sx * largeur / 2 * 0.9, y: rayon, z, ry: Math.PI / 2 });
    a.ajouter("jante", jante, { x, y: rayon, z, rz: Math.PI / 2 });
    a.ajouter("chrome", moyeu, { x, y: rayon, z, rz: Math.PI / 2 });
    for (let k = 0; k < 5; k++) a.ajouter("plastique", rayonJ, { x: x + sx * 0.004, y: rayon, z, rx: k * Math.PI / 5 });
  }
}

function toutTerrain(a) {
  const R = 0.41;
  // caisse et capot
  a.boite("caisse", 1.8, 0.7, 4.05, { y: 0.9 }, 0.08);
  a.boite("caisse", 1.62, 0.1, 1.25, { y: 1.26, z: 1.3 }, 0.04);
  // cabine : montants couleur caisse, vitres sombres légèrement en saillie
  a.boite("caisse", 1.74, 0.74, 2.45, { y: 1.6, z: -0.52 }, 0.06);
  a.boite("vitre", 1.77, 0.46, 2.18, { y: 1.66, z: -0.54 }, 0.03);
  a.boite("vitre", 1.5, 0.5, 0.05, { y: 1.64, z: 0.72, rx: -0.12 }, 0.02);
  a.boite("vitre", 1.4, 0.44, 0.05, { y: 1.66, z: -1.76 }, 0.02);
  a.boite("toit", 1.8, 0.09, 2.52, { y: 2.0, z: -0.52 }, 0.04);
  // boucliers, élargisseurs, marchepieds (plastique noir)
  a.boite("plastique", 1.94, 0.36, 0.32, { y: 0.56, z: 2.08 }, 0.06);
  a.boite("plastique", 1.94, 0.34, 0.28, { y: 0.58, z: -2.06 }, 0.06);
  for (const s of [-1, 1]) {
    for (const z of [-1.32, 1.32]) {
      a.boite("plastique", 0.14, 0.14, 1.1, { x: s * 0.95, y: 0.94, z }, 0.05);
      a.boite("plastique", 0.12, 0.3, 0.14, { x: s * 0.95, y: 0.78, z: z + 0.5 }, 0.04);
      a.boite("plastique", 0.12, 0.3, 0.14, { x: s * 0.95, y: 0.78, z: z - 0.5 }, 0.04);
    }
    a.boite("plastique", 0.2, 0.07, 1.5, { x: s * 1.0, y: 0.5, z: 0 }, 0.02);
    a.boite("plastique", 0.08, 0.14, 0.22, { x: s * 0.98, y: 1.46, z: 0.62 }, 0.03);
  }
  // calandre à trois barres et phares ronds
  a.boite("plastique", 1.2, 0.36, 0.04, { y: 0.97, z: 2.03 }, 0);
  for (const y of [0.87, 0.97, 1.07]) a.boite("caisse", 1.2, 0.035, 0.05, { y, z: 2.05 }, 0);
  const cercle = new THREE.CylinderGeometry(0.13, 0.13, 0.05, 24);
  const bague = new THREE.TorusGeometry(0.135, 0.022, 8, 24);
  for (const s of [-1, 1]) {
    a.ajouter("phare", cercle, { x: s * 0.66, y: 0.99, z: 2.04, rx: Math.PI / 2 });
    a.ajouter("chrome", bague, { x: s * 0.66, y: 0.99, z: 2.07 });
    a.boite("feu", 0.12, 0.24, 0.03, { x: s * 0.8, y: 1.0, z: -2.04 }, 0.01);
  }
  // roue de secours
  a.ajouter("pneu", new THREE.CylinderGeometry(0.38, 0.38, 0.24, 28), { y: 1.05, z: -2.24, rx: Math.PI / 2 });
  a.ajouter("toit", new THREE.CylinderGeometry(0.3, 0.3, 0.25, 28), { y: 1.05, z: -2.25, rx: Math.PI / 2 });
  roues(a, { rayon: R, largeur: 0.3, voie: 1.62, empattement: 2.64 });
}

// Volume de pavillon trapézoïdal : pare-brise et lunette inclinés, flancs rentrés.
function pavillon(l, h, p) {
  const g = new RoundedBoxGeometry(l, h, p, 3, Math.min(0.12, h / 2.2));
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + h / 2) / h; // 0 en bas, 1 en haut
    pos.setX(i, pos.getX(i) * (1 - 0.16 * t));
    const z = pos.getZ(i);
    pos.setZ(i, z > 0 ? z * (1 - 0.48 * t) - 0.05 * t : z * (1 - 0.2 * t));
  }
  g.computeVertexNormals();
  return g;
}

function suv(a) {
  const R = 0.37;
  a.boite("caisse", 1.84, 0.6, 4.44, { y: 0.74 }, 0.18, 3);
  a.boite("caisse", 1.74, 0.12, 1.3, { y: 1.02, z: 1.42, rx: 0.07 }, 0.05);
  // pavillon couleur caisse, puis un bandeau vitré un peu plus large et plus bas qui dépasse
  // sur les côtés, devant (pare-brise) et derrière (lunette)
  a.ajouter("caisse", pavillon(1.7, 0.56, 2.7), { y: 1.3, z: -0.32 });
  a.ajouter("vitre", pavillon(1.73, 0.42, 2.84), { y: 1.28, z: -0.32 });
  a.boite("toit", 1.36, 0.045, 1.72, { y: 1.585, z: -0.46 }, 0.02);
  for (const s of [-1, 1]) {
    a.boite("plastique", 0.1, 0.12, 0.22, { x: s * 0.97, y: 1.14, z: 0.78 }, 0.04);
    for (const z of [-1.36, 1.36]) a.boite("plastique", 0.08, 0.14, 1.04, { x: s * 0.91, y: 0.84, z }, 0.05);
    a.boite("plastique", 0.06, 0.12, 1.6, { x: s * 0.91, y: 0.46, z: 0 }, 0.03);
    a.boite("chrome", 0.02, 0.025, 1.9, { x: s * 0.79, y: 1.075, z: -0.3 }, 0);
  }
  // face avant : bandeau lumineux, optiques, calandre, bouclier
  a.boite("phare", 1.5, 0.03, 0.03, { y: 0.99, z: 2.21 }, 0);
  for (const s of [-1, 1]) a.boite("phare", 0.32, 0.08, 0.04, { x: s * 0.62, y: 0.93, z: 2.2 }, 0.02);
  a.boite("plastique", 1.1, 0.28, 0.05, { y: 0.72, z: 2.21 }, 0.05);
  a.boite("plastique", 1.74, 0.12, 0.1, { y: 0.46, z: 2.18 }, 0.04);
  // arrière : bandeau de feux
  a.boite("feu", 1.6, 0.05, 0.03, { y: 1.0, z: -2.21 }, 0);
  a.boite("plastique", 1.74, 0.14, 0.1, { y: 0.47, z: -2.18 }, 0.04);
  roues(a, { rayon: R, largeur: 0.26, voie: 1.6, empattement: 2.7 });
}

export const DIMENSIONS = {
  "tout-terrain": { longueur: 4.6, largeur: 1.95, hauteur: 2.05 },
  suv: { longueur: 4.45, largeur: 1.85, hauteur: 1.62 },
};

export function creerMaquette({ gabarit = "suv", couleur = "#888", toit, qualite = "moyen" }) {
  const a = new Atelier();
  if (gabarit === "tout-terrain") toutTerrain(a); else suv(a);
  const groupe = a.construire(materiaux(couleur, toit, qualite));
  groupe.userData.dimensions = DIMENSIONS[gabarit] || DIMENSIONS.suv;
  return groupe;
}
