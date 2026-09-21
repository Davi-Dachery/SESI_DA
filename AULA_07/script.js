let p1, p2, atual, tab = Array(9).fill('');
const combinacoes = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8],
  [0,4,8], [2,4,6]
];

function iniciar() {
  p1 = { nome: document.getElementById('j1').value || 'Jogador 1', simbolo: 'X' };
  p2 = { nome: document.getElementById('j2').value || 'Jogador 2', simbolo: 'O' };
  atual = p1;
  document.getElementById('status').innerText = 'Vez de: ' + atual.nome;
  document.getElementById('game').style.display = 'block';
}

function jogar(celula, pos) {
  if (tab[pos] !== '') return;
  
  tab[pos] = atual.simbolo;
  celula.innerText = atual.simbolo;

  if (combinacoes.some(c => c.every(i => tab[i] === atual.simbolo))) {
    setTimeout(() => { alert(atual.nome + ' venceu!'); location.reload(); }, 10);
  } else if (!tab.includes('')) {
    setTimeout(() => { alert('Empate!'); location.reload(); }, 10);
  } else {
    atual = atual === p1 ? p2 : p1;
    document.getElementById('status').innerText = 'Vez de: ' + atual.nome;
  }
}