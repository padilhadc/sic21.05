import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { Shield, History, Activity, AlertCircle, TrendingUp, Zap, Clock, ChevronRight, Settings, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  operatorStats: OperatorStat[];
}

interface OperatorStat {
  name: string;
  total: number;
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
    efficiency: 0,
    operatorStats: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

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
    fetchStats().finally(() => setLoading(false));

    const subscription = supabase
      .channel('service_records_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_records' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function fetchStats() {
    try {
      setError(null);
      
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

      // Get operator statistics
      const { data: operatorData, error: operatorError } = await supabase
        .from('service_records')
        .select('operator_name');

      if (operatorError) throw operatorError;

      const operatorCounts: { [key: string]: number } = {};
      operatorData?.forEach(record => {
        const name = record.operator_name;
        operatorCounts[name] = (operatorCounts[name] || 0) + 1;
      });

      const operatorStats = Object.entries(operatorCounts)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

      const efficiency = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;

      setStats({
        totalServices: totalCount || 0,
        recentServices: recentData || [],
        efficiency,
        operatorStats
      });

    } catch (error: any) {
      console.error('Erro ao buscar estatísticas:', error);
      setError('Falha ao carregar estatísticas. ' + (error.message || ''));
    }
  }

  const renderChart = () => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-2">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Análise de Operadores</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setChartPeriod('daily')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              chartPeriod === 'daily'
                ? 'bg-primary-light text-primary'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Diário
          </button>
          <button
            onClick={() => setChartPeriod('weekly')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              chartPeriod === 'weekly'
                ? 'bg-primary-light text-primary'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semanal
          </button>
          <button
            onClick={() => setChartPeriod('monthly')}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              chartPeriod === 'monthly'
                ? 'bg-primary-light text-primary'
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
            data={stats.operatorStats}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 25,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis
              tick={{ fontSize: 12 }}
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
              fill="#1E517B"
              radius={[4, 4, 0, 0]}
              name="Total de Serviços"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
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
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-all"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center">
            <div className="p-3 bg-primary-light/10 rounded-lg">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total de Serviços</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-gray-900">{stats.totalServices}</p>
                <span className="ml-2 text-xs font-medium text-primary-dark flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  12%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center">
            <div className="p-3 bg-primary-light/10 rounded-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Eficiência (30 dias)</p>
              <div className="flex items-baseline">
                <p className="text-2xl font-bold text-gray-900">{stats.efficiency}%</p>
                <span className="ml-2 text-xs font-medium text-primary-dark flex items-center">
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
            <Link to="/service/history" className="text-primary hover:text-primary-dark text-sm flex items-center">
              Ver todos
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          {stats.recentServices.length > 0 ? (
            <div className="space-y-4">
              {stats.recentServices.map((service) => (
                <div key={service.id} className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary-light/10 flex items-center justify-center mr-3">
                    <span className="text-primary font-medium">{service.operator_name.charAt(0)}</span>
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
              <Link to="/service/new" className="mt-2 inline-block text-primary hover:text-primary-dark text-sm">
                Registrar novo serviço
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/service/new" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-primary-light/10 hover:border-primary-light transition-colors">
            <Shield className="h-5 w-5 text-primary mr-3" />
            <span className="text-sm font-medium text-gray-700">Novo Serviço</span>
          </Link>
          <Link to="/service/history" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-primary-light/10 hover:border-primary-light transition-colors">
            <History className="h-5 w-5 text-primary mr-3" />
            <span className="text-sm font-medium text-gray-700">Ver Histórico</span>
          </Link>
          <Link to="/admin" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-primary-light/10 hover:border-primary-light transition-colors">
            <Settings className="h-5 w-5 text-primary mr-3" />
            <span className="text-sm font-medium text-gray-700">Configurações</span>
          </Link>
        </div>
      </div>
    </div>
  );
}