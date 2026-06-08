# Text Editor

Éditeur de texte minimaliste — design Swiss éditorial.

## Démarrage rapide

```bash
npm install
npm run dev
```

Ouvre automatiquement sur **http://localhost:3000**

---

## Ajouter des polices

### Google Fonts
Éditez `src/fonts.js` et ajoutez une entrée dans la liste :

```js
{ name: "Nom De La Police", google: true, category: "sans" }
// catégories disponibles : sans | serif | mono | display
```

### Police locale (fichier .woff2)
1. Déposez votre fichier dans `/public/fonts/`
2. Ajoutez un `@font-face` dans `src/style.css` :

```css
@font-face {
  font-family: "MaPolice";
  src: url("/fonts/MaPolice-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
}
```

3. Ajoutez dans `src/fonts.js` :

```js
{ name: "MaPolice", google: false, category: "sans" }
```

---

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl + B` | Gras |
| `Ctrl + I` | Italique |
| `Ctrl + U` | Souligné |
| `Ctrl + +` | Augmenter la taille |
| `Ctrl + -` | Réduire la taille |

---

## Build production

```bash
npm run build
```

Les fichiers sont générés dans `/dist`.
