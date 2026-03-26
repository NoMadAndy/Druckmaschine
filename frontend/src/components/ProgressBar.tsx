import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'purple' | 'green' | 'amber' | 'red';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const colorMap = {
  blue: 'from-blue-500 to-blue-400',
  purple: 'from-purple-500 to-purple-400',
  green: 'from-emerald-500 to-emerald-400',
  amber: 'from-amber-500 to-amber-400',
  red: 'from-red-500 to-red-400',
};

const glowMap = {
  blue: 'shadow-blue-500/30',
  purple: 'shadow-purple-500/30',
  green: 'shadow-emerald-500/30',
  amber: 'shadow-amber-500/30',
  red: 'shadow-red-500/30',
};

export default function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'blue',
  showLabel = false,
  animated = true,
  className,
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400">Progress</span>
          <span className="text-xs font-medium text-gray-300">{Math.round(percent)}%</span>
        </div>
      )}
      <div className={cn('w-full rounded-full bg-white/5 overflow-hidden', sizeMap[size])}>
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out',
            colorMap[color],
            animated && percent > 0 && percent < 100 && 'animate-pulse',
            percent > 0 && `shadow-sm ${glowMap[color]}`
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
