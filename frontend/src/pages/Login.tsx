import { useState } from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import LoginForm from '@/components/LoginForm';
import RegisterForm from '@/components/RegisterForm';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'login' | 'register';

export default function Login() {
  const [tab, setTab] = useState<Tab>('login');
  const { login, register, isLoading, error } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-800 bg-gradient-mesh relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent-blue/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-purple/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-cyan/5 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center mb-4 shadow-lg shadow-accent-blue/20">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">Druckmaschine</h1>
          <p className="text-sm text-gray-500 mt-1">AI-Powered Development Platform</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6">
          {/* Tabs */}
          <div className="flex mb-6 bg-white/[0.03] rounded-lg p-1">
            <button
              onClick={() => setTab('login')}
              className={cn(
                'flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200',
                tab === 'login'
                  ? 'bg-white/[0.08] text-gray-200 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              Sign in
            </button>
            <button
              onClick={() => setTab('register')}
              className={cn(
                'flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200',
                tab === 'register'
                  ? 'bg-white/[0.08] text-gray-200 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              Create account
            </button>
          </div>

          {/* Form */}
          <div className="animate-fade-in" key={tab}>
            {tab === 'login' ? (
              <LoginForm onSubmit={login} error={error} isLoading={isLoading} />
            ) : (
              <RegisterForm onSubmit={register} error={error} isLoading={isLoading} />
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Built with AI. Powered by Druckmaschine.
        </p>
      </div>
    </div>
  );
}
