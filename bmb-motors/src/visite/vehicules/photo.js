// Véhicule affiché à partir d'une seule photo détourée, vue de face.
// La photo est posée debout sur la place, face à l'allée ; son reflet apparaît dans le marbre.
// La caméra s'arrête de face (voir parcours.js) : on ne tourne pas autour d'une photo plate.
import * as THREE from "three";

export async function chargerPhoto(rendu) {
  const texture = await new THREE.TextureLoader().loadAsync(rendu.image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const largeur = rendu.largeur || 2.6;
  const hauteur = largeur * (texture.image.height / texture.image.width);
  const geo = new THREE.PlaneGeometry(largeur, hauteur);
  geo.translate(0, hauteur / 2 - hauteur * (rendu.sol ?? 0.02), 0);
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.25, toneMapped: false });
  const creer = () => {
    const m = new THREE.Mesh(geo, mat);
    m.position.z = 1.4; // posée vers l'avant de la place, du côté de l'allée
    return m;
  };
  return { groupe: creer(), reflet: creer(), dimensions: { longueur: 4.6, largeur, hauteur } };
}
