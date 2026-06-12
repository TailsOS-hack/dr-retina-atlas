import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { CELL_TYPES } from '../data/generateData'

export default function DotPlot({ cells, genes, width = 700, height = 320 }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current || !genes || genes.length === 0) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 50, right: 30, bottom: 60, left: 140 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const cellTypeNames = CELL_TYPES.map(ct => ct.name.split(' ').slice(0, 2).join(' '))

    const x = d3.scaleBand().domain(genes).range([0, innerW]).padding(0.2)
    const y = d3.scaleBand().domain(cellTypeNames).range([0, innerH]).padding(0.2)

    // Compute stats per cell type per gene
    const data = []
    CELL_TYPES.forEach((ct, ci) => {
      const ctCells = cells.filter(c => c.cellType === ct.id)
      genes.forEach(gene => {
        const vals = ctCells.map(c => c.expression[gene] || 0)
        const expressing = vals.filter(v => v > 0.1)
        const pctExp = expressing.length / ctCells.length
        const meanExp = d3.mean(expressing) || 0
        data.push({
          ctName: cellTypeNames[ci],
          gene,
          pctExp,
          meanExp,
          color: ct.color,
        })
      })
    })

    const maxMean = d3.max(data, d => d.meanExp) || 1
    const sizeScale = d3.scaleSqrt().domain([0, 1]).range([0, x.bandwidth() * 0.45])
    const colorScale = d3.scaleSequential().domain([0, maxMean]).interpolator(d3.interpolateBlues)

    // X axis
    g.append('g')
      .call(d3.axisTop(x))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', 10)
      .attr('font-family', 'monospace')
      .attr('transform', 'rotate(-35)')
      .attr('text-anchor', 'start')
      .attr('dx', '4')
      .attr('dy', '-4')

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', 10)

    g.selectAll('.domain').attr('stroke', '#334155')
    g.selectAll('.tick line').attr('stroke', '#334155')

    // Dots
    data.forEach(d => {
      const cx = x(d.gene) + x.bandwidth() / 2
      const cy = y(d.ctName) + y.bandwidth() / 2
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', sizeScale(d.pctExp))
        .attr('fill', colorScale(d.meanExp))
        .attr('stroke', '#334155')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.85)
    })

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${margin.left}, ${height - 18})`)

    const szLegend = [0.25, 0.5, 0.75, 1.0]
    szLegend.forEach((v, i) => {
      const lx = i * 70
      legend.append('circle').attr('cx', lx + sizeScale(v)).attr('cy', 6).attr('r', sizeScale(v))
        .attr('fill', '#475569').attr('stroke', '#64748b').attr('stroke-width', 0.5)
      legend.append('text').attr('x', lx + sizeScale(v) * 2 + 4).attr('y', 9)
        .attr('fill', '#64748b').attr('font-size', 9).text(`${(v * 100).toFixed(0)}%`)
    })
    legend.append('text').attr('x', 0).attr('y', -2).attr('fill', '#475569').attr('font-size', 9).text('% expressing')

  }, [cells, genes, width, height])

  return (
    <svg ref={svgRef} width={width} height={height} style={{ background: 'transparent' }} />
  )
}
