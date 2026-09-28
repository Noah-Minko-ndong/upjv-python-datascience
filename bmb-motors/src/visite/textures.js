// Textures dessinées au canevas : aucune image à télécharger pour le décor.
import * as THREE from "three";

let anisotropie = 4;
export function reglerAnisotropie(a) { anisotropie = a; }

export const POLICE_TITRE = '"Unbounded", "Arial Black", sans-serif';

function toile(w, h, dessin) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  dessin(c.getContext("2d"), w, h);
  return c;
}

function versTexture(c, { srgb = true, repetition = null } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropie;
  if (repetition) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repetition[0], repetition[1]);
  }
  return t;
}

// Générateur pseudo-aléatoire reproductible : le marbre est identique à chaque visite.
function hasard(graine) {
  let s = graine % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// Marbre blanc veiné gris, en carreaux de 1 m (comme au showroom).
// cote = nombre de carreaux par côté de la texture.
export function marbre(cote = 2, pixelsParCarreau = 512) {
  const n = cote * pixelsParCarreau;
  const r = hasard(7);
  const c = toile(n, n, (g) => {
    for (let i = 0; i < cote; i++) {
      for (let j = 0; j < cote; j++) {
        const x0 = i * pixelsParCarreau, y0 = j * pixelsParCarreau, p = pixelsParCarreau;
        g.save();
        g.beginPath(); g.rect(x0, y0, p, p); g.clip();
        const ton = 232 + Math.floor(r() * 8);
        g.fillStyle = `rgb(${ton},${ton - 1},${ton - 4})`;
        g.fillRect(x0, y0, p, p);
        // nuages clairs et gris très doux
        for (let k = 0; k < 7; k++) {
          const cx = x0 + r() * p, cy = y0 + r() * p, rad = p * (0.2 + r() * 0.5);
          const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
          const sombre = r() < 0.5;
          gr.addColorStop(0, sombre ? "rgba(170,172,178,0.10)" : "rgba(255,255,255,0.35)");
          gr.addColorStop(1, "rgba(255,255,255,0)");
          g.fillStyle = gr; g.fillRect(x0, y0, p, p);
        }
        // veines : marches aléatoires qui traversent le carreau en diagonale
        const veines = 4 + Math.floor(r() * 5);
        for (let v = 0; v < veines; v++) {
          let x = x0 + r() * p, y = y0 + (r() < 0.5 ? -10 : r() * p);
          let angle = (r() < 0.5 ? 0.5 : 2.3) + r() * 0.5;
          const fine = r() < 0.7;
          g.strokeStyle = `rgba(${110 + r() * 30},${115 + r() * 30},${125 + r() * 30},${fine ? 0.18 + r() * 0.2 : 0.3 + r() * 0.25})`;
          g.lineWidth = fine ? 0.6 + r() * 0.8 : 1.2 + r() * 1.6;
          g.lineCap = "round";
          g.beginPath(); g.moveTo(x, y);
          const pas = 60 + Math.floor(r() * 80);
          for (let s = 0; s < pas; s++) {
            angle += (r() - 0.5) * 0.7;
            x += Math.cos(angle) * 6; y += Math.sin(angle) * 6;
            g.lineTo(x, y);
            if (r() < 0.02) { // ramification
              g.stroke(); g.beginPath(); g.moveTo(x, y);
              g.lineWidth *= 0.7;
            }
          }
          g.stroke();
        }
        g.restore();
        // joints
        g.fillStyle = "rgba(160,158,152,0.55)";
        g.fillRect(x0, y0, p, 2); g.fillRect(x0, y0, 2, p);
      }
    }
  });
  return versTexture(c);
}

// Éclairage « précalculé » du sol intérieur : halos sous les réglettes (émissif)
// et ombres douces au pied des murs, des piliers et des places (occlusion).
export function eclairageSol({ largeur, profondeur, piliers, reglettes }) {
  const echelle = 16; // pixels par mètre
  const w = Math.round(largeur * echelle), h = Math.round(profondeur * echelle);
  const px = (x) => (x + largeur / 2) * echelle;
  const pz = (z) => -z * echelle;
  const halos = toile(w, h, (g) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";
    for (const r of reglettes) {
      const gr = g.createRadialGradient(px(r.x), pz(r.z), 0, px(r.x), pz(r.z), 2.4 * echelle);
      gr.addColorStop(0, "rgba(255,250,240,0.22)");
      gr.addColorStop(1, "rgba(255,250,240,0)");
      g.fillStyle = gr;
      g.fillRect(px(r.x) - 3 * echelle, pz(r.z) - 3 * echelle, 6 * echelle, 6 * echelle);
    }
  });
  const occlusion = toile(w, h, (g) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    // pied des murs
    const bord = 1.2 * echelle;
    const bande = (x, y, bw, bh, x1, y1, x2, y2) => {
      const gr = g.createLinearGradient(x1, y1, x2, y2);
      gr.addColorStop(0, "rgba(0,0,0,0.45)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(x, y, bw, bh);
    };
    bande(0, 0, bord, h, 0, 0, bord, 0);
    bande(w - bord, 0, bord, h, w, 0, w - bord, 0);
    bande(0, h - bord, w, bord, 0, h, 0, h - bord);
    // pieds des piliers
    for (const p of piliers) {
      const gr = g.createRadialGradient(px(p.x), pz(p.z), 0.2 * echelle, px(p.x), pz(p.z), 1.1 * echelle);
      gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(px(p.x) - 1.2 * echelle, pz(p.z) - 1.2 * echelle, 2.4 * echelle, 2.4 * echelle);
    }
  });
  const a = versTexture(halos), b = versTexture(occlusion, { srgb: false });
  return { halos: a, occlusion: b };
}

// Panneaux composites gris de la façade (un motif = 6 m × 4,5 m).
export function panneauxFacade() {
  const c = toile(1024, 768, (g, w, h) => {
    g.fillStyle = "#7D8185"; g.fillRect(0, 0, w, h);
    const r = hasard(3);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const t = (r() - 0.5) * 8;
      g.fillStyle = `rgba(${t > 0 ? 255 : 0},${t > 0 ? 255 : 0},${t > 0 ? 255 : 0},${Math.abs(t) / 100})`;
      g.fillRect(i * w / 5, j * h / 5, w / 5, h / 5);
    }
    // léger ruissellement vertical
    for (let k = 0; k < 60; k++) {
      g.fillStyle = `rgba(40,42,46,${0.015 + r() * 0.03})`;
      g.fillRect(r() * w, r() * h * 0.5, 1 + r() * 3, h * (0.2 + r() * 0.6));
    }
    g.fillStyle = "rgba(40,42,46,0.55)";
    for (let i = 0; i <= 5; i++) g.fillRect(i * w / 5 - 1.5, 0, 3, h);
    for (let j = 0; j <= 5; j++) g.fillRect(0, j * h / 5 - 1.5, w, 3);
  });
  return versTexture(c);
}

// Pavés du parvis.
export function paves() {
  const c = toile(512, 512, (g, w, h) => {
    g.fillStyle = "#8E8983"; g.fillRect(0, 0, w, h);
    const r = hasard(11), n = 8, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n * 2; j++) {
      const t = 128 + Math.floor(r() * 26);
      g.fillStyle = `rgb(${t + 12},${t + 6},${t})`;
      const dx = (j % 2) * s / 2;
      g.fillRect(i * s + dx + 2, j * s / 2 + 2, s - 4, s / 2 - 4);
    }
  });
  return versTexture(c);
}

// Dessine un « O » en forme de roue : jante pleine, 5 trous autour du moyeu.
// trous = couleur des trous, ou null pour les découper (le mur apparaît au travers).
function roue(g, cx, cy, r, couleur, trous) {
  g.save();
  g.fillStyle = couleur;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  if (!trous) g.globalCompositeOperation = "destination-out";
  g.fillStyle = trous || "#000";
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + k * (Math.PI * 2 / 5);
    g.save();
    g.translate(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5);
    g.rotate(a + Math.PI / 2);
    g.beginPath(); g.ellipse(0, 0, r * 0.2, r * 0.26, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  g.beginPath(); g.arc(cx, cy, r * 0.13, 0, Math.PI * 2); g.fill();
  g.restore();
}

function largeurMot(g, mot, px) {
  let l = 0;
  for (const ch of mot) l += ch === "O" ? px * 0.86 : ch === " " ? px * 0.42 : g.measureText(ch).width + px * 0.04;
  return l;
}

function ecrireMot(g, mot, x, yBase, px, couleur, trous) {
  g.font = `800 ${px}px ${POLICE_TITRE}`;
  g.textBaseline = "alphabetic";
  let cx = x;
  for (const ch of mot) {
    if (ch === "O") {
      const r = px * 0.39;
      roue(g, cx + r, yBase - px * 0.36, r, couleur, trous);
      cx += px * 0.86;
    } else if (ch === " ") {
      cx += px * 0.42;
    } else {
      g.fillStyle = couleur;
      g.fillText(ch, cx, yBase);
      cx += g.measureText(ch).width + px * 0.04;
    }
  }
}

// Logo « BB » orange, strié de coupes horizontales comme sur l'enseigne.
// À remplacer par le logo vectoriel officiel si vous l'avez (voir README).
function marqueBB(g, cx, cy, taille) {
  const t = toile(Math.ceil(taille * 1.25), Math.ceil(taille), (h, w, hh) => {
    h.font = `800 ${taille * 0.92}px ${POLICE_TITRE}`;
    h.textAlign = "center"; h.textBaseline = "middle";
    // premier B, strié de coupes horizontales en biseau (effet de vitesse)
    h.fillStyle = "#F0501E";
    h.fillText("B", w * 0.42, hh * 0.54);
    h.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 3; k++) {
      const y = hh * (0.33 + k * 0.15);
      h.beginPath();
      h.moveTo(0, y); h.lineTo(w * 0.5, y - hh * 0.03); h.lineTo(w * 0.5, y); h.lineTo(0, y + hh * 0.03);
      h.closePath(); h.fill();
    }
    // second B plein, détouré pour se détacher du premier
    h.lineWidth = taille * 0.05; h.lineJoin = "round";
    h.strokeText("B", w * 0.62, hh * 0.54);
    h.globalCompositeOperation = "source-over";
    h.fillText("B", w * 0.62, hh * 0.54);
  });
  g.drawImage(t, cx - t.width / 2, cy - t.height / 2);
}

// Enseigne de façade : lettres blanches, O en roues aux trous orange.
export function enseigneFacade() {
  const W = 2048, H = 300, px = 190;
  let largeur = 0;
  const c = toile(W, H, (g) => {
    g.font = `800 ${px}px ${POLICE_TITRE}`;
    largeur = largeurMot(g, "BMB MOTORS", px);
    ecrireMot(g, "BMB MOTORS", (W - largeur) / 2, H * 0.78, px, "#FFFFFF", "#F0501E");
  });
  return { texture: versTexture(c), ratio: W / H, remplissage: largeur / W };
}

export function marqueSeule() {
  const c = toile(512, 400, (g, w, h) => marqueBB(g, w / 2, h / 2, 380));
  return versTexture(c);
}

// Mur du fond : logo orange au-dessus de BMB MOTORS en lettres noires (O découpés).
export function murLogo() {
  const W = 2048, H = 1024;
  const c = toile(W, H, (g) => {
    marqueBB(g, W / 2, H * 0.3, 470);
    const px = 200;
    g.font = `800 ${px}px ${POLICE_TITRE}`;
    const l = largeurMot(g, "BMB MOTORS", px);
    ecrireMot(g, "BMB MOTORS", (W - l) / 2, H * 0.86, px, "#141518", null);
  });
  return versTexture(c);
}

// Marquage au sol d'une place : numéro et nom, gravés dans le marbre.
export function marquagePlace(numero, nom) {
  const c = toile(1024, 320, (g, w, h) => {
    g.fillStyle = "rgba(44,46,50,0.92)";
    g.font = `800 150px ${POLICE_TITRE}`;
    g.textBaseline = "middle";
    g.fillText(numero, 30, h * 0.52);
    const lp = g.measureText(numero).width;
    g.fillRect(lp + 70, h * 0.2, 5, h * 0.64);
    g.font = `600 84px ${POLICE_TITRE}`;
    g.fillText(nom.toUpperCase(), lp + 115, h * 0.54);
  });
  return versTexture(c);
}

// Dégradé radial (ombres de contact, halos de lumière).
export function degradeRadial(interieur = "rgba(0,0,0,1)", allonge = 1) {
  const c = toile(256, 256, (g, w, h) => {
    g.save();
    g.translate(w / 2, h / 2); g.scale(1, allonge);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, w / 2);
    gr.addColorStop(0, interieur);
    gr.addColorStop(0.55, interieur.replace(/[\d.]+\)$/, "0.45)"));
    gr.addColorStop(1, interieur.replace(/[\d.]+\)$/, "0)"));
    g.fillStyle = gr; g.fillRect(-w / 2, -h / 2 / allonge, w, h / allonge);
    g.restore();
  });
  return versTexture(c);
}

// Ombre de contact rectangulaire aux bords doux, pour poser une voiture sur le sol.
export function ombreVoiture() {
  const c = toile(256, 512, (g, w, h) => {
    g.filter = "blur(22px)";
    g.fillStyle = "rgba(0,0,0,0.85)";
    g.beginPath(); g.roundRect(w * 0.2, h * 0.14, w * 0.6, h * 0.72, 40); g.fill();
    g.filter = "blur(6px)";
    g.fillStyle = "rgba(0,0,0,0.9)";
    for (const [x, y] of [[0.25, 0.24], [0.75, 0.24], [0.25, 0.76], [0.75, 0.76]]) {
      g.beginPath(); g.ellipse(w * x, h * y, w * 0.08, h * 0.07, 0, 0, Math.PI * 2); g.fill();
    }
  });
  return versTexture(c);
}

// Feuillage de plante verte (pour les pots au pied des piliers).
export function feuille() {
  const c = toile(128, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, "#2F5A24"); gr.addColorStop(1, "#5D8A3A");
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(w / 2, h);
    g.quadraticCurveTo(w * 1.02, h * 0.45, w / 2, 0);
    g.quadraticCurveTo(-w * 0.02, h * 0.45, w / 2, h);
    g.fill();
    g.strokeStyle = "rgba(220,235,190,0.55)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 6); g.stroke();
  });
  return versTexture(c);
}

// ————— Habillage de la concession —————

// Kakémono (bannière enroulable) : bandeau orange, logo, message.
export function kakemono(ligne1, ligne2) {
  const c = toile(400, 1024, (g, w, h) => {
    g.fillStyle = "#1E2024"; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, 0, h * 0.62);
    gr.addColorStop(0, "#F0501E"); gr.addColorStop(1, "#C63B12");
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h * 0.5); g.lineTo(0, h * 0.62); g.closePath(); g.fill();
    marqueBB(g, w / 2, h * 0.17, 230);
    g.fillStyle = "#fff"; g.textAlign = "center";
    g.font = `800 50px ${POLICE_TITRE}`;
    g.fillText(ligne1, w / 2, h * 0.36);
    g.font = `500 30px ${POLICE_TITRE}`;
    g.fillText(ligne2, w / 2, h * 0.42);
    const px = 44;
    g.font = `800 ${px}px ${POLICE_TITRE}`;
    const l = largeurMot(g, "BMB MOTORS", px);
    g.textAlign = "left";
    ecrireMot(g, "BMB MOTORS", (w - l) / 2, h * 0.86, px, "#FFFFFF", "#F0501E");
    g.fillStyle = "#A7ABB2"; g.textAlign = "center";
    g.font = `500 24px ${POLICE_TITRE}`;
    g.fillText("COCODY · ABIDJAN", w / 2, h * 0.92);
  });
  return versTexture(c);
}

// Voile de drapeau « plume » orange avec BMB en blanc (texte vertical).
export function drapeau() {
  const c = toile(256, 1024, (g, w, h) => {
    g.fillStyle = "#F0501E";
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(w * 1.1, h * 0.02, w, h * 0.35); g.lineTo(w * 0.8, h); g.lineTo(0, h); g.closePath(); g.fill();
    g.save();
    g.translate(w * 0.48, h * 0.62); g.rotate(-Math.PI / 2);
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `800 110px ${POLICE_TITRE}`;
    g.fillText("BMB", 0, 0);
    g.restore();
  });
  return versTexture(c);
}

// Grand panneau mural : fond anthracite, larges bandes orange obliques, titre.
export function panneauMural(titre, sousTitre) {
  const c = toile(1600, 700, (g, w, h) => {
    g.fillStyle = "#24272C"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#F0501E";
    for (let k = 0; k < 3; k++) {
      const x = w * 0.62 + k * 110;
      g.beginPath(); g.moveTo(x, h); g.lineTo(x + 70, h); g.lineTo(x + 330, 0); g.lineTo(x + 260, 0); g.closePath(); g.fill();
    }
    g.fillStyle = "rgba(240,80,30,0.25)";
    g.beginPath(); g.moveTo(w * 0.5, h); g.lineTo(w * 0.72, 0); g.lineTo(w, 0); g.lineTo(w, h); g.closePath(); g.fill();
    g.fillStyle = "#fff"; g.textBaseline = "alphabetic";
    g.font = `800 96px ${POLICE_TITRE}`;
    g.fillText(titre, 90, h * 0.46);
    g.fillStyle = "#C9CCD1";
    g.font = `500 44px ${POLICE_TITRE}`;
    g.fillText(sousTitre, 92, h * 0.62);
    const px = 52;
    g.font = `800 ${px}px ${POLICE_TITRE}`;
    ecrireMot(g, "BMB MOTORS", 92, h * 0.86, px, "#FFFFFF", "#F0501E");
  });
  return versTexture(c);
}

// Façade du comptoir d'accueil : blanc, bande orange, logo.
export function faceComptoir() {
  const c = toile(1024, 256, (g, w, h) => {
    g.fillStyle = "#F2F2EF"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#F0501E"; g.fillRect(0, h * 0.78, w, h * 0.08);
    marqueBB(g, w * 0.3, h * 0.42, 150);
    const px = 58;
    g.font = `800 ${px}px ${POLICE_TITRE}`;
    ecrireMot(g, "BMB MOTORS", w * 0.42, h * 0.54, px, "#141518", "#F0501E");
  });
  return versTexture(c);
}

// Tapis du salon : chiné gris avec liseré orange.
export function tapis() {
  const c = toile(512, 512, (g, w, h) => {
    g.fillStyle = "#4A4D52"; g.fillRect(0, 0, w, h);
    const r = hasard(5);
    for (let k = 0; k < 4000; k++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},0.05)`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    g.strokeStyle = "#E2542C"; g.lineWidth = 8;
    g.strokeRect(26, 26, w - 52, h - 52);
  });
  return versTexture(c);
}
