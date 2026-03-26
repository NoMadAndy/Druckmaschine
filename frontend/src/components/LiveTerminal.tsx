import { useState, useRef, useEffect } from 'react';
import { Terminal, Maximize2, Minimize2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWSEvent } from '@/hooks/useWebSocket';

interface LiveTerminalProps {
  className?: string;
  title?: string;
  maxLines?: number;
}

interface TerminalLine {
  text: string;
  timestamp: number;
}

export default function LiveTerminal({ className, title = 'Live Output', maxLines = 500 }: LiveTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useWSEvent<{ text: string }>('terminal:output', (data) => {
    setLines((prev) => {
      const next = [...prev, { text: data.text, timestamp: Date.now() }];
      return next.length > maxLines ? next.slice(-maxLines) : next;
    });
  });

  useEffect(() => {
    if (containerRef.current && autoScrollRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl overflow-hidden border border-white/[0.06]',
        'bg-[#0c0c0c]',
        expanded && 'fixed inset-4 z-50',
        className
      )}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500" />
            <Circle className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
            <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500" />
          </div>
          <div className="flex items-center gap-1.5 ml-3">
            <Terminal className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-medium text-gray-400">{title}</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
        >
          {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Terminal output */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed min-h-[200px]"
      >
        {lines.length === 0 ? (
          <div className="text-green-500/50">
            <p>$ Waiting for output...</p>
            <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" />
          </div>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="text-green-400/90 whitespace-pre-wrap break-all">
              {line.text}
            </div>
          ))
        )}
        {lines.length > 0 && (
          <span className="inline-block w-2 h-4 bg-green-400 animate-pulse" />
        )}
      </div>
    </div>
  );
}
