import { useState, useRef, useEffect, useCallback } from 'react';
import { Pause, Play, ArrowDown, Filter, X } from 'lucide-react';
import { cn, getLogLevelColor, formatTime } from '@/lib/utils';
import { useWSEvent } from '@/hooks/useWebSocket';
import type { LogEntry } from '@/lib/api';

interface LogViewerProps {
  initialLogs?: LogEntry[];
  source?: string;
  maxLines?: number;
  className?: string;
}

const levels = ['all', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

export default function LogViewer({ initialLogs = [], source, maxLines = 1000, className }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [paused, setPaused] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [showFilter, setShowFilter] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Auto-scroll logic
  const scrollToBottom = useCallback(() => {
    if (containerRef.current && autoScrollRef.current && !paused) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [paused]);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  // Detect manual scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  // WebSocket log events
  useWSEvent<LogEntry>('log:entry', (entry) => {
    if (source && entry.source !== source) return;
    if (paused) return;
    setLogs((prev) => {
      const next = [...prev, entry];
      return next.length > maxLines ? next.slice(-maxLines) : next;
    });
  });

  const filteredLogs = filterLevel === 'all' ? logs : logs.filter((l) => l.level === filterLevel);

  const clearLogs = () => setLogs([]);

  return (
    <div className={cn('flex flex-col glass-card overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">
            {filteredLogs.length} lines
          </span>
          {filterLevel !== 'all' && (
            <span className={cn('status-badge border text-[10px]', getLogLevelColor(filterLevel))}>
              {filterLevel}
              <button onClick={() => setFilterLevel('all')} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={cn(
              'p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors',
              showFilter && 'text-accent-blue bg-accent-blue/10'
            )}
            title="Filter by level"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPaused(!paused)}
            className={cn(
              'p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors',
              paused && 'text-amber-400 bg-amber-400/10'
            )}
            title={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              autoScrollRef.current = true;
              scrollToBottom();
            }}
            className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearLogs}
            className="px-2 py-1 rounded text-[10px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilter && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.06] animate-slide-down shrink-0">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={cn(
                'px-2.5 py-1 rounded text-xs transition-colors',
                filterLevel === level
                  ? 'bg-white/[0.08] text-gray-200'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              )}
            >
              {level}
            </button>
          ))}
        </div>
      )}

      {/* Log content */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed min-h-0"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600">
            <p>No logs yet. Waiting for output...</p>
          </div>
        ) : (
          filteredLogs.map((log, i) => (
            <div key={log.id || i} className="flex gap-3 py-0.5 hover:bg-white/[0.02] rounded px-1">
              <span className="text-gray-600 shrink-0 select-none">{formatTime(log.timestamp)}</span>
              <span
                className={cn(
                  'uppercase w-12 text-right shrink-0 font-semibold select-none',
                  getLogLevelColor(log.level)
                )}
              >
                {log.level}
              </span>
              {log.source && (
                <span className="text-gray-600 shrink-0">[{log.source}]</span>
              )}
              <span className="text-gray-300 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Paused indicator */}
      {paused && (
        <div className="px-3 py-1.5 bg-amber-400/5 border-t border-amber-400/10 text-center">
          <span className="text-xs text-amber-400">Paused - new logs are buffered</span>
        </div>
      )}
    </div>
  );
}
