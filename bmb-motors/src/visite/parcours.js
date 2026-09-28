// Trajet de la caméra, construit à partir du plan et du découpage de la visite.
// Chaque étape pose des points clés (position + point visé) ; on interpole entre eux par des
// courbes de Catmull-Rom, ce qui donne des mouvements continus sans à-coups.
import * as THREE from "three";
import { PLAN, centrePlace, profondeur } from "../plan.js";

const DEG = Math.PI / 180;

// Position sur le cercle autour d'une place. θ = 0 : face à l'avant du véhicule (côté allée) ;
// θ > 0 : on passe par le côté droit du véhicule (vers le fond du showroom).
function autour(c, rayon, theta, y) {
  return [c.x - rayon * Math.cos(theta), y, c.z - rayon * Math.sin(theta)];
}

export function construireParcours(vehicules, decoupage, { portrait }) {
  // Sur un écran en hauteur, on recule pour que la voiture tienne en largeur,
  // et on s'arrête un peu avant l'arrière (le mur est proche).
  const R = THREE.MathUtils.lerp(6.6, 8.4, portrait);
  const th0 = THREE.MathUtils.lerp(-38, -30, portrait) * DEG;
  const th1 = THREE.MathUtils.lerp(128, 112, portrait) * DEG;
  const D = profondeur(vehicules.length);
  const E = Object.fromEntries(decoupage.liste.map((e) => [e.id, e]));
  const cles = [];
  const cle = (t, pos, cible) => cles.push({ t, pos: new THREE.Vector3(...pos), cible: new THREE.Vector3(...cible) });
  const yOeil = 1.6, yTrottoir = PLAN.trottoir + 1.62;

  // 1. Arrivée devant la façade
  // sur téléphone, on vise plus bas : la façade monte dans l'image, le texte reste sur le parvis
  cle(E.arrivee.de, [0, yTrottoir + 0.1, 25], [0, THREE.MathUtils.lerp(4.4, 1.4, portrait), 0]);
  cle(E.arrivee.a, [0, yTrottoir, 17], [0, THREE.MathUtils.lerp(3.9, 2.4, portrait), 0]);
  // 2. Entrée : on s'approche, on monte les marches, les portes s'ouvrent
  const e = E.entree, de = e.a - e.de;
  cle(e.de + de * 0.42, [0, yTrottoir, 6.8], [0, 2.4, -10]);
  cle(e.de + de * 0.72, [0, yTrottoir + 0.45, 2.4], [0, 1.9, -16]);
  cle(e.a, [0, yOeil, -2], [0, 1.7, -22]);
  // 3. Allée
  const c0 = centrePlace(0);
  const debut0 = autour(c0, R, th0, 1.5);
  cle(E.allee.a, [0.4, yOeil, debut0[2] + 3.6], [4.2, 1.2, c0.z - 2]);

  vehicules.forEach((v, i) => {
    const c = centrePlace(i);
    const cibleV = [c.x, 0.78, c.z];
    // 4. Approche : on s'arrête face à la place, en trois-quarts avant
    cle(E[`approche-${i}`].a, autour(c, R, th0, 1.5), cibleV);
    // 5. Tour du véhicule : la caméra tourne autour, le véhicule reste garé
    const tour = E[`tour-${i}`];
    const pas = 7;
    for (let k = 1; k <= pas; k++) {
      const f = k / pas;
      const theta = th0 + (th1 - th0) * f;
      const y = 1.5 - Math.sin(f * Math.PI) * 0.3; // on descend un peu au profil
      cle(tour.de + (tour.a - tour.de) * f, autour(c, R, theta, y), cibleV);
    }
    // 6. Transfert vers la place suivante, en contournant le pilier
    const tr = E[`transfert-${i}`];
    if (tr) {
      const cn = centrePlace(i + 1);
      cle((tr.de + tr.a) / 2, [c.x - 1.0, 1.62, c.z - PLAN.pasPlaces * 0.62], [cn.x - 1.5, 1.0, cn.z]);
    }
  });

  // 7. Sortie : on revient dans l'allée, face au mur du logo
  const cl = centrePlace(vehicules.length - 1);
  const s = E.sortie, ds = s.a - s.de;
  cle(s.de + ds * 0.45, [cl.x - 1.5, 1.65, cl.z - PLAN.pasPlaces * 0.6], [0, 2.4, -D]);
  cle(s.a, [0, 1.72, -D + 13], [0, 3.0, -D]);
  cle(E.fin.a, [0, 1.7, -D + 11.5], [0, 3.0, -D]);

  const courbePos = new THREE.CatmullRomCurve3(cles.map((k) => k.pos), false, "centripetal");
  const courbeCible = new THREE.CatmullRomCurve3(cles.map((k) => k.cible), false, "centripetal");
  const n = cles.length;

  // p (0 → 1) → paramètre de courbe : linéaire entre deux points clés.
  function parametre(p) {
    if (p <= cles[0].t) return 0;
    for (let i = 0; i < n - 1; i++) {
      const a = cles[i].t, b = cles[i + 1].t;
      if (p <= b) return (i + (b > a ? (p - a) / (b - a) : 0)) / (n - 1);
    }
    return 1;
  }

  return {
    rayon: R,
    echantillonner(p, pos, cible) {
      const u = parametre(p);
      courbePos.getPoint(u, pos);
      courbeCible.getPoint(u, cible);
    },
  };
}
