import React, { useState } from 'react';
import { APPS_SCRIPT_CODE } from '../lib/appsScriptCode';
import { 
  BookOpen, 
  Check, 
  Copy, 
  Database, 
  FileText, 
  HardDrive, 
  Wrench, 
  PieChart, 
  Plus, 
  Code2, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Sparkles,
  UserCheck,
  Shield,
  HelpCircle,
  Download,
  UploadCloud,
  FileCheck2,
  FolderTree,
  Terminal,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface DocumentationPageProps {
  onOpenSettings: () => void;
  onQuickAddAsset: () => void;
}

export const DocumentationPage: React.FC<DocumentationPageProps> = ({
  onOpenSettings,
  onQuickAddAsset,
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [docTab, setDocTab] = useState<'user' | 'system'>('user');

  // Expanded sections state for User Guide (Exclusive Accordion - section 1 open by default)
  const [expandedUserSections, setExpandedUserSections] = useState<Record<number, boolean>>({
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  });

  // Expanded sections state for System Tab (Exclusive Accordion - architecture open by default)
  const [expandedSysSections, setExpandedSysSections] = useState<Record<string, boolean>>({
    arch: true,
    code: false,
    folder: false,
  });

  const toggleUserSection = (sectionId: number) => {
    setExpandedUserSections(prev => {
      const isCurrentlyOpen = !!prev[sectionId];
      // Exclusive Accordion: opening one collapses other user guide sections
      return {
        1: sectionId === 1 ? !isCurrentlyOpen : false,
        2: sectionId === 2 ? !isCurrentlyOpen : false,
        3: sectionId === 3 ? !isCurrentlyOpen : false,
        4: sectionId === 4 ? !isCurrentlyOpen : false,
        5: sectionId === 5 ? !isCurrentlyOpen : false,
        6: sectionId === 6 ? !isCurrentlyOpen : false,
      };
    });
  };

  const toggleSysSection = (sectionKey: string) => {
    setExpandedSysSections(prev => {
      const isCurrentlyOpen = !!prev[sectionKey];
      // Exclusive Accordion: opening one collapses other system documentation sections
      return {
        arch: sectionKey === 'arch' ? !isCurrentlyOpen : false,
        code: sectionKey === 'code' ? !isCurrentlyOpen : false,
        folder: sectionKey === 'folder' ? !isCurrentlyOpen : false,
      };
    });
  };

  const areAllUserExpanded = Object.values(expandedUserSections).every(Boolean);
  const toggleAllUser = () => {
    const nextVal = !areAllUserExpanded;
    setExpandedUserSections({
      1: nextVal,
      2: nextVal,
      3: nextVal,
      4: nextVal,
      5: nextVal,
      6: nextVal,
    });
  };

  const areAllSysExpanded = Object.values(expandedSysSections).every(Boolean);
  const toggleAllSys = () => {
    const nextVal = !areAllSysExpanded;
    setExpandedSysSections({
      arch: nextVal,
      code: nextVal,
      folder: nextVal,
    });
  };

  const appsScriptCode = APPS_SCRIPT_CODE;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="space-y-6 w-full pb-12">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white rounded-3xl shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-emerald-200 border border-white/15">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Pusat Informasi & Dokumen MicroMate</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Panduan & Dokumentasi Sistem
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Panduan lengkap penggunaan aplikasi MicroMate bagi pengguna harian serta dokumentasi arsitektur sistem dan skrip Google Apps Script untuk pengembang.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onQuickAddAsset}
              className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Registrasi Aset Baru</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-4 py-2 bg-emerald-700/60 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 border border-white/20 cursor-pointer transition-all"
            >
              <Settings className="w-4 h-4" />
              <span>Pengaturan Sync API Gateway</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Selector & Expand/Collapse All Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1.5 bg-stone-100/90 rounded-2xl border border-stone-200 w-fit">
          <button
            type="button"
            onClick={() => setDocTab('user')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              docTab === 'user'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>📘 Panduan Penggunaan (User Guide)</span>
          </button>

          <button
            type="button"
            onClick={() => setDocTab('system')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              docTab === 'system'
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>⚙️ Dokumentasi Sistem & Developer</span>
          </button>
        </div>

        {/* Global Expand / Collapse All Toggle Button */}
        <button
          type="button"
          onClick={docTab === 'user' ? toggleAllUser : toggleAllSys}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer active:scale-95 self-start sm:self-auto"
        >
          {(docTab === 'user' ? areAllUserExpanded : areAllSysExpanded) ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-stone-600" />
              <span>Tutup Semua (Collapse All)</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Buka Semua (Expand All)</span>
            </>
          )}
        </button>
      </div>

      {/* TAB 1: USER GUIDE */}
      {docTab === 'user' && (
        <div className="space-y-4">
          
          {/* 1. Quick Start */}
          <section className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleUserSection(1)}
              className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-stone-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                  1
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 truncate">Cara Tambah Aset Baru (&lt; 60 Detik)</h2>
                  <p className="text-xs text-stone-500 truncate">Alur pengisian cepat untuk mendaftarkan aset baru</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-stone-500 hidden sm:inline">
                  {expandedUserSections[1] ? 'Sembunyikan' : 'Buka'}
                </span>
                <div className="p-1 rounded-lg bg-stone-100 text-stone-700">
                  {expandedUserSections[1] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {expandedUserSections[1] && (
              <div className="px-5 pb-6 sm:px-6 space-y-4 pt-1 border-t border-stone-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                    <span className="font-bold text-emerald-800 block text-sm">Langkah 1: Informasi Utama</span>
                    <p className="text-stone-600 leading-relaxed">
                      Isikan Nama Aset, Kategori (Elektronik, Kendaraan, Rumah, Hobi), Merk, serta Serial Number (S/N) jika tersedia.
                    </p>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                    <span className="font-bold text-emerald-800 block text-sm">Langkah 2: Garansi & Pajak</span>
                    <p className="text-stone-600 leading-relaxed">
                      Pilih durasi garansi (misal 1 tahun AppleCare / iBox) atau tanggal berakhir manual. Untuk kendaraan, masukkan tanggal pajak STNK tahunan.
                    </p>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                    <span className="font-bold text-emerald-800 block text-sm">Langkah 3: Foto & Invoice</span>
                    <p className="text-stone-600 leading-relaxed">
                      Upload foto aset dan nota/bukti pembelian. File otomatis tersimpan di Vault lokal dan diunggah ke Google Drive bila terhubung.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 2. Document Vault & Service */}
          <section className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleUserSection(2)}
              className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-stone-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                  2
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 truncate">Document Vault & Catatan Servis</h2>
                  <p className="text-xs text-stone-500 truncate">Pengelolaan invoice, garansi, dan kalkulasi Total Cost of Ownership (TCO)</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-stone-500 hidden sm:inline">
                  {expandedUserSections[2] ? 'Sembunyikan' : 'Buka'}
                </span>
                <div className="p-1 rounded-lg bg-stone-100 text-stone-700">
                  {expandedUserSections[2] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {expandedUserSections[2] && (
              <div className="px-5 pb-6 sm:px-6 space-y-3 text-xs text-stone-600 pt-1 border-t border-stone-100">
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2">
                  <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-700" />
                    <span>Document Vault & Google Drive Gateway</span>
                  </h3>
                  <p className="leading-relaxed">
                    Setiap aset memiliki folder khusus di Document Vault. Saat Anda mengunggah file nota pembelian atau foto aset, MicroMate akan menyimpan salinan resolusi penuh secara offline dan mengirimkannya ke Google Drive personal Anda dalam folder yang terorganisir:
                    <code className="block mt-1 p-2 bg-white rounded-lg border border-stone-200 text-[11px] font-mono text-stone-800">
                      MicroMate / Assets / AST-2026-000124 / [Photos | Documents]
                    </code>
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-emerald-700" />
                    <span>Riwayat Servis & Perhitungan TCO</span>
                  </h3>
                  <p className="leading-relaxed">
                    Catat setiap pergantian oli, perawatan berkala AC, atau perbaikan sparepart. MicroMate secara otomatis menghitung <strong>Total Cost of Ownership (TCO)</strong> = <em>(Harga Beli + Total Biaya Perawatan + Aksesori)</em> untuk memberi Anda gambaran utuh biaya kepemilikan aset.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* 3. Auto 2-Way Sync & Reconciliation */}
          <section className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleUserSection(3)}
              className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-stone-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                  3
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 truncate">Otomatisasi Synchronisasi 2-Arah (Auto 2-Way Sync)</h2>
                  <p className="text-xs text-stone-500 truncate">Pembaruan data instan antara IndexedDB Lokal & Google Sheets</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-stone-500 hidden sm:inline">
                  {expandedUserSections[3] ? 'Sembunyikan' : 'Buka'}
                </span>
                <div className="p-1 rounded-lg bg-stone-100 text-stone-700">
                  {expandedUserSections[3] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {expandedUserSections[3] && (
              <div className="px-5 pb-6 sm:px-6 pt-1 border-t border-stone-100">
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2 text-xs text-stone-700 leading-relaxed">
                  <p className="font-semibold text-stone-900">
                    🔄 Prinsip <strong>"Last Known State + Pending Changes"</strong>:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-stone-600">
                    <li><strong>Instant Rendering:</strong> Aplikasi memuat data lokal dari IndexedDB secara instan sehingga pengguna tidak perlu menunggu koneksi jaringan.</li>
                    <li><strong>Auto Sync Triggers:</strong> Sinkronisasi 2-arah berjalan di latar belakang otomatis saat aplikasi dibuka, browser di-refresh, tab kembali aktif, atau internet terhubung kembali.</li>
                    <li><strong>Reconciliation Engine:</strong> MicroMate membandingkan status lokal dan cloud secara otomatis untuk mendeteksi penambahan, pembaruan, dan penghapusan record tanpa risiko kehilangan data.</li>
                  </ul>
                </div>
              </div>
            )}
          </section>

          {/* 4. Click-to-Preview Image Lightbox & Zoom */}
          <section className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleUserSection(4)}
              className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-stone-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                  4
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 truncate">Pratinjau Foto & Dokumen (Click-to-Preview & Zoom)</h2>
                  <p className="text-xs text-stone-500 truncate">Melihat nomor seri (S/N), invoice, dan detail fisik aset secara langsung</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-stone-500 hidden sm:inline">
                  {expandedUserSections[4] ? 'Sembunyikan' : 'Buka'}
                </span>
                <div className="p-1 rounded-lg bg-stone-100 text-stone-700">
                  {expandedUserSections[4] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {expandedUserSections[4] && (
              <div className="px-5 pb-6 sm:px-6 pt-1 border-t border-stone-100">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs text-stone-600 leading-relaxed">
                  <p>
                    Klik pada foto aset atau tombol <strong>Preview</strong> pada lampiran dokumen untuk membuka modal Lightbox interaktif.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
                      <span className="font-bold text-emerald-800 block">🔍 Zoom & Drag/Pan</span>
                      <p>Gunakan tombol Zoom (+/-), scroll mouse, atau pintasan keyboard untuk memperbesar detail hingga 400% dan geser posisi foto.</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
                      <span className="font-bold text-emerald-800 block">🖼️ Galeri Multi-Media</span>
                      <p>Navigasi antarfoto dan dokumen dengan mudah menggunakan thumbnail di bagian bawah atau tombol panah keyboard (← / →).</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 5. Account Dependency Tracker */}
          <section className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleUserSection(5)}
              className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-stone-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                  5
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 truncate">Pelacak Keterikatan Akun (Account Dependency Tracker)</h2>
                  <p className="text-xs text-stone-500 truncate">Pelacakan keterikatan nomor SIM / HP ke akun digital tanpa menyimpan password</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-stone-500 hidden sm:inline">
                  {expandedUserSections[5] ? 'Sembunyikan' : 'Buka'}
                </span>
                <div className="p-1 rounded-lg bg-stone-100 text-stone-700">
                  {expandedUserSections[5] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {expandedUserSections[5] && (
              <div className="px-5 pb-6 sm:px-6 pt-1 border-t border-stone-100">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs text-stone-600 leading-relaxed">
                  <p>
                    MicroMate sengaja <strong>TIDAK berfungsi sebagai Password Manager</strong> untuk menjaga privasi dan keamanan tingkat tinggi. Sebagai gantinya, MicroMate menyediakan <strong>Account Dependency Tracker</strong>.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
                      <span className="font-bold text-emerald-800 block">📱 Mitigasi Kehilangan SIM / HP</span>
                      <p>Mencatat daftar layanan seperti WhatsApp, Tokopedia, Shopee, M-Banking, dan Email yang terikat pada nomor HP tersebut.</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
                      <span className="font-bold text-emerald-800 block">🔒 Tanpa Password & Kredensial</span>
                      <p>Hanya nama aplikasi/layanan yang dicatat. Tanpa password, PIN, atau kredensial sensitif sehingga aman jika diakses pihak lain.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 6. Security Architecture & App PIN Lock */}
          <section className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleUserSection(6)}
              className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-stone-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                  6
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 truncate">Arsitektur Penyimpanan Personal & Keamanan App PIN</h2>
                  <p className="text-xs text-stone-500 truncate">Google Storage milik pengguna sendiri + Pengunci Aplikasi Lokal</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-stone-500 hidden sm:inline">
                  {expandedUserSections[6] ? 'Sembunyikan' : 'Buka'}
                </span>
                <div className="p-1 rounded-lg bg-stone-100 text-stone-700">
                  {expandedUserSections[6] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {expandedUserSections[6] && (
              <div className="px-5 pb-6 sm:px-6 space-y-3 text-xs text-stone-600 pt-1 border-t border-stone-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
                    <span className="font-bold text-emerald-800 block">☁️ Personal Storage Gateway (Zero SaaS)</span>
                    <p>MicroMate terhubung langsung ke Google Sheets &amp; Drive pribadi pengguna melalui Apps Script. Tanpa registrasi akun SaaS, tanpa ketergantungan pada server pihak ketiga.</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
                    <span className="font-bold text-emerald-800 block">🔒 App PIN Lock (4-Digit)</span>
                    <p>Kunci aplikasi lokal untuk menjaga privasi data aset saat HP/laptop dipinjamkan. Tersimpan dengan aman di penyimpanan lokal peramban.</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-1 sm:col-span-2">
                    <span className="font-bold text-emerald-800 block">🛡️ Email Ownership Verification (Kode OTP)</span>
                    <p>Saat menghubungkan Apps Script URL, sistem secara otomatis mendeteksi pemilik akun Google (Session.getEffectiveUser) dan mengirimkan 6-digit OTP melalui MailApp. Email disamarkan di UI (mis. u••••@gmail.com) demi privasi.</p>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500 italic">
                  * Catatan Keamanan: Otorisasi Google Account Anda adalah benteng utama. Apps Script berjalan atas nama Anda (Execute as: Me) untuk mengakses Google Sheets &amp; Drive pribadi secara langsung.
                </p>
              </div>
            )}
          </section>

        </div>
      )}

      {/* TAB 2: SYSTEM ARCHITECTURE & DEVELOPER DOCS */}
      {docTab === 'system' && (
        <div className="space-y-4">
          
          {/* Architecture Overview */}
          <section className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSysSection('arch')}
              className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-stone-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                  <Database className="w-5 h-5 text-emerald-800" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 truncate">Cetak Biru Arsitektur System</h2>
                  <p className="text-xs text-stone-500 truncate">Offline-First Client Engine + Google Apps Script Web App API Gateway</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-stone-500 hidden sm:inline">
                  {expandedSysSections.arch ? 'Sembunyikan' : 'Buka'}
                </span>
                <div className="p-1 rounded-lg bg-stone-100 text-stone-700">
                  {expandedSysSections.arch ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {expandedSysSections.arch && (
              <div className="px-5 pb-6 sm:px-6 pt-1 border-t border-stone-100">
                <div className="p-4 bg-stone-900 text-stone-100 rounded-2xl font-mono text-xs space-y-3 overflow-x-auto">
                  <span className="text-[11px] text-emerald-400 font-bold block">// DIAGRAM INTEGRASI CLOUD GATEWAY</span>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-[11px]">
                    <div className="p-3 bg-stone-800 border border-stone-700 rounded-xl text-center w-full md:w-auto">
                      📱 Frontend MicroMate
                      <div className="text-[10px] text-stone-400">React + IndexedDB Storage</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400 hidden md:block" />
                    <div className="p-3 bg-emerald-950 border border-emerald-700/80 text-emerald-300 rounded-xl text-center w-full md:w-auto">
                      ⚙️ Google Apps Script
                      <div className="text-[10px] text-emerald-400/80">API Gateway Web App</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400 hidden md:block" />
                    <div className="flex flex-col gap-1.5 w-full md:w-auto">
                      <div className="p-2 bg-stone-800 border border-stone-700 rounded-lg text-center text-[10px]">
                        📂 Google Drive (Foto & Nota)
                      </div>
                      <div className="p-2 bg-stone-800 border border-stone-700 rounded-lg text-center text-[10px]">
                        📊 Google Sheets (Database Metadata)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Apps Script Code Box */}
          <section className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden transition-all">
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100">
              <button
                type="button"
                onClick={() => toggleSysSection('code')}
                className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity cursor-pointer min-w-0 flex-1"
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                  <Code2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 truncate">Kode Google Apps Script Gateway</h2>
                  <p className="text-xs text-stone-500 truncate">Salin kode dan deploy ke Google Sheets Web App</p>
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs"
                >
                  {copiedScript ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'Kode Tersalin!' : 'Salin Kode'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleSysSection('code')}
                  className="p-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
                  title={expandedSysSections.code ? 'Tutup Kode' : 'Buka Kode'}
                >
                  {expandedSysSections.code ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {expandedSysSections.code && (
              <div className="p-5 sm:p-6 space-y-3">
                <p className="text-xs text-stone-600">
                  Buat Google Sheet baru di <a href="https://sheet.new" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">sheet.new</a>, buka menu <i>Extensions &gt; Apps Script</i>, salin kode di bawah, lalu Deploy sebagai Web App (Access: Anyone).
                </p>
                <div className="relative">
                  <pre className="p-4 bg-stone-950 text-stone-200 text-xs font-mono rounded-2xl overflow-x-auto max-h-96 border border-stone-800 leading-relaxed scrollbar-thin">
                    <code>{appsScriptCode}</code>
                  </pre>
                </div>
              </div>
            )}
          </section>

          {/* Folder Hierarchy Specification */}
          <section className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSysSection('folder')}
              className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-stone-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                  <FolderTree className="w-5 h-5 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 truncate">Spesifikasi Struktur Folder Google Drive</h2>
                  <p className="text-xs text-stone-500 truncate">Hierarki penyimpanan folder cloud</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-stone-500 hidden sm:inline">
                  {expandedSysSections.folder ? 'Sembunyikan' : 'Buka'}
                </span>
                <div className="p-1 rounded-lg bg-stone-100 text-stone-700">
                  {expandedSysSections.folder ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {expandedSysSections.folder && (
              <div className="px-5 pb-6 sm:px-6 pt-1 border-t border-stone-100">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 font-mono text-xs space-y-2 text-stone-800">
                  <div>📁 MicroMate /</div>
                  <div className="pl-4">└── 📁 Assets /</div>
                  <div className="pl-8">└── 📁 AST-2026-000124 /</div>
                  <div className="pl-12">├── 📁 Photos / (Foto fisik produk, tampak depan, serial number)</div>
                  <div className="pl-12">└── 📁 Documents / (Invoice nota pembelian, kartu garansi, STNK)</div>
                </div>
              </div>
            )}
          </section>

        </div>
      )}

    </div>
  );
};

