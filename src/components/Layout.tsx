import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LogOut, LayoutDashboard, FileSpreadsheet, History, Settings, Bell, User, Sun, Moon, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Get first name from email
  const firstName = user?.email?.split('@')[0].split('.')[0];
  const capitalizedFirstName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : '';

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex">
        {/* Sidebar */}
        <aside className={`${
          isMenuCollapsed ? 'w-20' : 'w-64'
        } bg-[#002DFF] fixed h-screen transition-all duration-300 ease-in-out z-20 flex flex-col`}>
          {/* Menu Header */}
          <div className="p-4 border-b border-blue-400/30">
            <div className={`flex items-center ${isMenuCollapsed ? 'justify-center' : 'space-x-3'}`}>
              <div className="p-2 bg-white/10 rounded-lg transition-transform hover:scale-105">
                <Shield className="h-6 w-6 text-[#D4AF37]" />
              </div>
              {!isMenuCollapsed && (
                <div>
                  <h1 className="text-white font-bold text-lg">SISTEMA SIC</h1>
                  <p className="text-blue-200 text-xs">Gestão de Serviços</p>
                </div>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <nav className="mt-5 px-2 space-y-1 flex-1">
            <Link
              to="/dashboard"
              className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg mb-1 transition-all duration-200 ${
                isActive('/dashboard')
                  ? 'bg-white/10 text-white border-l-4 border-[#D4AF37]'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <LayoutDashboard className={`${isMenuCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
              {!isMenuCollapsed && <span>Dashboard</span>}
            </Link>

            <Link
              to="/service/new"
              className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg mb-1 transition-all duration-200 ${
                isActive('/service/new')
                  ? 'bg-white/10 text-white border-l-4 border-[#D4AF37]'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileSpreadsheet className={`${isMenuCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
              {!isMenuCollapsed && <span>Novo Serviço</span>}
            </Link>

            <Link
              to="/service/history"
              className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg mb-1 transition-all duration-200 ${
                isActive('/service/history')
                  ? 'bg-white/10 text-white border-l-4 border-[#D4AF37]'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <History className={`${isMenuCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
              {!isMenuCollapsed && <span>Histórico</span>}
            </Link>

            <Link
              to="/efficiency"
              className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg mb-1 transition-all duration-200 ${
                isActive('/efficiency')
                  ? 'bg-white/10 text-white border-l-4 border-[#D4AF37]'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <TrendingUp className={`${isMenuCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
              {!isMenuCollapsed && <span>Eficiência</span>}
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg mb-1 transition-all duration-200 ${
                  isActive('/admin')
                    ? 'bg-white/10 text-white border-l-4 border-[#D4AF37]'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Settings className={`${isMenuCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
                {!isMenuCollapsed && <span>Painel Admin</span>}
              </Link>
            )}
          </nav>

          {/* Footer */}
          {!isMenuCollapsed && (
            <div className="p-4 border-t border-blue-400/30 text-center">
              <p className="text-xs text-blue-200">© 2025 Todos os direitos reservados.</p>
              <p className="text-xs text-blue-200">Desenvolvido por Flavio Matheus.</p>
            </div>
          )}

          {/* Collapse Button */}
          <button
            onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
            className="absolute bottom-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            {isMenuCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </aside>

        {/* Main Content */}
        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          isMenuCollapsed ? 'ml-20' : 'ml-64'
        }`}>
          {/* Top Navigation Bar */}
          <nav className={`h-16 flex items-center justify-end px-4 sm:px-6 lg:px-8 border-b ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button className={`p-2 rounded-full transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}>
                <Bell className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="hidden md:block">
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {capitalizedFirstName}
                  </span>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {isAdmin ? 'Administrador' : user?.role === 'visitante' ? 'Visitante' : 'Usuário'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className={`p-2 rounded-full transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className={`flex-1 p-6 ${
            isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
          }`}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}