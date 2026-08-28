/**
 * sudation.js — bilan hydrique et sodique de base.
 * =============================================================================
 *
 * Sous-module du moteur. Comme modele.js : aucune référence au DOM, n'importe
 * que constantes.js. Fonctions pures.
 *
 * Le taux de sudation N'EST PAS lu dans une table : il est calculé par la
 * physique de la thermorégulation. Le corps produit de la chaleur en courant ;
 * une partie part « à sec » (convection + rayonnement) si l'air est plus froid
 * que la peau ; le reste doit être évacué en évaporant de la sueur. C'est cette
 * quantité de sueur à évaporer qui donne le taux de sudation.
 *
 * ⚠ Trois des constantes (COEFF_ECHANGE, EFFICACITE_EVAPORATIVE, FRACTION_CHALEUR)
 * sont des hypothèses de modélisation — voir constantes.js et sources.html.
 *
 * ⚠ LIMITE CONNUE : l'HUMIDITÉ n'est pas modélisée. En air humide, l'évaporation
 * de la sueur s'effondre alors même que le corps continue de la produire — c'est
 * la première cause de coup de chaleur à l'effort. Ce modèle SOUS-ESTIME donc le
 * risque en chaleur humide. L'interface doit afficher un avertissement fixe sur
 * le coup de chaleur au-delà de 30 °C, indépendant des chiffres calculés.
 * =============================================================================
 */

import { SUDATION } from './constantes.js';

/** Petit clamp local : sudation.js reste une feuille (n'importe que constantes.js). */
function borne(valeur, min, max) {
  return Math.min(Math.max(valeur, min), max);
}

/**
 * Surface corporelle en m², formule de Du Bois & Du Bois (1916).
 *   S = 0.007184 × taille_cm^0.725 × masse_kg^0.425
 * Contrôle : 175 cm, 70 kg → ≈ 1.85 m².
 *
 * @param {{ tailleCm: number, masseKg: number }} params
 * @returns {number} m²
 */
export function surfaceCorporelleM2({ tailleCm, masseKg }) {
  return (
    SUDATION.DU_BOIS_COEFF *
    tailleCm ** SUDATION.DU_BOIS_EXP_TAILLE *
    masseKg ** SUDATION.DU_BOIS_EXP_MASSE
  );
}

/**
 * Besoin évaporatif brut, en L/h, NON borné.
 *
 *   chaleur produite      = puissance × 60 × FRACTION_CHALEUR                (kcal/h)
 *   chaleur échangée à sec = COEFF_ECHANGE × surface × (T_peau − T_air) × 0.86 (kcal/h)
 *   chaleur à évaporer     = max(0, produite − sèche)
 *   besoin évaporatif      = chaleur à évaporer / (CHALEUR_LATENTE × EFFICACITE)
 *
 * ⚠ PAS de max(0, …) sur l'écart peau/air : au-dessus de 33 °C l'air ne
 * refroidit plus, il RÉCHAUFFE. La « chaleur sèche » devient négative et
 * s'ajoute donc à la charge à évaporer.
 *
 * Si ce besoin dépasse SUDATION_MAX_L_PAR_H, le corps ne peut plus évacuer sa
 * chaleur : c'est le déclencheur du diagnostic RISQUE_HYPERTHERMIE (dans le
 * moteur), à traiter comme une urgence.
 *
 * @param {{ puissanceKcalMin: number, surfaceM2: number, temperatureC: number }} params
 * @returns {number} L/h (non borné)
 */
export function besoinEvaporatifLParH({ puissanceKcalMin, surfaceM2, temperatureC }) {
  const S = SUDATION;

  const chaleurProduiteKcalH = puissanceKcalMin * 60 * S.FRACTION_CHALEUR;

  const ecartPeauAirC = S.TEMPERATURE_PEAU_C - temperatureC; // < 0 si l'air dépasse la peau
  const chaleurSecheKcalH =
    S.COEFF_ECHANGE_W_PAR_M2_K * surfaceM2 * ecartPeauAirC * S.W_VERS_KCAL_PAR_H;

  const chaleurAEvaporerKcalH = Math.max(0, chaleurProduiteKcalH - chaleurSecheKcalH);

  return chaleurAEvaporerKcalH / (S.CHALEUR_LATENTE_KCAL_PAR_L * S.EFFICACITE_EVAPORATIVE);
}

/**
 * Taux de sudation en litres par heure, borné à [0.3, 3.0] L/h. C'est le
 * besoin évaporatif brut, ramené à ce que le corps peut physiquement produire.
 *
 * @param {{ puissanceKcalMin: number, surfaceM2: number, temperatureC: number }} params
 * @returns {number} L/h
 */
export function tauxSudationLParH({ puissanceKcalMin, surfaceM2, temperatureC }) {
  const S = SUDATION;
  return borne(
    besoinEvaporatifLParH({ puissanceKcalMin, surfaceM2, temperatureC }),
    S.SUDATION_MIN_L_PAR_H,
    S.SUDATION_MAX_L_PAR_H,
  );
}

/**
 * Concentration en sodium de la sueur, en mg par litre, selon le profil
 * « sueur salée » (faible / moyen / eleve). Défaut : moyen.
 *
 * @param {{ sueurSalee?: 'faible'|'moyen'|'eleve' }} params
 * @returns {number} mg/L
 */
export function sodiumSueurMgParL({ sueurSalee = 'moyen' }) {
  const mmolParL =
    SUDATION.SODIUM_SUEUR_MMOL_PAR_L[sueurSalee] ?? SUDATION.SODIUM_SUEUR_MMOL_PAR_L.moyen;
  return mmolParL * SUDATION.MG_PAR_MMOL_SODIUM;
}
