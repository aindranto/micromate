import React, { useState, useEffect } from 'react';
import { Asset, AssetDocument, DocumentType } from '../types';
import { X, FileText, Upload, Link } from 'lucide-react';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  onSave: (assetId: string, doc: AssetDocument) => void;
}

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  onClose,
  asset,
  onSave,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentType>('invoice');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [fileUrl, setFileUrl] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [fileError, setFileError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError('');
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFileError('Ukuran file maksimum 10 MB.');
      return;
    }

    setSelectedFileName(file.name);
    if (!name) {
      setName(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFileUrl(reader.result);
      }
    };
    reader.onerror = () => setFileError('Gagal membaca file');
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !fileUrl) return;

    const doc: AssetDocument = {
      document_id: 'doc_' + Date.now(),
      asset_id: asset.asset_id,
      type,
      name,
      file_url: fileUrl,
      created_at: new Date().toISOString()
    };

    onSave(asset.asset_id, doc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-md shadow-xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
        
        <div className="p-5 sm:p-6 border-b border-stone-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-stone-900 text-lg">
              Unggah Dokumen Aset
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs flex-1 overflow-y-auto no-scrollbar">
          <div>
            <label className="font-bold text-stone-800 block mb-1">Nama Dokumen *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="misal: Invoice_iBox_MacBook / STNK_Vario"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Tipe Dokumen *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType)}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium"
            >
              <option value="invoice">Invoice / Faktur Pembelian</option>
              <option value="warranty_card">Kartu Garansi</option>
              <option value="stnk">STNK / BPKB Kendaraan</option>
              <option value="insurance">Polis Asuransi</option>
              <option value="service_receipt">Bukti Servis / Nota</option>
              <option value="manual">Buku Petunjuk (Manual)</option>
              <option value="other">Dokumen Lainnya</option>
            </select>
          </div>

          {/* Upload Method Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-800 block">Metode File *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUploadMode('file');
                  setFileUrl('');
                }}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  uploadMode === 'file'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-2xs'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadMode('url');
                  setFileUrl('');
                }}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  uploadMode === 'url'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-2xs'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Link className="w-4 h-4" />
                <span>URL / Drive Link</span>
              </button>
            </div>
          </div>

          {uploadMode === 'file' ? (
            <div>
              <label className="block p-4 border-2 border-dashed border-stone-300 hover:border-emerald-600 bg-stone-50 hover:bg-emerald-50/50 rounded-2xl cursor-pointer text-center transition-all">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.docx"
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-stone-400 mx-auto mb-1.5" />
                <span className="font-bold text-stone-800 block text-xs">
                  {selectedFileName ? selectedFileName : 'Pilih File (PDF, Gambar, Doc)'}
                </span>
                <span className="text-[11px] text-stone-500 block mt-0.5">
                  Maksimum ukuran 10 MB
                </span>
              </label>
              {fileError && <p className="text-rose-600 text-[11px] font-bold mt-1">{fileError}</p>}
            </div>
          ) : (
            <div>
              <input
                type="url"
                required
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/... atau URL Dokumen"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-medium focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
              />
            </div>
          )}

          <p className="text-[11px] text-stone-500 font-medium leading-snug">
            File akan otomatis diunggah dan disimpan ke folder <strong className="text-stone-800">MicroMate_Vault/Assets</strong> di Google Drive terhubung Anda.
          </p>

          <div className="pt-4 border-t border-stone-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-stone-700 font-bold hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!fileUrl || !name}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-bold rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Simpan Dokumen
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
