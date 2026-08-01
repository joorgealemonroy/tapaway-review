import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { Home, Briefcase, Wallet, BookOpen, User } from 'lucide-react';
import { LegalFooter } from '@/components/compliance/LegalFooter';


interface RepShellProps {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}

const navItems = [
  { icon: Home, label: 'Home', path: '/rep' },
  { icon: Briefcase, label: 'Businesses', path: '/rep/restaurants' },
  { icon: Wallet, label: 'Commissions', path: '/rep/commissions' },
  { icon: BookOpen, label: 'Docs', path: '/rep/docs' },
  { icon: User, label: 'Profile', path: '/rep/profile' },
];

export const RepShell = ({ title, subtitle, right, children }: RepShellProps) => {
  const navigate = useRepNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white/90 relative">
      {/* Ambient gradient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 20% 0%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 10%, rgba(59,130,246,0.08), transparent 60%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-28 sm:pb-8">
        {/* Header */}
        <header className="flex flex-col gap-4 pt-5 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.24em] text-white/40 uppercase">
              Sales Partner Portal
            </p>
            {title && (
              <h1 className="text-2xl sm:text-[28px] font-semibold text-white mt-1 tracking-tight">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-white/50 mt-1">{subtitle}</p>
            )}
          </div>
          {right && <div className="flex items-center gap-2">{right}</div>}
        </header>

        {/* Desktop tab strip */}
        <nav className="hidden sm:flex items-center gap-1 mb-6 border border-white/5 bg-white/[0.02] backdrop-blur-md rounded-2xl p-1 w-fit">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-xl transition-all ${
                  isActive
                    ? 'bg-white text-[#0a0e1a] shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {children}

        <LegalFooter tone="light" className="mt-8" />
      </div>


      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-[#0a0e1a]/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-white/40'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default RepShell;
