import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import AIAgentPanel from '@/components/AIAgentPanel';
import { useWSEvent } from '@/hooks/useWebSocket';
import api, { AIAgent } from '@/lib/api';

export default function AIAgents() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      const data = await api.get<AIAgent[]>('/agents');
      setAgents(data);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  useWSEvent<AIAgent>('agent:updated', (agent) => {
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? agent : a)));
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <AIAgentPanel agents={agents} onRefresh={fetchAgents} />
    </div>
  );
}
