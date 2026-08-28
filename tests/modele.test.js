/**
 * tests/modele.test.js — banc de tests du moteur physiologique.
 * =============================================================================
 *
 * Lancement :  node tests/modele.test.js
 *
 * Pas de framework, pas de dépendance : juste des assertions. Chaque test
 * RECALCULE la valeur attendue à partir de la physiologie, il ne recopie
 * jamais un résultat sorti du moteur.
 *
 * Le fichier importe modele.js. Tant que les fonctions ne sont pas écrites,
 * `node` s'arrête sur l'import : c'est normal, ce fichier décrit ce que les
 * étapes 1 à 4 de modele.js doivent produire.
 * =============================================================================
 */

import {
  coutEnergetiqueMinetti,
  fractionGlucides,
  osmolariteApport,
  reservesInitiales,
  plafondAbsorptionGParH,
} from '../assets/js/modele.js';

/* -------------------------------------------------------------------------- */
/* Micro-outillage d'assertion                                               */
/* -------------------------------------------------------------------------- */

let nbTotal = 0;
let nbEchecs = 0;

function verifie(nom, condition, details = '') {
  nbTotal += 1;
  if (condition) {
    console.log(`  ok   ${nom}`);
  } else {
    nbEchecs += 1;
    console.error(`  FAIL ${nom}${details ? '  → ' + details : ''}`);
  }
}

/** Égalité à une tolérance près (les calculs flottants ne tombent pas juste). */
function proche(valeur, attendu, tolerance) {
  return Math.abs(valeur - attendu) <= tolerance;
}

/* -------------------------------------------------------------------------- */
/* Étape 2 — coût énergétique                                                */
/* -------------------------------------------------------------------------- */

// À plat, le coût renvoyé est le coût BRUT de Rapoport, exactement 1.0
// kcal/kg/km. C'est le point de normalisation du polynôme de Minetti.
verifie(
  'coutEnergetiqueMinetti(0) vaut 1.0 exactement',
  coutEnergetiqueMinetti(0) === 1.0,
  `obtenu ${coutEnergetiqueMinetti(0)}`,
);

// Le polynôme brut de Minetti vaut 3.6 J/kg/m à pente nulle (terme constant).
// Après normalisation sur 1.0, une pente positive doit coûter plus cher.
verifie(
  'une montée à 10 % coûte plus cher que le plat',
  coutEnergetiqueMinetti(0.10) > coutEnergetiqueMinetti(0),
);

// Domaine borné : au-delà de ±0.45 on ne doit pas extrapoler.
verifie(
  'la pente est bornée à +0.45 (pas d\'extrapolation)',
  coutEnergetiqueMinetti(0.60) === coutEnergetiqueMinetti(0.45),
);

/* -------------------------------------------------------------------------- */
/* Étape 3 — répartition glucides / lipides                                  */
/* -------------------------------------------------------------------------- */

// Points d'ancrage de Romijn 1993, exprimés en FRACTION (0–1).
// 25 % VO₂max → 5 %,  65 % → 50 %,  85 % → 90 %.
for (const [pct, attenduPct] of [
  [25, 5],
  [65, 50],
  [85, 90],
]) {
  const f = fractionGlucides({ pctVO2max: pct });
  verifie(
    `fractionGlucides(${pct} % VO₂max) ≈ ${attenduPct} %`,
    proche(f, attenduPct / 100, 0.005),
    `obtenu ${(f * 100).toFixed(2)} %`,
  );
}

// Le résultat est toujours une fraction dans [0, 1].
verifie(
  'fractionGlucides reste dans [0, 1] aux extrêmes',
  (() => {
    const bas = fractionGlucides({ pctVO2max: 0 });
    const haut = fractionGlucides({ pctVO2max: 100 });
    return bas >= 0 && bas <= 1 && haut >= 0 && haut <= 1;
  })(),
);

/* -------------------------------------------------------------------------- */
/* Étape 4 — osmolarité d'une prise                                          */
/* -------------------------------------------------------------------------- */

// Boisson à 6 % : 60 g de glucose (180 g/mol) dans 1 L d'eau.
// 60/180 = 0.333 mol = 333 mmol dans 1 kg → ≈ 333 mOsm/kg.
verifie(
  'osmolarité d\'une boisson à 6 % ≈ 333 mOsm/kg',
  proche(osmolariteApport({ glucidesG: 60, eauMl: 1000, type: 'glucose' }), 333, 2),
  `obtenu ${osmolariteApport({ glucidesG: 60, eauMl: 1000, type: 'glucose' }).toFixed(1)}`,
);

// Gel : 25 g de glucides avec seulement 150 ml d'eau.
// 25/180 = 0.1389 mol dans 0.150 kg → ≈ 926 mOsm/kg. Très hypertonique.
verifie(
  'osmolarité d\'un gel de 25 g + 150 ml ≈ 926 mOsm/kg',
  proche(osmolariteApport({ glucidesG: 25, eauMl: 150, type: 'glucose' }), 926, 3),
  `obtenu ${osmolariteApport({ glucidesG: 25, eauMl: 150, type: 'glucose' }).toFixed(1)}`,
);

/* -------------------------------------------------------------------------- */
/* Étape 4 — réserves de glycogène initiales                                 */
/* -------------------------------------------------------------------------- */

// Homme 70 kg, régulier, sans recharge, petit-déjeuner pris.
// Muscle : 70 × (0.45 × 0.50) × 140 mmol/kg × 0.162 g/mmol ≈ 357 g.
// Foie   : 1.8 kg × 270 mmol/kg × 0.162 ≈ 79 g.
{
  const r = reservesInitiales({
    masseKg: 70,
    sexe: 'H',
    niveau: 'regulier',
    recharge: 'non',
    petitDejeuner: true,
  });
  verifie('réserves H 70 kg régulier — muscle ≈ 357 g', proche(r.muscleG, 357, 1),
    `obtenu ${r.muscleG.toFixed(1)}`);
  verifie('réserves H 70 kg régulier — foie ≈ 79 g', proche(r.foieG, 79, 1),
    `obtenu ${r.foieG.toFixed(1)}`);
}

// Femme 70 kg, même profil : fraction musculaire 0.36 au lieu de 0.45.
// Muscle : 70 × (0.36 × 0.50) × 140 × 0.162 ≈ 286 g.
{
  const r = reservesInitiales({
    masseKg: 70,
    sexe: 'F',
    niveau: 'regulier',
    recharge: 'non',
    petitDejeuner: true,
  });
  verifie('réserves F 70 kg régulier — muscle ≈ 286 g', proche(r.muscleG, 286, 1),
    `obtenu ${r.muscleG.toFixed(1)}`);
}

// Petit-déjeuner sauté : le foie part à moitié, le muscle est inchangé.
{
  const avec = reservesInitiales({ masseKg: 70, sexe: 'H', niveau: 'regulier', recharge: 'non', petitDejeuner: true });
  const sans = reservesInitiales({ masseKg: 70, sexe: 'H', niveau: 'regulier', recharge: 'non', petitDejeuner: false });
  verifie('petit-déjeuner sauté → foie ≈ moitié', proche(sans.foieG, avec.foieG * 0.5, 0.5));
  verifie('petit-déjeuner sauté → muscle inchangé', sans.muscleG === avec.muscleG);
}

/* -------------------------------------------------------------------------- */
/* Étape 4 — plafonds d'absorption                                           */
/* -------------------------------------------------------------------------- */

// La voie SGLT1 (glucose) ne dépasse JAMAIS 66 g/h, quel que soit
// l'entraînement intestinal. C'est l'affirmation la mieux établie du modèle.
for (const niveau of ['jamais', 'occasionnel', 'regulier']) {
  for (const type of ['glucose', 'glucose-fructose']) {
    const p = plafondAbsorptionGParH({ type, entrainementIntestinal: niveau });
    verifie(
      `SGLT1 ≤ 66 g/h (${type}, intestin ${niveau})`,
      p.sglt1GParH <= 66 + 1e-9,
      `obtenu ${p.sglt1GParH.toFixed(1)}`,
    );
  }
}

// Une prise de glucose seul n'ouvre pas la voie GLUT5.
verifie(
  'glucose seul → voie GLUT5 nulle',
  plafondAbsorptionGParH({ type: 'glucose', entrainementIntestinal: 'occasionnel' }).glut5GParH === 0,
);

// Intestin entraîné : le gain vient de GLUT5, pas de SGLT1.
{
  const occ = plafondAbsorptionGParH({ type: 'glucose-fructose', entrainementIntestinal: 'occasionnel' });
  const reg = plafondAbsorptionGParH({ type: 'glucose-fructose', entrainementIntestinal: 'regulier' });
  verifie('intestin entraîné → GLUT5 augmente', reg.glut5GParH > occ.glut5GParH);
  verifie('intestin entraîné → plafond combiné plus haut', reg.totalGParH > occ.totalGParH);
}

/* -------------------------------------------------------------------------- */
/* Bilan                                                                     */
/* -------------------------------------------------------------------------- */

console.log(`\n${nbTotal - nbEchecs}/${nbTotal} tests OK`);
process.exit(nbEchecs === 0 ? 0 : 1);
