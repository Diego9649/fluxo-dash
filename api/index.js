require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Webhook Yampi -> Supabase
app.post('/webhook-yampi', async (req, res) => {
    const data = req.body.resource || req.body;
    const cupom = data.promocode?.data?.code || data.checkout?.promotional_code;
    
    if (!cupom) return res.status(200).send('Sem cupom');

    try {
        const { data: inf } = await supabase.from('influencers').select('cost').eq('coupon', cupom).maybeSingle();
        const valor = Number(data.value_total) || 0;
        const roi = inf?.cost > 0 ? ((valor / inf.cost) >= 3 ? 'verde' : 'vermelho') : 'pendente';

        await supabase.from('sales').upsert([{
            order_id: String(data.id || data.order_number),
            coupon: cupom,
            value: valor,
            status: data.status?.data?.alias || 'pago',
            roi_status: roi,
            created_at: new Date().toISOString()
        }], { onConflict: 'order_id' });

        res.status(200).send('OK');
    } catch (err) { res.status(500).send(err.message); }
});

// Busca Ranking para o Dash
app.get('/api/dashboard/ranking', async (req, res) => {
    const { data } = await supabase.from('sales').select('coupon, value, roi_status');
    const stats = (data || []).reduce((acc, s) => {
        acc[s.coupon] = acc[s.coupon] || { total: 0, sales_count: 0, status: s.roi_status };
        acc[s.coupon].total += s.value;
        acc[s.coupon].sales_count++;
        return acc;
    }, {});
    res.json(Object.entries(stats).map(([coupon, d]) => ({ coupon, ...d })));
});

// Update do Dashboard -> Supabase (Torna o Dash editável)
app.post('/api/update-influencer', async (req, res) => {
    const { handle, field, value } = req.body;
    try {
        const { error } = await supabase.from('influencers').update({ [field]: value }).eq('handle', handle);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = app;