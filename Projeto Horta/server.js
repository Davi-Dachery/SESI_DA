// Servidor simples da Horta Escolar (sem dependências).
// Uso:  node server.js   →  http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PASTA = __dirname;
const ARQUIVO_DADOS = path.join(PASTA, 'dados.json');
const METODOS = ['Gotejamento', 'Regador manual', 'Microaspersão'];

const TIPOS = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};
const BLOQUEADOS = ['server.js', 'dados.json'];

// --- Dados salvos em arquivo ---
function lerDados() {
    try {
        return JSON.parse(fs.readFileSync(ARQUIVO_DADOS, 'utf-8'));
    } catch (e) {
        const iniciais = {
            irrigacoes: [
                { id: crypto.randomUUID(), data: '2026-10-06', hora: '08:00', volume: 6, metodo: 'Gotejamento' },
                { id: crypto.randomUUID(), data: '2026-10-05', hora: '17:30', volume: 5, metodo: 'Gotejamento' },
                { id: crypto.randomUUID(), data: '2026-10-04', hora: '08:15', volume: 6, metodo: 'Regador manual' },
                { id: crypto.randomUUID(), data: '2026-10-03', hora: '08:00', volume: 4.5, metodo: 'Gotejamento' },
            ],
        };
        salvarDados(iniciais);
        return iniciais;
    }
}

function salvarDados(dados) {
    const tmp = ARQUIVO_DADOS + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(dados, null, 2));
    fs.renameSync(tmp, ARQUIVO_DADOS); // gravação segura
}

const ordenar = (lista) => lista.sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));

function validar(b) {
    const volume = Number(b.volume);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.data || '')) return null;
    if (!/^\d{2}:\d{2}$/.test(b.hora || '')) return null;
    if (!(volume > 0 && volume <= 1000)) return null;
    if (!METODOS.includes(b.metodo)) return null;
    return { id: crypto.randomUUID(), data: b.data, hora: b.hora, volume, metodo: b.metodo };
}

// --- Respostas ---
function json(res, status, corpo) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(corpo));
}

function lerCorpo(req) {
    return new Promise((ok, erro) => {
        let txt = '';
        req.on('data', (c) => { txt += c; if (txt.length > 10000) { req.destroy(); erro(new Error('grande')); } });
        req.on('end', () => { try { ok(JSON.parse(txt || '{}')); } catch (e) { erro(e); } });
        req.on('error', erro);
    });
}

async function api(req, res, url) {
    const dados = lerDados();

    if (url.pathname === '/api/irrigacoes' && req.method === 'GET') {
        return json(res, 200, ordenar(dados.irrigacoes));
    }
    if (url.pathname === '/api/irrigacoes' && req.method === 'POST') {
        let corpo;
        try { corpo = await lerCorpo(req); } catch (e) { return json(res, 400, { erro: 'JSON inválido' }); }
        const reg = validar(corpo);
        if (!reg) return json(res, 400, { erro: 'Dados inválidos' });
        dados.irrigacoes.push(reg);
        salvarDados(dados);
        return json(res, 201, reg);
    }
    const m = url.pathname.match(/^\/api\/irrigacoes\/([\w-]+)$/);
    if (m && req.method === 'DELETE') {
        const antes = dados.irrigacoes.length;
        dados.irrigacoes = dados.irrigacoes.filter((r) => r.id !== m[1]);
        if (dados.irrigacoes.length === antes) return json(res, 404, { erro: 'Não encontrado' });
        salvarDados(dados);
        return json(res, 200, { ok: true });
    }
    json(res, 404, { erro: 'Rota inexistente' });
}

function estatico(req, res, url) {
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const arquivo = path.normalize(path.join(PASTA, rel));
    const nome = path.basename(arquivo);
    const tipo = TIPOS[path.extname(arquivo)];
    if (!arquivo.startsWith(PASTA + path.sep) || !tipo || BLOQUEADOS.includes(nome)) {
        res.writeHead(404); return res.end('Não encontrado');
    }
    fs.readFile(arquivo, (err, conteudo) => {
        if (err) { res.writeHead(404); return res.end('Não encontrado'); }
        res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-cache' });
        res.end(conteudo);
    });
}

http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
        api(req, res, url).catch(() => json(res, 500, { erro: 'Erro interno' }));
    } else {
        estatico(req, res, url);
    }
}).listen(PORT, '0.0.0.0', () => {
    console.log(`\nHorta Escolar rodando!\n  Neste computador:  http://localhost:${PORT}`);
    for (const lista of Object.values(os.networkInterfaces())) {
        for (const i of lista) if (i.family === 'IPv4' && !i.internal) console.log(`  Outros aparelhos:  http://${i.address}:${PORT}`);
    }
    console.log('\nPara parar: Ctrl + C\n');
});
