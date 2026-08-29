/**
 * simulateur.js — l'interface (étape 5a : blocs 1, 2, 3 et le verdict).
 * =============================================================================
 *
 * Rôle : lire le formulaire, appeler le moteur, afficher la capacité et le
 * verdict de faisabilité. AUCUNE physiologie ici — le moteur calcule, l'interface
 * présente. C'est ici qu'on transforme les CODES de diagnostic en phrases.
 *
 * Blocs 4 (coût) et 5 (couverture) : étapes 5b et 5c.
 * =============================================================================
 */

import {
  simuler,
  vitesseMPerMinDepuisTemps,
  estimerVmaDepuisPerf,
} from './modele.js';
import { INTENSITE } from './constantes.js';

const $ = (id) => document.getElementById(id);

/* -------------------------------------------------------------------------- */
/* Libellés                                                                  */
/* -------------------------------------------------------------------------- */

const NIVEAU_LIBELLE = {
  debutant: "moins de 2 sorties par semaine, ou moins d'un an de pratique",
  regulier: '3 à 4 sorties par semaine depuis plus d’un an',
  confirme: '5 sorties ou plus, avec du travail de vitesse',
  elite: 'compétiteur, volume élevé toute l’année',
};

/** Phrase de ressenti selon le pourcentage BRUT de VO₂max. Approximatif. */
function ressentiEffort(pctBrut) {
  if (pctBrut >= 100) return 'au-delà de ta capacité maximale — intenable plus de quelques minutes';
  if (pctBrut >= 88) return "l'allure du 10 km ou plus vif — parler devient difficile";
  if (pctBrut >= 80) return "l'allure semi / seuil — un mot ou deux";
  if (pctBrut >= 68) return "l'allure marathon — trois mots à la fois, pas une phrase";
  if (pctBrut >= 55) return "de l'endurance fondamentale — tu parles par phrases";
  return 'un effort très facile — tu tiens une vraie conversation';
}

const POURQUOI_EFFORT =
  "Ce pourcentage vient du rapport entre la consommation d'oxygène estimée à " +
  "ton allure et celle estimée à ta VMA (équation ACSM : VO₂ = 3,5 + 0,2 × " +
  "vitesse en m/min). On l'exprime en pourcentage de VO₂max, ta consommation " +
  "maximale d'oxygène.";

/** Phrase française pour les diagnostics affichés dans le bloc 3. */
function phraseDiagnostic(diag) {
  switch (diag.code) {
    case 'OBJECTIF_IRREALISTE':
      return (
        `À ${diag.intensiteDemandee} % de tes capacités, cette allure n'est pas ` +
        `tenable sur toute la durée (maximum ${diag.plafondSoutenable} %). Tu ` +
        `ralentirais en course ; un temps réaliste serait plutôt ${formatDuree(diag.tempsRealisteMin)}. ` +
        `Corrige le temps visé au bloc 2, ou ta VMA ci-dessus.`
      );
    case 'OBJECTIF_TRES_EN_DECA':
      return (
        `Tu serais à ${diag.intensiteDemandee} % de tes capacités, soit ${diag.ecartPct} ` +
        `points sous le maximum tenable (${diag.plafondSoutenable} %). Tu pourrais ` +
        `viser nettement plus vite si c'est ton intention.`
      );
    default:
      return diag.code;
  }
}

/* -------------------------------------------------------------------------- */
/* Format                                                                    */
/* -------------------------------------------------------------------------- */

function formatDuree(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

function formatAllure(minParKm) {
  if (!Number.isFinite(minParKm) || minParKm <= 0) return '—';
  const m = Math.floor(minParKm);
  const s = Math.round((minParKm - m) * 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

/* -------------------------------------------------------------------------- */
/* Persistance du profil (localStorage, schéma v1)                           */
/* -------------------------------------------------------------------------- */

const CLE_PROFIL = 'nutrition-endurance:profil:v1';

function chargerProfil() {
  try {
    return JSON.parse(localStorage.getItem(CLE_PROFIL)) || {};
  } catch {
    return {};
  }
}

function enregistrerProfil() {
  try {
    localStorage.setItem(
      CLE_PROFIL,
      JSON.stringify({
        sexe: $('sexe').value,
        tailleCm: $('tailleCm').value,
        masseKg: $('masseKg').value,
        niveau: $('niveau').value,
      }),
    );
  } catch {
    /* stockage indisponible : on continue sans persistance */
  }
}

/* -------------------------------------------------------------------------- */
/* Lecture du formulaire                                                     */
/* -------------------------------------------------------------------------- */

function nombre(id) {
  const v = Number($(id).value);
  return Number.isFinite(v) ? v : NaN;
}

function lireFormulaire() {
  const distanceKm = nombre('distanceKm');
  const tempsViseMin = nombre('tempsHeures') * 60 + nombre('tempsMinutes');
  const vmaConnueKmh = $('vmaConnue').value === '' ? null : nombre('vmaConnue');
  const perfDistanceKm = $('perfDistanceKm').value === '' ? null : nombre('perfDistanceKm');
  const perfMin =
    $('perfHeures').value === '' && $('perfMinutes').value === ''
      ? null
      : nombre('perfHeures') * 60 + nombre('perfMinutes');

  return {
    sexe: $('sexe').value,
    tailleCm: nombre('tailleCm'),
    masseKg: nombre('masseKg'),
    niveau: $('niveau').value,
    distanceKm,
    tempsViseMin,
    vmaConnueKmh,
    perfDistanceKm,
    perfMin,
  };
}

/**
 * VMA retenue et sa provenance : VMA connue > performance récente > niveau.
 * @returns {{ kmh: number, provenance: string }}
 */
function vmaRetenue(f) {
  if (f.vmaConnueKmh && f.vmaConnueKmh >= 8 && f.vmaConnueKmh <= 25) {
    return { kmh: f.vmaConnueKmh, provenance: 'précision élevée — tu l’as renseignée' };
  }
  if (f.perfDistanceKm > 0 && f.perfMin > 0) {
    const est = estimerVmaDepuisPerf({
      distanceKm: f.perfDistanceKm,
      tempsMin: f.perfMin,
      niveau: f.niveau,
    });
    if (est != null) {
      return { kmh: est, provenance: 'bonne — estimée d’une performance récente' };
    }
  }
  return {
    kmh: INTENSITE.VMA_DEFAUT_PAR_NIVEAU_KMH[f.niveau],
    provenance: 'approximative — d’après ton niveau, faute de mieux',
  };
}

/* -------------------------------------------------------------------------- */
/* Rendu                                                                     */
/* -------------------------------------------------------------------------- */

function rendre() {
  const f = lireFormulaire();

  // Libellé du niveau + allure au km, indépendants du moteur.
  $('niveau-libelle').textContent = NIVEAU_LIBELLE[f.niveau] ?? '';
  $('allure-au-km').textContent =
    f.distanceKm > 0 && f.tempsViseMin > 0
      ? `soit ${formatAllure(f.tempsViseMin / f.distanceKm)}`
      : '';

  const zoneVma = $('vma-retenue');
  const zoneEffort = $('effort-demande');
  const zoneVerdict = $('verdict');
  const zoneDiag = $('verdict-diagnostics');
  zoneDiag.innerHTML = '';

  if (!(f.distanceKm > 0) || !(f.tempsViseMin > 0) || !(f.masseKg > 0)) {
    zoneVma.innerHTML = '';
    zoneEffort.textContent = 'Renseigne la distance, le temps visé et ta masse.';
    zoneVerdict.innerHTML = '';
    $('pourquoi-effort').hidden = true;
    return;
  }

  const vma = vmaRetenue(f);

  const resultat = simuler({
    profil: {
      sexe: f.sexe,
      masseKg: f.masseKg,
      tailleCm: f.tailleCm,
      niveau: f.niveau,
      vmaConnueKmh: vma.kmh, // on passe toujours la VMA retenue
      // Paramètres « jour J » non demandés (outil de préparation) : défauts.
      recharge: 'non',
      petitDejeuner: true,
      entrainementIntestinal: 'occasionnel',
      sueurSalee: 'moyen',
    },
    course: {
      distanceKm: f.distanceKm,
      vitesseMoyenneMPerMin: vitesseMPerMinDepuisTemps(f.distanceKm, f.tempsViseMin),
      // pas d'intensitePctVO2max → le moteur la déduit de la VMA retenue
    },
    plan: [],
  });

  const s = resultat.synthese;
  const brut = s.intensiteBrutePctVO2max;
  const plafond = s.plafondSoutenablePct;

  // VMA retenue
  zoneVma.innerHTML = `
    <span>VMA retenue :</span>
    <span class="valeur">${vma.kmh.toFixed(1)} km/h</span>
    <span class="provenance">${vma.provenance}</span>`;

  // Effort demandé
  zoneEffort.textContent =
    `Cette allure te demande ${Math.round(brut)} % de ta capacité maximale — ` +
    `c'est ${ressentiEffort(brut)}.`;
  $('pourquoi-effort-texte').textContent = POURQUOI_EFFORT;
  $('pourquoi-effort').hidden = false;

  // Verdict
  let classe = 'verdict--ok';
  let etiquette = 'Objectif tenable';
  let phrase = `Tu serais à ${brut.toFixed(1)} % de tes capacités, pour un maximum tenable de ${plafond.toFixed(1)} % sur cette durée.`;

  if (s.objectifIrrealiste) {
    classe = 'verdict--danger';
    etiquette = 'Objectif hors de portée';
    phrase =
      `Tu serais à ${brut.toFixed(1)} %, au-dessus du maximum tenable de ${plafond.toFixed(1)} % ` +
      `sur cette durée. Un temps réaliste serait plutôt ${formatDuree(s.objectifIrrealiste.tempsRealisteMin)}.`;
  } else if (s.objectifTresEnDeca) {
    classe = 'verdict--attention';
    etiquette = 'Objectif large';
    phrase =
      `Tu serais à ${brut.toFixed(1)} %, très en dessous du maximum tenable de ${plafond.toFixed(1)} %. ` +
      `Tu as de la marge — tu pourrais viser plus vite.`;
  }

  zoneVerdict.className = `verdict ${classe}`;
  zoneVerdict.innerHTML = `<span class="etiquette">${etiquette}</span><p>${phrase}</p>`;

  // Diagnostics d'objectif uniquement (les autres arrivent au bloc 4)
  for (const diag of resultat.diagnostics) {
    if (diag.code !== 'OBJECTIF_IRREALISTE' && diag.code !== 'OBJECTIF_TRES_EN_DECA') continue;
    const li = document.createElement('li');
    li.className = `diag--${diag.gravite}`;
    li.textContent = phraseDiagnostic(diag);
    zoneDiag.appendChild(li);
  }
}

/* -------------------------------------------------------------------------- */
/* Câblage                                                                   */
/* -------------------------------------------------------------------------- */

// Restaure le profil enregistré avant le premier rendu.
{
  const p = chargerProfil();
  for (const [id, val] of Object.entries(p)) {
    if (val !== undefined && val !== null && $(id)) $(id).value = val;
  }
}

const form = $('formulaire');
form.addEventListener('submit', (e) => e.preventDefault());
form.addEventListener('input', () => {
  enregistrerProfil();
  rendre();
});

for (const bouton of document.querySelectorAll('.raccourci')) {
  bouton.addEventListener('click', () => {
    $('distanceKm').value = bouton.dataset.km;
    rendre();
  });
}

rendre();
