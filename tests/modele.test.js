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
  puissanceMetabolique,
  fractionGlucides,
  osmolariteApport,
  reservesInitiales,
  plafondAbsorptionGParH,
  facteurVidangeGastrique,
  betaSang,
  simuler,
} from '../assets/js/modele.js';
import {
  surfaceCorporelleM2,
  tauxSudationLParH,
  sodiumSueurMgParL,
} from '../assets/js/sudation.js';

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
/* Étape 5 — vidange gastrique                                               */
/* -------------------------------------------------------------------------- */

// Sous tous les seuils (boisson isotonique, effort modéré, pas de
// déshydratation) : aucun ralentissement.
verifie(
  'vidange non ralentie sous les seuils',
  facteurVidangeGastrique({ osmolariteMOsmKg: 280, pctVO2max: 70, perteMassePct: 0 }) === 1,
);

// Un gel très hypertonique à haute intensité ralentit nettement, sans jamais
// descendre sous le plancher.
{
  const f = facteurVidangeGastrique({ osmolariteMOsmKg: 900, pctVO2max: 90, perteMassePct: 0 });
  verifie('gel hypertonique + haute intensité → vidange ralentie', f < 0.6 && f >= 0.3,
    `facteur ${f.toFixed(3)}`);
}

// Hook déshydratation : perteMassePct = 0 ne change rien (phase 1).
verifie(
  'déshydratation à 0 % → sans effet',
  facteurVidangeGastrique({ osmolariteMOsmKg: 280, pctVO2max: 70, perteMassePct: 0 }) ===
    facteurVidangeGastrique({ osmolariteMOsmKg: 280, pctVO2max: 70 }),
);

/* -------------------------------------------------------------------------- */
/* Étape 6 — beta (part sanguine de l'oxydation glucidique)                  */
/* -------------------------------------------------------------------------- */

verifie('beta au départ ≈ 0.25', proche(betaSang(0), 0.25, 1e-9));
verifie('beta au plateau (180 min) ≈ 0.45', proche(betaSang(180), 0.45, 1e-9));
verifie('beta après le plateau reste à 0.45', proche(betaSang(600), 0.45, 1e-9));
verifie('beta croît entre 0 et 180 min', betaSang(90) > betaSang(0) && betaSang(90) < betaSang(180));

/* -------------------------------------------------------------------------- */
/* Étapes 7 à 9 — simulation complète (marathon 70 kg, 3 h 30)              */
/* -------------------------------------------------------------------------- */

/** Fabrique une entrée « marathon 70 kg en 3 h 30 » avec un plan donné. */
function marathon(plan, profilEnPlus = {}) {
  return simuler({
    profil: {
      sexe: 'H',
      masseKg: 70,
      niveau: 'regulier',
      recharge: 'non',
      entrainementIntestinal: 'occasionnel',
      petitDejeuner: true,
      ...profilEnPlus,
    },
    course: {
      distanceKm: 42.195,
      vitesseMoyenneMPerMin: 42195 / 210,
      intensitePctVO2max: 75,
    },
    massePorteeKg: 0,
    terrain: 'route',
    penteMoyenneTangente: 0,
    plan,
  });
}

/** Prises régulières : `glucidesG` toutes les `pasMin` min, de `debutMin` à 210. */
function planRegulier({ debutMin, pasMin, glucidesG, type, eauMl }) {
  const plan = [];
  for (let t = debutMin; t < 210; t += pasMin) {
    plan.push({ instantMin: t, glucidesG, type, eauMl });
  }
  return plan;
}

// --- Point 1 : sans apport, le FOIE atteint zéro AVANT le muscle ---
{
  const r = marathon([]);
  const foieZero = r.glycogene.epuisementFoie;
  const muscleZero = r.glycogene.epuisementMuscle;
  verifie('sans apport — le foie s\'épuise', foieZero !== null,
    `foie résiduel ${r.synthese.foieResiduelFraction}`);
  verifie(
    'sans apport — le foie s\'épuise AVANT le muscle',
    foieZero !== null && (muscleZero === null || foieZero.minute < muscleZero.minute),
    `foie ${foieZero && foieZero.minute} min / muscle ${muscleZero && muscleZero.minute} min`,
  );
  verifie('sans apport — diagnostic HYPOGLYCEMIE émis',
    r.diagnostics.some((d) => d.code === 'HYPOGLYCEMIE'));
}

// --- Point 2 : avec 60 g/h de glucose-fructose, le foie tient jusqu'au bout ---
{
  const plan = planRegulier({ debutMin: 12, pasMin: 12, glucidesG: 12, type: 'glucose-fructose', eauMl: 200 });
  const r = marathon(plan);
  verifie('60 g/h — le foie ne s\'épuise pas', r.glycogene.epuisementFoie === null,
    `foie résiduel ${r.synthese.foieResiduelFraction}`);
  verifie('60 g/h — pas de diagnostic HYPOGLYCEMIE',
    !r.diagnostics.some((d) => d.code === 'HYPOGLYCEMIE'));
}

// --- Point 3 : 150 g/h → absorption plafonnée, surplus intestinal massif ---
// Eau généreuse (800 ml par prise) : on veut isoler le plafond des
// TRANSPORTEURS, pas le ralentissement de la vidange gastrique. Avec moins
// d'eau une part du surplus resterait coincée dans l'estomac.
{
  const plan = planRegulier({ debutMin: 10, pasMin: 20, glucidesG: 50, type: 'glucose-fructose', eauMl: 800 });
  const r = marathon(plan);
  const absMaxGParH = Math.max(...r.glucides.absorptionGMin) * 60;
  verifie('150 g/h — l\'absorption plafonne autour de 90 g/h',
    absMaxGParH >= 80 && absMaxGParH <= 95, `max ${absMaxGParH.toFixed(0)} g/h`);
  verifie('150 g/h — le stock intestinal dépasse 150 g en fin de course',
    r.synthese.surplusIntestinalFinG > 150, `${r.synthese.surplusIntestinalFinG} g`);
  verifie('150 g/h — diagnostic SURPLUS_DIGESTIF émis',
    r.diagnostics.some((d) => d.code === 'SURPLUS_DIGESTIF'));
  verifie('150 g/h — ingéré nettement supérieur à absorbé',
    r.synthese.glucidesIngeresG - r.synthese.glucidesAbsorbesG > 150);
}

// --- Le fantôme est calculé et le plan épargne du glycogène ---
{
  const plan = planRegulier({ debutMin: 20, pasMin: 20, glucidesG: 20, type: 'glucose-fructose', eauMl: 300 });
  const r = marathon(plan);
  const d = r.temps.minutes.length - 1;
  verifie('fantôme présent', Array.isArray(r.fantome.muscleFraction) && r.fantome.muscleFraction.length === d + 1);
  verifie(
    'le plan épargne du glycogène par rapport au fantôme',
    r.glycogene.muscleFraction[d] + r.glycogene.foieFraction[d] >
      r.fantome.muscleFraction[d] + r.fantome.foieFraction[d],
  );
}

// --- Conservation de la masse et de l'énergie ---
{
  const r = marathon([]); // marathon sans apport : gros déficit garanti
  const d = r.temps.minutes.length - 1;
  const somme = (arr) => arr.reduce((a, b) => a + b, 0);

  // Masse : glucides oxydés = glycogène puisé (muscle + foie) + exogène utilisé.
  const glycogenePuiseG =
    r.meta.reservesInitiales.muscleG - r.glycogene.muscleG[d] +
    (r.meta.reservesInitiales.foieG - r.glycogene.foieG[d]);
  const exogeneUtiliseG =
    r.glucides.absorptionCumuleeG[d] - r.glucides.excedentAbsorbeCumuleG[d];
  const oxydesG = somme(r.glucides.oxydationGlucidesGMin);
  verifie(
    'conservation masse — glucides oxydés = glycogène puisé + exogène utilisé',
    proche(oxydesG, glycogenePuiseG + exogeneUtiliseG, 0.5),
    `${oxydesG.toFixed(1)} vs ${(glycogenePuiseG + exogeneUtiliseG).toFixed(1)}`,
  );

  // Énergie : énergie SOUTENABLE = part lipidique (allure cible) + glucides oxydés.
  const partLipidiqueKcal = somme(
    r.energie.puissanceKcalMin.map((p, i) => (1 - r.energie.fractionGlucides[i]) * p),
  );
  const soutenableKcal = somme(r.energie.puissanceSoutenableKcalMin);
  verifie(
    'conservation énergie — énergie soutenable = lipides + glucides oxydés',
    proche(soutenableKcal, partLipidiqueKcal + oxydesG * 4, 1),
    `${soutenableKcal.toFixed(0)} vs ${(partLipidiqueKcal + oxydesG * 4).toFixed(0)}`,
  );

  // Le déficit est réel : sans apport, l'énergie soutenable < ce que la course coûte.
  verifie(
    'sans apport — énergie soutenable nettement sous le coût de la course',
    r.synthese.energieSoutenableKcal < r.synthese.depenseTotaleKcal - 50,
    `soutenable ${r.synthese.energieSoutenableKcal} / coût ${r.synthese.depenseTotaleKcal}`,
  );
  verifie(
    'sans apport — diagnostic ALLURE_INTENABLE émis',
    r.diagnostics.some((diag) => diag.code === 'ALLURE_INTENABLE'),
  );

  // Minutes perdues : estimation positive et plausible, temps estimé > prévu.
  verifie(
    'sans apport — minutes perdues estimées entre 5 et 90',
    r.synthese.minutesPerduesEstimees >= 5 && r.synthese.minutesPerduesEstimees <= 90,
    `${r.synthese.minutesPerduesEstimees} min`,
  );
  verifie(
    'sans apport — temps estimé = durée prévue + minutes perdues',
    proche(r.synthese.tempsEstimeMin, r.meta.dureeMin + r.synthese.minutesPerduesEstimees, 1),
    `${r.synthese.tempsEstimeMin} vs ${r.meta.dureeMin} + ${r.synthese.minutesPerduesEstimees}`,
  );
  verifie(
    'sans apport — les minutes perdues figurent dans le diagnostic ALLURE_INTENABLE',
    r.diagnostics.find((diag) => diag.code === 'ALLURE_INTENABLE').valeurs.minutesPerduesEstimees > 0,
  );
}

// --- Ravitaillement suffisant : aucun déficit, énergie soutenable = coût ---
{
  const plan = planRegulier({ debutMin: 10, pasMin: 15, glucidesG: 22, type: 'glucose-fructose', eauMl: 250 });
  const r = marathon(plan);
  verifie(
    '90 g/h — énergie soutenable = coût de la course (aucun déficit)',
    proche(r.synthese.energieSoutenableKcal, r.synthese.depenseTotaleKcal, 5),
    `soutenable ${r.synthese.energieSoutenableKcal} / coût ${r.synthese.depenseTotaleKcal}`,
  );
  verifie(
    '90 g/h — aucune minute perdue, temps estimé = temps prévu',
    r.synthese.minutesPerduesEstimees === 0 && r.synthese.tempsEstimeMin === r.meta.dureeMin,
  );
  verifie(
    '90 g/h — pas de diagnostic ALLURE_INTENABLE',
    !r.diagnostics.some((diag) => diag.code === 'ALLURE_INTENABLE'),
  );
}

// --- Cas limite §3.5.8 : vitesse nulle ne casse rien ---
{
  const r = simuler({
    profil: { sexe: 'H', masseKg: 70, niveau: 'regulier', recharge: 'non', entrainementIntestinal: 'occasionnel', petitDejeuner: true },
    course: { distanceKm: 42.195, vitesseMoyenneMPerMin: 0, intensitePctVO2max: 75 },
    plan: [],
  });
  verifie('vitesse nulle → 0 minute simulée, pas de crash',
    r.meta.dureeMin === 0 && r.temps.minutes.length === 1 && r.diagnostics.length === 0);
}

/* -------------------------------------------------------------------------- */
/* Sudation et sodium                                                        */
/* -------------------------------------------------------------------------- */

// Surface corporelle — contrôle de Du Bois : 175 cm, 70 kg → ≈ 1.85 m².
verifie(
  'surface corporelle 175 cm / 70 kg ≈ 1.85 m²',
  proche(surfaceCorporelleM2({ tailleCm: 175, masseKg: 70 }), 1.85, 0.02),
  `${surfaceCorporelleM2({ tailleCm: 175, masseKg: 70 }).toFixed(3)}`,
);

// Cas de contrôle GSSI (70 kg, 175 cm, marathon 3 h 30) : la puissance à
// l'allure cible sert d'entrée, testée à trois températures.
{
  const surfaceM2 = surfaceCorporelleM2({ tailleCm: 175, masseKg: 70 });
  const puissance = puissanceMetabolique({
    coutKcalParKgKm: coutEnergetiqueMinetti(0),
    masseTotaleKg: 70,
    vitesseMPerMin: 42195 / 210,
    facteurTerrain: 1,
    deriveEconomie: 0,
  });
  const cas = [
    { tempC: 15, cible: 0.5, bande: [0.4, 0.65] },
    { tempC: 25, cible: 0.9, bande: [0.8, 1.15] },
    { tempC: 32, cible: 1.4, bande: [1.2, 1.6] },
  ];
  for (const { tempC, cible, bande } of cas) {
    const l = tauxSudationLParH({ puissanceKcalMin: puissance, surfaceM2, temperatureC: tempC });
    verifie(
      `sudation à ${tempC} °C ≈ ${cible} L/h (contrôle GSSI)`,
      l >= bande[0] && l <= bande[1],
      `${l.toFixed(2)} L/h`,
    );
    verifie(
      `sudation à ${tempC} °C dans la fourchette réaliste [0.3, 3.0]`,
      l >= 0.3 && l <= 3.0,
    );
  }
}

// La sudation croît quand il fait plus chaud.
{
  const surfaceM2 = surfaceCorporelleM2({ tailleCm: 175, masseKg: 70 });
  const P = 14;
  const chaud = tauxSudationLParH({ puissanceKcalMin: P, surfaceM2, temperatureC: 30 });
  const frais = tauxSudationLParH({ puissanceKcalMin: P, surfaceM2, temperatureC: 10 });
  verifie('sudation monotone en température', chaud > frais);
}

// Sodium de la sueur : 20 / 40 / 70 mmol/L × 22.99.
verifie(
  'sodium sueur "moyen" ≈ 920 mg/L',
  proche(sodiumSueurMgParL({ sueurSalee: 'moyen' }), 40 * 22.99, 0.1),
);
verifie(
  'sueur salée "eleve" > "faible"',
  sodiumSueurMgParL({ sueurSalee: 'eleve' }) > sodiumSueurMgParL({ sueurSalee: 'faible' }),
);

// Intégration dans la simulation : bilan hydrique cohérent, déshydratation
// signalée quand la perte de masse nette dépasse 2 %.
{
  const chaud = marathon([], { tailleCm: 175, sueurSalee: 'moyen' });
  // marathon() ne fixe pas la température → défaut 15 °C dans le moteur.
  verifie(
    'course à 15 °C sans boire — eau perdue entre 1 et 3 L',
    chaud.synthese.eauPerdueTotaleL >= 1 && chaud.synthese.eauPerdueTotaleL <= 3,
    `${chaud.synthese.eauPerdueTotaleL} L`,
  );
  verifie(
    'course sans boire — diagnostic DESHYDRATATION émis',
    chaud.diagnostics.some((d) => d.code === 'DESHYDRATATION'),
  );
  verifie(
    'perte de masse finale = dernière valeur de la série',
    proche(
      chaud.synthese.perteMasseFinalePct,
      chaud.hydrique.perteMassePct[chaud.hydrique.perteMassePct.length - 1],
      0.05,
    ),
  );
}

// Boire réduit la perte de masse nette (l'eau vidée de l'estomac compte).
{
  const sansBoire = marathon([], { tailleCm: 175 });
  const enBuvant = marathon(
    planRegulier({ debutMin: 10, pasMin: 15, glucidesG: 15, type: 'glucose', eauMl: 400 }),
    { tailleCm: 175 },
  );
  verifie(
    'boire réduit la perte de masse nette',
    enBuvant.synthese.perteMasseFinalePct < sansBoire.synthese.perteMasseFinalePct,
    `${enBuvant.synthese.perteMasseFinalePct}% en buvant / ${sansBoire.synthese.perteMasseFinalePct}% sans`,
  );
  verifie(
    'la sueur brute (eau à perdre) ne dépend pas de la boisson',
    proche(enBuvant.synthese.eauPerdueTotaleL, sansBoire.synthese.eauPerdueTotaleL, 0.05),
  );
}

/* -------------------------------------------------------------------------- */
/* Bilan                                                                     */
/* -------------------------------------------------------------------------- */

console.log(`\n${nbTotal - nbEchecs}/${nbTotal} tests OK`);
process.exit(nbEchecs === 0 ? 0 : 1);
