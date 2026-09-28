// CADASTRAR FILME

function cadastrar() {

    let nome =
        document.getElementById("nome").value;

    let imagem =
        document.getElementById("imagem").files[0];


    if (nome == "" || imagem == null) {

        document.getElementById("mensagem").innerHTML =
            "Preencha o nome e escolha uma imagem!";

        return;

    }


    let leitor = new FileReader();


    leitor.onload = function() {

        let filme = {

            nome: nome,

            imagem: leitor.result

        };


        localStorage.setItem(
            "filme",
            JSON.stringify(filme)
        );


        document.getElementById("mensagem").innerHTML =
            "Filme cadastrado com sucesso!";


        setTimeout(function() {

            window.location.href = "index.html";

        }, 1000);

    };


    leitor.readAsDataURL(imagem);

}


// MOSTRAR FILME CADASTRADO

function mostrarFilme() {

    let filme = JSON.parse(
        localStorage.getItem("filme")
    );


    if (filme == null) {

        return;

    }


    let lista =
        document.querySelector(".lista-filmes");


    if (lista == null) {

        return;

    }


    let div =
        document.createElement("div");


    div.className = "filme";


    div.innerHTML = `

        <a href="sessoes.html">

            <img
                src="${filme.imagem}"
                alt="${filme.nome}"
            >

        </a>

        <p>${filme.nome}</p>

        <a href="sessoes.html">

            ◉ Sessões

        </a>

    `;


    lista.appendChild(div);

}


mostrarFilme();