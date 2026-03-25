import { useState, useEffect } from 'react';
import { FileText, Loader2, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChangelogView from '@/components/ChangelogView';
import api, { ChangelogEntry } from '@/lib/api';

export default function Changelog() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [versionFilter, setVersionFilter] = useState('');

  useEffect(() => {
    api
      .get<ChangelogEntry[]>('/changelog')
      .then(setEntries)
      .catch(() => {
        // Use demo data if API unavailable
        setEntries([
          {
            version: '2.1.0',
            date: '2026-03-20',
            entries: [
              { type: 'feature', description: 'Added real-time trading dashboard with portfolio tracking' },
              { type: 'feature', description: 'AI Agent management panel with execution history' },
              { type: 'improvement', description: 'Improved WebSocket reconnection logic with exponential backoff' },
              { type: 'fix', description: 'Fixed memory leak in live terminal component' },
            ],
          },
          {
            version: '2.0.0',
            date: '2026-03-10',
            entries: [
              { type: 'breaking', description: 'Complete frontend rewrite with React 18 and TypeScript' },
              { type: 'feature', description: 'New glass-morphism design system with dark theme' },
              { type: 'feature', description: 'Real-time log viewer with filtering and auto-scroll' },
              { type: 'improvement', description: 'Mobile-first responsive layout with collapsible sidebar' },
            ],
          },
          {
            version: '1.5.0',
            date: '2026-02-25',
            entries: [
              { type: 'feature', description: 'GPU monitoring with real-time utilization gauges' },
              { type: 'feature', description: 'Project management with task tracking' },
              { type: 'fix', description: 'Fixed authentication token refresh on session expiry' },
            ],
          },
          {
            version: '1.0.0',
            date: '2026-02-01',
            entries: [
              { type: 'feature', description: 'Initial release of Druckmaschine platform' },
              { type: 'feature', description: 'Task creation and execution pipeline' },
              { type: 'feature', description: 'JWT-based authentication system' },
              { type: 'feature', description: 'Docker-based deployment with Nginx reverse proxy' },
            ],
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = versionFilter
    ? entries.filter((e) => e.version.includes(versionFilter))
    : entries;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Changelog</h2>
          <p className="text-sm text-gray-500">Track all updates and improvements</p>
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={versionFilter}
            onChange={(e) => setVersionFilter(e.target.value)}
            className="glass-input pl-9 text-sm w-48"
            placeholder="Filter version..."
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <ChangelogView entries={filtered} />
      ) : (
        <div className="glass-card p-12 text-center">
          <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No changelog entries found</p>
        </div>
      )}
    </div>
  );
}
