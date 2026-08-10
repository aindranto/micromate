import React, { useState, useEffect } from 'react';
import { Asset, AssetCategory, VehicleType, AssetDocument } from '../types';
import { INITIAL_WORKSPACE_ID } from '../lib/seedData';
import { formatRupiah } from '../lib/utils';
import { 
  X, Box, Laptop, Car, Home, Camera, Gamepad2, RefreshCw, 
  Upload, FileText, CheckCircle2, Image as ImageIcon, Trash2, Eye, FileCheck, Edit3, AlertTriangle 
} from 'lucide-react';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Asset) => void;
  assetToEdit?: Asset | null;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  assetToEdit,
}) => {
  // Lock body scroll when modal is open
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

  // Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingAsset, setPendingAsset] = useState<Asset | null>(null);

  // Generic Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('device');
  const [subcategory, setSubcategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');

  // Asset Code & Serial Number helpers
  const generateAssetCode = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `AST-${year}-${randomNum}`;
  };

  const [noSerialNumber, setNoSerialNumber] = useState(false);
  const [assetCode, setAssetCode] = useState(() => generateAssetCode());

  const handleToggleNoSerialNumber = (checked: boolean) => {
    setNoSerialNumber(checked);
    if (checked && !assetCode) {
      setAssetCode(generateAssetCode());
    }
  };

  const handleRegenerateAssetCode = () => {
    setAssetCode(generateAssetCode());
  };
  // Helper for warranty calculation
  const calculateWarrantyEnd = (
    startDateStr: string,
    durationVal: number | '',
    unit: 'years' | 'months' | 'days'
  ): string => {
    if (!durationVal || Number(durationVal) <= 0 || !startDateStr) return '';
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return '';
    const end = new Date(start);
    const num = Number(durationVal);
    if (unit === 'years') {
      end.setFullYear(end.getFullYear() + num);
    } else if (unit === 'months') {
      end.setMonth(end.getMonth() + num);
    } else if (unit === 'days') {
      end.setDate(end.getDate() + num);
    }
    const year = end.getFullYear();
    const month = String(end.getMonth() + 1).padStart(2, '0');
    const day = String(end.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const initialDateStr = new Date().toISOString().split('T')[0];
  const [purchaseDate, setPurchaseDate] = useState(initialDateStr);
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // File & Document Upload States
  const [photoFile, setPhotoFile] = useState<{
    dataUrl: string;
    name: string;
    sizeFormatted: string;
    originalSizeMb?: number;
  } | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  const [invoiceFile, setInvoiceFile] = useState<{
    dataUrl: string;
    name: string;
    sizeFormatted: string;
    type: string;
  } | null>(null);
  const [invoiceError, setInvoiceError] = useState('');

  // Client-side image compression (max 1600px width/height, quality 0.82)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDimension = 1600;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve(compressedDataUrl);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => reject('Gagal memproses gambar');
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject('Gagal membaca file');
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (file: File | undefined) => {
    setPhotoError('');
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setPhotoError('Format file foto harus JPG, PNG, atau WEBP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Ukuran foto maksimum 5 MB sebelum kompresi.');
      return;
    }

    setPhotoUploading(true);
    try {
      const compressedDataUrl = await compressImage(file);
      const sizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
      const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

      setPhotoFile({
        dataUrl: compressedDataUrl,
        name: file.name,
        sizeFormatted,
        originalSizeMb: Number((file.size / (1024 * 1024)).toFixed(1)),
      });
      setPhotoUrl(compressedDataUrl);
    } catch {
      setPhotoError('Gagal mengompresi foto.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleInvoiceChange = (file: File | undefined) => {
    setInvoiceError('');
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setInvoiceError('Format file invoice harus PDF, JPG, atau PNG.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setInvoiceError('Ukuran file invoice maksimum 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const sizeKb = Math.round(file.size / 1024);
      const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

      setInvoiceFile({
        dataUrl,
        name: file.name,
        sizeFormatted,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  // Device Specifics
  const [modelNumber, setModelNumber] = useState('');
  const [imei, setImei] = useState('');

  // Vehicle Specifics
  const [vehicleType, setVehicleType] = useState<VehicleType>('motorcycle');
  const [licensePlate, setLicensePlate] = useState('');
  const [manufactureYear, setManufactureYear] = useState<number>(new Date().getFullYear());
  const [currentMileage, setCurrentMileage] = useState<number | ''>('');
  const [annualTaxDate, setAnnualTaxDate] = useState('');

  // Warranty Info
  const [hasWarranty, setHasWarranty] = useState(true);
  const [warrantyStartDate, setWarrantyStartDate] = useState(initialDateStr);
  const [warrantyMethod, setWarrantyMethod] = useState<'duration' | 'manual'>('duration');
  const [warrantyDurationValue, setWarrantyDurationValue] = useState<number | ''>(1);
  const [warrantyDurationUnit, setWarrantyDurationUnit] = useState<'years' | 'months' | 'days'>('years');
  const [warrantyProvider, setWarrantyProvider] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState(() =>
    calculateWarrantyEnd(initialDateStr, 1, 'years')
  );

  const handlePurchaseDateChange = (newDate: string) => {
    setPurchaseDate(newDate);
    // Sync warranty start date if it was matching old purchase date or empty
    if (!warrantyStartDate || warrantyStartDate === purchaseDate) {
      setWarrantyStartDate(newDate);
      if (warrantyMethod === 'duration') {
        const calculated = calculateWarrantyEnd(newDate, warrantyDurationValue || 1, warrantyDurationUnit);
        if (calculated) setWarrantyEndDate(calculated);
      }
    }
  };

  const handleWarrantyStartDateChange = (newStartDate: string) => {
    setWarrantyStartDate(newStartDate);
    if (warrantyMethod === 'duration') {
      const calculated = calculateWarrantyEnd(newStartDate, warrantyDurationValue || 1, warrantyDurationUnit);
      if (calculated) setWarrantyEndDate(calculated);
    }
  };

  const handleWarrantyDurationValueChange = (val: number | '') => {
    setWarrantyDurationValue(val);
    if (warrantyMethod === 'duration') {
      const numVal = val !== '' ? val : 1;
      const calculated = calculateWarrantyEnd(warrantyStartDate || purchaseDate, numVal, warrantyDurationUnit);
      if (calculated) setWarrantyEndDate(calculated);
    }
  };

  const handleWarrantyDurationUnitChange = (unit: 'years' | 'months' | 'days') => {
    setWarrantyDurationUnit(unit);
    if (warrantyMethod === 'duration') {
      const calculated = calculateWarrantyEnd(warrantyStartDate || purchaseDate, warrantyDurationValue || 1, unit);
      if (calculated) setWarrantyEndDate(calculated);
    }
  };

  const handleWarrantyMethodChange = (method: 'duration' | 'manual') => {
    setWarrantyMethod(method);
    if (method === 'duration') {
      const calculated = calculateWarrantyEnd(warrantyStartDate || purchaseDate, warrantyDurationValue || 1, warrantyDurationUnit);
      if (calculated) setWarrantyEndDate(calculated);
    }
  };

  // Sync form values when assetToEdit changes or modal opens
  useEffect(() => {
    if (isOpen && assetToEdit) {
      setName(assetToEdit.name || '');
      setCategory(assetToEdit.category || 'device');
      setSubcategory(assetToEdit.subcategory || '');
      setBrand(assetToEdit.brand || '');
      setModel(assetToEdit.model || '');
      const isNoSn = assetToEdit.serial_number === 'Tidak memiliki S/N';
      setNoSerialNumber(isNoSn);
      setSerialNumber(isNoSn ? '' : (assetToEdit.serial_number || ''));
      setAssetCode(assetToEdit.asset_code || generateAssetCode());
      setPurchaseDate(assetToEdit.purchase_date || new Date().toISOString().split('T')[0]);
      setPurchasePrice(assetToEdit.purchase_price !== undefined ? assetToEdit.purchase_price : '');
      setPurchaseLocation(assetToEdit.purchase_location || '');
      setNotes(assetToEdit.notes || '');
      setPhotoUrl(assetToEdit.photo_url || '');

      if (assetToEdit.warranty) {
        setHasWarranty(true);
        setWarrantyProvider(assetToEdit.warranty.provider || '');
        setWarrantyEndDate(assetToEdit.warranty.end_date || '');
        setWarrantyStartDate(assetToEdit.warranty.start_date || assetToEdit.purchase_date || initialDateStr);
        setWarrantyMethod('manual');
      } else {
        setHasWarranty(false);
      }

      if (assetToEdit.vehicle_details) {
        setVehicleType(assetToEdit.vehicle_details.vehicle_type || 'car');
        setLicensePlate(assetToEdit.vehicle_details.license_plate || '');
        setManufactureYear(assetToEdit.vehicle_details.manufacture_year || new Date().getFullYear());
        setCurrentMileage(assetToEdit.vehicle_details.current_mileage || 0);
        setAnnualTaxDate(assetToEdit.vehicle_details.annual_tax_date || '');
      }

      if (assetToEdit.device_details) {
        setModelNumber(assetToEdit.device_details.model_number || '');
        setImei(assetToEdit.device_details.imei || '');
      }
    } else if (isOpen && !assetToEdit) {
      setName('');
      setCategory('device');
      setSubcategory('');
      setBrand('');
      setModel('');
      setSerialNumber('');
      setNoSerialNumber(false);
      setAssetCode(generateAssetCode());
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setPurchasePrice('');
      setPurchaseLocation('');
      setNotes('');
      setPhotoUrl('');
      setPhotoFile(null);
      setInvoiceFile(null);
      setHasWarranty(true);
      setWarrantyStartDate(initialDateStr);
      setWarrantyMethod('duration');
      setWarrantyDurationValue(1);
      setWarrantyDurationUnit('years');
      setWarrantyProvider('');
      setWarrantyEndDate(calculateWarrantyEnd(initialDateStr, 1, 'years'));
      setVehicleType('motorcycle');
      setLicensePlate('');
      setManufactureYear(new Date().getFullYear());
      setCurrentMileage('');
      setAnnualTaxDate('');
      setModelNumber('');
      setImei('');
    }
  }, [isOpen, assetToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const isEdit = !!assetToEdit;
    const assetId = isEdit ? assetToEdit.asset_id : ('ast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5));

    const finalAsset: Asset = {
      ...assetToEdit,
      asset_id: assetId,
      workspace_id: assetToEdit?.workspace_id || INITIAL_WORKSPACE_ID,
      asset_code: assetCode || assetToEdit?.asset_code,
      category,
      subcategory: subcategory || undefined,
      name,
      brand: brand || undefined,
      model: model || undefined,
      serial_number: noSerialNumber ? (assetCode || 'Tidak memiliki S/N') : (serialNumber || undefined),
      purchase_date: purchaseDate || undefined,
      purchase_price: purchasePrice !== '' ? Number(purchasePrice) : undefined,
      purchase_location: purchaseLocation || undefined,
      status: assetToEdit?.status || 'active',
      notes: notes || undefined,
      photo_url: photoUrl || assetToEdit?.photo_url || undefined,
      created_at: assetToEdit?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expenses: assetToEdit?.expenses || (purchasePrice !== '' ? [
        {
          expense_id: 'exp_' + Date.now(),
          asset_id: assetId,
          type: 'purchase',
          amount: Number(purchasePrice),
          date: purchaseDate || new Date().toISOString().split('T')[0],
          description: `Pembelian ${name}`
        }
      ] : []),
      maintenance_records: assetToEdit?.maintenance_records || [],
      reminders: assetToEdit?.reminders || [],
      documents: assetToEdit?.documents || []
    };

    if (category === 'vehicle') {
      finalAsset.vehicle_details = {
        vehicle_id: assetToEdit?.vehicle_details?.vehicle_id || ('veh_' + Date.now()),
        asset_id: assetId,
        vehicle_type: vehicleType,
        license_plate: licensePlate.toUpperCase(),
        manufacture_year: Number(manufactureYear) || new Date().getFullYear(),
        current_mileage: currentMileage !== '' ? Number(currentMileage) : 0,
        annual_tax_date: annualTaxDate || undefined
      };
    } else if (category === 'device') {
      finalAsset.device_details = {
        device_id: assetToEdit?.device_details?.device_id || ('dev_' + Date.now()),
        asset_id: assetId,
        model_number: modelNumber || undefined,
        imei: imei || undefined
      };
    }

    if (hasWarranty) {
      const startDate = warrantyStartDate || purchaseDate || new Date().toISOString().split('T')[0];
      let finalEndDate = warrantyEndDate;

      if (!finalEndDate || warrantyMethod === 'duration') {
        const calculated = calculateWarrantyEnd(
          startDate,
          warrantyDurationValue || 1,
          warrantyDurationUnit || 'years'
        );
        if (calculated) finalEndDate = calculated;
      }

      if (!finalEndDate) {
        finalEndDate = calculateWarrantyEnd(startDate, 1, 'years') || startDate;
      }

      const prov = warrantyProvider || brand || 'Garansi Resmi';

      finalAsset.warranty = {
        warranty_id: assetToEdit?.warranty?.warranty_id || ('war_' + Date.now()),
        asset_id: assetId,
        start_date: startDate,
        end_date: finalEndDate,
        provider: prov,
        warranty_type: assetToEdit?.warranty?.warranty_type || 'official'
      };

      (finalAsset as any).warranty_end_date = finalEndDate;
      (finalAsset as any).warranty_provider = prov;
    } else {
      delete finalAsset.warranty;
      delete (finalAsset as any).warranty_end_date;
      delete (finalAsset as any).warranty_provider;
    }

    if (invoiceFile) {
      const newDoc: AssetDocument = {
        document_id: 'doc_' + Date.now(),
        asset_id: assetId,
        type: 'invoice',
        name: invoiceFile.name || 'Invoice Pembelian',
        file_url: invoiceFile.dataUrl,
        created_at: new Date().toISOString()
      };
      finalAsset.documents = [...(finalAsset.documents || []), newDoc];
    }

    setPendingAsset(finalAsset);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSave = () => {
    if (pendingAsset) {
      onSave(pendingAsset);
      setPendingAsset(null);
      setIsConfirmModalOpen(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
              {assetToEdit ? (
                <>
                  <Edit3 className="w-5 h-5 text-emerald-700" />
                  <span>Edit Data Aset / Produk</span>
                </>
              ) : (
                <span>Registrasi Aset Baru</span>
              )}
            </h3>
            <p className="text-xs text-stone-500">
              {assetToEdit ? 'Ubah informasi produk secara akurat.' : 'Target input di bawah 60 detik. Isikan informasi dasar terlebih dahulu.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Single Scrollable Area */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto no-scrollbar">
          
          {/* Category Selector Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
              1. Pilih Kategori Aset *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { id: 'device', label: 'Device', icon: Laptop },
                { id: 'vehicle', label: 'Vehicle', icon: Car },
                { id: 'home', label: 'Home', icon: Home },
                { id: 'camera', label: 'Camera', icon: Camera },
                { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
                { id: 'other', label: 'Lainnya', icon: Box },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id as AssetCategory)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Basic Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-stone-800">Nama Aset *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="misal: MacBook Air M2 13-inch / Honda Vario 160 ABS"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-stone-900 placeholder:text-stone-400 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Merk / Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Apple, Honda, LG, Sony"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-stone-900 placeholder:text-stone-400 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Model / Tipe</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Model / Tipe varian"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-stone-900 placeholder:text-stone-400 font-medium"
              />
            </div>

            <div className="space-y-2.5 sm:col-span-2 bg-stone-50/70 p-3.5 rounded-2xl border border-stone-200">
              {noSerialNumber ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-stone-800 text-xs block">Serial Number (S/N)</label>
                    <input
                      type="text"
                      value="Tidak memiliki S/N"
                      disabled
                      className="w-full px-3.5 py-2 bg-stone-200/70 border border-stone-300 rounded-xl text-stone-500 font-semibold cursor-not-allowed select-none text-xs"
                    />
                  </div>

                  <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-stone-800 text-xs block">Kode Aset</label>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Generasi Otomatis
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={assetCode}
                        onChange={(e) => setAssetCode(e.target.value)}
                        className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold text-emerald-950 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                      />
                      <button
                        type="button"
                        onClick={handleRegenerateAssetCode}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-2xs shrink-0 cursor-pointer active:scale-95 transition-all"
                        title="Generate ulang kode aset"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Generate Kode</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-bold text-stone-800 text-xs block">Serial Number (S/N)</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Nomor Seri / S/N (contoh: C02G1234MD6R)"
                    className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-stone-900 placeholder:text-stone-400 font-mono font-medium text-xs sm:text-sm"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={noSerialNumber}
                  onChange={(e) => handleToggleNoSerialNumber(e.target.checked)}
                  className="rounded text-emerald-800 focus:ring-emerald-700 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-stone-800">
                  Produk tidak memiliki Serial Number
                </span>
              </label>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Harga Pembelian (Rp)</label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="15000000"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-stone-900 placeholder:text-stone-400 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Tanggal Beli</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => handlePurchaseDateChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-stone-900 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Toko / Tempat Pembelian</label>
              <input
                type="text"
                value={purchaseLocation}
                onChange={(e) => setPurchaseLocation(e.target.value)}
                placeholder="iBox, Tokopedia, AHASS"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-stone-900 placeholder:text-stone-400 font-medium"
              />
            </div>
          </div>

          {/* Vehicle Specific Progressive Disclosure */}
          {category === 'vehicle' && (
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3 text-xs">
              <h4 className="font-bold text-emerald-950">
                Spesifikasi Khusus Kendaraan (Vehicle)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-800">Plat Nomor Kendaraan</label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="B 1234 SGF"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-bold uppercase text-stone-900 placeholder:text-stone-400"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-800">Odometer Saat Ini (km)</label>
                  <input
                    type="number"
                    value={currentMileage}
                    onChange={(e) => setCurrentMileage(e.target.value ? Number(e.target.value) : '')}
                    placeholder="12000"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-800">Tanggal Pajak STNK Tahunan</label>
                  <input
                    type="date"
                    value={annualTaxDate}
                    onChange={(e) => setAnnualTaxDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Warranty Section */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <span className="font-bold text-stone-900 text-sm">INFORMASI GARANSI</span>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700">
                <input
                  type="checkbox"
                  checked={hasWarranty}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setHasWarranty(isChecked);
                    if (isChecked) {
                      const startDate = warrantyStartDate || purchaseDate || new Date().toISOString().split('T')[0];
                      setWarrantyStartDate(startDate);
                      const calculated = calculateWarrantyEnd(
                        startDate,
                        warrantyDurationValue || 1,
                        warrantyDurationUnit || 'years'
                      );
                      if (calculated) setWarrantyEndDate(calculated);
                    }
                  }}
                  className="rounded text-emerald-800 focus:ring-emerald-700 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-stone-800">Produk memiliki garansi</span>
              </label>
            </div>

            {hasWarranty && (
              <div className="space-y-4 pt-1">
                {/* Tanggal Mulai Garansi */}
                <div>
                  <label className="font-bold text-stone-800 block mb-1">Tanggal Mulai Garansi</label>
                  <input
                    type="date"
                    value={warrantyStartDate}
                    onChange={(e) => handleWarrantyStartDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 font-medium focus:ring-2 focus:ring-emerald-600/30"
                  />
                </div>

                {/* Metode Penentuan Garansi */}
                <div>
                  <label className="font-bold text-stone-800 block mb-1.5">Metode Penentuan Garansi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleWarrantyMethodChange('duration')}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        warrantyMethod === 'duration'
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs font-bold'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 font-medium'
                      }`}
                    >
                      <span>Berdasarkan Durasi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleWarrantyMethodChange('manual')}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        warrantyMethod === 'manual'
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs font-bold'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 font-medium'
                      }`}
                    >
                      <span>Tanggal Berakhir Manual</span>
                    </button>
                  </div>
                </div>

                {/* Conditional based on method */}
                {warrantyMethod === 'duration' ? (
                  <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-3">
                    {/* Lama Garansi Input + Unit Dropdown */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-stone-800">Lama Garansi</label>
                        {/* Quick preset buttons */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleWarrantyDurationValueChange(num)}
                              className={`px-2 py-0.5 rounded-md text-[10px] border cursor-pointer transition-all ${
                                warrantyDurationValue === num && warrantyDurationUnit === 'years'
                                  ? 'bg-emerald-800 text-white border-emerald-800 font-bold'
                                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 font-medium'
                              }`}
                            >
                              {num} Thn
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={warrantyDurationValue}
                          onChange={(e) =>
                            handleWarrantyDurationValueChange(e.target.value ? Number(e.target.value) : '')
                          }
                          placeholder="Masukkan durasi"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                        />
                        <select
                          value={warrantyDurationUnit}
                          onChange={(e) => handleWarrantyDurationUnitChange(e.target.value as any)}
                          className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-stone-800 font-bold shrink-0 cursor-pointer focus:bg-white"
                        >
                          <option value="years">Tahun</option>
                          <option value="months">Bulan</option>
                          <option value="days">Hari</option>
                        </select>
                      </div>
                    </div>

                    {/* Calculated End Date (Automatic) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-stone-800">Tanggal Berakhir Garansi</label>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          🔒 Otomatis
                        </span>
                      </div>
                      <input
                        type="date"
                        value={warrantyEndDate}
                        readOnly
                        className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 font-bold cursor-not-allowed"
                      />
                    </div>
                  </div>
                ) : (
                  /* Manual End Date */
                  <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-stone-800">Tanggal Berakhir Garansi</label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ✏️ Input Manual
                      </span>
                    </div>
                    <input
                      type="date"
                      value={warrantyEndDate}
                      onChange={(e) => setWarrantyEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 font-medium focus:ring-2 focus:ring-emerald-600/30"
                    />
                  </div>
                )}

                {/* Penyedia Garansi */}
                <div>
                  <label className="font-bold text-stone-800 block mb-1">Penyedia Garansi (Opsional)</label>
                  <input
                    type="text"
                    value={warrantyProvider}
                    onChange={(e) => setWarrantyProvider(e.target.value)}
                    placeholder="AppleCare / iBox / AHASS / Official Store"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-medium focus:ring-2 focus:ring-emerald-600/30"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section Dokumen & Foto (Document & Image Vault) */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-4 text-xs">
            <div className="pb-2 border-b border-stone-200">
              <span className="font-bold text-stone-900 text-sm block">DOKUMEN & FOTO</span>
              <span className="text-stone-500 text-[11px] font-medium block">
                Unggah foto aset dan bukti invoice pembelian. Seluruh file diproses lokal dan tersimpan di Document Vault.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Foto Aset */}
              <div className="space-y-2">
                <label className="font-bold text-stone-800 flex items-center justify-between">
                  <span>Foto Aset</span>
                  <span className="text-[10px] text-stone-500 font-semibold">JPG, PNG, WEBP • Maks. 5 MB</span>
                </label>

                {photoFile ? (
                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2.5">
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-stone-100 border border-stone-200 group">
                      <img
                        src={photoFile.dataUrl}
                        alt="Preview Aset"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a
                          href={photoFile.dataUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-white/90 rounded-lg text-stone-800 hover:bg-white text-xs font-bold flex items-center gap-1 shadow-md"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Full</span>
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1 text-emerald-800 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Tersimpan</span>
                        </div>
                        <p className="font-semibold text-stone-800 truncate text-xs" title={photoFile.name}>
                          {photoFile.name}
                        </p>
                        <p className="text-[10px] text-stone-500">
                          Ukuran: {photoFile.sizeFormatted}
                          {photoFile.originalSizeMb && photoFile.originalSizeMb > 0.5 ? ` (Original: ${photoFile.originalSizeMb} MB)` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <label className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-lg cursor-pointer transition-colors text-[11px]">
                          Ganti
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handlePhotoChange(e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoUrl('');
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 bg-white border-2 border-dashed border-stone-200 rounded-2xl hover:border-emerald-600 hover:bg-emerald-50/20 transition-all cursor-pointer group text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 group-hover:scale-110 transition-transform">
                      {photoUploading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-stone-800 block text-xs">Upload Foto Aset</span>
                      <span className="text-[11px] text-stone-400 font-medium block">
                        Klik atau drag file foto di sini
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Otomatis Kompresi Gambar
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handlePhotoChange(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                )}

                {photoError && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1">{photoError}</p>
                )}
              </div>

              {/* Card 2: Invoice / Bukti Pembelian */}
              <div className="space-y-2">
                <label className="font-bold text-stone-800 flex items-center justify-between">
                  <span>Invoice / Bukti Pembelian</span>
                  <span className="text-[10px] text-stone-500 font-semibold">PDF, JPG, PNG • Maks. 10 MB</span>
                </label>

                {invoiceFile ? (
                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-emerald-800 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Invoice Siap Diunggah</span>
                        </div>
                        <p className="font-bold text-stone-900 truncate text-xs" title={invoiceFile.name}>
                          {invoiceFile.name}
                        </p>
                        <p className="text-[10px] text-stone-500 font-medium">
                          Ukuran: {invoiceFile.sizeFormatted}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
                      <a
                        href={invoiceFile.dataUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-lg transition-colors text-[11px] flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Lihat</span>
                      </a>
                      <label className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-lg cursor-pointer transition-colors text-[11px]">
                        Ganti
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          onChange={(e) => handleInvoiceChange(e.target.files?.[0])}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setInvoiceFile(null)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Invoice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 bg-white border-2 border-dashed border-stone-200 rounded-2xl hover:border-emerald-600 hover:bg-emerald-50/20 transition-all cursor-pointer group text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-stone-800 block text-xs">Upload Invoice / Bukti Pembelian</span>
                      <span className="text-[11px] text-stone-400 font-medium block">
                        PDF, JPG, atau PNG (Maks 10 MB)
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Format Bukti Pembelian Legal
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={(e) => handleInvoiceChange(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                )}

                {invoiceError && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1">{invoiceError}</p>
                )}
              </div>
            </div>

            {/* Optional URL Photo input fallback */}
            <div className="pt-2 border-t border-stone-200/80">
              <label className="font-bold text-stone-700 text-[11px] block mb-1">
                Atau gunakan URL Gambar Eksternal (Opsional)
              </label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-medium text-xs focus:ring-2 focus:ring-emerald-600/30"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{assetToEdit ? 'Simpan Perubahan' : 'Simpan Aset'}</span>
            </button>
          </div>

        </form>

      </div>

      {/* Confirmation Modal Before Saving */}
      {isConfirmModalOpen && pendingAsset && (
        <div className="fixed inset-0 z-60 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-2xl w-full max-w-md space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-800" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-base">
                  {assetToEdit ? 'Konfirmasi Perubahan Aset' : 'Konfirmasi Registrasi Aset'}
                </h3>
                <p className="text-xs text-stone-500">
                  {assetToEdit ? 'Periksa kembali data sebelum disimpan' : 'Pastikan data yang diisikan sudah benar'}
                </p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-2 text-xs">
              <div className="flex justify-between border-b border-stone-200/60 pb-2">
                <span className="text-stone-500">Nama Aset:</span>
                <span className="font-bold text-stone-900 text-right">{pendingAsset.name}</span>
              </div>
              <div className="flex justify-between border-b border-stone-200/60 pb-2">
                <span className="text-stone-500">Kategori:</span>
                <span className="font-semibold text-stone-800 uppercase">{pendingAsset.category}</span>
              </div>
              {pendingAsset.brand && (
                <div className="flex justify-between border-b border-stone-200/60 pb-2">
                  <span className="text-stone-500">Merek / Model:</span>
                  <span className="font-medium text-stone-800">{pendingAsset.brand} {pendingAsset.model || ''}</span>
                </div>
              )}
              {pendingAsset.serial_number && (
                <div className="flex justify-between border-b border-stone-200/60 pb-2">
                  <span className="text-stone-500">Nomor Seri (S/N):</span>
                  <span className="font-mono font-medium text-stone-800">{pendingAsset.serial_number}</span>
                </div>
              )}
              {pendingAsset.purchase_price !== undefined && (
                <div className="flex justify-between pt-1">
                  <span className="text-stone-500">Harga Beli:</span>
                  <span className="font-bold text-emerald-800">{formatRupiah(pendingAsset.purchase_price)}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {assetToEdit 
                ? `Apakah Anda yakin ingin menyimpan perubahan informasi pada produk "${pendingAsset.name}"? Data di aplikasi dan Google Sheets akan diperbarui.`
                : `Apakah Anda yakin ingin mendaftarkan aset baru "${pendingAsset.name}" ini ke dalam sistem?`
              }
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Batal & Cek Lagi
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ya, Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
