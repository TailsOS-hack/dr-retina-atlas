import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'

const MARGIN = { top: 20, right: 20, bottom: 30, left: 30 }

export default function UMAPPlot({
  cells,
  colorBy,
  selectedGene,
  highlightCellTypes,
  onCellsSelected,
  width = 600,
  height = 500,
}) {
  const svgRef = useRef(null)
  const tooltipRef = useRef(null)
  const [selecting, setSelecting] = useState(false)
  const brushRef = useRef(null)

  const innerW = width - MARGIN.left - MARGIN.right
  const innerH = height - MARGIN.top - MARGIN.bottom

  const xScale = d3.scaleLinear()
    .domain(d3.extent(cells, c => c.x).map((v, i) => v + (i === 0 ? -0.5 : 0.5)))
    .range([0, innerW])

  const yScale = d3.scaleLinear()
    .domain(d3.extent(cells, c => c.y).map((v, i) => v + (i === 0 ? -0.5 : 0.5)))
    .range([innerH, 0])

  const getExpressionExtent = useCallback(() => {
    if (!selectedGene) return [0, 1]
    const vals = cells.map(c => c.expression?.[selectedGene] || 0)
    return [0, d3.max(vals) || 1]
  }, [cells, selectedGene])

  const exprScale = d3.scaleSequential()
    .domain(getExpressionExtent())
    .interpolator(d3.interpolateYlOrRd)

  function getCellColor(cell) {
    if (colorBy === 'expression' && selectedGene) {
      return exprScale(cell.expression?.[selectedGene] || 0)
    }
    if (colorBy === 'condition') {
      return cell.condition === 'Healthy' ? '#22d3ee' : '#f87171'
    }
    if (colorBy === 'sample') {
      const palette = d3.schemeTableau10
      const idx = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'].indexOf(cell.sample)
      return palette[idx % palette.length]
    }
    return cell.color
  }

  function getCellOpacity(cell) {
    if (!highlightCellTypes || highlightCellTypes.length === 0) return 0.7
    return highlightCellTypes.includes(cell.cellType) ? 0.85 : 0.08
  }

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(''))
      .selectAll('line')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1)

    g.selectAll('.domain').remove()

    // Dots
    const dotSize = cells.length > 1200 ? 2.5 : cells.length > 600 ? 3 : 4

    g.selectAll('circle')
      .data(cells)
      .enter()
      .append('circle')
      .attr('cx', c => xScale(c.x))
      .attr('cy', c => yScale(c.y))
      .attr('r', dotSize)
      .attr('fill', getCellColor)
      .attr('opacity', getCellOpacity)
      .attr('stroke', c => getCellOpacity(c) > 0.5 ? 'rgba(255,255,255,0.1)' : 'none')
      .attr('stroke-width', 0.5)
      .on('mouseenter', (event, cell) => {
        const tooltip = tooltipRef.current
        if (!tooltip) return
        tooltip.style.display = 'block'
        tooltip.innerHTML = `
          <div class="font-medium text-white text-xs mb-1">${cell.cellTypeName}</div>
          <div class="text-slate-400 text-xs">${cell.sampleLabel} · ${cell.condition}</div>
          ${selectedGene ? `<div class="text-xs mt-1"><span class="text-slate-400">${selectedGene}:</span> <span class="text-amber-300 font-mono">${(cell.expression?.[selectedGene] || 0).toFixed(2)}</span></div>` : ''}
          ${cell.nGenes ? `<div class="text-slate-500 text-xs mt-1">${cell.nGenes} genes detected</div>` : ''}
        `
        tooltip.style.left = (event.clientX + 12) + 'px'
        tooltip.style.top = (event.clientY - 10) + 'px'
      })
      .on('mousemove', (event) => {
        const tooltip = tooltipRef.current
        if (tooltip) {
          tooltip.style.left = (event.clientX + 12) + 'px'
          tooltip.style.top = (event.clientY - 10) + 'px'
        }
      })
      .on('mouseleave', () => {
        if (tooltipRef.current) tooltipRef.current.style.display = 'none'
      })

    // Axis labels
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 25)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', 11)
      .text('UMAP 1')

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerH / 2)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', 11)
      .text('UMAP 2')

    // Brush for selection
    if (onCellsSelected) {
      const brush = d3.brush()
        .extent([[0, 0], [innerW, innerH]])
        .on('end', (event) => {
          if (!event.selection) { onCellsSelected(null); return }
          const [[x0, y0], [x1, y1]] = event.selection
          const selected = cells.filter(c =>
            xScale(c.x) >= x0 && xScale(c.x) <= x1 &&
            yScale(c.y) >= y0 && yScale(c.y) <= y1
          )
          onCellsSelected(selected)
        })

      brushRef.current = brush
      g.append('g').attr('class', 'brush').call(brush)
      g.select('.brush .selection')
        .attr('fill', 'rgba(59,130,246,0.15)')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 1)
    }
  }, [cells, colorBy, selectedGene, highlightCellTypes, width, height])

  return (
    <>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="umap-canvas block"
        style={{ background: 'transparent' }}
      />
      <div ref={tooltipRef} className="tooltip" style={{ display: 'none' }} />
    </>
  )
}
