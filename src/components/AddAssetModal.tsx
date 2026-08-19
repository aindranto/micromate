import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Asset, AssetCategory, VehicleType, AssetDocument } from '../types';
import { INITIAL_WORKSPACE_ID } from '../lib/seedData';
import { formatRupiah } from '../lib/utils';
import { 
  X, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Edit3, Loader2, CloudUpload
} from 'lucide-react';
import { StepProgressBar } from './add-asset-steps/StepProgressBar';
import { Step1Identity } from './add-asset-steps/Step1Identity';
import { Step2Specs } from './add-asset-steps/Step2Specs';
import { Step3Warranty } from './add-asset-steps/Step3Warranty';
import { Step4Review } from './add-asset-steps/Step4Review';
import { Step5Confirm } from './add-asset-steps/Step5Confirm';
import { compressImageFile } from '../lib/imageCompressor';

export interface AssetFormData {
  name: string;
  category: AssetCategory;
  subcategory: string;
  brand: string;
  model: string;
  serialNumber: string;
  noSerialNumber: boolean;
  assetCode: string;
  assignedUser: string;
  location: string;
  // Specs - Vehicle
  vehicleType: VehicleType;
  licensePlate: string;
  manufactureYear: number;
  currentMileage: number | '';
  annualTaxDate: string;
  // Specs - Device
  modelNumber: string;
  imei: string;
  // Specs - SIM
  hasSimDetails: boolean;
  phoneNumber: string;
  simProvider: string;
  simActiveUntil: string;
  simRegStatus: 'registered' | 'unregistered' | 'expired';
  accountDependencies: string[];
  customAccountInput: string;
  // Notes
  notes: string;
  // Warranty
  purchasePrice: number | '';
  purchaseDate: string;
  purchaseLocation: string;
  hasWarranty: boolean;
  warrantyStartDate: string;
  warrantyMethod: 'duration' | 'manual';
  warrantyDurationValue: number | '';
  warrantyDurationUnit: 'years' | 'months' | 'days';
  warrantyEndDate: string;
  warrantyProvider: string;
  warrantyNumber: string;
  warrantyType: string;
  warrantyNotes: string;
  // Media / Files
  photoUrl: string;
}

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Asset) => void | Promise<void>;
  assetToEdit?: Asset | null;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

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

const generateAssetCode = () => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `AST-${year}-${randomNum}`;
};

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  assetToEdit,
  onShowToast,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // React Hook Form initialization
  const methods = useForm<AssetFormData>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      category: 'device',
      subcategory: '',
      brand: '',
      model: '',
      serialNumber: '',
      noSerialNumber: false,
      assetCode: generateAssetCode(),
      assignedUser: '',
      location: '',
      vehicleType: 'motorcycle',
      licensePlate: '',
      manufactureYear: new Date().getFullYear(),
      currentMileage: '',
      annualTaxDate: '',
      modelNumber: '',
      imei: '',
      hasSimDetails: false,
      phoneNumber: '',
      simProvider: 'Telkomsel',
      simActiveUntil: '',
      simRegStatus: 'registered',
      accountDependencies: [],
      customAccountInput: '',
      notes: '',
      purchasePrice: '',
      purchaseDate: todayStr,
      purchaseLocation: '',
      hasWarranty: true,
      warrantyStartDate: todayStr,
      warrantyMethod: 'duration',
      warrantyDurationValue: 1,
      warrantyDurationUnit: 'years',
      warrantyEndDate: calculateWarrantyEnd(todayStr, 1, 'years'),
      warrantyProvider: '',
      warrantyNumber: '',
      warrantyType: 'official',
      warrantyNotes: '',
      photoUrl: '',
    },
  });

  const { watch, setValue, trigger, reset, formState: { errors } } = methods;

  // Watch form fields for reactive child component rendering
  const watchedValues = watch();

  // Multi-step Wizard Navigation State (1: Identity, 2: Specs, 3: Warranty, 4: Review, 5: Confirm)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 5;
  const [step1Error, setStep1Error] = useState<string>('');

  // Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingAsset, setPendingAsset] = useState<Asset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncStepMessage, setSyncStepMessage] = useState('Sedang menyinkronkan data ke Google Sheets...');

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

  const quickAccountPresets = [
    'WhatsApp', 'Telegram', 'M-Banking BCA', 'Livin by Mandiri', 
    'BRImo', 'BNI Mobile', 'Tokopedia', 'Shopee', 'Gmail', 'DANA', 'GoPay', 'OVO', 'Apple ID'
  ];

  const handleAddAccountDependency = (accountName: string) => {
    const trimmed = accountName.trim();
    if (!trimmed) return;
    const current = watchedValues.accountDependencies || [];
    if (!current.includes(trimmed)) {
      setValue('accountDependencies', [...current, trimmed], { shouldDirty: true });
    }
    setValue('customAccountInput', '', { shouldDirty: true });
  };

  const handleRemoveAccountDependency = (accountName: string) => {
    const current = watchedValues.accountDependencies || [];
    setValue('accountDependencies', current.filter((a) => a !== accountName), { shouldDirty: true });
  };

  const handleToggleNoSerialNumber = (checked: boolean) => {
    setValue('noSerialNumber', checked, { shouldDirty: true });
    if (checked) {
      const codeToUse = (watchedValues.assetCode && watchedValues.assetCode.trim())
        ? watchedValues.assetCode.trim()
        : generateAssetCode();
      setValue('assetCode', codeToUse, { shouldDirty: true });
      setValue('serialNumber', codeToUse, { shouldDirty: true });
    }
  };

  const handleRegenerateAssetCode = () => {
    const newCode = generateAssetCode();
    setValue('assetCode', newCode, { shouldDirty: true });
    if (watchedValues.noSerialNumber) {
      setValue('serialNumber', newCode, { shouldDirty: true });
    }
  };

  // Image compression (max 1200px, quality 0.80)
  const compressImage = (file: File): Promise<string> => {
    return compressImageFile(file, { maxDimension: 1200, quality: 0.80 });
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
      setValue('photoUrl', compressedDataUrl, { shouldDirty: true });
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

  // Warranty helpers
  const handlePurchaseDateChange = (newDate: string) => {
    setValue('purchaseDate', newDate, { shouldDirty: true });
    if (!watchedValues.warrantyStartDate || watchedValues.warrantyStartDate === watchedValues.purchaseDate) {
      setValue('warrantyStartDate', newDate, { shouldDirty: true });
      if (watchedValues.warrantyMethod === 'duration') {
        const calculated = calculateWarrantyEnd(newDate, watchedValues.warrantyDurationValue || 1, watchedValues.warrantyDurationUnit);
        if (calculated) setValue('warrantyEndDate', calculated, { shouldDirty: true });
      }
    }
  };

  const handleWarrantyStartDateChange = (newStartDate: string) => {
    setValue('warrantyStartDate', newStartDate, { shouldDirty: true });
    if (watchedValues.warrantyMethod === 'duration') {
      const calculated = calculateWarrantyEnd(newStartDate, watchedValues.warrantyDurationValue || 1, watchedValues.warrantyDurationUnit);
      if (calculated) setValue('warrantyEndDate', calculated, { shouldDirty: true });
    }
  };

  const handleWarrantyDurationValueChange = (val: number | '') => {
    setValue('warrantyDurationValue', val, { shouldDirty: true });
    if (watchedValues.warrantyMethod === 'duration') {
      const numVal = val !== '' ? val : 1;
      const calculated = calculateWarrantyEnd(watchedValues.warrantyStartDate || watchedValues.purchaseDate, numVal, watchedValues.warrantyDurationUnit);
      if (calculated) setValue('warrantyEndDate', calculated, { shouldDirty: true });
    }
  };

  const handleWarrantyDurationUnitChange = (unit: 'years' | 'months' | 'days') => {
    setValue('warrantyDurationUnit', unit, { shouldDirty: true });
    if (watchedValues.warrantyMethod === 'duration') {
      const calculated = calculateWarrantyEnd(watchedValues.warrantyStartDate || watchedValues.purchaseDate, watchedValues.warrantyDurationValue || 1, unit);
      if (calculated) setValue('warrantyEndDate', calculated, { shouldDirty: true });
    }
  };

  const handleWarrantyMethodChange = (method: 'duration' | 'manual') => {
    setValue('warrantyMethod', method, { shouldDirty: true });
    if (method === 'duration') {
      const calculated = calculateWarrantyEnd(watchedValues.warrantyStartDate || watchedValues.purchaseDate, watchedValues.warrantyDurationValue || 1, watchedValues.warrantyDurationUnit);
      if (calculated) setValue('warrantyEndDate', calculated, { shouldDirty: true });
    }
  };

  // Sync form values when assetToEdit changes or modal opens
  useEffect(() => {
    if (isOpen && assetToEdit) {
      const codeToUse = assetToEdit.asset_code || (assetToEdit.serial_number?.startsWith('AST-') ? assetToEdit.serial_number : generateAssetCode());
      const isNoSn = assetToEdit.serial_number === 'Tidak memiliki S/N' || assetToEdit.serial_number === codeToUse;
      reset({
        name: assetToEdit.name || '',
        category: assetToEdit.category || 'device',
        subcategory: assetToEdit.subcategory || '',
        brand: assetToEdit.brand || '',
        model: assetToEdit.model || '',
        assignedUser: assetToEdit.assigned_user || '',
        location: assetToEdit.location || '',
        noSerialNumber: isNoSn,
        serialNumber: isNoSn ? codeToUse : (assetToEdit.serial_number || ''),
        assetCode: codeToUse,
        purchaseDate: assetToEdit.purchase_date || todayStr,
        purchasePrice: assetToEdit.purchase_price !== undefined ? assetToEdit.purchase_price : '',
        purchaseLocation: assetToEdit.purchase_location || '',
        notes: assetToEdit.notes || '',
        photoUrl: assetToEdit.photo_url || '',
        hasWarranty: Boolean(assetToEdit.warranty),
        warrantyProvider: assetToEdit.warranty?.provider || '',
        warrantyNumber: assetToEdit.warranty?.warranty_number || '',
        warrantyType: assetToEdit.warranty?.warranty_type || 'official',
        warrantyNotes: assetToEdit.warranty?.notes || '',
        warrantyEndDate: assetToEdit.warranty?.end_date || '',
        warrantyStartDate: assetToEdit.warranty?.start_date || assetToEdit.purchase_date || todayStr,
        warrantyMethod: 'manual',
        warrantyDurationValue: 1,
        warrantyDurationUnit: 'years',
        vehicleType: assetToEdit.vehicle_details?.vehicle_type || 'car',
        licensePlate: assetToEdit.vehicle_details?.license_plate || '',
        manufactureYear: assetToEdit.vehicle_details?.manufacture_year || new Date().getFullYear(),
        currentMileage: assetToEdit.vehicle_details?.current_mileage || '',
        annualTaxDate: assetToEdit.vehicle_details?.annual_tax_date || '',
        modelNumber: assetToEdit.device_details?.model_number || '',
        imei: assetToEdit.device_details?.imei || '',
        hasSimDetails: Boolean(assetToEdit.sim_details || assetToEdit.category === 'sim_card'),
        phoneNumber: assetToEdit.sim_details?.phone_number || '',
        simProvider: assetToEdit.sim_details?.provider || 'Telkomsel',
        simActiveUntil: assetToEdit.sim_details?.active_until || '',
        simRegStatus: assetToEdit.sim_details?.registration_status || 'registered',
        accountDependencies: assetToEdit.sim_details?.account_dependencies || [],
        customAccountInput: '',
      });
      setCurrentStep(1);
      setStep1Error('');
      setPhotoFile(null);
      setInvoiceFile(null);
      setIsConfirmModalOpen(false);
      setPendingAsset(null);
      setIsSubmitting(false);
    } else if (isOpen && !assetToEdit) {
      reset({
        name: '',
        category: 'device',
        subcategory: '',
        brand: '',
        model: '',
        assignedUser: '',
        location: '',
        noSerialNumber: false,
        serialNumber: '',
        assetCode: generateAssetCode(),
        purchaseDate: todayStr,
        purchasePrice: '',
        purchaseLocation: '',
        notes: '',
        photoUrl: '',
        hasWarranty: true,
        warrantyStartDate: todayStr,
        warrantyMethod: 'duration',
        warrantyDurationValue: 1,
        warrantyDurationUnit: 'years',
        warrantyEndDate: calculateWarrantyEnd(todayStr, 1, 'years'),
        warrantyProvider: '',
        warrantyNumber: '',
        warrantyType: 'official',
        warrantyNotes: '',
        vehicleType: 'motorcycle',
        licensePlate: '',
        manufactureYear: new Date().getFullYear(),
        currentMileage: '',
        annualTaxDate: '',
        modelNumber: '',
        imei: '',
        hasSimDetails: false,
        phoneNumber: '',
        simProvider: 'Telkomsel',
        simActiveUntil: '',
        simRegStatus: 'registered',
        accountDependencies: [],
        customAccountInput: '',
      });
      setCurrentStep(1);
      setStep1Error('');
      setPhotoFile(null);
      setInvoiceFile(null);
      setIsConfirmModalOpen(false);
      setPendingAsset(null);
      setIsSubmitting(false);
    }
  }, [isOpen, assetToEdit, reset, todayStr]);

  // Step Validation & Navigation helpers
  const validateStep1 = async (): Promise<boolean> => {
    const isNameValid = await trigger('name');
    if (!watchedValues.name?.trim() || !isNameValid) {
      setStep1Error('Nama Aset wajib diisi sebelum melanjutkan.');
      return false;
    }
    setStep1Error('');
    return true;
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      const isValid = await validateStep1();
      if (!isValid) return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStepClick = async (targetStep: number) => {
    if (targetStep > 1) {
      const isValid = await validateStep1();
      if (!isValid) {
        setCurrentStep(1);
        return;
      }
    }
    setStep1Error('');
    setCurrentStep(targetStep);
  };

  // Submit Handler
  const handleFinalFormSubmit = (data: AssetFormData) => {
    if (!data.name.trim()) {
      setStep1Error('Nama Aset wajib diisi.');
      setCurrentStep(1);
      return;
    }

    const assetId = assetToEdit ? assetToEdit.asset_id : `asset_${Date.now()}`;
    const lockedAssetCode = (data.assetCode && data.assetCode.trim())
      ? data.assetCode.trim()
      : (assetToEdit?.asset_code || generateAssetCode());

    const cleanSerialNumber = data.noSerialNumber
      ? lockedAssetCode
      : (data.serialNumber.trim() || lockedAssetCode);

    const finalAsset: Asset = {
      asset_id: assetId,
      workspace_id: assetToEdit?.workspace_id || INITIAL_WORKSPACE_ID,
      name: data.name.trim(),
      category: data.category,
      subcategory: data.subcategory.trim() || undefined,
      brand: data.brand.trim() || undefined,
      model: data.model.trim() || undefined,
      serial_number: cleanSerialNumber,
      asset_code: lockedAssetCode,
      assigned_user: data.assignedUser.trim() || undefined,
      location: data.location.trim() || undefined,
      purchase_date: data.purchaseDate || undefined,
      purchase_price: data.purchasePrice !== '' ? Number(data.purchasePrice) : undefined,
      purchase_location: data.purchaseLocation.trim() || undefined,
      notes: data.notes.trim() || undefined,
      photo_url: data.photoUrl.trim() || undefined,
      status: assetToEdit ? assetToEdit.status : 'active',
      created_at: assetToEdit?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      documents: assetToEdit?.documents || [],
      maintenance_records: assetToEdit?.maintenance_records || [],
      reminders: assetToEdit?.reminders || [],
    };

    if (data.category === 'vehicle') {
      finalAsset.vehicle_details = {
        vehicle_id: assetToEdit?.vehicle_details?.vehicle_id || ('veh_' + Date.now()),
        asset_id: assetId,
        vehicle_type: data.vehicleType,
        license_plate: data.licensePlate.trim() || undefined,
        manufacture_year: data.manufactureYear || undefined,
        current_mileage: data.currentMileage !== '' ? Number(data.currentMileage) : 0,
        annual_tax_date: data.annualTaxDate || undefined,
      };
    } else if (data.category === 'device') {
      finalAsset.device_details = {
        device_id: assetToEdit?.device_details?.device_id || ('dev_' + Date.now()),
        asset_id: assetId,
        model_number: data.modelNumber || undefined,
        imei: data.imei || undefined,
      };
    }

    if (data.category === 'sim_card' || data.hasSimDetails || data.phoneNumber.trim() || data.accountDependencies.length > 0) {
      finalAsset.sim_details = {
        sim_id: assetToEdit?.sim_details?.sim_id || ('sim_' + Date.now()),
        asset_id: assetId,
        phone_number: data.phoneNumber.trim(),
        provider: data.simProvider.trim() || 'Telkomsel',
        active_until: data.simActiveUntil || '',
        registration_status: data.simRegStatus,
        account_dependencies: data.accountDependencies,
      };
    } else {
      delete finalAsset.sim_details;
    }

    if (data.hasWarranty) {
      const startDate = data.warrantyStartDate || data.purchaseDate || todayStr;
      let finalEndDate = data.warrantyEndDate;

      if (!finalEndDate || data.warrantyMethod === 'duration') {
        const calculated = calculateWarrantyEnd(
          startDate,
          data.warrantyDurationValue || 1,
          data.warrantyDurationUnit || 'years'
        );
        if (calculated) finalEndDate = calculated;
      }

      if (!finalEndDate) {
        finalEndDate = calculateWarrantyEnd(startDate, 1, 'years') || startDate;
      }

      const prov = data.warrantyProvider || data.brand || 'Garansi Resmi';

      finalAsset.warranty = {
        warranty_id: assetToEdit?.warranty?.warranty_id || ('war_' + Date.now()),
        asset_id: assetId,
        start_date: startDate,
        end_date: finalEndDate,
        provider: prov,
        warranty_type: data.warrantyType || 'official',
        warranty_number: data.warrantyNumber.trim() || undefined,
        notes: data.warrantyNotes.trim() || undefined,
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
        created_at: new Date().toISOString(),
      };
      finalAsset.documents = [...(finalAsset.documents || []), newDoc];
    }

    setPendingAsset(finalAsset);
    handleConfirmSave(finalAsset);
  };

  const handleConfirmSave = async (targetAsset?: Asset) => {
    const assetToSave = targetAsset || pendingAsset;
    if (!assetToSave || isSubmitting) return;

    setIsSubmitting(true);
    setIsConfirmModalOpen(true);
    setSyncStepMessage('Menyimpan data aset ke database lokal...');

    try {
      // Step 1: Simulasikan & eksekusi penyimpanan ke lokal
      await new Promise((resolve) => setTimeout(resolve, 350));
      setSyncStepMessage('Sedang menyinkronkan data ke Google Sheets...');

      // Step 2: Panggil callback onSave
      await Promise.resolve(onSave(assetToSave));

      // Step 3: Tampilkan status sukses
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSyncStepMessage('Sinkronisasi Berhasil!');

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Trigger Toast Notification
      if (onShowToast) {
        onShowToast(
          'success',
          `Aset "${assetToSave.name}" Berhasil Disimpan & Disinkronkan!`
        );
      }

      setIsSubmitting(false);
      setIsConfirmModalOpen(false);
      setPendingAsset(null);
      onClose();
    } catch (err) {
      console.error('Error saving asset:', err);
      setIsSubmitting(false);
      if (onShowToast) {
        onShowToast('error', 'Gagal menyinkronkan data aset. Silakan coba lagi.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <FormProvider {...methods}>
      <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-3xl border border-stone-200/80 w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
          
          {/* Modal Header (M3 Container Header) */}
          <div className="p-4 sm:p-5 border-b border-stone-200/80 flex items-center justify-between shrink-0 bg-white">
            <div>
              <h3 className="font-bold text-stone-900 text-base sm:text-lg flex items-center gap-2">
                {assetToEdit ? (
                  <>
                    <Edit3 className="w-5 h-5 text-emerald-900" />
                    <span>Edit Data Aset / Produk</span>
                  </>
                ) : (
                  <span>Form Registrasi Aset Baru</span>
                )}
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                {assetToEdit 
                  ? 'Perbarui spesifikasi dan data inventaris secara bertahap.'
                  : 'Multi-step Form dengan validasi cerdas untuk pendataan aset yang komprehensif.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-all cursor-pointer active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Multi-step Wizard Material UI Stepper */}
          <StepProgressBar
            currentStep={currentStep}
            totalSteps={totalSteps}
            onStepClick={handleStepClick}
            canNavigateToStep={(step) => step === 1 || Boolean(watchedValues.name?.trim())}
          />

          {/* Wizard Step Body */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              methods.handleSubmit(handleFinalFormSubmit)(e);
            }} 
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto no-scrollbar">
              {currentStep === 1 && (
                <Step1Identity
                  category={watchedValues.category}
                  setCategory={(cat) => {
                    setValue('category', cat, { shouldDirty: true });
                    if (cat === 'sim_card') setValue('hasSimDetails', true, { shouldDirty: true });
                  }}
                  name={watchedValues.name || ''}
                  setName={(val) => {
                    setValue('name', val, { shouldDirty: true, shouldValidate: true });
                    if (step1Error) setStep1Error('');
                  }}
                  brand={watchedValues.brand || ''}
                  setBrand={(val) => setValue('brand', val, { shouldDirty: true })}
                  model={watchedValues.model || ''}
                  setModel={(val) => setValue('model', val, { shouldDirty: true })}
                  assignedUser={watchedValues.assignedUser || ''}
                  setAssignedUser={(val) => setValue('assignedUser', val, { shouldDirty: true })}
                  location={watchedValues.location || ''}
                  setLocation={(val) => setValue('location', val, { shouldDirty: true })}
                  noSerialNumber={watchedValues.noSerialNumber}
                  handleToggleNoSerialNumber={handleToggleNoSerialNumber}
                  serialNumber={watchedValues.serialNumber || ''}
                  setSerialNumber={(val) => setValue('serialNumber', val, { shouldDirty: true })}
                  assetCode={watchedValues.assetCode || ''}
                  setAssetCode={(val) => setValue('assetCode', val, { shouldDirty: true })}
                  handleRegenerateAssetCode={handleRegenerateAssetCode}
                  validationError={step1Error || errors.name?.message}
                />
              )}

              {currentStep === 2 && (
                <Step2Specs
                  category={watchedValues.category}
                  vehicleType={watchedValues.vehicleType}
                  setVehicleType={(vt) => setValue('vehicleType', vt, { shouldDirty: true })}
                  licensePlate={watchedValues.licensePlate || ''}
                  setLicensePlate={(lp) => setValue('licensePlate', lp, { shouldDirty: true })}
                  manufactureYear={watchedValues.manufactureYear}
                  setManufactureYear={(yr) => setValue('manufactureYear', yr, { shouldDirty: true })}
                  currentMileage={watchedValues.currentMileage}
                  setCurrentMileage={(cm) => setValue('currentMileage', cm, { shouldDirty: true })}
                  annualTaxDate={watchedValues.annualTaxDate || ''}
                  setAnnualTaxDate={(date) => setValue('annualTaxDate', date, { shouldDirty: true })}
                  modelNumber={watchedValues.modelNumber || ''}
                  setModelNumber={(mn) => setValue('modelNumber', mn, { shouldDirty: true })}
                  imei={watchedValues.imei || ''}
                  setImei={(im) => setValue('imei', im, { shouldDirty: true })}
                  hasSimDetails={watchedValues.hasSimDetails}
                  setHasSimDetails={(has) => setValue('hasSimDetails', has, { shouldDirty: true })}
                  phoneNumber={watchedValues.phoneNumber || ''}
                  setPhoneNumber={(pn) => setValue('phoneNumber', pn, { shouldDirty: true })}
                  simProvider={watchedValues.simProvider || ''}
                  setSimProvider={(sp) => setValue('simProvider', sp, { shouldDirty: true })}
                  simActiveUntil={watchedValues.simActiveUntil || ''}
                  setSimActiveUntil={(date) => setValue('simActiveUntil', date, { shouldDirty: true })}
                  simRegStatus={watchedValues.simRegStatus}
                  setSimRegStatus={(st) => setValue('simRegStatus', st, { shouldDirty: true })}
                  accountDependencies={watchedValues.accountDependencies || []}
                  customAccountInput={watchedValues.customAccountInput || ''}
                  setCustomAccountInput={(val) => setValue('customAccountInput', val, { shouldDirty: true })}
                  handleAddAccountDependency={handleAddAccountDependency}
                  handleRemoveAccountDependency={handleRemoveAccountDependency}
                  quickAccountPresets={quickAccountPresets}
                  notes={watchedValues.notes || ''}
                  setNotes={(val) => setValue('notes', val, { shouldDirty: true })}
                />
              )}

              {currentStep === 3 && (
                <Step3Warranty
                  purchasePrice={watchedValues.purchasePrice}
                  setPurchasePrice={(pr) => setValue('purchasePrice', pr, { shouldDirty: true })}
                  purchaseDate={watchedValues.purchaseDate || todayStr}
                  handlePurchaseDateChange={handlePurchaseDateChange}
                  purchaseLocation={watchedValues.purchaseLocation || ''}
                  setPurchaseLocation={(loc) => setValue('purchaseLocation', loc, { shouldDirty: true })}
                  hasWarranty={watchedValues.hasWarranty}
                  setHasWarranty={(has) => setValue('hasWarranty', has, { shouldDirty: true })}
                  warrantyStartDate={watchedValues.warrantyStartDate || todayStr}
                  handleWarrantyStartDateChange={handleWarrantyStartDateChange}
                  warrantyMethod={watchedValues.warrantyMethod}
                  handleWarrantyMethodChange={handleWarrantyMethodChange}
                  warrantyDurationValue={watchedValues.warrantyDurationValue}
                  handleWarrantyDurationValueChange={handleWarrantyDurationValueChange}
                  warrantyDurationUnit={watchedValues.warrantyDurationUnit}
                  handleWarrantyDurationUnitChange={handleWarrantyDurationUnitChange}
                  warrantyEndDate={watchedValues.warrantyEndDate || ''}
                  setWarrantyEndDate={(date) => setValue('warrantyEndDate', date, { shouldDirty: true })}
                  warrantyProvider={watchedValues.warrantyProvider || ''}
                  setWarrantyProvider={(prov) => setValue('warrantyProvider', prov, { shouldDirty: true })}
                  warrantyNumber={watchedValues.warrantyNumber || ''}
                  setWarrantyNumber={(num) => setValue('warrantyNumber', num, { shouldDirty: true })}
                  warrantyType={watchedValues.warrantyType || 'official'}
                  setWarrantyType={(type) => setValue('warrantyType', type, { shouldDirty: true })}
                  warrantyNotes={watchedValues.warrantyNotes || ''}
                  setWarrantyNotes={(notes) => setValue('warrantyNotes', notes, { shouldDirty: true })}
                  brand={watchedValues.brand || ''}
                />
              )}

              {currentStep === 4 && (
                <Step4Review
                  photoFile={photoFile}
                  photoUploading={photoUploading}
                  photoError={photoError}
                  handlePhotoChange={handlePhotoChange}
                  setPhotoFile={setPhotoFile}
                  photoUrl={watchedValues.photoUrl || ''}
                  setPhotoUrl={(url) => setValue('photoUrl', url, { shouldDirty: true })}
                  invoiceFile={invoiceFile}
                  invoiceError={invoiceError}
                  handleInvoiceChange={handleInvoiceChange}
                  setInvoiceFile={setInvoiceFile}
                  name={watchedValues.name || ''}
                  category={watchedValues.category}
                  brand={watchedValues.brand || ''}
                  model={watchedValues.model || ''}
                  serialNumber={watchedValues.serialNumber || ''}
                  assetCode={watchedValues.assetCode || ''}
                  noSerialNumber={watchedValues.noSerialNumber}
                  assignedUser={watchedValues.assignedUser || ''}
                  location={watchedValues.location || ''}
                  purchasePrice={watchedValues.purchasePrice}
                  purchaseDate={watchedValues.purchaseDate || ''}
                  purchaseLocation={watchedValues.purchaseLocation || ''}
                  hasWarranty={watchedValues.hasWarranty}
                  warrantyEndDate={watchedValues.warrantyEndDate || ''}
                  warrantyProvider={watchedValues.warrantyProvider || ''}
                  hasSimDetails={watchedValues.hasSimDetails}
                  phoneNumber={watchedValues.phoneNumber || ''}
                  simProvider={watchedValues.simProvider || ''}
                  accountDependencies={watchedValues.accountDependencies || []}
                  licensePlate={watchedValues.licensePlate || ''}
                  notes={watchedValues.notes || ''}
                />
              )}

              {currentStep === 5 && (
                <Step5Confirm
                  assetToEdit={assetToEdit}
                  name={watchedValues.name || ''}
                  category={watchedValues.category}
                  brand={watchedValues.brand || ''}
                  model={watchedValues.model || ''}
                  serialNumber={watchedValues.serialNumber || ''}
                  assetCode={watchedValues.assetCode || ''}
                  noSerialNumber={watchedValues.noSerialNumber}
                  assignedUser={watchedValues.assignedUser || ''}
                  location={watchedValues.location || ''}
                  purchasePrice={watchedValues.purchasePrice}
                  purchaseDate={watchedValues.purchaseDate || ''}
                  purchaseLocation={watchedValues.purchaseLocation || ''}
                  hasWarranty={watchedValues.hasWarranty}
                  warrantyEndDate={watchedValues.warrantyEndDate || ''}
                  warrantyProvider={watchedValues.warrantyProvider || ''}
                  hasSimDetails={watchedValues.hasSimDetails}
                  phoneNumber={watchedValues.phoneNumber || ''}
                  simProvider={watchedValues.simProvider || ''}
                  licensePlate={watchedValues.licensePlate || ''}
                  photoFile={photoFile}
                  photoUrl={watchedValues.photoUrl || ''}
                  invoiceFile={invoiceFile}
                  isSubmitting={isSubmitting}
                  syncStepMessage={syncStepMessage}
                  onConfirmSave={() => methods.handleSubmit(handleFinalFormSubmit)()}
                />
              )}
            </div>

            {/* Wizard Footer Navigation Controls (M3 Buttons) */}
            <div className="p-4 sm:p-5 border-t border-stone-200/80 flex items-center justify-between gap-3 bg-stone-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-full cursor-pointer transition-all"
                >
                  Batal
                </button>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-stone-100 border border-stone-300/80 text-stone-800 text-xs font-bold rounded-full shadow-2xs cursor-pointer active:scale-95 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Sebelumnya</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-bold rounded-full shadow-2xs cursor-pointer active:scale-95 transition-all"
                  >
                    <span>Lanjut ke Langkah {currentStep + 1}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-bold rounded-full shadow-2xs cursor-pointer active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{assetToEdit ? 'Simpan Perubahan' : 'Konfirmasi & Simpan Aset'}</span>
                  </button>
                )}
              </div>
            </div>
          </form>

        </div>

        {/* Confirmation Modal Before Saving (M3 Dialog) */}
        {isConfirmModalOpen && pendingAsset && (
          <div className="fixed inset-0 z-60 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="relative bg-white rounded-3xl border border-stone-200/80 p-6 shadow-2xl w-full max-w-md space-y-5 overflow-hidden">
              
              {/* Overlay Loader Saat Process Syncing */}
              {isSubmitting && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 space-y-4 animate-in fade-in duration-200">
                  <div className="relative flex items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 shadow-xs animate-pulse">
                      <CloudUpload className="w-7 h-7 text-emerald-800" />
                    </div>
                    <Loader2 className="w-16 h-16 text-emerald-700 animate-spin absolute -inset-1" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-stone-900 text-base">
                      Menyinkronkan Data Aset...
                    </h4>
                    <p className="text-xs font-semibold text-emerald-800 mt-1.5 flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>{syncStepMessage}</span>
                    </p>
                    <p className="text-[11px] text-stone-500 mt-2 max-w-xs leading-relaxed">
                      Mohon tunggu sejenak, data sedang dikirim ke server aplikasi & Google Sheets API.
                    </p>
                  </div>
                  <div className="w-full max-w-xs bg-stone-100 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-700 rounded-full animate-pulse transition-all duration-300" style={{ width: '85%' }} />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-800" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base">
                    {assetToEdit ? 'Konfirmasi Perubahan Aset' : 'Konfirmasi Registrasi Aset'}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    {assetToEdit ? 'Periksa kembali data sebelum disimpan' : 'Pastikan data yang diisikan sudah benar'}
                  </p>
                </div>
              </div>

              <div className="bg-stone-50/80 rounded-2xl p-4 border border-stone-200/80 space-y-2 text-xs">
                <div className="flex justify-between border-b border-stone-200/60 pb-2">
                  <span className="text-stone-500 font-medium">Nama Aset:</span>
                  <span className="font-bold text-stone-900 text-right">{pendingAsset.name}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200/60 pb-2">
                  <span className="text-stone-500 font-medium">Kategori:</span>
                  <span className="font-semibold text-stone-800 uppercase">{pendingAsset.category}</span>
                </div>
                {pendingAsset.assigned_user && (
                  <div className="flex justify-between border-b border-stone-200/60 pb-2">
                    <span className="text-stone-500 font-medium">Pengguna / Penanggung Jawab:</span>
                    <span className="font-bold text-emerald-800">{pendingAsset.assigned_user}</span>
                  </div>
                )}
                {pendingAsset.brand && (
                  <div className="flex justify-between border-b border-stone-200/60 pb-2">
                    <span className="text-stone-500 font-medium">Merek / Model:</span>
                    <span className="font-medium text-stone-800">{pendingAsset.brand} {pendingAsset.model || ''}</span>
                  </div>
                )}
                {pendingAsset.serial_number && (
                  <div className="flex justify-between border-b border-stone-200/60 pb-2">
                    <span className="text-stone-500 font-medium">Nomor Seri (S/N):</span>
                    <span className="font-mono font-medium text-stone-800">{pendingAsset.serial_number}</span>
                  </div>
                )}
                {pendingAsset.purchase_price !== undefined && (
                  <div className="flex justify-between pt-1">
                    <span className="text-stone-500 font-medium">Harga Beli:</span>
                    <span className="font-bold text-emerald-800">{formatRupiah(pendingAsset.purchase_price)}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-stone-600 font-medium leading-relaxed">
                {assetToEdit 
                  ? `Apakah Anda yakin ingin menyimpan perubahan informasi pada produk "${pendingAsset.name}"? Data di aplikasi dan Google Sheets akan disinkronkan.`
                  : `Apakah Anda yakin ingin mendaftarkan aset baru "${pendingAsset.name}" ini ke dalam sistem?`
                }
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-bold text-xs rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal & Cek Lagi
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleConfirmSave()}
                  className="flex-1 py-3 bg-emerald-900 hover:bg-emerald-950 active:scale-95 text-white font-bold text-xs rounded-full shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyinkronkan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ya, Simpan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FormProvider>
  );
};
