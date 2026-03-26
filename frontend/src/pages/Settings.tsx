import { useState, useEffect } from 'react';
import { Save, User, Bell, Shield, Palette, Server, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

const sections: SettingsSection[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'system', label: 'System', icon: Server },
];

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const [activeSection, setActiveSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile state
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');

  // Notification state
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [taskNotifs, setTaskNotifs] = useState(true);
  const [tradingNotifs, setTradingNotifs] = useState(false);

  // Appearance state
  const [accentColor, setAccentColor] = useState('#3b82f6');

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/auth/me', { username, email });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={cn(
        'w-10 h-5 rounded-full transition-colors duration-200 relative',
        enabled ? 'bg-accent-blue' : 'bg-white/10'
      )}
    >
      <div
        className={cn(
          'w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform duration-200',
          enabled ? 'translate-x-5.5 left-[1px]' : 'left-[2px]'
        )}
        style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  );

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <div className="lg:w-56 shrink-0">
          <nav className="glass-card p-2 space-y-0.5">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors',
                  activeSection === id
                    ? 'bg-accent-blue/10 text-accent-blue'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'profile' && (
            <div className="glass-card p-6 animate-fade-in">
              <h3 className="text-base font-semibold text-gray-200 mb-6">Profile Settings</h3>
              <div className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="glass-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Avatar</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-xl font-bold text-white">
                      {username.charAt(0).toUpperCase()}
                    </div>
                    <button className="glass-button text-sm">Change Avatar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="glass-card p-6 animate-fade-in">
              <h3 className="text-base font-semibold text-gray-200 mb-6">Notification Preferences</h3>
              <div className="space-y-4 max-w-lg">
                <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
                  <div>
                    <p className="text-sm text-gray-300">Email Notifications</p>
                    <p className="text-xs text-gray-600">Receive email for important events</p>
                  </div>
                  <ToggleSwitch enabled={emailNotifs} onToggle={() => setEmailNotifs(!emailNotifs)} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
                  <div>
                    <p className="text-sm text-gray-300">Task Completion</p>
                    <p className="text-xs text-gray-600">Notify when tasks finish</p>
                  </div>
                  <ToggleSwitch enabled={taskNotifs} onToggle={() => setTaskNotifs(!taskNotifs)} />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-gray-300">Trading Alerts</p>
                    <p className="text-xs text-gray-600">Price alerts and trade notifications</p>
                  </div>
                  <ToggleSwitch enabled={tradingNotifs} onToggle={() => setTradingNotifs(!tradingNotifs)} />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="glass-card p-6 animate-fade-in">
              <h3 className="text-base font-semibold text-gray-200 mb-6">Security</h3>
              <div className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Current Password</label>
                  <input type="password" className="glass-input w-full" placeholder="Enter current password" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">New Password</label>
                  <input type="password" className="glass-input w-full" placeholder="Enter new password" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Confirm New Password</label>
                  <input type="password" className="glass-input w-full" placeholder="Confirm new password" />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="glass-card p-6 animate-fade-in">
              <h3 className="text-base font-semibold text-gray-200 mb-6">Appearance</h3>
              <div className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">Accent Color</label>
                  <div className="flex gap-3">
                    {['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setAccentColor(color)}
                        className={cn(
                          'w-8 h-8 rounded-full transition-transform',
                          accentColor === color && 'ring-2 ring-offset-2 ring-offset-dark-800 scale-110'
                        )}
                        style={{ backgroundColor: color, ...(accentColor === color ? { outlineColor: color } : {}) }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Theme</label>
                  <p className="text-xs text-gray-600">Dark mode is the only supported theme</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="glass-card p-6 animate-fade-in">
              <h3 className="text-base font-semibold text-gray-200 mb-6">System Information</h3>
              <div className="space-y-3 max-w-lg">
                {[
                  { label: 'Version', value: 'v2.1.0' },
                  { label: 'API Endpoint', value: import.meta.env.VITE_API_URL || '/api' },
                  { label: 'WebSocket', value: import.meta.env.VITE_WS_URL || 'Auto-detect' },
                  { label: 'Environment', value: import.meta.env.MODE },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm text-gray-300 font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="glass-button-primary flex items-center gap-2 text-sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
