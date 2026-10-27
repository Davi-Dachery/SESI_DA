// --- CÓDIGO COMPARTILHADO ENTRE index.html E simulador.html ---
const $ = (id) => document.getElementById(id);
const fmtNum = (n) => String(n).replace('.', ',');

const CHAVE_SENSORES = 'horta:sensores';
const SENSORES_INICIAIS = { umidade: 68, temp: 22, ph: 6.5, fase: 'Floração' };

const FASES = {
    'Muda': 'Adaptação ao canteiro',
    'Crescimento': 'Folhas e caule crescendo',
    'Floração': 'Frutos em breve',
    'Frutificação': 'Frutos se formando',
    'Colheita': 'Hora de colher',
};

// Lê os sensores salvos pelo simulador (ou os valores padrão)
function lerSensores() {
    try {
        const j = JSON.parse(localStorage.getItem(CHAVE_SENSORES));
        if (j && typeof j.umidade === 'number') return { ...SENSORES_INICIAIS, ...j };
    } catch (e) { /* sem dados salvos */ }
    return { ...SENSORES_INICIAIS };
}

function salvarSensores(s) {
    try { localStorage.setItem(CHAVE_SENSORES, JSON.stringify(s)); } catch (e) { /* ignora */ }
}

// Faixas ideais para o tomateiro
function avaliar(v, min, max, textos) {
    if (v < min) return { alerta: true, texto: textos[0] };
    if (v > max) return { alerta: true, texto: textos[2] };
    return { alerta: false, texto: textos[1] };
}

// Desenha os 4 cards de sensores e as recomendações
function renderSensores(s) {
    const u = avaliar(s.umidade, 60, 80, ['Solo seco: irrigar', 'Ideal', 'Encharcado']);
    const t = avaliar(s.temp, 18, 26, ['Solo frio', 'Temperatura ótima', 'Solo quente']);
    const p = avaliar(s.ph, 6.0, 6.8, ['Solo ácido', 'Faixa ideal (6,0–6,8)', 'Solo alcalino']);

    $('sensor-umidade').textContent = `${s.umidade}%`;
    $('sensor-temp').textContent = `${s.temp} °C`;
    $('sensor-ph').textContent = fmtNum(Number(s.ph).toFixed(1));
    $('sensor-fase').textContent = s.fase;

    $('status-umidade').textContent = u.texto;
    $('status-temp').textContent = t.texto;
    $('status-ph').textContent = p.texto;
    $('status-fase').textContent = FASES[s.fase] || '';

    $('card-umidade').classList.toggle('alerta', u.alerta);
    $('card-temp').classList.toggle('alerta', t.alerta);
    $('card-ph').classList.toggle('alerta', p.alerta);

    const dicas = [];
    if (s.umidade < 60) dicas.push('Umidade baixa: registre uma irrigação.');
    if (s.umidade > 80) dicas.push('Solo encharcado: suspenda a rega e verifique a drenagem.');
    if (s.temp > 26) dicas.push('Solo quente: aplique cobertura morta (palha) para proteger as raízes.');
    if (s.temp < 18) dicas.push('Solo frio: o crescimento fica lento, evite regar à noite.');
    if (s.ph < 6.0) dicas.push('pH baixo: considere aplicar calcário para corrigir a acidez.');
    if (s.ph > 6.8) dicas.push('pH alto: adicione matéria orgânica para baixar o pH.');
    $('sensor-advice').textContent = dicas.length
        ? dicas.join(' ')
        : 'Todos os sensores estão na faixa ideal para o tomateiro.';
}

// --- COMUNICAÇÃO ENTRE AS DUAS PÁGINAS ---
// Usa 3 caminhos ao mesmo tempo, para funcionar em qualquer navegador:
// 1) postMessage entre a janela que abriu e a aberta  2) BroadcastChannel  3) localStorage
let canalSensores = null;
try { canalSensores = new BroadcastChannel('horta-sensores'); } catch (e) { /* sem suporte */ }
const janelasParceiras = new Set();

function transmitirSensores(s) {
    salvarSensores(s);
    const msg = { tipo: 'horta:sensores', dados: s };
    try { if (canalSensores) canalSensores.postMessage(msg); } catch (e) { /* ignora */ }
    try { if (window.opener && !window.opener.closed) window.opener.postMessage(msg, '*'); } catch (e) { /* ignora */ }
    janelasParceiras.forEach((w) => {
        if (w.closed) { janelasParceiras.delete(w); return; }
        try { w.postMessage(msg, '*'); } catch (e) { /* ignora */ }
    });
}

// aoReceber(novos) é chamada quando chegam dados; obterAtual() devolve os dados desta página
function escutarSensores(aoReceber, obterAtual) {
    const tratar = (d) => {
        if (d && typeof d.umidade === 'number') aoReceber({ ...SENSORES_INICIAIS, ...d });
    };

    window.addEventListener('message', (e) => {
        const m = e.data;
        if (!m || !e.source) return;
        if (m.tipo === 'horta:sensores') {
            if (e.source !== window) janelasParceiras.add(e.source);
            tratar(m.dados);
        } else if (m.tipo === 'horta:pedir') {
            janelasParceiras.add(e.source);
            try { e.source.postMessage({ tipo: 'horta:sensores', dados: obterAtual() }, '*'); } catch (err) { /* ignora */ }
        }
    });

    if (canalSensores) canalSensores.onmessage = (e) => { if (e.data && e.data.tipo === 'horta:sensores') tratar(e.data.dados); };
    window.addEventListener('storage', () => tratar(lerSensores()));
    setInterval(() => tratar(lerSensores()), 1000); // garantia extra

    // Se esta janela foi aberta por outra, pede os dados atuais
    try { if (window.opener) window.opener.postMessage({ tipo: 'horta:pedir' }, '*'); } catch (e) { /* ignora */ }
}
