
interface FunnelStep {
  label: string;
  value: number;
  percentage: number;
}

interface FunnelChartProps {
  steps: FunnelStep[];
  title?: string;
}

export function FunnelChart({ steps, title }: FunnelChartProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
        <div className="flex items-center justify-center h-64 text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const colors = [
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#F59E0B',
    '#10B981',
    '#6366F1',
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>}

      <div className="space-y-3">
        {steps.map((step, index) => {
          const width = step.percentage;
          const color = colors[index % colors.length];

          return (
            <div key={index} className="relative">
              <div className="flex items-center mb-1">
                <span className="text-sm font-medium text-gray-700 flex-1">{step.label}</span>
                <span className="text-sm text-gray-500 ml-2">
                  {step.value} ({step.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end px-3 transition-all"
                  style={{
                    width: `${width}%`,
                    backgroundColor: color,
                    minWidth: step.percentage > 5 ? undefined : '2%',
                  }}
                >
                  {width > 15 && (
                    <span className="text-white text-xs font-semibold">
                      {step.percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="absolute -bottom-1 left-0 w-full flex justify-center">
                  <div className="text-xs text-gray-400">
                    ↓
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
