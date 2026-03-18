require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const crypto = require('crypto');
const cron = require('node-cron');

const app = express();

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

let db;

async function setupDatabase() {
    db = await open({
        filename: './vendas_influencers.db',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            yampi_id TEXT UNIQUE,
            cupom TEXT,
            valor REAL,
            data_pago TEXT,
            status TEXT
        )
    `);

    console.log('✅ Banco de dados pronto.');
}

function validateSignature(req) {
    const signature = req.headers['x-yampi-hmac-sha256'];
    if (!signature) return false;

    const secret = process.env.YAMPI_SECRET;

    const hash = crypto
        .createHmac('sha256', secret)
        .update(req.rawBody)
        .digest('base64');

    return hash === signature;
}

app.post('/webhook-yampi', async (req, res) => {

    if (!validateSignature(req)) {
        console.log('❌ Assinatura inválida');
        return res.status(401).send('Unauthorized');
    }

    const pedido = req.body;

    const status = pedido.status;
    const cupom = pedido.promotional_codes?.[0]?.code;

    if (status === 'paid' && cupom) {
        try {
            await db.run(
                `INSERT INTO pedidos (yampi_id, cupom, valor, data_pago, status) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    pedido.id,
                    cupom,
                    pedido.total,
                    new Date().toISOString(),
                    status
                ]
            );

            console.log(`✨ Pedido salvo | Cupom: ${cupom} | R$ ${pedido.total}`);

        } catch (error) {
            console.log(`⚠️ Pedido ${pedido.id} já registrado.`);
        }
    }

    res.status(200).send('OK');
});

app.get('/ranking', async (req, res) => {

    const resultados = await db.all(`
        SELECT cupom,
               COUNT(*) as total_vendas,
               SUM(valor) as faturamento
        FROM pedidos
        GROUP BY cupom
        ORDER BY total_vendas DESC
    `);

    res.json(resultados);
});

cron.schedule('0 9 1,15 * *', async () => {

    console.log('🔄 Gerando relatório quinzenal...');

    const ranking = await db.all(`
        SELECT cupom,
               COUNT(*) as total_vendas,
               SUM(valor) as faturamento
        FROM pedidos
        WHERE date(data_pago) >= date('now', '-15 days')
        GROUP BY cupom
        ORDER BY total_vendas DESC
    `);

    console.log('📊 Ranking últimos 15 dias:');
    console.log(ranking);
});

setupDatabase().then(() => {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });
});