import { useState, useEffect } from 'react';
import { Cpu, Thermometer, Zap, HardDrive } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { useWSEvent } from '@/hooks/useWebSocket';
import api, { GPUInfo } from '@/lib/api';

interface GPUStatusProps {
  className?: string;
  compact?: boolean;
}

function GaugeRing({ value, size = 80, color }: { value: number; size?: number; color: string }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-white/5"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-200">{Math.round(value)}%</span>
      </div>
    </div>
  );
}

function TempIndicator({ temp }: { temp: number }) {
  const color = temp > 85 ? '#ef4444' : temp > 70 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-2">
      <Thermometer className="w-4 h-4" style={{ color }} />
      <span className="text-sm font-medium" style={{ color }}>
        {temp}°C
      </span>
    </div>
  );
}

export default function GPUStatus({ className, compact = false }: GPUStatusProps) {
  const [gpu, setGpu] = useState<GPUInfo | null>(null);

  useEffect(() => {
    api.get<GPUInfo>('/ai/gpu-status').then(setGpu).catch(() => {});
  }, []);

  useWSEvent<GPUInfo>('gpu:status', (data) => {
    setGpu(data);
  });

  if (!gpu) {
    return (
      <div className={cn('glass-card p-4', className)}>
        <div className="flex items-center gap-2 text-gray-500">
          <Cpu className="w-4 h-4" />
          <span className="text-sm">GPU status unavailable</span>
        </div>
      </div>
    );
  }

  const memPercent = (gpu.memory_used / gpu.memory_total) * 100;
  const powerPercent = (gpu.power_draw / gpu.power_limit) * 100;

  if (compact) {
    return (
      <div className={cn('glass-card p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GaugeRing value={gpu.utilization} size={52} color="#3b82f6" />
            <div>
              <p className="text-xs text-gray-500">GPU</p>
              <p className="text-sm font-medium text-gray-200 truncate max-w-[120px]">{gpu.name}</p>
            </div>
          </div>
          <TempIndicator temp={gpu.temperature} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('glass-card p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-accent-blue" />
          <h3 className="text-sm font-semibold text-gray-200">GPU Status</h3>
        </div>
        <span className="text-xs text-gray-500">{gpu.name}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Utilization */}
        <div className="flex flex-col items-center gap-2">
          <GaugeRing value={gpu.utilization} color="#3b82f6" />
          <span className="text-xs text-gray-500">Utilization</span>
        </div>

        {/* Memory */}
        <div className="flex flex-col items-center gap-2">
          <GaugeRing value={memPercent} color="#8b5cf6" />
          <span className="text-xs text-gray-500">
            {formatBytes(gpu.memory_used * 1024 * 1024)} / {formatBytes(gpu.memory_total * 1024 * 1024)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
          <Thermometer className="w-4 h-4 text-amber-400" />
          <div>
            <p className="text-[10px] text-gray-500">Temperature</p>
            <p className="text-sm font-medium text-gray-200">{gpu.temperature}°C</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
          <Zap className="w-4 h-4 text-amber-400" />
          <div>
            <p className="text-[10px] text-gray-500">Power</p>
            <p className="text-sm font-medium text-gray-200">
              {Math.round(gpu.power_draw)}W / {Math.round(gpu.power_limit)}W
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
