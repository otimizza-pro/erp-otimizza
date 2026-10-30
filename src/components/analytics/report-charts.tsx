"use client";

import React, { useState } from "react";

export function formatBRL(val: number | undefined | null) {
  if (val === undefined || val === null || isNaN(val)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

// =========================================================================
// 1. GRÁFICO DE ROSCA / DONUT SVG INTERATIVO
// =========================================================================
export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  sublabel?: string;
}

interface DonutChartProps {
  title: string;
  subtitle?: string;
  data: DonutSegment[];
  centerLabel?: string;
}

export function DonutChart({ title, subtitle, data, centerLabel = "Total" }: DonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const validData = data.filter((d) => d.value > 0);
  const total = validData.reduce((acc, curr) => acc + curr.value, 0);

  const radius = 68;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
      <div className="mb-4">
        <h4 className="text-sm font-bold text-zinc-950">{title}</h4>
        {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>

      {total === 0 ? (
        <div className="py-12 text-center text-xs text-zinc-400">
          Nenhum dado registrado para compor o gráfico.
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-6 my-auto">
          {/* SVG Donut */}
          <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90 transform">
              <circle
                cx="90"
                cy="90"
                r={radius}
                className="text-zinc-100"
                strokeWidth={strokeWidth}
                stroke="currentColor"
                fill="transparent"
              />
              {validData.map((item, idx) => {
                const percent = item.value / total;
                const strokeDasharray = `${percent * circumference} ${circumference}`;
                const strokeDashoffset = -accumulatedPercent * circumference;
                accumulatedPercent += percent;

                const isHovered = hoveredIdx === idx;

                return (
                  <circle
                    key={item.label}
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </svg>

            {/* Centro com Total ou Hover */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              {hoveredIdx !== null && validData[hoveredIdx] ? (
                <>
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase line-clamp-1 max-w-[90px]">
                    {validData[hoveredIdx].label}
                  </span>
                  <span className="text-sm font-extrabold text-zinc-950 font-mono">
                    {formatBRL(validData[hoveredIdx].value)}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-600">
                    {((validData[hoveredIdx].value / total) * 100).toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    {centerLabel}
                  </span>
                  <span className="text-sm font-extrabold text-zinc-950 font-mono">
                    {formatBRL(total)}
                  </span>
                  <span className="text-[10px] text-zinc-400">100%</span>
                </>
              )}
            </div>
          </div>

          {/* Legenda Interativa */}
          <div className="flex-1 w-full space-y-2">
            {validData.map((item, idx) => {
              const pct = ((item.value / total) * 100).toFixed(1);
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={item.label}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer ${
                    isHovered ? "bg-zinc-100/90 shadow-2xs" : "hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-800 truncate">{item.label}</div>
                      {item.sublabel && (
                        <div className="text-[10px] text-zinc-400 truncate">{item.sublabel}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-zinc-900 font-mono">{formatBRL(item.value)}</div>
                    <div className="text-[10px] text-zinc-500 font-medium">{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 2. GRÁFICO DE BARRAS COMPARATIVO DUAL (PREVISTO X REALIZADO / RECEITA X DESPESA)
// =========================================================================
export interface DualBarItem {
  label: string;
  valA: number;
  valB: number;
  subinfo?: string;
}

interface BarChartDualProps {
  title: string;
  subtitle?: string;
  data: DualBarItem[];
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
}

export function BarChartDual({
  title,
  subtitle,
  data,
  labelA,
  labelB,
  colorA = "#10b981", // Emerald
  colorB = "#f43f5e", // Rose / Red
}: BarChartDualProps) {
  const [activeItem, setActiveItem] = useState<DualBarItem | null>(null);

  const maxVal = Math.max(
    1,
    ...data.flatMap((d) => [d.valA, d.valB])
  );

  return (
    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h4 className="text-sm font-bold text-zinc-950">{title}</h4>
          {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Legenda das Barras */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md" style={{ backgroundColor: colorA }} />
            <span className="text-zinc-700">{labelA}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md" style={{ backgroundColor: colorB }} />
            <span className="text-zinc-700">{labelB}</span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-12 text-center text-xs text-zinc-400">
          Nenhum dado para o período selecionado.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-56 flex items-end gap-3 sm:gap-6 pt-6 pb-2 border-b border-zinc-100 overflow-x-auto">
            {data.map((item) => {
              const heightA = Math.max(4, (item.valA / maxVal) * 100);
              const heightB = Math.max(4, (item.valB / maxVal) * 100);
              const isSelected = activeItem?.label === item.label;

              return (
                <div
                  key={item.label}
                  className="flex-1 flex flex-col items-center gap-2 group cursor-pointer min-w-[50px]"
                  onMouseEnter={() => setActiveItem(item)}
                  onMouseLeave={() => setActiveItem(null)}
                >
                  <div className="w-full flex items-end justify-center gap-1.5 h-44 relative">
                    {/* Barra A */}
                    <div
                      className="w-1/2 max-w-[18px] rounded-t-md transition-all duration-300 relative group-hover:brightness-110 shadow-2xs"
                      style={{
                        height: `${heightA}%`,
                        backgroundColor: colorA,
                        opacity: isSelected ? 1 : 0.9,
                      }}
                    />
                    {/* Barra B */}
                    <div
                      className="w-1/2 max-w-[18px] rounded-t-md transition-all duration-300 relative group-hover:brightness-110 shadow-2xs"
                      style={{
                        height: `${heightB}%`,
                        backgroundColor: colorB,
                        opacity: isSelected ? 1 : 0.9,
                      }}
                    />
                  </div>
                  <span className={`text-[11px] font-semibold transition ${isSelected ? "text-zinc-950 font-bold" : "text-zinc-500"}`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Detalhe do Hover */}
          {activeItem ? (
            <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
              <span className="font-bold text-zinc-900">{activeItem.label}</span>
              <div className="flex items-center gap-4">
                <span className="font-semibold text-emerald-700">
                  {labelA}: <strong className="font-mono">{formatBRL(activeItem.valA)}</strong>
                </span>
                <span className="font-semibold text-rose-700">
                  {labelB}: <strong className="font-mono">{formatBRL(activeItem.valB)}</strong>
                </span>
                {activeItem.subinfo && (
                  <span className="text-[11px] text-zinc-500 bg-white px-2 py-0.5 rounded-md border border-zinc-200">
                    {activeItem.subinfo}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-400 text-center py-1">
              Passe o mouse sobre as barras para inspecionar os valores exatos de cada competência.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 3. GRÁFICO DE TENDÊNCIA E EVOLUÇÃO (LINHA / ÁREA SVG)
// =========================================================================
export interface AreaTrendPoint {
  label: string;
  value: number;
  secondary?: number;
  badge?: string;
}

interface AreaTrendChartProps {
  title: string;
  subtitle?: string;
  data: AreaTrendPoint[];
  metricName?: string;
  lineColor?: string;
}

export function AreaTrendChart({
  title,
  subtitle,
  data,
  metricName = "Valor",
  lineColor = "#6366f1", // Indigo
}: AreaTrendChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<AreaTrendPoint | null>(null);

  if (data.length === 0) {
    return (
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs text-center text-xs text-zinc-400">
        Nenhum ponto registrado para desenhar a curva de tendência.
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(1, ...values);
  const range = maxVal - minVal || 1;

  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(1, data.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((d.value - minVal) / range) * (height - paddingY * 2);
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h4 className="text-sm font-bold text-zinc-950">{title}</h4>
          {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
        {hoveredPoint && (
          <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl text-xs font-semibold animate-in fade-in">
            <span className="text-zinc-500">{hoveredPoint.label}:</span>
            <span className="font-extrabold text-zinc-900 font-mono">{formatBRL(hoveredPoint.value)}</span>
            {hoveredPoint.badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                {hoveredPoint.badge}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="#f1f5f9"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="#f1f5f9"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#e2e8f0"
          />

          {/* Area Fill */}
          <path d={areaD} fill="url(#areaGradient)" />

          {/* Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke={lineColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((p, i) => (
            <g
              key={i}
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredPoint(p.data)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredPoint?.label === p.data.label ? "6" : "4"}
                fill="#ffffff"
                stroke={lineColor}
                strokeWidth="3"
                className="transition-all duration-150 group-hover:scale-125"
              />
              <text
                x={p.x}
                y={height - 5}
                textAnchor="middle"
                className="text-[10px] fill-zinc-400 font-semibold"
              >
                {p.data.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// =========================================================================
// 4. RANKING EM BARRAS HORIZONTAIS COM PROGRESSO E MARGEM
// =========================================================================
export interface RankingItem {
  id: string;
  title: string;
  subtitle?: string;
  value: number;
  secondaryValue?: number;
  badge?: string;
  badgeColor?: "emerald" | "blue" | "amber" | "rose" | "zinc";
}

interface HorizontalRankingBarsProps {
  title: string;
  subtitle?: string;
  items: RankingItem[];
  emptyMessage?: string;
}

export function HorizontalRankingBars({
  title,
  subtitle,
  items,
  emptyMessage = "Nenhum dado encontrado para o ranking.",
}: HorizontalRankingBarsProps) {
  const maxVal = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
      <div className="mb-4">
        <h4 className="text-sm font-bold text-zinc-950">{title}</h4>
        {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-xs text-zinc-400">{emptyMessage}</div>
      ) : (
        <div className="space-y-3.5 my-auto">
          {items.slice(0, 7).map((item, idx) => {
            const widthPct = Math.min(100, Math.max(5, (item.value / maxVal) * 100));

            return (
              <div key={item.id} className="space-y-1.5 group">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0 pr-3">
                    <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-zinc-800 truncate">{item.title}</span>
                    {item.subtitle && (
                      <span className="text-[10px] text-zinc-400 truncate hidden sm:inline">
                        • {item.subtitle}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="font-bold text-zinc-950 font-mono">
                      {formatBRL(item.value)}
                    </span>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra de Progresso Visual */}
                <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-zinc-800 to-zinc-950 rounded-full transition-all duration-500 ease-out group-hover:from-blue-600 group-hover:to-indigo-600"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 5. GRÁFICO DE FAIXAS DE VENCIMENTO / AGING (INADIMPLÊNCIA)
// =========================================================================
export interface AgingBracket {
  label: string;
  count: number;
  amount: number;
  color: string;
  statusBadge: string;
}

interface AgingBucketsChartProps {
  title: string;
  subtitle?: string;
  brackets: AgingBracket[];
}

export function AgingBucketsChart({ title, subtitle, brackets }: AgingBucketsChartProps) {
  const totalAmount = brackets.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
      <div>
        <h4 className="text-sm font-bold text-zinc-950">{title}</h4>
        {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {brackets.map((b) => {
          const pct = totalAmount > 0 ? ((b.amount / totalAmount) * 100).toFixed(1) : "0.0";
          return (
            <div
              key={b.label}
              className="p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-50 transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-600">{b.label}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-zinc-200 text-zinc-500">
                  {b.count} títulos
                </span>
              </div>
              <div className="text-base font-extrabold text-zinc-950 font-mono">
                {formatBRL(b.amount)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>Participação</span>
                <span className="font-bold">{pct}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-200/70 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: b.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
