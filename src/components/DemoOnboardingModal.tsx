import React, { useState } from 'react';
import { Box, Trash2, CheckCircle2, ShieldCheck, AlertTriangle, ArrowLeft } from 'lucide-react';

interface DemoOnboardingModalProps {
  isOpen: boolean;
  demoCount: number;
  onChooseStartFresh: () => void;
  onChooseKeepDemo: () => void;
  onClose: () => void;
}

export const DemoOnboardingModal: React.FC<DemoOnboardingModalProps> = ({
  isOpen,
  demoCount,
  onChooseStartFresh,
  onChooseKeepDemo,
  onClose,
}) => {
  const [confirmChoice, setConfirmChoice] = useState<'none' | 'clean' | 'keep'>('none');

  if (!isOpen) return null;

  const countDisplay = demoCount > 0 ? demoCount : 4;

  const handleResetStateAndClose = () => {
    setConfirmChoice('none');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/65 backdrop-blur-xs p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col my-auto transition-all">
        
        {/* Compact Header Banner */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-950 text-white p-4 sm:p-5 relative">
          <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-1">
            <Box className="w-3.5 h-3.5 text-amber-400" />
            <span>Manajemen Data Simulasi</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
            Kelola Data Contoh (Demo)
          </h2>
          <p className="text-stone-300 text-xs mt-1 leading-snug">
            Atur apakah Anda ingin membersihkan 4 aset simulasi bawaan agar workspace siap untuk data riil Anda, atau menyimpannya.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 text-stone-800">

          {confirmChoice === 'none' && (
            <>
              {/* Current Status Badge */}
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center gap-3">
                <span className="p-1.5 bg-amber-100 text-amber-950 rounded-lg font-bold text-xs shrink-0">
                  🧪
                </span>
                <p className="text-xs text-amber-950 leading-snug font-medium">
                  Saat ini terdapat <strong>{countDisplay} aset contoh</strong> (MacBook, Vario, AC, Kamera) di ruang kerja Anda.
                </p>
              </div>

              {/* Mobile-first Options */}
              <div className="space-y-2.5">
                
                {/* Option 1: Clean Start */}
                <button
                  type="button"
                  onClick={() => setConfirmChoice('clean')}
                  className="w-full text-left p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-stone-900 text-xs sm:text-sm">
                        1. Hapus Semua Data Contoh
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-700 text-white text-[10px] font-extrabold rounded-full">
                        Rekomendasi
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-stone-600 leading-snug">
                      Bersihkan sampel bawaan agar workspace siap untuk Anda input aset asli.
                    </p>
                  </div>
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 group-hover:bg-emerald-200">
                    <Trash2 className="w-4 h-4" />
                  </div>
                </button>

                {/* Option 2: Keep Demo */}
                <button
                  type="button"
                  onClick={() => setConfirmChoice('keep')}
                  className="w-full text-left p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-stone-900 text-xs sm:text-sm block">
                      2. Pertahankan Data Contoh
                    </span>
                    <p className="text-[11px] sm:text-xs text-stone-500 leading-snug">
                      Simpan {countDisplay} aset contoh sebagai gambaran/referensi data di aplikasi.
                    </p>
                  </div>
                  <div className="p-2 bg-stone-100 text-stone-600 rounded-xl shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </button>

              </div>
            </>
          )}

          {/* Confirmation Step for Clean Start */}
          {confirmChoice === 'clean' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3.5 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-extrabold text-rose-950 text-xs sm:text-sm">
                    Konfirmasi Hapus Data Contoh
                  </h4>
                  <p className="text-rose-900 leading-relaxed">
                    Apakah Anda yakin ingin menghapus <strong>{countDisplay} aset contoh</strong>? Tindakan ini akan membersihkan data simulasi agar Anda bisa langsung menginput aset asli Anda.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmChoice('none');
                    onChooseStartFresh();
                  }}
                  className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer text-center"
                >
                  Ya, Hapus Data Contoh
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmChoice('none')}
                  className="py-2.5 px-3 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
              </div>
            </div>
          )}

          {/* Confirmation Step for Keep Demo */}
          {confirmChoice === 'keep' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3.5 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-extrabold text-emerald-950 text-xs sm:text-sm">
                    Konfirmasi Simpan Data Contoh
                  </h4>
                  <p className="text-emerald-900 leading-relaxed">
                    <strong>{countDisplay} data contoh</strong> akan dikonversi menjadi data workspace Anda. Anda dapat mengedit atau menghapusnya kapan saja di menu aset.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmChoice('none');
                    onChooseKeepDemo();
                  }}
                  className="flex-1 py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer text-center"
                >
                  Ya, Simpan Data Contoh
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmChoice('none')}
                  className="py-2.5 px-3 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
              </div>
            </div>
          )}

          {/* Security Note */}
          <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-500">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <p className="leading-snug">
              Data personal yang Anda buat manual tidak akan terpengaruh.
            </p>
          </div>

        </div>

        {/* Mobile-Friendly Footer */}
        <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={handleResetStateAndClose}
            className="px-3 py-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 active:scale-95 transition-all cursor-pointer rounded-lg hover:bg-stone-200/60"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

