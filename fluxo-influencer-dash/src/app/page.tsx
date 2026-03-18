'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, TrendingUp, DollarSign } from 'lucide-react';
import AlertPopUp from '@/components/AlertPopUp'; // Importa o componente de alertas em tempo real

export default function Dashboard() {
  const [ranking, setRanking] = useState([]);

  // Função para buscar os dados da API Node.js
  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/dashboard/ranking');
      const data = await res.json();
      setRanking(data);
    } catch (err) {
      console.error("Erro ao carregar ranking:", err);
    }
  };

  useEffect(() => {
    fetchData();
    // Atualiza os dados a cada 30 segundos para manter o Top 5 fresco
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header - Identificação do Projeto */}
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight">Fluxo Influencer</h1>
          <p className="text-slate-400">Dashboard de Performance • La Ganexa</p>
        </header>

        {/* Cards de Performance - Visualização Rápida de ROI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {ranking.map((item) => (
            <div key={item.coupon} className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl backdrop-blur-sm shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-500/10 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                {/* Badge Dinâmico: Verde para ROI >= 3, Vermelho para < 3 */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  item.status === 'verde' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  ROI {item.status === 'verde' ? 'META OK' : 'BAIXO'}
                </span>
              </div>
              <h3 className="text-slate-400 text-sm font-medium uppercase">{item.coupon}</h3>
              <p className="text-2xl font-bold">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <div className="mt-2 flex items-center text-xs text-slate-500">
                <TrendingUp className="w-3 h-3 mr-1" />
                {item.sales_count} vendas processadas
              </div>
            </div>
          ))}
        </div>

        {/* Gráfico de Ranking - Top 5 Influencers */}
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center">
              <TrendingUp className="mr-2 text-blue-400" /> Performance Geral (Ranking)
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> ROI 3+</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-rose-500 rounded-full"></div> Abaixo Meta</div>
            </div>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ranking} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="coupon" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tick={{ dy: 10 }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Total de Vendas']}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={50}>
                  {ranking.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.status === 'verde' ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Componente de Pop-up Invisível (Só aparece quando houver pendência) */}
        <AlertPopUp />
      </div>
    </main>
  );
}