import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, History, Activity, AlertCircle, TrendingUp, Zap, Clock, ChevronRight, Settings, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ServiceRecord {
  id: string;
  operator_name: string;
  technician_name: string;
  company_name: string;
  service_type: string;
  created_at: string;
  contract_number: string;
  street: string;
  neighborhood: string;
  cto_location: string;
  area_cx: string;
  available_slots: string;
  unit: string;
  visited_cxs: string;
  general_comments?: string;
}

interface Stats {
  totalServices: number;
  recentServices: ServiceRecord[];
  efficiency: number;
}

interface ChartData {
  name: string;
  total: number;
}

interface ChartPeriod {
  daily: ChartData[];
  weekly: ChartData[];
  monthly: ChartData[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalServices: 0,
    recentServices: [],
    efficiency: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartData, setChartData] = useState<ChartPeriod>({
    daily: [],
    weekly: [],
    monthly: []
  });

  useEffect(() => {
    if (selectedService) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedService]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchChartData()]).finally(() => setLoading(false));

    // Set up real-time subscription for service records
    const subscription = supabase
      .channel('service_records_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_records' }, () => {
        fetchStats();
        fetchChartData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function fetchChartData() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      const { data: services, error: servicesError } = await supabase
        .from('service_records')
        .select('created_at, service_type')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (servicesError) throw servicesError;

      // Process data for different periods
      const daily: { [key: string]: number } = {};
      const weekly: { [key: string]: number } = {};
      const monthly: { [key: string]: number } = {};

      services?.forEach(service => {
        const date = new Date(service.created_at);
        
        // Daily
        const dayKey = date.toLocaleDateString('pt-BR');
        daily[dayKey] = (daily[dayKey] || 0) + 1;

        // Weekly
        const weekKey = `Semana ${Math.ceil((date.getDate()) / 7)}`;
        weekly[weekKey] = (weekly[weekKey] || 0) + 1;

        // Monthly
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short' });
        monthly[monthKey] = (monthly[monthKey] || 0) + 1;
      });

      // Convert to chart format
      setChartData({
        daily: Object.entries(daily).map(([name, total]) => ({ name, total })).slice(-7),
        weekly: Object.entries(weekly).map(([name, total]) => ({ name, total })).slice(-4),
        monthly: Object.entries(monthly).map(([name, total]) => ({ name, total })).slice(-6)
      });

    } catch (error: any) {
      console.error('Erro ao buscar dados do gráfico:', error);
      setError('Falha ao carregar dados do gráfico. ' + (error.message || ''));
    }
  }

  async function fetchStats() {
    try {
      setError(null);
      
      const { data: tableCheck, error: tableCheckError } = await supabase
        .from('service_records')
        .select('id', { count: 'exact', head: true });
      
      if (tableCheckError && tableCheckError.code === '42P01') {
        setError('A tabela de registros de serviço ainda não foi criada. Por favor, execute as migrações do banco de dados.');
        return;
      } else if (tableCheckError) {
        console.error('Erro ao verificar tabela:', tableCheckError);
        setError('Não foi possível conectar ao banco de dados. Verifique sua conexão com o Supabase.');
        return;
      }

      // Get total services count
      const { count: totalCount, error: countError } = await supabase
        .from('service_records')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // Get recent services
      const { data: recentData, error: recentError } = await supabase
        .from('service_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      // Calculate efficiency based on available slots in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentServices, error: efficiencyError } = await supabase
        .from('service_records')
        .select('available_slots')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (efficiencyError) throw efficiencyError;

      let totalSlots = 0;
      let usedSlots = 0;

      recentServices?.forEach(service => {
        const slots = parseInt(service.available_slots) || 0;
        if (slots > 0) {
          totalSlots += slots;
          usedSlots += slots;
        }
      });

      const efficiency = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;

      setStats({
        totalServices: totalCount || 0,
        recentServices: recentData || [],
        efficiency
      });

    } catch (error: any) {
      console.error('Erro ao buscar estatísticas:', error);
      setError('Falha ao carregar estatísticas. ' + (error.message || ''));
    }
  }

  const serviceTypeStyles = {
    'Ativação': {
      bg: 'bg-green-100',
      text: 'text-green-800',
    },
    'Reparo': {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
    },
    'Mudança Endereço': {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
    },
    'Clean Up': {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar dados</h2>
        <p className="text-red-600 text-center">{error}</p>
        <button 
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const renderChart = () => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-2">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Análise de Serviços</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setChartPeriod('daily')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              chartPeriod === 'daily'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Diário
          </button>
          <button
            onClick={() => setChartPeriod('weekly')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              chartPeriod === 'weekly'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semanal
          </button>
          <button
            onClick={() => setChartPeriod('monthly')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              chartPeriod === 'monthly'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Mensal
          </button>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData[chartPeriod]}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={(value) => Math.floor(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            />
            <Bar
              dataKey="total"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              name="Total de Serviços"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex space-x-2">
          <select className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Últimos 30 dias</option>
            <option>Últimos 7 dias</option>
            <option>Este mês</option>
            <option>Este ano</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all text-sm">
            Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100 hover:shadow-md transition-all">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total de Serviços</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-gray-900">{stats.totalServices}</p>
                <span className="ml-2 text-xs font-medium text-green-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  12%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100 hover:shadow-md transition-all">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Eficiência (30 dias)</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-gray-900">{stats.efficiency}%</p>
                <span className="ml-2 text-xs font-medium text-green-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  3%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderChart()}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Serviços Recentes</h2>
            <Link to="/service/history" className="text-blue-600 hover:text-blue-800 text-sm flex items-center">
              Ver todos
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          {stats.recentServices.length > 0 ? (
            <div className="space-y-4">
              {stats.recentServices.map((service) => (
                <div key={service.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-medium">{service.operator_name.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{service.operator_name}</p>
                    <p className="text-xs text-gray-500">{service.company_name} • {service.service_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{new Date(service.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>Nenhum serviço registrado ainda.</p>
              <Link to="/service/new" className="mt-2 inline-block text-blue-600 hover:text-blue-800 text-sm">
                Registrar novo serviço
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/service/new" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <Shield className="h-5 w-5 text-blue-600 mr-3" />
            <span className="text-sm font-medium text-gray-700">Novo Serviço</span>
          </Link>
          <Link to="/service/history" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <History className="h-5 w-5 text-blue-600 mr-3" />
            <span className="text-sm font-medium text-gray-700">Ver Histórico</span>
          </Link>
          <Link to="/admin" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <Settings className="h-5 w-5 text-blue-600 mr-3" />
            <span className="text-sm font-medium text-gray-700">Configurações</span>
          </Link>
        </div>
      </div>

      {selectedService && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b p-6 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Detalhes do Serviço</h3>
                <p className="text-sm text-gray-500">
                  {new Date(selectedService.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Operador</h4>
                  <p className="text-base text-gray-900">{selectedService.operator_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Empresa</h4>
                  <p className="text-base text-gray-900">{selectedService.company_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Tipo de Serviço</h4>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                    serviceTypeStyles[selectedService.service_type as keyof typeof serviceTypeStyles]?.bg || 'bg-gray-100'
                  } ${
                    serviceTypeStyles[selectedService.service_type as keyof typeof serviceTypeStyles]?.text || 'text-gray-800'
                  }`}>
                    {selectedService.service_type}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Localização</h4>
                  <p className="text-base text-gray-900">{selectedService.street}, {selectedService.neighborhood}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">CTO</h4>
                  <p className="text-base text-gray-900">{selectedService.cto_location}</p>
                </div>
                {selectedService.general_comments && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Comentários</h4>
                    <p className="text-base text-gray-900 whitespace-pre-wrap">{selectedService.general_comments}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t p-6 bg-gray-50 sticky bottom-0">
              <Link
                to="/service/history"
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Ver Histórico Completo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}