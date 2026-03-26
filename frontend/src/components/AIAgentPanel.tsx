import { useState } from 'react';
import {
  Bot, Play, Square, Plus, Trash2, ChevronDown, ChevronRight,
  Code, Clock, AlertCircle, CheckCircle2, Loader2, X,
} from 'lucide-react';
import { cn, getStatusColor, formatRelative } from '@/lib/utils';
import type { AIAgent, AgentExecution } from '@/lib/api';
import api from '@/lib/api';

interface AIAgentPanelProps {
  agents: AIAgent[];
  onRefresh: () => void;
  className?: string;
}

function ExecutionLog({ execution }: { execution: AgentExecution }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-white/[0.04] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
          <span className={cn('status-badge border text-[10px]', getStatusColor(execution.status))}>
            {execution.status}
          </span>
          <span className="text-xs text-gray-500">{formatRelative(execution.started_at)}</span>
        </div>
        {execution.completed_at && (
          <span className="text-[10px] text-gray-600">
            Duration: {Math.round((new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()) / 1000)}s
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 animate-slide-down">
          {execution.result && (
            <p className="text-xs text-gray-400 mb-2">{execution.result}</p>
          )}
          {execution.logs.length > 0 && (
            <div className="bg-[#0c0c0c] rounded-lg p-2 font-mono text-[10px] text-green-400/80 max-h-32 overflow-y-auto">
              {execution.logs.map((log, i) => (
                <div key={i} className="py-0.5">{log}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent, onRefresh }: { agent: AIAgent; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(agent.status === 'running');

  const toggleAgent = async () => {
    try {
      if (running) {
        await api.post(`/agents/${agent.id}/stop`);
      } else {
        await api.post(`/agents/${agent.id}/start`);
      }
      setRunning(!running);
      onRefresh();
    } catch {
      // handle error
    }
  };

  const deleteAgent = async () => {
    try {
      await api.delete(`/agents/${agent.id}`);
      onRefresh();
    } catch {
      // handle error
    }
  };

  const statusIcon = {
    idle: <Clock className="w-3.5 h-3.5 text-gray-400" />,
    running: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
    error: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
    stopped: <Square className="w-3.5 h-3.5 text-gray-500" />,
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-accent-purple" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-200">{agent.name}</h3>
                <span className={cn('status-badge border text-[10px]', getStatusColor(agent.status))}>
                  {statusIcon[agent.status]}
                  {agent.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{agent.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleAgent}
              className={cn(
                'p-1.5 rounded transition-colors',
                running
                  ? 'text-red-400 hover:bg-red-400/10'
                  : 'text-emerald-400 hover:bg-emerald-400/10'
              )}
              title={running ? 'Stop' : 'Start'}
            >
              {running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={deleteAgent}
              className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-600">
          <span className="flex items-center gap-1">
            <Code className="w-3 h-3" />
            {agent.type}
          </span>
          <span>Created {formatRelative(agent.created_at)}</span>
          {agent.last_run && <span>Last run {formatRelative(agent.last_run)}</span>}
        </div>
      </div>

      {/* Executions */}
      {agent.executions.length > 0 && (
        <div className="border-t border-white/[0.06]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full px-4 py-2 text-xs text-gray-500 hover:bg-white/[0.02] transition-colors"
          >
            <span>{agent.executions.length} executions</span>
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {expanded && (
            <div className="px-4 pb-3 space-y-2 animate-slide-down">
              {agent.executions.slice(0, 5).map((exec) => (
                <ExecutionLog key={exec.id} execution={exec} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIAgentPanel({ agents, onRefresh, className }: AIAgentPanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('code_gen');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post('/agents', {
        name: newName,
        type: newType,
        description: newDescription,
        config: {},
      });
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
      onRefresh();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">AI Agents</h2>
          <p className="text-sm text-gray-500">{agents.length} agents configured</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="glass-button-primary flex items-center gap-2 text-sm"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? 'Cancel' : 'New Agent'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="glass-card p-5 animate-slide-down">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Create New Agent</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="glass-input w-full text-sm"
                placeholder="Agent name"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="glass-input w-full text-sm"
              >
                <option value="code_gen">Code Generation</option>
                <option value="code_review">Code Review</option>
                <option value="testing">Testing</option>
                <option value="deployment">Deployment</option>
                <option value="monitoring">Monitoring</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="glass-input w-full text-sm resize-none h-20"
              placeholder="What does this agent do?"
            />
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="glass-button-primary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Agent
            </button>
          </div>
        </div>
      )}

      {/* Agent list */}
      <div className="space-y-3">
        {agents.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Bot className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No agents configured yet</p>
            <p className="text-xs text-gray-600 mt-1">Create your first AI agent to get started</p>
          </div>
        ) : (
          agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onRefresh={onRefresh} />
          ))
        )}
      </div>
    </div>
  );
}
