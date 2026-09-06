# GoFantome

**En ligne : https://neikara.github.io/gofantome/**

Entraînement au go à partir de ses propres parties. On importe depuis OGS, on en tire
des exercices, et une file de révision unique décide quoi retravailler et quand.

Deux types d'exercice pour l'instant :

- **Lecture à l'aveugle** — rejouer une séquence de mémoire : chaque pierre posée
  clignote puis disparaît, il faut tenir la position dans sa tête. Une seule erreur perd
  l'essai — une séquence tenue à moitié ne se joue pas sur un goban — et la séquence
  s'affiche alors en entier, numérotée, pour qu'on la reprenne du début.
- **Coup à corriger** — une position, quelques secondes, un seul coup, sans calculer.
  On désigne soi-même le coup qu'il fallait jouer, et celui joué dans la partie devient
  le contre-exemple.

## Démarrer en local

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # bundle statique dans dist/
```

Aucun serveur, aucun compte : tout tourne dans le navigateur. Les parties et les
séquences vivent dans IndexedDB, avec un export/import JSON depuis la page Parties
pour ne rien perdre en changeant de machine.

## Pour essayer tout de suite

À la première visite, une partie OGS réelle (90256275, *Drooxi 8k vs nobi-kun 8k*) et
deux séquences de lecture prêtes à jouer sont installées automatiquement : **Milieu de
partie** et **Combat du bas**. Pas d'exercice « coup à corriger » : il faudrait désigner
le coup qu'il fallait jouer, ce qui demande un jugement sur la partie qu'on ne peut pas
inventer.

Rien n'est écrasé si la bibliothèque contient déjà quelque chose, et le bouton « Exemple »
de la page Parties les réinstalle à la demande.

Les exercices sont dérivés du SGF au chargement — aucune coordonnée n'est écrite en dur
dans [demo.ts](src/services/demo.ts). Les commentaires de chat de la partie ont été retirés
du SGF embarqué : ils n'apportent rien à l'exercice et concernent des tiers.

## Le parcours

1. **Parties** — cherche ton pseudo OGS pour lister tes parties, ou colle un numéro
   ou une URL `online-go.com/game/…`. Un SGF collé ou déposé marche aussi.
   OGS ne fournit le SGF que pour les parties terminées.
2. **Visionneuse** — navigue jusqu'à la position qui t'intéresse (flèches ← →,
   Maj pour 10 coups), puis « Enregistrer une séquence ». Pose la variation au clic,
   ou reprends les coups réellement joués avec « +1 / +5 coups de la partie ».
   Sur un coup qu'on regrette, « Corriger le coup » ouvre la désignation de la bonne
   réponse. Le panneau latéral liste les exercices tirés de cette partie, dans l'ordre
   des coups : « Voir » les affiche en transparence sur le plateau, et les cases à
   cocher permettent d'en supprimer plusieurs d'un coup.
3. **Entraînement** — en lecture, la position de départ reste affichée (dernier coup
   joué marqué) mais pas la séquence : rejoue-la de mémoire. La première erreur met fin
   à l'essai. Dans les deux cas — réussi ou raté — la séquence est ensuite dévoilée sur
   le plateau, numérotée dans l'ordre, avec ton coup fautif marqué ✗. Pour un coup à
   corriger, la position n'apparaît qu'au départ du chrono et tu réponds d'un seul clic.
4. **Réviser** — la file sert les exercices dus, du plus en retard au plus récent.
   Filtre par type ou par étiquette, ou ne filtre pas : tout mélangé, c'est le plus
   proche d'une vraie partie. Le compteur dans la barre du haut indique ce qui attend.
5. **Intuition** — tous les coups à corriger au même endroit, enchaînés en série de
   10, 20 ou 50, au hasard ou en commençant par les moins sûrs. Ici on cherche le volume,
   pas l'échéance : la reconnaissance de formes se muscle par l'exposition, pas par la
   révision espacée. Taux de réussite global, filtres « jamais tentés » et « déjà ratés »,
   et sélection multiple pour faire le ménage.

### Répétition espacée

Chaque exercice porte une échéance. Le score de l'essai sert de note, sans rien à
saisir : une réussite éloigne la prochaine révision (1 jour, 3 jours, puis un intervalle
multiplié par la facilité, plafonné à un an), un échec ramène à demain. Un essai
interrompu ou fautif reste sous le seuil de réussite même s'il s'est arrêté près de la
fin : aller au coup 7 sur 8 se voit dans le score, mais ne fait pas passer la séquence
pour acquise. L'algorithme est un SM-2 simplifié, isolé
dans [srs.ts](src/services/srs.ts) et testable sans attendre de vrais jours.

Deux réglages par séquence, ajustables à tout moment depuis l'écran d'entraînement :
le **temps alloué** et la **durée d'affichage d'une pierre** (400 ms par défaut —
descends-la à mesure que la séquence rentre).

## Architecture

```
src/
  core/       moteur de go, sans dépendance à React
    board.ts    pose, chaînes, libertés, captures, ko simple, handicap
    sgf.ts      parseur SGF FF[4] avec variations imbriquées
    replay.ts   SGF -> suite de positions
    coords.ts   index <-> "pd" <-> "Q16"
  services/   API OGS, modèle de données, persistance IndexedDB, répétition espacée
  state/      store zustand
  components/ Goban.tsx (SVG, pierres permanentes / éphémères / fantômes)
              BlindDrill / GuessDrill : les moteurs d'exercice, Drill aiguille selon le mode
              GuessEditor : désigner la bonne réponse ; DrillSession : enchaîner une file
  pages/      Library, GameViewer, Trainer
              Sequences (lecture à l'aveugle), Intuition (coups à corriger), Review
```

Le moteur a été validé en rejouant intégralement une douzaine de parties OGS
réelles (2 000+ coups, captures et ko) sans qu'un seul coup soit refusé.

### API OGS

Les endpoints publics utilisés répondent en `access-control-allow-origin: *`,
donc aucun proxy n'est nécessaire :

| Usage | Endpoint |
|---|---|
| Chercher un joueur | `/api/v1/players/?username=…` |
| Lister ses parties | `/api/v1/players/{id}/games/?page=…` |
| Récupérer le SGF | `/api/v1/games/{id}/sgf` |

## À venir

- **Bibliothèque de josekis** : création sur goban vide, vue en coin, import SGF.
  Elle hérite telle quelle de la répétition espacée et des étiquettes.
- **Analyse personnelle puis comparaison IA** : poser ses propres variations sur une
  partie, puis les confronter à un SGF analysé par KaTrain ou LizzieYZY. Le pont est le
  fichier : l'analyse tourne en local, l'application n'a pas besoin de KataGo.
- Import depuis Fox Go Server.

## Déploiement

Chaque push sur `main` déclenche [le workflow Pages](.github/workflows/deploy.yml) :
build Vite puis publication. Le site est servi sous le sous-chemin `/gofantome/`,
d'où le `base` conditionnel dans [vite.config.ts](vite.config.ts). L'application
utilise `HashRouter`, donc aucune réécriture d'URL n'est nécessaire côté serveur.
