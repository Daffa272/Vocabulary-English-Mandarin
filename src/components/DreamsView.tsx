import React, { useState } from 'react';
import { Target, Plus, CheckCircle2, Trash2, Award } from 'lucide-react';
import { DreamItem } from '../types';

interface DreamsViewProps {
  dreams: DreamItem[];
  onAddDream: (text: string) => void;
  onToggleDream: (id: string) => void;
  onDeleteDream: (id: string) => void;
}

export const DreamsView: React.FC<DreamsViewProps> = ({
  dreams,
  onAddDream,
  onToggleDream,
  onDeleteDream
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onAddDream(inputText.trim());
    setInputText('');
  };

  const achievedCount = dreams.filter((d) => d.achieved).length;
  const progressPercent = dreams.length > 0 ? (achievedCount / dreams.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header card with progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Mimpi & Target Belajar
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Tuliskan tujuan akademik, target skor ujian, dan tandai saat sudah berhasil diraih.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/60 px-3 py-1.5 rounded-full text-xs font-bold text-amber-900 shrink-0">
            <Award className="w-4 h-4 text-amber-600" />
            <span>{achievedCount} dari {dreams.length} tercapai</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Add New Dream Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Contoh: Lancar berbicara bahasa Inggris dalam presentasi TOEFL"
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            maxLength={160}
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-5 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 shadow-xs min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Target</span>
          </button>
        </div>
      </form>

      {/* Dream list */}
      <div className="space-y-2.5">
        {dreams.length > 0 ? (
          dreams.map((dream) => (
            <div
              key={dream.id}
              className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                dream.achieved
                  ? 'bg-slate-50/70 border-slate-200'
                  : 'bg-white border-slate-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={dream.achieved}
                  onChange={() => onToggleDream(dream.id)}
                  className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer shrink-0"
                />
                <span
                  className={`text-xs sm:text-sm font-semibold truncate ${
                    dream.achieved
                      ? 'line-through text-slate-400'
                      : 'text-slate-800'
                  }`}
                >
                  {dream.text}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onDeleteDream(dream.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                title="Hapus target"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <Target className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">
              Belum ada target yang dibuat
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Mulai dari satu target atau cita-cita hari ini untuk memacu semangat belajar Anda!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
