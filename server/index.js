import express from 'express'
import cors from 'cors'
import axios from 'axios'
import NodeCache from 'node-cache'

const app = express()
const cache = new NodeCache({ stdTTL: 3600 }) // 1-hour cache

app.use(cors())
app.use(express.json())

const CXG_API = 'https://api.cellxgene.cziscience.com'
const NCBI = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

// ---------- helpers ----------

function extractCxgId(explorerUrl) {
  if (!explorerUrl) return null
  const m = explorerUrl.match(/\/e\/([^/]+?)(?:\.cxg)?\/?\s*$/)
  return m ? m[1].replace(/\.cxg$/, '') : null
}

function explorerBase(cxgId) {
  return `${CXG_API}/cellxgene/e/${cxgId}.cxg/api/v0.2`
}

async function fetchJSON(url, params = {}, timeoutMs = 30000) {
  const resp = await axios.get(url, {
    params,
    timeout: timeoutMs,
    headers: { Accept: 'application/json' },
  })
  return resp.data
}

// Retinal tissue ontology IDs (UBERON)
const RETINAL_TERMS = new Set([
  'UBERON:0000966', // retina
  'UBERON:0001789', // choroid
  'UBERON:0004548', // eye
  'UBERON:0000020', // sense organ
])
const EYE_KW = ['retina', 'retinal', 'macula', 'fovea', 'choroid', 'optic', 'photoreceptor']
const DR_KW = ['diabetic retinopathy', 'diabetic macular', 'diabetic retinal', 'diabetic']

function isRetinal(d) {
  return (d.tissue || []).some(
    t =>
      RETINAL_TERMS.has(t.ontology_term_id) ||
      EYE_KW.some(k => (t.label || '').toLowerCase().includes(k))
  )
}

function isDR(d) {
  return (d.disease || []).some(dd =>
    DR_KW.some(k => (dd.label || '').toLowerCase().includes(k))
  )
}

// ---------- /api/health ----------
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// ---------- /api/datasets/retinal ----------
app.get('/api/datasets/retinal', async (_req, res) => {
  const KEY = 'cxg:retinal'
  const hit = cache.get(KEY)
  if (hit) return res.json(hit)

  try {
    console.log('[CXG] fetching dataset index...')
    const all = await fetchJSON(`${CXG_API}/dp/v1/datasets/index`, {}, 45000)
    console.log(`[CXG] total datasets: ${all.length}`)

    const retinal = all.filter(isRetinal).map(d => ({
      id: d.id,
      versionId: d.dataset_version_id,
      cxgId: extractCxgId(d.explorer_url),
      explorerUrl: d.explorer_url || null,
      title: d.name || d.title || 'Untitled',
      tissue: (d.tissue || []).map(t => t.label).join(', '),
      disease: (d.disease || []).map(dd => dd.label).join(', '),
      organism: (d.organism || []).map(o => o.label).join(', '),
      assay: (d.assay || []).map(a => a.label).join(', '),
      cellCount: d.cell_count || 0,
      collectionId: d.collection_id,
      isDR: isDR(d),
      citation: d.citation || null,
    }))

    console.log(`[CXG] retinal datasets: ${retinal.length}`)
    cache.set(KEY, retinal)
    res.json(retinal)
  } catch (err) {
    console.error('[CXG] dataset index error:', err.message)
    res.status(502).json({ error: `CXG API error: ${err.message}` })
  }
})

// ---------- /api/datasets/:cxgId/schema ----------
app.get('/api/datasets/:cxgId/schema', async (req, res) => {
  const { cxgId } = req.params
  const KEY = `schema:${cxgId}`
  const hit = cache.get(KEY)
  if (hit) return res.json(hit)

  try {
    const data = await fetchJSON(`${explorerBase(cxgId)}/schema`)
    cache.set(KEY, data)
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// ---------- /api/datasets/:cxgId/cells ----------
// Returns UMAP coordinates + key obs metadata combined
app.get('/api/datasets/:cxgId/cells', async (req, res) => {
  const { cxgId } = req.params
  const KEY = `cells:${cxgId}`
  const hit = cache.get(KEY)
  if (hit) return res.json(hit)

  try {
    const base = explorerBase(cxgId)

    // 1. fetch schema to know available columns
    console.log(`[CXG] fetching schema for ${cxgId}`)
    const schema = await fetchJSON(`${base}/schema`)
    const obsFields = schema?.schema?.obs?.columns?.map(c => c.name) || []
    console.log(`[CXG] obs columns: ${obsFields.slice(0, 10).join(', ')}`)

    const want = ['cell_type', 'author_cell_type', 'tissue', 'disease', 'sex', 'assay'].filter(f =>
      obsFields.includes(f)
    )

    // 2. fetch UMAP layout
    console.log(`[CXG] fetching layout for ${cxgId}`)
    const layout = await fetchJSON(`${base}/layout/obs`)

    // 3. fetch obs metadata
    console.log(`[CXG] fetching obs for ${cxgId} (fields: ${want.join(',')})`)
    const obsData = await fetchJSON(`${base}/obs`, { fields: want.join(',') })

    // Parse layout — handle multiple known formats
    let coords = [] // [{x, y}]
    const lo = layout?.layout?.obs
    if (lo) {
      // format: {layout:{obs:{X_umap:{coordinates:[[x,y],...]}}}}
      const embed = lo.X_umap || lo.X_tsne || lo.umap || Object.values(lo)[0]
      if (embed?.coordinates) coords = embed.coordinates.map(([x, y]) => ({ x, y }))
      else if (embed?.obs) coords = embed.obs.map(([, [x, y]]) => ({ x, y }))
    } else if (Array.isArray(layout?.obs)) {
      // format: {obs: [[idx, [x,y]], ...]}
      coords = layout.obs.map(([, [x, y]]) => ({ x, y }))
    }

    if (coords.length === 0) {
      return res.status(422).json({ error: 'Could not parse UMAP coordinates from this dataset' })
    }

    // Parse obs metadata
    const nObs = coords.length
    const meta = {}
    if (obsData?.obs) {
      const o = obsData.obs
      // Handle columnar format: {columns:{col_name:[val0,val1,...]}}
      if (o.columns && typeof o.columns === 'object' && !Array.isArray(o.columns)) {
        Object.entries(o.columns).forEach(([col, vals]) => { meta[col] = vals })
      }
      // Handle {index:[...], columns:[names], data:[[row0],[row1],...]}
      else if (Array.isArray(o.columns) && Array.isArray(o.data)) {
        o.columns.forEach((col, ci) => {
          meta[col] = o.data.map(row => row[ci])
        })
      }
    }

    // Combine into cell objects
    const cells = coords.map((c, i) => ({
      id: i,
      x: parseFloat(c.x.toFixed(4)),
      y: parseFloat(c.y.toFixed(4)),
      cellType: meta.cell_type?.[i] || meta.author_cell_type?.[i] || 'Unknown',
      tissue: meta.tissue?.[i] || '',
      disease: meta.disease?.[i] || '',
      sex: meta.sex?.[i] || '',
    }))

    const result = { cells, source: 'cellxgene', cxgId, total: cells.length }
    cache.set(KEY, result, 7200) // 2-hour cache for cell data
    console.log(`[CXG] cells loaded: ${cells.length}`)
    res.json(result)
  } catch (err) {
    console.error(`[CXG] cells error for ${cxgId}:`, err.message)
    res.status(502).json({ error: err.message })
  }
})

// ---------- /api/datasets/:cxgId/expression/:gene ----------
app.get('/api/datasets/:cxgId/expression/:gene', async (req, res) => {
  const { cxgId, gene } = req.params
  const KEY = `expr:${cxgId}:${gene}`
  const hit = cache.get(KEY)
  if (hit) return res.json(hit)

  try {
    const base = explorerBase(cxgId)
    // Use query param filter: var:name__eq=GENE
    const data = await fetchJSON(`${base}/data/var`, { 'var:name__eq': gene })

    // Parse expression matrix
    // Format: {var:[{name}], obs:[cell_ids], X:[[val1, val2,...]]} or similar
    let values = []
    if (data?.X) {
      // X is typically [n_var x n_obs] so we take row 0 for our single gene
      const row = Array.isArray(data.X[0]) ? data.X[0] : data.X
      values = row
    } else if (data?.data?.var?.data) {
      values = data.data.var.data[0] || []
    }

    const result = { gene, values, source: 'cellxgene' }
    cache.set(KEY, result, 3600)
    res.json(result)
  } catch (err) {
    console.error(`[CXG] expression error (${gene}):`, err.message)
    res.status(502).json({ error: err.message })
  }
})

// ---------- /api/ncbi/geo/search ----------
app.get('/api/ncbi/geo/search', async (req, res) => {
  const q = req.query.q || 'diabetic retinopathy single cell RNA sequencing retina'
  const KEY = `geo:${q}`
  const hit = cache.get(KEY)
  if (hit) return res.json(hit)

  try {
    console.log(`[NCBI] GEO search: "${q}"`)
    // Step 1: esearch to get IDs
    const search = await fetchJSON(`${NCBI}/esearch.fcgi`, {
      db: 'gds',
      term: q,
      retmax: 20,
      retmode: 'json',
      sort: 'relevance',
    })
    const ids = search?.esearchresult?.idlist || []
    if (ids.length === 0) return res.json([])

    // Step 2: esummary for metadata
    const summary = await fetchJSON(`${NCBI}/esummary.fcgi`, {
      db: 'gds',
      id: ids.join(','),
      retmode: 'json',
    })

    const result = Object.values(summary?.result || {})
      .filter(d => d.uid)
      .map(d => ({
        uid: d.uid,
        accession: d.accession,
        title: d.title,
        summary: d.summary?.slice(0, 300),
        organism: d.taxon,
        sampleCount: d.n_samples,
        gdsType: d.gdstype,
        pubDate: d.pdat,
        gpl: d.GPL,
        pmids: d.pubmedids || [],
        ftpLink: `https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=${d.accession}`,
      }))

    cache.set(KEY, result)
    res.json(result)
  } catch (err) {
    console.error('[NCBI] GEO error:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ---------- /api/ncbi/pubmed/search ----------
app.get('/api/ncbi/pubmed/search', async (req, res) => {
  const q = req.query.q || 'diabetic retinopathy single cell RNA sequencing'
  const KEY = `pubmed:${q}`
  const hit = cache.get(KEY)
  if (hit) return res.json(hit)

  try {
    console.log(`[NCBI] PubMed search: "${q}"`)
    const search = await fetchJSON(`${NCBI}/esearch.fcgi`, {
      db: 'pubmed',
      term: q,
      retmax: 25,
      retmode: 'json',
      sort: 'relevance',
    })
    const ids = search?.esearchresult?.idlist || []
    if (ids.length === 0) return res.json([])

    const summary = await fetchJSON(`${NCBI}/esummary.fcgi`, {
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
    })

    const result = ids
      .map(id => summary?.result?.[id])
      .filter(Boolean)
      .map(d => ({
        pmid: d.uid,
        title: d.title,
        authors: (d.authors || []).slice(0, 3).map(a => a.name).join(', '),
        journal: d.source,
        year: d.pubdate?.split(' ')[0],
        doi: d.elocationid?.replace('doi: ', '') || null,
        pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${d.uid}/`,
      }))

    cache.set(KEY, result)
    res.json(result)
  } catch (err) {
    console.error('[NCBI] PubMed error:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ---------- /api/ncbi/pubmed/:pmid ----------
app.get('/api/ncbi/pubmed/:pmid', async (req, res) => {
  const { pmid } = req.params
  const KEY = `pm:${pmid}`
  const hit = cache.get(KEY)
  if (hit) return res.json(hit)

  try {
    const summary = await fetchJSON(`${NCBI}/esummary.fcgi`, {
      db: 'pubmed',
      id: pmid,
      retmode: 'json',
    })
    const d = summary?.result?.[pmid]
    if (!d) return res.status(404).json({ error: 'Not found' })
    const result = {
      pmid,
      title: d.title,
      authors: (d.authors || []).map(a => a.name).join(', '),
      journal: d.source,
      year: d.pubdate?.split(' ')[0],
      doi: d.elocationid?.replace('doi: ', '') || null,
    }
    cache.set(KEY, result, 86400)
    res.json(result)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// ---------- /api/cache/stats ----------
app.get('/api/cache/stats', (_req, res) => {
  res.json(cache.getStats())
})

// ======== E-MTAB-9061 (Akimba Diabetic Retinopathy — EBI SCEA) ========

const EBI_FTP = 'https://ftp.ebi.ac.uk/pub/databases/microarray/data/atlas/sc_experiments/E-MTAB-9061'

function parseWideClusters(tsv) {
  const lines = tsv.replace(/\r/g, '').split('\n')
  const header = lines[0].split('\t')
  const cellIds = header.slice(2)

  function makeMap(cols) {
    const map = new Map()
    for (let j = 0; j < cellIds.length; j++) {
      const id = (cellIds[j] || '').trim()
      const k = parseInt(cols[j + 2])
      if (id && !isNaN(k)) map.set(id, k)
    }
    return map
  }

  // Priority: sel.K=TRUE row (any K value)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t')
    if (cols[0]?.toLowerCase() === 'true') {
      const selectedK = parseInt(cols[1])
      return { map: makeMap(cols), selectedK: isNaN(selectedK) ? 9 : selectedK }
    }
  }
  // Fallback: K=9 row
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t')
    if (parseInt(cols[1]) === 9) return { map: makeMap(cols), selectedK: 9 }
  }
  throw new Error('No cluster resolution found in clusters.tsv')
}

function parseMarkerGenes(tsv, maxRank = 50) {
  const lines = tsv.replace(/\r/g, '').split('\n').slice(1)
  const byCluster = new Map()
  for (const line of lines) {
    if (!line.trim()) continue
    const p = line.split('\t')
    const cluster = parseInt(p[0])
    const rank = parseInt(p[2])
    const geneId = p[3]
    const fc = parseFloat(p[5])
    if (isNaN(cluster) || rank >= maxRank || !geneId) continue
    if (!byCluster.has(cluster)) byCluster.set(cluster, [])
    byCluster.get(cluster).push({ geneId, rank, foldChange: isNaN(fc) ? 0 : fc })
  }
  return byCluster
}

function parseGeneMap(text) {
  const map = new Map()
  for (const line of text.replace(/\r/g, '').split('\n')) {
    const tab = line.indexOf('\t')
    if (tab < 0) continue
    const id = line.slice(0, tab).trim()
    const sym = line.slice(tab + 1).trim()
    if (id && sym) map.set(id, sym)
  }
  return map
}

function buildConditionMap(tsv) {
  const lines = tsv.replace(/\r/g, '').split('\n')
  const header = lines[0].split('\t')
  const diseaseIdx = header.findIndex(h => h.toLowerCase() === 'disease')
  const effIdx = diseaseIdx >= 0 ? diseaseIdx : 3

  const runMap = new Map()
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue
    const cols = lines[i].split('\t')
    const cellId = cols[0]
    const dash = cellId.indexOf('-')
    const errId = dash > 0 ? cellId.slice(0, dash) : cellId
    if (!runMap.has(errId)) {
      const disease = cols[effIdx] || ''
      const isDR = disease.toLowerCase().includes('diabetic')
      runMap.set(errId, {
        condition: isDR ? 'DR' : 'Healthy',
        disease,
        isDR,
        sampleLabel: isDR ? 'Akimba (DR)' : 'Wild-type (WT)',
      })
    }
  }
  return runMap
}

const RETINAL_MARKERS = {
  'Rod Photoreceptors': ['Rho', 'Nrl', 'Reep6', 'Cnga1', 'Pde6b', 'Gnat1', 'Prph2', 'Cngb1', 'Pdc', 'Rdh12', 'Sag', 'Gnb1', 'Rcvrn'],
  'Cone Photoreceptors': ['Arr3', 'Opn1sw', 'Opn1mw', 'Gngt2', 'Pde6h', 'Cnga3', 'Gnat2', 'Pde6c', 'Gnb3', 'Arr3'],
  'Retinal Ganglion Cells': ['Rbpms', 'Rbpms2', 'Sncg', 'Pou4f1', 'Nefl', 'Gap43', 'Nefm', 'Optn', 'Slc17a6', 'Nrn1'],
  'Müller Glia': ['Rlbp1', 'Glul', 'Vim', 'Dkk3', 'Sox9', 'Slc1a3', 'Cd44', 'Clu', 'Gfap', 'Vimentin', 'Aqp4'],
  'Bipolar Cells': ['Isl1', 'Vsx1', 'Grm6', 'Cabp5', 'Scgn', 'Lhx4', 'Otx2', 'Pcp2', 'Trpm1', 'Neurod1', 'Neurod4'],
  'Amacrine Cells': ['Tfap2a', 'Tfap2b', 'Nrgn', 'Slc32a1', 'Gad1', 'Gad2', 'Chat', 'Calb2', 'Snap25', 'Calb1', 'Calm1', 'Ndrg4'],
  'Horizontal Cells': ['Onecut1', 'Lhx1', 'Prox1', 'Onecut2', 'Gjb2', 'Calbindin'],
  'Endothelial Cells': ['Pecam1', 'Cdh5', 'Esam', 'Ly6c1', 'Cldn5', 'Kdr', 'Icam2', 'Plvap', 'Tie1'],
  'Microglia': ['Csf1r', 'Cx3cr1', 'P2ry12', 'Aif1', 'Tmem119', 'Hexb', 'Siglech', 'Sall1', 'C1qa', 'C1qb', 'C1qc', 'Tyrobp', 'Ctss', 'Fcer1g'],
  'Pericytes': ['Rgs5', 'Anpep', 'Pdgfrb', 'Vtn', 'Kcnj8', 'Des', 'Abcc9', 'Notch3', 'Mgp', 'Cald1', 'Igfbp7', 'Crip1'],
  'Astrocytes': ['Gfap', 'S100b', 'Aldh1l1', 'Atp1a2', 'Ptgds', 'Fbln1', 'Slc6a13', 'Crhbp', 'Gjb6', 'Slc4a4'],
}

function annotateClusterCellType(symbols) {
  const lower = new Set(symbols.map(s => s.toLowerCase()))
  let best = 'Unknown', bestScore = 0
  for (const [ct, markers] of Object.entries(RETINAL_MARKERS)) {
    const score = markers.filter(m => lower.has(m.toLowerCase())).length
    if (score > bestScore) { bestScore = score; best = ct }
  }
  return best
}

function cosineDist(a, b) {
  let dot = 0, na2 = 0, nb2 = 0
  for (let i = 0; i < a.length; i++) {
    const ai = a[i], bi = b[i] || 0
    dot += ai * bi; na2 += ai * ai; nb2 += bi * bi
  }
  return na2 > 0 && nb2 > 0 ? 1 - dot / Math.sqrt(na2 * nb2) : 1
}

function classicalMDS2D(distMatrix) {
  const n = distMatrix.length
  if (n === 1) return [{ x: 0, y: 0 }]
  const D2 = distMatrix.map(r => r.map(d => d * d))
  const rowM = D2.map(r => r.reduce((s, v) => s + v, 0) / n)
  const colM = Array.from({ length: n }, (_, j) => D2.reduce((s, r) => s + r[j], 0) / n)
  const grand = rowM.reduce((s, v) => s + v, 0) / n
  const B = D2.map((r, i) => r.map((v, j) => -0.5 * (v - rowM[i] - colM[j] + grand)))

  function powerIter(M, deflVec, iters = 300) {
    let v = Array.from({ length: n }, (_, i) => Math.sin(i * 1.3 + 0.7))
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
    v = v.map(x => x / norm)
    for (let t = 0; t < iters; t++) {
      let mv = M.map(r => r.reduce((s, val, i) => s + val * v[i], 0))
      if (deflVec) {
        const d = mv.reduce((s, x, i) => s + x * deflVec[i], 0)
        mv = mv.map((x, i) => x - d * deflVec[i])
      }
      norm = Math.sqrt(mv.reduce((s, x) => s + x * x, 0))
      if (norm < 1e-12) break
      v = mv.map(x => x / norm)
    }
    const λ = v.reduce((s, vi, i) => s + vi * B[i].reduce((ss, val, j) => ss + val * v[j], 0), 0)
    return { v, λ }
  }

  const { v: v1, λ: λ1 } = powerIter(B, null)
  const { v: v2, λ: λ2 } = powerIter(B, v1)
  const s1 = Math.sqrt(Math.max(0, λ1)), s2 = Math.sqrt(Math.max(0, λ2))
  return v1.map((x, i) => ({ x: x * s1, y: v2[i] * s2 }))
}

// Seeded PRNG (mulberry32) for reproducible cell scatter
function makeRNG(seed) {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

app.get('/api/emtab9061/cells', async (_req, res) => {
  const KEY = 'emtab9061:cells'
  const hit = cache.get(KEY)
  if (hit) return res.json(hit)

  try {
    // Phase 1: fetch clusters to determine the selected K value
    console.log('[EMTAB] fetching clusters.tsv...')
    const clustersRes = await axios.get(`${EBI_FTP}/E-MTAB-9061.clusters.tsv`, { timeout: 90000, responseType: 'text', maxContentLength: 10e6 })
    const { map: cellClusterMap, selectedK } = parseWideClusters(clustersRes.data)
    console.log(`[EMTAB] selected K=${selectedK}, ${cellClusterMap.size} cells`)

    // Phase 2: fetch marker genes (for the actual selected K) + gene map + cell metadata
    console.log(`[EMTAB] fetching marker_genes_${selectedK}.tsv + gene map + metadata...`)
    const [markerRes, geneMapRes, metaRes] = await Promise.all([
      axios.get(`${EBI_FTP}/E-MTAB-9061.marker_genes_${selectedK}.tsv`, { timeout: 60000, responseType: 'text' }),
      axios.get(`${EBI_FTP}/E-MTAB-9061.aggregated_counts.decorated.mtx_rows`, { timeout: 90000, responseType: 'text', maxContentLength: 5e6 }),
      axios.get(`${EBI_FTP}/E-MTAB-9061.cell_metadata.tsv`, { timeout: 90000, responseType: 'text', maxContentLength: 30e6 }),
    ])
    console.log('[EMTAB] parsing...')

    const markerByCluster = parseMarkerGenes(markerRes.data)
    const geneSymbolMap = parseGeneMap(geneMapRes.data)
    const conditionMap = buildConditionMap(metaRes.data)

    const clusterIds = [...new Set(cellClusterMap.values())].sort((a, b) => a - b)
    console.log(`[EMTAB] ${cellClusterMap.size} cells, ${clusterIds.length} clusters`)

    // Build fold-change feature vectors per cluster (all marker genes as dimensions)
    const allGeneIds = [...new Set([...markerByCluster.values()].flatMap(gs => gs.map(g => g.geneId)))]
    const geneIdx = new Map(allGeneIds.map((g, i) => [g, i]))
    const clusterVecs = new Map()
    for (const cid of clusterIds) {
      const vec = new Float64Array(allGeneIds.length)
      for (const { geneId, foldChange } of (markerByCluster.get(cid) || [])) {
        const i = geneIdx.get(geneId)
        if (i !== undefined) vec[i] = foldChange
      }
      clusterVecs.set(cid, Array.from(vec))
    }

    // Pairwise cosine distance matrix
    const n = clusterIds.length
    const distMatrix = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        i === j ? 0 : cosineDist(clusterVecs.get(clusterIds[i]), clusterVecs.get(clusterIds[j]))
      )
    )

    // Classical MDS → 2D cluster centroids
    const mdsRaw = classicalMDS2D(distMatrix)
    const xs = mdsRaw.map(p => p.x), ys = mdsRaw.map(p => p.y)
    const xMin = Math.min(...xs), xMax = Math.max(...xs)
    const yMin = Math.min(...ys), yMax = Math.max(...ys)
    const xSpan = (xMax - xMin) || 1, ySpan = (yMax - yMin) || 1

    const clusterCentroids = new Map(clusterIds.map((cid, i) => [cid, {
      x: ((mdsRaw[i].x - xMin) / xSpan - 0.5) * 16,
      y: ((mdsRaw[i].y - yMin) / ySpan - 0.5) * 16,
    }]))

    // Cluster sizes for spread calibration
    const clusterSizes = new Map()
    for (const cid of cellClusterMap.values()) clusterSizes.set(cid, (clusterSizes.get(cid) || 0) + 1)

    // Annotate each cluster with retinal cell type
    const clusterMeta = new Map()
    for (const cid of clusterIds) {
      const genes = markerByCluster.get(cid) || []
      const topSymbols = genes.slice(0, 15).map(g => geneSymbolMap.get(g.geneId) || '').filter(Boolean)
      clusterMeta.set(cid, {
        cellType: annotateClusterCellType(topSymbols),
        topGenes: topSymbols.slice(0, 10),
        markerGenes: genes.slice(0, 30).map(g => ({
          gene: geneSymbolMap.get(g.geneId) || g.geneId,
          foldChange: +g.foldChange.toFixed(2),
          rank: g.rank,
        })),
      })
    }

    // Build cells array with reproducible Gaussian scatter around centroids
    const rng = makeRNG(42)
    const cells = []
    let idx = 0
    for (const [cellId, cluster] of cellClusterMap) {
      const centroid = clusterCentroids.get(cluster) || { x: 0, y: 0 }
      const spread = Math.sqrt(clusterSizes.get(cluster) || 1) * 0.08
      const u1 = rng() + 1e-10, u2 = rng()
      const mag = Math.sqrt(-2 * Math.log(u1))
      const dash = cellId.indexOf('-')
      const errId = dash > 0 ? cellId.slice(0, dash) : cellId
      const cond = conditionMap.get(errId) || { condition: 'Unknown', isDR: false, sampleLabel: errId }
      const meta = clusterMeta.get(cluster) || {}
      cells.push({
        id: idx++,
        cellId,
        x: +(centroid.x + mag * Math.cos(2 * Math.PI * u2) * spread).toFixed(3),
        y: +(centroid.y + mag * Math.sin(2 * Math.PI * u2) * spread).toFixed(3),
        cluster,
        cellType: meta.cellType || 'Unknown',
        cellTypeName: meta.cellType || 'Unknown',
        condition: cond.condition,
        isDR: cond.isDR,
        sample: errId,
        sampleLabel: cond.sampleLabel,
      })
    }

    const clusters = clusterIds.map(cid => ({
      id: cid,
      name: clusterMeta.get(cid)?.cellType || `Cluster ${cid}`,
      size: clusterSizes.get(cid) || 0,
      topGenes: clusterMeta.get(cid)?.topGenes || [],
      centroid: clusterCentroids.get(cid),
      markerGenes: clusterMeta.get(cid)?.markerGenes || [],
    }))

    const drCount = cells.filter(c => c.isDR).length
    const result = {
      cells,
      clusters,
      stats: { total: cells.length, dr: drCount, healthy: cells.length - drCount },
      source: 'ebi_scea',
      dataset: 'E-MTAB-9061',
      citation: 'Van Hove et al. 2020, Diabetologia. Akimba (Ins2-Akita; VEGF+/-) mouse model of diabetic retinopathy.',
    }

    cache.set(KEY, result, 3600)
    console.log(`[EMTAB] done: ${cells.length} cells, ${clusters.length} clusters, ${drCount} DR / ${cells.length - drCount} healthy`)
    res.json(result)
  } catch (err) {
    console.error('[EMTAB] error:', err.message)
    res.status(502).json({ error: `EBI SCEA fetch failed: ${err.message}` })
  }
})

// Returns per-cell expression values from cluster-level marker gene fold changes
app.get('/api/emtab9061/expression/:gene', (req, res) => {
  const { gene } = req.params
  const cached = cache.get('emtab9061:cells')
  if (!cached) return res.status(503).json({ error: 'Cell data not loaded yet — call /api/emtab9061/cells first' })

  const { cells, clusters } = cached
  const gLow = gene.toLowerCase()
  const clusterExpr = new Map()
  for (const c of clusters) {
    const mg = c.markerGenes.find(m => m.gene.toLowerCase() === gLow)
    clusterExpr.set(c.id, mg ? Math.max(0, mg.foldChange) : 0)
  }

  const values = cells.map(c => clusterExpr.get(c.cluster) || 0)
  res.json({ gene, values, source: 'emtab9061_markers' })
})

if (!process.env.VERCEL) {
  const PORT = process.env.SERVER_PORT || 3001
  app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`))
}

export default app
