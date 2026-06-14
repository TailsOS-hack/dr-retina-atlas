# DR-Retina Atlas

**A fully live, interactive single-cell RNA-seq explorer for Diabetic Retinopathy research.**

Inspired by [Spectacle](https://singlecell-eye.org/app/spectacle/), built specifically for DR — pulling **real data** from EBI Single Cell Expression Atlas, CELLxGENE Discover, NCBI GEO, and PubMed in real time.

---

## Screenshots

### Home
![Home page](https://raw.githubusercontent.com/TailsOS-hack/dr-retina-atlas/main/public/screenshots/home.png)

### Cell Explorer — 7,970 real DR cells colored by cell type
![Cell Explorer - Cell Type](https://raw.githubusercontent.com/TailsOS-hack/dr-retina-atlas/main/public/screenshots/explorer-celltype.png)

### Cell Explorer — DR vs Healthy condition overlay
![Cell Explorer - Condition](https://raw.githubusercontent.com/TailsOS-hack/dr-retina-atlas/main/public/screenshots/explorer-condition.png)

### Gene Expression Analysis (violin plots, dot plots, live PubMed)
![Analysis](https://raw.githubusercontent.com/TailsOS-hack/dr-retina-atlas/main/public/screenshots/analysis.png)

### Dataset Browser (live CELLxGENE + NCBI GEO)
![Datasets](https://raw.githubusercontent.com/TailsOS-hack/dr-retina-atlas/main/public/screenshots/datasets.png)

---

## Features

| Feature | Data Source | Status |
|---|---|---|
| UMAP of 7,970 real DR cells | EBI SCEA · E-MTAB-9061 | ✅ Live |
| DR vs Healthy condition coloring | EBI SCEA cell metadata | ✅ Live |
| 9 retinal cell types (k=23 resolution) | EBI SCEA marker genes | ✅ Live |
| Gene expression by cluster | EBI SCEA fold changes | ✅ Live |
| 109 retinal datasets with metadata | CELLxGENE Discover API | ✅ Live |
| DR dataset search | NCBI GEO esearch API | ✅ Live |
| Literature search (25 papers) | NCBI PubMed API | ✅ Live |
| Violin / dot / differential plots | Demo atlas data | ✅ Built-in |

### Real Data Pipeline (E-MTAB-9061)

The primary dataset is **E-MTAB-9061** (Van Hove et al. 2020, *Diabetologia*) — the Akimba mouse model of diabetic retinopathy:

- **4,787 DR cells** (Ins2-Akita; VEGF+/− Akimba mice)
- **3,183 healthy cells** (C57BL/6J wild-type)
- **23 cell clusters** → 9 annotated retinal cell types
- Cluster positions computed via **classical MDS** on marker gene fold-change vectors (cosine distance)
- On first load, the server fetches ~7 MB from EBI FTP and caches for 1 hour

```
Cell type distribution (E-MTAB-9061):
  Rod Photoreceptors   3394  (42.6%)   ← dominant in mouse retina
  Müller Glia          1841  (23.1%)
  Bipolar Cells        1155  (14.5%)
  Cone Photoreceptors   436   (5.5%)
  Amacrine Cells        339   (4.3%)
  Microglia             317   (4.0%)
  Pericytes             218   (2.7%)
  Endothelial Cells     171   (2.1%)
  Astrocytes             99   (1.2%)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 6 |
| Styling | Tailwind CSS v4 |
| Visualization | D3.js v7 (UMAP, violin, dot plots) |
| Routing | React Router v7 |
| Backend | Express.js (Node.js) |
| HTTP client | Axios |
| Caching | node-cache (1-hour TTL) |
| Dev runner | concurrently |

---

## Prerequisites

- **Node.js ≥ 18** — [nodejs.org](https://nodejs.org)
- **npm ≥ 9** (bundled with Node.js)

Verify:
```bash
node --version   # should print v18.x or higher
npm --version
```

On macOS with Homebrew:
```bash
brew install node
```

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/TailsOS-hack/dr-retina-atlas.git
cd dr-retina-atlas

# 2. Install dependencies
npm install

# 3. Start both frontend + backend together
npm run dev
```

Open **http://localhost:5174** in your browser.

> **First load of the Cell Explorer** fetches ~7 MB from EBI FTP (clusters, marker genes, gene symbol map, cell metadata). This takes ~10–20 seconds. Subsequent loads within the hour are instant (cached).

---

## Project Structure

```
dr-retina-atlas/
├── server/
│   └── index.js          # Express API server (port 3001)
├── src/
│   ├── api/
│   │   └── client.js     # Frontend API client
│   ├── components/
│   │   ├── UMAPPlot.jsx  # D3 scatter plot with brush selection
│   │   ├── ViolinPlot.jsx # D3 violin with KDE + box/whisker
│   │   └── DotPlot.jsx   # D3 dot plot (size=pct, color=mean)
│   ├── data/
│   │   ├── generateData.js  # Demo atlas (1820 synthetic cells)
│   │   └── datasets.js      # Curated DR dataset list
│   ├── hooks/
│   │   └── useAsync.js   # Generic async React hook
│   └── pages/
│       ├── HomePage.jsx
│       ├── ExplorerPage.jsx  # UMAP with real E-MTAB-9061 data
│       ├── DatasetsPage.jsx  # Live CELLxGENE + GEO browser
│       ├── AnalysisPage.jsx  # Violin/dot plots + live PubMed
│       └── GuidePage.jsx     # How-to guide
├── public/
│   └── screenshots/      # App screenshots for README
├── index.html
├── vite.config.js        # Tailwind + proxy /api → :3001
└── package.json
```

---

## API Endpoints

All endpoints are served by the Express backend on port 3001. In development, Vite proxies `/api/*` → `http://localhost:3001/api/*`.

### Real-data endpoints

| Endpoint | Description | Source |
|---|---|---|
| `GET /api/emtab9061/cells` | 7,970 real DR cells with 2D MDS positions, cell types, and condition labels | EBI SCEA FTP |
| `GET /api/emtab9061/expression/:gene` | Per-cell expression values from cluster marker fold changes | EBI SCEA (cached) |
| `GET /api/datasets/retinal` | 109 retinal datasets with metadata | CELLxGENE Discover |
| `GET /api/ncbi/geo/search?q=...` | GEO dataset search | NCBI E-utilities |
| `GET /api/ncbi/pubmed/search?q=...` | PubMed article search | NCBI E-utilities |
| `GET /api/ncbi/pubmed/:pmid` | Single PubMed article | NCBI E-utilities |
| `GET /api/health` | Health check | — |
| `GET /api/cache/stats` | Cache hit/miss statistics | — |

### How the E-MTAB-9061 UMAP is computed server-side

On the first request to `/api/emtab9061/cells`, the server downloads 4 files from EBI FTP in two phases:

**Phase 1** — `E-MTAB-9061.clusters.tsv` (382 KB)
- Wide format: 7,970 cell barcodes as columns, k-resolutions as rows
- Extracts the `sel.K=TRUE` row (k=23) → Map of cell → cluster ID

**Phase 2** (parallel downloads):
- `E-MTAB-9061.marker_genes_23.tsv` (194 KB) — marker gene fold changes per cluster
- `E-MTAB-9061.aggregated_counts.decorated.mtx_rows` (916 KB) — Ensembl ID → gene symbol map
- `E-MTAB-9061.cell_metadata.tsv` (5.5 MB) — cell barcodes → disease/genotype condition

**Processing:**
1. Builds fold-change vectors for each of the 23 clusters (all marker genes as dimensions)
2. Computes 23×23 pairwise cosine distance matrix
3. Applies **classical MDS** (power iteration on double-centered squared distance matrix) → 2D cluster centroids
4. Scatters 7,970 cells around centroids using Gaussian noise (seed=42, σ = √cluster_size × 0.08)
5. Annotates clusters against curated retinal cell type marker gene sets
6. Caches full result for 1 hour

---

## Available Scripts

```bash
npm run dev         # Start frontend (Vite, :5174) + backend (Express, :3001) together
npm run dev:client  # Frontend only
npm run dev:server  # Backend only
npm run build       # Production build → dist/
npm run preview     # Preview production build
```

---

## Data Sources & Citations

- **E-MTAB-9061** — Van Hove I et al. "Identifying the molecular basis of vision loss in diabetic retinopathy." *Diabetologia* 2020. [EBI SCEA](https://www.ebi.ac.uk/gxa/sc/experiments/E-MTAB-9061/)
- **CELLxGENE Discover** — Chan Zuckerberg Initiative. [cellxgene.cziscience.com](https://cellxgene.cziscience.com)
- **NCBI GEO / PubMed** — National Center for Biotechnology Information. [ncbi.nlm.nih.gov](https://www.ncbi.nlm.nih.gov)
- **Review article** — PMC11214886. [pmc.ncbi.nlm.nih.gov/articles/PMC11214886/](https://pmc.ncbi.nlm.nih.gov/articles/PMC11214886/)
- **Spectacle** (inspiration) — [singlecell-eye.org/app/spectacle/](https://singlecell-eye.org/app/spectacle/)

---

## Troubleshooting

**Port conflict on 5174 or 3001**
```bash
kill $(lsof -ti:5174) 2>/dev/null
kill $(lsof -ti:3001) 2>/dev/null
npm run dev
```

**"Node not found" on macOS**
```bash
brew install node
# Add to ~/.zshrc or ~/.bash_profile:
export PATH="/opt/homebrew/bin:$PATH"
source ~/.zshrc
```

**Cell Explorer shows "Loading 7,970 real DR cells from EBI SCEA…" for a long time**
The EBI FTP download takes 10–30 s on first load depending on your connection. Wait it out — subsequent loads within the hour are cached instantly.

**Backend 502 errors**
Run `npm run dev:server` separately to see backend logs. Common causes: EBI FTP timeout (retry), NCBI rate limit (wait 10 s and refresh).

---

## License

MIT
