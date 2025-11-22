import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ObjectiveParams, TurnResult, Recipe } from '../types';
import { evaluateRecipe } from '../services/mathService';

interface ResultVisualizationProps {
  humanHistory: TurnResult[];
  botHistory: TurnResult[];
  objectiveParams: ObjectiveParams;
}

export const ResultVisualization: React.FC<ResultVisualizationProps> = ({
  humanHistory,
  botHistory,
  objectiveParams
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !objectiveParams) return;
    
    const container = d3.select(containerRef.current);
    container.selectAll("*").remove();

    // 1. Slicing Strategy: Slice through the TRUE HIGHEST PEAK
    // This reveals the hidden function's best point clearly so the user knows where the goal was.
    const bestPeak = objectiveParams.peaks.reduce((prev, curr) => 
        (curr.height > prev.height ? curr : prev), objectiveParams.peaks[0]
    );
    
    // This is the coordinate of the hidden "God Particle" flavor
    const fixed = { 
        sweetness: bestPeak.x, 
        sourness: bestPeak.y, 
        bitterness: bestPeak.z 
    };

    const chartClass = "flex-shrink-0 bg-gray-900/80 border-2 border-gray-700 shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md rounded-lg overflow-hidden relative";

    // Chart A: Sweet vs Sour (Bitter fixed at peak)
    createHeatmap(
      container, chartClass,
      `SWEET vs SOUR`, 
      `Bitterness fixed at ${Math.round(fixed.bitterness)} (Optimal)`,
      "Sweetness", "Sourness",
      (x, y) => evaluateRecipe({ sweetness: x, sourness: y, bitterness: fixed.bitterness }, objectiveParams, false),
      humanHistory, botHistory, 
      (r) => r.sweetness, (r) => r.sourness,
      fixed.sweetness, fixed.sourness
    );

    // Chart B: Sweet vs Bitter (Sour fixed at peak)
    createHeatmap(
      container, chartClass,
      `SWEET vs BITTER`, 
      `Sourness fixed at ${Math.round(fixed.sourness)} (Optimal)`,
      "Sweetness", "Bitterness",
      (x, y) => evaluateRecipe({ sweetness: x, sourness: fixed.sourness, bitterness: y }, objectiveParams, false),
      humanHistory, botHistory, 
      (r) => r.sweetness, (r) => r.bitterness,
      fixed.sweetness, fixed.bitterness
    );

    // Chart C: Sour vs Bitter (Sweet fixed at peak)
    createHeatmap(
      container, chartClass,
      `SOUR vs BITTER`, 
      `Sweetness fixed at ${Math.round(fixed.sweetness)} (Optimal)`,
      "Sourness", "Bitterness",
      (x, y) => evaluateRecipe({ sweetness: fixed.sweetness, sourness: x, bitterness: y }, objectiveParams, false),
      humanHistory, botHistory, 
      (r) => r.sourness, (r) => r.bitterness,
      fixed.sourness, fixed.bitterness
    );
    
  }, [humanHistory, botHistory, objectiveParams]);

  const createHeatmap = (
    container: d3.Selection<HTMLDivElement, unknown, null, undefined>, 
    className: string,
    title: string,
    subtitle: string,
    xLabel: string, 
    yLabel: string,
    scoreFn: (x: number, y: number) => number,
    hHist: TurnResult[],
    bHist: TurnResult[],
    xAccessor: (r: Recipe) => number,
    yAccessor: (r: Recipe) => number,
    targetX: number,
    targetY: number
  ) => {
    const margin = { top: 40, right: 20, bottom: 40, left: 40 };
    const width = 300 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const wrapper = container.append("div").attr("class", className);

    // Title Block
    const header = wrapper.append("div").attr("class", "bg-black/50 border-b border-gray-700 p-2 text-center");
    header.append("div").attr("class", "text-cyan-400 font-pixel text-xs tracking-wider").text(title);
    header.append("div").attr("class", "text-gray-500 font-mono text-[10px]").text(subtitle);

    const svg = wrapper.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define Arrow Markers
    const defs = svg.append("defs");
    
    // Human Arrow
    defs.append("marker")
      .attr("id", `arrow-human-${title.replace(/\s/g, '')}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#22d3ee"); // Cyan-400

    // Bot Arrow
    defs.append("marker")
      .attr("id", `arrow-bot-${title.replace(/\s/g, '')}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#f87171"); // Red-400

    // Scales
    const x = d3.scaleLinear().domain([0, 100]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]); 

    // Heatmap Generation
    const n = 50; // Resolution
    const values = new Array(n * n);
    // Pre-calculate grid values
    for (let j = 0; j < n; ++j) {
      for (let i = 0; i < n; ++i) {
        values[j * n + i] = scoreFn(i / (n - 1) * 100, j / (n - 1) * 100);
      }
    }

    // Create vivid color scale (Plasma is high contrast)
    const colorScale = d3.scaleSequential(d3.interpolatePlasma).domain([0, 100]);

    // Contours
    const contours = d3.contours()
      .size([n, n])
      .thresholds(d3.range(0, 105, 2.5)) 
      (values);

    // Use d3.geoTransform for non-uniform scaling instead of d3.geoIdentity().scale(sx, sy)
    // This maps grid coordinates [0,n] to SVG coordinates [0, width] and flips Y
    const projection = d3.geoTransform({
      point: function(x, y) {
        this.stream.point(x * width / n, height - y * height / n);
      }
    });

    svg.selectAll("path.contour")
      .data(contours)
      .enter().append("path")
      .attr("class", "contour")
      .attr("d", d3.geoPath(projection))
      .attr("fill", d => colorScale(d.value))
      .attr("stroke", "none");

    // Grid Lines
    svg.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(d3.axisBottom(x).ticks(5).tickSize(height).tickFormat(null))
      .call(g => g.select(".domain").remove());

    svg.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(null))
      .call(g => g.select(".domain").remove());

    // Axes Labels
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(3))
      .attr("color", "#9ca3af")
      .select(".domain").remove();

    svg.append("g")
      .call(d3.axisLeft(y).ticks(3))
      .attr("color", "#9ca3af")
      .select(".domain").remove();

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 35)
      .attr("fill", "#cbd5e1")
      .attr("font-family", "monospace")
      .attr("font-size", "10")
      .attr("text-anchor", "middle")
      .text(xLabel);

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -30)
      .attr("x", -height / 2)
      .attr("fill", "#cbd5e1")
      .attr("font-family", "monospace")
      .attr("font-size", "10")
      .attr("text-anchor", "middle")
      .text(yLabel);

    // MARK OPTIMAL POINT (Target)
    svg.append("circle")
        .attr("cx", x(targetX))
        .attr("cy", y(targetY))
        .attr("r", 8)
        .attr("fill", "none")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);
    
    svg.append("line")
        .attr("x1", x(targetX) - 6).attr("y1", y(targetY))
        .attr("x2", x(targetX) + 6).attr("y2", y(targetY))
        .attr("stroke", "#ffffff").attr("stroke-width", 2);
    
    svg.append("line")
        .attr("x1", x(targetX)).attr("y1", y(targetY) - 6)
        .attr("x2", x(targetX)).attr("y2", y(targetY) + 6)
        .attr("stroke", "#ffffff").attr("stroke-width", 2);

    // Draw Paths
    const line = d3.line<TurnResult>()
      .x(d => x(xAccessor(d.recipe)))
      .y(d => y(yAccessor(d.recipe)))
      .curve(d3.curveLinear); 

    // Bot Path
    svg.append("path")
      .datum(bHist)
      .attr("fill", "none")
      .attr("stroke", "#f87171")
      .attr("stroke-width", 2)
      .attr("marker-mid", `url(#arrow-bot-${title.replace(/\s/g, '')})`)
      .attr("marker-end", `url(#arrow-bot-${title.replace(/\s/g, '')})`)
      .attr("d", line)
      .attr("opacity", 0.9)
      .attr("filter", "drop-shadow(0 0 2px rgba(0,0,0,1))");

    // Human Path
    svg.append("path")
      .datum(hHist)
      .attr("fill", "none")
      .attr("stroke", "#22d3ee")
      .attr("stroke-width", 2)
      .attr("marker-mid", `url(#arrow-human-${title.replace(/\s/g, '')})`)
      .attr("marker-end", `url(#arrow-human-${title.replace(/\s/g, '')})`)
      .attr("d", line)
      .attr("opacity", 0.9)
      .attr("filter", "drop-shadow(0 0 2px rgba(0,0,0,1))");

    // Start/End Dots
    // Bot
    svg.selectAll(".bot-node")
        .data(bHist)
        .enter().append("circle")
        .attr("cx", d => x(xAccessor(d.recipe)))
        .attr("cy", d => y(yAccessor(d.recipe)))
        .attr("r", 3)
        .attr("fill", "#f87171")
        .attr("stroke", "black");

    // Human
    svg.selectAll(".human-node")
        .data(hHist)
        .enter().append("circle")
        .attr("cx", d => x(xAccessor(d.recipe)))
        .attr("cy", d => y(yAccessor(d.recipe)))
        .attr("r", 3)
        .attr("fill", "#22d3ee")
        .attr("stroke", "black");
  };

  return (
    <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
      {/* Legend */}
      <div className="flex justify-center gap-8 mb-4 text-xs font-mono text-gray-300">
         <div className="flex items-center gap-2"><div className="w-3 h-3 bg-cyan-400 rounded-full border border-black"></div> YOUR PATH</div>
         <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-400 rounded-full border border-black"></div> AI PATH</div>
         <div className="flex items-center gap-2">
            <div className="w-4 h-4 relative border-2 border-white rounded-full flex items-center justify-center">
                <div className="absolute w-4 h-0.5 bg-white"></div>
                <div className="absolute h-4 w-0.5 bg-white"></div>
            </div> 
            OPTIMAL TARGET
         </div>
      </div>
      
      {/* Container forcing single row */}
      <div className="flex flex-row flex-nowrap justify-start md:justify-center min-w-max gap-4 p-2 md:p-4" ref={containerRef}>
         {/* D3 content injected here */}
      </div>
    </div>
  );
};