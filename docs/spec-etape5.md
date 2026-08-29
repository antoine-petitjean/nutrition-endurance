# Spécification de l'étape 5 — refonte du simulateur en cinq blocs

> Validée par Antoine. Remplace la structure en quatre blocs de `CLAUDE.md` §3.3–3.4,
> qui doit être mise à jour en conséquence avant de coder.

## Principe directeur

**Le simulateur est un outil de PRÉPARATION, pas du jour J.** On l'ouvre dès
l'inscription à une course, des semaines ou des mois avant. Tout ce qu'on ne peut pas
savoir si tôt — dernier repas, recharge glucidique, entraînement intestinal — disparaît
de la saisie et prend une valeur par défaut. Ces leviers reviendront dans deux sections
ultérieures : « Les jours qui précèdent » et « Le jour J ».

---

## BLOC 1 — Qui tu es

Quatre champs seulement, persistés en localStorage avec version de schéma.

| Champ | Plage | Rôle dans le moteur |
|---|---|---|
| Sexe | H / F | fraction de masse musculaire (0.45 / 0.36) |
| Taille | 140–210 cm | surface corporelle Du Bois → échange thermique |
| Masse corporelle | 40–120 kg | coût énergétique et taille des réserves |
| Niveau | débutant / régulier / confirmé / élite | densité de glycogène, VMA de repli |

**Supprimé :** l'âge (il n'agissait sur rien).

**Passés en valeur par défaut, non demandés :** recharge glucidique = `non`,
petit-déjeuner = `pris`, entraînement intestinal = `occasionnel` (plafond 90 g/h),
sueur salée = `moyen`. Le moteur les utilise toujours ; l'interface ne les demande plus.

Libellés explicites du niveau, à afficher :
- **débutant** — moins de 2 sorties par semaine, ou moins d'un an de pratique
- **régulier** — 3 à 4 sorties par semaine depuis plus d'un an
- **confirmé** — 5 sorties ou plus, avec du travail de vitesse
- **élite** — compétiteur, volume élevé toute l'année

---

## BLOC 2 — Ta course

| Champ | Plage |
|---|---|
| Distance | 5–100 km, raccourcis 10 km / semi / marathon |
| Temps visé | ↔ allure au km, les deux affichés côte à côte |

---

## BLOC 3 — Ta capacité, et le verdict

| Champ | Statut |
|---|---|
| VMA connue (km/h) | optionnel, 8–25 — source la plus fiable |
| Performance récente | optionnel, distance + temps — seconde source |

Encadré dépliable « je ne connais pas ma VMA » avec le test de demi-Cooper :
courir la plus grande distance possible en 6 minutes, diviser par 100.
Justification sourcée [Billat & Koralsztein 1996] et limite (CV ≈ 25 %).

### Sorties du bloc

- **VMA retenue**, toujours affichée, avec sa provenance : précision élevée / bonne /
  approximative. Modifiable à la main.
- **Effort demandé** — libellé validé, remplace « intensité ». Formulation :
  « cette allure te demande **77 % de ta capacité maximale** — allure marathon, tu peux
  dire trois mots mais pas une phrase ». Le terme VO₂max n'apparaît que dans le
  « pourquoi ce chiffre ? ».
- **Verdict** : « Cet objectif tient : tu serais à 76,9 % de tes capacités, pour un
  maximum tenable de 80,5 % sur cette durée. »
- Diagnostics `OBJECTIF_IRREALISTE` et `OBJECTIF_TRES_EN_DECA`, avec le pourcentage
  BRUT et un lien vers le champ à corriger.

**Jamais affiché : une VO₂max estimée en ml/kg/min.**

---

## BLOC 4 — Ce que ta course va coûter

### Saisies de contexte

| Champ | Rôle |
|---|---|
| Date | croisée au lieu → normale saisonnière de température |
| Lieu | liste embarquée d'environ 100 villes françaises, **pas de saisie manuelle de température** |
| Heure de départ | température à l'heure du départ, ET son évolution pendant la course |

Les normales fournissent un minimum et un maximum mensuels. On en déduit la température
heure par heure (minimum au lever du jour, maximum en milieu d'après-midi —
`// HYPOTHÈSE DE MODÉLISATION` sur la forme de la courbe). Le moteur tournant à la
minute, la température **évolue pendant l'épreuve**.

Affichage obligatoire : « ce n'est pas une prévision, c'est la moyenne observée à cet
endroit à cette période », avec la fourchette inter-annuelle. Un curseur permet de
rejouer la course à une autre température.

**Aucun appel réseau** : normales embarquées dans le dépôt.

### La phrase centrale

> **Tu vas brûler 549 g de glucides. Tu en as 436 en réserve.**

Chaque moitié se déplie :

**Pourquoi 549 g**
1. 70 kg × 42,195 km × 1 kcal/kg/km = 2 954 kcal
2. + dérive de l'économie de course (jusqu'à +5 % après 3 h) = 3 038 kcal
3. à 77 % de la capacité, part glucidique 72 % → 2 197 kcal
4. ÷ 4 kcal/g = **549 g**

**Pourquoi 436 g**
- Muscle : 70 × 0,45 × 0,50 = 15,75 kg × 140 mmol/kg × 0,162 = **357 g**
- Foie : 1,8 kg × 270 mmol/kg × 0,162 = **79 g**
- Conclusion à afficher : *il te manque 113 g, soit un peu plus de deux heures d'avance.*

### ⚠ Correction à apporter au moteur

Le moteur expose aujourd'hui `glucidesOxydesG` = **428 g**, qui est ce qui est
RÉELLEMENT brûlé sans ravitaillement — moins que la demande, parce que l'hypoglycémie
au km 20 empêche de tenir l'allure.

**C'est la DEMANDE (549 g) qu'il faut afficher**, pas le réalisé. Sinon le chiffre
baisse à mesure que la course se passe mal, ce qui est un contresens.
→ Ajouter `glucidesDemandeG` à la synthèse, calculé sur l'allure cible indépendamment
de ce qui est couvert. Ajouter un test.

### Les quatre chiffres

Libellés validés, au futur :

| Libellé | Valeur de référence |
|---|---|
| Ce que ça va te coûter | 3 038 kcal |
| Glucides que tu vas brûler | 549 g |
| Eau que tu vas perdre | 1,87 L — soit 2,7 % de ta masse |
| Sel que tu vas perdre | 1 719 mg |

**Les lipides sont retirés de l'affichage.** Même un coureur très sec a de quoi courir
plusieurs jours sur ses réserves de graisse ; les montrer laisserait croire qu'il faut
en manger.

### Le graphique

Axe temporel, **un nutriment à la fois**, onglets pour naviguer : glycogène musculaire,
glycogène hépatique, eau, sodium. Annotations aux moments qui comptent (« km 20,3 : le
foie est vide, hypoglycémie »). Tableau de valeurs repliable, accessible au clavier.

---

## BLOC 5 — Comment le couvrir

### Objectif de la stratégie proposée

**Tenir la même allure du départ à l'arrivée.** Le plan n'est pas dimensionné pour
« éviter le mur de justesse » mais pour que `fractionAllureTenable` reste à 1,0 sur
toute la course : ni hypoglycémie, ni épuisement musculaire, à aucun kilomètre. Une
marge résiduelle subsiste à l'arrivée et doit être affichée.

**Si aucune stratégie n'y suffit** (objectif ambitieux, forte chaleur), le site
l'annonce franchement : « même à 90 g/h, tu seras en déficit d'environ 150 g sur la
fin. » Il n'édulcore pas, et il ne conseille pas de courir moins vite — il informe.

### Choix des produits

Choix multiple (plusieurs cases cochables) parmi les familles ci-dessous, plus une case
**« autre »** ouvrant un champ de texte libre.

Pour chaque famille cochée, saisie du grammage : champ libre, raccourcis
**20 / 25 / 30 / 40 / 50 / 60 g**, fourchette usuelle annoncée (20 à 60 g selon les
produits, les plus concentrés étant les gels dits « haute teneur »), et invitation à
lire l'étiquette. Aucune marque n'est citée.

Note à afficher : un gel de 60 g avalé d'un coup est une charge osmotique lourde — la
courbe du contenu digestif doit le rendre visible.

### Catalogue d'aliments — `assets/js/aliments.js`

Environ une centaine d'aliments **réellement consommés en course à pied**. Pour chacun :
glucides pour 100 g, rapport glucose/fructose approximatif, eau, sodium, synonymes de
recherche.

Familles à couvrir :

| Famille | Statut des valeurs |
|---|---|
| Gel énergétique | valeurs typiques, variables — saisie utilisateur |
| Boisson isotonique | valeurs typiques, variables — saisie utilisateur |
| Pâte de fruits énergétique | valeurs typiques, variables |
| Barre énergétique | valeurs typiques, variables |
| Compote à boire | Ciqual |
| Banane | Ciqual |
| Bonbon gélifié | Ciqual |
| Fruits secs (abricot, datte, raisin) | Ciqual — mentionner les fibres |
| Pain d'épices | Ciqual |
| Soda dégazé | Ciqual |
| Pastille ou capsule de sel | valeurs typiques |
| Eau plate | — |

Valeurs issues de la table **Ciqual de l'ANSES**. **Vérifie-les, ne les invente pas.**
Si une valeur n'est pas vérifiable, ne l'écris pas.

Aliment inconnu → « aucune information sur les valeurs nutritionnelles de cet aliment ».
Le catalogue doit être assez complet pour que ce message reste rare.

Aucun serveur, aucune IA en ligne : recherche textuelle locale sur nom + synonymes.

### Sorties du bloc

- **Le tableau de course**, qui est le livrable : « un gel de 45 g tous les 7,2 km —
  km 7,2 / 14,4 / 21,6… ». Il change quand le grammage change.
- **Le second graphique**, avec **la courbe fantôme du scénario sans ravitaillement en
  permanence**, en trait léger. C'est la comparaison qui rend l'effet de chaque prise
  lisible.

### Deux renvois

- **Les risques si tu manges trop** — page à écrire. La courbe du surplus digestif reste
  sur le simulateur : c'est le message principal de l'outil.
- **Les jours qui précèdent** — recharge glucidique, entraînement intestinal. Cette page
  pourra rejouer la simulation avec ces leviers activés.

---

## Découpage du travail

- **5a** — blocs 1, 2 et 3, avec les explications « pourquoi ça compte ? » sur chaque
  champ, le design system (thèmes clair et sombre, mobile d'abord, corps ≥ 17 px), et le
  verdict. **S'arrêter là pour relecture.**
- **5b** — bloc 4 : normales de température, correction `glucidesDemandeG`, les quatre
  chiffres, le premier graphique SVG.
- **5c** — bloc 5 : stratégies, catalogue d'aliments, tableau de course, second
  graphique avec courbe fantôme.

Un commit par étape. Mettre `CLAUDE.md` à jour avant de commencer.

---

## Précautions d'architecture — à respecter dès 5a

Trois décisions qui ne coûtent presque rien maintenant et qui, si elles ne sont pas
prises tout de suite, deviendront des reprises lourdes en phase 2 et 3.

### 1. Un seul objet d'état, sérialisable

Tout l'état du simulateur (profil, course, capacité, contexte, stratégie) vit dans **un
objet unique** dont la forme est documentée en tête de `simulateur.js`. Aucun composant
ne lit ni n'écrit ailleurs, et aucune valeur ne survit uniquement dans un champ du DOM.

L'objet ne contient que des données — pas de fonctions, pas de références au DOM — de
sorte qu'il puisse être converti en JSON tel quel.

Deux bénéfices futurs, tous deux impossibles à obtenir après coup sans réécriture :
- **le partage par URL** d'un scénario complet devient un ajout de quelques lignes ;
- **l'ajout du champ `discipline`** (route / trail) en phase 3 devient trivial, alors
  que greffer un commutateur global sur une interface éparpillée serait une reprise
  sérieuse.

Le profil persisté en localStorage est un sous-ensemble de cet objet, avec son numéro de
version de schéma.

### 2. Un module partagé pour tout ce qui se répète entre pages

Sans étape de compilation, chaque fichier HTML porte sa propre copie de l'en-tête, du
menu, du pied de page et de l'avertissement. À trois pages c'est indolore ; à quarante,
ajouter une entrée de menu voudrait dire modifier quarante fichiers.

Donc : `assets/js/commun.js`, qui **génère** la navigation, le pied de page et
l'avertissement à partir d'une seule définition, injectés dans des conteneurs vides.
Chaque page HTML ne contient que son contenu propre.

Si cette discipline n'est pas prise dès la première page, elle ne sera jamais rattrapée.

### 3. Le squelette de page est rigoureusement identique partout

Même ordre de balises, mêmes conteneurs, mêmes noms de classes structurelles. Une page
nouvelle se crée en copiant le squelette, jamais en l'improvisant.

### Limite acceptée

Les textes sont écrits en dur en français dans les fichiers HTML. Une version anglaise
supposerait de tout dupliquer. C'est hors périmètre et l'architecture le rend
effectivement coûteux — c'est un choix assumé, pas un oubli.

---

# ÉTAPE 6 — Le laboratoire

> Page séparée, `laboratoire.html`. À construire **après 5c**, car elle réutilise le
> code de graphique et le catalogue d'aliments. Idée d'Antoine.

## Pourquoi cette page

Le message central du site — « au-delà du plafond d'absorption, manger plus ne sert à
rien et se paie » — est aujourd'hui **affirmé** par le texte. Ici, il est **découvert par
le lecteur**.

Quelqu'un qui rate un ravitaillement, en pose deux pour rattraper, et constate de ses
yeux que la courbe de glycogène ne remonte pas davantage pendant que le stock digestif
enfle : celui-là a compris définitivement. Aucun paragraphe n'obtient ce résultat.

C'est aussi la page qui répond à la deuxième question d'Antoine : peut-on varier les
aliments tout en gardant l'apport glucidique nécessaire ?

## Positionnement

Page distincte, **hors du parcours guidé**. Le bloc 5 du simulateur donne *un plan* ; le
laboratoire donne *une expérience*. Les mélanger casserait le cheminement
comprendre → agir.

Lien depuis le bloc 5 : « expérimenter avec ce plan ». La page **hérite du scénario en
cours** via l'objet d'état unique (voir Précautions d'architecture §1) : profil, course,
capacité, contexte et stratégie sont déjà chargés à l'arrivée.

## Le graphique — trois courbes SIMULTANÉES

Contrairement au bloc 4 qui affiche un nutriment à la fois, le laboratoire superpose
obligatoirement :

1. **le glycogène restant** — qui ne remonte pas plus qu'au plafond ;
2. **le contenu digestif en attente** — qui enfle quand on dépasse ;
3. **le débit d'absorption**, avec sa **ligne de plafond** — qui reste plate.

C'est la simultanéité qui enseigne. Prise isolément, aucune des trois ne raconte
l'histoire. La courbe fantôme du plan initial reste affichée en trait léger, pour
mesurer l'écart avec ce qu'on est en train de construire.

## Interaction — en deux temps

**Version 1 (à construire) : pose au clic.**
- Le catalogue d'aliments est présenté sur le côté. On sélectionne un aliment, on clique
  sur l'axe temporel pour le poser.
- Une **liste éditable** à côté du graphique reprend toutes les prises : instant,
  aliment, quantité. Modifiable et supprimable ligne par ligne.
- Recalcul et redessin en moins de 200 ms.

**Version 2 (plus tard, si le besoin se confirme) : glisser-déposer.**

Raison de ce découpage : le glisser-déposer est l'interface la plus difficile du projet,
particulièrement au doigt sur 360 px et vis-à-vis de la contrainte d'accessibilité
clavier (WCAG 2.1 AA), où il est notoirement mauvais. Or la leçon ne dépend pas du
glisser : elle dépend de la facilité à ajouter, déplacer, retirer une prise et de
l'immédiateté du résultat. La version 1 apporte l'essentiel de la valeur pour une
fraction du travail.

**Quelle que soit la version, toute action doit avoir un équivalent clavier** :
sélectionner un aliment, se déplacer sur l'axe temporel aux flèches, valider par Entrée,
supprimer par Suppr.

## Situations pré-chargées — le vrai levier pédagogique

Des boutons qui chargent un cas d'un seul clic, avant toute exploration libre :

- **« J'ai oublié un gel au km 15 »**
- **« Je compense avec deux gels d'un coup »** — la situation qui démontre le plafond
- **« Je prends tout au départ »**
- **« Rien avant le semi, puis je me rattrape »**
- **« Je varie les aliments à apport égal »** — répond à la question de la variété
- **« Le plan idéal »** — le retour au plan calculé par le bloc 5

Chaque situation s'accompagne d'une phrase qui dit ce qu'il faut regarder, et d'une
phrase qui dit ce qui s'est passé, générées depuis les diagnostics du moteur.

## Garde-fou

Cette page ne doit pas devenir un jeu d'optimisation au gramme près. Le modèle est
déterministe, la réponse individuelle ne l'est pas. Mention permanente à l'écran :

> Ce laboratoire sert à comprendre la *forme* de la réponse de ton corps, pas à trouver
> un plan optimal au gramme près. Deux coureurs identiques sur le papier ne réagissent
> pas de la même façon — teste toujours ta stratégie à l'entraînement.

## Découpage

- **6a** — la page, le graphique à trois courbes, la pose au clic et la liste éditable
- **6b** — les situations pré-chargées et leurs commentaires générés
- **6c** — le glisser-déposer, seulement si le besoin se confirme à l'usage
