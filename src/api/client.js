const BASE = '/api'

async function get(path, params = {}) {
  const url = new URL(BASE + path, window.location.origin)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  health: () => get('/health'),

  // CELLxGENE
  retinalDatasets: () => get('/datasets/retinal'),
  datasetSchema: (cxgId) => get(`/datasets/${cxgId}/schema`),
  datasetCells: (cxgId) => get(`/datasets/${cxgId}/cells`),
  datasetExpression: (cxgId, gene) => get(`/datasets/${cxgId}/expression/${gene}`),

  // NCBI
  geoSearch: (q) => get('/ncbi/geo/search', { q }),
  pubmedSearch: (q) => get('/ncbi/pubmed/search', { q }),
  pubmedArticle: (pmid) => get(`/ncbi/pubmed/${pmid}`),

  cacheStats: () => get('/cache/stats'),

  // EBI SCEA — E-MTAB-9061 (Akimba DR, real 7970 cells)
  emtabCells: () => get('/emtab9061/cells'),
  emtabExpression: (gene) => get(`/emtab9061/expression/${gene}`),
}
