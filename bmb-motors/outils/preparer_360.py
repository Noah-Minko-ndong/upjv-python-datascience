#!/usr/bin/env python3
"""Prépare une série de photos prises autour d'un véhicule pour la visite 3D.

Pour chaque photo : détourage (fond supprimé), recentrage, alignement des pneus sur une même
ligne de sol, puis export en WebP en deux tailles (960 px pour les téléphones, 1600 px pour les
ordinateurs). Toutes les photos reçoivent la même échelle, pour que la voiture ne « respire » pas
pendant la rotation.

Installation :
    pip install pillow rembg        (rembg n'est pas nécessaire avec --sans-detourage)

Exemple :
    python outils/preparer_360.py photos/212 assets/vehicules/212 --nombre 36 --longueur 4.4

Puis, dans src/donnees.js, pour ce véhicule :
    rendu: { type: "photos", dossier: "assets/vehicules/212/", nombre: 36, extension: "webp",
             largeurImage: <valeur affichée par le script>, sol: 0.08 }

Ordre des photos : la première est la face avant, puis on tourne autour du véhicule en passant
par son côté droit (côté passager), à pas réguliers. Les fichiers sont triés par nom : les noms
de l'appareil photo (IMG_0001, IMG_0002…) conviennent s'ils sont pris dans l'ordre.
Si le tour a été fait dans l'autre sens, ajoutez --sens-inverse.
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow est nécessaire : pip install pillow")

EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
TAILLES = {"1600": (1600, 900), "960": (960, 540)}


def detourer(img, sans_detourage):
    img = img.convert("RGBA")
    if sans_detourage:
        return img
    try:
        from rembg import remove
    except ImportError:
        sys.exit("rembg est nécessaire pour le détourage : pip install rembg "
                 "(ou utilisez --sans-detourage si vos photos sont déjà détourées)")
    return remove(img)


def boite_opaque(img, seuil=12):
    alpha = img.getchannel("A").point(lambda a: 255 if a > seuil else 0)
    return alpha.getbbox()


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("entree", type=Path, help="dossier des photos d'origine")
    p.add_argument("sortie", type=Path, help="dossier de sortie, ex. assets/vehicules/212")
    p.add_argument("--nombre", type=int, default=36, help="nombre d'images à garder (réparties sur le tour)")
    p.add_argument("--longueur", type=float, default=4.5, help="longueur réelle du véhicule, en mètres")
    p.add_argument("--sol", type=float, default=0.08, help="hauteur de la ligne de sol, en fraction de l'image")
    p.add_argument("--marge", type=float, default=0.04, help="marge latérale, en fraction de l'image")
    p.add_argument("--sans-detourage", action="store_true", help="photos déjà détourées (PNG/WebP transparents)")
    p.add_argument("--sens-inverse", action="store_true", help="le tour a été fait par le côté gauche du véhicule")
    a = p.parse_args()

    fichiers = sorted(f for f in a.entree.iterdir() if f.suffix.lower() in EXTENSIONS)
    if not fichiers:
        sys.exit(f"Aucune photo trouvée dans {a.entree}")
    if a.sens_inverse:
        fichiers = fichiers[:1] + fichiers[1:][::-1]
    if len(fichiers) < a.nombre:
        print(f"Attention : {len(fichiers)} photos seulement, on en garde {len(fichiers)}.")
        a.nombre = len(fichiers)
    choix = [fichiers[round(k * len(fichiers) / a.nombre) % len(fichiers)] for k in range(a.nombre)]

    print(f"Détourage de {len(choix)} photos…")
    images = []
    for k, f in enumerate(choix):
        img = detourer(Image.open(f), a.sans_detourage)
        boite = boite_opaque(img)
        if not boite:
            sys.exit(f"Rien de visible après détourage : {f.name}")
        images.append(img.crop(boite))
        print(f"  {k + 1:>2}/{len(choix)}  {f.name}")

    # Échelle commune : l'image la plus large (le profil) occupe toute la largeur utile.
    plus_large = max(i.width for i in images)
    for nom, (W, H) in TAILLES.items():
        dossier = a.sortie / nom
        dossier.mkdir(parents=True, exist_ok=True)
        echelle = W * (1 - 2 * a.marge) / plus_large
        ligne_sol = round(H * (1 - a.sol))
        for k, img in enumerate(images):
            w, h = max(1, round(img.width * echelle)), max(1, round(img.height * echelle))
            if h > ligne_sol:  # véhicule trop haut pour le cadre : on réduit
                w, h = round(w * ligne_sol / h), ligne_sol
            toile = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            toile.paste(img.resize((w, h), Image.LANCZOS), ((W - w) // 2, ligne_sol - h))
            toile.save(dossier / f"{k:02d}.webp", "WEBP", quality=82, method=6)

    largeur_image = a.longueur / (1 - 2 * a.marge)
    print("\nTerminé. À mettre dans src/donnees.js :")
    print(f'  rendu: {{ type: "photos", dossier: "{a.sortie.as_posix()}/", nombre: {a.nombre}, '
          f'extension: "webp", largeurImage: {largeur_image:.2f}, sol: {a.sol} }}')


if __name__ == "__main__":
    main()
