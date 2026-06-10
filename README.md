# Haptobiosis — 3D

Extension 3D d'Haptobiosis : un clavier qui dort. Dès qu'on le touche (clavier
physique ou souris), la veille se dissipe, la caméra plonge sur la zone touchée,
et des colonies se mettent à pousser sur la surface — taches qui s'étalent façon
boîte de Pétri **et** amas en relief qui s'accumulent. Plus on touche, plus ça
prolifère. La souris nourrit la croissance là où elle passe.

## Lancer

```bash
npm install
npm run dev
```

Puis ouvrir l'URL affichée (par défaut http://localhost:5173).

Build de prod :

```bash
npm run build && npm run preview
```

## Comment ça marche

Trois phases, gérées par une petite machine à états (`src/core/StateMachine.js`) :

- **idle** — écran de veille, caméra qui dérive lentement.
- **awake** — première interaction : la veille s'efface, vue d'ensemble du clavier.
- **inspect** — on tape une touche : la caméra se place au-dessus de la zone
  correspondante et la culture s'active.

La croissance se joue entièrement **sur la surface** (`src/shaders/surfaceMaterial.js`) —
un `MeshStandardMaterial` enrichi via `onBeforeCompile`. Pour chaque fragment, on
parcourt les colonies (transmises par une `DataTexture` de 3 lignes) et on peint
une tache organique :

- **domain warping** (FBM) qui déforme l'espace → contours déchiquetés, pas des disques ;
- **anisotropie** par colonie → étalement asymétrique, jamais centré pareil ;
- **lobes aléatoires** par seuillage de bruit → développement irrégulier ;
- **texture interne** (bruit cellulaire Worley + moucheture) → grain vivant ;
- **palette propre** à chaque colonie (5 schémas : émeraude, cobalt, ocre, magenta, sarcelle) → couleurs variées ;
- **contour** : liseré sombre net juste avant le bord.

Chaque colonie a sa graine, sa vitesse de croissance, sa taille finale et sa
direction d'étalement tirées au hasard à l'ensemencement : deux colonies ne se
ressemblent jamais.

Les **spores ambiantes** (`src/growth/SporeField.js`) sont l'héritage direct du
projet d'origine : des particules qui s'agitent d'autant plus qu'on interagit.

### Carte des entrées

- Une **touche** réveille la scène, choisit une zone du clavier
  (`src/core/keymap.js`, disposition AZERTY) et y ensemence une colonie.
- La **souris** lance un raycast sur le mesh ; au survol elle nourrit la colonie
  la plus proche, au clic elle en sème une nouvelle au point touché.

## À propos du modèle

`public/models/keyboard.glb` est ton STL décimé de **1 315 466 → 40 000
triangles** (704 Ko), recentré, orienté à plat et normalisé à 4 unités de large.
1.3M de triangles bruts faisaient ramer le navigateur ; 40k passe partout tout
en gardant la silhouette et le relief des touches.

Pour re-décimer toi-même depuis le STL original (Blender) : *Decimate modifier*
en mode *Collapse*, ratio ≈ 0.03, puis export glTF binaire (.glb).

## Pistes pour la suite

- Lire les vraies UV du clavier si tu en exportes (le shader peut alors varier
  la teinte par touche).
- Persistance des colonies entre sessions (localStorage).
- Post-processing (bloom léger sur les cœurs humides).
- Son réactif à la biomasse.
