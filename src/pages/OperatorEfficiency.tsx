import React, { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, Users, Calendar as CalendarIcon, TrendingUp, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO, startOfDay, endOfDay, addDays, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OperatorStats {
  operator_name: string;
  total_services: number;
  percentage: number;
  daily_average: number;
}

interface ChartData {
  operator_name: string;
  total_services: number;
}

interface ServiceCount {
  date: string;
  count: number;
}

export default function OperatorEfficiency() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OperatorStats[]>([]);
  const [totalServices, setTotalServices] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [serviceCounts, setServiceCounts] = useState<ServiceCount[]>([]);

  useEffect(() => {
    fetchEfficiencyData();
    if (period === 'month') {
      fetchMonthlyServiceCounts();
    }

    // Set up interval to check for period resets
    const intervalId = setInterval(() => {
      const now = new Date();
      
      // Check for week reset (Sunday at 23:59)
      if (period === 'week' && now.getDay() === 0 && now.getHours() === 23 && now.getMinutes() === 59) {
        fetchEfficiencyData();
      }
      
      // Check for month reset (last day of month at 23:59)
      if (period === 'month' && now.getDate() === endOfMonth(now).getDate() && now.getHours() === 23 && now.getMinutes() === 59) {
        fetchEfficiencyData();
      }
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [period, selectedDate]);

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'day':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'week':
        // Get the start of the week (Monday) and end of week (Sunday)
        start = startOfWeek(now, { weekStartsOn: 1 }); // 1 = Monday
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'custom':
        if (selectedDate) {
          start = startOfDay(selectedDate);
          end = endOfDay(selectedDate);
        } else {
          start = startOfDay(now);
          end = endOfDay(now);
        }
        break;
      default:
        start = startOfDay(now);
        end = endOfDay(now);
    }

    return { start, end };
  };

  const fetchMonthlyServiceCounts = async () => {
    try {
      const { start, end } = getDateRange();

      const { data, error } = await supabase
        .from('service_records')
        .select('created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      // Create a map of dates to service counts
      const counts = new Map<string, number>();
      data?.forEach(record => {
        const date = format(parseISO(record.created_at), 'yyyy-MM-dd');
        counts.set(date, (counts.get(date) || 0) + 1);
      });

      // Convert to array format
      const countsArray: ServiceCount[] = Array.from(counts.entries()).map(([date, count]) => ({
        date,
        count
      }));

      setServiceCounts(countsArray);
    } catch (error) {
      console.error('Error fetching monthly service counts:', error);
    }
  };

  const fetchEfficiencyData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { start, end } = getDateRange();

      let query = supabase
        .from('service_records')
        .select('operator_name, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .not('operator_name', 'is', null)
        .not('operator_name', 'eq', '');

      const { data, error } = await query;

      if (error) throw error;

      // Process data
      const operatorMap = new Map<string, number>();
      data?.forEach(record => {
        const count = operatorMap.get(record.operator_name) || 0;
        operatorMap.set(record.operator_name, count + 1);
      });

      const total = data?.length || 0;
      setTotalServices(total);

      // Calculate days in period
      const daysInPeriod = selectedDate ? 1 : period === 'day' ? 1 : period === 'week' ? 7 : 30;

      const statsData: OperatorStats[] = Array.from(operatorMap.entries())
        .map(([operator_name, total_services]) => ({
          operator_name,
          total_services,
          percentage: total > 0 ? (total_services / total) * 100 : 0,
          daily_average: total_services / daysInPeriod
        }))
        .sort((a, b) => b.total_services - a.total_services);

      setStats(statsData);
    } catch (error: any) {
      console.error('Error fetching efficiency data:', error);
      setError('Falha ao carregar dados de eficiência. ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setPeriod('custom');
    setShowCalendar(false);
  };

  const getServiceCountForDate = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return serviceCounts.find(sc => sc.date === dateStr)?.count || 0;
  };

  const renderCalendar = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    // Calculate days needed before the first of the month to start with Monday
    const firstDayOfWeek = getDay(start);
    const daysFromMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const previousMonthDays = Array.from({ length: daysFromMonday }, (_, i) =>
      addDays(start, -(daysFromMonday - i))
    );

    // Calculate days needed to complete the last week
    const lastDayOfWeek = getDay(end);
    const daysToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
    const nextMonthDays = Array.from({ length: daysToSunday }, (_, i) =>
      addDays(end, i + 1)
    );

    // Combine all days
    const allDays = [...previousMonthDays, ...days, ...nextMonthDays];

    return (
      <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 w-80">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => (
            <div key={i} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          {allDays.map((day, i) => {
            const serviceCount = getServiceCountForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <button
                key={i}
                onClick={() => handleDateSelect(day)}
                className={`
                  relative p-2 text-sm rounded-lg transition-colors
                  ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}
                  ${!isCurrentMonth && 'text-gray-400'}
                  ${isToday(day) && !isSelected && 'border-2 border-blue-500'}
                `}
              >
                <span>{format(day, 'd')}</span>
                {serviceCount > 0 && (
                  <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-green-500'
                  }`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
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
          onClick={fetchEfficiencyData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Eficiência dos Operadores</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setPeriod('day');
              setSelectedDate(null);
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === 'day' && !selectedDate
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => {
              setPeriod('week');
              setSelectedDate(null);
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === 'week' && !selectedDate
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Última Semana
          </button>
          <button
            onClick={() => {
              setPeriod('month');
              setSelectedDate(null);
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === 'month' && !selectedDate
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Último Mês
          </button>
          <div className="relative">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                selectedDate
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CalendarIcon className="h-4 w-4" />
              <span>
                {selectedDate 
                  ? format(selectedDate, 'dd/MM/yyyy')
                  : 'Calendário'
                }
              </span>
            </button>
            {showCalendar && renderCalendar()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total de Operadores</p>
              <p className="text-2xl font-bold text-gray-900">{stats.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total de Atendimentos</p>
              <p className="text-2xl font-bold text-gray-900">{totalServices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Média por Operador</p>
              <p className="text-2xl font-bold text-gray-900">
                {(totalServices / (stats.length || 1)).toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Atendimentos por Operador</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="operator_name" 
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="total_services" 
                    fill="#3B82F6" 
                    name="Total de Atendimentos"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Detalhes por Operador</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % do Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Média Diária
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.map((stat, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.operator_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.total_services}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.percentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.daily_average.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}