// Maquettes 3D génériques, dessinées comme des modèles de style : une silhouette de profil
// extrudée avec de larges arrondis, un vitrage affleurant, des pneus bombés et des jantes à branches.
// Elles ne reproduisent le design d'aucun constructeur ; elles attendent les photos 360° ou un
// modèle sous licence, et servent de voitures d'ambiance dans le showroom.
//
// Construction dans le « repère profil » (x vers l'avant, y vers le haut, z sur la largeur),
// puis rotation finale : l'avant de la voiture regarde +z, les roues touchent y = 0.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const cacheMateriaux = new Map();

function materiaux(couleur, toit, qualite) {
  const cle = `${couleur}|${toit}|${qualite}`;
  if (cacheMateriaux.has(cle)) return cacheMateriaux.get(cle);
  const peinture = (c) => qualite === "haut"
    ? new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.5, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 })
    : new THREE.MeshStandardMaterial({ color: c, metalness: 0.55, roughness: 0.26 });
  const m = {
    caisse: peinture(couleur),
    toit: peinture(toit || couleur),
    vitre: new THREE.MeshStandardMaterial({ color: 0x07090c, metalness: 0.95, roughness: 0.04 }),
    plastique: new THREE.MeshStandardMaterial({ color: 0x141518, metalness: 0.15, roughness: 0.62 }),
    pneu: new THREE.MeshStandardMaterial({ color: 0x0d0e0f, metalness: 0, roughness: 0.9 }),
    jante: new THREE.MeshStandardMaterial({ color: 0x2c2f34, metalness: 0.9, roughness: 0.28 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe4e7eb, metalness: 1, roughness: 0.12 }),
    phare: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3de, emissiveIntensity: 1.6, metalness: 0.1, roughness: 0.1 }),
    feu: new THREE.MeshStandardMaterial({ color: 0x5a0606, emissive: 0xff1a1a, emissiveIntensity: 1.1, roughness: 0.3 }),
  };
  cacheMateriaux.set(cle, m);
  return m;
}

// Accumule des géométries par matériau, puis les fusionne : un appel de dessin par matériau.
class Atelier {
  constructor() { this.parts = new Map(); }
  ajouter(nom, geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1 } = {}) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(s, s, s),
    );
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
    g.clearGroups();
    if (!this.parts.has(nom)) this.parts.set(nom, []);
    this.parts.get(nom).push(g);
  }
  boite(nom, l, h, p, pos, rayon = 0.04) {
    this.ajouter(nom, rayon > 0 ? new RoundedBoxGeometry(l, h, p, 3, rayon) : new THREE.BoxGeometry(l, h, p), pos);
  }
  construire(mats) {
    const profil = new THREE.Group();
    for (const [nom, geos] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(geos), mats[nom]);
      mesh.name = nom;
      profil.add(mesh);
    }
    profil.rotation.y = -Math.PI / 2; // avant (x) → +z
    const groupe = new THREE.Group();
    groupe.add(profil);
    return groupe;
  }
}

// Extrusion d'un profil sur la largeur, centrée, avec de larges arrondis.
// Par défaut l'arrondi est pris à l'intérieur du profil, qui garde ses dimensions.
function extruder(forme, largeur, arrondi, segments = 5, interieur = true) {
  const g = new THREE.ExtrudeGeometry(forme, {
    depth: largeur - 2 * arrondi, bevelEnabled: true, bevelThickness: arrondi, bevelSize: arrondi * 0.8,
    bevelOffset: interieur ? -arrondi * 0.8 : 0,
    bevelSegments: segments, curveSegments: 28, steps: 1,
  });
  g.translate(0, 0, -(largeur - 2 * arrondi) / 2);
  g.computeVertexNormals();
  return g;
}

// Bas de caisse découpé par les passages de roue.
function basDeCaisse(f, { arriere, avant, bas, empattement, rayonPassage, yRoue }) {
  const e = empattement / 2;
  f.lineTo(-e - rayonPassage, bas);
  f.absarc(-e, yRoue, rayonPassage, Math.PI, 0, true);
  f.lineTo(e - rayonPassage, bas);
  f.absarc(e, yRoue, rayonPassage, Math.PI, 0, true);
  f.lineTo(avant, bas);
}

// Pneu bombé (tour) + jante à cinq branches doubles + écrou central.
function roues(a, { rayon, largeur, voie, empattement }) {
  const pts = [];
  const r0 = rayon * 0.64, lw = largeur / 2;
  pts.push(new THREE.Vector2(r0, -lw * 0.92));
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, ang = -Math.PI / 2 + t * Math.PI;
    pts.push(new THREE.Vector2(rayon - 0.05 + Math.cos(ang) * 0.05, Math.sin(ang) * lw));
  }
  pts.push(new THREE.Vector2(r0, lw * 0.92));
  const pneu = new THREE.LatheGeometry(pts, 40);
  const jante = new THREE.CylinderGeometry(r0 * 1.02, r0 * 1.02, largeur * 0.7, 36, 1);
  const cuvette = new THREE.CylinderGeometry(r0 * 0.94, r0 * 0.94, largeur * 0.72, 36, 1, true);
  const branche = new THREE.BoxGeometry(r0 * 0.95, 0.045, 0.05);
  branche.translate(r0 * 0.47, 0, 0);
  const ecrou = new THREE.CylinderGeometry(r0 * 0.2, r0 * 0.24, 0.06, 16);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * empattement / 2, z = sz * voie / 2, y = rayon;
    a.ajouter("pneu", pneu, { x, y, z, rx: Math.PI / 2 });
    a.ajouter("jante", jante, { x, y, z, rx: Math.PI / 2 });
    a.ajouter("plastique", cuvette, { x, y, z: z + sz * 0.012, rx: Math.PI / 2, s: 1 });
    const face = z + sz * largeur * 0.36;
    for (let k = 0; k < 10; k++) {
      const ang = (k / 5) * Math.PI + (k % 2 ? 0.16 : 0);
      a.ajouter("chrome", branche, { x, y, z: face, rz: ang });
    }
    a.ajouter("chrome", ecrou, { x, y, z: face + sz * 0.02, rx: Math.PI / 2 });
  }
}

// Arc noir qui habille un passage de roue, de chaque côté.
function elargisseurs(a, { empattement, yRoue, rayonPassage, largeur, epaisseur = 0.05 }) {
  const arc = new THREE.TorusGeometry(rayonPassage + epaisseur * 0.6, epaisseur, 10, 32, Math.PI);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    a.ajouter("plastique", arc, { x: sx * empattement / 2, y: yRoue, z: sz * (largeur / 2 - epaisseur * 0.4) });
  }
}

function suv(a) {
  const L = 1.86, R = 0.37, WB = 2.72, bas = 0.3, yR = R;
  const f = new THREE.Shape();
  f.moveTo(2.22, bas + 0.05);
  f.lineTo(2.27, 0.56);
  f.quadraticCurveTo(2.31, 0.86, 2.02, 0.95);
  f.lineTo(0.95, 1.07);
  f.lineTo(0.2, 1.52);
  f.quadraticCurveTo(0.02, 1.63, -0.35, 1.63);
  f.lineTo(-1.62, 1.6);
  f.quadraticCurveTo(-1.97, 1.58, -2.06, 1.34);
  f.lineTo(-2.2, 1.0);
  f.quadraticCurveTo(-2.3, 0.8, -2.22, 0.45);
  f.lineTo(-2.15, bas);
  basDeCaisse(f, { avant: 2.22, bas, empattement: WB, rayonPassage: 0.46, yRoue: yR });
  a.ajouter("caisse", extruder(f, L, 0.16));

  // vitrage : pare-brise, vitres latérales et lunette, légèrement en saillie de la carrosserie
  const v = new THREE.Shape();
  v.moveTo(0.99, 1.09);
  v.lineTo(0.22, 1.555);
  v.quadraticCurveTo(0.05, 1.575, -0.35, 1.575);
  v.lineTo(-1.62, 1.55);
  v.quadraticCurveTo(-1.9, 1.54, -2.0, 1.36);
  v.lineTo(-2.23, 1.04);
  v.lineTo(-2.0, 1.08);
  v.lineTo(0.99, 1.09);
  a.ajouter("vitre", extruder(v, L + 0.02, 0.035, 2, false)); // 1 cm plus large que la caisse
  // pavillon flottant noir et montants
  a.boite("toit", 1.9, 0.04, 1.36, { x: -0.95, y: 1.64 }, 0.02);
  for (const s of [-1, 1]) {
    a.boite("plastique", 0.09, 0.44, 0.03, { x: -0.42, y: 1.32, z: s * (L / 2 - 0.035) }, 0.01);
    a.boite("chrome", 3.0, 0.018, 0.02, { x: -0.55, y: 1.085, z: s * (L / 2 - 0.03) }, 0);
    a.boite("plastique", 0.2, 0.09, 0.12, { x: 0.78, y: 1.16, z: s * (L / 2 + 0.03) }, 0.04);
    // bas de caisse noir
    a.boite("plastique", 1.7, 0.12, 0.05, { x: 0, y: bas + 0.08, z: s * (L / 2 - 0.02) }, 0.03);
  }
  elargisseurs(a, { empattement: WB, yRoue: yR, rayonPassage: 0.46, largeur: L, epaisseur: 0.045 });
  // face avant : signature lumineuse fine, optiques, calandre, bouclier
  a.boite("phare", 0.03, 0.028, 1.5, { x: 2.24, y: 0.9 }, 0);
  for (const s of [-1, 1]) a.boite("phare", 0.05, 0.07, 0.34, { x: 2.21, y: 0.84, z: s * 0.62 }, 0.02);
  a.boite("plastique", 0.06, 0.26, 1.08, { x: 2.26, y: 0.64 }, 0.05);
  a.boite("plastique", 0.12, 0.12, 1.66, { x: 2.2, y: 0.4 }, 0.05);
  // arrière : bandeau de feux traversant
  a.boite("feu", 0.03, 0.045, 1.62, { x: -2.21, y: 1.03 }, 0);
  a.boite("plastique", 0.12, 0.13, 1.66, { x: -2.19, y: 0.42 }, 0.05);
  roues(a, { rayon: R, largeur: 0.26, voie: 1.6, empattement: WB });
}

function toutTerrain(a) {
  const L = 1.9, R = 0.41, WB = 2.6, bas = 0.42, yR = 0.43;
  const f = new THREE.Shape();
  f.moveTo(2.06, bas);
  f.lineTo(2.12, 0.92);
  f.quadraticCurveTo(2.15, 1.2, 1.94, 1.22);
  f.lineTo(0.95, 1.27);
  f.lineTo(0.72, 1.95);
  f.quadraticCurveTo(0.68, 2.03, 0.5, 2.03);
  f.lineTo(-1.94, 2.02);
  f.quadraticCurveTo(-2.1, 2.01, -2.12, 1.86);
  f.lineTo(-2.14, 0.52);
  f.lineTo(-2.02, bas);
  basDeCaisse(f, { avant: 2.06, bas, empattement: WB, rayonPassage: 0.54, yRoue: yR });
  a.ajouter("caisse", extruder(f, L, 0.11, 4));

  const v = new THREE.Shape();
  v.moveTo(0.95, 1.36);
  v.lineTo(0.765, 1.92);
  v.lineTo(-1.95, 1.92);
  v.lineTo(-2.16, 1.92);
  v.lineTo(-2.16, 1.4);
  v.lineTo(-1.95, 1.37);
  v.lineTo(0.95, 1.36);
  a.ajouter("vitre", extruder(v, L + 0.02, 0.025, 2, false));
  // toit contrasté, montants couleur caisse
  a.boite("toit", 2.56, 0.07, L - 0.04, { x: -0.72, y: 2.05 }, 0.035);
  for (const s of [-1, 1]) {
    for (const x of [-0.2, -1.2]) a.boite("caisse", 0.12, 0.58, 0.04, { x, y: 1.64, z: s * (L / 2 - 0.02) }, 0.015);
    a.boite("plastique", 0.12, 0.16, 0.2, { x: 0.76, y: 1.5, z: s * (L / 2 + 0.06) }, 0.04);
    a.boite("plastique", 1.5, 0.06, 0.2, { x: 0, y: 0.5, z: s * (L / 2 + 0.04) }, 0.025); // marchepied
    a.boite("plastique", 1.1, 0.1, 0.1, { x: 1.28, y: 1.2, z: s * (L / 2 - 0.02) }, 0.04);
  }
  elargisseurs(a, { empattement: WB, yRoue: yR, rayonPassage: 0.54, largeur: L + 0.06, epaisseur: 0.085 });
  // face avant : calandre à barres, phares ronds cerclés
  a.boite("plastique", 0.04, 0.36, 1.08, { x: 2.13, y: 0.98 }, 0.02);
  for (const y of [0.88, 0.98, 1.08]) a.boite("caisse", 0.05, 0.035, 1.08, { x: 2.15, y }, 0.01);
  const optique = new THREE.CylinderGeometry(0.135, 0.135, 0.05, 32);
  const bague = new THREE.TorusGeometry(0.142, 0.022, 10, 32);
  for (const s of [-1, 1]) {
    a.ajouter("phare", optique, { x: 2.13, y: 1.0, z: s * 0.68, rz: Math.PI / 2 });
    a.ajouter("chrome", bague, { x: 2.16, y: 1.0, z: s * 0.68, ry: Math.PI / 2 });
    a.boite("feu", 0.03, 0.26, 0.12, { x: -2.15, y: 1.02, z: s * 0.82 }, 0.01);
  }
  a.boite("plastique", 0.3, 0.34, 1.96, { x: 2.1, y: 0.58 }, 0.07);
  a.boite("plastique", 0.26, 0.32, 1.96, { x: -2.1, y: 0.6 }, 0.07);
  // roue de secours
  const secours = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 36);
  a.ajouter("pneu", secours, { x: -2.3, y: 1.12, rz: Math.PI / 2 });
  a.ajouter("toit", new THREE.CylinderGeometry(0.3, 0.3, 0.25, 36), { x: -2.31, y: 1.12, rz: Math.PI / 2 });
  roues(a, { rayon: R, largeur: 0.3, voie: 1.64, empattement: WB });
}

export const DIMENSIONS = {
  "tout-terrain": { longueur: 4.7, largeur: 2.0, hauteur: 2.09 },
  suv: { longueur: 4.55, largeur: 1.9, hauteur: 1.66 },
};

export function creerMaquette({ gabarit = "suv", couleur = "#888", toit, qualite = "moyen" }) {
  const a = new Atelier();
  if (gabarit === "tout-terrain") toutTerrain(a); else suv(a);
  const groupe = a.construire(materiaux(couleur, toit, qualite));
  groupe.userData.dimensions = DIMENSIONS[gabarit] || DIMENSIONS.suv;
  return groupe;
}
