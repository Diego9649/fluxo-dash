require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();

// Configuração de CORS dinâmica para Produção e Local
app.use(cors({
    origin: ["http://localhost:3001", "https://seu-frontend.vercel.app"],
    methods: ["GET", "POST"]
}));
app.use(express.json());

// 2. CONEXÃO COM O SUPABASE
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_KEY
);

// Rota de teste para saber se a API está online
app.get('/', (req, res) => res.send('API Fluxo Influencer Operacional 🚀'));

// 3. ROTA DO WEBHOOK DA YAMPI
app.post('/webhook-yampi', async (req, res) => {
    // A Yampi às vezes envia o body dentro de 'data' ou direto no root dependendo da versão
    const resource = req.body.resource || req.body.data || {};
    const promocodeData = resource.promocode?.data || {};
    const cupom = promocodeData.code;
    const valorVenda = Number(resource.value_total) || 0;
    const statusPedido = resource.status?.data?.alias || 'unknown';
    const nomeCliente = resource.customer?.data?.name || 'Cliente';

    if (!cupom) {
        console.log('⚠️ Webhook recebido sem cupom.');
        return res.status(200).send('Sem cupom.');
    }

    try {
        // Busca custo do influencer para calcular ROI
        const { data: influencer } = await supabase
            .from('influencers')
            .select('cost')
            .eq('coupon', cupom)
            .single();

        let roiStatus = 'pendente'; 
        if (influencer && influencer.cost > 0) {
            roiStatus = (valorVenda / influencer.cost) >= 3 ? 'verde' : 'vermelho';
        }

        // Insere na tabela de vendas
        const { error: insertError } = await supabase.from('sales').insert([{
            order_id: String(resource.id),
            coupon: cupom,
            value: valorVenda,
            status: statusPedido,
            roi_status: roiStatus,
            created_at: resource.created_at?.date || new Date().toISOString()
        }]);

        if (insertError) throw insertError;

        console.log(`✅ Venda Processada: ${cupom} | Status: ${statusPedido}`);
        
        // NOTA: Socket.io em Serverless (Vercel) requer Supabase Realtime ou Pusher.
        // Se precisar de tempo real na Vercel, use o Realtime do próprio Supabase no Frontend.

    } catch (err) { 
        console.error('❌ Erro no Webhook:', err.message); 
    }

    res.status(200).send('OK');
});

// 4. ROTAS DO DASHBOARD
app.get('/api/dashboard/ranking', async (req, res) => {
    try {
        const { data: sales, error } = await supabase.from('sales').select('coupon, value, roi_status');
        if (error) throw error;

        const stats = (sales || []).reduce((acc, sale) => {
            if (!acc[sale.coupon]) {
                acc[sale.coupon] = { total: 0, sales_count: 0, status: sale.roi_status };
            }
            acc[sale.coupon].total += Number(sale.value);
            acc[sale.coupon].sales_count += 1;
            acc[sale.coupon].status = sale.roi_status; 
            return acc;
        }, {});

        const top5 = Object.entries(stats)
            .map(([coupon, data]) => ({ coupon, ...data }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        res.status(200).json(top5);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/recent-sales', async (req, res) => {
    const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
    if (error) return res.status(500).json(error);
    res.status(200).json(data);
});

// Exportar para a Vercel tratar como Serverless Function
module.exports = app;

// Rodar localmente
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Local API ON na porta ${PORT}`));
}