# Photos 360° et modèles 3D des véhicules

## Prendre la série de photos

- 24 à 36 photos par véhicule, une tous les 10 à 15°, en faisant le tour complet.
- Première photo : face avant. Ensuite, tourner en passant par le **côté droit** du véhicule (côté passager).
- Même distance (4 à 5 m) et même hauteur (environ 1,2 m) pour toutes les photos. Des repères au sol (ruban adhésif) aident beaucoup.
- Véhicule propre, roues droites, portes fermées. Éviter le contre-jour.

## Préparer les photos

```
pip install pillow rembg
python outils/preparer_360.py photos/212 assets/vehicules/212 --nombre 36 --longueur 4.4
```

Le script détoure les photos, les aligne sur la même ligne de sol et produit
`assets/vehicules/212/960/00.webp …` (téléphones) et `assets/vehicules/212/1600/00.webp …` (ordinateurs).
Il affiche la ligne `rendu: { … }` à copier dans `src/donnees.js`. Vérifiez le détourage image par image.

## Modèle 3D sous licence (.glb)

Déposez le fichier ici (ex. `assets/vehicules/212.glb`) puis, dans `src/donnees.js` :

```js
rendu: { type: "glb", fichier: "assets/vehicules/212.glb", longueur: 4.4, rotation: 0 }
```

`longueur` met le modèle à l'échelle ; `rotation` (en radians) corrige son orientation si l'avant
ne regarde pas l'allée. Pour le mobile, visez moins de 5 Mo : les modèles compressés avec
`gltfpack -cc` (meshopt) sont pris en charge.
