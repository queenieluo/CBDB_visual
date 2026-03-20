# CBDB Family Tree Visualization

Interactive family tree visualization for the [China Biographical Database (CBDB)](https://projects.iq.harvard.edu/cbdb), built with React, TypeScript, and D3.js.

**Live demo:** [https://queenieluo.github.io/CBDB_visual/](https://queenieluo.github.io/CBDB_visual/)

## Features

- **Grid-based family tree layout** — ancestors above, descendants below, siblings and spouses on the same row
- **Click to expand** — click any person to load their relatives and expand the tree
- **Metadata display** — dynasty, birth/death years, and imperial exam status shown in the detail sidebar
- **Search** — find persons by Chinese name, English name, or CBDB person ID
- **CBDB integration** — each person links to their full [CBDB record](https://cbdb.fas.harvard.edu/cbdbapi/person.php?id=1762)
- **Color-coded by gender and generation** — blue (male), rose (female), gold (ego)
- **Bilingual** — English and Chinese interface
- **Zoom and pan** — navigate large family trees with mouse wheel and drag
- **Export** — save the visualization as SVG or PNG

## Data

Currently includes **1,538 persons** (persons 1–3,000 from CBDB with kinship data), covering major Song dynasty figures including 王安石 (Wang Anshi, ID 1762) and their extended family networks.

Each person's CSV file contains:
- Grid position and relationship to ego
- English relationship labels (Father, Elder brother, Son-in-law, etc.)
- Dynasty, birth/death years, imperial exam status

## Development

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:5173/CBDB_visual/](http://localhost:5173/CBDB_visual/)

## Batch Processing

To regenerate CSV files from CBDB JSON data:

```bash
cd app
node scripts/batch-generate-csvs.mjs [path-to-cbdb-json]
```

This reads the CBDB JSON, builds a kinship graph, and generates one CSV per person with English relationship labels and biographical metadata.

## Tech Stack

- **React 19** + **TypeScript** — UI framework
- **D3.js 7** — grid layout, zoom/pan, color scales
- **Vite 8** — build tool
- **i18next** — internationalization (EN/ZH)
- **GitHub Pages** — hosting

## Acknowledgments

Data from the [China Biographical Database (CBDB)](https://projects.iq.harvard.edu/cbdb), a collaborative project of Harvard University, Peking University, and Academia Sinica.
