import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'slate';
  trend?: {
    value: number;
    label: string;
  };
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
  trend
}: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    slate: 'bg-slate-100 text-slate-700'
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-600 mb-1">{title}</p>
          <p className="text-3xl font-black text-slate-900">{value}</p>
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
      {subtitle && (
        <p className="text-sm text-slate-600">{subtitle}</p>
      )}
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          <span className={`text-sm font-bold ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-slate-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
