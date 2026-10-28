// --- DADOS ---
// Com o servidor (node server.js) os registros ficam salvos para todos os navegadores.
// Sem servidor, ficam salvos só neste navegador (localStorage).
const CHAVE_IRRIGACOES = 'horta:irrigacoes';
const REGISTROS_INICIAIS = [
    { id: 'i4', data: '2026-10-06', hora: '08:00', volume: 6,   metodo: 'Gotejamento' },
    { id: 'i3', data: '2026-10-05', hora: '17:30', volume: 5,   metodo: 'Gotejamento' },
    { id: 'i2', data: '2026-10-04', hora: '08:15', volume: 6,   metodo: 'Regador manual' },
    { id: 'i1', data: '2026-10-03', hora: '08:00', volume: 4.5, metodo: 'Gotejamento' },
];

let historico = [];
let modoArmazenamento = 'local'; // 'servidor' ou 'local'

const ordenarHistorico = () => historico.sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function lerLocal() {
    try {
        const j = JSON.parse(localStorage.getItem(CHAVE_IRRIGACOES));
        if (Array.isArray(j)) return j;
    } catch (e) { /* sem dados salvos */ }
    return REGISTROS_INICIAIS.map((r) => ({ ...r }));
}

function salvarLocal() {
    try { localStorage.setItem(CHAVE_IRRIGACOES, JSON.stringify(historico)); } catch (e) { /* ignora */ }
}

async function carregarHistorico() {
    let lista = null;
    if (location.protocol.startsWith('http')) {
        try {
            const r = await fetch('/api/irrigacoes', { cache: 'no-store' });
            if (!r.ok) throw new Error(r.status);
            lista = await r.json();
            modoArmazenamento = 'servidor';
        } catch (e) { /* sem servidor: usa o navegador */ }
    }
    if (!lista) { lista = lerLocal(); modoArmazenamento = 'local'; }

    if (JSON.stringify(lista) !== JSON.stringify(historico)) {
        historico = lista;
        ordenarHistorico();
        renderTabela();
        atualizarGrafico();
    }
    renderStatusArmazenamento();
}

async function adicionarRegistro(reg) {
    if (modoArmazenamento === 'servidor') {
        const r = await fetch('/api/irrigacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reg),
        });
        if (!r.ok) throw new Error('Falha ao salvar');
        reg = await r.json();
    } else {
        reg.id = String(Date.now());
    }
    historico.push(reg);
    ordenarHistorico();
    if (modoArmazenamento === 'local') salvarLocal();
}

async function excluirRegistro(id) {
    if (modoArmazenamento === 'servidor') {
        const r = await fetch('/api/irrigacoes/' + encodeURIComponent(id), { method: 'DELETE' });
        if (!r.ok && r.status !== 404) throw new Error('Falha ao excluir');
    }
    historico = historico.filter((r) => r.id !== id);
    if (modoArmazenamento === 'local') salvarLocal();
}

function renderStatusArmazenamento() {
    $('armazenamento-status').textContent = modoArmazenamento === 'servidor'
        ? 'Registros salvos no servidor: aparecem em qualquer navegador.'
        : 'Registros salvos só neste navegador. Para salvar em todos, abra o site pelo servidor (node server.js).';
}

let grafico = null;

const fmtData = (iso) => iso.split('-').reverse().join('/');

// --- TABELA ---
function renderTabela() {
    $('irrigation-table-body').innerHTML = historico.map(r => `
        <tr>
            <td>${fmtData(r.data)}</td>
            <td>${esc(r.hora)}</td>
            <td>${fmtNum(r.volume)} L</td>
            <td>${esc(r.metodo)}</td>
            <td><button class="btn-del" type="button" data-id="${esc(r.id)}" aria-label="Excluir registro de ${fmtData(r.data)} às ${esc(r.hora)}">Excluir</button></td>
        </tr>`).join('');
}

// --- GRÁFICO (últimos 7 registros, do mais antigo ao mais novo) ---
function dadosGrafico() {
    const ultimos = historico.slice(0, 7).reverse();
    return {
        labels: ultimos.map(r => fmtData(r.data).slice(0, 5)),
        valores: ultimos.map(r => r.volume),
    };
}

function criarGrafico() {
    if (typeof Chart === 'undefined') return; // CDN indisponível: o resto continua funcionando
    const { labels, valores } = dadosGrafico();
    grafico = new Chart($('irrigationChart'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Litros', data: valores, backgroundColor: '#c8402a', borderRadius: 3 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Litros' } } },
        },
    });
}

function atualizarGrafico() {
    if (!grafico) return;
    const { labels, valores } = dadosGrafico();
    grafico.data.labels = labels;
    grafico.data.datasets[0].data = valores;
    grafico.update();
}

// --- MODAL ---
function abrirModal() {
    const agora = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    $('data').value = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}`;
    $('hora').value = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
    $('modal').hidden = false;
    $('volume').focus();
}

function fecharModal() {
    $('modal').hidden = true;
    $('irrigation-form').reset();
}

// --- PREVISÃO DO TEMPO (Dois Vizinhos, PR) ---
// Dados de reserva (previsão de 20/10/2026), usados se a busca online falhar.
let previsao = {
    atual: { temp: 23, desc: 'Ensolarado' },
    dias: [
        ['2026-10-20', 11, 28, 10], ['2026-10-21', 18, 24, 75], ['2026-10-22', 18, 19, 85],
        ['2026-10-23', 18, 22, 85], ['2026-10-24', 19, 22, 85], ['2026-10-25', 12, 25, 15],
        ['2026-10-26', 14, 25, 10], ['2026-10-27', 17, 24, 65],
    ].map(([data, min, max, chuva]) => ({ data, min, max, chuva })),
    fonte: 'Dados de 20/10/2026',
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function descricaoClima(codigo) {
    if (codigo === 0) return 'Céu limpo';
    if (codigo <= 3) return 'Parcialmente nublado';
    if (codigo <= 48) return 'Neblina';
    if (codigo <= 67 || (codigo >= 80 && codigo <= 82)) return 'Chuva';
    if (codigo >= 95) return 'Tempestade';
    return 'Nublado';
}

function renderPrevisao() {
    $('weather-now').textContent = `${previsao.atual.temp} °C`;
    $('weather-now-desc').textContent = previsao.atual.desc;
    $('weather-source').textContent = previsao.fonte;

    $('forecast-days').innerHTML = previsao.dias.map((d, i) => {
        const [a, m, dia] = d.data.split('-').map(Number);
        const nome = i === 0 ? 'Hoje' : DIAS_SEMANA[new Date(a, m - 1, dia).getDay()];
        return `<div class="day ${d.chuva >= 60 ? 'wet' : ''}">
            <b>${nome} ${String(dia).padStart(2, '0')}/${String(m).padStart(2, '0')}</b>
            <span>${d.min}° / ${d.max}°</span>
            <span class="rain">Chuva ${d.chuva}%</span>
        </div>`;
    }).join('');

    // Recomendação de irrigação
    const [hoje, amanha] = previsao.dias;
    let dica;
    if (hoje.chuva >= 60) dica = 'Chuva provável hoje: dispense a irrigação e confira a drenagem dos canteiros.';
    else if (amanha && amanha.chuva >= 60) dica = 'Chuva provável amanhã: irrigue hoje de manhã cedo ou no fim da tarde e pule a rega de amanhã.';
    else dica = 'Sem chuva à vista: irrigue de manhã cedo ou no fim da tarde para evitar perda por evaporação.';
    $('irrigation-advice').textContent = dica;
}

async function buscarPrevisao() {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=-25.7408&longitude=-53.0575'
        + '&current=temperature_2m,weather_code'
        + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max'
        + '&timezone=America%2FSao_Paulo&forecast_days=8';
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(r.status);
        const j = await r.json();
        previsao = {
            atual: { temp: Math.round(j.current.temperature_2m), desc: descricaoClima(j.current.weather_code) },
            dias: j.daily.time.map((data, i) => ({
                data,
                min: Math.round(j.daily.temperature_2m_min[i]),
                max: Math.round(j.daily.temperature_2m_max[i]),
                chuva: j.daily.precipitation_probability_max[i],
            })),
            fonte: 'Atualizado agora (Open-Meteo)',
        };
    } catch (e) {
        // mantém os dados de reserva
    }
    renderPrevisao();
}

// --- SENSORES (os dados vêm do simulador.html) ---
let sensores = lerSensores();

function atualizarPainelSensores() {
    renderSensores(sensores);
    $('sensor-fonte').textContent = sensores.ts
        ? `Dados do simulador · atualizado às ${new Date(sensores.ts).toLocaleTimeString('pt-BR')}`
        : 'Valores padrão · abra o simulador para alterar';
}

// Chegaram dados novos do simulador
function receberSensores(novo) {
    if ((novo.ts || 0) > (sensores.ts || 0)) {
        sensores = novo;
        atualizarPainelSensores();
    }
}

// Abre o simulador numa aba e guarda a janela para conversar com ela
function abrirSimulador(e) {
    const w = window.open('simulador.html', 'simulador');
    if (w) {
        e.preventDefault();
        janelasParceiras.add(w);
    }
}

// --- EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    criarGrafico();
    carregarHistorico();
    setInterval(() => { if (modoArmazenamento === 'servidor') carregarHistorico(); }, 15000);
    atualizarPainelSensores();
    escutarSensores(receberSensores, () => sensores);
    $('link-simulador').addEventListener('click', abrirSimulador);
    renderPrevisao();
    buscarPrevisao();
    setInterval(buscarPrevisao, 30 * 60 * 1000); // atualiza a cada 30 minutos

    $('btn-open-modal').addEventListener('click', abrirModal);
    $('btn-cancel-modal').addEventListener('click', fecharModal);
    $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) fecharModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModal(); });

    $('irrigation-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const volume = parseFloat($('volume').value);
        try {
            await adicionarRegistro({
                data: $('data').value,
                hora: $('hora').value,
                volume,
                metodo: $('metodo').value,
            });
        } catch (err) {
            alert('Não foi possível salvar o registro. Verifique se o servidor está rodando.');
            return;
        }
        renderTabela();
        atualizarGrafico();
        // irrigar sobe a umidade (~2% por litro) e avisa o simulador
        sensores = { ...sensores, umidade: Math.min(100, Math.round(sensores.umidade + volume * 2)), ts: Date.now() };
        transmitirSensores(sensores);
        atualizarPainelSensores();
        fecharModal();
    });

    // Excluir registro (botão em cada linha)
    $('irrigation-table-body').addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-id]');
        if (!btn) return;
        const reg = historico.find((r) => r.id === btn.dataset.id);
        if (!reg || !confirm(`Excluir a irrigação de ${fmtData(reg.data)} às ${reg.hora} (${fmtNum(reg.volume)} L)?`)) return;
        try {
            await excluirRegistro(reg.id);
        } catch (err) {
            alert('Não foi possível excluir o registro. Verifique se o servidor está rodando.');
            return;
        }
        renderTabela();
        atualizarGrafico();
    });

    // Estimativa: ~3 kg e ~30 frutos por pé
    $('calc-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const n = parseInt($('num-plantas').value, 10);
        if (!n || n < 1) return;
        const out = $('calc-result');
        out.innerHTML = `Cerca de <b>${n * 3} kg</b> de tomates (≈ <b>${n * 30}</b> frutos).`;
        out.hidden = false;
    });
});
