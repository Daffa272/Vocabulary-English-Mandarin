import React, { useState } from 'react';
import { X, Key, ExternalLink, HelpCircle, Eye, EyeOff, Check, Server, Download, Upload } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
  hasServerKey: boolean;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSave,
  onClose,
  hasServerKey,
  onExport,
  onImport
}) => {
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [model, setModel] = useState(settings.model || 'gemini-3.8-flash');
  const [showKey, setShowKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleSave = () => {
    onSave({
      ...settings,
      apiKey: apiKey.trim(),
      model
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pengaturan API & Model
              </h3>
              <p className="text-xs text-slate-500">
                Konfigurasi Google Gemini AI & Penyimpanan Data
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Tutup pengaturan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Status Info */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold text-slate-700">Koneksi Server AI:</span>
          </div>
          {hasServerKey ? (
            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              ✓ Siap Pakai (Server Key Aktif)
            </span>
          ) : (
            <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              Gunakan API Key Pribadi
            </span>
          )}
        </div>

        {/* API Key Form */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              Gemini API Key (Opsional / Override)
            </label>
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Panduan Dapatkan API</span>
            </button>
          </div>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Masukkan AI Studio API Key (AIzaSy...)"
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Kunci ini disimpan secara aman di browser lokal Anda untuk mengakses model Gemini secara langsung.
          </p>
        </div>

        {/* Step-by-step Guide Accordion */}
        {showGuide && (
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-slate-700 space-y-2 animate-fadeIn">
            <h4 className="font-bold text-indigo-900 flex items-center justify-between">
              <span>Cara Mendapatkan Kunci API Gemini Gratis:</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-700 hover:underline inline-flex items-center gap-1 font-bold"
              >
                Buka AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </h4>
            <ol className="list-decimal pl-4 space-y-1 text-slate-600">
              <li>Kunjungi Google AI Studio dan login dengan akun Google Anda.</li>
              <li>Klik tombol <strong>Create API key</strong>.</li>
              <li>Pilih Google Cloud Project Anda (atau buat project gratis baru).</li>
              <li>Salin token kunci API yang dihasilkan.</li>
              <li>Tempelkan ke kolom input di atas lalu klik Simpan.</li>
            </ol>
            <p className="text-[10px] text-slate-400 italic pt-1">
              Panduan oleh Daffa Aulia Rahman
            </p>
          </div>
        )}

        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            Pilihan Model AI
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          >
            <option value="gemini-3.8-flash">Gemini 3.8 Flash (Direkomendasikan - Cepat & Akurat)</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ringan & Cepat)</option>
          </select>
        </div>

        {/* Tracker Lamaran Portal Link */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-amber-950 block">Tracker Lamaran 2026</span>
            <p className="text-[11px] text-amber-800/80">Pantau progres dan riwayat lamaran pekerjaan Anda secara real-time.</p>
          </div>
          <a
            href="https://tracker-lamaran-2026.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-2xs whitespace-nowrap transition-colors"
          >
            <span>Buka Web</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Backup & Restore Section */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            Cadangan & Pemulihan (Backup & Restore)
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onExport}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export File JSON</span>
            </button>

            <label className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
              <Upload className="w-4 h-4" />
              <span>Import File JSON</span>
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={onImport}
              />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors shadow-xs"
          >
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
};
