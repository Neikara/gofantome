# GoFantome

Entraînement à la lecture au go. On importe ses parties depuis OGS, on enregistre
la variation qu'on veut apprendre à lire, puis on la rejoue **à l'aveugle** : chaque
pierre posée clignote et disparaît, il faut tenir la position dans sa tête.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # bundle statique dans dist/
```

Aucun serveur, aucun compte : tout tourne dans le navigateur. Les parties et les
séquences vivent dans IndexedDB, avec un export/import JSON depuis la page Parties
pour ne rien perdre en changeant de machine.

## Le parcours

1. **Parties** — cherche ton pseudo OGS pour lister tes parties, ou colle un numéro
   ou une URL `online-go.com/game/…`. Un SGF collé ou déposé marche aussi.
   OGS ne fournit le SGF que pour les parties terminées.
2. **Visionneuse** — navigue jusqu'à la position qui t'intéresse (flèches ← →,
   Maj pour 10 coups), puis « Enregistrer une séquence ». Pose la variation au clic,
   ou reprends les coups réellement joués avec « +1 / +5 coups de la partie ».
3. **Entraînement** — la position de départ reste affichée, la séquence non.
   Rejoue-la de mémoire. Un coup faux coûte 1 point et le bon coup t'est montré
   pour que tu puisses continuer. Un chrono court sur toute la séquence.

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
  services/   API OGS, modèle de données, persistance IndexedDB
  state/      store zustand
  components/ Goban.tsx (SVG, pierres permanentes / éphémères / fantômes)
  pages/      Library, GameViewer, Sequences, Trainer
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

- Import depuis Fox Go Server.
- Séquences créées sur un goban vide, sans partie de départ.
- Répétition espacée : ressortir en priorité les séquences les moins maîtrisées
  (le tri « moins maîtrisées » de la page Séquences en est la première marche).
