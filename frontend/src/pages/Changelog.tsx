import { useState, useEffect } from 'react';
import { FileText, Loader2, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChangelogView from '@/components/ChangelogView';
import api from '@/lib/api';
import type { ChangelogEntry } from '@/lib/api';

export default function Changelog() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [versionFilter, setVersionFilter] = useState('');

  useEffect(() => {
    api
      .get<{ id: number; version: string; title: string; description: string; changes: string[]; created_at: string }[]>('/changelog')
      .then((data) =>
        setEntries(
          data.map((e) => ({
            version: e.version,
            date: e.created_at.split('T')[0],
            entries: [
              ...(e.title ? [{ type: 'feature' as const, description: e.title }] : []),
              ...e.changes.map((c) => ({ type: 'improvement' as const, description: c })),
            ],
          }))
        )
      )
      .catch(() => setEntries([]))
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
