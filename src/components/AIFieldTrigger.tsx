import { Sparkles } from 'lucide-react';

interface AIFieldTriggerProps {
  onClick: () => void;
}

export default function AIFieldTrigger({ onClick }: AIFieldTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors group mt-2"
    >
      <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
      <span className="font-medium">Need suggestions?</span>
    </button>
  );
}
