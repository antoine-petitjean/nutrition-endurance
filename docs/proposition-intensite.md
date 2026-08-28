# Proposition — déduire l'intensité (% VO₂max) de l'allure visée

> Statut : **proposition, non implémentée.** À valider par Antoine avant de coder.
> Contexte : phase 1 du simulateur (mode route). Voir `CLAUDE.md` §3.2 (moteur)
> et §3.3–3.4 (interface, quatre blocs).

## 1. Le besoin

Le moteur (`assets/js/modele.js`) a besoin d'un paramètre `intensitePctVO2max`.
Il pilote deux choses :

- `fractionGlucides()` — la part de l'énergie fournie par les glucides plutôt
  que les lipides (courbe de crossover, quadratique calée sur Romijn 1993) ;
- `facteurVidangeGastrique()` — au-delà de ~75 % de VO₂max, la vidange
  gastrique ralentit.

Aujourd'hui l'utilisateur saisit ce pourcentage à la main. La nouvelle structure
de page (`CLAUDE.md` §3.3–3.4, bloc 2) le **retire de la saisie** : il doit être
**déduit** de l'allure visée (déjà connue via distance + temps) et du **niveau**
du coureur, puis affiché en langage humain.

Pourquoi on ne peut pas se contenter de l'allure absolue : à 12 km/h, un coureur
élite tourne à ~55 % de VO₂max, un débutant à ~90 %. L'intensité **relative**,
c'est l'allure rapportée à la capacité individuelle. Il faut donc estimer cette
capacité — la **VMA** (vitesse maximale aérobie, la vitesse à laquelle le coureur
atteint sa consommation maximale d'oxygène).

## 2. Méthode recommandée : allure ÷ VMA, forme ACSM

```
vitesseCibleMMin = (distanceKm × 1000) / tempsVisePmin        // déjà calculé côté interface

VMA_mmin = (vmaConnueKmh ?? VMA_DEFAUT_PAR_NIVEAU[niveau]) × 1000 / 60

vo2Demande = 3.5 + 0.2 × vitesseCibleMMin      // ml/kg/min — équation ACSM course à plat
vo2Max     = 3.5 + 0.2 × VMA_mmin              // ml/kg/min
pctVO2max  = borner(100 × vo2Demande / vo2Max, 50, 95)
```

- `3.5` = consommation d'O₂ de repos (ml/kg/min). `0.2` = coût en O₂ par m/min de
  course à plat. Ce sont les **équations métaboliques ACSM**, standard en
  physiologie de l'exercice.
- Le `borner(…, 50, 95)` reprend les bornes de `PLAGES.intensitePctVO2max`.

### Constante à ajouter dans `constantes.js`

```
VMA_DEFAUT_PAR_NIVEAU (km/h) = { debutant: 13, regulier: 15, confirme: 17, elite: 19.5 }
  // HYPOTHÈSE DE MODÉLISATION — pas de source unique, ordres de grandeur du
  // coaching amateur. Fourchettes de plausibilité :
  //   debutant 11–14 · regulier 14–16 · confirme 16–18.5 · elite 18.5–21
```

### Champ optionnel « VMA connue (km/h) » dans le bloc 2

Déjà prévu par la vision (`docs/vision-complete.md` §9.1 : « VMA ou allure de
référence — optionnel, améliore la précision »). S'il est rempli, il remplace la
valeur du niveau. Ceux qui connaissent leur VMA gagnent en précision ; les autres
n'ont rien à saisir de plus.

## 3. Alternative écartée : courbe « % VO₂max selon la durée »

On pourrait poser directement `pctVO2max = f(dureeMin)` avec des points d'ancrage
connus (8 min → ~100 %, 30 min → ~92 %, semi → ~85 %, marathon → ~76 %, ultra →
~68 %). Ça donnerait le défaut du `CLAUDE.md` (75 % pour un marathon) sans rien
d'autre.

**Pourquoi on l'écarte :** cette courbe suppose que le coureur va *au maximum de
ce qu'il peut tenir* pour cette durée. C'est faux dès qu'on sort du cas « course
à fond » :

- un débutant qui vise 5 h au marathon n'est pas à 76 %, il est à ~85 % ;
- un coureur solide en sortie longue tranquille de 3 h est à ~60 %.

La forme *allure ÷ VMA* gère les deux : allure lente → pourcentage bas, allure
rapide → pourcentage haut.

## 4. Contrôles de la méthode recommandée

| Cas | VMA (km/h) | allure | → % VO₂max |
|---|---|---|---|
| Marathon 3 h 30, `regulier` | 15 | 12,05 km/h | **77 %** (≈ défaut CLAUDE.md) |
| Marathon 5 h 00, `debutant` | 13 | 8,44 km/h | **67 %** |
| Marathon 2 h 50, `confirme` | 17 | 14,89 km/h | **88 %** |
| 10 km en 40 min, `regulier` | 15 | 15,0 km/h | 100 % → **borné à 95 %** |
| Semi 1 h 45, `regulier` | 15 | 12,06 km/h | 77 % |
| Semi 1 h 30, `confirme` | 17 | 14,07 km/h | 84 % |

Le cas « marathon 2 h 50 en `confirme` » sort à 88 % : c'est très agressif pour un
marathon, ce qui traduit surtout qu'un coureur capable de 2 h 50 a en réalité une
VMA plutôt de ~18,5 que de 17. → c'est exactement le rôle du champ « VMA connue ».

## 5. Affichage en langage humain (côté interface)

`pctVO2max` est converti en phrase, affichée **à côté du chiffre** (« ≈ 77 % de
VO₂max ») :

| % VO₂max | Phrase |
|---|---|
| < 60 | « allure très facile — tu tiens une conversation » |
| 60–70 | « endurance fondamentale — tu parles par phrases » |
| 70–80 | « allure marathon / tempo — trois mots à la fois » |
| 80–88 | « allure semi / seuil — un mot ou deux » |
| > 88 | « allure 10 km ou plus vif — parler devient difficile » |

Cette correspondance est **pédagogique et approximative** : la sensation varie
d'un coureur à l'autre. Le texte le dira.

## 6. Découpage technique

- `deduireIntensitePctVO2max({ vitesseMMin, niveau, vmaConnueKmh })` → fonction
  **pure** dans `modele.js`, avec ses tests dans `tests/modele.test.js`.
- L'interface (`simulateur.js`) l'appelle, place le résultat dans
  `course.intensitePctVO2max`, puis appelle `simuler()`. **Le contrat de
  `simuler()` ne change pas.**
- La phrase de sensation vit dans `simulateur.js` (comme les phrases de
  diagnostic : le moteur reste sans langue).

## 7. Limites connues (à documenter dans le code et `sources.html`)

1. La forme ACSM **surestime légèrement vers le haut** : au voisinage de VO₂max,
   la consommation d'O₂ plafonne alors que l'allure continue de monter. Le
   `borner(…, 95)` absorbe ce biais (cas « 10 km à VMA » ci-dessus).
2. `VMA_DEFAUT_PAR_NIVEAU` est une hypothèse large. Le champ « VMA connue » est la
   vraie porte de sortie pour qui veut de la précision.
3. L'équation ACSM est calée sur du plat. Cohérent avec la phase 1 (mode route,
   plat). En phase 3 (trail), l'intensité relative devra tenir compte de la pente.

## 8. Décisions attendues d'Antoine

1. **Source de l'équation ACSM** (`vo2 = 3.5 + 0.2·v`). Elle n'est pas dans les 5
   références vérifiées du `CLAUDE.md` §7. Deux options :
   a. l'ajouter comme source vérifiée (« ACSM's Guidelines for Exercise Testing
      and Prescription », American College of Sports Medicine) ;
   b. marquer `0.2` et `3.5` en `// HYPOTHÈSE DE MODÉLISATION` avec la note
      « équation métabolique standard ACSM ».
2. **Valeurs de `VMA_DEFAUT_PAR_NIVEAU`** : 13 / 15 / 17 / 19,5 km/h — validées ou
   à ajuster ?
3. **Champ optionnel « VMA connue »** dans le bloc 2 : on l'ajoute ?
4. **Bornes d'affichage des phrases de sensation** (60 / 70 / 80 / 88) : OK ou à
   revoir ?
