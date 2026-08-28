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
 *   … Étape 5+ — vidange gastrique, boucle minute par minute, simuler()
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
 * Plafonds d'absorption des glucides, en g/h, décomposés par voie de transport.
 *
 * Deux transporteurs distincts :
 *   - SGLT1 (glucose + maltodextrine) : plafond de base × facteur
 *     d'entraînement intestinal, MAIS borné dur à ~1.1 g/min (66 g/h) — un
 *     transporteur unique ne va pas plus vite, quel que soit l'entraînement.
 *   - GLUT5 (fructose) : ouvert seulement si la prise contient du fructose.
 *     C'est ici que l'entraînement intestinal fait réellement gagner.
 *
 * Le plafond combiné n'est pas une constante : il émerge de la somme.
 *
 * @param {{
 *   type: 'glucose'|'glucose-fructose',
 *   entrainementIntestinal: 'jamais'|'occasionnel'|'regulier'
 * }} params
 * @returns {{ sglt1GParH: number, glut5GParH: number, totalGParH: number }}
 */
export function plafondAbsorptionGParH({ type, entrainementIntestinal }) {
  const A = ABSORPTION_INTESTIN;
  const facteur = A.FACTEUR_ENTRAINEMENT[entrainementIntestinal];

  const sglt1GParH = Math.min(
    A.PLAFOND_SGLT1_G_PAR_H * facteur,
    A.PLAFOND_SGLT1_ABSOLU_G_PAR_H,
  );

  const glut5GParH =
    type === 'glucose-fructose' ? A.PLAFOND_GLUT5_G_PAR_H * facteur : 0;

  return {
    sglt1GParH,
    glut5GParH,
    totalGParH: sglt1GParH + glut5GParH,
  };
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
