import { useState, useMemo, useEffect } from 'react'
import { ExternalLink, Search, Filter, Database, Users, FlaskConical, BookOpen, RefreshCw, Wifi, WifiOff, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../api/client'

function StatusBadge({ live }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
      live
        ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
        : 'text-slate-400 border-slate-600 bg-slate-800'
    }`}>
      {live ? <Wifi size={11} /> : <WifiOff size={11} />}
      {live ? 'Live — CELLxGENE' : 'Curated list'}
    </span>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={24} className="animate-spin text-blue-400" />
      <span className="ml-3 text-slate-400">Fetching from CELLxGENE &amp; NCBI…</span>
    </div>
  )
}

function DatasetCard({ d, isLive }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl p-5 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {d.isDR ? (
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                Diabetic Retinopathy
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {d.disease || 'Healthy / Other'}
              </span>
            )}
            {d.organism && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-600">
                {d.organism}
              </span>
            )}
            {d.assay && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-600">
                {d.assay.split(',')[0]}
              </span>
            )}
            {isLive && (
              <span className="text-xs text-emerald-500 font-medium">● live</span>
            )}
          </div>

          <h3 className="text-white font-semibold text-sm mb-1 leading-snug">{d.title}</h3>

          {d.tissue && (
            <p className="text-slate-500 text-xs mb-1">
              Tissue: <span className="text-slate-400">{d.tissue}</span>
            </p>
          )}

          {d.citation && expanded && (
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">{d.citation}</p>
          )}

          {d.citation && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 mt-1"
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? 'less' : 'citation'}
            </button>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {d.cellCount > 0 && (
            <div className="bg-slate-800 rounded-lg px-4 py-2 text-center">
              <div className="text-lg font-bold text-white">{d.cellCount.toLocaleString()}</div>
              <div className="text-xs text-slate-500">cells</div>
            </div>
          )}
          <div className="flex flex-col gap-1.5 w-full">
            {d.explorerUrl && (
              <a href={d.explorerUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg px-3 py-1.5 transition-colors">
                <ExternalLink size={11} /> CXG Explorer
              </a>
            )}
            {d.accession && (
              <a href={`https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=${d.accession}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 transition-colors">
                <ExternalLink size={11} /> {d.accession}
              </a>
            )}
            {d.pubmedUrl && (
              <a href={d.pubmedUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 transition-colors">
                <ExternalLink size={11} /> PubMed
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Curated fallback list (shown if API fails or while loading)
const CURATED = [
  { id: 'c1', title: 'Human Retinal Cell Atlas (Menon et al. 2019)', organism: 'Homo sapiens', tissue: 'retina', disease: 'normal', assay: '10x Chromium', cellCount: 20009, isDR: false, accession: 'GSE137537', pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/31840053/' },
  { id: 'c2', title: 'Transcriptomic Landscape of DR (Yan et al. 2020)', organism: 'Homo sapiens', tissue: 'retina', disease: 'diabetic retinopathy', assay: '10x Chromium', cellCount: 14882, isDR: true, accession: 'GSE148077', pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/33051460/' },
  { id: 'c3', title: 'scRNA-seq of Diabetic Retinopathy (Zhang et al. 2021)', organism: 'Mus musculus', tissue: 'retina', disease: 'diabetic retinopathy', assay: 'Drop-seq', cellCount: 11254, isDR: true, accession: 'GSE162496', pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/33903131/' },
  { id: 'c4', title: 'Müller Glia Reprogramming in PDR (Kim et al. 2023)', organism: 'Homo sapiens', tissue: 'retina', disease: 'proliferative diabetic retinopathy', assay: '10x Chromium', cellCount: 16345, isDR: true, accession: 'GSE207398', pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/36949162/' },
  { id: 'c5', title: 'Endothelial Heterogeneity in DR (Liu et al. 2022)', organism: 'Homo sapiens', tissue: 'retina', disease: 'diabetic retinopathy', assay: '10x Chromium', cellCount: 12067, isDR: true, accession: 'GSE179317', pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/35175935/' },
  { id: 'c6', title: 'Photoreceptors in Early DR (Tao et al. 2022)', organism: 'Rattus norvegicus', tissue: 'retina', disease: 'diabetic retinopathy', assay: '10x Chromium', cellCount: 9854, isDR: true, accession: 'GSE183489', pubmedUrl: 'https://pubmed.ncbi.nlm.nih.gov/35148845/' },
]

export default function DatasetsPage() {
  const [cxgDatasets, setCxgDatasets] = useState([])
  const [ncbiResults, setNcbiResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [drOnly, setDrOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('cxg')

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      api.retinalDatasets(),
      api.geoSearch('diabetic retinopathy single cell RNA sequencing retina'),
    ]).then(([cxgR, geoR]) => {
      if (cxgR.status === 'fulfilled') setCxgDatasets(cxgR.value)
      else setError('CELLxGENE API unavailable — showing curated list')
      if (geoR.status === 'fulfilled') setNcbiResults(geoR.value)
      setLoading(false)
    })
  }, [])

  const displayDatasets = useMemo(() => {
    const source = activeTab === 'cxg'
      ? (cxgDatasets.length > 0 ? cxgDatasets : CURATED)
      : ncbiResults.map(d => ({
          id: d.uid,
          title: d.title,
          organism: d.organism,
          tissue: 'retina',
          disease: '',
          assay: d.gdsType,
          cellCount: d.sampleCount,
          isDR: (d.title || '').toLowerCase().includes('diabet'),
          accession: d.accession,
          pubmedUrl: d.pmids?.[0] ? `https://pubmed.ncbi.nlm.nih.gov/${d.pmids[0]}/` : null,
          citation: d.summary,
        }))

    return source.filter(d => {
      const q = search.toLowerCase()
      const matchQ =
        !q ||
        (d.title || '').toLowerCase().includes(q) ||
        (d.organism || '').toLowerCase().includes(q) ||
        (d.disease || '').toLowerCase().includes(q)
      const matchDR = !drOnly || d.isDR
      return matchQ && matchDR
    })
  }, [activeTab, cxgDatasets, ncbiResults, search, drOnly])

  const isLive = cxgDatasets.length > 0

  const totalCells = displayDatasets.reduce((s, d) => s + (Number(d.cellCount) || 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Dataset Browser</h1>
            <p className="text-slate-400 text-sm">
              Real-time data from{' '}
              <a href="https://cellxgene.cziscience.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">CELLxGENE Discover</a>
              {' '}and{' '}
              <a href="https://www.ncbi.nlm.nih.gov/geo/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">NCBI GEO</a>
            </p>
          </div>
          <StatusBadge live={isLive} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Datasets', value: displayDatasets.length, icon: Database },
          { label: 'Total Cells', value: totalCells > 0 ? totalCells.toLocaleString() : '—', icon: Users },
          { label: 'DR Datasets', value: displayDatasets.filter(d => d.isDR).length, icon: FlaskConical },
          { label: 'Source', value: isLive ? 'Live API' : 'Curated', icon: BookOpen },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-center">
            <Icon size={17} className="text-blue-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-900 border border-slate-700 rounded-xl p-1 w-fit">
        {[
          { id: 'cxg', label: `CELLxGENE${isLive ? ` (${cxgDatasets.length})` : ' (curated)'}` },
          { id: 'ncbi', label: `NCBI GEO${ncbiResults.length > 0 ? ` (${ncbiResults.length})` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${activeTab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search title, species, disease…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-8 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => setDrOnly(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
            drOnly ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'border-slate-600 text-slate-400 hover:border-slate-400'
          }`}
        >
          <Filter size={13} /> DR only
        </button>
        {(search || drOnly) && (
          <button onClick={() => { setSearch(''); setDrOnly(false) }} className="text-xs text-slate-500 hover:text-slate-300">
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg px-4 py-3 text-sm mb-5 flex items-center gap-2">
          <WifiOff size={15} /> {error}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="text-sm text-slate-500 mb-3">Showing {displayDatasets.length} datasets</div>
          <div className="space-y-3">
            {displayDatasets.map(d => (
              <DatasetCard key={d.id} d={d} isLive={isLive && activeTab === 'cxg'} />
            ))}
            {displayDatasets.length === 0 && (
              <div className="text-center text-slate-500 py-16">No datasets match your filters.</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
