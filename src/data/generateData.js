// Synthetic but biologically realistic scRNA-seq data for diabetic retinopathy
// Based on known retinal cell type biology and DR pathophysiology

const CELL_TYPES = [
  { id: 'rod', name: 'Rod Photoreceptors', color: '#6366f1', center: [-4.5, -2.0], spread: [1.8, 1.4], count: 420 },
  { id: 'cone', name: 'Cone Photoreceptors', color: '#8b5cf6', center: [-3.5, 1.8], spread: [1.0, 0.9], count: 120 },
  { id: 'muller', name: 'Müller Glia', color: '#10b981', center: [2.8, 3.2], spread: [1.2, 1.0], count: 200 },
  { id: 'rgc', name: 'Retinal Ganglion Cells', color: '#f59e0b', center: [4.2, -1.5], spread: [1.1, 1.3], count: 140 },
  { id: 'bipolar', name: 'Bipolar Cells', color: '#3b82f6', center: [-1.0, 3.5], spread: [1.4, 1.0], count: 280 },
  { id: 'amacrine', name: 'Amacrine Cells', color: '#ec4899', center: [1.2, -3.2], spread: [1.3, 1.1], count: 180 },
  { id: 'horizontal', name: 'Horizontal Cells', color: '#f97316', center: [-2.8, 4.5], spread: [0.8, 0.7], count: 80 },
  { id: 'endothelial', name: 'Endothelial Cells', color: '#ef4444', center: [5.0, 2.0], spread: [0.9, 0.8], count: 100 },
  { id: 'pericyte', name: 'Pericytes', color: '#dc2626', center: [5.8, -0.5], spread: [0.7, 0.8], count: 60 },
  { id: 'microglia', name: 'Microglia', color: '#14b8a6', center: [0.5, 5.5], spread: [1.0, 0.9], count: 100 },
  { id: 'astrocyte', name: 'Astrocytes', color: '#84cc16', center: [3.0, 5.0], spread: [0.8, 0.7], count: 60 },
  { id: 'rpe', name: 'RPE Cells', color: '#a855f7', center: [-5.5, 2.5], spread: [0.9, 0.8], count: 80 },
];

const GENES = {
  // Marker genes per cell type
  rod: { markers: ['RHO', 'NR2E3', 'ROM1', 'NRL', 'CNGA1', 'PDC'], baseline: 8 },
  cone: { markers: ['ARR3', 'THRB', 'OPN1LW', 'OPN1MW', 'GNAT2', 'PDE6H'], baseline: 6 },
  muller: { markers: ['GLUL', 'VIM', 'RLBP1', 'CLU', 'CRALBP', 'GFAP'], baseline: 7 },
  rgc: { markers: ['RBPMS', 'THY1', 'NEFL', 'NEFM', 'GAP43', 'SNCG'], baseline: 7 },
  bipolar: { markers: ['VSX2', 'PRKCA', 'TRPM1', 'ISL1', 'CABP5', 'GRM6'], baseline: 6 },
  amacrine: { markers: ['GAD1', 'TFAP2A', 'CHAT', 'CALB1', 'NRXN1', 'SLC17A8'], baseline: 6 },
  horizontal: { markers: ['ONECUT1', 'LHX1', 'CALB1', 'PROX1', 'NTRK2', 'ALCAM'], baseline: 5 },
  endothelial: { markers: ['CDH5', 'PECAM1', 'ERG', 'FLT1', 'KDR', 'CLDN5'], baseline: 6 },
  pericyte: { markers: ['PDGFRB', 'ACTA2', 'RGS5', 'ANPEP', 'NG2', 'KCNJ8'], baseline: 5 },
  microglia: { markers: ['CX3CR1', 'P2RY12', 'TMEM119', 'IBA1', 'CD68', 'ITGAM'], baseline: 6 },
  astrocyte: { markers: ['GFAP', 'S100B', 'AQP4', 'ALDH1L1', 'GJA1', 'SOX9'], baseline: 6 },
  rpe: { markers: ['RPE65', 'BEST1', 'RLBP1', 'TTR', 'MERTK', 'PEDF'], baseline: 7 },
};

const DR_GENES = [
  'VEGFA', 'HIF1A', 'GFAP', 'NLRP3', 'TNF', 'IL1B', 'IL6', 'ICAM1',
  'MMP9', 'FN1', 'ANGPT2', 'DLL4', 'NOTCH1', 'OPN', 'CXCL10',
  'CCL2', 'NOS2', 'SOD2', 'CASP3', 'BCL2'
];

const ALL_GENES = [
  ...new Set([
    ...Object.values(GENES).flatMap(g => g.markers),
    ...DR_GENES,
    'ACTB', 'GAPDH', 'B2M', 'MALAT1'
  ])
];

function gaussianRandom(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateExpressionLevel(geneIndex, cellTypeId, condition, cellTypeGenes) {
  const gene = ALL_GENES[geneIndex];
  const isMarker = cellTypeGenes.markers.includes(gene);
  const isDRGene = DR_GENES.includes(gene);

  let baseLevel = isMarker ? gaussianRandom(cellTypeGenes.baseline, 1.2) : gaussianRandom(0.8, 1.0);
  baseLevel = Math.max(0, baseLevel);

  if (condition === 'DR' && isDRGene) {
    const drCellTypes = {
      muller: 2.5, microglia: 2.8, endothelial: 2.0, astrocyte: 2.2,
      rgc: 1.5, pericyte: 1.8
    };
    const multiplier = drCellTypes[cellTypeId] || 1.3;
    if (['VEGFA', 'HIF1A', 'GFAP', 'NLRP3', 'TNF', 'IL1B', 'IL6'].includes(gene)) {
      baseLevel *= (1 + (multiplier - 1) * (Math.random() * 0.5 + 0.75));
    }
  }

  if (condition === 'DR' && ['RHO', 'RBPMS', 'NEFL', 'CNGA1', 'PDC'].includes(gene)) {
    baseLevel *= (0.3 + Math.random() * 0.4);
  }

  if (['ACTB', 'GAPDH', 'B2M', 'MALAT1'].includes(gene)) {
    baseLevel = gaussianRandom(5.0, 0.8);
  }

  return Math.max(0, parseFloat(baseLevel.toFixed(3)));
}

export function generateCells() {
  const cells = [];
  const samples = [
    { id: 'S1', label: 'Healthy-1', condition: 'Healthy', patient: 'H001' },
    { id: 'S2', label: 'Healthy-2', condition: 'Healthy', patient: 'H002' },
    { id: 'S3', label: 'Healthy-3', condition: 'Healthy', patient: 'H003' },
    { id: 'S4', label: 'DR-Early-1', condition: 'DR', patient: 'DR001', stage: 'NPDR' },
    { id: 'S5', label: 'DR-Early-2', condition: 'DR', patient: 'DR002', stage: 'NPDR' },
    { id: 'S6', label: 'DR-Advanced-1', condition: 'DR', patient: 'DR003', stage: 'PDR' },
    { id: 'S7', label: 'DR-Advanced-2', condition: 'DR', patient: 'DR004', stage: 'PDR' },
  ];

  let cellId = 0;
  for (const ct of CELL_TYPES) {
    const ctGenes = GENES[ct.id];
    for (let i = 0; i < ct.count; i++) {
      const sample = samples[Math.floor(Math.random() * samples.length)];
      const x = gaussianRandom(ct.center[0], ct.spread[0]);
      const y = gaussianRandom(ct.center[1], ct.spread[1]);

      const expression = {};
      ALL_GENES.forEach((gene, idx) => {
        const val = generateExpressionLevel(idx, ct.id, sample.condition, ctGenes);
        if (val > 0.1) expression[gene] = val;
      });

      cells.push({
        id: `cell_${cellId++}`,
        x: parseFloat(x.toFixed(3)),
        y: parseFloat(y.toFixed(3)),
        cellType: ct.id,
        cellTypeName: ct.name,
        color: ct.color,
        sample: sample.id,
        sampleLabel: sample.label,
        condition: sample.condition,
        patient: sample.patient,
        stage: sample.stage || null,
        nGenes: Object.keys(expression).length,
        totalCounts: parseFloat(
          Object.values(expression).reduce((a, b) => a + b, 0).toFixed(1)
        ),
        expression,
      });
    }
  }

  return { cells, cellTypes: CELL_TYPES, genes: ALL_GENES, samples };
}

export { CELL_TYPES, ALL_GENES, DR_GENES, GENES };
