# BMB Motors · site avec visite 3D du showroom

Site de BMB Motors (Cocody, Abidjan). On arrive devant la façade, on monte les marches, on traverse
l'allée, et la caméra s'arrête devant la place de parking de chaque véhicule pour en faire le tour.
Suivent le catalogue avec filtres, la présentation du showroom et le contact.

## Voir le site

- **Sans rien installer :** ouvrez `apercu/bmb-motors-apercu.html` dans un navigateur (double-clic).
- **Version à héberger :** tout le dossier (`index.html`, `css/`, `dist/`, `assets/`) se dépose tel quel
  sur n'importe quel hébergement statique (Netlify, Vercel, OVH, GitHub Pages…).
  Pour la tester sur votre ordinateur : `npx http-server .` puis http://localhost:8080

## Modifier les informations

Tout est dans **`src/donnees.js`** : coordonnées (téléphone, WhatsApp, adresse, horaires),
véhicules de la visite (version, description, moteur, puissance, boîte, transmission, prix en FCFA)
et catalogue. Une valeur laissée à `null` s'affiche « À compléter ».
Après chaque modification : `npm install` (la première fois), puis `npm run build`.

Photos 360° et modèles `.glb` : voir `assets/vehicules/LISEZMOI.md`.

## Organisation

| Fichier | Rôle |
|---|---|
| `src/donnees.js` | Contenu du site (à modifier) |
| `src/plan.js` | Plan du showroom et découpage de la visite |
| `src/main.js` | Fiches, catalogue, contact, pilotage par le défilement |
| `src/visite/` | Moteur 3D (three.js) : décor, habillage, trajet caméra, véhicules |
| `outils/preparer_360.py` | Préparation des séries de photos 360° |
| `dist/`, `apercu/` | Fichiers produits par `npm run build` (ne pas modifier à la main) |

## Performances mobile

Le moteur 3D (≈ 150 Ko compressé) se charge après l'affichage de la page, derrière une image fixe.
Le décor est dessiné par le code (aucune texture à télécharger) et les reflets du marbre ne coûtent
pas de rendu supplémentaire. La résolution s'adapte à l'appareil et baisse si l'animation ralentit ;
l'image n'est recalculée que pendant le défilement. Avec « animations réduites », en mode économie
de données ou sans WebGL, la visite est remplacée par des fiches classiques.

Pour forcer un niveau de qualité lors d'un test : `index.html?qualite=bas` (ou `moyen`, `haut`).
