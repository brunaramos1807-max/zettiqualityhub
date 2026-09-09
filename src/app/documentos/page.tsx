'use client';
import React, { useState, useEffect, useRef } from 'react';

import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import {
  FolderOpen,
  Upload,
  Trash2,
  FileText,
  BookOpen,
  ClipboardList,
  MessageSquare,
  Shield,
  Plus,
  X,
  Download,
  Search,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface DocumentRecord {
  id: string;
  name: string;
  description?: string;
  category: string;
  version: string;
  file_name: string;
  file_url?: string;
  file_size?: string;
  uploaded_at: string;
  is_active: boolean;
}

const DOCUMENT_CATEGORIES = [
  { id: 'manual-qa', label: 'Manual de Qualidade', icon: <BookOpen size={14} />, color: '#3B82F6' },
  {
    id: 'manual-iepc',
    label: 'Manual de IEPC',
    icon: <ClipboardList size={14} />,
    color: '#10B981',
  },
  {
    id: 'avaliacao',
    label: 'Documento de Avaliação',
    icon: <FileText size={14} />,
    color: '#F59E0B',
  },
  {
    id: 'feedback',
    label: 'Documento de Feedback',
    icon: <MessageSquare size={14} />,
    color: '#8B5CF6',
  },
  { id: 'normas', label: 'Normas e Políticas', icon: <Shield size={14} />, color: '#EF4444' },
  {
    id: 'procedimentos',
    label: 'Procedimentos (POPs)',
    icon: <ClipboardList size={14} />,
    color: '#06B6D4',
  },
  { id: 'treinamentos', label: 'Treinamentos', icon: <BookOpen size={14} />, color: '#84CC16' },
  { id: 'iso', label: 'Documentos ISO', icon: <Shield size={14} />, color: '#F97316' },
  { id: 'geral', label: 'Geral', icon: <FolderOpen size={14} />, color: '#94A3B8' },
];

function getCategoryConfig(id: string) {
  return (
    DOCUMENT_CATEGORIES.find((c) => c.id === id) ||
    DOCUMENT_CATEGORIES[DOCUMENT_CATEGORIES.length - 1]
  );
}

function DocumentosContent() {
  const { session } = useSystemAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [docName, setDocName] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [docCategory, setDocCategory] = useState('geral');
  const [docVersion, setDocVersion] = useState('1.0');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit =
    session?.permissoes?.permissao_editar ||
    session?.permissoes?.acesso_total ||
    session?.cargo === 'Administrador';

  const supabase = createClient();

  const loadDocuments = async () => {
    setLoading(true);
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error loading documents:', error.message);
      toast.error('Erro ao carregar documentos');
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async () => {
    if (!docName || !docCategory) {
      toast.error('Preencha o nome e a categoria do documento');
      return;
    }
    if (!supabase) {
      toast.error('Supabase não configurado');
      return;
    }

    setUploading(true);
    let fileUrl: string | undefined;
    let fileSize: string | undefined;
    let fileName = selectedFile?.name || `${docName}.pdf`;

    try {
      if (selectedFile) {
        const ext = selectedFile.name.split('.').pop();
        const path = `${Date.now()}-${docName.replace(/\s+/g, '-')}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('qualivisao-documents')
          .upload(path, selectedFile, { upsert: false });

        if (uploadError) {
          console.error('Upload error:', uploadError.message);
          // Continue without file URL if storage fails
        } else if (uploadData) {
          const { data: urlData } = supabase.storage
            .from('qualivisao-documents')
            .getPublicUrl(uploadData.path);
          fileUrl = urlData?.publicUrl;
          fileSize = `${(selectedFile.size / 1024).toFixed(0)} KB`;
          fileName = selectedFile.name;
        }
      }

      const { error: insertError } = await supabase.from('documents').insert({
        name: docName,
        description: docDescription || null,
        category: docCategory,
        version: docVersion || '1.0',
        file_name: fileName,
        file_url: fileUrl || null,
        file_size: fileSize || null,
        is_active: true,
      });

      if (insertError) {
        toast.error('Erro ao salvar documento: ' + insertError.message);
      } else {
        toast.success('Documento adicionado com sucesso!');
        setUploadModal(false);
        resetForm();
        loadDocuments();
      }
    } catch (err: any) {
      toast.error('Erro inesperado: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: DocumentRecord) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('documents')
      .update({ is_active: false })
      .eq('id', doc.id);

    if (error) {
      toast.error('Erro ao remover documento');
    } else {
      toast.success('Documento removido');
      loadDocuments();
    }
  };

  const handleDownload = (doc: DocumentRecord) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
    } else {
      toast.info('Arquivo não disponível para download (sem URL de armazenamento)');
    }
  };

  const resetForm = () => {
    setDocName('');
    setDocDescription('');
    setDocCategory('geral');
    setDocVersion('1.0');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredDocs = documents.filter((d) => {
    const matchSearch =
      !searchQuery ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCategory === 'all' || d.category === filterCategory;
    return matchSearch && matchCat;
  });

  const docsByCategory = DOCUMENT_CATEGORIES.map((cat) => ({
    ...cat,
    docs: filteredDocs.filter((d) => d.category === cat.id),
  })).filter((cat) => (filterCategory === 'all' ? true : cat.id === filterCategory));

  const inputCls =
    'w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none transition-all focus:ring-1 focus:ring-blue-500/40';
  const inputStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <main className="flex-1">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Documentos</h1>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Manuais, normas, procedimentos e documentos de referência
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => setUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                style={{ backgroundColor: '#1E40AF' }}
              >
                <Plus size={14} />
                Adicionar Documento
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-white outline-none"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <option value="all">Todas as categorias</option>
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin" style={{ color: '#3B82F6' }} />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <FolderOpen size={48} className="mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-base font-semibold text-white mb-2">Nenhum documento encontrado</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {canEdit
                  ? 'Adicione o primeiro documento clicando no botão acima'
                  : 'Nenhum documento disponível no momento'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {docsByCategory
                .filter((cat) => cat.docs.length > 0)
                .map((cat) => (
                  <div
                    key={cat.id}
                    className="rounded-xl overflow-hidden"
                    style={{
                      backgroundColor: '#111827',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      className="flex items-center gap-3 px-5 py-3"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                      >
                        {cat.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{cat.label}</p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          color: 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {cat.docs.length} doc{cat.docs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      {cat.docs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${cat.color}10`, color: cat.color }}
                          >
                            <FileText size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {doc.description && (
                                <p
                                  className="text-xs truncate"
                                  style={{ color: 'rgba(255,255,255,0.35)' }}
                                >
                                  {doc.description}
                                </p>
                              )}
                              <span
                                className="text-xs flex-shrink-0"
                                style={{ color: 'rgba(255,255,255,0.25)' }}
                              >
                                v{doc.version}
                              </span>
                              {doc.file_size && (
                                <span
                                  className="text-xs flex-shrink-0"
                                  style={{ color: 'rgba(255,255,255,0.25)' }}
                                >
                                  {doc.file_size}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                              {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                            </span>
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                              style={{ color: '#60A5FA' }}
                              title="Download"
                            >
                              <Download size={13} />
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => handleDelete(doc)}
                                className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                                style={{ color: 'rgba(239,68,68,0.6)' }}
                                title="Remover"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {uploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-white">Adicionar Documento</h2>
              <button
                onClick={() => {
                  setUploadModal(false);
                  resetForm();
                }}
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  Nome do documento *
                </label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Ex: Manual de Qualidade v2.1"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  Descrição
                </label>
                <textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Descrição breve do documento..."
                  rows={2}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    Categoria *
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className={inputCls}
                    style={inputStyle}
                  >
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    Versão
                  </label>
                  <input
                    type="text"
                    value={docVersion}
                    onChange={(e) => setDocVersion(e.target.value)}
                    placeholder="1.0"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  Arquivo (PDF, Word, etc.)
                </label>
                <div
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
                  style={{
                    borderColor: 'rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? (
                    <div>
                      <FileText size={24} className="mx-auto mb-2" style={{ color: '#3B82F6' }} />
                      <p className="text-sm text-white">{selectedFile.name}</p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {(selectedFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload
                        size={24}
                        className="mx-auto mb-2"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      />
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Clique para selecionar arquivo
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        PDF, Word, imagens — máx. 50MB
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setUploadModal(false);
                  resetForm();
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !docName}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: '#1E40AF' }}
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Enviando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocumentosPage() {
  return (
    <EnterpriseLayout>
      <DocumentosContent />
    </EnterpriseLayout>
  );
}
