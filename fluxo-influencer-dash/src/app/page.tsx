// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, TrendingUp, Table as TableIcon } from 'lucide-react';
import AlertPopUp from '@/components/AlertPopUp';

export default function Dashboard() {
  const [ranking, setRanking] = useState([]);
  const [recentSales, setRecentSales] = useState([]);

  // URL DA SUA API NO RENDER - JÁ CONFIGURADA
  const API_URL = 'https://fluxo-api-laganexa.onrender.com';

  const fetchData = async () => {
    try {
      // 1. Busca o Ranking (Cards e Gráfico)
      const rankRes = await fetch(`${API_URL}/api/dashboard/ranking`);
      const rankData = await rankRes.json();
      setRanking(rankData);

      // 2. Busca as Vendas Recentes (Tabela/Planilha)
      const salesRes = await fetch(`${API_URL}/api/dashboard/recent-sales`);
      const salesData = await salesRes.json();
      setRecentSales(salesData);
    } catch (err) {
      console.error("Erro ao conectar com a API no Render:", err);
    }
  };

  useEffect(() => {
    fetchData();
    // Atualiza os dados a cada 10 segundos automaticamente
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-blue-500 tracking-tight">La Ganexa - Fluxo Influencer</h1>
          <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">Monitoramento em Tempo Real • V1.0</p>
        </header>

        {/* TOP 5 CARDS - ROI DOS INFLUENCERS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {ranking.map((item, index) => (
            <div key={index} className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl shadow-xl backdrop-blur-sm">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === 'verde' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {item.status === 'verde' ? 'META ATINGIDA' : 'ABAIXO DA META'}
              </span>
              <h3 className="text-slate-400 text-sm mt-3 uppercase font-bold truncate">{item.coupon || 'SEM CUPOM'}</h3>
              <p className="text-2xl font-black">R$ {Number(item.total || 0).toLocaleString('pt-BR')}</p>
            </div>
          ))}
        </div>

        {/* GRÁFICO DE PERFORMANCE */}
        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl mb-10 shadow-xl">
          <h2 className="text-xl font-bold mb-6 flex items-center text-slate-200">
            <TrendingUp className="mr-2 text-blue-400 w-5 h-5"/> Ranking de Faturamento
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ranking}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="coupon" stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {ranking.map((e, i) => (
                    <Cell key={i} fill={e.status === 'verde' ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABELA - VENDAS RECENTES */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TableIcon className="text-blue-400 w-5 h-5" />
              <h2 className="text-xl font-bold text-slate-200">Relatório de Vendas (Últimas 10)</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Pedido ID</th>
                  <th className="p-4 font-semibold">Cupom/Influencer</th>
                  <th className="p-4 font-semibold">Valor Bruto</th>
                  <th className="p-4 font-semibold text-center">Status ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {recentSales.map((sale, index) => (
                  <tr key={index} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 text-slate-400 text-xs font-mono">#{sale.order_id}</td>
                    <td className="p-4 font-bold text-blue-400">{sale.coupon}</td>
                    <td className="p-4 font-bold text-slate-100">R$ {Number(sale.value || 0).toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        <div className={`w-3 h-3 rounded-full shadow-[0_0_8px] ${sale.roi_status === 'verde' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'}`} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COMPONENTE DO POP-UP DE ALERTAS */}
        <AlertPopUp />
      </div>
    </main>
  );
}