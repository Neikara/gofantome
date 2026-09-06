# GoFantome

**En ligne : https://neikara.github.io/gofantome/**

Entraînement au go à partir de ses propres parties. On importe depuis OGS, on en tire
des exercices, et une file de révision unique décide quoi retravailler et quand.

Deux types d'exercice pour l'instant :

- **Lecture à l'aveugle** — rejouer une séquence de mémoire : chaque pierre posée
  clignote puis disparaît, il faut tenir la position dans sa tête.
- **Deviner le coup** — une position, quelques secondes, un seul coup, sans calculer.
  La référence est le coup réellement joué : à faire sur des parties plus fortes que soi.

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
quatre exercices prêts à jouer sont installés automatiquement : deux séquences de lecture
(**Milieu de partie**, **Combat du bas**) et deux devinettes tirées du même combat.

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
3. **Entraînement** — en lecture, la position de départ reste affichée mais pas la
   séquence : rejoue-la de mémoire. Un coup faux coûte 1 point et le bon coup t'est
   montré pour que tu puisses continuer. En devinette, la position n'apparaît qu'au
   départ du chrono, et tu réponds d'un seul clic.
4. **Réviser** — la file sert les exercices dus, du plus en retard au plus récent.
   Filtre par type ou par étiquette, ou ne filtre pas : tout mélangé, c'est le plus
   proche d'une vraie partie. Le compteur dans la barre du haut indique ce qui attend.

### Répétition espacée

Chaque exercice porte une échéance. Le score de l'essai (`score / max`) sert de note,
sans rien à saisir : une réussite éloigne la prochaine révision (1 jour, 3 jours, puis
un intervalle multiplié par la facilité, plafonné à un an), une réussite laborieuse
l'éloigne moins, un échec ramène à demain. L'algorithme est un SM-2 simplifié, isolé
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
  pages/      Library, GameViewer, Sequences, Trainer, Review
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
