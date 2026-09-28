// Décor du showroom BMB Motors, d'après les photos : façade grise et enseigne, auvent en verre,
// marches, sol en marbre brillant, piliers blancs, plafond anthracite avec poutres et réglettes.
//
// Reflets du marbre : l'intérieur est dupliqué sous le sol, retourné (« monde miroir »), et le sol
// est légèrement transparent. Pas de rendu supplémentaire : c'est net, et léger sur téléphone.
import * as THREE from "three";
import { PLAN, centrePlace, profondeur } from "../plan.js";
import * as T from "./textures.js";
import { habiller } from "./ameublement.js";

const BLANC_MUR = 0xeeeeea;
const ANTHRACITE = 0x2b2e33;

function boite(l, h, p, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat);
  m.position.set(x, y, z);
  return m;
}

// Boîte dont la texture se répète selon sa taille réelle (tuile de tx × ty mètres).
function boiteTexturee(l, h, p, texture, tx, ty, base, x, y, z) {
  const t = texture.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(l / tx, h / ty);
  const mat = base.clone();
  mat.map = t;
  return boite(l, h, p, mat, x, y, z);
}

function instances(geo, mat, positions) {
  const m = new THREE.InstancedMesh(geo, mat, positions.length);
  const mtx = new THREE.Matrix4();
  positions.forEach((p, i) => { mtx.makeTranslation(p[0], p[1], p[2]); m.setMatrixAt(i, mtx); });
  m.instanceMatrix.needsUpdate = true;
  m.computeBoundingSphere();
  return m;
}

function materiauCiel() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      haut: { value: new THREE.Color(0x4a6f9c) },
      horizon: { value: new THREE.Color(0xf3b98a) },
      bas: { value: new THREE.Color(0x6a5d55) },
      soleilDir: { value: new THREE.Vector3(-0.55, 0.16, -0.82).normalize() },
      soleil: { value: new THREE.Color(0xffc98f) },
    },
    vertexShader: `varying vec3 vDir;
      void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 haut; uniform vec3 horizon; uniform vec3 bas; uniform vec3 soleilDir; uniform vec3 soleil;
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        vec3 c = mix(horizon, haut, smoothstep(0.0, 0.55, d.y));
        c = mix(c, bas, smoothstep(0.0, -0.2, d.y));
        float s = max(dot(d, soleilDir), 0.0);
        c += soleil * (pow(s, 60.0) * 1.2 + pow(s, 6.0) * 0.25);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

function palmier(texFeuille, x, z, hauteur, penche) {
  const g = new THREE.Group();
  const tronc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.2, hauteur, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x6d5a48, roughness: 0.95 }),
  );
  const p = tronc.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + hauteur / 2) / hauteur;
    p.setX(i, p.getX(i) + penche * t * t);
  }
  tronc.geometry.computeVertexNormals();
  tronc.position.y = hauteur / 2;
  g.add(tronc);
  const mat = new THREE.MeshStandardMaterial({ map: texFeuille, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  const geo = new THREE.PlaneGeometry(0.9, 3.4);
  geo.translate(0, 1.7, 0);
  for (let k = 0; k < 9; k++) {
    const f = new THREE.Mesh(geo, mat);
    f.position.set(penche, hauteur, 0);
    f.rotation.set(0, (k / 9) * Math.PI * 2, 0);
    f.rotateX(1.05 + (k % 2) * 0.35);
    g.add(f);
  }
  g.position.set(x, PLAN.trottoir, z);
  return g;
}

function plante(texFeuille, x, z) {
  const g = new THREE.Group();
  const terre = new THREE.MeshStandardMaterial({ color: 0xb4633a, roughness: 0.8 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.42, 20), terre);
  pot.position.y = 0.21;
  const soucoupe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0x2f6b46, roughness: 0.6 }));
  soucoupe.position.y = 0.025;
  g.add(pot, soucoupe);
  const mat = new THREE.MeshStandardMaterial({ map: texFeuille, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 });
  const geo = new THREE.PlaneGeometry(0.32, 0.8);
  geo.translate(0, 0.4, 0);
  for (let k = 0; k < 11; k++) {
    const f = new THREE.Mesh(geo, mat);
    f.position.y = 0.4;
    f.rotation.y = k * 2.4;
    f.rotateX(0.25 + (k % 3) * 0.28);
    f.scale.setScalar(0.8 + (k % 4) * 0.15);
    g.add(f);
  }
  g.position.set(x, 0, z);
  return g;
}

function chaise(x, z, rot) {
  const g = new THREE.Group();
  const orange = new THREE.MeshStandardMaterial({ color: 0xe8662a, roughness: 0.55 });
  g.add(boite(0.46, 0.05, 0.44, orange, 0, 0.46, 0));
  const dos = boite(0.46, 0.38, 0.04, orange, 0, 0.68, -0.21);
  dos.rotation.x = -0.12;
  g.add(dos);
  for (const [a, b] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) g.add(boite(0.035, 0.46, 0.035, orange, a, 0.23, b));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

export function construireDecor({ scene, nbPlaces, qualite }) {
  const D = profondeur(nbPlaces);
  const W = PLAN.demiLargeur * 2;
  const H = PLAN.hauteur;
  const Y0 = PLAN.trottoir;
  const texFeuille = T.feuille();

  // ————— Extérieur —————
  const exterieur = new THREE.Group();
  const ciel = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), materiauCiel());
  exterieur.add(ciel);

  const asphalte = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.95 }));
  asphalte.rotation.x = -Math.PI / 2;
  asphalte.position.set(0, Y0 - 0.14, 0);
  exterieur.add(asphalte);

  const texPaves = T.paves();
  texPaves.wrapS = texPaves.wrapT = THREE.RepeatWrapping;
  texPaves.repeat.set(40 / 2, 10 / 2);
  const parvis = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), new THREE.MeshStandardMaterial({ map: texPaves, roughness: 0.9 }));
  parvis.rotation.x = -Math.PI / 2;
  parvis.position.set(0, Y0, 5);
  exterieur.add(parvis);
  const bordure = new THREE.MeshStandardMaterial({ color: 0xb9b6b0, roughness: 0.8 });
  exterieur.add(boite(40, 0.16, 0.25, bordure, 0, Y0 - 0.07, 10.1));
  // marquage de la route
  const blanc = new THREE.MeshBasicMaterial({ color: 0xd8d6cf });
  for (let x = -40; x < 40; x += 6) {
    const bande = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.15), blanc);
    bande.rotation.x = -Math.PI / 2;
    bande.position.set(x, Y0 - 0.13, 16);
    exterieur.add(bande);
  }

  // Façade grise en panneaux composites, grande vitrine au centre.
  const texFacade = T.panneauxFacade();
  const matFacade = new THREE.MeshStandardMaterial({ color: 0x9c9fa3, roughness: 0.55, metalness: 0.15 });
  const epF = 0.4, ouv = 5.2, hOuv = 3.6, HF = PLAN.hauteurFacade;
  const cote = 13 - ouv;
  exterieur.add(boiteTexturee(cote, HF - Y0, epF, texFacade, 6, 4.5, matFacade, -(ouv + cote / 2), (HF + Y0) / 2, -epF / 2));
  exterieur.add(boiteTexturee(cote, HF - Y0, epF, texFacade, 6, 4.5, matFacade, ouv + cote / 2, (HF + Y0) / 2, -epF / 2));
  exterieur.add(boiteTexturee(ouv * 2, HF - hOuv, epF, texFacade, 6, 4.5, matFacade, 0, (HF + hOuv) / 2, -epF / 2));
  const matSombre = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.5, metalness: 0.4 });
  exterieur.add(boite(26.4, 0.3, 0.7, matSombre, 0, HF + 0.15, -0.2)); // couronnement
  // côtés du bâtiment
  for (const s of [-1, 1]) exterieur.add(boiteTexturee(0.4, HF - Y0, D, texFacade, 6, 4.5, matFacade, s * 13.2, (HF + Y0) / 2, -D / 2));

  // Enseigne : lettres blanches légèrement lumineuses + ombre portée qui donne l'épaisseur.
  const ens = T.enseigneFacade();
  const largeurEns = 13.5;
  const hEns = largeurEns / ens.ratio;
  const lettres = new THREE.Mesh(
    new THREE.PlaneGeometry(largeurEns, hEns),
    new THREE.MeshStandardMaterial({ map: ens.texture, emissiveMap: ens.texture, emissive: 0xffffff, emissiveIntensity: 0.55, transparent: true, alphaTest: 0.3, roughness: 0.4 }),
  );
  lettres.position.set(0, 6.25, 0.1);
  const ombreLettres = new THREE.Mesh(lettres.geometry, new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: ens.texture, transparent: true, opacity: 0.38, depthWrite: false }));
  ombreLettres.position.set(0.06, 6.17, 0.02);
  exterieur.add(ombreLettres, lettres);

  // Vitrine : châssis anthracite, verre, deux portes coulissantes.
  const matVerre = new THREE.MeshStandardMaterial({ color: 0xa9bcc6, transparent: true, opacity: 0.2, metalness: 0.9, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const matChassis = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.35, metalness: 0.6 });
  const verreFixe = (x0, x1) => {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, hOuv), matVerre);
    v.position.set((x0 + x1) / 2, hOuv / 2, -0.22);
    exterieur.add(v);
  };
  verreFixe(-ouv, -1.6); verreFixe(1.6, ouv);
  const imposte = new THREE.Mesh(new THREE.PlaneGeometry(3.2, hOuv - 2.8), matVerre);
  imposte.position.set(0, 2.8 + (hOuv - 2.8) / 2, -0.22);
  exterieur.add(imposte);
  for (const x of [-ouv, -3.4, -1.6, 1.6, 3.4, ouv]) exterieur.add(boite(0.1, hOuv, 0.14, matChassis, x, hOuv / 2, -0.22));
  exterieur.add(boite(ouv * 2, 0.1, 0.14, matChassis, 0, 2.8, -0.22));
  exterieur.add(boite(ouv * 2, 0.12, 0.16, matChassis, 0, hOuv - 0.05, -0.22));
  exterieur.add(boite(ouv * 2, 0.06, 0.16, matChassis, 0, 0.03, -0.22));
  const portes = [-1, 1].map((s) => {
    const g = new THREE.Group();
    const verre = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.75), matVerre);
    verre.position.y = 1.4;
    g.add(verre);
    g.add(boite(1.6, 0.08, 0.06, matChassis, 0, 2.76, 0));
    g.add(boite(1.6, 0.1, 0.06, matChassis, 0, 0.05, 0));
    g.add(boite(0.06, 2.8, 0.06, matChassis, s * 0.77, 1.4, 0));
    g.add(boite(0.06, 2.8, 0.06, matChassis, -s * 0.77, 1.4, 0));
    const poignee = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 1, roughness: 0.2 }));
    poignee.position.set(-s * 0.62, 1.2, 0.07);
    g.add(poignee);
    g.position.set(s * 0.8, 0, -0.08);
    g.userData.x0 = s * 0.8;
    g.userData.s = s;
    exterieur.add(g);
    return g;
  });

  // Auvent en verre sur structure acier, tenu par des tirants.
  const auvent = new THREE.Group();
  const matVerreAuvent = new THREE.MeshStandardMaterial({ color: 0xcfe0e8, transparent: true, opacity: 0.28, metalness: 0.6, roughness: 0.08, depthWrite: false, side: THREE.DoubleSide });
  const dalle = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 3.4), matVerreAuvent);
  dalle.rotation.x = -Math.PI / 2;
  dalle.position.set(0, 0, 1.7);
  auvent.add(dalle);
  auvent.add(boite(12.9, 0.12, 0.12, matChassis, 0, -0.04, 3.4));
  for (const x of [-6.4, -3.2, 0, 3.2, 6.4]) {
    auvent.add(boite(0.1, 0.16, 3.4, matChassis, x, -0.06, 1.7));
    if (Math.abs(x) > 1) {
      const tirant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), matChassis);
      const a = new THREE.Vector3(x, 0, 3.3), b = new THREE.Vector3(x, 1.25, 0.05);
      tirant.position.copy(a).add(b).multiplyScalar(0.5);
      tirant.scale.y = a.distanceTo(b);
      tirant.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      auvent.add(tirant);
    }
  }
  // spots encastrés sous l'auvent
  const matSpot = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
  for (const x of [-4.8, -1.6, 1.6, 4.8]) {
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), matSpot);
    s.rotation.x = Math.PI / 2;
    s.position.set(x, -0.15, 1.8);
    auvent.add(s);
  }
  auvent.position.set(0, 3.95, 0);
  exterieur.add(auvent);
  // halos chauds des spots sur les marches
  const texHalo = T.degradeRadial("rgba(255,214,160,1)");
  const matHaloExt = new THREE.MeshBasicMaterial({ map: texHalo, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });

  // Marches en pierre claire.
  const texPierre = T.marbre(2, 256);
  texPierre.wrapS = texPierre.wrapT = THREE.RepeatWrapping;
  const matPierre = new THREE.MeshStandardMaterial({ map: texPierre, color: 0xcfcdc8, roughness: 0.45 });
  const matNez = new THREE.MeshStandardMaterial({ color: 0x9b9893, roughness: 0.6 });
  for (let k = 0; k < PLAN.marches; k++) {
    const haut = Y0 + 0.15 * (k + 1);
    const prof = PLAN.profondeurMarche * (PLAN.marches - k);
    exterieur.add(boite(13, haut - Y0, prof, matPierre, 0, (haut + Y0) / 2, prof / 2));
    exterieur.add(boite(13, 0.02, 0.04, matNez, 0, haut - 0.005, prof - 0.02));
    const h = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.2), matHaloExt);
    h.rotation.x = -Math.PI / 2;
    if (k === 1) for (const x of [-4.8, -1.6, 1.6, 4.8]) {
      const hh = h.clone(); hh.position.set(x, haut + 0.01, 1.8); exterieur.add(hh);
    }
  }
  // jardinières de part et d'autre des marches
  for (const s of [-1, 1]) {
    exterieur.add(boite(2.4, 0.7, 2.6, matSombre, s * 8.3, Y0 + 0.35, 1.5));
    const p = plante(texFeuille, s * 8.3, 1.5);
    p.position.y = Y0 + 0.62;
    p.scale.setScalar(1.8);
    exterieur.add(p);
  }
  exterieur.add(palmier(texFeuille, -11.5, 7.5, 7.2, 0.6));
  exterieur.add(palmier(texFeuille, 11.8, 8.2, 8.0, -0.5));
  exterieur.add(palmier(texFeuille, -19, 3, 9.5, 0.4));

  scene.add(exterieur);

  // ————— Intérieur (dupliqué dans le monde miroir) —————
  const archi = new THREE.Group();
  const matMur = new THREE.MeshStandardMaterial({ color: BLANC_MUR, roughness: 0.9 });
  const matPlafond = new THREE.MeshStandardMaterial({ color: ANTHRACITE, roughness: 0.8, metalness: 0.2 });
  const matPoutre = new THREE.MeshStandardMaterial({ color: 0x3a3e45, roughness: 0.6, metalness: 0.4 });
  const matPlinthe = new THREE.MeshStandardMaterial({ color: 0xc9c7c1, roughness: 0.6 });

  const mur = (l, h, mat, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(l, h), mat);
    m.position.set(x, y, z); m.rotation.y = ry;
    archi.add(m);
  };
  mur(D, H, matMur, -PLAN.demiLargeur, H / 2, -D / 2, Math.PI / 2);
  mur(D, H, matMur, PLAN.demiLargeur, H / 2, -D / 2, -Math.PI / 2);
  mur(W, H, matMur, 0, H / 2, -D, 0);
  // face intérieure de la façade (autour de la vitrine)
  const bord = (PLAN.demiLargeur - 5.2);
  mur(bord, H, matMur, -(5.2 + bord / 2), H / 2, -0.41, Math.PI);
  mur(bord, H, matMur, 5.2 + bord / 2, H / 2, -0.41, Math.PI);
  mur(10.4, H - 3.6, matMur, 0, 3.6 + (H - 3.6) / 2, -0.41, Math.PI);
  const plafond = new THREE.Mesh(new THREE.PlaneGeometry(W, D), matPlafond);
  plafond.rotation.x = Math.PI / 2;
  plafond.position.set(0, H, -D / 2);
  archi.add(plafond);
  // plinthes
  archi.add(boite(0.03, 0.1, D, matPlinthe, -PLAN.demiLargeur + 0.015, 0.05, -D / 2));
  archi.add(boite(0.03, 0.1, D, matPlinthe, PLAN.demiLargeur - 0.015, 0.05, -D / 2));
  archi.add(boite(W, 0.1, 0.03, matPlinthe, 0, 0.05, -D + 0.015));

  // poutres transversales et pannes
  const poutres = [];
  for (let z = -2; z > -D; z -= 4) poutres.push([0, H - 0.18, z]);
  archi.add(instances(new THREE.BoxGeometry(W, 0.36, 0.22), matPoutre, poutres));
  const pannes = [-9, -3, 3, 9].map((x) => [x, H - 0.12, -D / 2]);
  archi.add(instances(new THREE.BoxGeometry(0.14, 0.14, D), matPoutre, pannes));

  // réglettes LED
  const reglettes = [];
  for (let z = -4; z > -D + 1; z -= 4) for (const x of [-9, -4.6, 0, 4.6, 9]) reglettes.push({ x, z });
  const matReglette = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfffbf2, emissiveIntensity: 2.2 });
  archi.add(instances(new THREE.BoxGeometry(1.5, 0.05, 0.14), matReglette, reglettes.map((r) => [r.x, H - 0.5, r.z])));

  // piliers blancs carrés avec plinthe
  const piliers = [];
  for (let z = PLAN.premierPilier; z > -D + 3; z -= PLAN.pasPiliers) for (const x of PLAN.piliersX) piliers.push({ x, z });
  archi.add(instances(new THREE.BoxGeometry(0.62, H, 0.62), matMur, piliers.map((p) => [p.x, H / 2, p.z])));
  archi.add(instances(new THREE.BoxGeometry(0.68, 0.12, 0.68), matPlinthe, piliers.map((p) => [p.x, 0.06, p.z])));

  // mur du fond : fenêtre haute et logo
  const fenetre = new THREE.Group();
  fenetre.add(boite(1.6, 1.1, 0.05, new THREE.MeshStandardMaterial({ color: 0x33414c, metalness: 0.7, roughness: 0.2 }), 0, 0, 0));
  fenetre.add(boite(1.7, 0.06, 0.08, matChassis, 0, 0.56, 0), boite(1.7, 0.06, 0.08, matChassis, 0, -0.56, 0));
  fenetre.add(boite(0.06, 1.2, 0.08, matChassis, -0.82, 0, 0), boite(0.06, 1.2, 0.08, matChassis, 0.82, 0, 0), boite(0.04, 1.1, 0.06, matChassis, 0, 0, 0));
  fenetre.position.set(0, 4.75, -D + 0.04);
  archi.add(fenetre);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2), (() => { const t = T.murLogo(); return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.25, transparent: true, alphaTest: 0.2, roughness: 0.5 }); })());
  logo.position.set(0, 2.55, -D + 0.03);
  archi.add(logo);

  archi.add(plante(texFeuille, PLAN.piliersX[0] + 0.75, PLAN.premierPilier + 0.2));
  archi.add(plante(texFeuille, PLAN.piliersX[1] - 0.75, PLAN.premierPilier - 0.3));
  archi.add(chaise(10.6, -D + 1.2, 0.4), chaise(11.4, -D + 1.6, -0.3));
  habiller({ archi, exterieur, profondeur: D, nbPlaces, plante: (x, z) => plante(texFeuille, x, z) });

  scene.add(archi);

  // Monde miroir : le reflet dans le marbre.
  const miroir = new THREE.Group();
  miroir.scale.y = -1;
  miroir.add(archi.clone());
  scene.add(miroir);

  // Sol en marbre : légèrement transparent pour laisser voir le reflet, éclairage précalculé.
  const tuiles = qualite === "haut" ? 4 : 2;
  const texMarbre = T.marbre(tuiles, qualite === "bas" ? 384 : 512);
  texMarbre.wrapS = texMarbre.wrapT = THREE.RepeatWrapping;
  texMarbre.repeat.set(W / tuiles, D / tuiles);
  const eclairage = T.eclairageSol({ largeur: W, profondeur: D, piliers, reglettes });
  const sol = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({
      map: texMarbre, roughness: 0.16, metalness: 0,
      emissive: 0xffffff, emissiveMap: eclairage.halos, emissiveIntensity: 0.5,
      aoMap: eclairage.occlusion, aoMapIntensity: 1,
      transparent: true, opacity: 0.8, envMapIntensity: 0.5,
    }),
  );
  sol.rotation.x = -Math.PI / 2;
  sol.position.set(0, 0, -D / 2);
  sol.renderOrder = 1;
  scene.add(sol);

  // ————— Places de parking —————
  const texOmbre = T.ombreVoiture();
  const texPool = T.degradeRadial("rgba(255,244,226,1)", 1.4);
  const places = [];
  for (let i = 0; i < nbPlaces; i++) {
    const c = centrePlace(i);
    const g = new THREE.Group();
    g.position.set(c.x, 0, c.z);
    const matLisere = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe8cf, emissiveIntensity: 0.5, roughness: 0.3 });
    const L = PLAN.longueurPlace, l = PLAN.largeurPlace;
    // liseré lumineux en U, ouvert côté allée (x négatif)
    g.add(boite(L, 0.008, 0.05, matLisere, 0, 0.004, l / 2));
    g.add(boite(L, 0.008, 0.05, matLisere, 0, 0.004, -l / 2));
    g.add(boite(0.05, 0.008, l + 0.05, matLisere, L / 2, 0.004, 0));
    // butées de roues, côté mur
    const matButee = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.7 });
    for (const z of [-0.6, 0.6]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.62), matButee);
      b.position.set(L / 2 - 0.55, 0.05, z);
      g.add(b);
    }
    // numéro de place et nom gravés au sol, lisibles depuis l'allée
    const marquage = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 2.3 * 320 / 1024),
      new THREE.MeshStandardMaterial({ map: null, transparent: true, depthWrite: false, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    marquage.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    marquage.position.set(-L / 2 - 0.75, 0.003, 0);
    g.add(marquage);
    // halo au sol, qui s'allume quand on arrive
    const matPool = new THREE.MeshBasicMaterial({ map: texPool, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 5.2), matPool);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.006;
    g.add(pool);
    // ombre de contact sous le véhicule
    const ombre = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 5.1), new THREE.MeshBasicMaterial({ map: texOmbre, transparent: true, opacity: 0.85, depthWrite: false, color: 0x000000 }));
    ombre.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    ombre.position.y = 0.005;
    g.add(ombre);
    scene.add(g);
    places.push({ groupe: g, lisere: matLisere, pool: matPool, marquage, centre: c });
  }

  // Emplacements des voitures d'ambiance, de l'autre côté de l'allée et au fond à droite.
  const ambiance = [];
  for (let i = 0; i <= nbPlaces; i++) ambiance.push({ x: -PLAN.placeX, z: centrePlace(i).z + 0.6, rotation: Math.PI / 2 });
  ambiance.push({ x: PLAN.placeX, z: centrePlace(nbPlaces).z + 1, rotation: -Math.PI / 2 });

  return {
    profondeur: D,
    miroir,
    places,
    ambiance,
    lettres: lettres.material,
    // les textes des places dépendent de la police, chargée plus tard : on les pose ensuite
    nommerPlaces(vehicules) {
      places.forEach((p, i) => {
        p.marquage.material.map = T.marquagePlace(`P${i + 1}`, vehicules[i].nom);
        p.marquage.material.needsUpdate = true;
      });
    },
    ouvrirPortes(t) {
      for (const p of portes) p.position.set(p.userData.x0 + p.userData.s * 1.55 * t, 0, -0.08 + 0.06 * t);
    },
    eclairerPlaces(activites) {
      places.forEach((p, i) => {
        const a = activites[i] || 0;
        p.lisere.emissiveIntensity = 0.45 + a * 2.2;
        p.pool.opacity = a * 0.5;
      });
    },
  };
}
