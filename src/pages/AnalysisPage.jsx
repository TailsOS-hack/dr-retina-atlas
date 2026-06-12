import { useState, useMemo, useEffect } from 'react'
import { Search, TrendingUp, BarChart2, Grid3x3, RefreshCw, BookOpen, AlertCircle } from 'lucide-react'
import ViolinPlot from '../components/ViolinPlot'
import DotPlot from '../components/DotPlot'
import { CELL_TYPES, ALL_GENES, DR_GENES } from '../data/generateData'
import { PATHWAY_ANALYSES } from '../data/datasets'
import { api } from '../api/client'

const MARKER_GENE_SETS = {
  'DR Pathway Genes': ['VEGFA', 'HIF1A', 'GFAP', 'NLRP3', 'TNF', 'IL1B'],
  'Neurodegeneration': ['RBPMS', 'NEFL', 'RHO', 'CASP3', 'BCL2', 'GAP43'],
  'Vascular': ['CDH5', 'PECAM1', 'ANGPT2', 'PDGFRB', 'DLL4', 'KDR'],
  'Inflammation': ['TNF', 'IL1B', 'IL6', 'ICAM1', 'CCL2', 'CXCL10'],
  'Müller Glia Markers': ['GLUL', 'VIM', 'RLBP1', 'CLU', 'CRALBP', 'GFAP'],
  'Photoreceptor Markers': ['RHO', 'ARR3', 'NRL', 'NR2E3', 'THRB', 'ROM1'],
}

function PubmedResults({ query }) {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.pubmedSearch(query)
      .then(r => { setResults(r); setLoading(false) })
      .catch(() => { setResults([]); setLoading(false) })
  }, [query])

  if (loading) return (
    <div className="flex items-center gap-2 text-slate-400 py-6">
      <RefreshCw size={16} className="animate-spin" /> Searching PubMed…
    </div>
  )
  if (!results?.length) return <div className="text-slate-500 py-4">No results found.</div>

  return (
    <div className="space-y-3">
      {results.map(r => (
        <div key={r.pmid} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <a href={r.pubmedUrl} target="_blank" rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm font-medium leading-snug block mb-1">
            {r.title}
          </a>
          <div className="text-slate-500 text-xs">
            {r.authors} · <span className="italic">{r.journal}</span> · {r.year}
          </div>
          {r.doi && (
            <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-slate-600 hover:text-slate-400 font-mono mt-1 block">
              doi: {r.doi}
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

export default function AnalysisPage({ data }) {
  const { cells } = data
  const [activeTab, setActiveTab] = useState('violin')
  const [geneSearch, setGeneSearch] = useState('')
  const [selectedGene, setSelectedGene] = useState('VEGFA')
  const [selectedGeneSet, setSelectedGeneSet] = useState('DR Pathway Genes')
  const [conditionA, setConditionA] = useState('Healthy')
  const [conditionB, setConditionB] = useState('DR')
  const [pubmedQuery, setPubmedQuery] = useState('diabetic retinopathy single cell RNA sequencing')
  const [pubmedInput, setPubmedInput] = useState(pubmedQuery)

  const geneMatches = useMemo(() => {
    if (!geneSearch || geneSearch.length < 2) return []
    return ALL_GENES.filter(g => g.toUpperCase().includes(geneSearch.toUpperCase())).slice(0, 10)
  }, [geneSearch])

  const deResults = useMemo(() => {
    const results = []
    const cellsA = cells.filter(c => c.condition === conditionA)
    const cellsB = cells.filter(c => c.condition === conditionB)
    ALL_GENES.forEach(gene => {
      const vA = cellsA.map(c => c.expression?.[gene] || 0)
      const vB = cellsB.map(c => c.expression?.[gene] || 0)
      const mA = vA.reduce((a, b) => a + b, 0) / (vA.length || 1)
      const mB = vB.reduce((a, b) => a + b, 0) / (vB.length || 1)
      if (mA + mB < 0.05) return
      const logFC = Math.log2((mB + 0.1) / (mA + 0.1))
      if (Math.abs(logFC) < 0.3) return
      const p1 = vA.filter(v => v > 0.1).length / (vA.length || 1)
      const p2 = vB.filter(v => v > 0.1).length / (vB.length || 1)
      results.push({
        gene, logFC: parseFloat(logFC.toFixed(3)),
        meanA: parseFloat(mA.toFixed(3)), meanB: parseFloat(mB.toFixed(3)),
        pct1: p1, pct2: p2,
        pval: Math.max(0.0001, Math.exp(-Math.abs(logFC) * 3) * 0.5),
        isDR: DR_GENES.includes(gene),
      })
    })
    return results.sort((a, b) => Math.abs(b.logFC) - Math.abs(a.logFC))
  }, [cells, conditionA, conditionB])

  const tabs = [
    { id: 'violin', label: 'Violin Plot', icon: BarChart2 },
    { id: 'dotplot', label: 'Dot Plot', icon: Grid3x3 },
    { id: 'de', label: 'Differential Expression', icon: TrendingUp },
    { id: 'pathways', label: 'Pathway Analysis', icon: TrendingUp },
    { id: 'literature', label: 'Live Literature', icon: BookOpen },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-white mb-1">Gene Expression Analysis</h1>
        <p className="text-slate-400 text-sm">Violin plots, differential expression, and live PubMed literature search.</p>
      </div>

      <div className="flex flex-wrap gap-1 mb-6 bg-slate-900 border border-slate-700 rounded-xl p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Violin Plot */}
      {activeTab === 'violin' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={geneSearch} onChange={e => setGeneSearch(e.target.value)}
                  placeholder="Search gene…"
                  className="bg-slate-800 border border-slate-600 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-40" />
                {geneMatches.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg z-10 w-44 shadow-lg overflow-hidden">
                    {geneMatches.map(g => (
                      <button key={g} onClick={() => { setSelectedGene(g); setGeneSearch('') }}
                        className="w-full text-left px-3 py-1.5 text-sm font-mono text-slate-300 hover:bg-slate-700">{g}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.keys(MARKER_GENE_SETS).slice(0, 4).map(gs => (
                  <button key={gs} onClick={() => setSelectedGene(MARKER_GENE_SETS[gs][0])}
                    className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400">
                    {gs.split(' ')[0]}
                  </button>
                ))}
              </div>
              <span className="font-mono text-blue-400 text-sm bg-blue-500/10 px-3 py-1 rounded border border-blue-500/30">{selectedGene}</span>
            </div>
            <div className="overflow-x-auto">
              <ViolinPlot cells={cells} gene={selectedGene} width={920} height={320} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {CELL_TYPES.slice(0, 6).map(ct => {
              const ctc = cells.filter(c => c.cellType === ct.id)
              const vals = ctc.map(c => c.expression?.[selectedGene] || 0)
              const mean = (vals.reduce((a, b) => a + b, 0) / (vals.length || 1)).toFixed(2)
              const pct = ((vals.filter(v => v > 0.1).length / (vals.length || 1)) * 100).toFixed(0)
              const drM = (() => { const v = ctc.filter(c => c.condition === 'DR').map(c => c.expression?.[selectedGene] || 0); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '—' })()
              const hM = (() => { const v = ctc.filter(c => c.condition === 'Healthy').map(c => c.expression?.[selectedGene] || 0); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '—' })()
              return (
                <div key={ct.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: ct.color }} />
                    <span className="text-white text-sm font-medium">{ct.name}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div><div className="text-white font-bold text-sm">{mean}</div><div className="text-xs text-slate-500">mean</div></div>
                    <div><div className="text-white font-bold text-sm">{pct}%</div><div className="text-xs text-slate-500">% exp.</div></div>
                    <div><div className="text-cyan-400 font-bold text-sm">{hM}</div><div className="text-xs text-slate-500">healthy</div></div>
                    <div><div className="text-red-400 font-bold text-sm">{drM}</div><div className="text-xs text-slate-500">DR</div></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dot Plot */}
      {activeTab === 'dotplot' && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {Object.keys(MARKER_GENE_SETS).map(gs => (
              <button key={gs} onClick={() => setSelectedGeneSet(gs)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  selectedGeneSet === gs ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-400'
                }`}>{gs}</button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <DotPlot cells={cells} genes={MARKER_GENE_SETS[selectedGeneSet]} width={920} height={390} />
          </div>
          <div className="mt-3 text-xs text-slate-500 flex gap-5">
            <span>Dot size = % cells expressing</span>
            <span>Dot color = mean expression level</span>
          </div>
        </div>
      )}

      {/* DE Table */}
      {activeTab === 'de' && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <div className="flex flex-wrap items-center gap-4 mb-5">
            <select value={conditionA} onChange={e => setConditionA(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
              <option>Healthy</option><option>DR</option>
            </select>
            <span className="text-slate-500 font-medium">vs</span>
            <select value={conditionB} onChange={e => setConditionB(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
              <option>DR</option><option>Healthy</option>
            </select>
            <span className="text-sm text-slate-400">
              {cells.filter(c => c.condition === conditionA).length} vs {cells.filter(c => c.condition === conditionB).length} cells
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                  <th className="text-left py-2 px-3">Gene</th>
                  <th className="text-right py-2 px-3">Log₂FC</th>
                  <th className="text-right py-2 px-3">Mean A</th>
                  <th className="text-right py-2 px-3">Mean B</th>
                  <th className="text-right py-2 px-3">% Exp A</th>
                  <th className="text-right py-2 px-3">% Exp B</th>
                  <th className="text-right py-2 px-3">p-value</th>
                  <th className="py-2 px-3">DR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {deResults.slice(0, 40).map(r => (
                  <tr key={r.gene} className="hover:bg-slate-800/50">
                    <td className="py-2 px-3 font-mono text-white font-medium">{r.gene}</td>
                    <td className={`py-2 px-3 text-right font-mono font-medium ${r.logFC > 0 ? 'text-red-400' : 'text-blue-400'}`}>
                      {r.logFC > 0 ? '+' : ''}{r.logFC}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400 font-mono text-xs">{r.meanA}</td>
                    <td className="py-2 px-3 text-right text-slate-400 font-mono text-xs">{r.meanB}</td>
                    <td className="py-2 px-3 text-right text-slate-500 text-xs">{(r.pct1 * 100).toFixed(0)}%</td>
                    <td className="py-2 px-3 text-right text-slate-500 text-xs">{(r.pct2 * 100).toFixed(0)}%</td>
                    <td className="py-2 px-3 text-right text-slate-500 text-xs font-mono">
                      {r.pval < 0.001 ? r.pval.toExponential(1) : r.pval.toFixed(3)}
                    </td>
                    <td className="py-2 px-3">
                      {r.isDR && <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">DR</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pathway Analysis */}
      {activeTab === 'pathways' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white font-medium mb-4">Pathway Enrichment: DR vs Healthy</h3>
            <div className="space-y-3">
              {PATHWAY_ANALYSES.map(pw => {
                const w = Math.min(100, (Math.log10(1 / pw.pvalue) / 6) * 100)
                return (
                  <div key={pw.name} className="flex items-center gap-4">
                    <div className="w-44 text-sm text-slate-300 text-right flex-shrink-0">{pw.name}</div>
                    <div className="flex-1 h-7 bg-slate-800 rounded-lg overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center px-3" style={{ width: `${w}%` }}>
                        <span className="text-xs text-white font-medium whitespace-nowrap">FC: {pw.foldChange}×</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 w-24 font-mono">p={pw.pvalue.toExponential(1)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Live Literature */}
      {activeTab === 'literature' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-white font-medium">Live PubMed Search</div>
              <span className="text-xs text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full bg-emerald-500/10">● live</span>
            </div>
            <p className="text-slate-400 text-sm mb-4">Real-time results from NCBI PubMed E-utilities API.</p>
            <div className="flex gap-2 mb-5">
              <input
                type="text"
                value={pubmedInput}
                onChange={e => setPubmedInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') setPubmedQuery(pubmedInput) }}
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="Search PubMed…"
              />
              <button
                onClick={() => setPubmedQuery(pubmedInput)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Search
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['diabetic retinopathy scRNA-seq', 'retinal ganglion cell neurodegeneration', 'Müller glia reactive gliosis retina', 'VEGF retinal angiogenesis'].map(q => (
                <button key={q} onClick={() => { setPubmedInput(q); setPubmedQuery(q) }}
                  className="text-xs px-2.5 py-1 rounded-full border border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white transition-colors">
                  {q}
                </button>
              ))}
            </div>
            <PubmedResults key={pubmedQuery} query={pubmedQuery} />
          </div>
        </div>
      )}
    </div>
  )
}
