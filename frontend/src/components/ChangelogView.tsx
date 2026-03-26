import { useState } from 'react';
import { ChevronDown, ChevronRight, Tag, Sparkles, Bug, Zap, AlertTriangle } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { ChangelogEntry } from '@/lib/api';

interface ChangelogViewProps {
  entries: ChangelogEntry[];
  className?: string;
}

const typeConfig = {
  feature: { icon: Sparkles, color: 'text-accent-blue', bg: 'bg-accent-blue/10', label: 'Feature' },
  fix: { icon: Bug, color: 'text-accent-green', bg: 'bg-accent-green/10', label: 'Fix' },
  improvement: { icon: Zap, color: 'text-accent-purple', bg: 'bg-accent-purple/10', label: 'Improvement' },
  breaking: { icon: AlertTriangle, color: 'text-accent-rose', bg: 'bg-accent-rose/10', label: 'Breaking' },
};

function ChangelogVersionCard({ entry }: { entry: ChangelogEntry }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className="absolute left-0 top-2 w-4 h-4 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple border-2 border-dark-800 z-10" />

      <div className="glass-card p-5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-semibold">
              <Tag className="w-3 h-3" />
              v{entry.version}
            </span>
            <span className="text-sm text-gray-500">{formatDate(entry.date)}</span>
            <span className="text-xs text-gray-600">{entry.entries.length} changes</span>
          </div>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {expanded && (
          <div className="mt-4 space-y-2 animate-slide-down">
            {entry.entries.map((item, i) => {
              const config = typeConfig[item.type] || typeConfig.improvement;
              const Icon = config.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <span className={cn('mt-0.5 p-1 rounded', config.bg)}>
                    <Icon className={cn('w-3 h-3', config.color)} />
                  </span>
                  <div className="flex-1">
                    <span className={cn('text-[10px] font-medium uppercase', config.color)}>
                      {config.label}
                    </span>
                    <p className="text-sm text-gray-300 mt-0.5">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChangelogView({ entries, className }: ChangelogViewProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Timeline line */}
      <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-accent-blue/40 via-accent-purple/20 to-transparent" />

      <div className="space-y-6">
        {entries.map((entry) => (
          <ChangelogVersionCard key={entry.version} entry={entry} />
        ))}
      </div>
    </div>
  );
}
