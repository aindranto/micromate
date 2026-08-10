import React, { useState, useEffect } from 'react';
import { Asset } from '../types';
import { Sparkles, Send, X, Bot, User, Loader2 } from 'lucide-react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  assets,
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

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text: 'Halo! Saya MicroMate AI. Anda dapat bertanya kepada saya seputar jadwal ganti oli, garansi aset, total biaya perawatan, atau nomor seri perangkat Anda.'
    }
  ]);

  if (!isOpen) return null;

  const sampleQuestions = [
    'Kapan saya terakhir ganti oli Vario 160?',
    'Aset mana saja yang garansinya akan habis?',
    'Berapa total biaya perawatan seluruh aset saya?',
    'Apa saja nomor seri (S/N) laptop dan kamera saya?'
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || prompt;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          assetsData: assets
        })
      });

      const data = await response.json();

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { id: 'ai_' + Date.now(), sender: 'ai', text: data.reply }
        ]);
      } else {
        // Local fallback smart response engine
        const fallbackText = generateLocalSmartResponse(text, assets);
        setMessages((prev) => [
          ...prev,
          { id: 'ai_' + Date.now(), sender: 'ai', text: fallbackText }
        ]);
      }
    } catch {
      const fallbackText = generateLocalSmartResponse(text, assets);
      setMessages((prev) => [
        ...prev,
        { id: 'ai_' + Date.now(), sender: 'ai', text: fallbackText }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Local fallback response engine if API is unavailable
  const generateLocalSmartResponse = (query: string, assetList: Asset[]): string => {
    const q = query.toLowerCase();

    if (q.includes('oli') || q.includes('oil')) {
      const vehicles = assetList.filter((a) => a.category === 'vehicle');
      if (vehicles.length === 0) return 'Anda belum mendaftarkan kendaraan.';
      
      return vehicles.map((v) => {
        const det = v.vehicle_details;
        const lastOilLog = v.maintenance_records?.find((m) => m.type === 'oil_change');
        return `• ${v.name} (${det?.license_plate || 'Plat N/A'}):\n  - Terakhir Ganti Oli: ${det?.last_oil_change_date || lastOilLog?.date || 'Belum ada catatan'} (Km: ${det?.last_oil_change_mileage || 'N/A'})\n  - Target Berikutnya: ${det?.next_oil_change_mileage ? det.next_oil_change_mileage.toLocaleString('id-ID') + ' km' : 'N/A'}`;
      }).join('\n\n');
    }

    if (q.includes('garansi') || q.includes('warranty')) {
      const warrAssets = assetList.filter((a) => a.warranty && a.warranty.end_date);
      if (warrAssets.length === 0) return 'Tidak ada aset dengan catatan garansi.';

      return warrAssets.map((a) => {
        return `• ${a.name}:\n  - Provider: ${a.warranty?.provider}\n  - Selesai Garansi: ${a.warranty?.end_date}\n  - No. Garansi: ${a.warranty?.warranty_number || '-'}`;
      }).join('\n\n');
    }

    if (q.includes('biaya') || q.includes('total') || q.includes('cost')) {
      const totalCost = assetList.reduce((sum, a) => {
        const mntCost = (a.maintenance_records || []).reduce((s, m) => s + m.cost, 0);
        return sum + (a.purchase_price || 0) + mntCost;
      }, 0);

      return `Total estimasi biaya kepemilikan (TCO) seluruh aset terdaftar Anda adalah Rp ${totalCost.toLocaleString('id-ID')}.\n\nRincian Aset:\n` + 
        assetList.map((a) => `• ${a.name}: Beli Rp ${(a.purchase_price || 0).toLocaleString('id-ID')}`).join('\n');
    }

    if (q.includes('serial') || q.includes('sn') || q.includes('nomor seri')) {
      return 'Daftar Nomor Seri (Serial Number) Aset:\n' +
        assetList.map((a) => `• ${a.name}: ${a.serial_number || 'Tidak ada S/N'}`).join('\n');
    }

    return `Berdasarkan inventaris Anda (${assetList.length} aset terdaftar):\n• ${assetList.map(a => a.name).join('\n• ')}\n\nSilakan tanyakan secara spesifik seputar ganti oli, garansi, atau total biaya.`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-xl h-[80vh] shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                MicroMate AI Assistant
              </h3>
              <p className="text-xs text-stone-600 font-medium">
                Tanya seputar aset, jadwal ganti oli, garansi & biaya
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 text-xs no-scrollbar">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${
                m.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[80%] p-3.5 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-800 text-white font-medium shadow-2xs'
                    : 'bg-stone-100 text-stone-900 border border-stone-200 font-medium'
                }`}
              >
                {m.text}
              </div>

              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-800 flex items-center justify-center shrink-0 font-bold">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-stone-600 text-xs py-2 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              <span>MicroMate AI sedang menganalisis data aset Anda...</span>
            </div>
          )}
        </div>

        {/* Sample Question Suggestions */}
        <div className="px-4 py-2.5 bg-stone-50 border-t border-stone-200 overflow-x-auto flex items-center gap-2 no-scrollbar">
          {sampleQuestions.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(q)}
              className="px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-[11px] font-semibold text-stone-700 hover:border-emerald-700 hover:text-emerald-900 whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Prompt Input Box */}
        <div className="p-4 border-t border-stone-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Tanyakan sesuatu tentang aset Anda..."
              className="flex-1 px-4 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-stone-900 placeholder:text-stone-400 font-medium"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
