// --- SIMULADOR: envia os dados para o painel principal (index.html) ---
let sensores = lerSensores();
let timerAuto = null;

const CENARIOS = {
    ideal:      { umidade: 68, temp: 22, ph: 6.5 },
    seca:       { umidade: 35, temp: 27, ph: 6.5 },
    encharcado: { umidade: 92, temp: 20, ph: 6.4 },
    calor:      { umidade: 50, temp: 33, ph: 6.5 },
    acido:      { umidade: 68, temp: 22, ph: 5.2 },
};

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
const sorteio = (amp) => (Math.random() * 2 - 1) * amp;

// Atualiza, salva (o painel principal lê isso) e redesenha
function aplicar(novo) {
    sensores = { ...sensores, ...novo, ts: Date.now() };
    transmitirSensores(sensores);
    sincronizarControles();
    renderSensores(sensores);
}

function sincronizarControles() {
    $('sim-umidade').value = sensores.umidade;
    $('sim-temp').value = sensores.temp;
    $('sim-ph').value = sensores.ph;
    $('sim-fase').value = sensores.fase;
    $('out-umidade').textContent = `${sensores.umidade}%`;
    $('out-temp').textContent = `${sensores.temp} °C`;
    $('out-ph').textContent = fmtNum(Number(sensores.ph).toFixed(1));
}

function passoAutomatico() {
    aplicar({
        umidade: Math.round(limitar(sensores.umidade + sorteio(4) - 0.5, 0, 100)), // tende a secar
        temp: Math.round(limitar(sensores.temp + sorteio(1.5), 5, 40)),
        ph: Math.round(limitar(sensores.ph + sorteio(0.15), 4, 9) * 10) / 10,
    });
}

// Se o painel principal mudar algo (ex.: registrar irrigação), reflete aqui
function receberExterno(novo) {
    if ((novo.ts || 0) > (sensores.ts || 0)) {
        sensores = novo;
        sincronizarControles();
        renderSensores(sensores);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    $('sim-umidade').addEventListener('input', (e) => aplicar({ umidade: Number(e.target.value) }));
    $('sim-temp').addEventListener('input', (e) => aplicar({ temp: Number(e.target.value) }));
    $('sim-ph').addEventListener('input', (e) => aplicar({ ph: parseFloat(e.target.value) }));
    $('sim-fase').addEventListener('change', (e) => aplicar({ fase: e.target.value }));

    document.querySelectorAll('[data-cenario]').forEach((btn) =>
        btn.addEventListener('click', () => aplicar(CENARIOS[btn.dataset.cenario])));

    $('btn-auto').addEventListener('click', () => {
        if (timerAuto) {
            clearInterval(timerAuto);
            timerAuto = null;
            $('btn-auto').textContent = 'Modo automático';
        } else {
            timerAuto = setInterval(passoAutomatico, 2000);
            $('btn-auto').textContent = 'Parar automático';
        }
    });

    $('btn-reset').addEventListener('click', () => aplicar(SENSORES_INICIAIS));

    escutarSensores(receberExterno, () => sensores);

    sincronizarControles();
    renderSensores(sensores);
});
