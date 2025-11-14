
interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
  showValues?: boolean;
}

export function SimpleBarChart({ data, title, height = 300, showValues = true }: SimpleBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
        <div className="flex items-center justify-center h-64 text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}

      <div className="flex items-end justify-between space-x-2" style={{ height: `${height}px` }}>
        {data.map((point, index) => {
          const barHeight = range > 0 ? ((point.value - minValue) / range) * (height - 40) : 20;
          const barColor = point.color || '#3B82F6';

          return (
            <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="relative w-full flex flex-col items-center justify-end" style={{ height: `${height - 40}px` }}>
                {showValues && point.value > 0 && (
                  <span className="text-xs font-medium text-gray-600 mb-1">
                    {point.value}
                  </span>
                )}
                <div
                  className="w-full rounded-t-md transition-all hover:opacity-80 cursor-pointer"
                  style={{
                    height: `${Math.max(barHeight, 2)}px`,
                    backgroundColor: barColor,
                  }}
                  title={`${point.label}: ${point.value}`}
                />
              </div>
              <div className="mt-2 text-xs text-gray-600 text-center w-full truncate px-1">
                {point.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
