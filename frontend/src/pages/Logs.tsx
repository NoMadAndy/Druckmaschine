import { useState, useEffect } from 'react';
import { ScrollText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import LogViewer from '@/components/LogViewer';
import api, { LogEntry } from '@/lib/api';

const sources = [
  { id: 'app', label: 'Application' },
  { id: 'docker', label: 'Docker' },
  { id: 'ai', label: 'AI Engine' },
  { id: 'trading', label: 'Trading' },
  { id: 'system', label: 'System' },
];

export default function Logs() {
  const [activeSource, setActiveSource] = useState('app');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<LogEntry[]>(`/logs?source=${activeSource}&limit=200`)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [activeSource]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">System Logs</h2>
          <p className="text-sm text-gray-500">Real-time log streaming from all sources</p>
        </div>
      </div>

      {/* Source tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 shrink-0">
        {sources.map((src) => (
          <button
            key={src.id}
            onClick={() => setActiveSource(src.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200',
              activeSource === src.id
                ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] border border-transparent'
            )}
          >
            {src.label}
          </button>
        ))}
      </div>

      {/* Log viewer */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
        </div>
      ) : (
        <LogViewer
          initialLogs={logs}
          source={activeSource}
          className="flex-1 min-h-0"
          maxLines={2000}
        />
      )}
    </div>
  );
}
