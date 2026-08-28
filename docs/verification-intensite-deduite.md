# Vérification — intensité déduite : un scénario de référence bouge de 6,7 km

> Statut : **arrêt demandé.** L'étape 4 (déduction de l'intensité) est codée mais
> **non commitée**. Un des quatre scénarios de référence se déplace de plus de
> 2 km avec l'intensité déduite au lieu de saisie. Consigne d'Antoine : s'arrêter
> et lui signaler, ne jamais rattraper l'écart en ajustant une constante
> physiologique.

## Ce qui est en place (working tree, non commité)

- `constantes.js` : bloc `INTENSITE` (équation ACSM `3.5 + 0.2·v`,
  `VMA_DEFAUT_PAR_NIVEAU_KMH = { debutant: 13, regulier: 16, confirme: 18, elite: 20.5 }`),
  `PLAGES.vmaConnueKmh = [8, 25]`.
- `modele.js` : fonction pure `deduireIntensitePctVO2max({ vitesseMMin, niveau, vmaConnueKmh })`,
  forme rapport, commentaire justifiant via Koutlianos 2013.
- `CLAUDE.md` §7 + `sources.html` : source ACSM + Koutlianos ajoutée ; limite
  connue n°1 (surestimation ACSM) mise à jour — atténuée par la forme rapport.
- Tests : **pas encore écrits** (en attente de la décision ci-dessous).

## Table de contrôle (calculée, pas recopiée)

Toutes les valeurs d'Antoine sont reproduites :

| Cas | attendu | obtenu |
|---|---|---|
| marathon 3 h 30, `regulier` | 77 % | 76,9 % |
| marathon 5 h 00, `debutant` | 68 % | 67,5 % |
| marathon 2 h 50, `confirme` | 84 % | 83,7 % |
| marathon 2 h 20, `elite` | 89 % | 88,8 % |
| semi 1 h 30, `confirme` | 79 % | 79,3 % |

## Scénarios de référence : intensité saisie → intensité déduite

| Scénario | intensité | 1ʳᵉ défaillance | Δ |
|---|---|---|---|
| 1. marathon 70 kg régulier, sans apport | 75 % → **76,9 %** | km 21,1 → km 20,3 | **−0,8 km** ✅ |
| 2. idem + 60 g/h | 75 % → 76,9 % | aucune → aucune (foie 69 % → 60 %, tient) | ✅ |
| 3. idem + 150 g/h | 75 % → 76,9 % | aucune ; absorption plafonnée à 90 g/h, `SURPLUS_DIGESTIF` | ✅ |
| 4. **Léa** — F 60 kg débutante, marathon 4 h, sans apport | 70 % → **82,6 %** | km 26,4 → **km 19,7** | **−6,7 km** ❌ |

Les scénarios 1 à 3 tiennent. **Le scénario 4 dépasse largement le seuil de 2 km.**

## Pourquoi Léa bouge autant

Léa vise un marathon en **4 h** (10,55 km/h) en tant que débutante, VMA par
défaut 13 km/h. Elle court donc à **81 % de son allure VMA**, ce que l'équation
ACSM traduit en **≈ 82,6 % de VO₂max**.

Le « 70 % » du scénario d'origine était une estimation à la main, trop basse pour
cette combinaison allure/niveau. À 82,6 % au lieu de 70 %, `f_CHO` passe de 0,59 à
0,84 (+43 % de demande glucidique) : le foie se vide bien plus tôt, la
défaillance recule de la moitié de la course.

Lecture possible : le modèle dit qu'**une débutante qui vise sub-4 h court au
seuil** — ce qui est peut-être *la vraie raison* de son mur. Mais c'est un tableau
plus dur que le « mur au km 32 » cité jusqu'ici dans les personas.

## Décision attendue d'Antoine (ne rien coder d'ici là)

1. **Accepter la déduction.** Elle est plus honnête. Il faut alors mettre à jour
   l'attendu de la persona Léa (défaillance ~km 20, pas km 32) et toute copie
   éditoriale qui cite « le 32ᵉ km ».
2. **Revoir la VMA par défaut `debutant`.** Une débutante capable de *viser* 4 h a
   sans doute une VMA de 14–15 plutôt que 13. Mais relever 13 → 15 juste pour que
   Léa retombe sur ses pieds serait « rattraper un écart en ajustant une
   constante » — à ne faire que si la constante est jugée fausse en elle-même.
3. **Ralentir la cible de Léa** (ex. 4 h 30). Une vraie première marathonienne
   débutante vise rarement sub-4. À 4 h 30 la déduction donne ≈ 74 % et le mur
   revient vers le km 30.
4. **Donner à Léa une `vmaConnueKmh` explicite** dans la définition du scénario.

Je reprends dès que tu as tranché. Étape 5 (refonte de la page) ensuite.
