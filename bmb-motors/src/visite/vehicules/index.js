// Choisit le rendu d'un véhicule d'après donnees.js : photos 360°, modèle .glb ou maquette.
// En cas d'échec de chargement, la maquette prend le relais : la visite ne casse jamais.
import * as THREE from "three";
import { creerMaquette } from "./maquette.js";
import { creerPhotos360 } from "./photos360.js";
import { chargerGLB } from "./glb.js";
import { chargerPhoto } from "./photo.js";

function gabaritPar(def) {
  return def.rendu?.gabarit || (def.categorie === "4x4" ? "tout-terrain" : "suv");
}

export function creerVehicule(def, ctx) {
  const objet = new THREE.Group();   // placé et orienté par le décor
  const reflet = new THREE.Group();  // ajouté au monde miroir, recopie la position de « objet »
  let majRendu = () => false;
  let type = "maquette";

  function poserMaquette() {
    objet.clear(); reflet.clear();
    const m = creerMaquette({ gabarit: gabaritPar(def), couleur: def.couleur, toit: def.toit, qualite: ctx.qualite });
    objet.add(m);
    reflet.add(m.clone());
    objet.userData.dimensions = m.userData.dimensions;
    type = "maquette";
    majRendu = () => false;
  }

  async function charger(progression) {
    const r = def.rendu || {};
    try {
      if (r.type === "photos") {
        const p = creerPhotos360(r, ctx);
        await p.charger(progression);
        objet.clear(); reflet.clear();
        objet.add(p.groupe); reflet.add(p.reflet);
        objet.userData.dimensions = { longueur: 4.6, largeur: 1.9 };
        majRendu = (camera) => p.maj(camera, objet);
        type = "photos";
        return;
      }
      if (r.type === "photo") {
        const p = await chargerPhoto(r);
        objet.clear(); reflet.clear();
        objet.add(p.groupe); reflet.add(p.reflet);
        objet.userData.dimensions = p.dimensions;
        type = "photo";
        return;
      }
      if (r.type === "glb") {
        const g = await chargerGLB(r, ctx);
        objet.clear(); reflet.clear();
        objet.add(g); reflet.add(g.clone());
        objet.userData.dimensions = g.userData.dimensions;
        type = "glb";
        return;
      }
    } catch (e) {
      console.warn(`BMB Motors : rendu « ${r.type} » indisponible pour ${def.nom}, maquette affichée à la place.`, e);
    }
    progression(1);
  }

  poserMaquette();
  return {
    objet,
    reflet,
    get type() { return type; },
    charger,
    maj(camera) {
      reflet.position.copy(objet.position);
      reflet.rotation.copy(objet.rotation);
      return majRendu(camera);
    },
  };
}
