import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isConfigured } = useAuth();

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }

    const message = location.state?.message;
    if (message) {
      setSuccess(message);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await signIn(email, password, rememberMe);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err?.message?.includes('captcha')) {
        setError('Verificação CAPTCHA necessária. Tente novamente mais tarde ou entre em contato com o administrador.');
      } else if (err?.message?.includes('Invalid login credentials')) {
        setError('Email ou senha inválidos. Verifique suas credenciais e tente novamente.');
      } else {
        setError('Falha ao entrar. Tente novamente mais tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Digite seu email para recuperar a senha');
      return;
    }

    setResetLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      setSuccess('Email de recuperação enviado! Por favor, verifique sua caixa de entrada.');
    } catch (error: any) {
      console.error('Erro ao solicitar redefinição de senha:', error);
      setError('Não foi possível enviar o email de recuperação. Tente novamente mais tarde.');
    } finally {
      setResetLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #002DFF, #2D2D2D)' }}>
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl border-2 border-[#D4AF37] shadow-[0_4px_20px_rgba(212,175,55,0.1)]">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-[#1E5631]/10 rounded-full flex items-center justify-center transform transition-transform hover:scale-105">
            <Shield className="h-10 w-10 text-[#002DFF]" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-[#2D2D2D]">SISTEMA SIC</h2>
          <p className="mt-2 text-sm text-[#2D2D2D]/80"> Gestão de Serviços</p>
        </div>
        
        {!isConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>
              Supabase não está configurado. Atualize suas variáveis de ambiente.
            </span>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center animate-fade-in">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm flex items-center animate-fade-in">
              <AlertCircle className="h-5 w-5 mr-2" />
              {success}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#2D2D2D] mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3 py-3 border border-[#002DFF] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#002DFF] focus:border-[#1E5631] bg-white text-[#2D2D2D] transition-all duration-200"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#2D2D2D] mb-1">
                Senha
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-3 border border-[#002DFF] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#002DFF] focus:border-[#D4AF37] bg-white text-[#2D2D2D] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#E67E22] hover:text-[#E67E22]/80 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#1E5631] focus:ring-[#1E5631] border-[#D4AF37] rounded transition-colors"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-[#2D2D2D]">
                  Lembrar meu login
                </label>
              </div>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-sm font-medium text-[#] hover:text-[#E67E22]/80 transition-colors"
              >
                {resetLoading ? 'Enviando...' : 'Esqueci minha senha'}
              </button>
            </div> 
          </div>

          <button
            type="submit"
            disabled={loading || !isConfigured}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-[#002DFF] hover:bg-[#00008B]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E5631] disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? 'Conectando...' : 'Conectar'}
          </button>
        </form>
      </div>
    </div>
  );
}