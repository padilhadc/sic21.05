import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ValidateCode() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const email = searchParams.get('email');

  if (!email) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // First check if there's a valid code
      const { data: codes, error: queryError } = await supabase
        .from('password_reset_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString());

      if (queryError) {
        throw queryError;
      }

      // Check if we found any valid codes
      if (!codes || codes.length === 0) {
        throw new Error('Código inválido ou expirado');
      }

      // Use the most recent code if multiple exist
      const validCode = codes[0];

      // Redirect to password reset page
      navigate(`/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(validCode.code)}`);
    } catch (error: any) {
      console.error('Erro ao validar código:', error);
      setError('Código inválido ou expirado. Por favor, verifique o código ou solicite um novo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-xl">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Validar Código</h2>
          <p className="mt-2 text-sm text-gray-600">
            Digite o código enviado para {email}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Código de Verificação
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Digite o código de 6 dígitos"
              className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
              maxLength={6}
              pattern="\d{6}"
              title="O código deve conter 6 dígitos"
            />
            <p className="mt-2 text-sm text-gray-500">
              O código tem validade de 15 minutos. Caso não tenha recebido, verifique sua caixa de spam ou solicite um novo código.
            </p>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Validando...' : 'Validar Código'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Voltar para o Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}