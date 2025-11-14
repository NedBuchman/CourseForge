interface DataPoint {
  label: string;
  value: number;
}

interface SimpleLineChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
}

export default function SimpleLineChart({
  data,
  title,
  height = 200,
  color = '#3B82F6',
  showGrid = true
}: SimpleLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        {title && <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>}
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <p className="text-slate-400">No data available</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = ((maxValue - d.value) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const pathData = data.length === 1
    ? `M 50 ${((maxValue - data[0].value) / range) * 100} L 50 ${((maxValue - data[0].value) / range) * 100}`
    : data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = ((maxValue - d.value) / range) * 100;
        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      }).join(' ');

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      {title && <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>}

      <div className="relative" style={{ height: `${height}px` }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          {showGrid && (
            <g>
              <line x1="0" y1="25" x2="100" y2="25" stroke="#E2E8F0" strokeWidth="0.2" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#E2E8F0" strokeWidth="0.2" />
              <line x1="0" y1="75" x2="100" y2="75" stroke="#E2E8F0" strokeWidth="0.2" />
            </g>
          )}

          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = ((maxValue - d.value) / range) * 100;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1.5"
                fill={color}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between mt-4 text-xs text-slate-600">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
