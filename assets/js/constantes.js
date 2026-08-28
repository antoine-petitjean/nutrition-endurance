/**
 * constantes.js — toutes les constantes physiologiques du simulateur.
 * =============================================================================
 *
 * RÈGLE ABSOLUE : aucune valeur numérique physiologique ne vit ailleurs que
 * dans ce fichier. Si `modele.js` a besoin d'un nombre, il l'importe d'ici.
 *
 * Pour CHAQUE constante, le commentaire donne :
 *   1. son unité (aussi dans le nom quand c'est possible : ..._G_PAR_H, ..._MMOL_KG) ;
 *   2. sa fourchette de plausibilité ;
 *   3. sa source, entre crochets.
 *
 * Sources vérifiées (voir sources.html) :
 *   [Minetti 2002]    Minetti A.E. et coll., J Appl Physiol 93(3), 2002.
 *   [Rapoport 2010]   Rapoport B.I., PLOS Comput Biol 6(10):e1000960, 2010.
 *   [Romijn 1993]     Romijn J.A. et coll., Am J Physiol, 1993.
 *   [GSSI]            Gatorade Sports Science Institute, Dietary Carbohydrate
 *                     and the Endurance Athlete: Contemporary Perspectives.
 *   [SDA/USSF 2025]   Sports Dietitians Australia & Ultra Sports Science
 *                     Foundation, position statement troubles digestifs,
 *                     Sports Medicine, 2025.
 *   [Biochimie standard] Constante de manuel, non spécifique à une publication.
 *
 * Quand une valeur n'a PAS de source, elle porte la mention
 *   // HYPOTHÈSE DE MODÉLISATION
 * explicitement, sur sa propre ligne, avec sa fourchette de plausibilité.
 * sources.html liste ces hypothèses dans une section distincte des références.
 *
 * IDENTIFIANTS INTERNES : les clés comme 'debutant', 'regulier', 'complete'
 * sont volontairement en ASCII sans accent. Elles finissent dans localStorage
 * et dans l'URL de partage, où les accents provoquent des bugs d'encodage
 * silencieux. Les libellés accentués pour l'affichage vivent dans un
 * dictionnaire séparé, côté interface (simulateur.js).
 *
 * Les objets sont gelés (Object.freeze) : le moteur ne doit jamais les muter.
 * =============================================================================
 */

/* -------------------------------------------------------------------------- */
/* 1. Conversions physiques                                                  */
/* -------------------------------------------------------------------------- */

export const CONVERSIONS = Object.freeze({
  // Énergie thermochimique. Exact par définition.
  // Non utilisé dans la chaîne de puissance depuis la normalisation de
  // Minetti (voir bloc 2) ; conservé comme conversion de référence.
  J_PAR_KCAL: 4184, // J/kcal

  // Contenu énergétique du glycogène.
  // Fourchette admise : 4,0–4,2 kcal/g. Valeur retenue : 4,0.
  // [Biochimie standard ; utilisée telle quelle par Rapoport 2010]
  KCAL_PAR_G_GLYCOGENE: 4, // kcal/g

  // Masse de glycogène par mmol d'unités glucosyl (résidu glucosyl
  // anhydre, masse molaire 162 g/mol).
  // [Biochimie standard]
  G_GLYCOGENE_PAR_MMOL_GLUCOSYL: 0.162, // g/mmol
});

/* -------------------------------------------------------------------------- */
/* 2. Coût énergétique — polynôme de Minetti (2002)                          */
/* -------------------------------------------------------------------------- */

export const MINETTI = Object.freeze({
  // Cr(i) = 155.4·i⁵ − 30.4·i⁴ − 43.3·i³ + 46.3·i² + 19.5·i + 3.6
  // Coefficients rangés du degré 5 au degré 0 (terme constant en dernier),
  // pour une évaluation par schéma de Horner :
  //   brut = COEFFS.reduce((acc, c) => acc * i + c, 0)
  // Contrôle : à i = 0, la somme vaut 3.6 (le terme constant).
  // [Minetti 2002]
  COEFFS: Object.freeze([155.4, -30.4, -43.3, 46.3, 19.5, 3.6]),

  // Domaine de validité expérimental. On BORNE i à cet intervalle,
  // on n'extrapole jamais au-delà. [Minetti 2002]
  PENTE_MIN: -0.45, // tangente
  PENTE_MAX: 0.45, // tangente

  // ⚠ Minetti mesure un coût NET sur tapis : Cr(0) = 3.6 J/kg/m = 0.86
  // kcal/kg/km, soit le SURCOÛT du déplacement, hors métabolisme de base.
  // Rapoport mesure un coût BRUT (total) à plat de ~1.0 kcal/kg/km.
  // Utiliser 0.86 partout sous-estimerait la dépense d'environ 15 % et
  // ferait échouer le critère d'acceptation §3.5.1 (marathon 70 kg 3 h 30).
  //
  // On garde le polynôme UNIQUEMENT pour la FORME de la variation avec la
  // pente, renormalisée sur le coût brut à plat :
  //     cout(i) = COUT_PLAT_BRUT_KCAL_PAR_KG_KM × Minetti(i) / Minetti(0)
  // coutEnergetiqueMinetti() renvoie donc des kcal/kg/km (pas des J/kg/m),
  // et cout(0) = 1.0 exactement. Une seule constante de coût à plat.
  //
  // // HYPOTHÈSE DE MODÉLISATION sur la normalisation : le rapport net/brut
  //    est supposé constant avec la pente. Fourchette du brut : 0.85–1.10.
  COUT_PLAT_BRUT_KCAL_PAR_KG_KM: 1.0, // kcal/kg/km — [Rapoport 2010]
});

/* -------------------------------------------------------------------------- */
/* 3. Facteur terrain (multiplicateur du coût énergétique)                   */
/* -------------------------------------------------------------------------- */

export const FACTEUR_TERRAIN = Object.freeze({
  // Phase 1 (mode route) : seule 'route' = 1.00 est utilisée. Les autres
  // valeurs sont là pour la phase 3 et ne servent pas encore.
  // [CLAUDE.md §3.2a ; ordres de grandeur usuels de la littérature trail]
  route: 1.0,
  cheminRoulant: 1.05,
  sentier: 1.15,
  technique: 1.25, // fourchette 1.20–1.30, milieu retenu
  // // HYPOTHÈSE DE MODÉLISATION sur la valeur exacte de 'technique'
});

/* -------------------------------------------------------------------------- */
/* 4. Répartition glucides / lipides — courbe de crossover                   */
/* -------------------------------------------------------------------------- */

export const CROSSOVER = Object.freeze({
  // Fraction de l'énergie fournie par les glucides selon x = % de VO₂max.
  // Quadratique  a·x² + b·x + c , avec :
  //   - x EXPRIMÉ EN POURCENTAGE (65 pour 65 % de VO₂max) ;
  //   - RÉSULTAT EN POURCENTAGE lui aussi.
  // La division par 100 (passage en fraction 0–1) se fait UNE SEULE FOIS,
  // dans fractionGlucides() de modele.js — c'est le bug d'unité classique,
  // on le confine à un seul endroit commenté.
  //
  // Calée sur Romijn 1993 :  x=25 → 5 % ,  x=65 → 50 % ,  x=85 → 90 %.
  // [Points d'ancrage : Romijn 1993]
  // // HYPOTHÈSE DE MODÉLISATION sur la FORME quadratique (interpolation) :
  //    vérifiée exacte aux trois points d'ancrage, non validée entre eux.
  FCHO_COEFFS_PCT: Object.freeze([0.0145833, -0.1875, 0.5729]),

  // Points d'ancrage expérimentaux, conservés pour les tests unitaires
  // (x en % VO₂max → % de l'énergie venant des glucides). [Romijn 1993]
  FCHO_POINTS_ANCRAGE_PCT: Object.freeze({ 25: 5, 65: 50, 85: 90 }),

  // Bornes du résultat, exprimées en FRACTION (après division par 100).
  FCHO_MIN: 0,
  FCHO_MAX: 1,
});

/* -------------------------------------------------------------------------- */
/* 5. Réserves de glycogène — compartiment MUSCULAIRE                        */
/* -------------------------------------------------------------------------- */

export const GLYCOGENE_MUSCLE = Object.freeze({
  // Masse de muscle squelettique, en fraction de la masse corporelle.
  // ⚠ Le modèle de Rapoport est calé sur un échantillon MASCULIN. Appliquer
  // 0.45 à une femme surestime ses réserves d'environ 20 % et lui annonce
  // un mur trop tardif. reservesInitiales() prend donc le sexe en
  // paramètre. Limite à mentionner sur la page.
  //   H 0.45  [Rapoport 2010, échantillon masculin]
  //   F 0.36  // HYPOTHÈSE DE MODÉLISATION — masse musculaire squelettique
  //           // féminine 30–36 % de la masse corporelle ; borne haute
  //           // retenue. À remplacer par une estimation de masse maigre
  //           // en phase 2.
  FRACTION_MASSE_MUSCULAIRE_PAR_SEXE: Object.freeze({ H: 0.45, F: 0.36 }),

  // Part du muscle squelettique située dans les jambes, donc active en
  // course à pied. [Ordre de grandeur anatomique ; approche Rapoport 2010]
  // Muscle actif = FRACTION_MASSE_MUSCULAIRE_PAR_SEXE[sexe] × 0.50
  //   → H : 0.225 de la masse corporelle
  //   → F : 0.18  de la masse corporelle
  FRACTION_MUSCLE_JAMBES: 0.5,

  // Densité de glycogène musculaire de BASE selon le niveau, en mmol/kg de
  // muscle. Convertie en g via CONVERSIONS.G_GLYCOGENE_PAR_MMOL_GLUCOSYL.
  //   110 mmol/kg ≈ 17.8 g/kg   non entraîné   [CLAUDE.md §3.2c]
  //   150 mmol/kg ≈ 24.3 g/kg   entraîné       [CLAUDE.md §3.2c]
  //   140 mmol/kg ≈ 22.7 g/kg   régulier
  //     // HYPOTHÈSE DE MODÉLISATION — entre non entraîné et entraîné ;
  //     // fourchette plausible 130–150 mmol/kg
  DENSITE_BASE_MMOL_KG: Object.freeze({
    debutant: 110,
    regulier: 140,
    confirme: 150,
    elite: 150,
  }),

  // Effet de la recharge glucidique (surcompensation) : multiplicateur
  // appliqué à la densité de base, résultat borné à DENSITE_MAX_MMOL_KG.
  //   complete 1.33 est calé pour 150 × 1.33 ≈ 200 mmol/kg, la valeur
  //     sourcée « entraîné + recharge réussie » [CLAUDE.md §3.2c].
  //   partielle 1.15 :
  //     // HYPOTHÈSE DE MODÉLISATION — fourchette plausible 1.10–1.20
  // Un muscle non entraîné (débutant, 110) + recharge complète plafonne à
  // 110 × 1.33 ≈ 146 : il n'atteint pas 200. Comportement voulu.
  FACTEUR_RECHARGE: Object.freeze({
    non: 1.0,
    partielle: 1.15,
    complete: 1.33,
  }),

  // Plafond physiologique de densité, même après une recharge réussie.
  // [CLAUDE.md §3.2c — 200 mmol/kg ≈ 32.4 g/kg]
  DENSITE_MAX_MMOL_KG: 200,
});

/* -------------------------------------------------------------------------- */
/* 6. Réserves de glycogène — compartiment HÉPATIQUE                         */
/* -------------------------------------------------------------------------- */

export const GLYCOGENE_FOIE = Object.freeze({
  // Masse du foie.
  // [CLAUDE.md §3.2c ; fourchette anatomique adulte 1.4–2.0 kg]
  MASSE_KG: 1.8,

  // Densité de glycogène hépatique selon l'état de recharge, en mmol/kg.
  // Convertie en g via MASSE_KG et G_GLYCOGENE_PAR_MMOL_GLUCOSYL.
  //   270 mmol/kg → ≈ 79 g total    normal    [CLAUDE.md §3.2c]
  //   500 mmol/kg → ≈ 146 g total   chargé    [CLAUDE.md §3.2c]
  //   385 mmol/kg → ≈ 112 g total   partiel
  //     // HYPOTHÈSE DE MODÉLISATION — milieu ; fourchette 350–420 mmol/kg
  // Table dédiée (pas le facteur du muscle) : le foie répond plus fort à la
  // recharge (×1.85 de 270 à 500).
  DENSITE_MMOL_KG: Object.freeze({
    non: 270,
    partielle: 385,
    complete: 500,
  }),

  // Une nuit sans petit-déjeuner vide environ la moitié du glycogène
  // hépatique (demi-vie courte du glycogène du foie). Appliqué APRÈS
  // l'état de recharge : recharge PUIS petit-déjeuner sauté → ~0.5 × chargé.
  // [CLAUDE.md §3.2c — « environ moitié du normal » ; fourchette 0.4–0.6]
  FACTEUR_A_JEUN: 0.5,
});

/* -------------------------------------------------------------------------- */
/* 7. Absorption intestinale — deux voies de transport distinctes           */
/* -------------------------------------------------------------------------- */

export const ABSORPTION_INTESTIN = Object.freeze({
  // Deux transporteurs, deux plafonds. Le plafond combiné (~90 g/h, un peu
  // plus intestin entraîné) N'EST PAS une constante : il ÉMERGE de la somme
  // des deux voies selon la composition de la prise.

  // --- Voie SGLT1 : glucose + maltodextrine ---
  // Plafond de base. [GSSI — ~60 g/h, l'affirmation la mieux établie du
  // modèle et le message central de la page glucose-fructose.]
  PLAFOND_SGLT1_G_PAR_H: 60, // g/h

  // Plafond DUR de la voie SGLT1, appliqué APRÈS le facteur d'entraînement.
  // L'oxydation d'un glucide à transporteur unique ne dépasse pas ~1.1 g/min
  // quel que soit l'entraînement intestinal : celui-ci ne fait réellement
  // gagner que sur la voie GLUT5. [GSSI]
  PLAFOND_SGLT1_ABSOLU_G_PAR_H: 66, // g/h = 1.1 g/min

  // --- Voie GLUT5 : fructose ---
  // [GSSI — fourchette 30–40 g/h ; borne basse retenue comme base]
  PLAFOND_GLUT5_G_PAR_H: 30, // g/h

  // --- Entraînement intestinal (« gut training »), issu du profil ---
  // Facteur appliqué aux DEUX voies, mais la voie glucose reste bornée par
  // PLAFOND_SGLT1_ABSOLU. Avec 'regulier', GLUT5 atteint 30 × 1.33 ≈ 40 g/h
  // (haut de la fourchette GSSI) ; le plafond combiné intestin entraîné
  // émerge alors autour de 100–106 g/h. Atteindre un vrai 120 g/h reste
  // difficile même entraîné — ce que le simulateur fera découvrir plutôt
  // que l'affirmer.
  //   jamais 0.85 / regulier 1.33 :
  //     // HYPOTHÈSE DE MODÉLISATION — plafond combiné résultant
  //     // ~76 g/h (jamais) à ~106 g/h (regulier)
  FACTEUR_ENTRAINEMENT: Object.freeze({
    jamais: 0.85,
    occasionnel: 1.0,
    regulier: 1.33,
  }),

  // --- Répartition glucose:fructose ---
  // C'est un PARAMÈTRE DE CHAQUE PRISE (champ `ratio` optionnel), pas une
  // constante globale. Ces deux valeurs sont les options proposées :
  //   défaut       2:1    — produits courants
  //   haut débit   1:0.8  — vise >100 g/h en sollicitant moins SGLT1
  // [GSSI — ratios usuels 2:1 à 1:0.8]
  RATIO_GLUCOSE_FRUCTOSE_DEFAUT: Object.freeze([2, 1]),
  RATIO_GLUCOSE_FRUCTOSE_HAUT_DEBIT: Object.freeze([1, 0.8]),
});

/* -------------------------------------------------------------------------- */
/* 8. Vidange gastrique — bloc le MOINS bien contraint du modèle            */
/* -------------------------------------------------------------------------- */

export const VIDANGE_GASTRIQUE = Object.freeze({
  // ⚠ Tout ce bloc est un ensemble d'HYPOTHÈSES DE MODÉLISATION ajustables.
  // sources.html doit le présenter comme tel, PAS avec la même assurance
  // que les plafonds d'absorption de la section 7. [CLAUDE.md §3.2d]
  //
  // ⚠ Simplification phase 1 : le ralentissement osmotique utilise
  // l'osmolarité de la PRISE, pas celle du contenu gastrique réel — qui
  // évolue quand l'eau et les glucides se vident à des rythmes différents.

  // Vidange en processus du premier ordre : fraction du contenu gastrique
  // évacuée par minute.  k = ln(2) / t½ , avec t½ ≈ 20 min pour une
  // boisson glucidique standard.
  // // HYPOTHÈSE DE MODÉLISATION — t½ ∈ [12, 30] min → k ∈ [0.023, 0.058] min⁻¹
  K_BASE_PAR_MIN: Math.LN2 / 20, // ≈ 0.0347 min⁻¹

  // Ralentissement par l'osmolarité de la prise : facteur = 1 en dessous
  // du seuil bas, décroît linéairement jusqu'à OSMOLARITE_FACTEUR_MIN au
  // seuil haut, puis constant.
  // [Seuil ~300–350 mOsm/kg : SDA/USSF 2025]
  // // HYPOTHÈSE DE MODÉLISATION sur la forme (rampe) et le seuil haut
  OSMOLARITE_SEUIL_BAS_MOSM_KG: 300,
  OSMOLARITE_SEUIL_HAUT_MOSM_KG: 600,
  OSMOLARITE_FACTEUR_MIN: 0.6,

  // Ralentissement par l'intensité : facteur = 1 sous le seuil, décroît
  // linéairement jusqu'à INTENSITE_FACTEUR_MIN au plein ralentissement.
  // [Seuil ~75 % VO₂max : SDA/USSF 2025]
  // // HYPOTHÈSE DE MODÉLISATION sur la forme et la pente
  INTENSITE_SEUIL_PCT_VO2MAX: 75,
  INTENSITE_PLEIN_RALENTISSEMENT_PCT_VO2MAX: 90,
  INTENSITE_FACTEUR_MIN: 0.7,

  // Ralentissement par la déshydratation. HOOK phase 1 : la perte de masse
  // n'est pas modélisée avant la phase 4, donc cette contribution vaut
  // toujours 1.00 pour l'instant (perteMassePct = 0 → sous le seuil).
  // [Seuil 3–4 % de perte de masse : CLAUDE.md §3.2d]
  // // HYPOTHÈSE DE MODÉLISATION sur PLEIN_RALENTISSEMENT (fourchette 4–6 %)
  DESHYDRATATION_SEUIL_PCT: 3,
  DESHYDRATATION_PLEIN_RALENTISSEMENT_PCT: 5,
  DESHYDRATATION_FACTEUR_MIN: 0.75,

  // Plancher du produit des trois modulateurs : la vidange ne s'arrête
  // jamais totalement.
  // // HYPOTHÈSE DE MODÉLISATION — fourchette 0.2–0.4
  FACTEUR_TOTAL_MIN: 0.3,
});

/* -------------------------------------------------------------------------- */
/* 9. Osmolarité d'une prise                                                 */
/* -------------------------------------------------------------------------- */

export const OSMOLARITE = Object.freeze({
  // Glucose et fructose sont des hexoses isomères : même masse molaire,
  // donc même contribution osmotique par gramme.
  // [Biochimie standard]
  MASSE_MOLAIRE_GLUCOSE_G_PAR_MOL: 180,
  MASSE_MOLAIRE_FRUCTOSE_G_PAR_MOL: 180,

  // Phase 1 : tous les glucides d'une prise sont traités comme des
  // MONOSACCHARIDES — hypothèse conservatrice (osmolarité maximale). La
  // maltodextrine, polymère, abaisserait l'osmolarité réelle ; ce
  // raffinement viendra quand le type de sucre sera détaillé.
  // Cas de contrôle pour les tests (recalculés, jamais recopiés) :
  //   60 g de glucose dans 1000 ml d'eau  → ≈ 333 mOsm/kg
  //   25 g de glucose dans 150 ml d'eau   → ≈ 926 mOsm/kg

  // Garde-fou numérique pour une prise sans eau associée (eauMl → 0).
  // // HYPOTHÈSE DE MODÉLISATION — au-delà, la vidange est de toute façon
  //    au plancher VIDANGE_GASTRIQUE.FACTEUR_TOTAL_MIN.
  PLAFOND_MOSM_KG: 3000,
});

/* -------------------------------------------------------------------------- */
/* 10. Dérive de l'économie de course avec la fatigue                        */
/* -------------------------------------------------------------------------- */

export const DERIVE_ECONOMIE = Object.freeze({
  // Le coût énergétique augmente progressivement avec la fatigue.
  // Phase 1 : fonction du TEMPS écoulé (rampe linéaire de 0 au max, puis
  // constante). Phase 3 : fonction du D− cumulé.
  // [CLAUDE.md §3.2a — « +2 à +6 % après plusieurs heures »]
  // // HYPOTHÈSE DE MODÉLISATION — MAX ∈ [0.02, 0.06] ; DELAI ∈ [150, 240] min
  MAX: 0.05, // fraction ajoutée au coût : coût × (1 + dérive)
  DELAI_MIN: 180, // minutes pour atteindre MAX
});

/* -------------------------------------------------------------------------- */
/* 11. Métabolisme glucidique — sang (foie) vs glycogène musculaire         */
/* -------------------------------------------------------------------------- */

export const METABOLISME_GLUCIDIQUE = Object.freeze({
  // L'oxydation glucidique d'un pas a deux origines DISTINCTES :
  //   - le SANG (glycémie), défendu par les apports exogènes puis le foie ;
  //   - le glycogène MUSCULAIRE, brûlé sur place.
  // beta = fraction venant du sang. Rampe linéaire de l'initiale à la
  // finale sur DELAI_MIN, puis constante.
  //
  // Ce découplage rend les deux défaillances visibles :
  //   - sans ravitaillement, le FOIE se vide avant le muscle → hypoglycémie ;
  //   - avec 60 g/h, le foie tient et le MUSCLE dure plus longtemps.
  //
  // // HYPOTHÈSE DE MODÉLISATION
  //   FRACTION_SANG_INITIALE ∈ [0.20, 0.30]
  //   FRACTION_SANG_FINALE   ∈ [0.40, 0.50]
  //   FRACTION_SANG_DELAI_MIN ∈ [150, 240]
  FRACTION_SANG_INITIALE: 0.25,
  FRACTION_SANG_FINALE: 0.45,
  FRACTION_SANG_DELAI_MIN: 180,

  // Débit maximal de production hépatique de glucose (glycogénolyse +
  // néoglucogenèse) alimentant la glycémie. 1.1 g/min est un PLAFOND HAUT
  // plausible : à l'effort prolongé la production hépatique de glucose est
  // plutôt de l'ordre de 0.4 à 1.5 g/min selon l'intensité.
  // // HYPOTHÈSE DE MODÉLISATION — fourchette 0.4–1.5 g/min
  SORTIE_HEPATIQUE_MAX_G_PAR_MIN: 1.1,
});

/* -------------------------------------------------------------------------- */
/* 11 bis. Sudation et sodium (bilan hydrique de base)                       */
/* -------------------------------------------------------------------------- */

export const SUDATION = Object.freeze({
  // Surface corporelle — Du Bois & Du Bois (1916) :
  //   S (m²) = COEFF × taille_cm^EXP_TAILLE × masse_kg^EXP_MASSE
  // Contrôle : 175 cm, 70 kg → 1.85 m². [Du Bois & Du Bois 1916]
  DU_BOIS_COEFF: 0.007184,
  DU_BOIS_EXP_TAILLE: 0.725,
  DU_BOIS_EXP_MASSE: 0.425,

  // Part de l'énergie métabolique dissipée en chaleur (1 − rendement
  // mécanique de la course).
  // // HYPOTHÈSE DE MODÉLISATION — fourchette 0.75–0.80
  FRACTION_CHALEUR: 0.78,

  // Échange thermique « sec » (convection forcée + rayonnement) chez un
  // coureur, en W/m²/K.
  // // HYPOTHÈSE DE MODÉLISATION — fourchette 8–25
  COEFF_ECHANGE_W_PAR_M2_K: 15,

  // Température de la peau à l'effort.
  // [Valeur physiologique usuelle ; fourchette 32–35 °C]
  TEMPERATURE_PEAU_C: 33,

  // Conversion watt → kcal/h (1 W ≈ 0.8598 kcal/h).
  W_VERS_KCAL_PAR_H: 0.86,

  // Chaleur latente de vaporisation de la sueur : ≈ 2426 J/g = 580 kcal/L.
  // [Physique standard]
  CHALEUR_LATENTE_KCAL_PAR_L: 580,

  // Fraction de la sueur qui s'évapore vraiment (le reste goutte et ne
  // refroidit pas).
  // // HYPOTHÈSE DE MODÉLISATION — fourchette 0.6–0.9
  EFFICACITE_EVAPORATIVE: 0.8,

  // Bornes du taux de sudation.
  // [GSSI SSE-161 : 0.5–2.0 L/h typique, > 3.0 exceptionnel]
  SUDATION_MIN_L_PAR_H: 0.3,
  SUDATION_MAX_L_PAR_H: 3.0,

  // Concentration en sodium de la sueur selon le profil « sueur salée »,
  // en mmol/L. [GSSI SSE-161 : 10–90 mmol/L]
  SODIUM_SUEUR_MMOL_PAR_L: Object.freeze({ faible: 20, moyen: 40, eleve: 70 }),

  // Masse molaire du sodium. [GSSI SSE-161]
  MG_PAR_MMOL_SODIUM: 22.99,

  // Perte de masse corporelle (%) au-delà de laquelle la performance se
  // dégrade nettement. [GSSI SSE-161]
  SEUIL_DESHYDRATATION_PCT_MASSE: 2,
});

/* -------------------------------------------------------------------------- */
/* 12. Seuils de simulation et d'événements                                  */
/* -------------------------------------------------------------------------- */

export const SEUILS = Object.freeze({
  // Pas de temps de la simulation. [CLAUDE.md §3.2]
  PAS_SIMULATION_MIN: 1,

  // Entrée en ZONE CRITIQUE d'un compartiment de glycogène : 20 % du stock
  // initial. ⚠ Ce n'est PAS l'épuisement — c'est le seuil où « la baisse
  // devient perceptible ». Le moteur émet ici un événement
  // « entrée en zone critique », À NE JAMAIS présenter comme un épuisement.
  // [CLAUDE.md §3.4 — zone rouge sous 20 %]
  ZONE_CRITIQUE_FRACTION: 0.2,

  // Épuisement réel d'un compartiment : stock à 0. Événement « épuisement »,
  // qualifié selon le compartiment (mur musculaire / hypoglycémie).
  EPUISEMENT_FRACTION: 0.0,

  // La frontière verte/orange à 40 % est purement graphique : elle vit
  // dans style.css + simulateur.js, pas ici.
});

/* -------------------------------------------------------------------------- */
/* 13. Plages de saisie (clamp défensif du moteur)                           */
/* -------------------------------------------------------------------------- */

export const PLAGES = Object.freeze({
  // Bornes de l'interface, reprises pour borner les entrées du moteur
  // (critère d'acceptation §3.5.8 : les cas limites ne cassent rien).
  // [CLAUDE.md §3.3]
  age: Object.freeze([15, 80]), // ans
  tailleCm: Object.freeze([140, 210]),
  masseKg: Object.freeze([40, 120]),
  massePorteeKg: Object.freeze([0, 15]), // ceinture / sac / eau
  distanceKm: Object.freeze([5, 100]),
  intensitePctVO2max: Object.freeze([50, 95]),

  // Conservé pour la phase 4. En phase 1, la température est RETIRÉE de
  // l'interface (un curseur sans effet fait passer l'outil pour cassé) ;
  // le paramètre et son hook restent dans le moteur.
  temperatureC: Object.freeze([-5, 40]),
});

/* -------------------------------------------------------------------------- */
/* 14. Valeurs admissibles (validation des entrées)                          */
/* -------------------------------------------------------------------------- */

export const VALEURS_ADMISES = Object.freeze({
  sexe: Object.freeze(['H', 'F']),
  niveau: Object.freeze(['debutant', 'regulier', 'confirme', 'elite']),
  recharge: Object.freeze(['non', 'partielle', 'complete']),
  entrainementIntestinal: Object.freeze(['jamais', 'occasionnel', 'regulier']),
  sueurSalee: Object.freeze(['faible', 'moyen', 'eleve']),
  petitDejeuner: Object.freeze([true, false]),
  typePrise: Object.freeze(['glucose', 'glucose-fructose']),
  terrain: Object.freeze(['route', 'cheminRoulant', 'sentier', 'technique']),
});
