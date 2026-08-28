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

---

## 3. PHASE 1 — Le simulateur (mode route)

### 3.1 Fichiers à produire

```
index.html                  Accueil minimal : le propos, un lien vers le simulateur
simulateur.html             La page de l'outil
sources.html                Bibliographie — uniquement des références vérifiées
assets/css/style.css        Design system : variables CSS, thèmes clair/sombre
assets/js/constantes.js     TOUTES les constantes physiologiques, sourcées
assets/js/modele.js         Le moteur. Aucune référence au DOM.
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

### 3.3 Entrées de l'interface

**Profil coureur** (persisté en `localStorage`, avec un numéro de version de
schéma pour pouvoir migrer plus tard) :

| Paramètre | Plage | Défaut |
|---|---|---|
| Sexe | H / F | — |
| Âge | 15–80 ans | 35 |
| Taille | 140–210 cm | 175 |
| Masse corporelle | 40–120 kg | 70 |
| Niveau | débutant / régulier / confirmé / élite | régulier |
| Recharge glucidique | non / partielle / complète | non |
| Entraînement intestinal | jamais / occasionnel / régulier | occasionnel |
| Petit-déjeuner pris | oui / non | oui |

**Course** :

| Paramètre | Plage | Défaut |
|---|---|---|
| Distance | 5–100 km, avec raccourcis 10 km / semi / marathon | 42.195 |
| Temps visé **ou** allure | l'un déduit l'autre | 3 h 30 |
| Intensité | 50–95 % VO₂max, avec équivalences en ressenti | 75 |
| Température | −5 à 40 °C | 15 |

**Plan de ravitaillement** : une liste de prises. Chaque prise = instant (min),
quantité de glucides (g), type (glucose seul / glucose-fructose), volume d'eau
associé (ml). Ajout, modification, suppression. Un bouton « plan automatique »
qui propose une stratégie cohérente, ensuite modifiable à la main.

### 3.4 Sorties

Deux graphiques SVG synchronisés sur un axe temporel commun, avec un curseur
partagé affichant toutes les valeurs à l'instant survolé.

**Graphique 1 — Réserves de glycogène**
- Aire empilée : glycogène musculaire et hépatique restants, en grammes et en %
  du stock initial
- Zones de fond : verte au-dessus de 40 %, orange de 20 à 40 % (« la baisse
  devient perceptible »), rouge sous 20 % (« zone du mur »)
- **Courbe fantôme permanente du scénario sans ravitaillement** — c'est la
  comparaison qui rend l'effet des prises lisible
- Marqueur vertical à chaque prise, avec l'inflexion visible immédiatement
- Annotation automatique du point de rupture : « sans apport, mur estimé au
  km 31, à 2 h 47 »

**Graphique 2 — Glucides**
- Trois courbes : quantité ingérée, absorption effective, ligne de plafond
- Aire du contenu digestif en attente, avec zone d'alerte

**Bandeau de synthèse** : dépense totale, glucides ingérés vs absorbés vs
oxydés, verdict en une phrase, et trois conseils d'ajustement priorisés.

**Chaque chiffre affiché a un bouton « pourquoi ce chiffre ? »** qui déplie le
calcul et les hypothèses. Aucun résultat ne tombe du ciel.

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
  sans comprendre pourquoi.
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

---

## 8. Hors périmètre

À ne pas construire, mais à ne pas rendre impossible par l'architecture :
comptes utilisateurs, back-end, import GPX, connexion Strava ou Garmin, base de
données de courses réelles, suivi longitudinal, application mobile, version
anglaise, autres disciplines d'endurance.

**Note d'architecture** : l'ajout d'une troisième discipline doit rester possible
sans réécriture. La discipline est un paramètre du moteur, pas un booléen
route/trail.
