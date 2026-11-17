import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, FileText, LogOut, Stethoscope, Users } from 'lucide-react';
import { UserRole } from '@clinic/shared';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return <>{children}</>;

  const isStaff = user.role === UserRole.STAFF;
  const links = isStaff
    ? [
        { to: '/staff/schedule', label: 'Agenda', icon: Calendar },
        { to: '/staff/patients', label: 'Pacientes', icon: Users },
        { to: '/staff/reports', label: 'Laudos', icon: FileText },
      ]
    : [
        { to: '/patient/appointments', label: 'Meus Agendamentos', icon: Calendar },
        { to: '/patient/reports', label: 'Meus Laudos', icon: FileText },
      ];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              to={isStaff ? '/staff/schedule' : '/patient/appointments'}
              className="flex items-center gap-2 text-lg font-semibold text-teal-700"
            >
              <Stethoscope className="h-6 w-6" />
              <span>Clínica Médica</span>
            </Link>

            <nav className="flex items-center gap-1">
              {links.map((item) => {
                const Icon = item.icon;
                const active = location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="font-medium text-slate-800">{user.fullName}</p>
              <p className="text-xs text-slate-500">
                {isStaff ? 'Equipe da Clínica' : 'Paciente'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
