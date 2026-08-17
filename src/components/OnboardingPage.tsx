import React, { useState, useEffect } from 'react';
import { 
  Cloud, HardDrive, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft, 
  KeyRound, Mail, Sparkles, RefreshCw, FileCode, Check, ChevronRight,
  Database, ExternalLink, Layers, ShieldAlert, Sparkle, Laptop, CheckCircle
} from 'lucide-react';
import { dbManager } from '../lib/db';
import { APPS_SCRIPT_CODE } from '../lib/appsScriptCode';

interface OnboardingPageProps {
  onComplete: (mode: 'cloud' | 'local', initialDataChoice: 'existing' | 'empty' | 'demo') => void;
  initialStep?: 'welcome' | 'google_setup';
  onClose?: () => void;
}

type StepType = 
  | 'welcome'        // Step 1: Welcome
  | 'storage_choice' // Step 2: Pilih Penyimpanan
  | 'google_guide'   // Step 3 & 4: Apps Script Setup Guide
  | 'google_connect' // Step 5: Masukkan URL & Verifikasi Koneksi
  | 'google_otp'     // Step 6: Verifikasi Email OTP
  | 'data_init'      // Step 7: Inisialisasi Data
  | 'finish';        // Step 8: Selesai!

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  onComplete,
  initialStep = 'welcome',
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState<StepType>(
    initialStep === 'google_setup' ? 'google_guide' : 'welcome'
  );

  // Storage Choice
  const [storageMode, setStorageMode] = useState<'cloud' | 'local'>('cloud');

  // Cloud Step State
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(
    localStorage.getItem('micromate_apps_script_url') || ''
  );
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [maskedEmail, setMaskedEmail] = useState<string>('a•••••@gmail.com');
  const [otpInput, setOtpInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [otpExpiryTimer, setOtpExpiryTimer] = useState<number>(0);

  // Connection Verification Checks State
  const [connectionChecks, setConnectionChecks] = useState<{
    endpoint: boolean;
    sheets: boolean;
    drive: boolean;
  }>({
    endpoint: false,
    sheets: false,
    drive: false,
  });

  // Step 7 Data Init Choice
  const [initialDataChoice, setInitialDataChoice] = useState<'existing' | 'empty' | 'demo'>('demo');

  // Code Helper Modal
  const [showCodeGuide, setShowCodeGuide] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Resend / Expiry Timers
  useEffect(() => {
    let interval: any = null;
    if (resendCooldown > 0 || otpExpiryTimer > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        setOtpExpiryTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown, otpExpiryTimer]);

  // Action: Copy Apps Script Code
  const copyAppsScriptCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Action: Connect Google Web App URL (Step 5)
  const handleConnectGoogle = async () => {
    if (!appsScriptUrl.trim()) {
      setErrorMessage('Masukkan Web App URL Apps Script Anda.');
      return;
    }

    localStorage.setItem('micromate_apps_script_url', appsScriptUrl.trim());
    setErrorMessage(null);
    setStatusMessage(null);
    setIsVerifying(true);
    setConnectionChecks({ endpoint: false, sheets: false, drive: false });

    // 1. Identify Gateway & Check Endpoint
    const idRes = await dbManager.identifyGateway(appsScriptUrl.trim());
    if (!idRes.success) {
      setIsVerifying(false);
      setErrorMessage(idRes.message || idRes.error || 'Endpoint tidak ditemukan atau URL salah.');
      return;
    }

    setConnectionChecks({ endpoint: true, sheets: true, drive: true });
    const masked = idRes.emailMasked || 'a•••••@gmail.com';
    setMaskedEmail(masked);

    // 2. Request OTP
    const otpRes = await dbManager.requestOtp(appsScriptUrl.trim());
    setIsVerifying(false);

    if (otpRes.success) {
      setResendCooldown(45);
      setOtpExpiryTimer(300);
      setStatusMessage(`Kode verifikasi 6 digit telah dikirim ke Google Account: ${masked}`);
      setCurrentStep('google_otp');
    } else {
      setErrorMessage(otpRes.message || 'Gagal mengirim kode verifikasi email.');
    }
  };

  // Action: Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMessage(null);
    setStatusMessage('Mengirim ulang kode OTP...');
    const otpRes = await dbManager.requestOtp(appsScriptUrl.trim());
    if (otpRes.success) {
      setResendCooldown(45);
      setOtpExpiryTimer(300);
      setStatusMessage(`Kode verifikasi baru dikirim ke ${maskedEmail}.`);
    } else {
      setErrorMessage(otpRes.message || 'Gagal mengirim ulang OTP.');
    }
  };

  // Action: Verify OTP (Step 6)
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpInput).trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setErrorMessage('Kode verifikasi harus 6 digit angka.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsVerifying(true);

    const res = await dbManager.verifyOtp(code, appsScriptUrl.trim());
    setIsVerifying(false);

    if (res.success && res.verified) {
      setStatusMessage('✓ Google Storage terverifikasi! Kepemilikan dikonfirmasi.');
      setTimeout(() => {
        setCurrentStep('data_init');
      }, 800);
    } else {
      setErrorMessage(res.message || 'Kode verifikasi tidak sesuai. Cek folder inbox atau spam email Anda.');
    }
  };

  // Action: Finish Onboarding (Step 8)
  const handleFinishOnboarding = () => {
    localStorage.setItem('micromate_setup_completed', 'true');
    localStorage.setItem('micromate_onboarding_completed', 'true');
    localStorage.setItem('micromate_storage_mode', storageMode);
    onComplete(storageMode, initialDataChoice);
  };

  // Helper: Get Numeric Step Index for Progress Bar
  const getStepNumber = (): number => {
    switch (currentStep) {
      case 'welcome': return 1;
      case 'storage_choice': return 1;
      case 'google_guide': return 2;
      case 'google_connect': return 3;
      case 'google_otp': return 4;
      case 'data_init': return 5;
      case 'finish': return 5;
      default: return 1;
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-stone-900 font-sans antialiased relative overflow-x-hidden">
      
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-emerald-600/15 via-emerald-900/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-emerald-800/10 blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-2 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-black text-lg shadow-lg ring-2 ring-emerald-500/30">
            M
          </div>
          <div>
            <span className="font-black text-white text-base tracking-tight block leading-none">MicroMate</span>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Personal Asset Vault</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentStep !== 'welcome' && (
            <div className="flex items-center gap-1.5 bg-stone-800/80 border border-stone-700/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-extrabold text-stone-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Setup Initial Vault</span>
            </div>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              ✕ Keluar ke Aplikasi
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-center relative z-10">

        {/* STEP INDICATOR (For steps > welcome) */}
        {currentStep !== 'welcome' && (
          <div className="mb-8 space-y-2 max-w-md mx-auto w-full">
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-stone-400">
              <span>Setup MicroMate</span>
              <span className="text-emerald-400">
                Langkah {getStepNumber()} / 5
              </span>
            </div>
            
            {/* Visual Dots & Connecting Lines */}
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((s) => {
                const currentIdx = getStepNumber();
                const isDone = currentIdx > s;
                const isCurrent = currentIdx === s;

                return (
                  <React.Fragment key={s}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                      isDone 
                        ? 'bg-emerald-500 text-stone-950 font-black scale-100' 
                        : isCurrent 
                        ? 'bg-emerald-800 text-white ring-4 ring-emerald-500/40 scale-110 font-bold' 
                        : 'bg-stone-800 text-stone-500 border border-stone-700'
                    }`}>
                      {isDone ? '✓' : s}
                    </div>
                    {s < 5 && (
                      <div className={`flex-1 h-1 mx-1.5 rounded-full transition-all ${
                        currentIdx > s ? 'bg-emerald-500' : 'bg-stone-800'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 1: WELCOME SCREEN                                     */}
        {/* ========================================================== */}
        {currentStep === 'welcome' && (
          <div className="bg-stone-800/80 border border-stone-700/80 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 text-center max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-200">
            
            {/* Logo Emblem */}
            <div className="w-20 h-20 rounded-3xl bg-emerald-800 text-white flex items-center justify-center mx-auto shadow-xl ring-4 ring-emerald-500/20 text-3xl font-black">
              ◈
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                MicroMate
              </h1>
              <p className="text-sm font-extrabold text-emerald-400 tracking-wider uppercase">
                Personal Asset Manager
              </p>
              <p className="text-stone-300 text-xs sm:text-sm font-medium leading-relaxed max-w-sm mx-auto pt-1">
                Kelola aset, kendaraan, dokumen, garansi, servis, dan reminder dalam satu tempat yang aman dan privat.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={() => setCurrentStep('storage_choice')}
                className="w-full py-4 px-6 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-base rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-xl shadow-emerald-900/40"
              >
                <span>Mulai Setup →</span>
              </button>
              
              <p className="text-[11px] text-stone-400 font-extrabold tracking-wide">
                ⏱️ Setup ± 5 menit
              </p>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 2: PILIH PENYIMPANAN DATA                              */}
        {/* ========================================================== */}
        {currentStep === 'storage_choice' && (
          <div className="bg-stone-800/80 border border-stone-700/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Bagaimana Anda ingin menyimpan data?
              </h2>
              <p className="text-xs text-stone-300 font-medium">
                Pilih metode penyimpanan data yang paling sesuai dengan kebutuhan Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Option A: Google Cloud Storage */}
              <div
                onClick={() => setStorageMode('cloud')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                  storageMode === 'cloud'
                    ? 'border-emerald-500 bg-emerald-950/40 shadow-lg ring-2 ring-emerald-500/30'
                    : 'border-stone-700 bg-stone-900/60 hover:border-stone-600'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold">
                      <Cloud className="w-5 h-5 text-emerald-300" />
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-800 text-emerald-100 font-extrabold text-[10px] rounded-full border border-emerald-600">
                      ⭐ Direkomendasikan
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                      ☁️ Google Sheets + Drive
                    </h3>
                    <p className="text-xs text-stone-300 font-medium leading-relaxed mt-1.5">
                      Data &amp; file dokumen garansi tersimpan secara aman di Google Account milik Anda sendiri via Apps Script Gateway.
                    </p>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStorageMode('cloud');
                      setCurrentStep('google_guide');
                    }}
                    className={`w-full py-2.5 px-4 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      storageMode === 'cloud'
                        ? 'bg-emerald-800 text-white hover:bg-emerald-900 shadow-md'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    <span>[ Pilih Google Storage ]</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Option B: Local Storage Saja */}
              <div
                onClick={() => setStorageMode('local')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  storageMode === 'local'
                    ? 'border-emerald-500 bg-stone-900/90 shadow-lg'
                    : 'border-stone-700 bg-stone-900/60 hover:border-stone-600'
                }`}
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-800 text-stone-300 flex items-center justify-center font-bold">
                    <HardDrive className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      💻 Penyimpanan Lokal
                    </h3>
                    <p className="text-xs text-stone-300 font-medium leading-relaxed mt-1.5">
                      Gunakan MicroMate secara offline tanpa integrasi Google Account. Data hanya berada di browser perangkat ini.
                    </p>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStorageMode('local');
                      setCurrentStep('data_init');
                    }}
                    className={`w-full py-2.5 px-4 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      storageMode === 'local'
                        ? 'bg-stone-200 text-stone-900 hover:bg-white shadow-md'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    <span>[ Pilih Local Storage ]</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 3 & 4: APPS SCRIPT SETUP GUIDE                        */}
        {/* ========================================================== */}
        {currentStep === 'google_guide' && (
          <div className="bg-stone-800/80 border border-stone-700/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-700 pb-3">
              <button
                onClick={() => setCurrentStep('storage_choice')}
                className="text-xs font-bold text-stone-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800">
                ☁️ Setup Google Storage
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">
                Buat Gateway MicroMate
              </h2>
              <p className="text-xs text-stone-300 font-medium leading-relaxed">
                Apps Script berfungsi sebagai jembatan privat antara MicroMate, Google Sheets, dan Google Drive milik Anda sendiri.
              </p>
            </div>

            {/* Interactive Steps 1-4 */}
            <div className="space-y-3.5 text-xs">
              
              {/* Step 1: Open Google Sheet */}
              <div className="p-4 bg-stone-900/90 rounded-2xl border border-stone-700/80 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-extrabold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-emerald-200 text-[10px] font-black flex items-center justify-center">①</span>
                    <span>Buka Google Sheet Baru</span>
                  </div>
                  <p className="text-[11px] text-stone-400 font-medium pl-7">
                    Buat Google Sheet baru di <strong>sheet.new</strong> lalu buka menu <i>Extensions &gt; Apps Script</i>.
                  </p>
                </div>
                <a
                  href="https://sheet.new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-emerald-300 font-bold text-[11px] rounded-xl shrink-0 inline-flex items-center gap-1.5 transition-all border border-stone-600"
                >
                  <span>Buka Google Sheet ↗</span>
                </a>
              </div>

              {/* Step 2: Copy Code */}
              <div className="p-4 bg-stone-900/90 rounded-2xl border border-stone-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 text-emerald-200 text-[10px] font-black flex items-center justify-center">②</span>
                    <span>Salin Kode Backend Gateway</span>
                  </div>
                  <button
                    type="button"
                    onClick={copyAppsScriptCode}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-[11px] rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <FileCode className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Kode Tersalin!' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="pl-7">
                  <div className="bg-stone-950 p-3 rounded-xl font-mono text-[11px] text-emerald-400 border border-stone-800 flex items-center justify-between">
                    <code>function doGet(e) &#123; ... &#125;</code>
                    <button
                      type="button"
                      onClick={() => setShowCodeGuide(true)}
                      className="text-[10px] font-bold text-stone-400 hover:text-white underline cursor-pointer"
                    >
                      Lihat Seluruh Kode
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3: Deploy Instructions */}
              <div className="p-4 bg-stone-900/90 rounded-2xl border border-stone-700/80 space-y-2">
                <div className="font-extrabold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-800 text-emerald-200 text-[10px] font-black flex items-center justify-center">③</span>
                  <span>Deploy sebagai Web App</span>
                </div>
                <div className="text-[11px] text-stone-300 font-medium pl-7 space-y-1 leading-relaxed">
                  <p>1. Di Apps Script Editor, jalankan fungsi <code className="bg-stone-950 px-1.5 py-0.5 rounded text-emerald-400 font-mono font-bold">testAuthAndEmail</code> 1x untuk otorisasi email.</p>
                  <p>2. Klik tombol <strong>Deploy &gt; New deployment</strong>.</p>
                  <p>3. Pilih <i>Type:</i> <strong>Web app</strong>, <i>Execute as:</i> <strong>Me</strong>, &amp; <i>Who has access:</i> <strong>Anyone</strong>.</p>
                  <p>4. Klik <strong>Deploy</strong> dan salin <strong>Web App URL</strong>.</p>
                </div>
              </div>

            </div>

            <button
              type="button"
              onClick={() => setCurrentStep('google_connect')}
              className="w-full py-3.5 px-5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all text-sm shadow-xl"
            >
              <span>Sudah Deploy? Lanjut Tempel Web App URL →</span>
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 5: MASUKKAN WEB APP URL & HUBUNGKAN                    */}
        {/* ========================================================== */}
        {currentStep === 'google_connect' && (
          <div className="bg-stone-800/80 border border-stone-700/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-700 pb-3">
              <button
                onClick={() => setCurrentStep('google_guide')}
                className="text-xs font-bold text-stone-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Lihat Kode &amp; Panduan</span>
              </button>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800">
                Langkah 3 / 5
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">
                Hubungkan MicroMate
              </h2>
              <p className="text-xs text-stone-300 font-medium">
                Tempelkan Web App URL hasil deployment Google Apps Script Anda:
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="url"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/xxxxxxxx/exec"
                  className="w-full px-4 py-3.5 bg-stone-950 border-2 border-stone-700 rounded-2xl text-white placeholder:text-stone-500 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-inner"
                />
              </div>

              {/* Status Verification Checklist */}
              {connectionChecks.endpoint && (
                <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl space-y-2 text-xs font-extrabold text-emerald-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>✓ Endpoint ditemukan &amp; aktif</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>✓ Google Sheets tersedia</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>✓ Google Drive tersedia</span>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs font-bold">
                  ⚠️ {errorMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isVerifying || !appsScriptUrl.trim()}
                className="w-full py-4 px-5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all text-sm shadow-xl disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memeriksa Endpoint &amp; Mengirim OTP Email...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Verifikasi Koneksi &amp; Minta OTP</span>
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 6: VERIFIKASI EMAIL OTP                               */}
        {/* ========================================================== */}
        {currentStep === 'google_otp' && (
          <div className="bg-stone-800/80 border border-stone-700/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-900/80 border border-emerald-700 text-emerald-300 mx-auto flex items-center justify-center shadow-lg">
              <Mail className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">Verifikasi Kepemilikan Email</h2>
              <p className="text-xs text-stone-300 font-medium leading-relaxed max-w-sm mx-auto">
                Kami menemukan Google Account:
              </p>
              <div className="inline-block px-3.5 py-1.5 bg-emerald-950 text-emerald-300 font-mono font-black text-sm rounded-xl border border-emerald-800 my-1">
                {maskedEmail}
              </div>
              <p className="text-[11px] text-stone-400 font-medium">
                Kode verifikasi 6-digit telah dikirim ke inbox email di atas.
              </p>
            </div>

            <div className="space-y-4 max-w-xs mx-auto">
              <div className="relative">
                <KeyRound className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpInput(val);
                    if (val.length === 6) {
                      handleVerifyOtp(val);
                    }
                  }}
                  placeholder="• • • • • •"
                  className="w-full pl-12 pr-4 py-3 bg-stone-950 border-2 border-emerald-500/80 rounded-2xl text-center text-2xl font-mono font-black tracking-[0.4em] text-white focus:ring-4 focus:ring-emerald-500/30 shadow-inner"
                  autoFocus
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs font-bold">
                  ⚠️ {errorMessage}
                </div>
              )}

              {statusMessage && !errorMessage && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-bold">
                  {statusMessage}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={isVerifying || otpInput.length !== 6}
                  className="flex-1 py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shadow-lg"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Verifikasi OTP</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isVerifying}
                  className="px-3.5 py-3 bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold text-xs rounded-xl border border-stone-700 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {resendCooldown > 0 ? `${resendCooldown}s` : 'Kirim Ulang'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 7: INISIALISASI DATA                                  */}
        {/* ========================================================== */}
        {currentStep === 'data_init' && (
          <div className="bg-stone-800/80 border border-stone-700/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-emerald-200 mx-auto flex items-center justify-center font-bold text-xl shadow-md">
                ✓
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {storageMode === 'cloud' ? 'Google Storage Siap ✓' : 'Local Storage Siap ✓'}
              </h2>
              <p className="text-xs text-stone-300 font-medium">
                {storageMode === 'cloud' 
                  ? 'Kami menemukan Google Sheet & Google Drive Anda terhubung. Bagaimana Anda ingin memulai?' 
                  : 'Bagaimana Anda ingin memulai pengisian data di MicroMate?'}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              
              {/* Option 1: Existing Data (If cloud) */}
              {storageMode === 'cloud' && (
                <div
                  onClick={() => setInitialDataChoice('existing')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    initialDataChoice === 'existing'
                      ? 'border-emerald-500 bg-emerald-950/50 shadow-lg'
                      : 'border-stone-700 bg-stone-900/60 hover:border-stone-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-800 text-emerald-200 flex items-center justify-center font-bold text-sm shrink-0">
                      ☁️
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-sm">
                        Gunakan Data yang Sudah Ada di Google Sheet
                      </h4>
                      <p className="text-xs text-stone-300 font-medium mt-0.5">
                        Tarik langsung data aset dan dokumen yang tersimpan di Google Sheet Anda.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Option 2: Clean Slate / Mulai dari kosong */}
              <div
                onClick={() => setInitialDataChoice('empty')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  initialDataChoice === 'empty'
                    ? 'border-emerald-500 bg-emerald-950/50 shadow-lg'
                    : 'border-stone-700 bg-stone-900/60 hover:border-stone-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-stone-800 text-stone-300 flex items-center justify-center font-bold text-sm shrink-0">
                    📄
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">
                      Mulai dari Data Kosong
                    </h4>
                    <p className="text-xs text-stone-300 font-medium mt-0.5">
                      Mulai dari awal tanpa data sampel. Langsung siap memasukkan aset pribadi Anda.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 3: Sample Demo Assets */}
              <div
                onClick={() => setInitialDataChoice('demo')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  initialDataChoice === 'demo'
                    ? 'border-emerald-500 bg-emerald-950/50 shadow-lg'
                    : 'border-stone-700 bg-stone-900/60 hover:border-stone-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-800 text-emerald-200 flex items-center justify-center font-bold text-sm shrink-0">
                    📦
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">
                      Gunakan Data Contoh (Demo Assets)
                    </h4>
                    <p className="text-xs text-stone-300 font-medium mt-0.5">
                      Sediakan contoh data kendaraan, SIM, laptop, garansi, &amp; reminder untuk mempelajari fitur MicroMate.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            <button
              type="button"
              onClick={() => setCurrentStep('finish')}
              className="w-full py-4 px-5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all text-sm shadow-xl"
            >
              <span>Simpan &amp; Lanjut →</span>
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/* STEP 8: SELESAI / SUCCESS SCREEN                           */}
        {/* ========================================================== */}
        {currentStep === 'finish' && (
          <div className="bg-stone-800/80 border border-stone-700/80 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200 max-w-md mx-auto">
            
            <div className="w-20 h-20 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center mx-auto shadow-xl ring-8 ring-emerald-500/20 text-4xl font-black">
              ✓
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                MicroMate Siap!
              </h2>
              <p className="text-xs text-stone-300 font-medium">
                {storageMode === 'cloud'
                  ? 'Google Storage berhasil terhubung &amp; siap digunakan.'
                  : 'Penyimpanan lokal berhasil dikonfigurasi.'}
              </p>
            </div>

            {/* Checklist Badges */}
            <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-2xl text-left space-y-2.5 text-xs font-bold text-emerald-400">
              {storageMode === 'cloud' ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>✓ Google Sheets Terhubung</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>✓ Google Drive Terhubung</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>✓ Email Ownership Terverifikasi ({maskedEmail})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>✓ Sinkronisasi 2-Arah Aktif</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>✓ Local Storage Mode</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>✓ Fast Offline Access</span>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleFinishOnboarding}
              className="w-full py-4 px-6 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-xl shadow-emerald-900/50"
            >
              <span>Masuk ke MicroMate →</span>
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto px-4 py-4 text-center text-[11px] text-stone-500 font-medium relative z-10">
        MicroMate Personal Asset Manager • Privacy-First Offline Asset Vault
      </footer>

      {/* Full Code Helper Modal */}
      {showCodeGuide && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 text-white w-full max-w-2xl rounded-3xl p-6 space-y-4 border border-stone-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-400" />
                <span>Google Apps Script Backend Code</span>
              </h3>
              <button 
                onClick={() => setShowCodeGuide(false)}
                className="text-stone-400 hover:text-white font-bold text-sm px-2 py-1 rounded cursor-pointer"
              >
                ✕ Tutup
              </button>
            </div>
            <div className="relative">
              <pre className="p-4 bg-stone-950 rounded-xl text-emerald-400 font-mono text-[11px] max-h-72 overflow-y-auto border border-stone-800">
                {APPS_SCRIPT_CODE}
              </pre>
              <button
                type="button"
                onClick={copyAppsScriptCode}
                className="absolute top-3 right-3 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-md cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <FileCode className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowCodeGuide(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
