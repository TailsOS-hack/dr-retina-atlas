import { useState, useMemo, useEffect, useCallback } from 'react'
import { Search, SlidersHorizontal, Info, Layers, RefreshCw, Database, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import UMAPPlot from '../components/UMAPPlot'
import { api } from '../api/client'
import { CELL_TYPES, ALL_GENES } from '../data/generateData'

const COLOR_MODES = [
  { id: 'cellType', label: 'Cell Type' },
  { id: 'condition', label: 'Condition / Disease' },
  { id: 'expression', label: 'Gene Expression' },
]

// E-MTAB-9061 is the primary real DR dataset (7970 cells from EBI SCEA)
const EMTAB_DS = {
  id: 'emtab9061',
  cxgId: 'emtab9061',
  title: 'Akimba Diabetic Retinopathy (E-MTAB-9061)',
  organism: 'Mus musculus',
  tissue: 'retina',
  disease: 'diabetic retinopathy',
  cellCount: 7970,
  isDR: true,
  source: 'ebi_scea',
}

// Map raw CELLxGENE cell_type strings → our color palette
const TYPE_COLORS = {
  'rod photoreceptor cell': '#6366f1',
  'cone photoreceptor cell': '#8b5cf6',
  'Müller cell': '#10b981', 'muller': '#10b981', 'müller': '#10b981',
  'retinal ganglion cell': '#f59e0b',
  'bipolar cell': '#3b82f6', 'rod bipolar cell': '#3b82f6',
  'amacrine cell': '#ec4899',
  'horizontal cell': '#f97316',
  'endothelial cell': '#ef4444',
  'pericyte': '#dc2626',
  'microglial cell': '#14b8a6', 'microglia': '#14b8a6',
  'astrocyte': '#84cc16',
  'retinal pigment epithelial cell': '#a855f7',
}
const PALETTE = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#3b82f6','#ec4899','#f97316','#ef4444','#14b8a6','#84cc16','#a855f7','#64748b','#0ea5e9','#f43f5e']

function assignColors(cells) {
  const map = {}
  let idx = 0
  return cells.map(c => {
    const key = (c.cellType || '').toLowerCase()
    const color = TYPE_COLORS[key] ||
      Object.entries(TYPE_COLORS).find(([k]) => key.includes(k))?.[1] ||
      (map[c.cellType] ?? (map[c.cellType] = PALETTE[idx++ % PALETTE.length]))
    return { ...c, color }
  })
}

function buildLegend(cells) {
  const map = {}
  cells.forEach(c => {
    if (!map[c.cellType]) map[c.cellType] = { name: c.cellType, color: c.color, count: 0 }
    map[c.cellType].count++
  })
  return Object.values(map).sort((a, b) => b.count - a.count)
}

function DataSourceBanner({ source, dataSource, datasetTitle, onSwitch }) {
  const isEBI = dataSource === 'ebi_scea'
  const bgClass = source === 'live'
    ? isEBI ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg text-xs border mb-4 ${bgClass}`}>
      <div className="flex items-center gap-2">
        {source === 'live' ? <Wifi size={13} /> : <WifiOff size={13} />}
        {source === 'live'
          ? <>
              {isEBI ? 'EBI SCEA · ' : 'CXG · '}
              <span className="font-medium text-white truncate max-w-xs">{datasetTitle}</span>
              {isEBI && <span className="ml-1 text-blue-300 opacity-70">7,970 real DR cells</span>}
            </>
          : <>Demo data · loading real data…</>
        }
      </div>
      <button onClick={onSwitch} className="underline opacity-70 hover:opacity-100 flex-shrink-0">
        switch dataset
      </button>
    </div>
  )
}

export default function ExplorerPage({ data: demoData }) {
  const { cells: demoCells, genes } = demoData

  // Available datasets — E-MTAB-9061 always first, then CXG
  const [availableDatasets, setAvailableDatasets] = useState([EMTAB_DS])
  const [selectedDatasetId, setSelectedDatasetId] = useState('emtab9061')
  const [showDatasetPicker, setShowDatasetPicker] = useState(false)

  // Live cell data
  const [liveCells, setLiveCells] = useState(null)
  const [liveExpression, setLiveExpression] = useState(null) // {gene, values[]}
  const [cellsLoading, setCellsLoading] = useState(false)
  const [cellsError, setCellsError] = useState(null)
  const [exprLoading, setExprLoading] = useState(false)

  // UI state
  const [colorBy, setColorBy] = useState('cellType')
  const [geneSearch, setGeneSearch] = useState('')
  const [selectedGene, setSelectedGene] = useState('VEGFA')
  const [highlightTypes, setHighlightTypes] = useState([])
  const [selectedCells, setSelectedCells] = useState(null)
  const [conditionFilter, setConditionFilter] = useState('all')

  // Fetch CELLxGENE datasets in background (prepend EMTAB_DS always)
  useEffect(() => {
    api.retinalDatasets()
      .then(ds => {
        const explorable = ds.filter(d => d.cxgId)
        setAvailableDatasets([EMTAB_DS, ...explorable])
      })
      .catch(() => {})
  }, [])

  // Fetch UMAP + cell metadata when dataset changes
  useEffect(() => {
    if (!selectedDatasetId) return
    setCellsLoading(true)
    setCellsError(null)
    setLiveCells(null)
    setLiveExpression(null)

    const fetchFn = selectedDatasetId === 'emtab9061'
      ? api.emtabCells()
      : api.datasetCells(selectedDatasetId)

    fetchFn
      .then(result => {
        const colored = assignColors(result.cells)
        setLiveCells({ ...result, cells: colored })
        setCellsLoading(false)
      })
      .catch(err => {
        setCellsError(err.message)
        setCellsLoading(false)
      })
  }, [selectedDatasetId])

  // Fetch gene expression when gene/dataset changes
  useEffect(() => {
    if (!selectedDatasetId || colorBy !== 'expression') return
    setExprLoading(true)
    setLiveExpression(null)

    const fetchFn = selectedDatasetId === 'emtab9061'
      ? api.emtabExpression(selectedGene)
      : api.datasetExpression(selectedDatasetId, selectedGene)

    fetchFn
      .then(result => { setLiveExpression(result); setExprLoading(false) })
      .catch(() => setExprLoading(false))
  }, [selectedDatasetId, selectedGene, colorBy])

  // Merge expression values into cells
  const displayCells = useMemo(() => {
    const base = liveCells?.cells || demoCells

    let cells = base
    if (conditionFilter !== 'all') {
      cells = cells.filter(c => {
        const d = (c.disease || c.condition || '').toLowerCase()
        if (conditionFilter === 'DR') return d.includes('diabet') || d === 'dr'
        if (conditionFilter === 'Healthy') return d === 'normal' || d === 'healthy' || d === ''
        return true
      })
    }

    if (colorBy === 'expression' && liveExpression?.values?.length) {
      const vals = liveExpression.values
      return cells.map((c, i) => ({
        ...c,
        expression: { ...(c.expression || {}), [selectedGene]: vals[c.id ?? i] ?? 0 },
      }))
    }
    return cells
  }, [liveCells, demoCells, conditionFilter, colorBy, liveExpression, selectedGene])

  const legend = useMemo(() => buildLegend(displayCells), [displayCells])
  const source = liveCells ? 'live' : 'demo'
  const selectedDataset = availableDatasets.find(d => d.cxgId === selectedDatasetId)

  const geneMatches = useMemo(() => {
    if (!geneSearch || geneSearch.length < 2) return []
    const q = geneSearch.toUpperCase()
    return ALL_GENES.filter(g => g.includes(q)).slice(0, 10)
  }, [geneSearch])

  function toggleType(name) {
    setHighlightTypes(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  const selectionSummary = useMemo(() => {
    if (!selectedCells?.length) return null
    const map = {}
    selectedCells.forEach(c => {
      if (!map[c.cellType]) map[c.cellType] = { name: c.cellType, color: c.color, count: 0 }
      map[c.cellType].count++
    })
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [selectedCells])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Cell Explorer</h1>
        <p className="text-slate-400 text-sm">
          Real-time UMAP visualization from CELLxGENE-hosted retinal datasets.
        </p>
      </div>

      <DataSourceBanner
        source={source}
        dataSource={liveCells?.source}
        datasetTitle={selectedDataset?.title || ''}
        onSwitch={() => setShowDatasetPicker(true)}
      />

      {/* Dataset picker modal */}
      {showDatasetPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">Choose Dataset</h2>
              <button onClick={() => setShowDatasetPicker(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="space-y-2">
              {availableDatasets.map(d => (
                <button
                  key={d.cxgId}
                  onClick={() => { setSelectedDatasetId(d.cxgId); setShowDatasetPicker(false) }}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    d.cxgId === selectedDatasetId
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {d.source === 'ebi_scea' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">EBI SCEA</span>
                        )}
                        {d.isDR && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0">DR</span>
                        )}
                      </div>
                      <div className="text-white text-sm font-medium leading-snug">{d.title}</div>
                      <div className="text-slate-400 text-xs mt-1">
                        {d.organism} · {d.tissue} · {d.disease || 'normal'}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-white font-bold text-sm">{d.cellCount.toLocaleString()}</div>
                      <div className="text-xs text-slate-500">cells</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 flex-wrap md:flex-nowrap">
        {/* Left panel */}
        <div className="w-full md:w-60 flex-shrink-0 space-y-4">
          {/* Color by */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Color By</div>
            {COLOR_MODES.map(m => (
              <button key={m.id} onClick={() => setColorBy(m.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${colorBy === m.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Gene search */}
          {colorBy === 'expression' && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                Gene {exprLoading && <RefreshCw size={10} className="inline animate-spin ml-1" />}
              </div>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={geneSearch} onChange={e => setGeneSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500" />
              </div>
              {geneMatches.length > 0 && (
                <div className="mt-1 bg-slate-800 border border-slate-600 rounded-lg overflow-hidden z-10">
                  {geneMatches.map(g => (
                    <button key={g} onClick={() => { setSelectedGene(g); setGeneSearch('') }}
                      className={`w-full text-left px-3 py-1.5 text-sm font-mono hover:bg-slate-700 ${selectedGene === g ? 'text-blue-400' : 'text-slate-300'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">Showing:</span>
                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{selectedGene}</span>
              </div>
            </div>
          )}

          {/* Condition filter */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Condition</div>
            {[
              { v: 'all', label: 'All', count: (liveCells?.cells || demoCells).length },
              { v: 'Healthy', label: 'Healthy / Normal' },
              { v: 'DR', label: 'Diabetic Retinopathy' },
            ].map(({ v, label, count }) => (
              <button key={v} onClick={() => setConditionFilter(v)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${conditionFilter === v ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                {label}
                {count !== undefined && <span className="float-right text-xs opacity-60">{count.toLocaleString()}</span>}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cell Types</div>
              {highlightTypes.length > 0 && (
                <button onClick={() => setHighlightTypes([])} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                  <RefreshCw size={9} /> clear
                </button>
              )}
            </div>
            <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
              {legend.map(({ name, color, count }) => (
                <button key={name} onClick={() => toggleType(name)}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-slate-800 ${
                    highlightTypes.length === 0 || highlightTypes.includes(name) ? 'opacity-100' : 'opacity-30'
                  }`}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-slate-300 flex-1 text-left truncate">{name}</span>
                  <span className="text-slate-500 flex-shrink-0">{count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* UMAP panel */}
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Layers size={14} className="text-blue-400" />
              UMAP · {displayCells.length.toLocaleString()} cells
              {cellsLoading && <RefreshCw size={13} className="animate-spin text-blue-400 ml-1" />}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDatasetPicker(true)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 transition-colors">
                <Database size={11} /> Change dataset
              </button>
              <div className="text-xs text-slate-600 flex items-center gap-1">
                <Info size={11} /> Drag to select
              </div>
            </div>
          </div>

          <div className="p-2 flex justify-center items-center" style={{ minHeight: 460 }}>
            {cellsLoading ? (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <RefreshCw size={28} className="animate-spin text-blue-400" />
                <div className="text-sm">
                  {selectedDatasetId === 'emtab9061'
                    ? 'Loading 7,970 real DR cells from EBI SCEA…'
                    : 'Loading cell data from CELLxGENE…'}
                </div>
                <div className="text-xs text-slate-500">
                  {selectedDatasetId === 'emtab9061'
                    ? 'First load fetches ~7 MB from EBI FTP — cached for 1 hour'
                    : 'This may take a moment for large datasets'}
                </div>
              </div>
            ) : cellsError ? (
              <div className="flex flex-col items-center gap-3 text-slate-400 px-8 text-center">
                <AlertCircle size={28} className="text-amber-400" />
                <div className="text-sm">Could not load live data for this dataset</div>
                <div className="text-xs text-slate-500 font-mono bg-slate-800 rounded px-2 py-1">{cellsError}</div>
                <div className="text-xs text-slate-500">Showing demo visualization instead</div>
                <UMAPPlot cells={displayCells} colorBy={colorBy} selectedGene={colorBy === 'expression' ? selectedGene : null}
                  highlightCellTypes={highlightTypes.length ? highlightTypes : null}
                  onCellsSelected={setSelectedCells} width={560} height={400} />
              </div>
            ) : (
              <UMAPPlot
                cells={displayCells}
                colorBy={colorBy}
                selectedGene={colorBy === 'expression' ? selectedGene : null}
                highlightCellTypes={highlightTypes.length ? highlightTypes : null}
                onCellsSelected={setSelectedCells}
                width={560}
                height={460}
              />
            )}
          </div>

          {colorBy === 'expression' && selectedGene && (
            <div className="px-4 pb-3 flex items-center gap-3">
              <span className="text-xs text-slate-500">Low</span>
              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'linear-gradient(to right, #ffffcc, #ff7f00, #800026)' }} />
              <span className="text-xs text-slate-500">High</span>
              <span className="text-xs text-slate-400 ml-1 font-mono">{selectedGene}</span>
              {liveExpression && <span className="text-xs text-emerald-400">● live</span>}
            </div>
          )}
          {colorBy === 'condition' && (
            <div className="px-4 pb-3 flex gap-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><div className="w-3 h-3 rounded-full bg-cyan-400" /> Healthy</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><div className="w-3 h-3 rounded-full bg-red-400" /> DR</div>
            </div>
          )}
        </div>
      </div>

      {/* Selection summary */}
      {selectedCells?.length > 0 && (
        <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-white font-medium flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-blue-400" />
              Selection: {selectedCells.length.toLocaleString()} cells
            </div>
            <button onClick={() => setSelectedCells(null)} className="text-slate-500 hover:text-slate-300 text-sm">Clear</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {selectionSummary.slice(0, 8).map(item => (
              <div key={item.name} className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-white text-xs font-medium truncate">{item.name}</span>
                </div>
                <div className="text-xl font-bold text-white">{item.count}</div>
                <div className="text-xs text-slate-500">{((item.count / selectedCells.length) * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
