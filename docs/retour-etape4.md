# Retour sur la proposition d'intensité — à traiter au retour

> Réponse au fichier `docs/verification-intensite-deduite.md`.
> Statut : décision prise par Antoine. À appliquer avant l'étape 5.

Excellent réflexe de t'être arrêté et d'avoir refusé d'ajuster une constante.
Mais aucune de tes quatre options : le modèle a raison, et il détecte autre chose
que ce que tu crois.

## Le fait central

La fraction de VO₂max soutenable décroît avec la durée : environ 88 % sur 1 h,
80 % sur 3 h, 72 % sur 4 h. **Personne ne tient 82,6 % pendant quatre heures.**
Ce n'est pas un scénario difficile, c'est un scénario impossible.

Le modèle ne s'est donc pas trompé : il a détecté que « débutante, VMA 13,
marathon en 4 h » est incohérent. Ne touche pas à `VMA_DEFAUT debutant = 13`,
qui est cohérent par ailleurs (marathon en 5 h → 67,5 %).

Léa testée à différentes cibles, avec l'intensité déduite :

| Cible | % VO₂max | Hypoglycémie | Mur musculaire |
|---|---|---|---|
| 4 h 00 | 82,6 % | km 19,7 | km 22,0 |
| 4 h 30 | 74,2 % | km 23,1 | km 28,9 |
| **4 h 45** | **70,7 %** | km 24,9 | **km 32,9** |
| 5 h 00 | 67,5 % | km 26,6 | km 37,0 |

À 4 h 45, le mur musculaire tombe au km 32,9 — la persona de Léa dit « km 32 ».
C'est le scénario cohérent.

## 1. Redéfinir le scénario de référence Léa

Débutante, F, 60 kg, marathon en **4 h 45** (et non 4 h), sans apport.
Attendu : mur musculaire vers le km 33, hypoglycémie vers le km 25.

Documente que l'événement correspondant au vécu « jambes vides au 32ᵉ » est le
**mur musculaire**, pas l'hypoglycémie. Ce sont deux défaillances distinctes et
le site doit les nommer séparément.

## 2. Nouveau : plafond de soutenabilité + diagnostic OBJECTIF_IRREALISTE

Fonction pure `pctMaxSoutenable({ dureeMin, niveau })` : courbe décroissante de
la fraction de VO₂max tenable selon la durée, décalée par le niveau (les
entraînés soutiennent une fraction plus élevée).

Points d'ancrage proposés, base `regulier` :

```
30 min 92 %  ·  60 min 88 %  ·  120 min 85 %  ·  180 min 81 %
240 min 76 % ·  300 min 72 % ·  360 min 69 %  ·  600 min 63 %
décalage par niveau : debutant −5 · regulier 0 · confirme +4 · elite +7
```

`// HYPOTHÈSE DE MODÉLISATION` — ordres de grandeur de la physiologie de
l'endurance, pas une source unique. Fourchette ±5 points.

Si l'intensité déduite dépasse ce plafond, émets `OBJECTIF_IRREALISTE`, gravité
critique, avec l'intensité demandée, le plafond, et **une estimation du temps
réaliste** (le temps pour lequel l'intensité déduite retombe sous le plafond).

C'est une sortie de valeur : l'outil dit qu'un objectif ne tient pas **avant**
de parler de nutrition. Aucun calculateur de gels ne fait ça.

### Calibrage exigé

Ajuste les ancrages **dans leur fourchette documentée** jusqu'à ce que les six
cas passent. Si tu n'y arrives pas sans élargir les fourchettes, dis-le au lieu
de les élargir.

| Cas | Intensité déduite | Attendu |
|---|---|---|
| marathon 3 h 30 `regulier` | 76,9 % | pas de OBJECTIF_IRREALISTE |
| marathon 2 h 50 `confirme` | 83,7 % | pas de OBJECTIF_IRREALISTE |
| marathon 2 h 20 `elite` | 88,8 % | pas de OBJECTIF_IRREALISTE |
| marathon 5 h 00 `debutant` | 67,5 % | pas de OBJECTIF_IRREALISTE |
| Léa 4 h 45 `debutant` | 70,7 % | pas de OBJECTIF_IRREALISTE |
| Léa 4 h 00 `debutant` | 82,6 % | **OBJECTIF_IRREALISTE**, temps réaliste estimé vers 4 h 30 – 4 h 45 |

## 3. Les tests manquants

Le tableau de contrôle de l'intensité doit être **calculé par un test**, pas
écrit à la main — c'est ce qui a produit l'erreur des 77 %.

À ajouter : les 5 cas d'intensité déduite, les 6 cas de soutenabilité ci-dessus,
et les 4 scénarios de référence avec leur kilomètre attendu à ±2 km.

## Ensuite

Commiter l'ensemble, puis **étape 5 : la refonte de la page en quatre blocs**
(voir `CLAUDE.md` §3.3–3.4).
