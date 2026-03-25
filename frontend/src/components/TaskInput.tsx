import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, ChevronDown, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskInputProps {
  onSubmit: (title: string, description: string) => Promise<void>;
  className?: string;
}

interface PlanStep {
  title: string;
  description: string;
}

export default function TaskInput({ onSubmit, className }: TaskInputProps) {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [plan, setPlan] = useState<PlanStep[] | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const analyze = () => {
    if (!input.trim()) return;
    setIsAnalyzing(true);
    // Simulate AI analysis
    setTimeout(() => {
      setPlan([
        { title: 'Parse requirements', description: 'Analyze the task description and extract key requirements' },
        { title: 'Create implementation plan', description: 'Design the architecture and component structure' },
        { title: 'Generate code', description: 'Write the implementation with tests' },
        { title: 'Review & validate', description: 'Run tests and quality checks' },
      ]);
      setIsAnalyzing(false);
      setShowPlan(true);
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!input.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const title = input.split('\n')[0].slice(0, 100);
      await onSubmit(title, input);
      setInput('');
      setPlan(null);
      setShowPlan(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('glass-card overflow-hidden', className)}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent-purple" />
          <span className="text-sm font-medium text-gray-300">Smart Task Input</span>
          {isAnalyzing && (
            <span className="flex items-center gap-1.5 text-xs text-accent-blue animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              AI is analyzing...
            </span>
          )}
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="glass-input w-full text-sm resize-none min-h-[80px] pr-24"
            placeholder="Describe what you want to build or accomplish... (Ctrl+Enter to submit)"
            rows={3}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <button
              onClick={analyze}
              disabled={!input.trim() || isAnalyzing}
              className="p-2 rounded-lg text-accent-purple hover:bg-accent-purple/10 transition-colors disabled:opacity-30"
              title="Analyze with AI"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isSubmitting}
              className="p-2 rounded-lg bg-gradient-to-r from-accent-blue to-accent-purple text-white hover:shadow-lg hover:shadow-accent-blue/20 transition-all disabled:opacity-30"
              title="Submit task"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Plan preview */}
      {plan && showPlan && (
        <div className="border-t border-white/[0.06] animate-slide-down">
          <button
            onClick={() => setShowPlan(!showPlan)}
            className="flex items-center justify-between w-full px-4 py-2 text-xs text-gray-400 hover:bg-white/[0.02] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-accent-purple" />
              Execution Plan ({plan.length} steps)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPlan(null);
                  setShowPlan(false);
                }}
                className="text-gray-600 hover:text-gray-400"
              >
                <X className="w-3 h-3" />
              </button>
              <ChevronDown className="w-3 h-3" />
            </div>
          </button>
          <div className="px-4 pb-3 space-y-2">
            {plan.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2 rounded-lg bg-white/[0.02]"
              >
                <span className="w-5 h-5 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-[10px] font-bold text-accent-blue shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-xs font-medium text-gray-300">{step.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
