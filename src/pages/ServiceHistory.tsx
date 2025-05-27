import React, { useState, useEffect } from "react"; 
import { supabase } from '../lib/supabase';
import { 
  Search, 
  Trash2, 
  X, 
  AlertCircle, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  User,
  Briefcase,
  MapPin,
  Calendar,
  FileText,
  Building,
  Wrench,
  Box,
  Hash,
  Grid,
  Home,
  Map as MapIcon,
  MessageSquare,
  SlidersHorizontal,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Loader2,
  Edit,
  Save
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

let query = supabase
  .from('service_records')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false });

const dateFilter = getDateRangeFilter();
if (dateFilter) {
  query = query.gte('created_at', dateFilter);
}

if (filters.serviceType) {
  query = query.eq('service_type', filters.serviceType);
}

if (filters.neighborhood) {
  query = query.eq('neighborhood', filters.neighborhood);
}

if (filters.operator) {
  query = query.eq('operator_name', filters.operator);
}

const { data, error } = await query;

if (error) throw error;

// Create a map to store duplicate groups
const duplicateGroups = new Map<string, ServiceRecord[]>();

// Group services by contract number
(data || []).forEach(service => {
  const key = service.contract_number;
  if (!duplicateGroups.has(key)) {
    duplicateGroups.set(key, []);
  }
  duplicateGroups.get(key)?.push(service);
});


      // Process services and mark duplicates
      const processedServices = (data || []).map(service => {
        const group = duplicateGroups.get(service.contract_number) || [];
        const isDuplicate = group.length > 1 && group.some(other => {
          if (other.id === service.id) return false;
          
          const serviceTime = new Date(service.created_at).getTime();
          const otherTime = new Date(other.created_at).getTime();
          const hourDiff = Math.abs(serviceTime - otherTime) / (1000 * 60 * 60);
          
          return hourDiff < 1;
        });

        return { ...service, isDuplicate };
      });

      setServices(processedServices);

      // Update unique operators list with normalized names
      const operators = Array.from(new Set(data?.map(s => {
        const name = s.operator_name.toLowerCase();
        return name.charAt(0).toUpperCase() + name.slice(1);
      }) || [])).sort();
      
      setUniqueOperators(operators);

    } catch (error: any) {
      console.error('Erro ao buscar serviços:', error);
      setError('Falha ao carregar serviços. ' + (error.message || ''));
    }
  }

  async function handleDelete(id: string) {
    if (!isAdmin) {
      alert('Apenas administradores podem excluir registros');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.')) {
      return;
    }

    setDeleteLoading(id);
    try {
      const { error } = await supabase
        .from('service_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setServices(services.filter(service => service.id !== id));
      setSelectedService(null);
    } catch (error: any) {
      console.error('Erro ao excluir registro de serviço:', error);
      alert('Falha ao excluir o registro: ' + (error.message || ''));
    } finally {
      setDeleteLoading(null);
    }
  }

  const handleExport = async () => {
    try {
      // Get the date range based on current filter
      const dateFilter = getDateRangeFilter();
      
      // Fetch all services for the selected period
      let query = supabase
        .from('service_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      if (filters.serviceType) {
        query = query.eq('service_type', filters.serviceType);
      }

      if (filters.neighborhood) {
        query = query.eq('neighborhood', filters.neighborhood);
      }

      if (filters.operator) {
        query = query.eq('operator_name', filters.operator);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data for Excel
      const excelData = (data || []).map(service => ({
        'Data do Serviço': format(new Date(service.created_at), 'dd/MM/yyyy', { locale: ptBR }),
        'Tipo de Serviço': service.service_type,
        'Operador': service.operator_name,
        'Técnico': service.technician_name,
        'Empresa': service.company_name,
        'Contrato': service.contract_number,
        'Bairro': service.neighborhood,
        'Endereço': service.street,
        'Localização CTO': service.cto_location,
        'Área/CX': service.area_cx,
        'Vagas Disponíveis': service.available_slots,
        'Unidade': service.unit,
        'CXs Visitadas': service.visited_cxs,
        'Comentários': service.general_comments || ''
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const colWidths = [
        { wch: 12 },  // Data
        { wch: 15 },  // Tipo
        { wch: 20 },  // Operador
        { wch: 20 },  // Técnico
        { wch: 20 },  // Empresa
        { wch: 15 },  // Contrato
        { wch: 20 },  // Bairro
        { wch: 30 },  // Endereço
        { wch: 30 },  // CTO
        { wch: 15 },  // Área/CX
        { wch: 10 },  // Vagas
        { wch: 15 },  // Unidade
        { wch: 15 },  // CXs Visitadas
        { wch: 50 }   // Comentários
      ];
      ws['!cols'] = colWidths;

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Serviços');

      // Generate filename with current date
      const fileName = `servicos_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;

      // Save the file
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      alert('Falha ao exportar dados. Por favor, tente novamente.');
    }
  };

  const handleEdit = () => {
    if (!selectedService) return;
    setEditedService({ ...selectedService });
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!editedService) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('service_records')
        .update(editedService)
        .eq('id', editedService.id);

      if (error) throw error;

      // Update local state
      setServices(services.map(service => 
        service.id === editedService.id ? editedService : service
      ));
      setSelectedService(editedService);
      setEditMode(false);
    } catch (error: any) {
      console.error('Erro ao salvar alterações:', error);
      alert('Falha ao salvar alterações: ' + (error.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!editedService) return;
    
    const { name, value } = e.target;
    setEditedService(prev => ({
      ...prev!,
      [name]: value
    }));
  };

  const filteredServices = services.filter((service) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      service.operator_name?.toLowerCase().includes(searchLower) ||
      service.company_name?.toLowerCase().includes(searchLower) ||
      service.technician_name?.toLowerCase().includes(searchLower) ||
      service.service_type?.toLowerCase().includes(searchLower) ||
      service.neighborhood?.toLowerCase().includes(searchLower) ||
      service.street?.toLowerCase().includes(searchLower) ||
      service.contract_number?.toLowerCase().includes(searchLower) ||
      service.area_cx?.toLowerCase().includes(searchLower)
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredServices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const uniqueNeighborhoods = Array.from(new Set(services.map(s => s.neighborhood))).sort();

  const renderImagesModal = () => {
    if (!selectedService || !showImages) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full">
          <div className="border-b p-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Imagens do Serviço
            </h3>
            <button
              onClick={() => setShowImages(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          <div className="p-6">
            {selectedService.images && selectedService.images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedService.images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Imagem ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg cursor-pointer"
                      onClick={() => setSelectedImage(url)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-lg flex items-center justify-center">
                      <button
                        onClick={() => setSelectedImage(url)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-gray-800 px-4 py-2 rounded-lg flex items-center space-x-2"
                      >
                        <Maximize2 className="h-4 w-4" />
                        <span>Visualizar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Nenhuma imagem anexada a este serviço.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderImageViewerModal = () => {
    if (!selectedImage) return null;

    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
        <div className="relative max-w-[90vw] max-h-[90vh]">
          <img
            src={selectedImage}
            alt="Imagem em tamanho completo"
            className="max-w-full max-h-[85vh] object-contain"
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
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
          onClick={() => fetchServices()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Histórico de Serviços</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por contrato, operador, área, CX, endereço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-lg flex items-center transition-colors ${
                showFilters 
                  ? 'bg-blue-50 border-blue-200 text-blue-600' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <span className="text-sm">Filtros</span>
            </button>
            <button 
              onClick={handleExport}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center transition-colors"
            >
              <Download className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-sm text-gray-700">Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as FilterOptions['dateRange'] }))}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="today">Hoje</option>
                <option value="week">Última semana</option>
                <option value="month">Último mês</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Serviço
              </label>
              <select
                value={filters.serviceType}
                onChange={(e) => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="Ativação">Ativação</option>
                <option value="Reparo">Reparo</option>
                <option value="Mudança Endereço">Mudança de Endereço</option>
                <option value="Clean Up">Clean Up</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bairro
              </label>
              <select
                value={filters.neighborhood}
                onChange={(e) => setFilters(prev => ({ ...prev, neighborhood: e.target.value }))}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {uniqueNeighborhoods.map(neighborhood => (
                  <option key={neighborhood} value={neighborhood}>{neighborhood}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operador
              </label>
              <select
                value={filters.operator}
                onChange={(e) => setFilters(prev => ({ ...prev, operator: e.target.value }))}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {uniqueOperators.map(operator => (
                  <option key={operator} value={operator}>{operator}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {services.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
          <p className="text-gray-600 mb-4">Nenhum serviço registrado ainda.</p>
          <Link to="/service/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all">
            Registrar novo serviço
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operador</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Serviço</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bairro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((service) => (
                  <tr key={service.id} className={`hover:bg-gray-50 transition-colors ${
                    service.isDuplicate ? 'bg-orange-50' : ''
                  }`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(service.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{service.operator_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{service.technician_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{service.company_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        serviceTypeStyles[service.service_type as keyof typeof serviceTypeStyles]?.bg || 'bg-gray-100'
                      } ${
                        serviceTypeStyles[service.service_type as keyof typeof serviceTypeStyles]?.text || 'text-gray-800'
                      }`}>
                        {service.service_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{service.neighborhood}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center space-x-2">
                      <button 
                        onClick={() => setSelectedService(service)} 
                        className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        Ver
                      
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(service.id)} 
                          disabled={deleteLoading === service.id}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredServices.length)}
                  </span> de <span className="font-medium">{filteredServices.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Anterior</span>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                    <button
                      key={number}
                      onClick={() => paginate(number)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === number
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {number}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Próximo</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedService && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div 
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ 
              animation: 'modal-slide-up 0.3s ease-out',
              background: 'linear-gradient(to bottom, #ffffff, #f8fafc)'
            }}
          >
            <div className="flex justify-between items-center border-b p-6">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${serviceTypeStyles[selectedService.service_type as keyof typeof serviceTypeStyles]?.bg || 'bg-gray-100'}`}>
                  {serviceTypeStyles[selectedService.service_type as keyof typeof serviceTypeStyles]?.icon || <FileText className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Detalhes do Serviço</h3>
                  <p className="text-sm text-gray-500">
                    Registrado em {new Date(selectedService.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isAdmin && !editMode && (
                  <button
                    onClick={handleEdit}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                )}
                <button 
                  onClick={() => {
                    setSelectedService(null);
                    setEditMode(false);
                  }}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Informações Gerais</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Operador</p>
                          {editMode ? (
                            <input
                              type="text"
                              name="operator_name"
                              value={editedService?.operator_name}
                              onChange={handleChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          ) : (
                            <p className="text-base text-gray-900">{selectedService.operator_name}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <Wrench className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Técnico</p>
                          {editMode ? (
                            <input
                              type="text"
                              name="technician_name"
                              value={editedService?.technician_name}
                              onChange={handleChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          ) : (
                            <p className="text-base text-gray-900">{selectedService.technician_name}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Building className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Empresa</p>
                          {editMode ? (
                            <input
                              type="text"
                              name="company_name"
                              value={editedService?.company_name}
                              onChange={handleChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          ) : (
                            <p className="text-base text-gray-900">{selectedService.company_name}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                          <Hash className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Contrato</p>
                          {editMode ? (
                            <input
                              type="text"
                              name="contract_number"
                              value={editedService?.contract_number}
                              onChange={handleChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          ) : (
                            <p className="text-base text-gray-900">{selectedService.contract_number}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Localização</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                          <Home className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Endereço</p>
                          {editMode ? (
                            <input
                              type="text"
                              name="street"
                              value={editedService?.street}
                              onChange={handleChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          ) : (
                            <p className="text-base text-gray-900">{selectedService.street}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-cyan-50 rounded-lg">
                          <Map className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Bairro</p>
                          {editMode ? (
                            <input
                              type="text"
                              name="neighborhood"
                              value={editedService?.neighborhood}
                              onChange={handleChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          ) : (
                            <p className="text-base text-gray-900">{selectedService.neighborhood}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-teal-50 rounded-lg">
                          <MapPin className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Localização CTO</p>
                          {editMode ? (
                            <input
                              type="text"
                              name="cto_location"
                              value={editedService?.cto_location}
                              onChange={handleChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          ) : (
                            <p className="text-base text-gray-900">{selectedService.cto_location}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Detalhes Técnicos</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-yellow-50 rounded-lg">
                          <Box className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Tipo de Serviço</p>
                          {editMode ? (
                            <select
                              name="service_type"
                              value={editedService?.service_type}
                              onChange={handleChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                              <option value="Ativação">Ativação</option>
                              <option value="Reparo">Reparo</option>
                              <option value="Mudança Endereço">Mudança Endereço</option>
                              <option value="Clean Up">Clean Up</option>
                            </select>
                          ) : (
                            <div className="flex items-center mt-1">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${
                                serviceTypeStyles[selectedService.service_type as keyof typeof serviceTypeStyles]?.bg || 'bg-gray-100'
                              } ${
                                serviceTypeStyles[selectedService.service_type as keyof typeof serviceTypeStyles]?.text || 'text-gray-800'
                              }`}>
                                {serviceTypeStyles[selectedService.service_type as keyof typeof serviceTypeStyles]?.icon}
                                <span className="ml-1">{selectedService.service_type}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-pink-50 rounded-lg">
                          <Grid className="h-5 w-5 text-pink-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Área e Caixa</p>
                          {editMode ? (
                            <input
                              type="text"
                              name="area_cx"
                              value={editedService?.area_cx}
                              onChange={handleChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          ) : (
                            <p className="text-base text-gray-900">{selectedService.area_cx}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                          <Box className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Vagas Disponíveis</p>
                          {editMode ? (
                            <input
                              type="text"
                              name="available_slots"
                              value={editedService?.available_slots}
                              onChange={handleChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          ) : (
                            <p className="text-base text-gray-900">{selectedService.available_slots}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                          <Building className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Unidade</p>
                          {editMode ? (
                            <input
                              type="text"
                              name="unit"
                              value={editedService?.unit}
                              onChange={handleChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          ) : (
                            <p className="text-base text-gray-900">{selectedService.unit}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-violet-50 rounded-lg">
                          <Box className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">CXs Visitadas</p>
                          {editMode ? (
                            <input
                              type="text"
                              name="visited_cxs"
                              value={editedService?.visited_cxs}
                              onChange={handleChange}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          ) : (
                            <p className="text-base text-gray-900">{selectedService.visited_cxs}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedService.general_comments && (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <div className="flex items-center space-x-2 mb-4">
                        <MessageSquare className="h-5 w-5 text-gray-600" />
                        <h4 className="text-lg font-semibold text-gray-900">Espelho do Clean Up</h4>
                      </div>
                      {editMode ? (
                        <textarea
                          name="general_comments"
                          value={editedService?.general_comments}
                          onChange={handleChange}
                          rows={4}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      ) : (
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedService.general_comments}</p>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowImages(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <ImageIcon className="h-5 w-5" />
                      <span>Arquivos</span>
                      {selectedService.images && selectedService.images.length > 0 && (
                        <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                          {selectedService.images.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t p-6 bg-gray-50 flex justify-end space-x-3">
              {editMode ? (
                <>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setEditedService(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Salvar Alterações</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setSelectedService(null)}
                  className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors border border-gray-200 shadow-sm font-medium"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showImages && renderImagesModal()}
      {selectedImage && renderImageViewerModal()}
    </div>
  );
}