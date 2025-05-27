import React, { useState } from 'react';
import { Users, Settings, BarChart3, Image, PlusCircle, Edit, Trash } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Toast from '../components/ui/Toast';

// Mock users data
const usersData = [
  { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'admin', status: 'active' },
  { id: '2', name: 'João Silva', email: 'joao@example.com', role: 'technician', status: 'active' },
  { id: '3', name: 'Maria Oliveira', email: 'maria@example.com', role: 'operator', status: 'active' },
  { id: '4', name: 'Pedro Santos', email: 'pedro@example.com', role: 'technician', status: 'inactive' },
];

const roleOptions = [
  { value: 'admin', label: 'Administrador' },
  { value: 'operator', label: 'Operador' },
  { value: 'technician', label: 'Técnico' },
];

const statusOptions = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
];

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'logo' | 'settings'>('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form (simplified)
    if (!formData.name || !formData.email || !formData.role || !formData.password) {
      setToast({
        type: 'error',
        message: 'Preencha todos os campos obrigatórios'
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setToast({
        type: 'error',
        message: 'As senhas não coincidem'
      });
      return;
    }
    
    // In a real app, you'd send this data to your API/Supabase
    setToast({
      type: 'success',
      message: 'Usuário criado com sucesso!'
    });
    
    // Reset form and hide it
    setFormData({
      name: '',
      email: '',
      role: '',
      password: '',
      confirmPassword: '',
    });
    setShowUserForm(false);
  };
  
  const handleLogoUpload = () => {
    setToast({
      type: 'success',
      message: 'Logo atualizado com sucesso!'
    });
  };
  
  const handleSaveSettings = () => {
    setToast({
      type: 'success',
      message: 'Configurações salvas com sucesso!'
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Painel Administrativo</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-4 py-3 text-sm font-medium flex items-center space-x-2 ${
              activeTab === 'users'
                ? 'border-b-2 border-[#1E517B] dark:border-[#7DFEE3] text-[#1E517B] dark:text-[#7DFEE3]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} />
            <span>Usuários</span>
          </button>
          
          <button
            className={`px-4 py-3 text-sm font-medium flex items-center space-x-2 ${
              activeTab === 'logo'
                ? 'border-b-2 border-[#1E517B] dark:border-[#7DFEE3] text-[#1E517B] dark:text-[#7DFEE3]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('logo')}
          >
            <Image size={18} />
            <span>Logo</span>
          </button>
          
          <button
            className={`px-4 py-3 text-sm font-medium flex items-center space-x-2 ${
              activeTab === 'settings'
                ? 'border-b-2 border-[#1E517B] dark:border-[#7DFEE3] text-[#1E517B] dark:text-[#7DFEE3]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} />
            <span>Configurações</span>
          </button>
        </div>
        
        <div className="p-6">
          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-800 dark:text-white">Gerenciar Usuários</h2>
                
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<PlusCircle size={16} />}
                  onClick={() => setShowUserForm(!showUserForm)}
                >
                  {showUserForm ? 'Cancelar' : 'Novo Usuário'}
                </Button>
              </div>
              
              {showUserForm && (
                <Card className="mb-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-md font-medium mb-4">Adicionar Novo Usuário</h3>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Nome"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                      
                      <Input
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                      
                      <Select
                        label="Função"
                        name="role"
                        options={roleOptions}
                        value={formData.role}
                        onChange={(value) => handleSelectChange('role', value)}
                        required
                      />
                      
                      <div></div>
                      
                      <Input
                        label="Senha"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                      
                      <Input
                        label="Confirmar Senha"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="mt-6 flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowUserForm(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                      >
                        Salvar Usuário
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Função
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {usersData.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-300">{user.email}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span 
                            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              user.role === 'admin'
                                ? 'bg-[#1E517B]/10 text-[#1E517B] dark:bg-[#1E517B]/20 dark:text-[#7DFEE3]'
                                : user.role === 'operator'
                                ? 'bg-[#39B197]/10 text-[#39B197]'
                                : 'bg-[#7DFEE3]/10 text-[#7DFEE3] dark:text-[#7DFEE3]'
                            }`}
                          >
                            {user.role === 'admin' ? 'Administrador' : 
                             user.role === 'operator' ? 'Operador' : 'Técnico'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span 
                            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              user.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500'
                            }`}
                          >
                            {user.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              title="Excluir"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'logo' && (
            <div>
              <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Alterar Logo</h2>
              
              <div className="bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 mb-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-4">
                    <Image className="mx-auto text-gray-400" size={64} />
                  </div>
                  <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                    Arraste e solte a imagem do logo aqui, ou
                  </p>
                  <button
                    type="button"
                    className="text-sm text-[#1E517B] dark:text-[#7DFEE3] hover:underline font-medium"
                  >
                    selecione um arquivo
                  </button>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG (máx. 1MB)
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleLogoUpload}
                >
                  Atualizar Logo
                </Button>
              </div>
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Configurações do Sistema</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-md font-medium mb-3">Configurações Gerais</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">Tema Padrão</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Escolha o tema padrão do sistema</p>
                        </div>
                        <Select
                          options={[
                            { value: 'light', label: 'Claro' },
                            { value: 'dark', label: 'Escuro' },
                          ]}
                          value="light"
                          onChange={() => {}}
                          className="w-32"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">Máximo de Imagens</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Número máximo de imagens por serviço</p>
                        </div>
                        <Input
                          type="number"
                          value="6"
                          className="w-24"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">Período de Retenção</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Dias para manter os registros</p>
                        </div>
                        <Input
                          type="number"
                          value="365"
                          className="w-24"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium mb-3">Notificações</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">Email de Notificação</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Enviar alertas por email</p>
                        </div>
                        <div className="relative inline-block w-10 align-middle select-none">
                          <input type="checkbox" id="toggle-email" className="sr-only" defaultChecked />
                          <label
                            htmlFor="toggle-email"
                            className="block h-6 rounded-full cursor-pointer bg-gray-300 dark:bg-gray-600"
                          >
                            <span
                              className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform transform ${true ? 'translate-x-4' : ''}`}
                            ></span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">Relatórios Semanais</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Enviar relatórios automaticamente</p>
                        </div>
                        <div className="relative inline-block w-10 align-middle select-none">
                          <input type="checkbox" id="toggle-reports" className="sr-only" />
                          <label
                            htmlFor="toggle-reports"
                            className="block h-6 rounded-full cursor-pointer bg-gray-300 dark:bg-gray-600"
                          >
                            <span
                              className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform transform ${false ? 'translate-x-4' : ''}`}
                            ></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleSaveSettings}
                  >
                    Salvar Configurações
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AdminPage;