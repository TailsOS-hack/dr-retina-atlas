import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ChevronDown, Microscope, BarChart2, Database, BookOpen, HelpCircle, CheckCircle2 } from 'lucide-react'

const SECTIONS = [
  {
    id: 'intro',
    icon: BookOpen,
    title: 'Introduction to scRNA-seq in DR',
    content: `Single-cell RNA sequencing (scRNA-seq) allows researchers to measure gene expression in thousands of individual cells simultaneously. This is revolutionary for studying diabetic retinopathy (DR), because the retina contains many distinct cell types, each with unique roles and responses to disease.

In DR, early neurodegeneration, vascular dysfunction, and neuroinflammation are key pathological events. By analyzing cells individually, scRNA-seq lets us understand how each cell type — rods, Müller glia, endothelial cells, microglia — changes in response to hyperglycemia and oxidative stress.`,
    tips: [
      'The retina contains ~12 major cell types, each with distinct gene expression programs',
      'DR affects all retinal cell types, but with different severity and timing',
      'scRNA-seq can detect rare cell states (e.g., activated microglia) missed by bulk methods',
    ]
  },
  {
    id: 'umap',
    icon: Microscope,
    title: 'Understanding the UMAP Plot',
    content: `UMAP (Uniform Manifold Approximation and Projection) is a dimensionality reduction technique that projects high-dimensional gene expression data (thousands of genes) into a 2D plot where similar cells cluster together.

In the Cell Explorer, each point represents one cell. Cells of the same type cluster together because they express similar sets of genes. The distance between clusters reflects transcriptional similarity — closely related cell types (e.g., rods and cones) appear nearer to each other.`,
    steps: [
      { n: 1, label: 'Navigate to the Cell Explorer tab' },
      { n: 2, label: 'Select "Color By → Cell Type" to see the 12 retinal cell populations' },
      { n: 3, label: 'Switch to "Color By → Condition" to see how cells distribute between healthy and DR' },
      { n: 4, label: 'Select "Color By → Gene Expression" and search for VEGFA or GFAP to see DR-upregulated genes' },
      { n: 5, label: 'Click on cell type names in the legend to highlight specific populations' },
      { n: 6, label: 'Drag on the plot to select a region — a summary of selected cells will appear below' },
    ],
    tips: [
      'Cells in the same cluster have highly similar transcriptomes',
      'VEGFA expression (key angiogenic gene) is elevated in DR endothelial and Müller cells',
      'Try searching GFAP to visualize Müller glia activation in DR',
    ]
  },
  {
    id: 'violin',
    icon: BarChart2,
    title: 'Gene Expression Analysis',
    content: `The Analysis tab offers three complementary views for gene expression:

• Violin Plots show the distribution of expression for one gene across all cell types. The width of the violin represents the density of cells at that expression level. The boxplot inside shows the median and IQR.

• Dot Plots display multiple genes across all cell types simultaneously. Dot size = percentage of cells expressing the gene; dot color = mean expression level. This is ideal for comparing marker gene panels.

• Differential Expression table compares mean expression between healthy and DR conditions, showing log₂ fold-change and estimated significance.`,
    steps: [
      { n: 1, label: 'Go to Analysis → Violin Plot' },
      { n: 2, label: 'Type "VEGFA" in the gene search box to visualize VEGF expression' },
      { n: 3, label: 'Compare red (DR) vs. blue (healthy) bars in the cell summary cards' },
      { n: 4, label: 'Switch to Dot Plot and select "DR Pathway Genes" to see a panel view' },
      { n: 5, label: 'Go to Differential Expression to see the top genes changing in DR vs. Healthy' },
    ],
    tips: [
      'GFAP is highest in Müller glia and astrocytes, and increases dramatically in DR',
      'RHO (rhodopsin) expression decreases in DR photoreceptors — an early neurodegeneration marker',
      'CX3CR1 marks microglia — look for its enrichment in the microglial cluster',
    ]
  },
  {
    id: 'datasets',
    icon: Database,
    title: 'Finding & Using Datasets',
    content: `The Datasets tab lists 9 curated published scRNA-seq studies for diabetic retinopathy. Each dataset entry includes:

• GEO Accession (GSE number) — click to go directly to the NCBI GEO repository where raw and processed data can be downloaded
• PubMed link — access the full publication
• Metadata: species, cell count, clustering method, disease stage

For your own analysis beyond this app, we recommend downloading the processed count matrices from GEO and using Seurat (R) or Scanpy (Python) for re-analysis.`,
    steps: [
      { n: 1, label: 'Go to the Datasets tab and use the search box to find studies' },
      { n: 2, label: 'Filter by species (Human/Mouse/Rat) or condition (Healthy/DR)' },
      { n: 3, label: 'Click the GEO accession link to go to the data download page' },
      { n: 4, label: 'Use the tag filter to find datasets focused on specific aspects (e.g., "vascular")' },
    ],
    resources: [
      { label: 'NCBI GEO Database', url: 'https://www.ncbi.nlm.nih.gov/geo/', desc: 'Download raw and processed scRNA-seq count matrices' },
      { label: 'Spectacle Eye Atlas', url: 'https://singlecell-eye.org/app/spectacle/', desc: 'Companion resource for healthy eye scRNA-seq data' },
      { label: 'DR scRNA-seq Review (PMC11214886)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11214886/', desc: 'Review article cataloging DR scRNA-seq studies' },
      { label: 'Seurat Vignette', url: 'https://satijalab.org/seurat/articles/pbmc3k_tutorial', desc: 'Standard scRNA-seq analysis pipeline in R' },
      { label: 'Scanpy Tutorial', url: 'https://scanpy-tutorials.readthedocs.io/', desc: 'Python-based scRNA-seq analysis (Scanpy/AnnData)' },
    ]
  },
  {
    id: 'biology',
    icon: HelpCircle,
    title: 'Key Biology: DR Pathophysiology',
    content: `Understanding the biological context helps interpret scRNA-seq findings:`,
    keyFacts: [
      {
        cellType: 'Müller Glia',
        color: '#10b981',
        fact: 'Spanning the entire retinal thickness, Müller glia become reactive (gliotic) in early DR. They upregulate GFAP, VIM, and inflammatory cytokines. In late PDR, some acquire progenitor-like states.',
        genes: ['GFAP', 'VIM', 'GLUL', 'RLBP1'],
      },
      {
        cellType: 'Microglia',
        color: '#14b8a6',
        fact: 'Resident immune cells of the retina, microglia become activated in DR, producing TNF, IL-1β, and complement factors. Activated states include pro-inflammatory (M1-like) and homeostatic phenotypes.',
        genes: ['CX3CR1', 'TMEM119', 'TNF', 'IL1B'],
      },
      {
        cellType: 'Endothelial Cells',
        color: '#ef4444',
        fact: 'Retinal vasculature shows early BRB breakdown, VEGF-driven angiogenesis (PDR), and pericyte loss. Endothelial cells upregulate ICAM1 and adhesion molecules enabling leukostasis.',
        genes: ['CDH5', 'VEGFA', 'ICAM1', 'ANGPT2'],
      },
      {
        cellType: 'Retinal Ganglion Cells',
        color: '#f59e0b',
        fact: 'RGCs show early apoptotic gene signatures in DR, even before clinical vascular changes. Loss of RBPMS and NEFL expression marks neurodegeneration.',
        genes: ['RBPMS', 'NEFL', 'CASP3', 'BCL2'],
      },
      {
        cellType: 'Photoreceptors',
        color: '#6366f1',
        fact: 'Rods and cones are metabolically demanding cells vulnerable to oxidative stress. Downregulation of RHO, NRL, and phototransduction genes occurs in DR, contributing to visual loss.',
        genes: ['RHO', 'NRL', 'ARR3', 'PDC'],
      },
    ]
  },
]

function Section({ section, isOpen, toggle }) {
  const Icon = section.icon
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-slate-800/50 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <Icon size={17} className="text-blue-400" />
        </div>
        <span className="text-white font-medium flex-1">{section.title}</span>
        {isOpen ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-5">
          <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">{section.content}</p>

          {section.steps && (
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Step-by-Step</div>
              <div className="space-y-2">
                {section.steps.map(s => (
                  <div key={s.n} className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{s.n}</div>
                    <span className="text-slate-300">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section.tips && (
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Tips</div>
              <div className="space-y-2">
                {section.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-400">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section.resources && (
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">External Resources</div>
              <div className="space-y-2">
                {section.resources.map(r => (
                  <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-2 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 transition-colors group">
                    <div className="flex-1">
                      <div className="text-blue-400 text-sm font-medium group-hover:text-blue-300">{r.label}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{r.desc}</div>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {section.keyFacts && (
            <div className="space-y-4">
              {section.keyFacts.map(kf => (
                <div key={kf.cellType} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: kf.color }} />
                    <span className="text-white font-medium text-sm">{kf.cellType}</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-2">{kf.fact}</p>
                  <div className="flex flex-wrap gap-1">
                    {kf.genes.map(g => (
                      <span key={g} className="text-xs font-mono bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{g}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function GuidePage() {
  const [openSections, setOpenSections] = useState(['intro', 'umap'])

  function toggle(id) {
    setOpenSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">How-To Guide</h1>
        <p className="text-slate-400">
          Learn how to navigate DR-Atlas and interpret single-cell RNA sequencing data from diabetic retinopathy studies.
        </p>
      </div>

      {/* Quick Start */}
      <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-6 mb-8">
        <h2 className="text-white font-semibold text-lg mb-3">Quick Start</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Explore Datasets', desc: 'Browse curated DR scRNA-seq datasets with links to GEO and PubMed', to: '/datasets' },
            { step: '2', title: 'Visualize Cells', desc: 'Open the UMAP explorer and color cells by type or gene expression', to: '/explorer' },
            { step: '3', title: 'Analyze Expression', desc: 'Compare gene expression with violin plots and differential expression', to: '/analysis' },
          ].map(({ step, title, desc, to }) => (
            <Link key={step} to={to}
              className="bg-slate-900/80 rounded-xl p-4 border border-slate-700 hover:border-blue-500/50 transition-colors group">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mb-3">{step}</div>
              <div className="text-white font-medium text-sm mb-1 group-hover:text-blue-300">{title}</div>
              <div className="text-slate-500 text-xs">{desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map(section => (
          <Section
            key={section.id}
            section={section}
            isOpen={openSections.includes(section.id)}
            toggle={() => toggle(section.id)}
          />
        ))}
      </div>

      <div className="mt-8 text-center text-slate-500 text-sm">
        <p>Have questions or want to contribute datasets?</p>
        <p className="mt-1">
          See the{' '}
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11214886/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            systematic review
          </a>
          {' '}for a comprehensive catalog of DR scRNA-seq datasets.
        </p>
      </div>
    </div>
  )
}
