# PROMPT — Site web « Nutrition & énergie en course à pied » (Route & Trail)

> À coller tel quel dans un générateur de site par IA (Claude, Lovable, v0, Bolt…).
> Les sections 5, 8 et 9 sont les plus importantes : elles contiennent
> l'architecture bi-disciplinaire et le modèle physiologique exact du simulateur.
> Ne pas les résumer.

---

## 1. RÔLE

Tu es à la fois développeur front-end senior, designer produit et vulgarisateur
scientifique spécialisé en physiologie de l'exercice. Tu construis un site web
pédagogique et interactif, en français, entièrement fonctionnel, sur la nutrition
de l'effort en course à pied, couvrant **deux disciplines traitées à parts
égales : la course sur route et le trail/ultra-trail**.

Tu ne produis pas une brochure : tu produis un **outil de compréhension**. Chaque
page doit apprendre quelque chose de concret et chaque concept important doit
être manipulable, pas seulement lu.

---

## 2. VISION, PROMESSE, TON

**Promesse :** « Comprends ce qui se passe dans ton corps quand tu cours, et tu
sauras quoi manger, quand, et pourquoi — sur route comme en montagne. »

Le site part d'un constat : la plupart des coureurs appliquent des recettes
(« un gel toutes les 45 minutes ») sans comprendre les mécanismes. Résultat :
fringales, troubles digestifs, abandons. Le site remplace la recette par le
modèle mental. Un utilisateur qui a passé 20 minutes dessus doit être capable de
construire son propre plan nutritionnel et de l'adapter à sa discipline, à la
chaleur, au dénivelé et à sa physiologie.

**Ton éditorial :** rigoureux mais accessible. Vulgarisation de haut niveau, pas
de jargon gratuit ; quand un terme technique est nécessaire (glycogène,
osmolalité, hypoperfusion splanchnique, SGLT1), il est introduit, défini dans un
glossaire cliquable et réutilisé. Phrases courtes. Analogies concrètes
(le glycogène = deux réservoirs, un dans les muscles, un dans le foie ;
l'intestin = un tuyau à débit maximal). Tutoiement. Zéro promesse marketing,
zéro « secret des pros », zéro vente de produit.

**Public :** coureurs amateurs et confirmés francophones, du premier 10 km à
l'ultra-trail de 100 miles, curieux de comprendre leur corps. Niveau : grand
public éclairé. Aucun prérequis scientifique, mais on ne prend jamais le lecteur
pour un idiot.

**Personas à garder en tête :**
- *Léa, 32 ans, premier marathon (route)* — a « tapé dans le mur » au 32e km sans
  comprendre pourquoi. Veut un plan simple et fiable.
- *Marc, 45 ans, ultra-traileur* — vomit systématiquement après 8 h d'effort et
  ne supporte plus le sucré. Cherche à comprendre l'origine de ses troubles.
- *Yanis, 29 ans, routard qui passe au trail* — applique sa stratégie marathon
  sur un 60 km montagne et s'effondre. Doit comprendre ce qui change.
- *Sofia, 27 ans, coach des deux publics* — veut des schémas et des ordres de
  grandeur pour expliquer à ses athlètes.

---

## 3. PRINCIPES UX NON NÉGOCIABLES

1. **Comprendre avant calculer.** Aucun outil ne crache un chiffre sans expliquer
   d'où il vient. Chaque résultat a un bouton « pourquoi ce chiffre ? » qui
   déplie le raisonnement et les hypothèses du modèle.
2. **Progressivité.** Chaque page longue propose deux niveaux de lecture :
   l'essentiel (encadré « En 30 secondes » en haut) et l'approfondissement
   (accordéons « Pour aller plus loin »).
3. **Interactif par défaut.** Dès qu'un concept implique une variable
   (intensité, durée, température, poids, pente), il y a un curseur et un
   graphique qui réagit en direct.
4. **Persistance du profil et de la discipline.** L'utilisateur saisit son profil
   une seule fois et choisit sa discipline ; tout le site s'y adapte, avec un
   bandeau discret « Mode Trail · profil 72 kg, 38 ans — modifier ».
5. **Honnêteté sur l'incertitude.** Le site affiche des fourchettes, pas des
   vérités. Quand la variabilité interindividuelle est forte (taux de sudation,
   tolérance digestive), il le dit et invite au test à l'entraînement.
6. **Mobile-first.** Beaucoup consultent depuis leur téléphone, la veille d'une
   course ou dans une salle d'attente de ravitaillement. Les graphiques doivent
   rester lisibles et manipulables au doigt.

---

## 4. ARCHITECTURE BI-DISCIPLINAIRE — LE PRINCIPE FONDATEUR

**Le site n'est pas deux sites jumeaux.** C'est un tronc physiologique commun,
un système d'adaptation contextuelle, et des pages réellement spécifiques là où
les deux disciplines divergent. Trois couches, à implémenter explicitement :

### Couche 1 — Le socle commun (identique pour tout le monde)

La physiologie de base ne dépend pas du terrain : coût énergétique de la course,
filières glucides/lipides, réserves de glycogène, plafonds d'absorption
intestinale, mécanismes de la sudation et des troubles digestifs. Ce contenu
existe **une seule fois** dans le site (section `/comprendre`) et n'est jamais
dupliqué.

### Couche 2 — L'adaptation contextuelle (le sélecteur de discipline)

Un **commutateur global Route / Trail**, visible en permanence dans l'en-tête,
persistant (localStorage + reflété dans l'URL via un paramètre pour permettre le
partage). Il ne change pas de page : il **reconfigure la page en cours**.

Concrètement, sur une même page du socle commun, le commutateur modifie :
- les **exemples et ordres de grandeur** (« sur un marathon en 3 h 30… » devient
  « sur un 50 km avec 2 500 m D+ en 7 h… ») ;
- les **valeurs par défaut** de tous les curseurs et calculateurs ;
- les **encadrés d'application** de fin de section (« Ce que ça implique sur
  route » / « Ce que ça implique en trail ») ;
- les **plages des graphiques** (axe temporel 0-5 h en route, 0-30 h en trail) ;
- l'**accent visuel** de l'interface (voir section 12).

Implémentation attendue : un contexte React `DisciplineContext` fournissant
`'route' | 'trail'`, et un système de contenu MDX à variantes permettant
d'écrire dans un même fichier source des blocs conditionnels du type
`<Route>…</Route>` / `<Trail>…</Trail>` / `<Commun>…</Commun>`. Le contenu
partagé n'est écrit qu'une fois ; seules les variations sont dédoublées.
**Interdiction formelle de dupliquer un fichier de contenu pour créer sa version
trail.**

### Couche 3 — Les pages réellement spécifiques

Là où la divergence est structurelle et non cosmétique, il y a de vraies pages
distinctes, sous `/route/…` et `/trail/…`. Elles ne répètent pas le socle : elles
le prolongent, et renvoient vers lui par des liens.

### Le pont entre les deux : la page de comparaison

Une page `/route-vs-trail` qui met les deux disciplines côte à côte sur chaque
paramètre (intensité, durée, filières, type d'aliments, autonomie, risques
digestifs, hydratation, matériel) et explique **pourquoi** chaque différence
existe physiologiquement. C'est une page-phare : c'est elle qui donne au site sa
valeur unique, et la porte d'entrée idéale pour le coureur qui change de
discipline.

---

## 5. CE QUI DIFFÈRE VRAIMENT ENTRE ROUTE ET TRAIL

Contenu de référence à traiter dans le site — c'est le cœur de la valeur
éditoriale. Chaque différence doit être expliquée par son **mécanisme**, jamais
énoncée comme un dogme.

### 5.1 Intensité et filières
- **Route :** intensité élevée et surtout **stable** (marathon ≈ 75-85 % de
  VO₂max, semi ≈ 85-90 %). Part glucidique très majoritaire, presque constante.
  Le problème est simple à poser : un débit d'énergie élevé pendant 2 à 5 h face
  à un stock fini.
- **Trail :** intensité moyenne plus basse mais **extrêmement variable** —
  pics en montée, marche sur les pentes raides, relâchement en descente,
  alternance permanente. La part lipidique moyenne est plus élevée, mais la durée
  est telle que le glycogène reste le facteur limitant. Le problème est
  différent : gérer un débit irrégulier sur une durée très longue.
- Conséquence directe : en trail, les fenêtres pour manger existent (marche en
  montée) ; sur route, elles n'existent quasiment pas.

### 5.2 Durée et échelle de temps
Route : 30 min à 5 h. Trail : 3 h à plus de 30 h, voire multi-jours.
Cela change tout : palier de fatigue gustative, besoins en protéines, sommeil,
alternance jour/nuit, ravitaillements majeurs assis, récupération intra-course.

### 5.3 Type d'alimentation
- **Route :** liquides et gels dominent. L'intensité et les chocs réduisent la
  tolérance au solide ; mâcher à 15 km/h est difficile ; le flux sanguin digestif
  est fortement réduit. Stratégie : concentrée, régulière, quasi exclusivement
  glucidique.
- **Trail :** l'intensité plus basse et les phases de marche autorisent le
  **solide et le salé** — sandwich, riz, soupe, fromage, pommes de terre. Ce
  n'est pas une préférence culturelle, c'est une possibilité physiologique.
  S'ajoutent les besoins en **protéines** au-delà de ~6-8 h (de l'ordre de
  5-10 g/h) pour limiter le catabolisme musculaire et apporter de la satiété, et
  une petite part de lipides pour la densité énergétique quand le poids
  transporté compte.

### 5.4 Fatigue gustative et aversion au sucré
Phénomène quasi absent sur route, central en ultra : après plusieurs heures de
sucré, le dégoût s'installe et l'apport s'effondre au moment où il est le plus
nécessaire. À traiter comme un **sujet à part entière** : mécanismes (saturation
sensorielle, saturation osmotique, ralentissement gastrique), et parades
(rotation des saveurs, alternance sucré/salé, textures variées, boissons neutres,
température des aliments, acidité).

### 5.5 Autonomie et logistique
- **Route :** ravitaillements officiels tous les ~5 km, contenu standardisé,
  gobelets, difficulté à boire en courant, personnel d'assistance rare, ceinture
  porte-gels. La contrainte est la **régularité**, pas le portage.
- **Trail :** semi-autonomie obligatoire, ravitaillements espacés de 8 à 25 km,
  matériel obligatoire, sac, flasques, points d'eau naturels, assistance
  autorisée seulement sur certains postes. La contrainte est le **portage et
  l'anticipation** : ce qu'on n'a pas sur soi n'existe pas.
- Conséquence : le trail a besoin d'un outil de **planification par segment
  inter-ravitaillement** que la route n'a pas.

### 5.6 Dénivelé, mécanique et dommages musculaires
Les descentes prolongées provoquent des dommages musculaires excentriques qui
dégradent l'économie de course, augmentent l'inflammation et **altèrent la
resynthèse du glycogène**. Les montées augmentent fortement le coût énergétique
par kilomètre. Les bâtons redistribuent la charge. Le poids du sac s'ajoute à la
masse à déplacer. Tout cela n'existe pas sur route (ou marginalement).

### 5.7 Environnement
- **Route :** conditions généralement homogènes du départ à l'arrivée ; la
  chaleur et l'humidité sont les variables principales ; asphalte réverbérant.
- **Trail :** altitude (augmentation de la part glucidique, coupure de l'appétit,
  pertes hydriques respiratoires accrues), amplitude thermique jour/nuit parfois
  de 25 °C, nuit (baisse de vigilance, ralentissement digestif, stratégie
  caféine), météo changeante, exposition.

### 5.8 Risques et leur profil
- **Route :** hypoglycémie et « mur » en fin d'épreuve, déshydratation en
  conditions chaudes, troubles digestifs hauts liés à l'intensité et à la
  concentration des apports.
- **Trail :** troubles digestifs beaucoup plus fréquents et plus longs (nausées
  persistantes, gastroparésie), hyponatrémie de dilution (durée longue,
  allure lente, apports d'eau importants), déficit énergétique cumulé sur des
  heures, hypothermie, dégradation musculaire, privation de sommeil.
  Le **déficit calorique cumulé** est une notion spécifiquement ultra : on ne
  couvre jamais 100 % de la dépense, l'enjeu est de maîtriser l'écart.

### 5.9 Avant et après
Recharge glucidique classique en route (protocole 24-48 h). En trail long, la
recharge compte moins que la **capacité digestive entraînée** et la stratégie de
départ. Récupération : besoins protéiques et anti-inflammatoires majorés après un
ultra, retour à l'alimentation parfois difficile (nausées post-course).

---

## 6. ARBORESCENCE COMPLÈTE

### `/` — Accueil
Hero avec une phrase-promesse et une **mini-démo vivante** : une courbe de
glycogène qui se vide en animation, avec un bouton « ajoute un gel » qui montre
l'effet immédiat. Immédiatement sous le hero, un **choix de discipline** en deux
grandes cartes (Route / Trail) qui définit le mode du site — avec un lien discret
« je fais les deux » qui mène à `/route-vs-trail`. En dessous : les portes
d'entrée (Comprendre / Simuler / Se ravitailler / Éviter les problèmes) et les
parcours guidés du mode actif.

### `/comprendre` — Le socle physiologique (commun, adapté par le commutateur)
- `/comprendre/depense-energetique` — Combien coûte un kilomètre ? Coût
  énergétique (~1 kcal/kg/km sur le plat), influence de la vitesse, du dénivelé,
  du terrain, du poids porté, de l'économie de course. Calculateur intégré.
  *Variante trail : le coût du dénivelé et du portage y prend une place centrale.*
- `/comprendre/filieres-energetiques` — Glucides vs lipides, notion de crossover.
  Graphique interactif « part glucides/lipides selon l'intensité ».
  *Variante trail : effet d'une intensité fluctuante sur le mélange de filières.*
- `/comprendre/reserves-glycogene` — Où sont stockés les glucides (muscle
  ~300-500 g, foie ~80-110 g), équivalence en kcal et en kilomètres, facteurs de
  variation, explication du « mur ».
- `/comprendre/metabolisme-individuel` — Pourquoi deux coureurs n'ont pas les
  mêmes besoins : masse corporelle, masse maigre, âge, sexe, entraînement,
  VO₂max, économie de course, flexibilité métabolique. Formules de métabolisme de
  base (Mifflin-St Jeor, Katch-McArdle) et leurs limites.
- `/comprendre/hydratation-sudation` — Rôle de l'eau, taux de sudation
  (0,4 à 2,5 L/h), sodium de la sueur, seuil de -2 % de masse corporelle,
  thermorégulation, risque d'hyponatrémie.
- `/comprendre/meteo-environnement` — Chaleur, humidité, vent, froid, altitude.
  Comment la chaleur augmente la consommation de glucides **et** les pertes
  hydriques tout en ralentissant la vidange gastrique.
- `/comprendre/digestion-a-leffort` — Le tube digestif pendant l'effort :
  redistribution du flux sanguin, vidange gastrique, transporteurs intestinaux.
  Page pivot vers `/problemes`.

### `/route` — Section Course sur route
- `/route` — Hub : présentation de la spécificité route, accès aux sous-pages,
  parcours guidés par distance.
- `/route/profil-de-leffort` — Physiologie d'un effort continu à haute intensité
  stable : implications sur les filières, la digestion, le rythme d'apport.
- `/route/par-distance` — Quatre blocs détaillés : 5-10 km, semi-marathon,
  marathon, 100 km route / 24 h. Pour chacun : durée type, part glucidique,
  besoins horaires, stratégie recommandée, erreurs classiques.
- `/route/strategie-ravitaillement` — Gérer les postes tous les 5 km, boire en
  courant sans s'étouffer, ceinture porte-gels vs flasque souple, ce qu'on peut
  et ne peut pas attendre de l'organisation, plan B si un poste est saturé.
- `/route/recharge-glucidique` — Le protocole de surcharge : principe, durée,
  quantités (ordre de 8-12 g/kg/j les 24-48 h précédentes), gestion des fibres,
  prise de poids en eau attendue, erreurs fréquentes.
- `/route/derniere-heure` — Le repas d'avant-course et la fenêtre H-3 à H-0 :
  quoi, combien, pourquoi, et le cas particulier des courses matinales.
- `/route/erreurs-classiques` — Le mur du 30e km, le départ trop rapide, le gel
  pris sans eau, la sur-hydratation par anxiété.

### `/trail` — Section Trail & Ultra
- `/trail` — Hub : présentation de la spécificité trail, accès aux sous-pages,
  parcours guidés par format.
- `/trail/profil-de-leffort` — Physiologie d'un effort long à intensité
  fluctuante : alternance course/marche, montées, descentes, dommages
  musculaires excentriques, dégradation de l'économie de course.
- `/trail/par-format` — Blocs détaillés : trail court (< 25 km), trail
  (25-50 km), ultra (50-100 km), 100 miles et plus, multi-étapes. Pour chacun :
  durée, dépense totale, déficit calorique acceptable, stratégie, points de
  bascule.
- `/trail/alimentation-solide-et-salee` — Pourquoi le solide passe en trail et
  pas sur route, quels aliments, à quel moment, comment les combiner avec les
  produits sportifs. Panorama du « vrai » ravitaillement : soupe, bouillon,
  pommes de terre au sel, riz, sandwich, fromage, purée, compote, soda dégazé.
- `/trail/fatigue-gustative` — **Page spécifique majeure.** L'aversion au sucré :
  mécanismes, signes précurseurs, stratégie de rotation des saveurs, plan
  « saveurs de secours », rôle du salé et de l'acide, température des aliments.
- `/trail/proteines-et-longue-duree` — Pourquoi les protéines apparaissent
  au-delà de 6-8 h, quantités (~5-10 g/h), sources pratiques, effet sur la
  satiété et le catabolisme.
- `/trail/autonomie-et-portage` — Planifier segment par segment entre deux
  ravitaillements : calculer ce qu'il faut emporter, arbitrer densité énergétique
  contre poids, gérer l'eau et les points de ravitaillement naturels, composer
  son sac, préparer ses sacs d'assistance.
- `/trail/altitude-nuit-froid` — Effets de l'altitude sur l'appétit, la
  digestion et les filières ; la nuit (vigilance, ralentissement digestif,
  stratégie caféine, aliments chauds) ; le froid (dépense accrue, soif émoussée,
  hypothermie).
- `/trail/gerer-une-defaillance` — Protocole concret quand ça part mal :
  nausées installées, estomac bloqué, coup de froid, hypoglycémie profonde.
  Ralentir, diluer, marcher, réchauffer, fractionner — et savoir quand renoncer.
- `/trail/ravitos-et-assistance` — Comprendre les postes, la semi-autonomie, le
  règlement, préparer sa checklist de ravito et son temps d'arrêt optimal.

### `/route-vs-trail` — Comparateur de disciplines
Tableau interactif à double colonne sur tous les paramètres, avec explication
mécaniste de chaque écart, et un **simulateur comparatif** : le même coureur,
la même durée d'effort, deux terrains — deux jeux de courbes superposés.
Destinée en particulier au coureur de route qui passe au trail (et inversement),
avec un encadré « les 5 erreurs de transfert » dans chaque sens.

### `/simuler` — **Le simulateur** (cœur du site, deux modes)
Voir section 9, spécification complète.

### `/se-ravitailler` — La pratique (commun, adapté)
- `/se-ravitailler/quoi` — Panorama des familles de produits : gels, boissons
  d'effort, barres, pâtes de fruits, purées, poudres, aliments solides, sodas,
  bouillons. Pour chaque famille : composition type, glucides par portion,
  osmolalité, vitesse d'assimilation, contexte d'usage, avantages,
  inconvénients, adaptation route/trail, coût.
- `/se-ravitailler/combien` — Les paliers selon la durée : < 45-60 min (rien ou
  simple rinçage de bouche), 1-2 h (~30 g/h), 2-3 h (~60 g/h), > 2,5-3 h
  (jusqu'à 90 g/h et au-delà chez les sujets entraînés), avec la logique
  physiologique de chaque palier. En ultra : notion de déficit maîtrisé plutôt
  que de couverture totale.
- `/se-ravitailler/quand` — Avant, pendant (fractionnement, régularité,
  anticipation : commencer tôt, ne jamais attendre la faim), après.
- `/se-ravitailler/glucose-fructose` — Pourquoi mélanger deux sucres permet de
  dépasser 60 g/h : SGLT1 pour le glucose, GLUT5 pour le fructose, ratios 2:1 et
  1:0,8. Page-clé, avec schéma du transport intestinal.
- `/se-ravitailler/electrolytes` — Sodium, potassium, magnésium : ce qu'ils font
  réellement, ce qu'on leur prête à tort (crampes), quantités usuelles
  (300-800 mg de sodium/h, davantage chez les gros sueurs salés).
- `/se-ravitailler/cafeine-et-autres` — Caféine (dosage, timing, usage nocturne
  en ultra), bicarbonate, nitrates, BCAA : ce qui a des preuves, ce qui n'en a
  pas.
- `/se-ravitailler/entrainer-son-intestin` — Le « gut training » : protocole
  progressif sur 6-10 semaines, pourquoi l'intestin est entraînable, comment
  intégrer les sorties longues spécifiques à chaque discipline.

### `/problemes` — Points de vigilance et risques (commun, adapté)
- `/problemes/troubles-digestifs` — **Page majeure.** Fréquence, symptômes hauts
  et bas, causes expliquées mécanistiquement : hypoperfusion splanchnique,
  impacts mécaniques, osmolalité excessive, malabsorption du fructose,
  déshydratation, intensité, stress, fibres/graisses mal placées, AINS. Chaque
  cause a sa parade. Encadré comparatif route/trail sur la prévalence et la forme
  des troubles.
- `/problemes/hypoglycemie-et-mur` — Épuisement du glycogène hépatique,
  différence entre mur musculaire et hypoglycémie, signes annonciateurs,
  rattrapage.
- `/problemes/deshydratation-et-hyponatremie` — Les deux extrémités du spectre.
  Signes, seuils, conduite à tenir.
- `/problemes/chaleur-et-froid` — Coup de chaleur d'exercice et hypothermie :
  facteurs de risque, signes d'alerte, urgence.
- `/problemes/checklist-anti-pepins` — Récapitulatif actionnable, décliné en deux
  versions (route et trail), imprimable.

### `/mon-plan` — Générateur de plan de ravitaillement personnalisé
Formulaire guidé (profil + discipline + course + conditions) produisant un
**plan horaire imprimable**. En mode route : plan par kilomètre calé sur les
postes de ravitaillement. En mode trail : **plan par segment
inter-ravitaillement**, avec ce qu'il faut emporter dans le sac pour chaque
tronçon, le poids correspondant, et le contenu des sacs d'assistance.
Export PDF et impression au format « antisèche de dossard » (A4 pliable en
accordéon, résistant à la lecture en course).

### `/outils` — Boîte à outils
Calculateurs autonomes : dépense énergétique d'une sortie, taux de sudation
(protocole de pesée), besoins glucidiques horaires, convertisseur
allure/vitesse/VMA, allure équivalente plat (GAP) et vitesse ascensionnelle,
estimation des réserves de glycogène, osmolalité d'une boisson maison,
calculateur de portage (poids de nutrition à emporter par segment).

### `/glossaire` · `/sources` · `/a-propos`
Glossaire complet (chaque terme technique du site y renvoie), bases
scientifiques et méthodologie des modèles, intentions et avertissement santé.

---

## 7. NAVIGATION

- En-tête fixe : **commutateur Route/Trail** bien visible à gauche, puis
  Comprendre / Ma discipline / Simuler / Se ravitailler / Problèmes / Mon plan,
  et un bouton « Mon profil ».
- L'entrée « Ma discipline » pointe vers `/route` ou `/trail` selon le mode actif,
  et son libellé change en conséquence.
- Sur chaque page du socle commun, un encadré de fin de section
  « Et concrètement en trail / sur route ? » renvoie vers la page spécifique
  correspondante.
- Sur chaque page spécifique, un fil d'Ariane clair et un lien de retour vers la
  notion physiologique du socle qu'elle applique.
- **Parcours guidés**, sélectionnables depuis l'accueil, enchaînant 5-7 pages avec
  navigation précédent/suivant :
  - Route : « Je prépare mon premier marathon », « Je veux passer sous les
    3 h 30 sans exploser »
  - Trail : « Je prépare mon premier ultra », « Je ne supporte plus rien après
    8 heures »
  - Transversal : « Je passe de la route au trail »
- Changer de discipline ne fait jamais perdre sa place : si une page équivalente
  existe dans l'autre mode, le commutateur y mène ; sinon il reste sur la page en
  cours en adaptant son contenu.

---

## 8. LE MOTEUR PHYSIOLOGIQUE — SPÉCIFICATION

Un **moteur unique** sert les deux disciplines. La discipline n'est pas un
modèle séparé : c'est un jeu de paramètres et de modules activés. Simulation à
pas de temps de **1 minute**. Documenter chaque formule dans le code et dans
`/sources`.

### 8.1 Coût énergétique et puissance métabolique

Sur le plat, coût énergétique ≈ 1,0 kcal/kg/km (fourchette 0,85-1,10 selon
l'économie de course ; moduler avec le niveau).

Pour le dénivelé, utiliser le coût énergétique en fonction de la pente
(polynôme de Minetti, en J/kg/m, `i` = pente en tangente) :

```
Cr(i) = 155,4·i⁵ − 30,4·i⁴ − 43,3·i³ + 46,3·i² + 19,5·i + 3,6
```

Puissance métabolique = Cr(i) × masse totale × vitesse.

Modulations :
- **Facteur terrain** : route 1,00 / chemin roulant 1,05 / sentier 1,15 /
  technique ou rocailleux 1,20-1,30.
- **Masse totale** = masse corporelle + masse portée (sac, flasques, bâtons,
  nutrition) — spécifique trail, mais applicable à une ceinture sur route.
- **Marche vs course** : au-delà d'une pente d'environ 20-25 %, la marche devient
  plus économique que la course ; le moteur doit basculer automatiquement et le
  signaler dans le graphique (bandes « marche » sur l'axe temporel).
- **Bâtons** : réduction modeste du coût pour les jambes et redistribution vers le
  haut du corps, à modéliser comme un léger ajustement paramétrable.
- **Dégradation de l'économie de course** avec la fatigue : +2 à +6 % après
  plusieurs heures sur route, davantage en trail à cause des dommages
  excentriques cumulés (fonction du D− cumulé, pas seulement de la durée).

### 8.2 Répartition glucides / lipides

Fraction de l'énergie issue des glucides selon l'intensité relative
(courbe de crossover, points d'ancrage explicites à documenter) : ≈ 25-35 % à
50 % de VO₂max, ≈ 50 % à 60-65 %, ≈ 70-75 % à 75 %, ≈ 85-95 % au-delà de 85 %.

Modulations : niveau d'entraînement (les entraînés oxydent davantage de lipides à
intensité relative égale), durée (glissement progressif vers les lipides tant que
le glycogène n'est pas critique), chaleur (**augmente** la part glucidique),
altitude (augmente la part glucidique).

En mode trail, l'intensité varie minute par minute selon le segment : la
répartition doit être recalculée à chaque pas, pas moyennée sur la course.

### 8.3 Réserves de glycogène

Deux compartiments **distincts**, car ils s'épuisent différemment et produisent
des symptômes différents (jambes vides vs coup de barre et vision trouble) :
- **Musculaire** : estimer la masse musculaire active à partir de la masse
  maigre, puis appliquer 15 à 20 g par kg de muscle, jusqu'à 25-30 g/kg après une
  recharge glucidique réussie.
- **Hépatique** : 80 à 110 g, réduit d'environ moitié après une nuit de jeûne,
  restauré par le petit-déjeuner d'avant-course.
- 1 g de glycogène ≈ 4 kcal.

### 8.4 Absorption des glucides exogènes — modèle à trois compartiments

Point le plus important pour la crédibilité du simulateur.
Chaîne : **Estomac → Intestin → Sang → Muscle**.

- **Estomac** : volume résiduel suivi en continu. Vidange proportionnelle au
  volume présent, freinée par l'osmolalité ingérée (au-delà d'environ
  300-350 mOsm/kg, ralentissement net), par l'intensité (> 75 % de VO₂max,
  ralentissement marqué), par la déshydratation (> 3-4 % de perte de masse) et,
  en trail, par l'altitude et le froid.
- **Intestin** : capacité plafonnée par transporteur. Glucose et maltodextrine
  via SGLT1, saturé autour de **60 g/h**. Fructose via GLUT5, apportant
  **30 à 40 g/h supplémentaires**. Plafond combiné usuel ≈ **90 g/h**, jusqu'à
  100-120 g/h chez des athlètes ayant entraîné leur intestin. Moduler par le
  paramètre « entraînement intestinal » du profil.
- **Aliments solides** (mode trail) : vidange gastrique plus lente, apport de
  protéines et de lipides qui ralentissent encore le transit, mais meilleure
  satiété et meilleure tolérance sur la durée. À modéliser explicitement, avec un
  compartiment de digestion plus lent.
- Tout ce qui dépasse le plafond **reste dans le tube digestif**, augmente la
  charge osmotique, appelle de l'eau dans la lumière intestinale et alimente le
  score de risque digestif. Ce mécanisme doit être rendu visible : le
  sur-ravitaillement ne sert à rien et se paie.

### 8.5 Bilan hydrique et sodique

Taux de sudation estimé à partir de la puissance métabolique, de la température,
de l'humidité, du vent et de l'acclimatation ; fourchette réaliste 0,4-2,5 L/h.
Suivre la perte de masse corporelle en %. Suivre le bilan sodique (sueur
≈ 400-1 500 mg/L selon le profil ; apports par boissons, gels, aliments salés) et
signaler à la fois la déshydratation et le risque d'hyponatrémie de dilution.
En trail, ajouter les pertes respiratoires en altitude et par temps froid et sec,
et gérer la **disponibilité de l'eau** : on ne boit que ce qu'on a emporté.

### 8.6 Modules spécifiques trail (activés en mode trail)

- **Fatigue gustative** : indice croissant en fonction de la quantité cumulée de
  sucré ingérée et de la monotonie des saveurs, qui **réduit progressivement le
  taux d'ingestion réellement possible**. Se réinitialise partiellement à chaque
  changement de type de saveur ou de texture. C'est le module qui explique
  pourquoi un plan théorique parfait s'effondre à la 9e heure.
- **Dommages musculaires** : indice fonction du dénivelé négatif cumulé et de la
  vitesse en descente. Dégrade l'économie de course et réduit la capacité de
  resynthèse du glycogène.
- **Protéines** : suivi des apports et estimation du catabolisme au-delà de 6 h.
- **Déficit énergétique cumulé** : écart entre dépense et apports absorbés,
  affiché en kcal et en % — la métrique reine de l'ultra.
- **Contrainte de portage** : poids de nutrition et d'eau embarqués par segment,
  ajouté à la masse à déplacer, décroissant au fur et à mesure de la consommation.
- **Cycle jour/nuit** : effet sur la vigilance, la température, l'appétit et la
  digestion, avec une stratégie caféine associée.

### 8.7 Modules spécifiques route (activés en mode route)

- **Contrainte des postes de ravitaillement** : apports possibles uniquement aux
  kilomètres définis (tous les 5 km par défaut, paramétrable), avec un rendement
  de prise inférieur à 100 % (on renverse une partie du gobelet, on manque un
  poste). Rend visible pourquoi la ceinture personnelle change tout.
- **Pénalité d'intensité soutenue** : au-delà de 80-85 % de VO₂max prolongé,
  dégradation nette de la vidange gastrique et de la tolérance au solide.
- **Régularité d'allure** : un indicateur de dérive d'allure, avec l'effet du
  départ trop rapide sur la consommation précoce de glycogène.

---

## 9. LE SIMULATEUR — INTERFACE

Page plein écran, deux colonnes sur desktop (paramètres à gauche, graphiques à
droite), empilées sur mobile. **Le commutateur de discipline en haut de page
reconfigure l'ensemble du formulaire et des graphiques** — sans jamais perdre le
profil coureur saisi.

### 9.1 Entrées communes

**Profil coureur** (persistant)
- Sexe, âge, taille, poids, % de masse grasse (optionnel, curseur avec valeurs
  typiques si inconnu)
- Niveau : débutant / régulier / confirmé / élite
- VMA ou allure de référence (optionnel, améliore la précision)
- Taux de sudation mesuré (optionnel ; sinon estimé)
- Sueur salée : faible / moyenne / élevée (« tu retrouves du sel blanc sur ta
  casquette ? »)
- Recharge glucidique avant course : oui / non / partielle
- Entraînement intestinal : jamais travaillé / occasionnel / régulier

**Conditions**
- Température, humidité, vent, exposition solaire, altitude
- Heure de départ

### 9.2 Entrées spécifiques mode Route
- Distance (10 km, semi, marathon, 100 km, libre)
- Allure cible ou temps visé (l'un déduit l'autre)
- Intensité relative, avec équivalences en ressenti
- Postes de ravitaillement : espacement et contenu disponible
- Ravitaillement personnel : ceinture, flasque, assistance perso autorisée
- Stratégie d'allure : régulière / négative split / départ rapide

### 9.3 Entrées spécifiques mode Trail
- Distance et **dénivelé positif et négatif** totaux
- **Éditeur de profil de course** : découpage en 3 à 15 segments avec, pour
  chacun, distance, D+, D−, type de terrain, intensité cible et allure estimée.
  Prévoir un mode simplifié (« montagneux / vallonné / roulant ») pour ceux qui
  ne veulent pas tout saisir, et un import manuel de tableau.
- **Ravitaillements** : position kilométrique de chaque poste, contenu
  disponible, présence d'assistance, points d'eau intermédiaires
- Poids du sac à vide, capacité d'eau embarquée, bâtons oui/non
- Durée estimée totale, gestion du sommeil pour les formats très longs

### 9.4 Plan de ravitaillement (les deux modes)
- **Timeline horizontale** sous le graphique, sur laquelle on ajoute des prises
  par glisser-déposer ou par clic. En mode trail, la timeline affiche en fond le
  **profil altimétrique** et la position des ravitaillements ; en mode route,
  elle affiche les postes tous les 5 km.
- Chaque prise = un produit de la bibliothèque (gel 25 g, boisson 500 ml à 6 %,
  barre, banane, purée, soda, soupe, sandwich…) ou un produit personnalisé
  (glucides, ratio glucose:fructose, protéines, lipides, volume, sodium,
  caféine, saveur, texture).
- Une prise peut être ponctuelle (gel) ou continue (gorgées régulières sur un
  intervalle).
- La bibliothèque est **filtrée par discipline par défaut** (le solide et le salé
  n'apparaissent pas en tête de liste sur un semi-marathon), sans être interdite.
- Bouton « plan automatique » proposant une stratégie optimisée pour la
  discipline et le format, modifiable ensuite à la main.

### 9.5 Sorties graphiques

Graphiques synchronisés sur un axe temporel commun, avec un curseur partagé
affichant toutes les valeurs à l'instant survolé.

1. **Graphique principal — Réserves d'énergie**
   - Aire empilée : glycogène musculaire et hépatique restants (en g et en % du
     stock initial)
   - **Zones seuil** en fond : verte au-dessus de 40 %, orange entre 20 et 40 %
     (« vigilance : la baisse devient perceptible »), rouge sous 20 %
     (« zone du mur »)
   - Marqueurs verticaux à chaque prise, inflexion de la courbe immédiatement
     visible — c'est l'effet clé : on pose un gel, la courbe se redresse
   - Ligne fantôme permanente du scénario « sans ravitaillement »
   - Annotation automatique du point de rupture : « sans apport, mur estimé au
     km 31, à 2 h 47 »
   - **En mode trail**, superposition du profil altimétrique en fond léger, pour
     lire la corrélation entre les montées et les chutes de réserve

2. **Graphique glucides** — oxydation (g/h) vs absorption effective vs quantité
   ingérée, avec la ligne de plafond d'absorption. Rend visible le déficit ou le
   sur-ravitaillement.

3. **Graphique hydrique** — pertes et apports cumulés, % de perte de masse
   corporelle avec seuils -2 % et -4 %, bilan sodique en second axe. En mode
   trail, affichage de l'eau restante embarquée et alerte de rupture avant le
   prochain point d'eau.

4. **Graphique de risque digestif** — courbe 0-100 avec zones colorées et
   annotations aux pics (« pic de risque à 1 h 45 : deux gels en 10 minutes sans
   eau »). Le score doit être **explicable** : au survol, la liste des
   contributeurs du moment.

5. **Graphique spécifique trail — Fatigue gustative et déficit cumulé** — indice
   d'aversion au sucré et écart énergétique cumulé, avec annotation des moments
   où le plan devient irréaliste (« à 9 h 20, ton apport théorique de 70 g/h
   n'est plus tenable : varie les saveurs »).

6. **Bandeau de synthèse** — dépense totale (kcal), glucides consommés vs
   absorbés vs ingérés, liquide, sodium, protéines (trail), poids de nutrition
   embarqué (trail), verdict en une phrase et 3 conseils d'ajustement priorisés.

### 9.6 Interactions attendues

- **Comparaison de scénarios** : mémoriser jusqu'à 3 plans (A/B/C) et les
  superposer.
- **Comparaison inter-disciplines** : superposer un scénario route et un
  scénario trail de durée équivalente, pour visualiser la différence de profil
  énergétique. Alimente la page `/route-vs-trail`.
- **Mode « qu'est-ce qui change si… »** : boutons rapides rejouant la simulation
  avec une variable modifiée (+5 °C, +10 % d'intensité, +500 m D+, sac plus
  lourd, recharge glucidique, ravitaillement doublé) avec affichage du delta.
- **Lecture animée** : bouton play déroulant la course en accéléré, avec un
  avatar sur le profil altimétrique et l'état du coureur en temps réel
  (« 2 h 10 — réserves à 34 %, hydratation OK, estomac chargé »).
- **Détection automatique de problèmes** : signalement des incohérences
  (« tu prévois 110 g/h alors que ton intestin n'est pas entraîné », « tu n'as
  que 500 ml d'eau pour un segment de 14 km à 26 °C »).
- **Partage et export** : URL encodant tout le scénario (discipline incluse),
  export PNG des graphiques, export PDF du plan.

---

## 10. AUTRES MODULES INTERACTIFS

- **Explorateur de crossover** : curseur d'intensité → camembert animé
  glucides/lipides + autonomie théorique restante dans chaque filière.
- **Comparateur de morphotypes** : deux profils côte à côte (55 kg vs 85 kg,
  25 ans vs 55 ans) sur la même course. Démontre pourquoi les besoins ne se
  copient pas.
- **Comparateur route/trail** : le même coureur, la même durée, deux terrains.
- **Bibliothèque de produits filtrable** : tableau triable (glucides/portion,
  ratio glucose:fructose, sodium, caféine, osmolalité, texture, densité
  énergétique au gramme, besoin en eau associé, adapté route/trail), avec fiche
  détaillée par famille. Rester factuel et générique par familles plutôt que de
  promouvoir des marques.
- **Simulateur d'osmolalité** : composer sa boisson maison (eau, maltodextrine,
  fructose, sel, jus) et voir l'osmolalité, la concentration glucidique et un
  verdict (hypotonique/isotonique/hypertonique) avec les conséquences sur la
  vidange gastrique.
- **Calculateur de taux de sudation** : protocole guidé de pesée avant/après,
  qui enrichit ensuite le profil.
- **Planificateur de portage (trail)** : pour chaque segment
  inter-ravitaillement, ce qu'il faut emporter en glucides, eau et sodium, et le
  poids que cela représente.
- **Quiz de fin de parcours** : 8-10 questions par discipline, avec correction
  expliquée et renvoi vers la section concernée.

---

## 11. IDENTITÉ VISUELLE DES DEUX SECTIONS

Les deux disciplines doivent être **instantanément reconnaissables sans être deux
chartes différentes**. Un seul design system, une variation contrôlée :

- Une **couleur d'accent distincte** par discipline (une teinte plus froide et
  urbaine pour la route, une teinte plus organique et minérale pour le trail),
  appliquée aux éléments d'accentuation, aux liens actifs et à la couleur
  primaire des graphiques. Le reste de la palette (neutres, échelle sémantique
  vert/ambre/rouge) est **strictement commun** : un seuil de risque a la même
  couleur partout, sinon le site devient illisible.
- Un **motif de fond ou un traitement graphique discret** différenciant les
  hero : lignes régulières et horizontales pour la route, silhouette
  altimétrique pour le trail.
- Des **pictogrammes** cohérents dans un même style, spécifiques à chaque univers.
- Le commutateur de discipline est un composant soigné, avec une transition
  fluide de couleur d'accent lors du changement — c'est un moment fort de
  l'expérience.

Reste du design (commun) : sobre, technique, scientifique — l'esthétique d'un bon
tableau de bord, pas d'un site de compléments alimentaires. Beaucoup de blanc,
typographie soignée, hiérarchie forte, mode sombre complet avec couleurs de
graphiques recalculées. Corps de texte ≥ 17 px, largeur de ligne 65-75
caractères, chiffres tabulaires pour les valeurs numériques. Schémas en SVG
originaux et légendés pour les mécanismes clés (transporteurs intestinaux,
redistribution du flux sanguin, deux réservoirs de glycogène, trajet estomac →
intestin → sang, coût énergétique selon la pente). Pas de photos de banque
d'images. Animations discrètes et fonctionnelles, `prefers-reduced-motion`
respecté.

---

## 12. TECHNIQUE

- **Stack :** React + TypeScript + Vite, Tailwind CSS. Graphiques en Recharts ou
  D3 (D3 si l'interactivité fine — brossage, annotations, zones, profil
  altimétrique en fond — le justifie). Aucun back-end : tout tourne côté client.
- **Architecture du moteur :** module pur `src/engine/`, sans dépendance à React.
  Entrées typées, sortie = série temporelle. Structure attendue :
  ```
  src/engine/
    constants.ts        // toutes les constantes physiologiques, commentées et sourcées
    energyCost.ts       // Minetti, terrain, portage, marche/course
    substrates.ts       // crossover glucides/lipides
    glycogen.ts         // deux compartiments
    absorption.ts       // estomac → intestin → sang
    hydration.ts        // sudation, sodium, disponibilité de l'eau
    giRisk.ts           // score de risque digestif
    trail/              // fatigue gustative, dommages musculaires, portage, nuit
    road/               // contrainte des postes, pénalité d'intensité
    simulate.ts         // orchestration, pas de 1 minute
  ```
- **La discipline est un paramètre du moteur**, pas un moteur bis. Un même
  scénario doit pouvoir être rejoué dans l'autre mode sans réécrire de code.
- **Typage strict.** Aucune valeur magique dispersée : toutes les constantes dans
  `constants.ts`, chacune avec son unité, sa fourchette et sa source en
  commentaire.
- **Contenu éditorial** en MDX séparé du code, avec le système de variantes
  `<Route>` / `<Trail>` / `<Commun>` décrit en section 4. Un script de
  vérification doit signaler tout contenu dupliqué entre les deux disciplines.
- **État :** profil, discipline et scénarios en localStorage, avec versionnement
  du schéma et migration douce.
- **Tests unitaires sur le moteur** : conservation de l'énergie, plafonds
  d'absorption respectés, cohérence route/trail, cas limites (durée nulle, poids
  extrême, ingestion massive, températures négatives, D+ nul, D+ démesuré,
  course de 30 h).
- **Performance :** simulation d'une course de 30 h à pas d'une minute en moins de
  100 ms ; recalcul en temps réel au mouvement d'un curseur ; code-splitting par
  route ; chargement initial rapide.
- **Accessibilité (visée WCAG 2.1 AA) :** navigation clavier complète y compris
  dans les graphiques et le commutateur de discipline, alternatives textuelles ou
  tableaux de données pour chaque visualisation, contrastes vérifiés dans les
  deux thèmes et les deux accents, information jamais portée par la seule
  couleur, `aria-live` sur les résultats mis à jour.
- **SEO :** titres et méta-descriptions par page, données structurées
  Article/FAQ, URLs propres et distinctes pour `/route/*` et `/trail/*` (le
  contenu spécifique doit être indexable séparément), sitemap, Open Graph.
- **Responsive :** graphiques lisibles dès 360 px ; sur mobile, les paramètres du
  simulateur passent dans un panneau escamotable, la timeline devient une liste
  éditable, et l'éditeur de segments trail adopte une saisie en cartes empilées.

---

## 13. GARDE-FOUS SANTÉ ET HONNÊTETÉ

- Bandeau discret mais permanent sur les pages d'outils : « Ces estimations sont
  des modèles pédagogiques, pas un avis médical ni un protocole individualisé.
  Teste toujours ta stratégie à l'entraînement, jamais le jour J. »
- Page `/a-propos` avec un avertissement explicite invitant à consulter un
  professionnel de santé ou un diététicien du sport en cas de pathologie
  (diabète, troubles digestifs chroniques, troubles du comportement alimentaire,
  grossesse, traitement en cours).
- **Aucun contenu incitant à la restriction alimentaire, à la perte de poids ou à
  la performance à tout prix.** Le site parle de nourrir l'effort, pas de
  contrôler un corps. Si le poids apparaît (il influence la dépense énergétique),
  il est traité de façon neutre et factuelle, sans objectif chiffré ni jugement.
- Les situations d'urgence (coup de chaleur, hyponatrémie sévère, hypothermie)
  sont présentées comme des urgences nécessitant un secours, jamais comme des
  paramètres à optimiser. En trail, mentionner explicitement l'isolement et le
  délai d'accès aux secours.
- Toute valeur numérique importante est présentée en fourchette, avec mention de
  la variabilité individuelle.

---

## 14. CRITÈRES D'ACCEPTATION

Le livrable est réussi si :

1. Le site se lance sans erreur, toutes les routes listées existent et sont
   remplies de contenu réel (pas de lorem ipsum, pas de « à compléter »).
2. Le commutateur Route/Trail modifie visiblement le contenu, les valeurs par
   défaut, les exemples et l'accent visuel sur au moins **10 pages différentes**,
   sans rechargement complet et sans perte du profil.
3. **Aucun fichier de contenu n'est dupliqué** entre les deux disciplines : le
   socle commun est écrit une seule fois.
4. Les sections `/route` et `/trail` comptent chacune au moins **6 pages
   spécifiques** au contenu substantiel et non interchangeable.
5. Le simulateur produit des résultats **physiologiquement cohérents** :
   - un coureur de 70 kg sur marathon en 3 h 30 sans ravitaillement épuise ses
     réserves entre 2 h 15 et 3 h ; avec 60 g/h il termine avec une réserve
     résiduelle ;
   - ingérer 150 g/h ne fait **pas** monter l'absorption au-delà du plafond et
     fait exploser le score de risque digestif ;
   - un 80 km avec 4 000 m D+ affiche une dépense nettement supérieure à un
     80 km plat, et un déficit énergétique cumulé important même avec un plan
     agressif ;
   - la fatigue gustative dégrade l'apport réalisable au-delà de 8 h.
6. Ajouter une prise sur la timeline modifie visiblement la courbe en moins de
   200 ms, dans les deux modes.
7. La page `/route-vs-trail` permet de superposer deux simulations et explique
   chaque écart.
8. Chaque résultat chiffré est accompagné d'une explication accessible en un clic.
9. Le site est utilisable au doigt sur téléphone, y compris l'éditeur de segments
   trail.
10. Le mode sombre est complet et les graphiques restent lisibles dans les deux
    accents de discipline.
11. Le contenu éditorial représente au minimum **18 000 mots** de texte original
    et rigoureux, dont au moins 4 000 spécifiques à la route et 5 000 spécifiques
    au trail.
12. Toutes les constantes physiologiques sont centralisées, commentées et sourcées.

---

## 15. ORDRE DE CONSTRUCTION SUGGÉRÉ

1. Moteur de simulation `src/engine/` avec paramétrage par discipline + tests
   unitaires (avant toute interface)
2. Design system, `DisciplineContext`, commutateur, mise en page, mode sombre
3. Système de contenu MDX à variantes
4. Page `/simuler` complète, mode route d'abord, puis mode trail avec l'éditeur
   de segments et les modules spécifiques
5. Socle `/comprendre` avec ses adaptations contextuelles
6. Sections `/route` et `/trail`
7. `/route-vs-trail`
8. `/se-ravitailler`, `/problemes`, bibliothèque de produits
9. `/mon-plan`, export PDF, partage par URL
10. Outils annexes, glossaire, quiz, sources
11. Passes finales : accessibilité, performance, SEO, relecture éditoriale

---

## 16. HORS PÉRIMÈTRE (v2)

À ne pas construire maintenant, mais à ne pas rendre impossible par
l'architecture : comptes utilisateurs et back-end, import de fichiers GPX pour
générer automatiquement les segments et le profil altimétrique, connexion Strava
ou Garmin, base de données de courses réelles avec leurs profils et
ravitaillements, suivi longitudinal, partage de plans entre utilisateurs,
application mobile hors-ligne, version anglaise, extension à d'autres disciplines
d'endurance (triathlon, cyclisme, marche nordique).

**Note d'architecture :** l'ajout d'une troisième discipline doit rester possible
sans réécriture. Conçois le `DisciplineContext` et le paramétrage du moteur comme
extensibles, pas comme un simple booléen route/trail.

---

## 17. LIVRAISON

Fournis le projet complet et fonctionnel, avec un `README.md` expliquant
l'architecture bi-disciplinaire, le fonctionnement du moteur de simulation, la
façon d'ajouter du contenu à variantes et la façon d'ajuster les constantes
physiologiques. Commente le code du moteur de manière particulièrement soignée :
c'est lui qui porte la crédibilité scientifique de tout le site.
