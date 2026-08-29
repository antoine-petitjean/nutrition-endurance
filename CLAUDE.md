# Projet : Nutrition & Endurance — course sur route et trail

Site pédagogique en français sur la nutrition de l'effort en course à pied,
articulé autour d'un simulateur physiologique interactif.

- Auteur : Antoine Petitjean. **Premier projet web, débutant complet.**
- Dépôt : https://github.com/antoine-petitjean/nutrition-endurance
- URL publique : https://antoine-petitjean.github.io/nutrition-endurance

**Promesse du site** : « Comprends ce qui se passe dans ton corps quand tu cours,
et tu sauras quoi manger, quand, et pourquoi — sur route comme en montagne. »

Le site remplace la recette (« un gel toutes les 45 minutes ») par le modèle
mental. On n'énonce jamais une recommandation sans avoir expliqué le mécanisme
qui la produit.

---

## 1. Décisions techniques arrêtées

Ces choix sont tranchés. Ne pas les rouvrir sans en parler à Antoine.

- **HTML, CSS et JavaScript purs.** Aucun framework, aucune compilation, aucun
  `npm install`, aucun `package.json`. GitHub Pages sert les fichiers tels quels :
  ce qui est dans le dépôt est ce qui s'affiche.
  *Raison : Antoine doit pouvoir ouvrir n'importe quel fichier et comprendre ce
  qu'il lit. Une chaîne de compilation entre lui et son site le priverait de ça.*
- **node est autorisé comme outil de développement local** (tests du moteur,
  vérifications numériques). Il ne fait pas partie du site : le dépôt reste servi
  tel quel par GitHub Pages, sans `package.json` ni dépendance. `modele.js` doit
  rester importable aussi bien par `node` que par le navigateur.
- **Aucune dépendance externe, aucun CDN.** Les graphiques sont dessinés à la
  main en SVG. Pas de Chart.js, pas de D3, pas de Google Fonts.
  *Raison : le site doit fonctionner hors ligne, et ne dépendre de personne.*
- **JavaScript moderne** (ES2020+), modules ES natifs (`type="module"`).
  Pas de transpilation, les navigateurs cibles comprennent.
- **Mobile-first.** Utilisable au doigt dès 360 px. Beaucoup de lecteurs
  consulteront depuis leur téléphone, la veille d'une course.
- **Accessibilité visée WCAG 2.1 AA** : navigation clavier complète, `aria-label`
  sur chaque contrôle, `aria-live` sur les résultats recalculés, contrastes
  vérifiés dans les deux thèmes, **information jamais portée par la seule
  couleur**, et pour chaque graphique une alternative en tableau de valeurs
  repliable.
- **Thème clair et sombre** via `prefers-color-scheme`, avec les couleurs de
  graphiques recalculées pour rester lisibles dans les deux.
- `<html lang="fr">`, UTF-8. Code et commentaires en français.
- `prefers-reduced-motion` respecté.

---

## 2. Feuille de route

Le projet est ambitieux et se construit **par phases**. Chaque phase se termine
par un site en ligne et fonctionnel. On ne passe à la suivante qu'une fois la
précédente publiée et validée par Antoine.

- **Phase 1 — le simulateur, mode route.** ← *phase en cours, spécifiée ci-dessous*
- **Phase 2 — le socle éditorial** : accueil, dépense énergétique, filières,
  réserves de glycogène, besoins glucidiques, page sources.
- **Phase 3 — le mode trail** : Minetti activé, éditeur de segments, dénivelé,
  portage, déficit cumulé, fatigue gustative.
- **Phase 4 — hydratation et troubles digestifs** : bilan hydrique et sodique,
  score de risque digestif explicable, pages éditoriales associées.
- **Phase 5 — route vs trail** : page de comparaison, superposition de scénarios.
- **Phase 6 — confort** : glossaire, parcours guidés, export du plan, impression.

**Le moteur est écrit dès la phase 1 pour que la discipline soit un paramètre,
jamais un moteur bis.** Ajouter le trail en phase 3 doit consister à activer des
modules et changer des valeurs par défaut, pas à réécrire les calculs.

**Ajusté en cours de route** : le **bilan hydrique et sodique de base** (eau et
sodium perdus) est avancé en phase 1 — le bloc 3 du simulateur en a besoin. Le
**score de risque digestif** explicable reste en phase 4.

### Ordre de travail de la phase 1 (fin)

Le moteur (étapes 1 à 9) et une page de test texte/tableau sont faits. Reste,
un commit par étape, arrêt et vérification navigateur après chacune :

1. ~~Correction du déficit glucidique + conservation de l'énergie~~ ✔
2. ~~Mise à jour de ce document~~ ✔ *(commit en cours)*
3. Modèle de sudation et sodium + ses tests *(arrêt : vérifier 0.5 / 0.9 / 1.4 L/h)*
4. Déduction de l'intensité depuis l'allure *(proposer la méthode d'abord)*
5. Refonte de `simulateur.html` en quatre blocs
6. Stratégies prédéfinies + tableau de course
7. Bibliothèque d'aliments

---

## 3. PHASE 1 — Le simulateur (mode route)

### 3.1 Fichiers à produire

```
index.html                  Accueil minimal : le propos, un lien vers le simulateur
simulateur.html             La page de l'outil (quatre blocs, voir 3.4)
sources.html                Références vérifiées + hypothèses de modélisation + limites connues
troubles-digestifs.html     Page dédiée : surplus digestif, hyperglycémie (sortent du simulateur)
assets/css/style.css        Design system : variables CSS, thèmes clair/sombre
assets/js/constantes.js     TOUTES les constantes physiologiques, sourcées
assets/js/modele.js         Le moteur. Aucune référence au DOM.
assets/js/sudation.js       Sous-module du moteur : bilan hydrique et sodique (importé par modele.js)
assets/js/aliments.js       Catalogue de familles d'aliments (Ciqual), recherche textuelle
assets/js/graphique.js      Dessin SVG générique, réutilisable
assets/js/simulateur.js     L'interface : lit les champs, appelle le moteur, dessine
```

**Séparation stricte** : `modele.js` ne touche jamais au DOM et n'importe que
`constantes.js`. On doit pouvoir vérifier la physiologie sans lire une ligne
d'affichage. C'est ce qui rend le site crédible.

**Aucune valeur magique dans le code.** Toute constante vit dans
`constantes.js`, avec son unité, sa fourchette de plausibilité et sa source en
commentaire. Si une valeur n'a pas de source, elle est marquée
`// HYPOTHÈSE DE MODÉLISATION` — explicitement, pas discrètement.

### 3.2 Le moteur — simulation à pas de 1 minute

#### a. Coût énergétique

Utiliser le polynôme de Minetti (2002), qui donne le coût de déplacement en
J/kg/m en fonction de la pente `i` exprimée en tangente (0.10 = 10 %) :

```
Cr(i) = 155.4·i⁵ − 30.4·i⁴ − 43.3·i³ + 46.3·i² + 19.5·i + 3.6
```

Domaine de validité : `i` entre −0.45 et +0.45. **Borner, ne pas extrapoler.**

À plat, `Cr(0) = 3.6 J/kg/m`, soit 0.86 kcal/kg/km — cohérent avec la valeur
classique de ~1 kcal/kg/m appliquée en course. Écrire la fonction avec Minetti
dès maintenant, même si la phase 1 ne simule que du plat : la phase 3 en aura
besoin, et ça évite d'avoir deux formules concurrentes.

```
Puissance métabolique (kcal/min) = Cr(i) × masse_totale (kg) × vitesse (m/min) / 4184
```

Facteurs prévus dès maintenant, à 1.00 en mode route :
- **Terrain** : route 1.00 / chemin roulant 1.05 / sentier 1.15 / technique 1.20–1.30
- **Masse totale** = masse corporelle + masse portée (ceinture, sac, eau)
- **Dérive de l'économie de course** avec la fatigue : +2 à +6 % après plusieurs
  heures. Fonction du temps en phase 1, du D− cumulé en phase 3.

#### b. Répartition glucides / lipides

Fraction de l'énergie fournie par les glucides selon `x` = % de VO₂max.
Quadratique calée sur les points expérimentaux de Romijn (25 % → 5 %,
65 % → 50 %, 85 % → 90 %) :

```
f_CHO(x) = 0.0145833·x² − 0.1875·x + 0.5729       (résultat en %, borner à [0, 100])
```

Cette courbe donne ≈ 28 % à 50 % de VO₂max et ≈ 68 % à 75 % : cohérent avec les
ordres de grandeur usuels. Le reste de l'énergie vient des lipides.

Modulations à prévoir dans la signature de la fonction, même si elles valent 1.00
en phase 1 : niveau d'entraînement (les entraînés oxydent plus de lipides à
intensité relative égale), chaleur et altitude (**augmentent** la part
glucidique), durée (glissement lent vers les lipides tant que le glycogène n'est
pas critique).

**C'est le message central du site** : plus on court vite, plus on brûle du sucre
plutôt que de la graisse — et le sucre est la ressource limitée.

#### c. Réserves de glycogène — deux compartiments distincts

Ils s'épuisent différemment et donnent des symptômes différents : jambes vides
pour le muscle, coup de barre et vision trouble pour le foie. Ne jamais les
fusionner en un seul chiffre.

Conversion : 1 mmol de glucosyl = 0.162 g de glycogène. 1 g de glycogène = 4 kcal.

**Muscle actif** — masse musculaire ≈ 45 % de la masse corporelle, dont ≈ 50 %
dans les jambes, soit un muscle actif ≈ 22.5 % de la masse corporelle.
Densité de glycogène :

| État | mmol/kg | g/kg |
|---|---|---|
| Non entraîné | 110 | 17.8 |
| Entraîné | 150 | 24.3 |
| Entraîné + recharge glucidique réussie | 200 | 32.4 |

**Foie** — masse 1.8 kg :

| État | mmol/kg | Total |
|---|---|---|
| Normal | 270 | 79 g |
| Chargé | 500 | 146 g |
| À jeun (nuit sans petit-déjeuner) | — | **environ moitié du normal** |

Ordre de grandeur pour un coureur de 70 kg : **360 à 660 g de glucides**, soit
1 450 à 2 640 kcal. Un marathon en coûte environ 2 950 kcal. D'où le mur.

#### d. Absorption des glucides — trois compartiments

C'est le point qui fait la crédibilité de l'outil. Chaîne :
**estomac → intestin → sang**. Jamais d'absorption instantanée.

1. **Estomac** — chaque prise y entre. Vidange en processus du premier ordre,
   proportionnelle au contenu présent. Ralentie par : osmolarité au-delà de
   ~300–350 mOsm/kg, intensité au-delà de ~75 % de VO₂max, déshydratation
   au-delà de 3–4 % de perte de masse.
2. **Intestin** — capacité plafonnée par les transporteurs :

| Type de glucides | Transporteur | Plafond d'oxydation |
|---|---|---|
| Glucose, maltodextrine seuls | SGLT1 | **60 g/h** |
| Glucose + fructose (2:1 à 1:0.8) | SGLT1 + GLUT5 | **90 g/h** |
| Idem, intestin entraîné | — | **jusqu'à 120 g/h** |

3. **Sang → muscle** : les glucides absorbés épargnent le glycogène gramme pour
   gramme.
4. **Le surplus reste dans le tube digestif.** Il ne disparaît pas, il s'accumule,
   augmente la charge osmotique et appelle de l'eau dans la lumière intestinale.
   C'est l'origine des troubles gastriques, et **ça doit être visible à l'écran**.

> Les paramètres de vidange gastrique sont la partie la moins bien contrainte du
> modèle. Les documenter comme des hypothèses ajustables, et le dire au lecteur
> sur la page — ne pas les présenter avec la même assurance que les plafonds
> d'absorption, qui eux sont bien établis.

#### e. Déficit glucidique et allure tenable

Quand ni l'absorbé, ni le foie, ni le glycogène musculaire ne couvrent le besoin
glucidique du pas, la part manquante **n'est pas produite** : le coureur ralentit.
Le moteur ne compte donc, comme **énergie soutenable**, que la puissance
réellement fournie (part lipidique à l'allure cible + glucides oxydés).

- **`depenseTotaleKcal`** = ce que la course coûte à l'allure visée. C'est le
  chiffre affiché comme « ta dépense ». Il est quasi indépendant du scénario :
  seul le **temps** change.
- **`energieSoutenableKcal`** = ce que le coureur peut fournir à cette allure.
  **Jamais présenté comme « ta dépense »** — c'est un plafond, pas un bilan.
- **Minutes perdues** : sur la portion en déficit, temps = prévu / fraction
  d'allure moyenne. `tempsEstimeMin` et `minutesPerduesEstimees` sont renvoyés
  dans la synthèse et dans le diagnostic `ALLURE_INTENABLE`. **À présenter en
  fourchette** (« environ 20 à 30 minutes »), jamais au chiffre près.

> **Limite connue, à dire au lecteur (sources.html) :** quand le coureur
> ralentit, son intensité relative baisse, la part lipidique augmente et le
> déficit se réduit de lui-même. Cette boucle de rattrapage n'est pas modélisée.
> Le modèle est donc **pessimiste après le point de rupture** : il décrit bien le
> moment où l'allure lâche, moins bien la suite.

#### f. Sudation et sodium

Fondé sur la physique de la thermorégulation, pas sur une table arbitraire.
Sous-module `sudation.js`, importé par `modele.js`. Constantes dans
`constantes.js` (marquées `// HYPOTHÈSE` avec leur fourchette).

```
surfaceCorporelleM2 = 0.007184 × taille_cm^0.725 × masse_kg^0.425
  [Du Bois & Du Bois, 1916 — contrôle : 175 cm / 70 kg → 1.85 m²]

chaleurProduiteKcalH   = puissance × 60 × FRACTION_CHALEUR
  FRACTION_CHALEUR = 0.78          // 1 − rendement mécanique ; HYPOTHÈSE 0.75–0.80
chaleurSecheKcalH      = COEFF_ECHANGE × surfaceCorporelleM2
                         × (T_PEAU − temperatureC) × 0.86
  T_PEAU = 33 °C
  COEFF_ECHANGE = 15 W/m²/K        // convection + rayonnement ; HYPOTHÈSE 8–25
  0.86 = conversion W → kcal/h
  // PAS de max(0, …) : au-dessus de 33 °C l'air réchauffe, la valeur devient
  // négative et s'ajoute à la charge à évaporer.
besoinEvaporatifLParH = max(0, produite − sèche) / (CHALEUR_LATENTE × EFFICACITE)
  CHALEUR_LATENTE_KCAL_PAR_L = 580 // ≈ 2426 J/g [physique standard]
  EFFICACITE_EVAPORATIVE = 0.80    // une partie goutte ; HYPOTHÈSE 0.6–0.9
sudationLParH = borner(besoinEvaporatifLParH, 0.3, 3.0)   [GSSI SSE-161 : 0.5–2.0 typique]

sodiumSueurMmolL = { faible: 20, moyen: 40, eleve: 70 }   [GSSI SSE-161 : 10–90]
MG_PAR_MMOL_SODIUM = 22.99                                 [GSSI SSE-161]
SEUIL_DESHYDRATATION_PCT_MASSE = 2   // au-delà, performance dégradée
```

Cas de contrôle des tests (70 kg, 175 cm, marathon 3 h 30) :
15 °C → ~0.5 L/h · 25 °C → ~1.0 L/h · 32 °C → ~1.4 L/h.
**Si ça diverge, le dire à Antoine — ne pas ajuster les constantes pour que ça
passe.** La sudation doit **continuer de croître au-delà de 33 °C**.

- La déshydratation (perte de masse NETTE = sueur − eau bue) alimente le hook
  `perteMassePct` de `facteurVidangeGastrique()`, enfin utilisé. Diagnostic
  `DESHYDRATATION` à −2 %.
- Diagnostic **`RISQUE_HYPERTHERMIE`** (gravité critique) quand le besoin
  évaporatif dépasse `SUDATION_MAX_L_PAR_H` : le corps ne peut plus évacuer sa
  chaleur. **Présenté comme une urgence, jamais comme un paramètre à ajuster.**
- **Limite connue** : l'humidité n'est pas modélisée → le modèle **sous-estime
  le risque en chaleur humide**. Conséquence interface : **au-delà de 30 °C,
  avertissement fixe sur le coup de chaleur**, indépendant des chiffres. Un
  nombre rassurant ne tient pas lieu d'avertissement. (Code + `sources.html`.)

#### g. Intensité déduite, plafond de soutenabilité, objectif irréaliste

L'utilisateur ne saisit plus le % de VO₂max. `deduireIntensitePctVO2max()` le
calcule par le **rapport de deux applications de l'équation ACSM** (`VO2 =
3,5 + 0,2·v`, v en m/min) — à l'allure visée et à la VMA. La forme rapport fait
que le biais connu de l'équation (surestimation de ~15 % chez les athlètes)
se simplifie en grande partie. VMA : renseignée par le coureur, ou par défaut
selon le niveau (`INTENSITE.VMA_DEFAUT_PAR_NIVEAU_KMH`, hypothèse). Résultat
borné à [50, 95].

`pctMaxSoutenable({ dureeMin, niveau })` donne la fraction de VO₂max **tenable
sur toute la durée** (courbe décroissante, décalée par le niveau). Si l'intensité
déduite dépasse ce plafond, diagnostic **`OBJECTIF_IRREALISTE`** (gravité
critique, en tête) avec l'intensité demandée, le plafond, et un **temps réaliste
estimé** (durée à partir de laquelle l'intensité déduite repasse sous le
plafond). L'outil dit qu'un objectif ne tient pas **avant** de parler de
nutrition — aucun calculateur de gels ne fait ça.

Constantes de soutenabilité : `// HYPOTHÈSE DE MODÉLISATION`, fourchette
±5 points, calibrées pour que les six cas de contrôle de `retour-etape4.md`
passent.

### 3.3 L'interface — cinq blocs

> **Spécification détaillée : `docs/spec-etape5.md`** (validée). Cette section en
> donne le squelette ; en cas de doute, la spec fait foi.

**Principe directeur : le simulateur est un outil de PRÉPARATION, pas du jour J.**
On l'ouvre dès l'inscription à une course, des semaines ou des mois avant. Tout
ce qu'on ne peut pas savoir si tôt — dernier repas, recharge glucidique,
entraînement intestinal, salinité de la sueur — **disparaît de la saisie** et
prend une valeur par défaut. Le moteur les utilise toujours ; l'interface ne les
demande plus. Ces leviers reviendront dans deux sections ultérieures, « Les jours
qui précèdent » et « Le jour J ».

**Chaque champ porte un bouton « pourquoi ça compte ? »** qui déplie deux à
quatre phrases expliquant le **mécanisme**, pas la consigne. **Chaque chiffre de
sortie porte un « pourquoi ce chiffre ? »** qui déplie le calcul et les
hypothèses. Aucun résultat ne tombe du ciel.

Ordre strict : qui tu es → ta course → ta capacité et le verdict → ce que ça va
coûter → comment le couvrir.

#### BLOC 1 — Qui tu es  *(persisté en `localStorage`, avec version de schéma)*

| Champ | Plage | Rôle moteur |
|---|---|---|
| Sexe | H / F | fraction de masse musculaire (0.45 / 0.36) |
| Taille | 140–210 cm | surface corporelle → échange thermique |
| Masse corporelle | 40–120 kg | coût énergétique, taille des réserves |
| Niveau | débutant / régulier / confirmé / élite | densité de glycogène, VMA de repli |

**Supprimé : l'âge** (il n'agissait sur rien). **Par défaut, non demandés :**
recharge = `non`, petit-déjeuner = `pris`, entraînement intestinal =
`occasionnel`, sueur salée = `moyen`. Libellés de niveau explicités (« régulier :
3 à 4 sorties/semaine depuis plus d'un an »).

#### BLOC 2 — Ta course

Distance (5–100 km, raccourcis 10 km / semi / marathon) et temps visé, avec
l'**allure au km affichée à côté**, l'un déduisant l'autre.

#### BLOC 3 — Ta capacité, et le verdict

- **VMA connue (km/h)**, optionnel (8–25) — source la plus fiable.
- **Performance récente** (distance + temps), optionnel — seconde source, VMA
  rétro-calculée via la courbe de soutenabilité (`// HYPOTHÈSE`).
- Encadré dépliable « je ne connais pas ma VMA » : test du demi-Cooper (plus
  grande distance en 6 min ÷ 100). [Billat & Koralsztein 1996 ; CV ≈ 25 %].
- **VMA retenue** toujours affichée, avec sa provenance (précision élevée /
  bonne / approximative), modifiable à la main.
- **Effort demandé** (remplace « intensité ») : « cette allure te demande **77 %
  de ta capacité maximale** — allure marathon, trois mots mais pas une phrase ».
  Le terme VO₂max n'apparaît que dans le « pourquoi ce chiffre ? ».
- **Verdict** : « Cet objectif tient : tu serais à 76,9 %, pour un maximum
  tenable de 80,5 % sur cette durée. » Diagnostics `OBJECTIF_IRREALISTE` et
  `OBJECTIF_TRES_EN_DECA`, avec le **pourcentage brut** et un lien vers le champ
  à corriger.
- **Jamais affiché : une VO₂max en ml/kg/min.**

#### BLOC 4 — Ce que ta course va coûter

- **Contexte météo sans saisie de température** : date + lieu (≈ 100 villes
  françaises embarquées) → normale saisonnière ; heure de départ → température au
  départ **et son évolution minute par minute** pendant la course (min au lever
  du jour, max en milieu d'après-midi — `// HYPOTHÈSE` sur la forme). Affichage
  obligatoire : « ce n'est pas une prévision, c'est la moyenne observée ici à
  cette période », avec la fourchette inter-annuelle. Curseur pour rejouer à une
  autre température. **Aucun appel réseau.**
- **Phrase centrale** : « Tu vas brûler **549 g** de glucides. Tu en as **436**
  en réserve. » Chaque moitié se déplie avec le calcul (voir la spec).
  ⚠ On affiche la **DEMANDE** (`glucidesDemandeG`, calculée sur l'allure cible),
  pas le réalisé (`glucidesOxydesG`, qui baisse quand la course se passe mal).
- **Quatre chiffres**, au futur : « ce que ça va te coûter » (kcal) · « glucides
  que tu vas brûler » (g) · « eau que tu vas perdre » (L + % de masse) · « sel
  que tu vas perdre » (mg). **Les lipides sont retirés de l'affichage** (les
  montrer laisserait croire qu'il faut en manger).
- **Graphique** : axe temporel, **un nutriment à la fois** (onglets : glycogène
  musculaire / hépatique / eau / sodium), annoté aux moments qui comptent.
  Tableau de valeurs repliable, accessible au clavier.

#### BLOC 5 — Comment le couvrir

- **Objectif de la stratégie proposée : tenir la même allure du départ à
  l'arrivée** (`fractionAllureTenable` à 1,0 partout), avec une marge résiduelle
  affichée. Si aucune stratégie n'y suffit, le dire franchement (« même à
  90 g/h, tu seras en déficit d'environ 150 g sur la fin ») — sans édulcorer,
  sans conseiller de courir moins vite.
- **Choix des produits** : cases multiples parmi les familles + « autre » →
  texte libre. Pour chaque famille cochée, grammage (champ libre, raccourcis
  20/25/30/40/50/60 g, fourchette usuelle annoncée, renvoi à l'étiquette).
  **Aucune marque.** Note : un gel de 60 g d'un coup = charge osmotique lourde,
  la courbe du contenu digestif doit le montrer.
- **Tableau de course** — le livrable : « un gel de 45 g tous les 7,2 km —
  km 7,2 / 14,4 / 21,6… ». Change avec le grammage.
- **Second graphique** avec la **courbe fantôme permanente** (sans
  ravitaillement, trait léger) — la comparaison rend l'effet de chaque prise
  lisible. La **courbe du surplus digestif reste ici** : message principal de
  l'outil.
- Deux renvois : « Les risques si tu manges trop » (page à écrire) et « Les
  jours qui précèdent » (recharge, entraînement intestinal — pourra rejouer la
  simulation avec ces leviers activés).

#### Découpage de l'étape 5

- **5a** — blocs 1, 2, 3 + « pourquoi ça compte ? » + design system (thèmes
  clair/sombre, mobile d'abord, corps ≥ 17 px) + verdict. **Arrêt pour
  relecture.**
- **5b** — bloc 4 : normales de température, `glucidesDemandeG`, les quatre
  chiffres, premier graphique SVG.
- **5c** — bloc 5 : stratégies, `aliments.js`, tableau de course, second
  graphique avec courbe fantôme.

### 3.5 Critères d'acceptation de la phase 1

Le simulateur est réussi si :

1. Un coureur de 70 kg visant 3 h 30 au marathon, **sans aucun ravitaillement**,
   épuise ses réserves avant l'arrivée, et le point de rupture est annoncé avec
   son kilomètre.
2. Le même coureur **avec 60 g/h** termine avec une réserve résiduelle.
3. **Ingérer 150 g/h ne fait pas monter l'absorption au-delà du plafond** : le
   surplus s'accumule visiblement dans le compartiment digestif. C'est le message
   principal de l'outil — ajouter plus ne sert à rien et se paie.
4. Ajouter une prise redessine les courbes en moins de 200 ms.
5. Tout est utilisable au doigt sur un écran de 360 px.
6. Le mode sombre est complet, les graphiques restent lisibles.
7. Chaque graphique a son tableau de valeurs accessible au clavier.
8. Les cas limites ne cassent rien : durée nulle, masse extrême, ingestion
   massive, température négative, aucune prise.

### 3.6 Catalogue d'aliments — `assets/js/aliments.js`

Un agent IA est impossible sur un site statique (clé d'accès exposée, tout le
code est public). À la place, **une centaine d'aliments réellement consommés en
course à pied** (pas de marques, règle §4), chacun avec : glucides/100 g, rapport
glucose:fructose approximatif, eau, sodium, **synonymes de recherche**.

```js
{ id: 'bonbon-gelifie', nom: 'Bonbon gélifié',
  synonymes: ['haribo', 'fraise tagada', 'ourson', 'dragibus', 'bonbon'],
  glucidesPour100g: 77, ratio: [1, 0.9], sodiumMgPour100g: 25 }
```

Familles à couvrir : gel énergétique, boisson isotonique, pâte de fruits, barre
énergétique (valeurs typiques variables) ; compote à boire, banane, bonbon
gélifié, fruits secs (abricot/datte/raisin — mentionner les fibres), pain
d'épices, soda dégazé (**Ciqual**) ; pastille/capsule de sel (valeurs typiques) ;
eau plate.

Recherche textuelle locale sur `nom` + `synonymes`, hors ligne. Valeurs Ciqual
issues de la **table de l'ANSES — vérifiées, jamais inventées. Si une valeur
n'est pas vérifiable, ne pas l'écrire.** Aliment inconnu → « aucune information
sur les valeurs nutritionnelles de cet aliment » ; le catalogue doit être assez
complet pour que ce message reste rare.

---

## 4. Honnêteté scientifique — règles non négociables

- **Aucune affirmation chiffrée sans source vérifiable.** Si la source n'est pas
  certaine, la phrase ne s'écrit pas.
- **Ne jamais inventer une référence.** Pas de DOI plausible, pas d'auteur
  approximatif, pas d'année devinée. En cas de doute, demander à Antoine.
- **Pas de quota de mots.** Un texte court et juste vaut mieux qu'un texte long
  et flou. Le volume éditorial vient quand la matière existe.
- **Les fourchettes sont présentées comme des fourchettes.** La variabilité
  interindividuelle est réelle (taux de sudation, tolérance digestive) et doit
  être dite, pas lissée.
- Pas de superlatifs, pas de promesses de performance, **pas de marques
  commerciales** — on parle de familles de produits.
- **Aucun contenu incitant à la restriction alimentaire ou à la perte de poids.**
  Le site parle de nourrir l'effort, pas de contrôler un corps. Le poids apparaît
  parce qu'il détermine la dépense énergétique, traité de façon neutre, sans
  objectif chiffré ni jugement.
- Les urgences (coup de chaleur, hyponatrémie sévère, hypothermie) sont
  présentées comme des urgences nécessitant un secours, **jamais comme des
  paramètres à optimiser**.

### Avertissement, présent en pied de chaque page et en évidence sur le simulateur

> Ce site est un outil pédagogique. Les modèles présentés sont des approximations
> issues de la littérature scientifique et ne remplacent pas un avis médical ni
> l'accompagnement d'un diététicien du sport. La réponse individuelle varie
> fortement : teste toujours ta stratégie à l'entraînement, jamais le jour J.
> En cas de trouble digestif persistant, de malaise, ou de pathologie connue
> (diabète, troubles digestifs chroniques, troubles du comportement alimentaire,
> grossesse, traitement en cours), consulte un professionnel de santé.

---

## 5. Ton éditorial

Rigoureux mais accessible. Tutoiement. Phrases courtes. Analogies concrètes : le
glycogène comme deux réservoirs, l'intestin comme un tuyau à débit maximal.
Quand un terme technique est nécessaire (glycogène, osmolarité, SGLT1,
hypoperfusion splanchnique), il est défini à sa première apparition.

Public : coureurs amateurs et confirmés francophones, du premier 10 km à l'ultra.
Aucun prérequis scientifique, mais on ne prend jamais le lecteur pour un idiot.

Quatre personas de référence :
- **Léa, 32 ans**, premier marathon sur route — a « tapé dans le mur » au 32ᵉ km
  sans comprendre pourquoi. Scénario de référence du moteur : F, 60 kg,
  débutante, marathon en **4 h 45** sans apport → **mur musculaire** vers le
  km 33, hypoglycémie vers le km 25. Le « jambes vides au 32ᵉ » qu'elle raconte
  est le **mur musculaire**, pas l'hypoglycémie : deux défaillances distinctes,
  que le site nomme séparément. (Viser 4 h en débutante déclencherait
  `OBJECTIF_IRREALISTE` — l'allure n'est pas tenable, indépendamment de la
  nutrition.)
- **Marc, 45 ans**, ultra-traileur — vomit systématiquement après 8 h d'effort et
  ne supporte plus le sucré.
- **Yanis, 29 ans**, routard qui passe au trail — applique sa stratégie marathon
  sur un 60 km montagne et s'effondre.
- **Sofia, 27 ans**, coach — veut des schémas et des ordres de grandeur pour
  expliquer à ses athlètes.

Esthétique : sobre, technique, scientifique. L'allure d'un bon tableau de bord,
pas d'un site de compléments alimentaires. Beaucoup de blanc, hiérarchie forte,
corps de texte ≥ 17 px, largeur de ligne 65–75 caractères, chiffres tabulaires
pour les valeurs numériques. Aucune photo de banque d'images.

---

## 6. Méthode de travail avec Antoine

C'est un projet d'apprentissage autant qu'un site. La façon de travailler compte
autant que le résultat.

- **Proposer un plan avant de coder, et attendre la validation.** Toujours. Même
  pour une petite page.
- **Construire par petits incréments visibles.** Jamais trois cents lignes d'un
  coup. Antoine doit pouvoir ouvrir le fichier après chaque étape et comprendre
  ce qui a changé.
- **Expliquer au fur et à mesure**, en français, dans un langage accessible à
  quelqu'un qui découvre le développement web. Commenter le code généreusement,
  surtout dans `modele.js` : c'est lui qui porte la crédibilité scientifique.
- **Un commit par étape terminée.** Message en français à l'impératif :
  « Ajoute le calcul du coût énergétique », « Corrige le plafond d'absorption ».
- Après chaque étape significative, rappeler à Antoine de vérifier le rendu dans
  son navigateur avant de committer.
- Quand une décision engage la suite (structure de données, découpage de
  fichiers, choix d'interface), **la poser à Antoine plutôt que de trancher
  seul** — en expliquant l'alternative en deux lignes.

---

## 7. Sources vérifiées

Ces références existent et ont été contrôlées. `sources.html` ne contient
qu'elles, jusqu'à ce qu'Antoine en valide d'autres.

- **Rapoport B.I. (2010)**, *Metabolic Factors Limiting Performance in Marathon
  Runners*, PLOS Computational Biology 6(10) : e1000960.
  Modèle des réserves de glycogène, coût de 1 kcal/kg/km, courbe de crossover.
  https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1000960
- **Minetti A.E. et coll. (2002)**, *Energy cost of walking and running at
  extreme uphill and downhill slopes*, Journal of Applied Physiology 93(3).
  Polynôme du coût énergétique selon la pente.
- **Gatorade Sports Science Institute**, *Dietary Carbohydrate and the Endurance
  Athlete: Contemporary Perspectives*. Apports de 30 à 90 g/h et au-delà, ratios
  glucose-fructose, protocoles de recharge (8–12 g/kg/j).
  https://www.gssiweb.org/sports-science-exchange/article/dietary-carbohydrate-and-the-endurance-athlete-contemporary-perspectives
- **Sports Dietitians Australia & Ultra Sports Science Foundation (2025)**,
  position statement sur les troubles digestifs à l'effort, Sports Medicine.
  Hypoperfusion splanchnique, contraintes mécaniques, entraînement intestinal,
  FODMAP. https://link.springer.com/article/10.1007/s40279-025-02186-6
- **Romijn J.A. et coll. (1993)**, *Regulation of endogenous fat and carbohydrate
  metabolism in relation to exercise intensity and duration*, American Journal of
  Physiology. Points d'ancrage de la courbe glucides/lipides.
- **Du Bois D. & Du Bois E.F. (1916)**, *A formula to estimate the approximate
  surface area if height and weight be known*, Archives of Internal Medicine.
  Formule de surface corporelle utilisée dans le modèle de sudation.
- **ACSM's Guidelines for Exercise Testing and Prescription**, American College
  of Sports Medicine — équations métaboliques (VO₂ = 3,5 + 0,2·v pour la course
  à plat, v en m/min). Sert à déduire le % de VO₂max depuis l'allure visée.
  Vérification accessible et discussion de ses limites (surestimation de ~15 %
  chez les athlètes) : **Koutlianos N. et coll. (2013)**, *Indirect estimation
  of VO2max in athletes by ACSM's equation: valid or not?*, Hippokratia
  17(2):136-140. https://www.hippokratia.gr/images/PDF/17-2/Hippokratia_2_2013_136.pdf
- **Gatorade Sports Science Institute — SSE-161**, *Fluid and Electrolyte Needs
  for Training, Competition, and Recovery*. Fourchettes de taux de sudation
  (0,5–2,0 L/h), concentration en sodium de la sueur (10–90 mmol/L), conversion.
- **ANSES — table Ciqual** de composition nutritionnelle des aliments.
  Glucides, eau et sodium des familles d'aliments de `aliments.js`.
  https://ciqual.anses.fr
- **Billat V.L. & Koralsztein J.P. (1996)**, revue sur la vitesse à VO₂max et le
  temps d'épuisement à cette vitesse, *Sports Medicine*. Citée par
  `docs/spec-etape5.md` pour justifier l'estimation de la VMA par un test de
  6 minutes (demi-Cooper) ; variabilité individuelle importante (CV ≈ 25 %).
  **Référence à vérifier au moment de la rédaction de `sources.html`** (volume,
  pages, titre exact) — ne pas la publier avant contrôle.

---

## 8. Hors périmètre

À ne pas construire, mais à ne pas rendre impossible par l'architecture :
comptes utilisateurs, back-end, import GPX, connexion Strava ou Garmin, base de
données de courses réelles, suivi longitudinal, application mobile, version
anglaise, autres disciplines d'endurance.

**Note d'architecture** : l'ajout d'une troisième discipline doit rester possible
sans réécriture. La discipline est un paramètre du moteur, pas un booléen
route/trail.
