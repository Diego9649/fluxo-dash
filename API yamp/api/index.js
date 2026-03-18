require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();

app.use(cors()); // Em produção, você pode restringir o domínio depois
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_KEY
);

app.get('/', (req, res) => res.send('API Fluxo Influencer Operacional 🚀'));

app.post('/webhook-yampi', async (req, res) => {
    const resource = req.body.resource || req.body.data || req.body;
    
    // Mapeamento robusto do cupom (Yampi pode enviar em lugares diferentes)
    const cupom = resource.promocode?.data?.code || 
                  resource.checkout?.promocode?.data?.code || 
                  resource.checkout?.promotional_code;

    const valorVenda = Number(resource.value_total) || 0;
    const statusPedido = resource.status?.data?.alias || 'unknown';

    if (!cupom) {
        console.log('⚠️ Webhook sem cupom. Ignorando.');
        return res.status(200).send('Sem cupom.');
    }

    try {
        const { data: influencer } = await supabase
            .from('influencers')
            .select('cost')
            .eq('coupon', cupom)
            .maybeSingle(); // maybeSingle evita erro se não encontrar nada

        let roiStatus = 'pendente'; 
        if (influencer && influencer.cost > 0) {
            roiStatus = (valorVenda / influencer.cost) >= 3 ? 'verde' : 'vermelho';
        }

        const { error: insertError } = await supabase.from('sales').insert([{
            order_id: String(resource.id),
            coupon: cupom,
            value: valorVenda,
            status: statusPedido,
            roi_status: roiStatus,
            created_at: new Date().toISOString()
        }]);

        if (insertError) throw insertError;
        res.status(200).send('OK');

    } catch (err) { 
        console.error('❌ Erro:', err.message);
        res.status(500).send('Erro interno');
    }
});

// Rotas de Ranking e Vendas Recentes (Mantidas como no seu original)
app.get('/api/dashboard/ranking', async (req, res) => { /* ... seu código ... */ });
app.get('/api/dashboard/recent-sales', async (req, res) => { /* ... seu código ... */ });

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Local ON: ${PORT}`));
}