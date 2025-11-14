interface ProgressBarProps {
  percentage: number;
  label?: string;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  showPercentage?: boolean;
  height?: 'sm' | 'md' | 'lg';
}

export default function ProgressBar({
  percentage,
  label,
  color = 'blue',
  showPercentage = true,
  height = 'md'
}: ProgressBarProps) {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    orange: 'bg-orange-600',
    red: 'bg-red-600',
    purple: 'bg-purple-600'
  };

  const heightClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6'
  };

  const safePercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm font-semibold text-slate-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-bold text-slate-900">{safePercentage.toFixed(1)}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-slate-200 rounded-full ${heightClasses[height]} overflow-hidden`}>
        <div
          className={`${colorClasses[color]} ${heightClasses[height]} rounded-full transition-all duration-500`}
          style={{ width: `${safePercentage}%` }}
        ></div>
      </div>
    </div>
  );
}
