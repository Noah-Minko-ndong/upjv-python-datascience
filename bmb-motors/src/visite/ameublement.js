// Habillage de la concession : accueil, salon clients, kakémonos, panneaux muraux, plantes,
// drapeaux et totem sur le parvis. L'intérieur est ajouté au groupe « archi » pour avoir son reflet.
import * as THREE from "three";
import { PLAN, centrePlace } from "../plan.js";
import * as T from "./textures.js";

function boite(l, h, p, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat);
  m.position.set(x, y, z);
  return m;
}

const tissu = new THREE.MeshStandardMaterial({ color: 0x3b3f45, roughness: 0.95 });
const coussin = new THREE.MeshStandardMaterial({ color: 0xe2542c, roughness: 0.9 });
const noir = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.4, metalness: 0.3 });
const blanc = new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: 0.35 });
const acier = new THREE.MeshStandardMaterial({ color: 0xbfc4ca, roughness: 0.3, metalness: 0.9 });

// Canapé de 2,2 m, dossier vers -z local.
function canape() {
  const g = new THREE.Group();
  g.add(boite(2.2, 0.42, 0.9, tissu, 0, 0.25, 0));
  g.add(boite(2.2, 0.5, 0.2, tissu, 0, 0.65, -0.35));
  g.add(boite(0.18, 0.62, 0.9, tissu, -1.0, 0.31, 0), boite(0.18, 0.62, 0.9, tissu, 1.0, 0.31, 0));
  const c1 = boite(0.5, 0.4, 0.12, coussin, -0.55, 0.68, -0.2); c1.rotation.x = -0.25;
  const c2 = boite(0.5, 0.4, 0.12, coussin, 0.55, 0.68, -0.2); c2.rotation.x = -0.25;
  g.add(c1, c2);
  for (const x of [-1, 1]) for (const z of [-0.38, 0.38]) g.add(boite(0.05, 0.05, 0.05, noir, x, 0.025, z));
  return g;
}

function tableBasse() {
  const g = new THREE.Group();
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 32), blanc);
  plateau.position.y = 0.42;
  const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 12), noir);
  pied.position.y = 0.2;
  const socle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 24), noir);
  socle.position.y = 0.015;
  const revue = boite(0.3, 0.015, 0.22, coussin, 0.12, 0.45, 0.05);
  revue.rotation.y = 0.4;
  g.add(plateau, pied, socle, revue);
  return g;
}

function kakemono(texture, x, z, ry) {
  const g = new THREE.Group();
  const toile = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 2.18), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6 }));
  toile.position.y = 1.2;
  g.add(toile);
  g.add(boite(0.92, 0.1, 0.24, acier, 0, 0.05, 0));
  const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.2, 6), acier);
  mat.position.set(0, 1.15, -0.04);
  g.add(mat);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return g;
}

function panneau(texture, largeur, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(largeur, largeur * 700 / 1600), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.45 }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  const cadre = boite(largeur + 0.08, largeur * 700 / 1600 + 0.08, 0.04, noir, 0, 0, -0.025);
  m.add(cadre);
  return m;
}

// Drapeau « plume » : mât courbé et voile ondulée.
function drapeau(texture, x, z, y0) {
  const g = new THREE.Group();
  const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 3.7, 6), acier);
  mat.position.y = 1.85;
  g.add(mat);
  const geo = new THREE.PlaneGeometry(0.8, 3.0, 6, 12);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x0 = p.getX(i) + 0.4, y = p.getY(i);
    p.setZ(i, Math.sin(x0 * 3.2 + y * 0.8) * 0.08 * x0);
  }
  geo.computeVertexNormals();
  const voile = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, alphaTest: 0.4, roughness: 0.8 }));
  voile.position.set(0.42, 2.15, 0);
  g.add(voile);
  const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.12, 20), noir);
  pied.position.y = 0.06;
  g.add(pied);
  g.position.set(x, y0, z);
  g.rotation.y = x < 0 ? 0.5 : -0.5 + Math.PI;
  return g;
}

export function habiller({ archi, exterieur, profondeur, nbPlaces, plante }) {
  const D = profondeur;
  const mG = -PLAN.demiLargeur, mD = PLAN.demiLargeur;

  // Accueil, à gauche en entrant, face à l'allée.
  const accueil = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshStandardMaterial({ map: T.faceComptoir(), roughness: 0.35 }));
  face.rotation.y = Math.PI / 2;
  face.position.set(0.36, 0.62, 0);
  accueil.add(boite(0.7, 1.1, 3.2, blanc, 0, 0.55, 0), face);
  accueil.add(boite(0.9, 0.05, 3.36, noir, 0.05, 1.125, 0));
  accueil.add(boite(0.06, 0.08, 3.2, coussin, 0.33, 0.08, 0)); // plinthe lumineuse orange
  const ecran = boite(0.04, 0.34, 0.56, noir, -0.15, 1.36, 0.6);
  ecran.rotation.y = 0.2;
  accueil.add(ecran, boite(0.18, 0.02, 0.18, noir, -0.12, 1.16, 0.6));
  const siege = new THREE.Group();
  siege.add(boite(0.5, 0.08, 0.5, noir, 0, 0.55, 0), boite(0.06, 0.55, 0.5, noir, -0.24, 0.85, 0));
  const fut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), acier);
  fut.position.y = 0.27;
  siege.add(fut);
  siege.position.set(-0.8, 0, -0.4);
  accueil.add(siege);
  accueil.position.set(-8.4, 0, -3.0);
  archi.add(accueil);
  archi.add(panneau(T.panneauMural("Bienvenue", "Votre concession à Cocody"), 5.2, mG + 0.03, 3.0, -3.0, Math.PI / 2));
  archi.add(plante(-11.6, -1.1));

  // Salon clients, à droite en entrant.
  const tex = T.tapis();
  const tapis = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  tapis.rotation.x = -Math.PI / 2;
  tapis.position.set(9.3, 0.008, -3.0);
  archi.add(tapis);
  const c1 = canape(); c1.rotation.y = -Math.PI / 2; c1.position.set(11.6, 0, -3.0);
  const c2 = canape(); c2.rotation.y = Math.PI; c2.position.set(9.0, 0, -1.1); c2.scale.x = 0.8;
  const tb = tableBasse(); tb.position.set(9.4, 0, -3.1);
  archi.add(c1, c2, tb);
  archi.add(panneau(T.panneauMural("Le showroom", "Faites le tour, asseyez-vous au volant"), 5.2, mD - 0.03, 3.0, -3.0, -Math.PI / 2));
  archi.add(plante(11.8, -5.1));

  // Tapis d'entrée derrière les portes.
  const paillasson = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  paillasson.rotation.x = -Math.PI / 2;
  paillasson.position.set(0, 0.006, -1.4);
  archi.add(paillasson);

  // Kakémonos entre les places, contre les murs.
  const tk1 = T.kakemono("ESSAYEZ-LE", "Demandez un essai");
  const tk2 = T.kakemono("BIENVENUE", "chez BMB Motors");
  const texEssai = T.panneauMural("Essayez-le", "Demandez un essai au showroom");
  const texNeuf = T.panneauMural("4x4 & SUV", "Venez les voir de près");
  for (let i = 0; i < nbPlaces; i++) {
    const z = centrePlace(i).z - PLAN.pasPlaces / 2;
    // côté places : panneau plaqué au mur (la caméra passe près du mur en tournant autour des véhicules)
    archi.add(panneau(i % 2 ? texNeuf : texEssai, 4.2, mD - 0.03, 3.3, z, -Math.PI / 2));
    archi.add(kakemono(i % 2 ? tk1 : tk2, mG + 0.7, z + 1.5, Math.PI / 2 - 0.25));
    archi.add(plante(mG + 0.7, z - 0.4));
  }
  // Panneau mural au milieu, côté gauche.
  archi.add(panneau(texNeuf, 5.2, mG + 0.03, 3.1, centrePlace(0).z - PLAN.pasPlaces / 2 - 4.5, Math.PI / 2));
  // plantes au pied des piliers de l'allée
  for (let z = PLAN.premierPilier - PLAN.pasPiliers; z > -D + 3; z -= PLAN.pasPiliers * 2) archi.add(plante(PLAN.piliersX[0] - 0.7, z));

  // Parvis : drapeaux et totem.
  const td = T.drapeau();
  const y0 = PLAN.trottoir;
  exterieur.add(drapeau(td, -9.2, 9.0, y0), drapeau(td, -7.6, 9.3, y0), drapeau(td, 8.4, 9.2, y0), drapeau(td, 10.0, 9.0, y0));
  const totem = new THREE.Group();
  totem.add(boite(1.1, 4.6, 0.4, noir, 0, 2.3, 0));
  const face2 = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 2.5), new THREE.MeshStandardMaterial({ map: T.kakemono("BMB MOTORS", "Concession automobile"), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0, roughness: 0.4 }));
  face2.position.set(0, 3.05, 0.205);
  totem.add(face2);
  totem.position.set(-6.2, y0, 8.6);
  totem.rotation.y = 0.35;
  exterieur.add(totem);
}
