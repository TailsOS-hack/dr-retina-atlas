import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { CELL_TYPES } from '../data/generateData'

export default function ViolinPlot({ cells, gene, width = 700, height = 300 }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current || !gene) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 10, right: 10, bottom: 60, left: 45 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const cellTypeIds = CELL_TYPES.map(ct => ct.id)
    const cellTypeNames = CELL_TYPES.map(ct => ct.name.split(' ').slice(0, 2).join(' '))

    const allValues = cells.map(c => c.expression[gene] || 0)
    const maxVal = d3.max(allValues) || 1

    const x = d3.scaleBand().domain(cellTypeIds).range([0, innerW]).padding(0.1)
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([innerH, 0])

    // Grid
    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerW))
      .selectAll('line').attr('stroke', '#1e293b').attr('stroke-width', 1)
    g.selectAll('.domain').remove()
    g.selectAll('.tick text').attr('fill', '#64748b').attr('font-size', 10)

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickFormat((d, i) => cellTypeNames[i]))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', 9)
      .attr('transform', 'rotate(-35)')
      .attr('text-anchor', 'end')
      .attr('dx', '-5')
      .attr('dy', '2')

    g.select('.domain').attr('stroke', '#334155')

    // Draw violin/box for each cell type
    CELL_TYPES.forEach(ct => {
      const vals = cells
        .filter(c => c.cellType === ct.id)
        .map(c => c.expression[gene] || 0)
        .sort(d3.ascending)

      if (vals.length === 0) return

      const bw = x.bandwidth()
      const cx = x(ct.id) + bw / 2

      const q1 = d3.quantile(vals, 0.25)
      const median = d3.quantile(vals, 0.5)
      const q3 = d3.quantile(vals, 0.75)
      const iqr = q3 - q1
      const lo = Math.max(d3.min(vals), q1 - 1.5 * iqr)
      const hi = Math.min(d3.max(vals), q3 + 1.5 * iqr)

      // Violin shape using KDE
      const kde = kernelDensityEstimator(kernelEpanechnikov(0.4), y.ticks(30))
      const density = kde(vals)
      const maxDensity = d3.max(density, d => d[1]) || 1

      const violinWidth = bw * 0.45
      const area = d3.area()
        .x0(d => cx - (d[1] / maxDensity) * violinWidth)
        .x1(d => cx + (d[1] / maxDensity) * violinWidth)
        .y(d => y(d[0]))
        .curve(d3.curveCatmullRom)

      g.append('path')
        .datum(density.filter(d => d[0] >= 0))
        .attr('d', area)
        .attr('fill', ct.color)
        .attr('opacity', 0.3)
        .attr('stroke', ct.color)
        .attr('stroke-width', 1)

      // Box
      g.append('rect')
        .attr('x', cx - 5)
        .attr('y', y(q3))
        .attr('width', 10)
        .attr('height', Math.max(1, y(q1) - y(q3)))
        .attr('fill', ct.color)
        .attr('opacity', 0.7)
        .attr('rx', 1)

      // Whiskers
      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', y(lo)).attr('y2', y(q1))
        .attr('stroke', ct.color).attr('stroke-width', 1.5).attr('opacity', 0.6)
      g.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', y(q3)).attr('y2', y(hi))
        .attr('stroke', ct.color).attr('stroke-width', 1.5).attr('opacity', 0.6)

      // Median
      g.append('line')
        .attr('x1', cx - 7).attr('x2', cx + 7)
        .attr('y1', y(median)).attr('y2', y(median))
        .attr('stroke', '#fff').attr('stroke-width', 2)
    })

    // Y label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -35)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', 10)
      .text('Expression (log-normalized)')

  }, [cells, gene, width, height])

  return (
    <svg ref={svgRef} width={width} height={height} style={{ background: 'transparent' }} />
  )
}

function kernelDensityEstimator(kernel, X) {
  return function (V) {
    return X.map(x => [x, d3.mean(V, v => kernel(x - v))])
  }
}

function kernelEpanechnikov(k) {
  return function (v) {
    return Math.abs(v /= k) <= 1 ? (0.75 * (1 - v * v)) / k : 0
  }
}
