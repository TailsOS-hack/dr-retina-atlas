import { Link } from 'react-router-dom'
import { Database, Microscope, BarChart3, BookOpen, ArrowRight, Eye, Activity, Users, FlaskConical } from 'lucide-react'

const stats = [
  { label: 'DR Datasets', value: '9', icon: Database },
  { label: 'Total Cells', value: '134K+', icon: Activity },
  { label: 'Cell Types', value: '12', icon: Users },
  { label: 'Species', value: '4', icon: FlaskConical },
]

const features = [
  {
    icon: Microscope,
    title: 'Interactive UMAP Explorer',
    description: 'Visualize cell clusters colored by type, condition, or gene expression. Lasso-select cells to compare subpopulations.',
    to: '/explorer',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: BarChart3,
    title: 'Gene Expression Analysis',
    description: 'Violin plots, dot plots, and differential expression between healthy and diabetic retinas across 12 retinal cell types.',
    to: '/analysis',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Database,
    title: 'Dataset Browser',
    description: 'Curated collection of 9 published DR scRNA-seq datasets with direct links to GEO, PubMed, and DOIs.',
    to: '/datasets',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: BookOpen,
    title: 'How-To Guide',
    description: 'Step-by-step tutorials for interpreting UMAP plots, selecting genes of interest, and running differential expression.',
    to: '/guide',
    color: 'from-orange-500 to-amber-500',
  },
]

const cellTypes = [
  { name: 'Rod Photoreceptors', color: '#6366f1', pct: '29%' },
  { name: 'Bipolar Cells', color: '#3b82f6', pct: '19%' },
  { name: 'Amacrine Cells', color: '#ec4899', pct: '12%' },
  { name: 'Müller Glia', color: '#10b981', pct: '14%' },
  { name: 'Retinal Ganglion Cells', color: '#f59e0b', pct: '10%' },
  { name: 'Cone Photoreceptors', color: '#8b5cf6', pct: '8%' },
  { name: 'Others', color: '#64748b', pct: '8%' },
]

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-6">
          <Eye size={14} />
          Diabetic Retinopathy Single-Cell Atlas
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Explore scRNA-seq Data<br />
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            for Diabetic Retinopathy
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
          A user-friendly web browser interface for analyzing single-cell RNA sequencing
          datasets from diabetic retinopathy studies — inspired by Spectacle, built for DR research.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/explorer"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Microscope size={18} />
            Open Cell Explorer
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/datasets"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors border border-slate-600"
          >
            <Database size={18} />
            Browse Datasets
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-slate-900 border border-slate-700 rounded-xl p-5 text-center">
            <Icon size={20} className="text-blue-400 mx-auto mb-2" />
            <div className="text-3xl font-bold text-white">{value}</div>
            <div className="text-sm text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-2 gap-6 mb-16">
        {features.map(({ icon: Icon, title, description, to, color }) => (
          <Link
            key={to}
            to={to}
            className="group bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl p-6 transition-all hover:bg-slate-800"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
              <Icon size={22} className="text-white" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-blue-300 transition-colors">
              {title}
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
            <div className="flex items-center gap-1 text-blue-400 text-sm mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              Explore <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>

      {/* Cell Type Overview */}
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4">Retinal Cell Types</h2>
          <div className="space-y-3">
            {cellTypes.map(({ name, color, pct }) => (
              <div key={name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 text-sm text-slate-300">{name}</div>
                <div className="text-sm text-slate-500">{pct}</div>
                <div className="w-20 bg-slate-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ background: color, width: pct }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4">About This Resource</h2>
          <div className="space-y-4 text-sm text-slate-400">
            <p>
              DR-Atlas provides a centralized, browser-based interface for exploring
              single-cell RNA sequencing data from diabetic retinopathy studies — filling
              a critical gap identified in recent reviews of the field.
            </p>
            <p>
              Inspired by Spectacle (the single-cell eye database), this tool brings the
              same user-friendly exploration capabilities specifically to DR datasets,
              enabling researchers to compare healthy vs. diseased retinas at single-cell resolution.
            </p>
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
              <div className="text-white text-xs font-medium mb-1">Reference Review</div>
              <div className="text-slate-400 text-xs">
                Based on datasets identified in:{' '}
                <a
                  href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11214886/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  PMC11214886
                </a>
                {' '}— a systematic review of scRNA-seq studies in diabetic retinopathy.
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
              <div className="text-white text-xs font-medium mb-1">Related Resource</div>
              <div className="text-slate-400 text-xs">
                Spectacle single-cell eye database:{' '}
                <a
                  href="https://singlecell-eye.org/app/spectacle/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  singlecell-eye.org
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key DR Findings */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-8 mb-16">
        <h2 className="text-white font-semibold text-xl mb-6 text-center">Key Findings from DR scRNA-seq Studies</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: 'Neurodegeneration',
              detail: 'Retinal ganglion cell and photoreceptor loss detected in early DR before clinical vascular changes',
              genes: ['RBPMS', 'RHO', 'NEFL'],
              color: 'border-amber-500/40',
            },
            {
              title: 'Glial Activation',
              detail: 'Müller glia and astrocytes exhibit reactive gliosis with upregulation of inflammatory mediators',
              genes: ['GFAP', 'VIM', 'GLUL'],
              color: 'border-emerald-500/40',
            },
            {
              title: 'Vascular Pathology',
              detail: 'Endothelial cells and pericytes show breakdown of blood-retinal barrier integrity in PDR',
              genes: ['VEGFA', 'ANGPT2', 'CDH5'],
              color: 'border-red-500/40',
            },
          ].map(({ title, detail, genes, color }) => (
            <div key={title} className={`bg-slate-800/50 border ${color} rounded-lg p-5`}>
              <h3 className="text-white font-medium mb-2">{title}</h3>
              <p className="text-slate-400 text-sm mb-3">{detail}</p>
              <div className="flex flex-wrap gap-1">
                {genes.map(g => (
                  <span key={g} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">{g}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center text-slate-500 text-sm pb-8">
        <p>DR-Atlas | Diabetic Retinopathy Single-Cell RNA-seq Data Explorer</p>
        <p className="mt-1">Demo visualization with synthetic data based on published DR scRNA-seq literature</p>
      </footer>
    </div>
  )
}
