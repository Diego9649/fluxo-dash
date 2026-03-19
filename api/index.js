require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();

// 1. CONFIGURAÇÕES INICIAIS
app.use(cors());
app.use(express.json());

// 2. CONEXÃO COM O SUPABASE
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_KEY
);

// 3. ROTA DO WEBHOOK DA YAMPI (CORRIGIDA PARA UPSERT E ROI DINÂMICO)
app.post('/webhook-yampi', async (req, res) => {
    const resource = req.body.resource || req.body.data || req.body;
    
    const cupom = resource.promocode?.data?.code || 
                  resource.checkout?.promocode?.data?.code || 
                  resource.checkout?.promotional_code;

    const valorVenda = Number(resource.value_total) || 0;
    const statusPedido = resource.status?.data?.alias || 'pago';
    const orderId = String(resource.id || resource.order_number);

    if (!cupom) return res.status(200).send('OK (Sem cupom)');

    try {
        // Busca custo para ROI
        const { data: influencer } = await supabase
            .from('influencers')
            .select('cost')
            .eq('coupon', cupom)
            .maybeSingle();

        let roiStatus = 'pendente'; 
        if (influencer && influencer.cost > 0) {
            roiStatus = (valorVenda / influencer.cost) >= 3 ? 'verde' : 'vermelho';
        }

        // UPSERT para evitar duplicados caso a Yampi envie o mesmo pedido 2x
        const { error: upsertError } = await supabase.from('sales').upsert([{
            order_id: orderId,
            coupon: cupom,
            value: valorVenda,
            status: statusPedido,
            roi_status: roiStatus,
            created_at: new Date().toISOString()
        }], { onConflict: 'order_id' });

        if (upsertError) throw upsertError;
        res.status(200).send('Webhook Processado');
    } catch (err) { 
        res.status(500).json({ error: err.message });
    }
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

        const ranking = Object.entries(stats)
            .map(([coupon, data]) => ({ coupon, ...data }))
            .sort((a, b) => b.total - a.total);

        res.status(200).json(ranking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/recent-sales', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sales')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(15);
        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. NOVA ROTA: ATUALIZAÇÃO DIRETA PELO DASHBOARD (EDITÁVEL)
app.post('/api/update-data', async (req, res) => {
    const { handle, field, value } = req.body;
    try {
        const { error } = await supabase
            .from('influencers')
            .update({ [field]: value })
            .eq('handle', handle);
        
        if (error) throw error;
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. EXPORTAÇÃO PARA VERCEL
module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 API Local ligada: http://localhost:${PORT}`));
}