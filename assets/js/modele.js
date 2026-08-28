/**
 * modele.js — le moteur physiologique du simulateur.
 * =============================================================================
 *
 * SÉPARATION STRICTE : ce fichier ne touche JAMAIS au DOM et n'importe QUE
 * `constantes.js`. On doit pouvoir vérifier toute la physiologie sans lire une
 * seule ligne d'affichage. C'est ce qui rend le site crédible.
 *
 * Toutes les fonctions sont PURES : mêmes entrées → mêmes sorties, aucun effet
 * de bord. Elles sont testées dans tests/modele.test.js.
 *
 * État d'avancement (feuille de route phase 1) :
 *   ✔ Étape 1 — utilitaires purs
 *   ✔ Étape 2 — coût énergétique et puissance métabolique
 *   ✔ Étape 3 — répartition glucides / lipides
 *   ✔ Étape 4 — réserves initiales, plafonds d'absorption, osmolarité
 *   ✔ Étape 5 — vidange gastrique (facteur de ralentissement)
 *   ✔ Étape 6 — briques de la boucle : absorption d'un pas, beta sang
 *   ✔ Étape 7 — simulerScenario() : la boucle minute par minute
 *   ✔ Étape 8 — analyse des compartiments (zone critique / épuisement)
 *   ✔ Étape 9 — simuler() : scénario réel + fantôme, diagnostics, synthèse
 *
 * Beaucoup de paramètres de fonction sont déjà là mais neutres en phase 1
 * (niveau, température, durée…). Ils portent les modulateurs des phases
 * suivantes : on écrit la signature une fois, on l'active plus tard.
 * =============================================================================
 */

import {
  MINETTI,
  DERIVE_ECONOMIE,
  CROSSOVER,
  GLYCOGENE_MUSCLE,
  GLYCOGENE_FOIE,
  ABSORPTION_INTESTIN,
  OSMOLARITE,
  CONVERSIONS,
  VIDANGE_GASTRIQUE,
  METABOLISME_GLUCIDIQUE,
  SEUILS,
  FACTEUR_TERRAIN,
  PLAGES,
} from './constantes.js';

/* ========================================================================== */
/* ÉTAPE 1 — Utilitaires purs                                                 */
/* ========================================================================== */

/**
 * Ramène `valeur` dans l'intervalle [min, max].
 * @param {number} valeur
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function borner(valeur, min, max) {
  return Math.min(Math.max(valeur, min), max);
}

/**
 * Rampe linéaire bornée : vaut `yDebut` jusqu'à `xDebut`, `yFin` à partir de
 * `xFin`, et interpole entre les deux. Sert aux montées progressives du
 * modèle (dérive de l'économie, ralentissements de la vidange…).
 * @returns {number}
 */
export function rampe(x, xDebut, xFin, yDebut, yFin) {
  if (x <= xDebut) return yDebut;
  if (x >= xFin) return yFin;
  const proportion = (x - xDebut) / (xFin - xDebut);
  return yDebut + proportion * (yFin - yDebut);
}

/**
 * Évalue un polynôme par le schéma de Horner. `coeffs` est rangé du degré le
 * plus élevé au terme constant : [a, b, c] représente a·x² + b·x + c.
 * @param {number[]} coeffs
 * @param {number} x
 * @returns {number}
 */
export function evaluePolynome(coeffs, x) {
  return coeffs.reduce((acc, c) => acc * x + c, 0);
}

/**
 * Vitesse moyenne en mètres par minute, déduite d'une distance et d'un temps.
 * L'interface convertit allure ⇄ temps ⇄ vitesse ; le moteur ne manipule que
 * la vitesse.
 * @param {number} distanceKm
 * @param {number} tempsMin
 * @returns {number} m/min (0 si le temps est nul ou négatif)
 */
export function vitesseMPerMinDepuisTemps(distanceKm, tempsMin) {
  if (tempsMin <= 0) return 0;
  return (distanceKm * 1000) / tempsMin;
}

/**
 * Temps total en minutes pour une distance donnée à une allure donnée.
 * @param {number} allureMinParKm  minutes par kilomètre
 * @param {number} distanceKm
 * @returns {number} minutes
 */
export function tempsMinDepuisAllure(allureMinParKm, distanceKm) {
  return allureMinParKm * distanceKm;
}

/**
 * Arrondit `valeur` à `decimales` chiffres après la virgule. Utilisé pour les
 * nombres exposés dans la synthèse et les diagnostics (pas dans les calculs).
 * @param {number} valeur
 * @param {number} decimales
 * @returns {number}
 */
export function arrondi(valeur, decimales) {
  const facteur = 10 ** decimales;
  return Math.round(valeur * facteur) / facteur;
}

/* ========================================================================== */
/* ÉTAPE 2 — Coût énergétique et puissance métabolique                        */
/* ========================================================================== */

// Valeur du polynôme brut de Minetti à pente nulle (son terme constant, 3.6).
// Sert de dénominateur à la normalisation. Calculée une seule fois.
const MINETTI_A_PLAT = evaluePolynome(MINETTI.COEFFS, 0);

/**
 * Coût énergétique de la course en kcal/kg/km, en fonction de la pente.
 *
 * Minetti (2002) donne un coût NET (surcoût du déplacement, mesuré sur tapis) :
 * Cr(0) = 3.6 J/kg/m = 0.86 kcal/kg/km. Rapoport (2010) donne un coût BRUT
 * (total) à plat de ~1.0 kcal/kg/km. On garde la FORME de Minetti — comment le
 * coût varie avec la pente — mais on la renormalise sur le coût brut à plat :
 *
 *     cout(i) = COUT_PLAT_BRUT × Minetti(i) / Minetti(0)
 *
 * À plat, le rapport vaut exactement 1 → cout(0) = 1.0 kcal/kg/km.
 * La pente est bornée au domaine expérimental [-0.45, +0.45] : on ne l'extrapole
 * jamais au-delà.
 *
 * Phase 1 : toujours appelée avec 0 (course sur plat). Écrite complète pour la
 * phase 3.
 *
 * @param {number} penteTangente  pente en tangente (0.10 = 10 %)
 * @returns {number} kcal/kg/km
 */
export function coutEnergetiqueMinetti(penteTangente) {
  const pente = borner(penteTangente, MINETTI.PENTE_MIN, MINETTI.PENTE_MAX);
  const brut = evaluePolynome(MINETTI.COEFFS, pente);
  return MINETTI.COUT_PLAT_BRUT_KCAL_PAR_KG_KM * (brut / MINETTI_A_PLAT);
}

/**
 * Dérive de l'économie de course : fraction ajoutée au coût énergétique à
 * cause de la fatigue. Le coût réel devient  coût × (1 + dérive).
 *
 * Phase 1 : rampe linéaire du TEMPS écoulé, de 0 à DERIVE_ECONOMIE.MAX sur
 * DERIVE_ECONOMIE.DELAI_MIN, puis plateau.
 * Phase 3 : `dMoinsCumuleM` prendra le relais (dérive pilotée par le dénivelé
 * négatif encaissé, pas seulement par le temps). Sans effet pour l'instant.
 *
 * @param {{ tempsEcouleMin: number, dMoinsCumuleM?: number }} params
 * @returns {number} fraction dans [0, DERIVE_ECONOMIE.MAX]
 */
export function deriveEconomieCourse({ tempsEcouleMin, dMoinsCumuleM = 0 }) {
  // dMoinsCumuleM : hook phase 3, volontairement ignoré en phase 1.
  return rampe(tempsEcouleMin, 0, DERIVE_ECONOMIE.DELAI_MIN, 0, DERIVE_ECONOMIE.MAX);
}

/**
 * Puissance métabolique en kcal par minute.
 *
 *   coût (kcal/kg/km) × masse totale (kg) × vitesse (km/min)
 *     × facteur terrain × (1 + dérive de l'économie)
 *
 * La vitesse est fournie en m/min (unité du moteur) et convertie en km/min.
 * Aucune conversion joule ici : depuis la normalisation de Minetti, tout est
 * déjà en kcal.
 *
 * @param {{
 *   coutKcalParKgKm: number,
 *   masseTotaleKg: number,
 *   vitesseMPerMin: number,
 *   facteurTerrain: number,
 *   deriveEconomie: number
 * }} params
 * @returns {number} kcal/min
 */
export function puissanceMetabolique({
  coutKcalParKgKm,
  masseTotaleKg,
  vitesseMPerMin,
  facteurTerrain,
  deriveEconomie,
}) {
  const vitesseKmParMin = vitesseMPerMin / 1000;
  return (
    coutKcalParKgKm *
    masseTotaleKg *
    vitesseKmParMin *
    facteurTerrain *
    (1 + deriveEconomie)
  );
}

/* ========================================================================== */
/* ÉTAPE 3 — Répartition glucides / lipides                                   */
/* ========================================================================== */

/**
 * Fraction de l'énergie fournie par les GLUCIDES (le reste vient des lipides),
 * en fonction de l'intensité relative.
 *
 * Quadratique de CLAUDE.md §3.2b, calée sur Romijn (1993) :
 *   25 % VO₂max → 5 %,  65 % → 50 %,  85 % → 90 %.
 * Le polynôme prend x EN POURCENTAGE et rend un POURCENTAGE : la division par
 * 100 (passage en fraction) se fait ICI, une seule fois dans tout le moteur.
 *
 * Les autres paramètres portent les modulateurs prévus par CLAUDE.md, tous
 * NEUTRES en phase 1 :
 *   - niveau        : les entraînés oxydent plus de lipides à intensité égale ;
 *   - temperatureC  : la chaleur augmente la part glucidique ;
 *   - dureeEcouleeMin : glissement lent vers les lipides avec la durée ;
 *   - glycogeneCritique : bascule forcée vers les lipides quand les réserves
 *     musculaires sont au plus bas.
 * Ils sont dans la signature pour que la phase 4 n'ait qu'à les activer.
 *
 * @param {{
 *   pctVO2max: number,
 *   niveau?: string,
 *   temperatureC?: number|null,
 *   dureeEcouleeMin?: number,
 *   glycogeneCritique?: boolean
 * }} params
 * @returns {number} fraction dans [0, 1]
 */
export function fractionGlucides({
  pctVO2max,
  niveau = 'regulier',
  temperatureC = null,
  dureeEcouleeMin = 0,
  glycogeneCritique = false,
}) {
  const pourcentage = evaluePolynome(CROSSOVER.FCHO_COEFFS_PCT, pctVO2max);

  // ===== UNIQUE passage pourcentage → fraction de tout le moteur =====
  const fraction = pourcentage / 100;

  // Modulateurs des phases suivantes (tous ×1.00 en phase 1) : ils
  // s'appliqueraient ici, avant le bornage. Volontairement inactifs.

  return borner(fraction, CROSSOVER.FCHO_MIN, CROSSOVER.FCHO_MAX);
}

/* ========================================================================== */
/* ÉTAPE 4 — Réserves initiales, plafonds d'absorption, osmolarité            */
/* ========================================================================== */

/**
 * Réserves de glycogène au départ, en grammes, pour les deux compartiments
 * DISTINCTS : muscle actif (jambes) et foie.
 *
 * Muscle :
 *   masse corporelle × fraction de muscle actif (dépend du SEXE) × densité
 *   de glycogène (niveau, majorée par la recharge, plafonnée) × g/mmol.
 * Foie :
 *   1.8 kg × densité hépatique (état de recharge) × g/mmol,
 *   puis × 0.5 si le petit-déjeuner n'a pas été pris (nuit à jeun).
 *
 * @param {{
 *   masseKg: number,
 *   sexe: 'H'|'F',
 *   niveau: 'debutant'|'regulier'|'confirme'|'elite',
 *   recharge: 'non'|'partielle'|'complete',
 *   petitDejeuner: boolean
 * }} params
 * @returns {{ muscleG: number, foieG: number }}
 */
export function reservesInitiales({ masseKg, sexe, niveau, recharge, petitDejeuner }) {
  const gParMmol = CONVERSIONS.G_GLYCOGENE_PAR_MMOL_GLUCOSYL;

  // --- Compartiment musculaire ---
  const fractionMuscleActif =
    GLYCOGENE_MUSCLE.FRACTION_MASSE_MUSCULAIRE_PAR_SEXE[sexe] *
    GLYCOGENE_MUSCLE.FRACTION_MUSCLE_JAMBES;
  const masseMuscleActifKg = masseKg * fractionMuscleActif;

  const densiteMuscleMmolKg = Math.min(
    GLYCOGENE_MUSCLE.DENSITE_BASE_MMOL_KG[niveau] *
      GLYCOGENE_MUSCLE.FACTEUR_RECHARGE[recharge],
    GLYCOGENE_MUSCLE.DENSITE_MAX_MMOL_KG,
  );

  const muscleG = masseMuscleActifKg * densiteMuscleMmolKg * gParMmol;

  // --- Compartiment hépatique ---
  let foieG =
    GLYCOGENE_FOIE.MASSE_KG * GLYCOGENE_FOIE.DENSITE_MMOL_KG[recharge] * gParMmol;

  // Nuit sans petit-déjeuner : le foie part à environ la moitié. Appliqué
  // APRÈS la recharge (recharge puis petit-déjeuner sauté → ~0.5 × chargé).
  if (!petitDejeuner) {
    foieG *= GLYCOGENE_FOIE.FACTEUR_A_JEUN;
  }

  return { muscleG, foieG };
}

/**
 * Débits d'absorption maximaux des DEUX voies de transport, en g/min.
 *
 * C'est la brique utilisée par la boucle de simulation : chaque voie vide
 * son propre stock intestinal à ce rythme, indépendamment.
 *   - SGLT1 (glucose + maltodextrine) : plafond de base × facteur
 *     d'entraînement, MAIS borné dur à ~1.1 g/min (66 g/h) — un transporteur
 *     unique ne va pas plus vite, quel que soit l'entraînement.
 *   - GLUT5 (fructose) : plafond de base × facteur d'entraînement. C'est ici
 *     que l'entraînement intestinal fait réellement gagner. Il ne contribue
 *     à l'absorption que s'il y a du fructose dans la lumière : ça, c'est la
 *     boucle qui le gère (stock de fructose nul → absorption nulle).
 *
 * @param {{ entrainementIntestinal: 'jamais'|'occasionnel'|'regulier' }} params
 * @returns {{ sglt1GParMin: number, glut5GParMin: number }}
 */
export function plafondsVoiesGParMin({ entrainementIntestinal }) {
  const A = ABSORPTION_INTESTIN;
  const facteur = A.FACTEUR_ENTRAINEMENT[entrainementIntestinal];

  const sglt1GParH = Math.min(
    A.PLAFOND_SGLT1_G_PAR_H * facteur,
    A.PLAFOND_SGLT1_ABSOLU_G_PAR_H,
  );
  const glut5GParH = A.PLAFOND_GLUT5_G_PAR_H * facteur;

  return { sglt1GParMin: sglt1GParH / 60, glut5GParMin: glut5GParH / 60 };
}

/**
 * Plafonds d'absorption en g/h, décomposés par voie, pour un TYPE de prise
 * donné. Sert à l'affichage (« ligne de plafond » du graphique glucides) et à
 * la synthèse ; la boucle, elle, utilise plafondsVoiesGParMin().
 *
 * Le plafond combiné n'est pas une constante : il émerge de la somme. Pour une
 * prise de glucose seul, la voie GLUT5 est comptée à 0.
 *
 * @param {{
 *   type: 'glucose'|'glucose-fructose',
 *   entrainementIntestinal: 'jamais'|'occasionnel'|'regulier'
 * }} params
 * @returns {{ sglt1GParH: number, glut5GParH: number, totalGParH: number }}
 */
export function plafondAbsorptionGParH({ type, entrainementIntestinal }) {
  const { sglt1GParMin, glut5GParMin } = plafondsVoiesGParMin({ entrainementIntestinal });
  const sglt1GParH = sglt1GParMin * 60;
  const glut5GParH = type === 'glucose-fructose' ? glut5GParMin * 60 : 0;

  return { sglt1GParH, glut5GParH, totalGParH: sglt1GParH + glut5GParH };
}

/**
 * Osmolarité d'une prise, en mOsm/kg d'eau.
 *
 * Phase 1 : tous les glucides sont comptés comme des monosaccharides
 * (masse molaire 180 g/mol) — hypothèse conservatrice, l'osmolarité réelle
 * d'une prise à base de maltodextrine serait plus basse. Le paramètre `type`
 * est déjà là pour ce raffinement futur.
 *
 * @param {{ glucidesG: number, eauMl: number, type?: string }} params
 * @returns {number} mOsm/kg, borné à OSMOLARITE.PLAFOND_MOSM_KG
 */
export function osmolariteApport({ glucidesG, eauMl, type = 'glucose' }) {
  const moles = glucidesG / OSMOLARITE.MASSE_MOLAIRE_GLUCOSE_G_PAR_MOL;
  const kgEau = eauMl / 1000;

  // Prise sans eau associée : on renvoie le plafond au lieu de diviser par
  // zéro (cas limite CLAUDE.md §3.5.8).
  if (kgEau <= 0) {
    return OSMOLARITE.PLAFOND_MOSM_KG;
  }

  // Coefficient osmotique ≈ 1 pour les sucres simples : 1 mmol/kg ≈ 1 mOsm/kg.
  const mOsmParKg = (moles * 1000) / kgEau;
  return Math.min(mOsmParKg, OSMOLARITE.PLAFOND_MOSM_KG);
}

/* ========================================================================== */
/* ÉTAPE 5 — Vidange gastrique                                                */
/* ========================================================================== */

/**
 * Facteur de ralentissement de la vidange gastrique, dans
 * [VIDANGE_GASTRIQUE.FACTEUR_TOTAL_MIN, 1]. Multiplie K_BASE_PAR_MIN.
 *
 * Trois freins indépendants, chacun une rampe linéaire, multipliés entre eux :
 *   - osmolarité du CONTENU gastrique (pas d'une prise isolée) ;
 *   - intensité de l'effort ;
 *   - déshydratation (perte de masse corporelle) — HOOK phase 1 : perteMassePct
 *     vaut toujours 0, donc ce frein est neutre jusqu'à la phase 4.
 *
 * ⚠ Simplification phase 1 (voir aussi constantes.js) : l'eau et les glucides
 * quittent l'estomac à la MÊME fraction par pas, donc l'osmolarité du contenu
 * gastrique reste stable entre deux prises. Dans la réalité l'eau se vide plus
 * vite, ce qui concentre le résidu et freinerait davantage.
 *
 * @param {{
 *   osmolariteMOsmKg: number,
 *   pctVO2max: number,
 *   perteMassePct?: number
 * }} params
 * @returns {number}
 */
export function facteurVidangeGastrique({ osmolariteMOsmKg, pctVO2max, perteMassePct = 0 }) {
  const V = VIDANGE_GASTRIQUE;

  const fOsmolarite = rampe(
    osmolariteMOsmKg,
    V.OSMOLARITE_SEUIL_BAS_MOSM_KG,
    V.OSMOLARITE_SEUIL_HAUT_MOSM_KG,
    1,
    V.OSMOLARITE_FACTEUR_MIN,
  );

  const fIntensite = rampe(
    pctVO2max,
    V.INTENSITE_SEUIL_PCT_VO2MAX,
    V.INTENSITE_PLEIN_RALENTISSEMENT_PCT_VO2MAX,
    1,
    V.INTENSITE_FACTEUR_MIN,
  );

  const fDeshydratation = rampe(
    perteMassePct,
    V.DESHYDRATATION_SEUIL_PCT,
    V.DESHYDRATATION_PLEIN_RALENTISSEMENT_PCT,
    1,
    V.DESHYDRATATION_FACTEUR_MIN,
  );

  const produit = fOsmolarite * fIntensite * fDeshydratation;
  return Math.max(produit, V.FACTEUR_TOTAL_MIN);
}

/* ========================================================================== */
/* ÉTAPE 6 — Briques de la boucle                                             */
/* ========================================================================== */

/**
 * Grammes de glucose et de fructose absorbés pendant UN pas de 1 minute.
 * Chaque voie vide son propre stock intestinal, chacune à son plafond (g/min),
 * sans jamais absorber plus que ce qui est présent. Le reste s'accumule dans
 * la lumière : c'est l'origine des troubles digestifs.
 *
 * @param {{
 *   lumenGlucoseG: number,
 *   lumenFructoseG: number,
 *   sglt1GParMin: number,
 *   glut5GParMin: number
 * }} params
 * @returns {{ glucoseAbsG: number, fructoseAbsG: number }}
 */
export function absorptionPas({ lumenGlucoseG, lumenFructoseG, sglt1GParMin, glut5GParMin }) {
  return {
    glucoseAbsG: Math.min(lumenGlucoseG, sglt1GParMin),
    fructoseAbsG: Math.min(lumenFructoseG, glut5GParMin),
  };
}

/**
 * beta(t) : fraction de l'oxydation glucidique du pas qui provient du SANG
 * (glycémie, défendue par l'absorbé puis le foie). Le complément (1 − beta)
 * vient directement du glycogène musculaire, brûlé sur place.
 *
 * Rampe linéaire de FRACTION_SANG_INITIALE à FRACTION_SANG_FINALE sur
 * FRACTION_SANG_DELAI_MIN, puis plateau.
 *
 * @param {number} tempsEcouleMin
 * @returns {number} fraction dans [FRACTION_SANG_INITIALE, FRACTION_SANG_FINALE]
 */
export function betaSang(tempsEcouleMin) {
  const M = METABOLISME_GLUCIDIQUE;
  return rampe(
    tempsEcouleMin,
    0,
    M.FRACTION_SANG_DELAI_MIN,
    M.FRACTION_SANG_INITIALE,
    M.FRACTION_SANG_FINALE,
  );
}

/* ========================================================================== */
/* ÉTAPE 7 — La boucle minute par minute                                      */
/* ========================================================================== */

/**
 * Simule UN scénario (un plan de ravitaillement donné) à pas de 1 minute.
 * Fonction pure : ne lit que `entrees` et `plan`, ne mute rien d'externe.
 *
 * Renvoie des séries temporelles brutes de longueur (dureeMin + 1) :
 *   - index 0 = état initial, avant la 1re minute ;
 *   - index k = état après k minutes.
 * Les séries de DÉBIT (puissance, fCHO, absorption, oxydation) valent 0 à
 * l'index 0 et portent, à l'index k, la valeur moyenne de la k-ième minute.
 *
 * @param {object} entrees  profil + course + terrain (voir simuler())
 * @param {Array}  plan     liste de prises { instantMin, glucidesG, type, eauMl, ratio? }
 * @returns {object} séries + scalaires du scénario
 */
export function simulerScenario(entrees, plan) {
  const { profil, course } = entrees;

  /* --- Bornage défensif des entrées (cas limites §3.5.8) --- */
  const masseKg = borner(profil.masseKg, PLAGES.masseKg[0], PLAGES.masseKg[1]);
  const massePorteeKg = borner(
    entrees.massePorteeKg ?? 0,
    PLAGES.massePorteeKg[0],
    PLAGES.massePorteeKg[1],
  );
  const intensitePctVO2max = borner(
    course.intensitePctVO2max,
    PLAGES.intensitePctVO2max[0],
    PLAGES.intensitePctVO2max[1],
  );
  const distanceKm = borner(
    course.distanceKm,
    PLAGES.distanceKm[0],
    PLAGES.distanceKm[1],
  );
  const vitesseMPerMin = course.vitesseMoyenneMPerMin;
  const terrain = entrees.terrain ?? 'route';
  const penteMoyenneTangente = entrees.penteMoyenneTangente ?? 0;

  /* --- Constantes du scénario (invariantes minute après minute en phase 1) --- */
  const dureeMin =
    Number.isFinite(vitesseMPerMin) && vitesseMPerMin > 0 && distanceKm > 0
      ? Math.ceil((distanceKm * 1000) / vitesseMPerMin)
      : 0;
  const masseTotaleKg = masseKg + massePorteeKg;
  const coutKcalParKgKm = coutEnergetiqueMinetti(penteMoyenneTangente);
  const facteurTerrain = FACTEUR_TERRAIN[terrain] ?? 1;
  const { muscleG: muscleInitialG, foieG: foieInitialG } = reservesInitiales({
    masseKg,
    sexe: profil.sexe,
    niveau: profil.niveau,
    recharge: profil.recharge,
    petitDejeuner: profil.petitDejeuner,
  });
  const { sglt1GParMin, glut5GParMin } = plafondsVoiesGParMin({
    entrainementIntestinal: profil.entrainementIntestinal,
  });

  /* --- Prises regroupées par minute entière --- */
  const prisesParMinute = new Map();
  for (const prise of plan ?? []) {
    const t = Math.round(prise.instantMin);
    if (!prisesParMinute.has(t)) prisesParMinute.set(t, []);
    prisesParMinute.get(t).push(prise);
  }

  /* --- État courant --- */
  let muscleG = muscleInitialG;
  let foieG = foieInitialG;
  let estomacGlucoseG = 0;
  let estomacFructoseG = 0;
  let estomacEauMl = 0;
  let lumenGlucoseG = 0;
  let lumenFructoseG = 0;
  let depenseCumuleeKcalCourant = 0; // ce que la course COÛTE à l'allure cible
  let energieSoutenableCumuleeKcalCourant = 0; // ce que le coureur PEUT fournir à cette allure
  let ingereCumuleGCourant = 0;
  let absorptionCumuleeGCourant = 0;
  let oxydationCumuleeGlucidesG = 0;
  let excedentAbsorbeCumuleGCourant = 0;
  let premiereHypoglycemieMin = null;
  let premierMurMuscleMin = null;
  let premiereAllureIntenableMin = null;
  let minFractionAllureTenable = 1;
  // Pour estimer les minutes perdues : on somme la fraction d'allure tenable
  // sur les seules minutes en déficit.
  let nMinutesEnDeficit = 0;
  let sommeFractionTenableEnDeficit = 0;

  /* --- Séries (longueur dureeMin + 1) --- */
  const N = dureeMin + 1;
  const nouvelleSerie = () => new Array(N).fill(0);
  const minutes = nouvelleSerie();
  const distanceKmSerie = nouvelleSerie();
  const puissanceKcalMin = nouvelleSerie();
  const fractionGlucidesSerie = nouvelleSerie();
  const depenseCumuleeKcal = nouvelleSerie();
  const ingereCumuleG = nouvelleSerie();
  const estomacGSerie = nouvelleSerie();
  const estomacEauMlSerie = nouvelleSerie();
  const lumenGlucoseGSerie = nouvelleSerie();
  const lumenFructoseGSerie = nouvelleSerie();
  const lumenTotalGSerie = nouvelleSerie();
  const absorptionGMin = nouvelleSerie();
  const absorptionCumuleeG = nouvelleSerie();
  const oxydationGlucidesGMin = nouvelleSerie();
  const excedentAbsorbeCumuleG = nouvelleSerie();
  const deficitGlucidesGMin = nouvelleSerie();
  const puissanceSoutenableKcalMin = nouvelleSerie();
  const fractionAllureTenableSerie = nouvelleSerie();
  const energieSoutenableCumuleeKcal = nouvelleSerie();
  const muscleGSerie = nouvelleSerie();
  const foieGSerie = nouvelleSerie();
  const muscleFraction = nouvelleSerie();
  const foieFraction = nouvelleSerie();

  /** Écrit l'état courant dans toutes les séries à l'index i. */
  function enregistre(i, debits) {
    const {
      puissance = 0,
      fCHO = 0,
      absG = 0,
      oxyG = 0,
      deficitG = 0,
      puissanceSoutenable = 0,
      fractionTenable = 1,
    } = debits ?? {};
    minutes[i] = i;
    distanceKmSerie[i] = Math.min((vitesseMPerMin * i) / 1000, distanceKm) || 0;
    puissanceKcalMin[i] = puissance;
    fractionGlucidesSerie[i] = fCHO;
    depenseCumuleeKcal[i] = depenseCumuleeKcalCourant;
    deficitGlucidesGMin[i] = deficitG;
    puissanceSoutenableKcalMin[i] = puissanceSoutenable;
    fractionAllureTenableSerie[i] = fractionTenable;
    energieSoutenableCumuleeKcal[i] = energieSoutenableCumuleeKcalCourant;
    ingereCumuleG[i] = ingereCumuleGCourant;
    estomacGSerie[i] = estomacGlucoseG + estomacFructoseG;
    estomacEauMlSerie[i] = estomacEauMl;
    lumenGlucoseGSerie[i] = lumenGlucoseG;
    lumenFructoseGSerie[i] = lumenFructoseG;
    lumenTotalGSerie[i] = lumenGlucoseG + lumenFructoseG;
    absorptionGMin[i] = absG;
    absorptionCumuleeG[i] = absorptionCumuleeGCourant;
    oxydationGlucidesGMin[i] = oxyG;
    excedentAbsorbeCumuleG[i] = excedentAbsorbeCumuleGCourant;
    muscleGSerie[i] = muscleG;
    foieGSerie[i] = foieG;
    muscleFraction[i] = muscleInitialG > 0 ? muscleG / muscleInitialG : 0;
    foieFraction[i] = foieInitialG > 0 ? foieG / foieInitialG : 0;
  }

  enregistre(0);

  for (let m = 0; m < dureeMin; m++) {
    /* (1) Prises entrant dans l'estomac au début de la minute m */
    for (const prise of prisesParMinute.get(m) ?? []) {
      if (prise.type === 'glucose-fructose') {
        const [rg, rf] = prise.ratio ?? ABSORPTION_INTESTIN.RATIO_GLUCOSE_FRUCTOSE_DEFAUT;
        const somme = rg + rf;
        estomacGlucoseG += (prise.glucidesG * rg) / somme;
        estomacFructoseG += (prise.glucidesG * rf) / somme;
      } else {
        // 'glucose' = glucose + maltodextrine : tout sur la voie SGLT1.
        estomacGlucoseG += prise.glucidesG;
      }
      estomacEauMl += prise.eauMl ?? 0;
      ingereCumuleGCourant += prise.glucidesG;
    }

    /* (2) Puissance métabolique et besoin glucidique du pas */
    const deriveEconomie = deriveEconomieCourse({ tempsEcouleMin: m });
    const puissance = puissanceMetabolique({
      coutKcalParKgKm,
      masseTotaleKg,
      vitesseMPerMin,
      facteurTerrain,
      deriveEconomie,
    });
    depenseCumuleeKcalCourant += puissance;

    const glycogeneCritique =
      muscleInitialG > 0 && muscleG / muscleInitialG <= SEUILS.ZONE_CRITIQUE_FRACTION;
    const fCHO = fractionGlucides({
      pctVO2max: intensitePctVO2max,
      niveau: profil.niveau,
      temperatureC: course.temperatureC ?? null,
      dureeEcouleeMin: m,
      glycogeneCritique,
    });
    const besoinTotalG = (puissance * fCHO) / CONVERSIONS.KCAL_PAR_G_GLYCOGENE;

    /* (3) Vidange gastrique : même fraction pour l'eau et les glucides */
    const carbsGastriques = estomacGlucoseG + estomacFructoseG;
    const osmolariteContenu =
      carbsGastriques > 0
        ? osmolariteApport({ glucidesG: carbsGastriques, eauMl: estomacEauMl })
        : 0;
    const facteurVidange = facteurVidangeGastrique({
      osmolariteMOsmKg: osmolariteContenu,
      pctVO2max: intensitePctVO2max,
      perteMassePct: 0, // hook phase 4
    });
    const fractionVidee = Math.min(
      VIDANGE_GASTRIQUE.K_BASE_PAR_MIN * facteurVidange,
      1,
    );
    const glucoseVideG = estomacGlucoseG * fractionVidee;
    const fructoseVideG = estomacFructoseG * fractionVidee;
    const eauVideMl = estomacEauMl * fractionVidee;
    estomacGlucoseG -= glucoseVideG;
    estomacFructoseG -= fructoseVideG;
    estomacEauMl -= eauVideMl;
    lumenGlucoseG += glucoseVideG;
    lumenFructoseG += fructoseVideG;
    // L'eau vidée n'est pas suivie dans l'intestin en phase 1 (hydratation = phase 4).

    /* (4) Absorption intestinale : chaque voie à son plafond */
    const { glucoseAbsG, fructoseAbsG } = absorptionPas({
      lumenGlucoseG,
      lumenFructoseG,
      sglt1GParMin,
      glut5GParMin,
    });
    lumenGlucoseG -= glucoseAbsG;
    lumenFructoseG -= fructoseAbsG;
    const absorbeG = glucoseAbsG + fructoseAbsG;
    absorptionCumuleeGCourant += absorbeG;

    /* (5) Répartition sang / muscle — deux défaillances distinctes */
    const beta = betaSang(m);
    const besoinSangG = beta * besoinTotalG;
    const besoinMuscleG = besoinTotalG - besoinSangG;

    // Le sang : l'absorbé d'abord, puis le foie (débit plafonné). Sinon
    // hypoglycémie (glycémie non défendue).
    const depuisAbsorbeSangG = Math.min(absorbeG, besoinSangG);
    const resteSangG = besoinSangG - depuisAbsorbeSangG;
    const depuisFoieG = Math.min(
      resteSangG,
      METABOLISME_GLUCIDIQUE.SORTIE_HEPATIQUE_MAX_G_PAR_MIN,
      foieG,
    );
    foieG -= depuisFoieG;
    const deficitSangG = resteSangG - depuisFoieG;
    if (deficitSangG > 1e-9 && premiereHypoglycemieMin === null) {
      premiereHypoglycemieMin = m + 1;
    }

    // Le muscle : l'absorbé restant l'épargne gramme pour gramme, puis on
    // puise dans le glycogène musculaire. À sec → mur musculaire.
    const absorbeRestantG = absorbeG - depuisAbsorbeSangG;
    const depuisAbsorbeMuscleG = Math.min(absorbeRestantG, besoinMuscleG);
    const resteMuscleG = besoinMuscleG - depuisAbsorbeMuscleG;
    const depuisMuscleGlycogeneG = Math.min(resteMuscleG, muscleG);
    muscleG -= depuisMuscleGlycogeneG;
    const deficitMuscleG = resteMuscleG - depuisMuscleGlycogeneG;
    if (deficitMuscleG > 1e-9 && premierMurMuscleMin === null) {
      premierMurMuscleMin = m + 1;
    }

    // Absorbé au-delà de tous les besoins : reste dans le sang, aucune
    // resynthèse de glycogène pendant l'effort (choix de modélisation).
    const excedentG = absorbeRestantG - depuisAbsorbeMuscleG;
    if (excedentG > 0) excedentAbsorbeCumuleGCourant += excedentG;

    const oxyG =
      depuisAbsorbeSangG + depuisFoieG + depuisAbsorbeMuscleG + depuisMuscleGlycogeneG;
    oxydationCumuleeGlucidesG += oxyG;

    /* (6) Déficit glucidique → allure réellement tenable
     *
     * Quand ni l'absorbé, ni le foie, ni le glycogène musculaire ne
     * couvrent le besoin glucidique du pas, la part manquante N'EST PAS
     * produite : le coureur ralentit. On ne compte donc, comme énergie
     * SOUTENABLE, que la puissance réellement fournie. Les lipides, eux,
     * couvrent toujours leur part (les réserves de graisse ne limitent pas
     * un marathon).
     *
     *   énergie soutenable = part lipidique (allure cible) + glucides oxydés
     *                      = puissance cible − énergie du déficit glucidique
     *
     * ⚠ LIMITE CONNUE DU MODÈLE (voir aussi sources.html) :
     * Quand le coureur ralentit, son intensité relative baisse, donc la part
     * lipidique augmente et le déficit glucidique se réduit de lui-même.
     * Cette boucle de rattrapage N'EST PAS modélisée : la part lipidique
     * reste calculée à l'allure cible. Conséquence : le modèle est PESSIMISTE
     * après le point de rupture. Il décrit bien le moment où l'allure lâche,
     * moins bien ce qui se passe ensuite. On ne cherche pas à l'implémenter
     * pour l'instant.
     */
    const deficitGlucidesG = deficitSangG + deficitMuscleG;
    const deficitChoKcal = deficitGlucidesG * CONVERSIONS.KCAL_PAR_G_GLYCOGENE;
    const puissanceSoutenable = puissance - deficitChoKcal;
    const fractionTenable =
      puissance > 0 ? borner(puissanceSoutenable / puissance, 0, 1) : 1;

    energieSoutenableCumuleeKcalCourant += puissanceSoutenable;
    if (fractionTenable < minFractionAllureTenable) {
      minFractionAllureTenable = fractionTenable;
    }
    if (fractionTenable < 1 - 1e-9) {
      nMinutesEnDeficit += 1;
      sommeFractionTenableEnDeficit += fractionTenable;
    }
    if (deficitGlucidesG > 1e-6 && premiereAllureIntenableMin === null) {
      premiereAllureIntenableMin = m + 1;
    }

    /* (7) État après la minute m */
    enregistre(m + 1, {
      puissance,
      fCHO,
      absG: absorbeG,
      oxyG,
      deficitG: deficitGlucidesG,
      puissanceSoutenable,
      fractionTenable,
    });
  }

  return {
    dureeMin,
    distanceKmTotale: distanceKm,
    masseTotaleKg,
    muscleInitialG,
    foieInitialG,
    premiereHypoglycemieMin,
    premierMurMuscleMin,
    premiereAllureIntenableMin,
    minFractionAllureTenable,
    nMinutesEnDeficit,
    sommeFractionTenableEnDeficit,
    oxydationCumuleeGlucidesG,

    minutes,
    distanceKm: distanceKmSerie,
    puissanceKcalMin,
    fractionGlucides: fractionGlucidesSerie,
    depenseCumuleeKcal,
    deficitGlucidesGMin,
    puissanceSoutenableKcalMin,
    fractionAllureTenable: fractionAllureTenableSerie,
    energieSoutenableCumuleeKcal,
    ingereCumuleG,
    estomacG: estomacGSerie,
    estomacEauMl: estomacEauMlSerie,
    lumenGlucoseG: lumenGlucoseGSerie,
    lumenFructoseG: lumenFructoseGSerie,
    lumenTotalG: lumenTotalGSerie,
    absorptionGMin,
    absorptionCumuleeG,
    oxydationGlucidesGMin,
    excedentAbsorbeCumuleG,
    muscleG: muscleGSerie,
    foieG: foieGSerie,
    muscleFraction,
    foieFraction,
  };
}

/* ========================================================================== */
/* ÉTAPE 8 — Analyse d'un compartiment de glycogène                           */
/* ========================================================================== */

/**
 * Repère, sur la série de fraction d'un compartiment, DEUX événements
 * distincts :
 *   - `zoneCritique` : première minute sous SEUILS.ZONE_CRITIQUE_FRACTION
 *     (20 %) — « la baisse devient perceptible », ce N'EST PAS l'épuisement ;
 *   - `epuisement`   : première minute où le compartiment atteint zéro.
 *
 * @param {{ fractions: number[], minutes: number[], distanceKm: number[] }} params
 * @returns {{
 *   zoneCritique: { minute: number, km: number } | null,
 *   epuisement:   { minute: number, km: number } | null
 * }}
 */
export function analyserCompartiment({ fractions, minutes, distanceKm }) {
  let zoneCritique = null;
  let epuisement = null;

  for (let i = 0; i < fractions.length; i++) {
    if (zoneCritique === null && fractions[i] <= SEUILS.ZONE_CRITIQUE_FRACTION) {
      zoneCritique = { minute: minutes[i], km: arrondi(distanceKm[i], 2) };
    }
    if (epuisement === null && fractions[i] <= SEUILS.EPUISEMENT_FRACTION + 1e-9) {
      epuisement = { minute: minutes[i], km: arrondi(distanceKm[i], 2) };
    }
  }

  return { zoneCritique, epuisement };
}

/* ========================================================================== */
/* ÉTAPE 9 — simuler() : scénario réel + fantôme, diagnostics, synthèse       */
/* ========================================================================== */

/**
 * Point d'entrée public du moteur.
 *
 * Lance DEUX simulations :
 *   - le scénario réel, avec le plan de ravitaillement fourni ;
 *   - le scénario « fantôme », sans aucune prise — la courbe de comparaison
 *     permanente des graphiques.
 *
 * Puis analyse les compartiments, émet des DIAGNOSTICS structurés (des codes,
 * jamais de phrases françaises : l'interface écrit les phrases) et une synthèse
 * chiffrée.
 *
 * @param {{
 *   profil: {
 *     sexe: 'H'|'F', masseKg: number,
 *     niveau: 'debutant'|'regulier'|'confirme'|'elite',
 *     recharge: 'non'|'partielle'|'complete',
 *     entrainementIntestinal: 'jamais'|'occasionnel'|'regulier',
 *     petitDejeuner: boolean
 *   },
 *   course: {
 *     distanceKm: number, vitesseMoyenneMPerMin: number,
 *     intensitePctVO2max: number, temperatureC?: number|null
 *   },
 *   massePorteeKg?: number, terrain?: string, penteMoyenneTangente?: number,
 *   plan?: Array<{ instantMin: number, glucidesG: number,
 *                  type: 'glucose'|'glucose-fructose', eauMl: number, ratio?: number[] }>
 * }} entrees
 * @returns {object} structure complète (voir le corps de la fonction)
 */
export function simuler(entrees) {
  const reel = simulerScenario(entrees, entrees.plan ?? []);
  const fantome = simulerScenario(entrees, []);

  const analyse = (scenario) => ({
    muscle: analyserCompartiment({
      fractions: scenario.muscleFraction,
      minutes: scenario.minutes,
      distanceKm: scenario.distanceKm,
    }),
    foie: analyserCompartiment({
      fractions: scenario.foieFraction,
      minutes: scenario.minutes,
      distanceKm: scenario.distanceKm,
    }),
  });
  const aReel = analyse(reel);
  const aFantome = analyse(fantome);

  const dernier = reel.minutes.length - 1;
  const kmA = (scenario, minute) =>
    minute === null ? null : arrondi(scenario.distanceKm[minute] ?? scenario.distanceKmTotale, 2);

  const surplusIntestinalFinG = reel.lumenTotalG[dernier];
  const surplusDigestifTotalFinG = surplusIntestinalFinG + reel.estomacG[dernier];

  /* --- Minutes perdues à cause du déficit --------------------------------
   * Le chiffre qu'un coureur comprend. Sur les minutes en déficit, la
   * fraction d'allure tenable moyenne vaut `fractionMoyenneTenable`. Ce
   * tronçon, prévu pour durer `nMinutesEnDeficit` minutes, en prend en
   * réalité nMinutesEnDeficit / fractionMoyenne.
   *   minutes perdues = nMinutesEnDeficit × (1 / fractionMoyenne − 1)
   * ⚠ C'est une ESTIMATION grossière (voir la limite connue du modèle,
   * modèle pessimiste après rupture). L'interface DOIT la présenter en
   * fourchette (« environ 20 à 30 minutes »), jamais au chiffre près.
   */
  const fractionMoyenneTenable =
    reel.nMinutesEnDeficit > 0
      ? reel.sommeFractionTenableEnDeficit / reel.nMinutesEnDeficit
      : 1;
  const minutesPerduesEstimees =
    reel.nMinutesEnDeficit > 0
      ? reel.nMinutesEnDeficit * (1 / fractionMoyenneTenable - 1)
      : 0;
  const tempsEstimeMin = reel.dureeMin + minutesPerduesEstimees;

  /* --- Diagnostics (codes structurés, triés du plus grave au moins grave) --- */
  const diagnostics = [];
  if (reel.premiereHypoglycemieMin !== null) {
    diagnostics.push({
      code: 'HYPOGLYCEMIE',
      gravite: 'critique',
      minute: reel.premiereHypoglycemieMin,
      km: kmA(reel, reel.premiereHypoglycemieMin),
    });
  }
  if (reel.premierMurMuscleMin !== null) {
    diagnostics.push({
      code: 'MUR_MUSCULAIRE',
      gravite: 'critique',
      minute: reel.premierMurMuscleMin,
      km: kmA(reel, reel.premierMurMuscleMin),
    });
  }
  if (reel.premiereAllureIntenableMin !== null) {
    diagnostics.push({
      code: 'ALLURE_INTENABLE',
      gravite: 'critique',
      minute: reel.premiereAllureIntenableMin,
      km: kmA(reel, reel.premiereAllureIntenableMin),
      valeurs: {
        fractionMinTenable: arrondi(reel.minFractionAllureTenable, 2),
        minutesPerduesEstimees: arrondi(minutesPerduesEstimees, 0),
        tempsEstimeMin: arrondi(tempsEstimeMin, 0),
      },
    });
  }
  if (aReel.foie.epuisement) {
    diagnostics.push({ code: 'EPUISEMENT_FOIE', gravite: 'critique', ...aReel.foie.epuisement });
  }
  if (aReel.muscle.zoneCritique) {
    diagnostics.push({ code: 'ZONE_CRITIQUE_MUSCLE', gravite: 'attention', ...aReel.muscle.zoneCritique });
  }
  if (aReel.foie.zoneCritique) {
    diagnostics.push({ code: 'ZONE_CRITIQUE_FOIE', gravite: 'attention', ...aReel.foie.zoneCritique });
  }
  if (surplusIntestinalFinG > 1) {
    diagnostics.push({
      code: 'SURPLUS_DIGESTIF',
      gravite: 'attention',
      valeurs: {
        intestinG: arrondi(surplusIntestinalFinG, 0),
        digestifTotalG: arrondi(surplusDigestifTotalFinG, 0),
      },
    });
  }

  return {
    meta: {
      versionMoteur: 1,
      pasMin: SEUILS.PAS_SIMULATION_MIN,
      dureeMin: reel.dureeMin,
      distanceKm: reel.distanceKmTotale,
      masseTotaleKg: reel.masseTotaleKg,
      reservesInitiales: { muscleG: reel.muscleInitialG, foieG: reel.foieInitialG },
    },

    temps: {
      minutes: reel.minutes,
      distanceKm: reel.distanceKm,
    },

    energie: {
      puissanceKcalMin: reel.puissanceKcalMin, // ce que l'allure cible demande
      puissanceSoutenableKcalMin: reel.puissanceSoutenableKcalMin, // ce que le coureur peut fournir
      fractionAllureTenable: reel.fractionAllureTenable, // soutenable / cible, dans [0, 1]
      deficitGlucidesGMin: reel.deficitGlucidesGMin, // glucides demandés mais introuvables
      fractionGlucides: reel.fractionGlucides,
      depenseCumuleeKcal: reel.depenseCumuleeKcal, // cumul du coût à l'allure cible
      energieSoutenableCumuleeKcal: reel.energieSoutenableCumuleeKcal, // cumul de ce qui est fournissable
    },

    glucides: {
      ingereCumuleG: reel.ingereCumuleG,
      estomacG: reel.estomacG,
      estomacEauMl: reel.estomacEauMl,
      lumenGlucoseG: reel.lumenGlucoseG,
      lumenFructoseG: reel.lumenFructoseG,
      lumenTotalG: reel.lumenTotalG,
      absorptionGMin: reel.absorptionGMin,
      absorptionCumuleeG: reel.absorptionCumuleeG,
      oxydationGlucidesGMin: reel.oxydationGlucidesGMin,
      excedentAbsorbeCumuleG: reel.excedentAbsorbeCumuleG,
    },

    glycogene: {
      muscleG: reel.muscleG,
      muscleFraction: reel.muscleFraction,
      foieG: reel.foieG,
      foieFraction: reel.foieFraction,
      zoneCritiqueMuscle: aReel.muscle.zoneCritique,
      epuisementMuscle: aReel.muscle.epuisement,
      zoneCritiqueFoie: aReel.foie.zoneCritique,
      epuisementFoie: aReel.foie.epuisement,
    },

    fantome: {
      muscleG: fantome.muscleG,
      muscleFraction: fantome.muscleFraction,
      foieG: fantome.foieG,
      foieFraction: fantome.foieFraction,
      zoneCritiqueMuscle: aFantome.muscle.zoneCritique,
      epuisementMuscle: aFantome.muscle.epuisement,
      zoneCritiqueFoie: aFantome.foie.zoneCritique,
      epuisementFoie: aFantome.foie.epuisement,
      hypoglycemie:
        fantome.premiereHypoglycemieMin === null
          ? null
          : { minute: fantome.premiereHypoglycemieMin, km: kmA(fantome, fantome.premiereHypoglycemieMin) },
      murMusculaire:
        fantome.premierMurMuscleMin === null
          ? null
          : { minute: fantome.premierMurMuscleMin, km: kmA(fantome, fantome.premierMurMuscleMin) },
    },

    diagnostics,

    synthese: {
      // Ce que la course COÛTE — le chiffre affiché comme « ta dépense ».
      depenseTotaleKcal: arrondi(reel.depenseCumuleeKcal[dernier], 0),
      // Ce que le coureur PEUT fournir à l'allure visée. À NE JAMAIS
      // présenter comme « ta dépense » : c'est un plafond, pas un bilan.
      energieSoutenableKcal: arrondi(reel.energieSoutenableCumuleeKcal[dernier], 0),
      // Estimation grossière, à présenter en fourchette par l'interface.
      tempsEstimeMin: arrondi(tempsEstimeMin, 0),
      minutesPerduesEstimees: arrondi(minutesPerduesEstimees, 0),
      allureIntenable:
        reel.premiereAllureIntenableMin === null
          ? null
          : {
              minute: reel.premiereAllureIntenableMin,
              km: kmA(reel, reel.premiereAllureIntenableMin),
              fractionMinTenable: arrondi(reel.minFractionAllureTenable, 2),
              minutesPerduesEstimees: arrondi(minutesPerduesEstimees, 0),
              tempsEstimeMin: arrondi(tempsEstimeMin, 0),
            },
      glucidesIngeresG: arrondi(reel.ingereCumuleG[dernier], 0),
      glucidesAbsorbesG: arrondi(reel.absorptionCumuleeG[dernier], 0),
      glucidesOxydesG: arrondi(reel.oxydationCumuleeGlucidesG, 0),
      surplusIntestinalFinG: arrondi(surplusIntestinalFinG, 0),
      surplusDigestifTotalFinG: arrondi(surplusDigestifTotalFinG, 0),
      excedentAbsorbeG: arrondi(reel.excedentAbsorbeCumuleG[dernier], 0),
      muscleResiduelG: arrondi(reel.muscleG[dernier], 0),
      muscleResiduelFraction: arrondi(reel.muscleFraction[dernier], 3),
      foieResiduelG: arrondi(reel.foieG[dernier], 0),
      foieResiduelFraction: arrondi(reel.foieFraction[dernier], 3),
      murMusculaire:
        reel.premierMurMuscleMin === null
          ? null
          : { minute: reel.premierMurMuscleMin, km: kmA(reel, reel.premierMurMuscleMin) },
      hypoglycemie:
        reel.premiereHypoglycemieMin === null
          ? null
          : { minute: reel.premiereHypoglycemieMin, km: kmA(reel, reel.premiereHypoglycemieMin) },
    },
  };
}
