# BodyKnows

Mobile-first, Duolingo-like, client-only body symptom tracker.

## Tech stack

- React + Vite + TypeScript
- TailwindCSS (v4 via Vite plugin)
- Zustand (localStorage persistence)
- Framer Motion (transitions)
- React Konva (freehand drawing)
- html2canvas (snapshot)
- PapaParse (CSV export)

## Run

```bash
cd bodyknows
npm install
npm run dev
```

Build:

```bash
cd bodyknows
npm run build
```

## App structure

```
src/
  components/
  pages/
  store/
  utils/
```

## Data storage (localStorage)

All records are stored under `localStorage['bodyknows_records_v1']` via Zustand persist.

Record schema:

```ts
{
 id: uuid
 date: YYYY-MM-DD
 hour: number
 tag: "good" | "bad" | "confused"
 note: string
 polygon: [ [x,y], [x,y] ... ]
 snapshot: base64
}
```

Note: `polygon` is stored as **normalized points** (x/y in 0..1) relative to the drawing canvas size, so it remains stable across screen sizes.

## Key interaction logic

- **Step 1 freehand polygon**: `src/components/BodyCanvasSelector.tsx`
  - Collect points during pointer drag
  - On release, auto-close polygon and persist points
- **Clock dial hour mapping**: `src/components/ClockDial.tsx`
  - Total angle range 0–720 degrees
  - Hour = clamp(round(angle / 30), 0, 23)
- **Save + snapshot**: `src/pages/AddRecordPage.tsx`
  - Use `html2canvas` to capture the body canvas container
  - Save snapshot as base64 and store the record in localStorage
- **CSV export**: `src/utils/csv.ts` (PapaParse `unparse`)

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
