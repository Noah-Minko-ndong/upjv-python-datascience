// Plan du showroom (en mètres) et découpage de la visite dans le temps.
// Repère : x vers la droite quand on entre, y vers le haut, z vers la rue (on avance vers -z).
// Le sol intérieur est à y = 0, le trottoir à y = -0,75 (5 marches de 15 cm).

export const PLAN = {
  sol: 0,
  trottoir: -0.75,
  marches: 5,
  profondeurMarche: 0.6,
  demiLargeur: 12.5,          // murs latéraux à x = ±12,5
  hauteur: 6,                 // plafond
  hauteurFacade: 8.6,
  piliersX: [-3.4, 3.4],
  pasPiliers: 16,
  premierPilier: -2,
  placeX: 7.5,                // centre des places, côté droit
  premierePlace: -10,
  pasPlaces: 16,             // un pilier tous les 16 m, à mi-chemin entre deux places
  longueurPlace: 5.6,
  largeurPlace: 2.9,
};

export function centrePlace(i) {
  return { x: PLAN.placeX, z: PLAN.premierePlace - i * PLAN.pasPlaces };
}

export function profondeur(nbPlaces) {
  const derniere = centrePlace(Math.max(0, nbPlaces - 1)).z;
  return -(derniere - 18); // distance de la façade au mur du fond
}

// Durées relatives de chaque moment de la visite. Chaque unité vaut environ 65 % de hauteur d'écran.
const DUREES = { arrivee: 1, entree: 1.35, allee: 0.8, approche: 0.5, tour: 2.3, transfert: 0.7, sortie: 1.1, fin: 0.7 };

// Renvoie la liste des étapes avec leurs bornes [de, a] dans la progression 0 → 1.
export function etapes(vehicules) {
  const brut = [];
  let u = 0;
  const pousser = (id, type, duree, extra = {}) => { brut.push({ id, type, de: u, a: u + duree, ...extra }); u += duree; };
  pousser("arrivee", "arrivee", DUREES.arrivee);
  pousser("entree", "entree", DUREES.entree);
  pousser("allee", "allee", DUREES.allee);
  vehicules.forEach((v, i) => {
    pousser(`approche-${i}`, "approche", DUREES.approche, { index: i });
    pousser(`tour-${i}`, "tour", DUREES.tour, { index: i });
    if (i < vehicules.length - 1) pousser(`transfert-${i}`, "transfert", DUREES.transfert, { index: i });
  });
  pousser("sortie", "sortie", DUREES.sortie);
  pousser("fin", "fin", DUREES.fin);
  const total = u;
  return {
    unites: total,
    liste: brut.map((e) => ({ ...e, de: e.de / total, a: e.a / total })),
  };
}

// Chapitres affichés dans la barre de progression.
export function chapitres(vehicules, decoupage) {
  const L = decoupage.liste;
  const trouver = (id) => L.find((e) => e.id === id);
  const c = [
    { titre: "Façade", de: trouver("arrivee").de, a: trouver("entree").de },
    { titre: "Entrée", de: trouver("entree").de, a: trouver("allee").de },
    { titre: "Allée", de: trouver("allee").de, a: trouver("approche-0")?.de ?? trouver("sortie").de },
  ];
  vehicules.forEach((v, i) => {
    const debut = trouver(`approche-${i}`).de;
    const fin = (trouver(`transfert-${i}`) || trouver("sortie")).de;
    c.push({ titre: `P${i + 1} · ${v.nom}`, de: debut, a: fin, vehicule: i });
  });
  c.push({ titre: "Fin", de: trouver("sortie").de, a: 1 });
  return c;
}

// Fenêtre pendant laquelle la fiche du véhicule i est affichée.
export function fenetreFiche(decoupage, i) {
  const L = decoupage.liste;
  const tour = L.find((e) => e.id === `tour-${i}`);
  const approche = L.find((e) => e.id === `approche-${i}`);
  return { de: approche.de + (approche.a - approche.de) * 0.55, a: tour.a + (tour.a - tour.de) * 0.04 };
}
