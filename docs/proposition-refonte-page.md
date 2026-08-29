# Proposition — étape 5 : refonte de `simulateur.html` en quatre blocs

> Statut : **proposition, non implémentée.** À valider avant de coder.
> Référence : `CLAUDE.md` §3.3–3.4 (structure des quatre blocs), §6 (méthode :
> petits incréments, un commit par étape).
> État actuel : `simulateur.html` est la page de test minimale (formulaire à plat
> + synthèse texte + tableau). Le moteur (`modele.js`, 100 tests) est complet
> pour la phase 1.

## 1. Ce que l'étape 5 livre, et ce qu'elle ne livre pas

**Dans l'étape 5** : la structure en quatre blocs, dans l'ordre strict du site
(profil → course → coût → couverture), les boutons « pourquoi ça compte ? », la
déduction d'intensité affichée en langage humain, le bilan hydrique et sodique
dans le bandeau, les nouveaux diagnostics traduits en français, la persistance du
profil en `localStorage`. Les sorties restent en **texte + tableau**.

**Repoussé** :
- les **cartes de stratégies** et le **tableau de course** → étape 6 (roadmap) ;
- les **graphiques SVG** (sélecteur de nutriment, courbe de surplus digestif) →
  étape dédiée après l'étape 6, avec `graphique.js` ;
- le contenu éditorial de `index.html` → phase 2 (socle éditorial).

`troubles-digestifs.html` : `CLAUDE.md` §3.1 le liste en phase 1. Proposé en
**page courte** dès l'étape 5 (le bloc 4 pointe dessus), étoffée en phase 4.

## 2. Découpage en incréments (un commit chacun, vérif navigateur après chacun)

### 5a — Squelette quatre blocs + champs de profil complets + persistance
- `simulateur.html` : quatre `<section>` (`#bloc-profil`, `#bloc-course`,
  `#bloc-cout`, `#bloc-couverture`), titres numérotés, l'avertissement santé
  reste en tête.
- BLOC 1 : ajouter les champs manquants — **âge**, **taille**, **sueur salée**
  (faible / moyenne / élevée, avec « tu retrouves du sel blanc sur ta
  casquette ? »), **petit-déjeuner** en case + **zone de texte libre**.
- `localStorage` : clé `nutrition-endurance:profil:v1`, écrite à chaque
  changement, relue au chargement. Numéro de schéma dans la clé.
- `simulateur.js` : `lireFormulaire()` lit les nouveaux champs ; défauts du
  `CLAUDE.md` §3.3.

### 5b — BLOC 2 : intensité déduite, allure au km, avertissement chaleur
- Retirer le champ **intensité** de la saisie.
- Afficher **l'allure au km** à côté du temps visé (recalcul en direct).
- Champ optionnel **VMA connue (km/h)**.
- Afficher l'intensité déduite : « ≈ 77 % de VO₂max — allure marathon/tempo,
  trois mots à la fois » (via `deduireIntensitePctVO2max` + table de phrases).
- **Avertissement fixe** sous le champ température **dès que T ≥ 30 °C** :
  « Au-delà de 30 °C, le risque de coup de chaleur augmente fortement, surtout
  en air humide (non pris en compte ici). Ralentis, cherche l'ombre, arrose-toi.
  Ce n'est pas un paramètre à optimiser. » — indépendant des chiffres.
- **Heure de départ** : champ présent ; son effet (délai depuis le dernier
  repas → état du foie) est un point de modélisation **non encore traité** —
  proposé séparément avant de le câbler. En attendant, le champ est présent mais
  inerte, et c'est **dit** à l'utilisateur (pas de curseur muet silencieux).
  *(Ou : on retire l'heure de départ de l'étape 5 et on l'ajoute avec son
  modèle. À trancher — voir §4.)*

### 5c — BLOC 3 : bandeau coût complet + diagnostics + fantôme
- Bandeau : **dépense totale (kcal)**, **glucides à brûler (g)**, **eau à perdre
  (L)**, **sodium à perdre (mg)**.
- **Lipides brûlés** affichés à part, étiquetés « information — tes réserves de
  lipides ne limitent pas un marathon ». Jamais présentés comme un besoin.
- `energieSoutenableKcal` : affichée **seulement si elle diffère de la dépense**
  (déficit), étiquetée « ce que tu peux fournir à cette allure », avec les
  minutes perdues **en fourchette** (« environ 40 à 50 min de plus »).
- Diagnostics : ajouter les phrases françaises pour `OBJECTIF_IRREALISTE`
  (en tête, encadré fort), `RISQUE_HYPERTHERMIE` (urgence), `DESHYDRATATION`.
- Comparaison **sans ravitaillement** : déjà là, on la garde dans le bloc 3.
- Tableau du déroulé : ajouter colonnes eau perdue, sodium perdu, % perte de
  masse.

### 5d — BLOC 4 minimal + « pourquoi ça compte ? » partout
- BLOC 4 : ce que le plan actuel couvre (texte : g/h visés, absorbés, surplus),
  encadré « au-delà de ce rythme, le surplus s'accumule et se paie » →
  lien `troubles-digestifs.html`. Les cartes de stratégies sont l'étape 6.
- Bouton **« pourquoi ça compte ? »** sur chaque champ des blocs 1 et 2 :
  `<details><summary>`, 2 à 4 phrases par champ, **mécanisme** (pas consigne),
  textes tirés de `CLAUDE.md` §3.3. Libellés de niveau explicités
  (« régulier : 3 à 4 sorties/semaine depuis plus d'un an »).

### 5e — `troubles-digestifs.html` + `index.html` courts
- `troubles-digestifs.html` : page courte — surplus digestif (mécanisme,
  osmolarité, eau appelée dans la lumière), hyperglycémie, renvoi au simulateur.
  Étoffée en phase 4.
- `index.html` : accueil minimal — le propos en trois phrases, un lien vers le
  simulateur, l'avertissement. Contenu éditorial en phase 2.

### 5f — CSS du nouveau layout
- `style.css` : mise en page des quatre blocs (blanc, hiérarchie forte),
  `<details>` stylés, bandeau de synthèse, encadré d'alerte, mobile-first ≤ 360
  px. Toujours pas de dépendance, pas de police externe.
- *(Peut être fusionné au fil des incréments 5a–5d plutôt qu'un commit dédié —
  à voir.)*

## 3. « Pourquoi ce chiffre ? » — proposition

`CLAUDE.md` §3.4 : « chaque chiffre affiché a un bouton pourquoi ce chiffre ».
Pour l'étape 5, proposition : le mettre sur **les quatre chiffres du bandeau du
bloc 3** (dépense, glucides, eau, sodium) et sur **le verdict**, chacun dépliant
la formule et les hypothèses. Les chiffres du tableau du déroulé n'en ont pas
(le tableau EST déjà le détail). Étendre au bloc 4 à l'étape 6.

## 4. Décisions attendues d'Antoine

1. **Heure de départ** : champ inerte annoncé dès l'étape 5, ou reporté jusqu'à
   ce que son modèle (délai depuis le dernier repas → glycogène hépatique de
   départ) soit proposé et validé ? Je penche pour **reporter** : un champ inerte
   même annoncé va à l'encontre de la règle « aucun contrôle sans effet ».
2. **Persistance** : profil seul en `localStorage`, ou profil + course + plan ?
   Je propose **profil seul** pour l'étape 5 (c'est ce que dit `CLAUDE.md` §3.3),
   course et plan ajoutés avec le partage par URL plus tard.
3. **Plan de ravitaillement dans le bloc 2** : garder le générateur simple actuel
   (g/h, intervalle, type, eau) pour l'étape 5, la liste de prises éditable
   (ajout/modif/suppr) arrivant avec les cartes de stratégies à l'étape 6 ? Ou
   liste éditable dès maintenant ?
4. **« Pourquoi ce chiffre ? »** : périmètre proposé au §3 (bandeau + verdict)
   suffisant pour l'étape 5 ?
5. **5f (CSS)** : commit dédié en fin d'étape, ou CSS intégré au fil des
   incréments 5a–5e ?
6. **Ordre** : 5a → 5f tel quel, ou tu veux voir 5c (le bloc coût, le cœur) plus
   tôt ?
