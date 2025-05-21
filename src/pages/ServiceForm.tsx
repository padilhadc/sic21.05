import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  AlertCircle, 
  Save, 
  ArrowLeft, 
  Image as ImageIcon, 
  X, 
  Upload, 
  Loader2,
  User,
  Briefcase,
  Building,
  Box,
  MapPin,
  FileText,
  Home,
  Map,
  HelpCircle,
  ChevronRight,
  AlertTriangle,
  Check
} from 'lucide-react';

interface ServiceFormData {
  operator_name: string;
  technician_name: string;
  company_name: string;
  available_slots: string;
  unit: string;
  area_cx: string;
  contract_number: string;
  service_type: string;
  visited_cxs: string;
  neighborhood: string;
  street: string;
  cto_location: string;
  general_comments: string;
  images: string[];
}

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

const RequiredField: React.FC = () => (
  <span className="text-red-500 ml-1" title="Campo obrigatório">*</span>
);

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-10 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-6 w-48 dark:bg-gray-800">
          {content}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -left-1 top-3 dark:bg-gray-800" />
        </div>
      )}
    </div>
  );
};

export default function ServiceForm() {
  const navigate = useNavigate();
  const { user, isVisitor } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationStatus, setNotificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [formData, setFormData] = useState<ServiceFormData>({
    operator_name: "",
    technician_name: "",
    company_name: "",
    available_slots: "",
    unit: "",
    area_cx: "",
    contract_number: "",
    service_type: "",
    visited_cxs: "",
    neighborhood: "",
    street: "",
    cto_location: "",
    general_comments: "",
    images: [],
  });

  useEffect(() => {
    if (user?.email) {
      const firstName = user.email.split('@')[0].split('.')[0];
      const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
      setFormData(prev => ({ ...prev, operator_name: capitalizedName }));
    }
  }, [user]);

  if (isVisitor) {
    navigate('/dashboard');
    return null;
  }

  const checkDuplicateService = async (contractNumber: string) => {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: existingServices, error: queryError } = await supabase
      .from('service_records')
      .select('*')
      .eq('contract_number', contractNumber)
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('Error checking for duplicates:', queryError);
      return false;
    }

    return existingServices && existingServices.length > 0;
  };

  const handleContractChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'contract_number' && value) {
      const isDuplicate = await checkDuplicateService(value);
      if (isDuplicate) {
        setWarning('ATENÇÃO: Este contrato já foi registrado na última hora!');
      } else {
        setWarning('');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  }, [formData.images]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const imageFiles = Array.from(items)
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (imageFiles.length > 0) {
      await handleFiles(imageFiles);
    }
  }, [formData.images]);

  const handleFiles = async (files: File[]) => {
    if (formData.images.length + files.length > 6) {
      setError('Máximo de 6 imagens permitido');
      return;
    }

    setUploadingImages(true);
    setError('');

    try {
      const uploadPromises = files.map(async (file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error('Apenas imagens são permitidas');
        }

        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Tamanho máximo por imagem: 5MB');
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error: uploadError } = await supabase.storage
          .from('service-images')
          .upload(`public/${fileName}`, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('service-images')
          .getPublicUrl(`public/${fileName}`);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
    } catch (err: any) {
      console.error('Erro ao fazer upload:', err);
      setError(err.message || 'Falha ao fazer upload das imagens');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await handleFiles(Array.from(files));
  };

  const handleRemoveImage = async (indexToRemove: number) => {
    try {
      const imageUrl = formData.images[indexToRemove];
      const fileName = imageUrl.split('/').pop();

      if (fileName) {
        const { error: deleteError } = await supabase.storage
          .from('service-images')
          .remove([`public/${fileName}`]);

        if (deleteError) throw deleteError;
      }

      setFormData(prev => ({
        ...prev,
        images: prev.images.filter((_, index) => index !== indexToRemove),
      }));
    } catch (err: any) {
      console.error('Erro ao remover imagem:', err);
      setError('Falha ao remover imagem. ' + (err.message || ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!formData.general_comments) {
      setError('O campo "Espelho do Clean Up" é obrigatório');
      setLoading(false);
      return;
    }

    if (warning && !confirm('Este contrato já foi registrado na última hora. Deseja continuar mesmo assim?')) {
      setLoading(false);
      return;
    }

    try {
      // Show loading notification
      setNotificationMessage('Salvando registro...');
      setNotificationStatus('loading');
      setShowNotification(true);

      const { error: submitError } = await supabase
        .from('service_records')
        .insert([
          {
            ...formData,
            created_by: user?.id,
          },
        ]);

      if (submitError) throw submitError;

      // Show success notification
      setNotificationMessage('Registro salvo com sucesso!');
      setNotificationStatus('success');
      
      // Hide notification after 2 seconds and redirect
      setTimeout(() => {
        setShowNotification(false);
        navigate('/service/history');
      }, 2000);

    } catch (err) {
      setNotificationMessage('Falha ao salvar registro');
      setNotificationStatus('error');
      setTimeout(() => setShowNotification(false), 2000);
      
      setError('Falha ao enviar registro de serviço');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderNotification = () => {
    if (!showNotification) return null;

    return (
      <div 
        className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 flex items-center space-x-3 animate-fade-in z-50"
        style={{
          animation: showNotification ? 'fade-in 0.3s ease-out' : 'fade-out 0.3s ease-out'
        }}
      >
        {notificationStatus === 'loading' && (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
        )}
        {notificationStatus === 'success' && (
          <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
        {notificationStatus === 'error' && (
          <div className="h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
            <X className="h-3 w-3 text-white" />
          </div>
        )}
        <p className="text-sm font-medium text-gray-900">{notificationMessage}</p>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <a href="/dashboard" className="hover:text-gray-900 dark:hover:text-white transition-colors">
          Dashboard
        </a>
        <ChevronRight className="h-4 w-4" />
        <a href="/service/history" className="hover:text-gray-900 dark:hover:text-white transition-colors">
          Atendimentos
        </a>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 dark:text-white font-medium">Novo Registro</span>
      </nav>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Novo Registro de Serviço
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Preencha os dados do serviço realizado
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          <span>Voltar</span>
        </button>
      </div>

      {renderNotification()}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center animate-fade-in">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {warning && (
          <div className="bg-orange-50 border border-orange-200 text-orange-600 px-4 py-3 rounded-lg text-sm flex items-center animate-fade-in">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            {warning}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm flex items-center animate-fade-in">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            Registro salvo com sucesso! Redirecionando...
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Informações Básicas
            </h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label htmlFor="operator_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome do Operador<RequiredField />
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="operator_name"
                  name="operator_name"
                  required
                  readOnly
                  value={formData.operator_name}
                  className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="technician_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome do Técnico<RequiredField />
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="technician_name"
                  name="technician_name"
                  required
                  value={formData.technician_name}
                  onChange={handleChange}
                  className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome da Empresa<RequiredField />
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  required
                  value={formData.company_name}
                  onChange={handleChange}
                  className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="contract_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Número do Contrato<RequiredField />
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="contract_number"
                  name="contract_number"
                  required
                  value={formData.contract_number}
                  onChange={handleContractChange}
                  className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Detalhes do Serviço
            </h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label htmlFor="service_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo de Serviço<RequiredField />
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Box className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="service_type"
                  name="service_type"
                  required
                  value={formData.service_type}
                  onChange={handleChange}
                  className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                >
                  <option value="">Selecione um tipo de serviço</option>
                  <option value="Ativação">Ativação</option>
                  <option value="Reparo">Reparo</option>
                  <option value="Mudança Endereço">Mudança Endereço</option>
                  <option value="Clean Up">Clean Up</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="available_slots" className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                Vagas Disponíveis<RequiredField />
                <Tooltip content="Número de vagas disponíveis na CTO">
                  <HelpCircle className="h-4 w-4 ml-1 text-gray-400" />
                </Tooltip>
              </label>
              <input
                type="text"
                id="available_slots"
                name="available_slots"
                required
                value={formData.available_slots}
                onChange={handleChange}
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Unidade<RequiredField />
              </label>
              <input
                type="text"
                id="unit"
                name="unit"
                required
                value={formData.unit}
                onChange={handleChange}
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="area_cx" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Área e Caixa<RequiredField />
              </label>
              <input
                type="text"
                id="area_cx"
                name="area_cx"
                required
                value={formData.area_cx}
                onChange={handleChange}
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="visited_cxs" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                CXs Visitadas<RequiredField />
              </label>
              <input
                type="text"
                id="visited_cxs"
                name="visited_cxs"
                required
                value={formData.visited_cxs}
                onChange={handleChange}
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Localização
            </h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label htmlFor="street" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rua<RequiredField />
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Home className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="street"
                  name="street"
                  required
                  value={formData.street}
                  onChange={handleChange}
                  className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bairro<RequiredField />
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Map className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="neighborhood"
                  name="neighborhood"
                  required
                  value={formData.neighborhood}
                  onChange={handleChange}
                  className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label htmlFor="cto_location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Localização Residencial do Cliente<RequiredField />
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="cto_location"
                  name="cto_location"
                  required
                  value={formData.cto_location}
                  onChange={handleChange}
                  placeholder="Endereço completo do cliente"
                  className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Comentários e Anexos
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label htmlFor="general_comments" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Espelho do Clean Up<RequiredField />
              </label>
              <textarea
                id="general_comments"
                name="general_comments"
                rows={4}
                value={formData.general_comments}
                onChange={handleChange}
                required
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                placeholder="Adicione informações detalhadas sobre o Clean Up..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Imagens (Máximo 6)
              </label>
              
              <div 
                className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onPaste={handlePaste}
              >
                <div className="space-y-1 text-center">
                  <div className="flex flex-wrap gap-4 mb-4">
                    {formData.images.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Imagem ${index + 1}`}
                          className="h-24 w-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {formData.images.length < 6 && (
                    <div className="flex flex-col items-center">
                      {uploadingImages ? (
                        <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label
                              htmlFor="file-upload"
                              className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>Fazer upload de arquivo</span>
                              <input
                                id="file-upload"
                                name="file-upload"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="sr-only"
                              />
                            </label>
                            <p className="pl-1">ou arraste e solte</p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            PNG, JPG, GIF até 5MB
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 sticky bottom-0 bg-gray-50 dark:bg-gray-900 p-4 -mx-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || uploadingImages}
            className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Salvar Registro</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}