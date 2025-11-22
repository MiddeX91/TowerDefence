import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: { wave: number; kills: number }[];
  themeName: string;
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, data, themeName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 shadow-2xl w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Kampfbericht: {themeName}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-white">
            <X size={24} />
          </button>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="wave" label={{ value: 'Welle', position: 'insideBottom', offset: -5 }} stroke="#94a3b8" />
              <YAxis label={{ value: 'Besiegte Gegner', angle: -90, position: 'insideLeft' }} stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                cursor={{ fill: '#334155', opacity: 0.4 }}
              />
              <Bar dataKey="kills" fill="#8884d8" name="Kills" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 text-center text-slate-400 text-sm">
          Zeigt die Anzahl der besiegten Gegner pro Welle an.
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
