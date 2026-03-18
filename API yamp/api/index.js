require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();

// 1. CONFIGURAÇÕES INICIAIS
app.use(cors()); // Aberto para facilitar o teste inicial do dashboard
app.use(express.json());

// 2. CONEXÃO COM O SUPABASE
// Certifique-se de que estas chaves estão no "Environment Variables" da Vercel
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_KEY
);

// 3. ROTA RAIZ (Para testar se o 404 sumiu)
app.get('/', (req, res) => {
    res.status(200).send('🚀 API Fluxo Influencer Operacional na Vercel!');
});

// 4. ROTA DO WEBHOOK DA YAMPI
app.post('/webhook-yampi', async (req, res) => {
    // Normaliza o corpo da requisição (Yampi varia entre resource, data ou root)
    const resource = req.body.resource || req.body.data || req.body;
    
    // Extração robusta do cupom
    const cupom = resource.promocode?.data?.code || 
                  resource.checkout?.promocode?.data?.code || 
                  resource.checkout?.promotional_code;

    const valorVenda = Number(resource.value_total) || 0;
    const statusPedido = resource.status?.data?.alias || 'unknown';
    const orderId = String(resource.id || resource.order_number);

    if (!cupom) {
        console.log('⚠️ Webhook recebido, mas sem cupom. Pulando...');
        return res.status(200).send('OK (Sem cupom)');
    }

    try {
        // Busca custo do influencer para ROI (usando .maybeSingle para não dar erro se não existir)
        const { data: influencer } = await supabase
            .from('influencers')
            .select('cost')
            .eq('coupon', cupom)
            .maybeSingle();

        let roiStatus = 'pendente'; 
        if (influencer && influencer.cost > 0) {
            roiStatus = (valorVenda / influencer.cost) >= 3 ? 'verde' : 'vermelho';
        }

        // Insere na tabela 'sales'
        const { error: insertError } = await supabase.from('sales').insert([{
            order_id: orderId,
            coupon: cupom,
            value: valorVenda,
            status: statusPedido,
            roi_status: roiStatus,
            created_at: new Date().toISOString()
        }]);

        if (insertError) throw insertError;

        console.log(`✅ Venda ${orderId} processada para o cupom: ${cupom}`);
        res.status(200).send('Webhook Processado');

    } catch (err) { 
        console.error('❌ Erro no Webhook:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 5. ROTAS DO DASHBOARD (RANKING E VENDAS RECENTES)
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

// 6. CATCH-ALL (Redireciona qualquer 404 para a raiz da API)
app.all('*', (req, res) => {
    res.status(200).send('API Online - Use as rotas /api/dashboard/ranking ou /api/dashboard/recent-sales');
});

// 7. EXPORTAÇÃO PARA VERCEL
module.exports = app;

// Rodar localmente (Git Bash: node api/index.js)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 API Local ligada: http://localhost:${PORT}`));
}