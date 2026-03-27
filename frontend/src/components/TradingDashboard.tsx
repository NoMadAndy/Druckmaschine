import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Shield, AlertTriangle,
  Play, Square, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';
import { useWSEvent } from '@/hooks/useWebSocket';
import api, { TradingPortfolio, TradingPosition } from '@/lib/api';

interface TradingDashboardProps {
  className?: string;
}

function PositionRow({ position }: { position: TradingPosition }) {
  const isPositive = position.pnl >= 0;
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 px-3 text-sm font-medium text-gray-200">{position.symbol}</td>
      <td className="py-2.5 px-3 text-sm text-gray-400 text-right">{position.quantity}</td>
      <td className="py-2.5 px-3 text-sm text-gray-400 text-right">{formatCurrency(position.avg_price)}</td>
      <td className="py-2.5 px-3 text-sm text-gray-200 text-right">{formatCurrency(position.current_price)}</td>
      <td className={cn('py-2.5 px-3 text-sm text-right font-medium', isPositive ? 'text-emerald-400' : 'text-red-400')}>
        {formatCurrency(position.pnl)}
      </td>
      <td className={cn('py-2.5 px-3 text-sm text-right', isPositive ? 'text-emerald-400' : 'text-red-400')}>
        {formatPercent(position.pnl_percent)}
      </td>
    </tr>
  );
}

export default function TradingDashboard({ className }: TradingDashboardProps) {
  const [portfolio, setPortfolio] = useState<TradingPortfolio | null>(null);
  const [isSimulation, setIsSimulation] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [strategy, setStrategy] = useState('momentum');

  useEffect(() => {
    api.get<TradingPortfolio>('/trading/portfolio').then(setPortfolio).catch(() => setPortfolio(null));
  }, []);

  useWSEvent<TradingPortfolio>('trading:update', setPortfolio);

  const handleModeToggle = () => {
    if (isSimulation) {
      setShowWarning(true);
    } else {
      setIsSimulation(true);
    }
  };

  const confirmRealMode = () => {
    setIsSimulation(false);
    setShowWarning(false);
  };

  const toggleRunning = async () => {
    try {
      if (isRunning) {
        await api.post('/trading/stop');
      } else {
        await api.post('/trading/start', { strategy, simulation: isSimulation });
      }
      setIsRunning(!isRunning);
    } catch {
      // handle error
    }
  };

  const chartData = portfolio?.history || [];
  const isPositivePnl = (portfolio?.total_pnl || 0) >= 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Warning dialog */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="glass-card p-6 max-w-md w-full mx-4 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-200">Switch to Real Trading?</h3>
                <p className="text-sm text-gray-500">This action will use real funds</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              You are about to switch from simulation to real trading mode. Real money will be at risk.
              Make sure you understand the risks before proceeding.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWarning(false)}
                className="glass-button flex-1"
              >
                Cancel
              </button>
              <button
                onClick={confirmRealMode}
                className="glass-button-danger flex-1"
              >
                Switch to Real
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Portfolio Value</span>
          </div>
          <p className="text-xl font-bold text-gray-200">
            {formatCurrency(portfolio?.total_value || 0)}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            {isPositivePnl ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs">Total P&L</span>
          </div>
          <p className={cn('text-xl font-bold', isPositivePnl ? 'text-emerald-400' : 'text-red-400')}>
            {formatCurrency(portfolio?.total_pnl || 0)}
          </p>
          <p className={cn('text-xs', isPositivePnl ? 'text-emerald-400/70' : 'text-red-400/70')}>
            {formatPercent(portfolio?.total_pnl_percent || 0)}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Cash</span>
          </div>
          <p className="text-xl font-bold text-gray-200">
            {formatCurrency(portfolio?.cash || 0)}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Shield className="w-4 h-4" />
            <span className="text-xs">Daily P&L</span>
          </div>
          <p className={cn(
            'text-xl font-bold',
            (portfolio?.daily_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {formatCurrency(portfolio?.daily_pnl || 0)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-200">Portfolio History</h3>
          <div className="flex items-center gap-3">
            {/* Strategy selector */}
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="glass-input text-xs py-1.5 px-3"
            >
              <option value="momentum">Momentum</option>
              <option value="mean_reversion">Mean Reversion</option>
              <option value="ml_ensemble">ML Ensemble</option>
              <option value="arbitrage">Arbitrage</option>
            </select>

            {/* Mode toggle */}
            <button
              onClick={handleModeToggle}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                isSimulation
                  ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              )}
            >
              {isSimulation ? (
                <ToggleLeft className="w-4 h-4" />
              ) : (
                <ToggleRight className="w-4 h-4" />
              )}
              {isSimulation ? 'Simulation' : 'REAL'}
            </button>

            {/* Start/Stop */}
            <button
              onClick={toggleRunning}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                isRunning
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
              )}
            >
              {isRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isRunning ? 'Stop' : 'Start'}
            </button>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(value: number) => [formatCurrency(value), 'Value']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#portfolioGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Positions table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-gray-200">Current Positions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-xs font-medium text-gray-500 py-2.5 px-3">Symbol</th>
                <th className="text-right text-xs font-medium text-gray-500 py-2.5 px-3">Qty</th>
                <th className="text-right text-xs font-medium text-gray-500 py-2.5 px-3">Avg Price</th>
                <th className="text-right text-xs font-medium text-gray-500 py-2.5 px-3">Current</th>
                <th className="text-right text-xs font-medium text-gray-500 py-2.5 px-3">P&L</th>
                <th className="text-right text-xs font-medium text-gray-500 py-2.5 px-3">%</th>
              </tr>
            </thead>
            <tbody>
              {portfolio?.positions && portfolio.positions.length > 0 ? (
                portfolio.positions.map((pos) => (
                  <PositionRow key={pos.symbol} position={pos} />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-600">
                    No open positions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
