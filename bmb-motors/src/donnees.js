// Toutes les informations modifiables du site sont ici.
// Une valeur à null s'affiche « À compléter » sur le site : remplacez-la par la vraie information.

export const CONTACT = {
  telephone: null,            // ex. "+225 07 00 00 00 00" (affiché)
  whatsapp: null,             // ex. "2250700000000" (indicatif pays, sans + ni espaces)
  adresse: null,              // ex. "Boulevard Latrille, Cocody"
  ville: "Cocody, Abidjan",
  horaires: null,             // ex. "Lundi au samedi, 8 h 30 – 18 h 30"
  // Lien d'itinéraire : remplacez la recherche par les coordonnées GPS exactes quand vous les aurez,
  // ex. "https://www.google.com/maps/dir/?api=1&destination=5.3599,-3.9867"
  itineraire: "https://www.google.com/maps/dir/?api=1&destination=BMB+Motors+Cocody+Abidjan",
};

// Véhicules présentés pendant la visite 3D, dans l'ordre des places de parking (P1, P2, …).
// On peut en ajouter : l'allée s'allonge automatiquement d'une place par véhicule.
//
// « rendu » décide de ce qui est affiché sur la place :
//   { type: "maquette", gabarit: "tout-terrain" | "suv" }
//       Silhouette 3D générique (provisoire), aux couleurs du véhicule.
//   { type: "photos", dossier: "assets/vehicules/212/", nombre: 36, extension: "webp",
//     largeurImage: 6.2, sol: 0.08 }
//       Série de photos détourées prises autour du véhicule (voir assets/vehicules/LISEZMOI.md).
//       largeurImage = largeur réelle, en mètres, couverte par la largeur de l'image ;
//       sol = hauteur des pneus au sol dans l'image, en fraction de sa hauteur.
//   { type: "glb", fichier: "assets/vehicules/212.glb", longueur: 4.4, rotation: 0 }
//       Modèle 3D sous licence. Il est mis à l'échelle sur « longueur » (en mètres).
// Si les photos ou le modèle ne se chargent pas, la maquette prend le relais.
export const VISITE = [
  {
    id: "212",
    nom: "212",
    categorie: "4x4",
    version: null,
    description: null,
    moteur: null,
    puissance: null,
    boite: null,
    transmission: null,
    prix: null,               // nombre en FCFA, ex. 18500000
    couleur: "#66735C",
    toit: "#E9E9E4",
    rendu: { type: "maquette", gabarit: "tout-terrain" },
  },
  {
    id: "toyota",
    nom: "Toyota",
    categorie: "SUV",
    version: null,
    description: null,
    moteur: null,
    puissance: null,
    boite: null,
    transmission: null,
    prix: null,
    couleur: "#1D4FB8",
    toit: "#15171A",
    rendu: { type: "maquette", gabarit: "suv" },
  },
];

// Catalogue complet (section « Nos véhicules »).
// « visite » relie une carte à un véhicule de la visite 3D : un bouton « Voir sur sa place » apparaît.
// « cadrage » règle la partie visible de la photo (CSS object-position), « zoom » l'agrandit autour de ce point.
export const CATALOGUE = [
  { nom: "212", version: null, categorie: "4x4", energie: null, boite: null, etat: "Neuf", prix: null,
    photo: "assets/photos/212-face.jpg", cadrage: "center 45%", zoom: 1, visite: "212",
    alt: "Le 4x4 212 vert, vu de face dans le showroom" },
  { nom: "Toyota", version: null, categorie: "SUV", energie: null, boite: null, etat: "Neuf", prix: null,
    photo: "assets/photos/showroom-allee-haut.jpg", cadrage: "0% 64%", zoom: 2.6, visite: "toyota",
    alt: "SUV Toyota bleu exposé à l'entrée du showroom" },
  { nom: "SUV électrique", version: null, categorie: "SUV", energie: "Électrique", boite: "Automatique", etat: "Neuf", prix: null,
    photo: "assets/photos/suv-electriques.jpg", cadrage: "88% 42%", zoom: 1.8,
    alt: "SUV électrique blanc décoré d'un grand nœud rouge" },
  { nom: "Berline", version: null, categorie: "Berline", energie: null, boite: "Automatique", etat: "Neuf", prix: null,
    photo: "assets/photos/suv-electriques.jpg", cadrage: "0% 72%", zoom: 1.45,
    alt: "Berline blanche, vue de trois quarts avant" },
  { nom: "SUV familial", version: null, categorie: "SUV", energie: null, boite: null, etat: null, prix: null,
    photo: "assets/photos/showroom-allee.jpg", cadrage: "33% 64%", zoom: 2.3,
    alt: "SUV exposé dans l'allée du showroom" },
  { nom: "Pick-up", version: null, categorie: "4x4", energie: null, boite: null, etat: null, prix: null,
    photo: "assets/photos/showroom-allee.jpg", cadrage: "47% 56%", zoom: 2.4,
    alt: "Véhicule exposé au fond du showroom" },
];

// Voitures d'ambiance garées de l'autre côté de l'allée (silhouettes, sans fiche).
export const AMBIANCE = [
  { gabarit: "suv", couleur: "#E8E8E4", toit: "#E8E8E4" },
  { gabarit: "suv", couleur: "#3A3E44", toit: "#3A3E44" },
  { gabarit: "tout-terrain", couleur: "#ECECE8", toit: "#16181B" },
];
