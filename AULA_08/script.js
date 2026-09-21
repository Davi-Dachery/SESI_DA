
function login(){
  const valor_usuario = document.getElementById("usuario").value;
  const valor_senha = document.getElementById("senha").value;
  const mensagem = document.getElementById("mensagem");

  const usuarioSalvo = localStorage.getItem("usuario")
  const senhaSalva = localStorage.getItem("senha")
  if (valor_usuario === "" || valor_senha === "") {
    mensagem.textContent = "Preencha usuário e senha.";
    mensagem.style.color = "orange";
    return;
  }

  if (valor_usuario === usuarioSalvo && valor_senha === senhaSalva) {
    mensagem.textContent = "Login realizado com sucesso!";
    mensagem.style.color = "green";
  } else {
    mensagem.textContent = "Usuário ou senha incorretos.";
    mensagem.style.color = "red";
  }
}
