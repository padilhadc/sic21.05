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

      setSuccess('Enviamos um link para redefinir sua senha. Verifique sua caixa de entrada e o spam.');
    } catch (error: any) {
      console.error('Erro ao solicitar redefinição de senha:', error);
      setError('Não foi possível enviar o email de recuperação. Tente novamente mais tarde.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-[#002DFF] to-[#39B197]">
      <div className="flex items-center mb-8">
        <div className="p-3 bg-white/10 rounded-lg mr-3">
          <Shield className="h-8 w-8 text-[#7DFEE3]" />
        </div>
        <h1 className="text-3xl font-bold text-white">SISTEMA SIC</h1>
      </div>

      <div className="w-full max-w-[400px] bg-white/[0.06] backdrop-blur-md border border-[rgba(125,254,227,0.3)] rounded-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Entrar</h2>
          <p className="mt-2 text-[#7DFEE3]">Acesse sua conta</p>
        </div>
        
        {!isConfigured && (
          <div className="mb-6 bg-yellow-400/10 border border-yellow-400/20 text-yellow-200 px-4 py-3 rounded-lg text-sm flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Supabase não está configurado. Atualize suas variáveis de ambiente.</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 text-red-200 px-4 py-3 rounded-lg text-sm flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-400/10 border border-green-400/20 text-green-200 px-4 py-3 rounded-lg text-sm flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
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
                className="block w-full px-4 py-3 bg-white/[0.08] border border-white/20 rounded-lg focus:outline-none focus:border-[#7DFEE3] focus:ring-1 focus:ring-[#7DFEE3] text-white placeholder-white/50"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/[0.08] border border-white/20 rounded-lg focus:outline-none focus:border-[#7DFEE3] focus:ring-1 focus:ring-[#7DFEE3] text-white placeholder-white/50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/[0.08] text-[#7DFEE3] focus:ring-[#7DFEE3]"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-white">
                Lembrar-me
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isConfigured}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white bg-[#39B197] hover:bg-[#2C7D67] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7DFEE3] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={handleForgotPassword}
        disabled={resetLoading}
        className="mt-4 text-[#7DFEE3] hover:underline text-sm font-medium"
      >
        {resetLoading ? 'Enviando link...' : 'Esqueci minha senha'}
      </button>
    </div>
  );
}