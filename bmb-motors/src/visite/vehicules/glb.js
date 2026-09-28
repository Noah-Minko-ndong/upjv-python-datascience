// Chargement d'un modèle 3D sous licence (.glb). Le chargeur n'est téléchargé que si un véhicule
// en a besoin, pour ne pas alourdir le site.
import * as THREE from "three";

export async function chargerGLB(rendu, { qualite }) {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import("three/addons/loaders/GLTFLoader.js"),
    import("three/addons/libs/meshopt_decoder.module.js"),
  ]);
  const chargeur = new GLTFLoader();
  chargeur.setMeshoptDecoder(MeshoptDecoder); // modèles compressés avec gltfpack / gltf-transform
  const gltf = await chargeur.loadAsync(rendu.fichier);
  const modele = gltf.scene;

  // Mise à l'échelle sur la longueur réelle, centrage, roues posées au sol, avant vers +z.
  modele.rotation.y = rendu.rotation || 0;
  modele.updateMatrixWorld(true);
  const boite = new THREE.Box3().setFromObject(modele);
  const taille = boite.getSize(new THREE.Vector3());
  const echelle = (rendu.longueur || 4.5) / Math.max(taille.x, taille.z);
  modele.scale.setScalar(echelle);
  modele.updateMatrixWorld(true);
  boite.setFromObject(modele);
  const centre = boite.getCenter(new THREE.Vector3());
  modele.position.x -= centre.x;
  modele.position.z -= centre.z;
  modele.position.y -= boite.min.y;

  modele.traverse((o) => {
    if (o.isMesh && o.material && qualite === "bas") {
      // sur les petits appareils, on évite les matériaux physiques coûteux
      const m = o.material;
      if (m.isMeshPhysicalMaterial) {
        o.material = new THREE.MeshStandardMaterial({
          color: m.color, map: m.map, metalness: m.metalness, roughness: m.roughness,
          normalMap: m.normalMap, emissive: m.emissive, emissiveMap: m.emissiveMap,
          transparent: m.transparent, opacity: m.opacity,
        });
      }
    }
  });
  const groupe = new THREE.Group();
  groupe.add(modele);
  const taillePosee = new THREE.Box3().setFromObject(groupe).getSize(new THREE.Vector3());
  groupe.userData.dimensions = { longueur: taillePosee.z, largeur: taillePosee.x, hauteur: taillePosee.y };
  return groupe;
}
