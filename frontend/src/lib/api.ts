const BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface ApiError {
  message: string;
  status: number;
  detail?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  private removeToken(): void {
    localStorage.removeItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, signal } = options;
    const token = this.getToken();

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
      signal,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (response.status === 401) {
      this.removeToken();
      window.location.href = '/login';
      throw { message: 'Unauthorized', status: 401 } as ApiError;
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw {
        message: errorBody.detail || errorBody.message || `Request failed: ${response.status}`,
        status: response.status,
        detail: errorBody.detail,
      } as ApiError;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, { signal });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth-specific methods
  async login(username: string, password: string): Promise<{ access_token: string; user: User }> {
    const data = await this.post<{ access_token: string; user: User }>('/auth/login', {
      username,
      password,
    });
    this.setToken(data.access_token);
    return data;
  }

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<{ access_token: string; user: User }> {
    const data = await this.post<{ access_token: string; user: User }>('/auth/register', {
      username,
      email,
      password,
    });
    this.setToken(data.access_token);
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.post('/auth/logout');
    } finally {
      this.removeToken();
    }
  }

  async getCurrentUser(): Promise<User> {
    return this.get<User>('/auth/me');
  }
}

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  language?: string;
  repo_url?: string;
  tasks_count: number;
  completed_tasks: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number;
  project_id?: string;
  project_name?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  subtasks?: SubTask[];
  logs?: LogEntry[];
}

export interface SubTask {
  id: string;
  title: string;
  status: string;
  progress: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  source?: string;
  task_id?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  entries: {
    type: 'feature' | 'fix' | 'improvement' | 'breaking';
    description: string;
  }[];
}

export interface GPUInfo {
  name: string;
  utilization: number;
  memory_used: number;
  memory_total: number;
  temperature: number;
  power_draw: number;
  power_limit: number;
}

export interface TradingPosition {
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  pnl: number;
  pnl_percent: number;
}

export interface TradingPortfolio {
  total_value: number;
  cash: number;
  positions: TradingPosition[];
  daily_pnl: number;
  total_pnl: number;
  total_pnl_percent: number;
  history: { date: string; value: number }[];
}

export interface AIAgent {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'running' | 'error' | 'stopped';
  description: string;
  created_at: string;
  last_run?: string;
  config: Record<string, unknown>;
  executions: AgentExecution[];
}

export interface AgentExecution {
  id: string;
  started_at: string;
  completed_at?: string;
  status: string;
  result?: string;
  logs: string[];
}

export const api = new ApiClient(BASE_URL);
export default api;
