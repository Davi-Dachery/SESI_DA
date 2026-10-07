// --- DADOS INICIAIS DA IRRIGAÇÃO ---
let historicoIrrigacao = [
    { data: '2026-10-06', hora: '08:00', volume: 6, metodo: 'Gotejamento', status: 'Concluído' },
    { data: '2026-10-05', hora: '17:30', volume: 5, metodo: 'Gotejamento', status: 'Concluído' },
    { data: '2026-10-04', hora: '08:15', volume: 6, metodo: 'Regador Manual', status: 'Concluído' },
    { data: '2026-10-03', hora: '08:00', volume: 4.5, metodo: 'Gotejamento', status: 'Concluído' },
];

let myChart = null;

// --- INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
    carregarTabela();
    inicializarGrafico();
    configurarEventos();
});

// --- RENDERIZAR TABELA ---
function carregarTabela() {
    const tbody = document.getElementById('irrigation-table-body');
    tbody.innerHTML = '';

    historicoIrrigacao.forEach(item => {
        // Formatar data (AAAA-MM-DD para DD/MM/AAAA)
        const partesData = item.data.split('-');
        const dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${item.hora}</td>
            <td>${item.volume} L</td>
            <td>${item.metodo}</td>
            <td><span class="badge-status success">${item.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- GRÁFICO (CHART.JS) ---
function inicializarGrafico() {
    const ctx = document.getElementById('irrigationChart').getContext('2d');

    // Organizar dados para o gráfico (Últimos registros)
    const labels = historicoIrrigacao.slice().reverse().map(item => {
        const p = item.data.split('-');
        return `${p[2]}/${p[1]}`;
    });

    const dados = historicoIrrigacao.slice().reverse().map(item => item.volume);

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Volume de Água (Litros)',
                data: dados,
                borderColor: '#0288d1',
                backgroundColor: 'rgba(2, 136, 209, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointBackgroundColor: '#0288d1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Litros (L)' }
                }
            }
        }
    });
}

// --- ATUALIZAR GRÁFICO APÓS NOVO REGISTRO ---
function atualizarGrafico() {
    if (!myChart) return;

    const labels = historicoIrrigacao.slice().reverse().map(item => {
        const p = item.data.split('-');
        return `${p[2]}/${p[1]}`;
    });

    const dados = historicoIrrigacao.slice().reverse().map(item => item.volume);

    myChart.data.labels = labels;
    myChart.data.datasets[0].data = dados;
    myChart.update();
}

// --- CONFIGURAÇÃO DE EVENTOS E MODAL ---
function configurarEventos() {
    const modal = document.getElementById('modal');
    const btnOpen = document.getElementById('btn-open-modal');
    const btnClose = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-cancel-modal');
    const formIrrigacao = document.getElementById('irrigation-form');
    const formCalc = document.getElementById('calc-form');}

    // Abrir Modal
    btnOpen.addEventListener('click', () => {
        // Preencher data e hora atuais no formulário
        const hoje = new Date();
        document.getElementById('data').value = hoje.toISOString().split('T')[0];
        document.getElementById('hora').value = hoje.toTimeString().substring(0, 5);
        modal.classList.add('active');
    });

    // Fechar Modal
    const fecharModal = () => modal.classList.remove('active');
    btnClose.addEventListener('click', fecharModal);
    btnCancel.addEventListener('click', fecharModal);

    // Submeter Novo Registro
    formIrrigacao.addEventListener('submit', (e) => {
        e.preventDefault();

        const novoRegistro = {
            data: document.getElementById('data').value,
            hora: document.getElementById('hora').value,
            volume: parseFloat(document.getElementById('volume').value),
            metodo: document.getElementById('metodo').value,
            status: 'Concluído'
        };

        // Adiciona no início da lista
        historicoIrrigacao.unshift(novoRegistro);

        // Atualiza a tela
        carregarTabela();
        atualizarGrafico();
        fecharModal();
        formIrrigacao.reset();
    });

    // Calculadora de Colheita
    formCalc.addEventListener('submit'), (e) => {
        e.preventDefault();
        const numPlantas = parseInt(document.getElementById('num') );
    }