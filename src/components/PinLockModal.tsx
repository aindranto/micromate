import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, ShieldCheck, AlertCircle, RefreshCw, Eye, EyeOff, X } from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onResetPin?: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onSuccess,
  onResetPin
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');

  const savedPin = localStorage.getItem('micromate_app_pin') || '';

  useEffect(() => {
    setPinInput('');
    setErrorMsg('');
  }, [isOpen]);

  // Physical Keyboard Listener
  useEffect(() => {
    if (!isOpen || showForgotModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigitClick(e.key);
      } else if (e.key === 'Backspace') {
        handleDeleteDigit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pinInput, showForgotModal]);

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    if (pinInput.length >= 4) return;
    const nextPin = pinInput + digit;
    setPinInput(nextPin);
    setErrorMsg('');

    if (nextPin.length === 4) {
      if (nextPin === savedPin) {
        setPinInput('');
        onSuccess();
      } else {
        setShake(true);
        setErrorMsg('PIN yang Anda masukkan salah.');
        setTimeout(() => {
          setPinInput('');
          setShake(false);
        }, 600);
      }
    }
  };

  const handleDeleteDigit = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleVerifyForgotWithToken = () => {
    const savedToken = localStorage.getItem('micromate_access_token') || '';
    if (tokenInput.trim() === savedToken.trim() || tokenInput.trim() === 'RESET') {
      localStorage.removeItem('micromate_app_pin');
      setShowForgotModal(false);
      setPinInput('');
      if (onResetPin) onResetPin();
      onSuccess();
    } else {
      setTokenError('Kunci Akses Cloud (Access Token) tidak cocok.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`bg-white rounded-3xl border border-stone-200 w-full max-w-sm p-6 shadow-2xl space-y-6 text-center ${shake ? 'animate-bounce' : ''}`}>
        
        {/* Header Icon */}
        <div className="space-y-2">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-800 shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-stone-900">
            Aplikasi Terkunci
          </h3>
          <p className="text-xs text-stone-500 font-medium">
            Masukkan 4-digit PIN keamanan MicroMate Anda
          </p>
        </div>

        {/* PIN Indicators Dots */}
        <div className="flex justify-center items-center gap-3 py-2">
          {[0, 1, 2, 3].map((index) => {
            const filled = pinInput.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  filled
                    ? 'bg-emerald-800 border-emerald-800 scale-110 shadow-xs'
                    : 'bg-stone-100 border-stone-300'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Keypad Numpad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitClick(digit)}
              className="h-12 rounded-2xl bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 border border-stone-200 text-stone-900 font-bold text-lg cursor-pointer active:scale-95 transition-all flex items-center justify-center shadow-2xs"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            className="h-12 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 text-[11px] font-bold cursor-pointer active:scale-95 transition-all flex items-center justify-center"
            title="Lupa PIN?"
          >
            Lupa?
          </button>
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            className="h-12 rounded-2xl bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 border border-stone-200 text-stone-900 font-bold text-lg cursor-pointer active:scale-95 transition-all flex items-center justify-center shadow-2xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDeleteDigit}
            className="h-12 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-bold text-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center"
            title="Hapus"
          >
            ←
          </button>
        </div>

        <div className="pt-2">
          <p className="text-[11px] text-stone-400 font-medium">
            🔒 Keamanan lokal aktif. Data Anda aman tersimpan di IndexedDB.
          </p>
        </div>

      </div>

      {/* Modal Lupa PIN */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-sm p-6 shadow-xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <h4 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-800" />
                <span>Reset PIN Keamanan</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed font-medium">
              Untuk mereset PIN keamanan lokal, ketik <strong>RESET</strong> atau masukkan Access Token Anda jika pernah mengaturnya.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 block">Kunci Akses Cloud / Token</label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setTokenError('');
                }}
                placeholder="Masukkan Access Token Anda"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium text-xs focus:ring-2 focus:ring-emerald-600/30"
              />
              {tokenError && (
                <p className="text-[11px] font-bold text-rose-600">{tokenError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleVerifyForgotWithToken}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs cursor-pointer shadow-2xs"
              >
                Verifikasi & Buka PIN
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
