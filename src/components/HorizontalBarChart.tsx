interface DataItem {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
}

interface HorizontalBarChartProps {
  data: DataItem[];
  title?: string;
  showValues?: boolean;
  maxItems?: number;
}

export default function HorizontalBarChart({
  data,
  title,
  showValues = true,
  maxItems = 10
}: HorizontalBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        {title && <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>}
        <div className="flex items-center justify-center py-8">
          <p className="text-slate-400">No data available</p>
        </div>
      </div>
    );
  }

  const displayData = data.slice(0, maxItems);
  const maxValue = Math.max(...displayData.map(d => d.value));

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      {title && <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>}

      <div className="space-y-4">
        {displayData.map((item, index) => {
          const percentage = (item.value / (item.maxValue || maxValue)) * 100;
          const barColor = item.color || '#3B82F6';

          return (
            <div key={index}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-700 truncate flex-1">
                  {item.label}
                </span>
                {showValues && (
                  <span className="text-sm font-bold text-slate-900 ml-2">
                    {(item.value || 0).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: barColor
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
