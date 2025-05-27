import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, AlertCircle, Shield, UserPlus, Trash2, X, Clock, FileText, UserCheck, Activity, ChevronRight, Globe } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'visitante';
  created_at: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  changes: any;
  created_at: string;
  user?: {
    email: string;
  };
}

interface LoginAttempt {
  email: string;
  timestamp: Date;
  success: boolean;
  userAgent?: string;
}

function AdminPanel() {
  const { isAdmin, loginAttempts: authLoginAttempts } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'visitante'>('user');
  const [showAddUser, setShowAddUser] = useState(false);
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set());
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [showAllAttempts, setShowAllAttempts] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchData();
    trackActiveUsers();

    // Set up real-time subscription for users
    const usersSubscription = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchData();
      })
      .subscribe();

    // Set up real-time subscription for audit logs
    const auditLogsSubscription = supabase
      .channel('audit-logs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(usersSubscription);
      supabase.removeChannel(auditLogsSubscription);
    };
  }, [isAdmin, navigate]);

  const trackActiveUsers = async () => {
    try {
      // Instead of using admin API, we'll just use the users table
      // and consider users who have logged in within the last 15 minutes as active
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: activeUserData } = await supabase
        .from('users')
        .select('id')
        .gt('last_seen', fifteenMinutesAgo);

      const activeUserIds = new Set((activeUserData || []).map(user => user.id));
      setActiveUsers(activeUserIds);
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
  };

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (userError) throw userError;

      // Fetch audit logs with user information and deleted record data
      const { data: logData, error: logError } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:users(email)
        `)
        .order('created_at', { ascending: false })
        .limit(showAllLogs ? 1000 : 50);

      if (logError) throw logError;

      setUsers(userData || []);
      setAuditLogs(logData || []);
      
      // Update active users
      await trackActiveUsers();
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      setError('Falha ao carregar dados. ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  }

  function formatAuditLogMessage(log: AuditLog): string {
    let message = `${log.action} em ${log.table_name}`;
    
    if (log.changes) {
      if (log.action === 'DELETE') {
        const oldData = log.changes.deleted_record || {};
        message += ` - Registro ${log.record_id}`;
        
        if (log.table_name === 'service_records') {
          message += ` (${oldData.service_type || ''} - ${oldData.operator_name || ''})`;
          if (oldData.contract_number) {
            message += ` | Contrato: ${oldData.contract_number}`;
          }
        } else if (log.table_name === 'users') {
          message += ` (${oldData.email || ''})`;
        }
      } else {
        const changes = log.changes.new_data || log.changes;
        if (log.table_name === 'service_records') {
          message += ` - ${changes.service_type || 'Serviço'} para ${changes.operator_name || 'operador'}`;
        } else if (log.table_name === 'users') {
          message += ` - ${changes.email || 'usuário'}`;
        }
      }
    }
    return message;
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);

      // Instead of using admin API, we'll create a new edge function to handle user creation
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail,
          role: newUserRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }

      setShowAddUser(false);
      setNewUserEmail('');
      setNewUserRole('user');
      fetchData();
    } catch (error: any) {
      console.error('Erro ao adicionar usuário:', error);
      setError('Falha ao adicionar usuário. ' + (error.message || ''));
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setError(null);
      
      // Instead of using admin API, we'll create a new edge function to handle user deletion
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }

      setUsers(users.filter(user => user.id !== userId));
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      setError('Falha ao excluir usuário. ' + (error.message || ''));
    }
  }

  async function handleUpdateRole(userId: string, newRole: 'admin' | 'user' | 'visitante') {
    try {
      setError(null);
      
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (error: any) {
      console.error('Erro ao atualizar função:', error);
      setError('Falha ao atualizar função. ' + (error.message || ''));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const totalUsers = users.length;
  const totalAdmins = users.filter(user => user.role === 'admin').length;
  const recentLoginAttempts = authLoginAttempts.slice(-5);
  const successfulLogins = authLoginAttempts.filter(attempt => attempt.success).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
        <button
          onClick={() => setShowAddUser(true)}
          className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Adicionar Usuário
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-900" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total de Usuários</p>
              <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Globe className="h-6 w-6 text-blue-900" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Usuários Online</p>
              <p className="text-2xl font-bold text-gray-900">{activeUsers.size}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Activity className="h-6 w-6 text-blue-900" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Logs de Auditoria</p>
              <p className="text-2xl font-bold text-gray-900">{auditLogs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center">
            <div className="p-3 bg-amber-50 rounded-lg">
              <UserCheck className="h-6 w-6 text-amber-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Logins com Sucesso</p>
              <p className="text-2xl font-bold text-gray-900">{successfulLogins}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users Table */}
        <div className="lg:col-span-2 bg-white shadow-sm rounded-xl overflow-hidden border border-blue-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Usuários</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Criação</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activeUsers.has(user.id) 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {activeUsers.has(user.id) ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value as 'admin' | 'user' | 'visitante')}
                        className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="user">Usuário</option>
                        <option value="visitante">Visitante</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panel with Audit Logs and Login Attempts */}
        <div className="space-y-6">
          {/* Audit Logs */}
          <div className="bg-white shadow-sm rounded-xl border border-blue-100">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Logs de Auditoria</h2>
              <button 
                onClick={() => setShowAllLogs(!showAllLogs)} 
                className="text-sm text-blue-900 hover:text-blue-700 flex items-center"
              >
                {showAllLogs ? 'Mostrar menos' : 'Ver todos'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {auditLogs.slice(0, showAllLogs ? undefined : 5).map((log) => (
                <div key={log.id} className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-900" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{log.user?.email}</span>
                      {' '}{formatAuditLogMessage(log)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Login Attempts */}
          <div className="bg-white shadow-sm rounded-xl border border-blue-100">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Tentativas de Login</h2>
              <button 
                onClick={() => setShowAllAttempts(!showAllAttempts)}
                className="text-sm text-blue-900 hover:text-blue-700 flex items-center"
              >
                {showAllAttempts ? 'Mostrar menos' : 'Ver todas'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {authLoginAttempts.slice(0, showAllAttempts ? undefined : 5).map((attempt, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${attempt.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    <UserCheck className={`h-4 w-4 ${attempt.success ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{attempt.email}</span>
                      {' '}{attempt.success ? 'login bem-sucedido' : 'tentativa falhou'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {attempt.timestamp.toLocaleString('pt-BR')}
                    </p>
                    {attempt.userAgent && (
                      <p className="text-xs text-gray-400 mt-1">
                        {attempt.userAgent}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-lg font-semibold text-gray-900">Adicionar Novo Usuário</h3>
              <button 
                onClick={() => setShowAddUser(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-4 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Função
                </label>
                <select
                  id="role"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as 'user' | 'visitante')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="user">Usuário</option>
                  <option value="visitante">Visitante</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-800"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;