/**
 * simulateur.js — l'interface.
 * =============================================================================
 *
 * Rôle : lire les champs du formulaire, appeler le moteur (modele.js), afficher
 * les résultats en texte et en tableau. AUCUNE physiologie ici — le moteur
 * fait tous les calculs, l'interface ne fait que présenter.
 *
 * C'est ici, et pas dans le moteur, qu'on transforme les CODES de diagnostic
 * en phrases françaises (décision arrêtée : le moteur reste sans langue).
 * =============================================================================
 */

import { simuler, vitesseMPerMinDepuisTemps } from './modele.js';

/* -------------------------------------------------------------------------- */
/* Lecture du formulaire                                                     */
/* -------------------------------------------------------------------------- */

const $ = (id) => document.getElementById(id);

function lireFormulaire() {
  const distanceKm = Number($('distanceKm').value);
  const tempsMin = Number($('tempsHeures').value) * 60 + Number($('tempsMinutes').value);

  return {
    profil: {
      sexe: $('sexe').value,
      masseKg: Number($('masseKg').value),
      niveau: $('niveau').value,
      recharge: $('recharge').value,
      entrainementIntestinal: $('entrainementIntestinal').value,
      petitDejeuner: $('petitDejeuner').value === 'oui',
    },
    course: {
      distanceKm,
      vitesseMoyenneMPerMin: vitesseMPerMinDepuisTemps(distanceKm, tempsMin),
      intensitePctVO2max: Number($('intensitePct').value),
    },
    massePorteeKg: 0,
    terrain: 'route',
    penteMoyenneTangente: 0,
    plan: construirePlan(tempsMin),
  };
}

/** Construit un plan régulier à partir des champs « ravitaillement ». */
function construirePlan(dureeMin) {
  if ($('aucunRavito').checked) return [];

  const glucidesParHeure = Number($('glucidesParHeure').value);
  const intervalleMin = Number($('intervalleMin').value);
  const eauParPriseMl = Number($('eauParPriseMl').value);
  const premierePriseMin = Number($('premierePriseMin').value);
  const type = $('typePrise').value;

  if (glucidesParHeure <= 0 || intervalleMin <= 0) return [];

  const glucidesParPrise = glucidesParHeure * (intervalleMin / 60);
  const plan = [];
  for (let t = premierePriseMin; t < dureeMin; t += intervalleMin) {
    plan.push({ instantMin: t, glucidesG: glucidesParPrise, type, eauMl: eauParPriseMl });
  }
  return plan;
}

/* -------------------------------------------------------------------------- */
/* Mise en forme                                                             */
/* -------------------------------------------------------------------------- */

function formatTemps(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

/** Traduit un code de diagnostic du moteur en phrase française. */
function phraseDiagnostic(diag) {
  const ou = (d) =>
    d.km != null ? `au km ${d.km} (${formatTemps(d.minute)})` : `à ${formatTemps(d.minute)}`;

  switch (diag.code) {
    case 'HYPOGLYCEMIE':
      return `Hypoglycémie : le foie ne suit plus, la glycémie décroche ${ou(diag)}. C'est le coup de barre, la vision qui se trouble.`;
    case 'MUR_MUSCULAIRE':
      return `Mur musculaire : le glycogène des jambes est épuisé ${ou(diag)}. Les jambes deviennent « en bois ».`;
    case 'EPUISEMENT_FOIE':
      return `Le glycogène du foie tombe à zéro ${ou(diag)}.`;
    case 'ZONE_CRITIQUE_MUSCLE':
      return `Glycogène musculaire sous 20 % ${ou(diag)} : la baisse de régime devient perceptible.`;
    case 'ZONE_CRITIQUE_FOIE':
      return `Glycogène hépatique sous 20 % ${ou(diag)} : vigilance sur la glycémie.`;
    case 'SURPLUS_DIGESTIF':
      return `Surplus digestif : ${diag.valeurs.intestinG} g de glucides restent bloqués dans l'intestin en fin de course (${diag.valeurs.digestifTotalG} g avec l'estomac). Au-delà du plafond d'absorption, en ajouter ne sert à rien et se paie.`;
    default:
      return diag.code;
  }
}

function classeGravite(gravite) {
  if (gravite === 'critique') return 'diag-critique';
  if (gravite === 'attention') return 'diag-attention';
  return 'diag-ok';
}

/* -------------------------------------------------------------------------- */
/* Rendu                                                                     */
/* -------------------------------------------------------------------------- */

function rendre(resultat) {
  const s = resultat.synthese;

  // --- Synthèse ---
  const verdict = s.hypoglycemie || s.murMusculaire
    ? 'Sur ce plan, tu tapes dans le mur avant l\'arrivée.'
    : s.muscleResiduelFraction < 0.2
      ? 'Tu termines, mais réserves quasi à sec.'
      : 'Réserves suffisantes jusqu\'à l\'arrivée.';

  $('synthese').innerHTML = `
    <p class="verdict">${verdict}</p>
    <p class="nombres">
      Dépense totale : <strong>${s.depenseTotaleKcal} kcal</strong><br />
      Glucides ingérés : ${s.glucidesIngeresG} g &nbsp;•&nbsp;
      absorbés : ${s.glucidesAbsorbesG} g &nbsp;•&nbsp;
      oxydés : ${s.glucidesOxydesG} g<br />
      Réserve musculaire à l'arrivée :
      <strong>${s.muscleResiduelG} g</strong>
      (${Math.round(s.muscleResiduelFraction * 100)} % du départ)<br />
      Réserve hépatique à l'arrivée :
      <strong>${s.foieResiduelG} g</strong>
      (${Math.round(s.foieResiduelFraction * 100)} % du départ)<br />
      Surplus coincé dans l'intestin : ${s.surplusIntestinalFinG} g
    </p>`;

  // --- Diagnostics ---
  const liste = $('diagnostics');
  liste.innerHTML = '';
  if (resultat.diagnostics.length === 0) {
    liste.innerHTML = '<li class="diag-ok">Rien à signaler : le plan tient.</li>';
  } else {
    for (const diag of resultat.diagnostics) {
      const li = document.createElement('li');
      li.className = classeGravite(diag.gravite);
      li.textContent = phraseDiagnostic(diag);
      liste.appendChild(li);
    }
  }

  // --- Comparaison sans ravitaillement ---
  const f = resultat.fantome;
  const premiereDefaillance = [f.hypoglycemie, f.murMusculaire]
    .filter(Boolean)
    .sort((a, b) => a.minute - b.minute)[0];
  $('fantome').innerHTML = premiereDefaillance
    ? `<p>Sans aucune prise, première défaillance estimée
       <strong>au km ${premiereDefaillance.km}</strong>,
       à ${formatTemps(premiereDefaillance.minute)}
       ${f.hypoglycemie && premiereDefaillance === f.hypoglycemie ? '(hypoglycémie)' : '(mur musculaire)'}.</p>`
    : '<p>Même sans ravitaillement, les réserves tiendraient jusqu\'à l\'arrivée sur ce profil.</p>';

  // --- Tableau du déroulé (une ligne toutes les 15 min + la dernière) ---
  const corps = $('tableauCorps');
  corps.innerHTML = '';
  const T = resultat.temps;
  const E = resultat.energie;
  const G = resultat.glycogene;
  const C = resultat.glucides;
  const dernier = T.minutes.length - 1;

  const indices = [];
  for (let i = 0; i <= dernier; i += 15) indices.push(i);
  if (indices[indices.length - 1] !== dernier && dernier > 0) indices.push(dernier);

  for (const i of indices) {
    const tr = document.createElement('tr');
    const cellules = [
      T.minutes[i],
      T.distanceKm[i].toFixed(1),
      E.puissanceKcalMin[i].toFixed(1),
      Math.round(E.fractionGlucides[i] * 100),
      Math.round(G.muscleG[i]),
      Math.round(G.muscleFraction[i] * 100),
      Math.round(G.foieG[i]),
      Math.round(G.foieFraction[i] * 100),
      Math.round(C.estomacG[i]),
      Math.round(C.lumenTotalG[i]),
      C.absorptionGMin[i].toFixed(2),
    ];
    for (const valeur of cellules) {
      const td = document.createElement('td');
      td.textContent = valeur;
      tr.appendChild(td);
    }
    corps.appendChild(tr);
  }
}

/* -------------------------------------------------------------------------- */
/* Boucle : recalcul à chaque changement                                     */
/* -------------------------------------------------------------------------- */

function recalculer() {
  try {
    rendre(simuler(lireFormulaire()));
  } catch (erreur) {
    $('synthese').innerHTML = `<p class="diag-critique">Erreur de calcul : ${erreur.message}</p>`;
    // Utile pendant le développement : on garde la trace complète en console.
    console.error(erreur);
  }
}

$('formulaire').addEventListener('input', recalculer);
recalculer();
