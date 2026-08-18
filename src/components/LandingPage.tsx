import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Box, 
  FileText, 
  Wrench, 
  Bell, 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Cloud, 
  Smartphone, 
  Layers, 
  TrendingUp, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  ExternalLink,
  DollarSign,
  Clock,
  HardDrive
} from 'lucide-react';

interface LandingPageProps {
  onMainAction: () => void;
  isSetupCompleted: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onMainAction,
  isSetupCompleted,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-50 bg-stone-900/90 backdrop-blur-md border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-950/40 border border-emerald-400/30">
              M
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block leading-none">
                MicroMate
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-emerald-400 uppercase block mt-0.5">
                Personal Asset Vault
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-stone-300">
            <a href="#fitur" className="hover:text-emerald-400 transition-colors">Fitur Unggulan</a>
            <a href="#keunggulan" className="hover:text-emerald-400 transition-colors">Keunggulan</a>
            <a href="#cara-kerja" className="hover:text-emerald-400 transition-colors">Cara Kerja</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </nav>

          {/* Header Action CTA */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onMainAction}
              className="inline-flex items-center gap-2 px-4.5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl transition-all shadow-lg shadow-emerald-900/40 cursor-pointer border border-emerald-400/30"
            >
              <span>{isSetupCompleted ? 'Masuk ke Dashboard' : 'Mulai Aplikasi'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950">
        {/* Glow ambient effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personal Asset Manager &amp; Vault Digital</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
              Kelola &amp; Lindungi Aset Pribadi dalam <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">Satu Vault Digital</span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-stone-300 font-normal leading-relaxed max-w-2xl mx-auto">
              Platform terpadu untuk inventarisasi perangkat, kendaraan, dokumen garansi, jadwal pemeliharaan, serta biaya servis otomatis secara <strong>100% privat &amp; aman</strong>.
            </p>

            {/* CTA Buttons - Single Action Button */}
            <div className="pt-4 flex items-center justify-center">
              <button
                type="button"
                onClick={onMainAction}
                className="w-full sm:w-auto px-9 py-4 text-base font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-2xl transition-all shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2.5 cursor-pointer border border-emerald-400/30 group"
              >
                <span>{isSetupCompleted ? 'Buka Dashboard Utama' : 'Mulai Aplikasi'}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Micro Highlights */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-stone-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tanpa Biaya Langganan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>100% Data di Google Drive Anda</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Dukungan Offline-First</span>
              </div>
            </div>

          </div>

          {/* Interactive Mockup Visual Preview */}
          <div className="mt-14 max-w-5xl mx-auto bg-stone-950/80 rounded-3xl border border-stone-800 shadow-2xl p-3 sm:p-5 backdrop-blur-xl relative">
            {/* Window bar */}
            <div className="flex items-center justify-between pb-3 px-2 border-b border-stone-800/80 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="text-[11px] font-mono text-stone-300 bg-stone-900 px-3 py-1 rounded-full border border-stone-800 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>micromate.app/dashboard</span>
              </div>
              <div className="w-12 text-right text-[10px] text-stone-300 font-mono">
                PRIVAT
              </div>
            </div>

            {/* Dashboard Mockup Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Stat Card 1 */}
              <div className="bg-stone-900/90 rounded-2xl p-4 border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider block">Total Aset Aktif</span>
                  <span className="text-2xl font-black text-white mt-1 block">12 Unit</span>
                  <span className="text-[10px] text-emerald-400 font-medium mt-0.5 block">100% Terinventarisasi</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/50">
                  <Box className="w-5 h-5" />
                </div>
              </div>

              {/* Stat Card 2 */}
              <div className="bg-stone-900/90 rounded-2xl p-4 border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider block">Status Garansi</span>
                  <span className="text-2xl font-black text-amber-400 mt-1 block">2 Perlu Perhatian</span>
                  <span className="text-[10px] text-amber-300/80 font-medium mt-0.5 block">Laptop &amp; Mobil Honda</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center border border-amber-800/50">
                  <FileText className="w-5 h-5" />
                </div>
              </div>

              {/* Stat Card 3 */}
              <div className="bg-stone-900/90 rounded-2xl p-4 border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider block">Total Investasi (TCO)</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">Rp 48.500.000</span>
                  <span className="text-[10px] text-stone-300 font-medium mt-0.5 block">Termasuk Biaya Servis</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/50">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Sample Asset Cards Row */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-stone-900/70 rounded-2xl p-3.5 border border-stone-800/80 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-stone-800 flex items-center justify-center shrink-0 font-bold text-emerald-400 border border-stone-700">
                  💻
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">MacBook Pro M2</span>
                    <span className="text-[9px] font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">AST-2026-01</span>
                  </div>
                  <span className="text-[11px] text-stone-300 block truncate">Perangkat Kerja • Rp 24.500.000</span>
                  <span className="text-[10px] text-emerald-400 font-semibold block mt-1">Garansi Aktif (140 Hari lagi)</span>
                </div>
              </div>

              <div className="bg-stone-900/70 rounded-2xl p-3.5 border border-stone-800/80 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-stone-800 flex items-center justify-center shrink-0 font-bold text-amber-400 border border-stone-700">
                  🚗
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">Honda HR-V Turbo</span>
                    <span className="text-[9px] font-mono bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded border border-stone-700">B 1234 ABC</span>
                  </div>
                  <span className="text-[11px] text-stone-300 block truncate">Kendaraan • Ganti Oli + STNK</span>
                  <span className="text-[10px] text-rose-400 font-semibold block mt-1">⚠️ Servis Rutin (7 Hari Lagi)</span>
                </div>
              </div>

              <div className="hidden lg:flex bg-stone-900/70 rounded-2xl p-3.5 border border-stone-800/80 items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-stone-800 flex items-center justify-center shrink-0 font-bold text-emerald-400 border border-stone-700">
                  📷
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">Sony A7 IV Mirrorless</span>
                    <span className="text-[9px] font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">AST-2026-09</span>
                  </div>
                  <span className="text-[11px] text-stone-300 block truncate">Elektronik • Rp 38.000.000</span>
                  <span className="text-[10px] text-emerald-400 font-semibold block mt-1">Tersimpan di Studio</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section Fitur Unggulan */}
      <section id="fitur" className="py-20 bg-stone-950 border-t border-stone-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              Fitur Lengkap
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Segala yang Anda Butuhkan untuk Mengelola Aset
            </h2>
            <p className="text-sm sm:text-base text-stone-300">
              Dirancang khusus untuk membantu Anda mencatat, merawat, dan memantau status aset secara terstruktur tanpa kerumitan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-stone-900/80 rounded-2xl p-6 border border-stone-800 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60 mb-5 group-hover:scale-110 transition-transform">
                <Box className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Katalog Aset Digital</h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Catat spesifikasi lengkap, merk, tipe, nomor seri, lokasi penyimpanan, hingga tanggal dan harga pembelian aset Anda.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-stone-900/80 rounded-2xl p-6 border border-stone-800 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60 mb-5 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Manajemen Garansi &amp; Dokumen</h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Simpan foto kuitansi, kartu garansi, sertifikat, dan STNK langsung ke cloud. Dapatkan notifikasi sebelum masa berlaku habis.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-stone-900/80 rounded-2xl p-6 border border-stone-800 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60 mb-5 group-hover:scale-110 transition-transform">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Riwayat Servis &amp; Total Cost (TCO)</h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Rekam setiap perbaikan, perantian suku cadang, dan biaya pemeliharaan untuk mengetahui total nilai investasi aset secara transparan.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-stone-900/80 rounded-2xl p-6 border border-stone-800 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60 mb-5 group-hover:scale-110 transition-transform">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Reminder &amp; Pengingat Otomatis</h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Atur jadwal pengingat ganti oli, servis berkala, perpanjangan pajak kendaraan, hingga pembaruan langganan perangkat.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-stone-900/80 rounded-2xl p-6 border border-stone-800 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60 mb-5 group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Sinkronisasi Google Drive &amp; Sheets</h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Data dan foto aset disimpan secara otomatis di Google Drive &amp; Google Sheets milik Anda sendiri melalui integrasi Apps Script aman.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-stone-900/80 rounded-2xl p-6 border border-stone-800 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60 mb-5 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Akses Cepat Offline-First</h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Aplikasi tetap dapat dibuka dan digunakan meskipun tanpa koneksi internet. Data lokal akan otomatis disinkronkan saat terhubung kembali.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Section Keunggulan & Perbedaan dengan Aplikasi Lain */}
      <section id="keunggulan" className="py-20 bg-stone-900 border-t border-stone-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              Mengapa Memilih MicroMate
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Beda dengan Aplikasi Manajemen Aset Lainnya
            </h2>
            <p className="text-sm sm:text-base text-stone-300">
              Kami memprioritaskan privasi penuh dan kemudahan tanpa mengikat Anda pada server pihak ketiga.
            </p>
          </div>

          {/* Comparison Table / Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            
            {/* MicroMate Advantage Card */}
            <div className="bg-gradient-to-b from-emerald-950/60 to-stone-950 rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/50 shadow-2xl relative flex flex-col justify-between">
              <div className="absolute top-4 right-4 bg-emerald-500 text-stone-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                Rekomendasi Utama
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-stone-950 flex items-center justify-center font-black text-lg">
                    M
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">MicroMate Vault</h3>
                    <span className="text-xs text-emerald-400 font-semibold">100% Kepemilikan Data Privat</span>
                  </div>
                </div>

                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-stone-200">
                      <strong className="text-white block font-bold">Data &amp; Berkas di Cloud Sendiri:</strong>
                      Tersimpan di Google Drive &amp; Google Sheets pribadi Anda. Tidak ada risiko kebocoran data dari server terpusat.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-stone-200">
                      <strong className="text-white block font-bold">Bebas Biaya Langganan Bulanan:</strong>
                      Gratis digunakan tanpa fitur yang dikunci di balik skema bayar bulanan tersembunyi.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-stone-200">
                      <strong className="text-white block font-bold">Dukungan Offline Penuh:</strong>
                      Bisa memasukkan data kapan saja saat offline. Data langsung tersimpan di browser (IndexedDB).
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-stone-200">
                      <strong className="text-white block font-bold">Format Spreadsheet Standar:</strong>
                      Data tersimpan dalam spreadsheet terbuka yang bisa dibaca, dicetak, atau diekspor kapan saja tanpa terkunci platform.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-emerald-900/50">
                <button
                  type="button"
                  onClick={onMainAction}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isSetupCompleted ? 'Masuk ke Dashboard' : 'Mulai Aplikasi'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Other Conventional Apps Card */}
            <div className="bg-stone-950/80 rounded-3xl p-6 sm:p-8 border border-stone-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-stone-800 text-stone-400 flex items-center justify-center font-bold text-base">
                    ?
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-stone-300">Aplikasi Sejenis Konvensional</h3>
                    <span className="text-xs text-stone-300 font-medium">Sistem Cloud Terpusat Pihak Ketiga</span>
                  </div>
                </div>

                <ul className="space-y-4 text-stone-300">
                  <li className="flex items-start gap-3">
                    <span className="text-stone-300 font-bold shrink-0 mt-0.5">✕</span>
                    <span className="text-xs sm:text-sm text-stone-300">
                      <strong className="text-stone-300 block font-semibold">Tersimpan di Server Luar:</strong>
                      Data dan foto dokumen penting disimpan di server perusahaan lain yang rentan peretasan atau perubahan kebijakan privasi.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-stone-300 font-bold shrink-0 mt-0.5">✕</span>
                    <span className="text-xs sm:text-sm text-stone-300">
                      <strong className="text-stone-300 block font-semibold">Skema Biaya Berlangganan:</strong>
                      Sering meminta biaya bulanan/tahunan berulang untuk membuka batasan jumlah aset atau fitur lampiran berkas.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-stone-300 font-bold shrink-0 mt-0.5">✕</span>
                    <span className="text-xs sm:text-sm text-stone-300">
                      <strong className="text-stone-300 block font-semibold">Ketergantungan Internet:</strong>
                      Aplikasi sering kali lambat atau tidak bisa dibuka jika sinyal internet terputus.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-stone-300 font-bold shrink-0 mt-0.5">✕</span>
                    <span className="text-xs sm:text-sm text-stone-300">
                      <strong className="text-stone-300 block font-semibold">Format Terkunci (Vendor Lock-in):</strong>
                      Sulit memindahkan data ke aplikasi lain jika suatu saat Anda ingin berpindah sistem.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-stone-800 text-center">
                <span className="text-[11px] text-stone-300 font-medium italic">
                  Pilihlah keamanan dan kepemilikan data 100% untuk aset berharga Anda.
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Section Cara Kerja (3 Langkah) */}
      <section id="cara-kerja" className="py-20 bg-stone-950 border-t border-stone-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              Alur Penggunaan
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              3 Langkah Mudah Memulai
            </h2>
            <p className="text-sm sm:text-base text-stone-300">
              Hanya butuh waktu sekitar 5 menit untuk menyiapkan vault aset pribadi Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="bg-stone-900/90 rounded-2xl p-6 border border-stone-800 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-4 shadow-md">
                01
              </div>
              <h3 className="text-base font-bold text-white mb-2">Lakukan Setup Awal</h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Hubungkan Google Drive pribadi Anda dengan wizard panduan cepat kami, atau pilih mode lokal tanpa akun jika ingin mencoba langsung.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-stone-900/90 rounded-2xl p-6 border border-stone-800 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-4 shadow-md">
                02
              </div>
              <h3 className="text-base font-bold text-white mb-2">Daftarkan Aset &amp; Dokumen</h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Foto perangkat atau kendaraan Anda, masukkan nomor seri, harga pembelian, serta upload nota atau kartu garansi secara rapi.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-stone-900/90 rounded-2xl p-6 border border-stone-800 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-4 shadow-md">
                03
              </div>
              <h3 className="text-base font-bold text-white mb-2">Pantau &amp; Terima Reminder</h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Nikmati ringkasan dasbor terpadu. Sistem akan mengingatkan Anda otomatis sebelum garansi habis atau waktu servis tiba.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Section FAQ */}
      <section id="faq" className="py-20 bg-stone-900 border-t border-stone-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              Pertanyaan Umum
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Apakah data aset saya disimpan di server pihak ketiga?',
                a: 'Tidak. Seluruh data aset dan berkas lampiran Anda disimpan langsung di akun Google Drive / Google Sheets milik Anda sendiri melalui Apps Script, serta tersimpan di IndexedDB lokal browser Anda.'
              },
              {
                q: 'Apakah saya bisa menggunakan MicroMate tanpa internet (offline)?',
                a: 'Ya! MicroMate dirancang dengan prinsip Offline-First. Anda bisa membuka aplikasi, melihat aset, dan menambahkan data baru meskipun sedang offline. Sinkronisasi ke Google Drive akan berjalan otomatis saat koneksi terhubung.'
              },
              {
                q: 'Apakah ada biaya berlangganan bulanan?',
                a: 'Sama sekali tidak ada. MicroMate adalah platform manajemen aset pribadi yang bisa Anda gunakan secara bebas tanpa biaya berlangganan berulang.'
              },
              {
                q: 'Bagaimana jika saya ingin mengunci aplikasi agar tidak dibuka orang lain?',
                a: 'MicroMate dilengkapi dengan fitur Kunci PIN Aplikasi di menu Pengaturan. Anda dapat mengatur 4-digit PIN keamanan lokal untuk melindungi akses visual ke dasbor Anda.'
              },
              {
                q: 'Apa yang terjadi jika saya mengganti HP atau komputer?',
                a: 'Cukup buka website ini di perangkat baru dan hubungkan URL Apps Script Google Drive Anda yang sudah disiapkan sebelumnya. Semua data aset dan dokumen akan di-hydrate otomatis.'
              }
            ].map((faq, idx) => (
              <div 
                key={idx}
                className="bg-stone-950/80 rounded-2xl border border-stone-800 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between text-sm sm:text-base font-bold text-white hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {openFaqIndex === idx ? (
                    <ChevronUp className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-stone-300 shrink-0" />
                  )}
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-stone-300 leading-relaxed border-t border-stone-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 7. Bottom CTA Banner */}
      <section className="py-16 bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-950 border-t border-emerald-800/40 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Mulai Amankan &amp; Rapikan Data Aset Anda Hari Ini
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 max-w-xl mx-auto">
            Hanya butuh beberapa menit untuk menginventarisasi seluruh perangkat, kendaraan, dan dokumen garansi Anda.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onMainAction}
              className="px-8 py-4 text-sm font-extrabold text-stone-950 bg-white hover:bg-emerald-50 active:scale-95 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2.5 mx-auto cursor-pointer"
            >
              <span>{isSetupCompleted ? 'Masuk ke Dashboard' : 'Mulai Aplikasi'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="py-10 bg-stone-950 border-t border-stone-800/80 text-xs text-stone-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
              M
            </div>
            <span className="font-bold text-stone-300">MicroMate</span>
            <span className="text-stone-300">| Personal Asset Vault &amp; Manager</span>
          </div>

          <div className="text-center sm:text-right text-[11px] text-stone-300">
            &copy; {new Date().getFullYear()} MicroMate. 100% Client-Side &amp; Private Google Drive Storage.
          </div>
        </div>
      </footer>
    </div>
  );
};
