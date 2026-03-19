require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/* =========================
   WEBHOOK YAMPI
========================= */

app.post('/webhook-yampi', async (req, res) => {
  try {
    const data = req.body.resource || req.body;

    const orderId = String(data.id || data.order_number);
    const cupom =
      data.promocode?.data?.code ||
      data.checkout?.promotional_code ||
      null;

    const value = Number(data.value_total || data.total || 0);
    const status = data.status?.data?.alias || data.status || 'pago';

    // 🔹 SALVA VENDA
    await supabase.from('sales').upsert(
      [
        {
          order_id: orderId,
          coupon: cupom,
          value,
          status,
          created_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'order_id' }
    );

    // 🔹 BUSCA INFLUENCER
    if (cupom) {
      const { data: inf } = await supabase
        .from('influencers')
        .select('handle, cost')
        .eq('cupom', cupom)
        .maybeSingle();

      if (inf) {
        const roi =
          inf.cost > 0
            ? value / inf.cost >= 3
              ? 'verde'
              : 'vermelho'
            : 'pendente';

        // 🔹 ATUALIZA ROI NA VENDA
        await supabase
          .from('sales')
          .update({ roi_status: roi, handle: inf.handle })
          .eq('order_id', orderId);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro webhook');
  }
});

/* =========================
   🔥 NOVO: LISTA INFLUENCERS
========================= */
app.get('/api/influencers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('influencers')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   🔥 RANKING (AJUSTADO)
========================= */
app.get('/api/dashboard/ranking', async (req, res) => {
  try {
    const { data: sales } = await supabase
      .from('sales')
      .select('coupon, value, roi_status');

    const stats = (sales || []).reduce((acc, s) => {
      acc[s.coupon] = acc[s.coupon] || {
        total: 0,
        sales_count: 0,
        roi_status: s.roi_status,
      };

      acc[s.coupon].total += Number(s.value);
      acc[s.coupon].sales_count++;

      return acc;
    }, {});

    res.json(
      Object.entries(stats).map(([coupon, d]) => ({
        coupon,
        ...d,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   🔥 SALES LIST
========================= */
app.get('/api/dashboard/recent-sales', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   🔥 UPDATE DASH
========================= */
app.post('/api/update-data', async (req, res) => {
  const { handle, field, value } = req.body;

  try {
    const { error } = await supabase
      .from('influencers')
      .update({ [field]: value })
      .eq('handle', handle);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;