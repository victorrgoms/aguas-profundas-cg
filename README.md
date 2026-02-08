# 🌊 Águas Profundas (Deep Waters)   

> **Passeio Virtual 3D desenvolvido em WebGL puro.**

Este projeto é uma aplicação gráfica 3D interativa desenvolvida como parte da avaliação da disciplina de Computação Gráfica. O objetivo é simular um ambiente de sobrevivência em alto mar, onde o usuário controla um sobrevivente em uma jangada, explorando um oceano infinito gerado proceduralmente.

---

## 📺 Vídeo de Demonstração
**Assista à execução do projeto no YouTube:**
> [https://youtu.be/8jNNM8hCD8E](https://youtu.be/8jNNM8hCD8E)

---
---

## 📺 Link Slides
**Slides no drive:**
> [https://docs.google.com/presentation/d/1vRzHRAz5WHDOogo1TK9Er2VYQHbb8a1BkWFjfS8GMzY/edit?usp=drive_link](https://docs.google.com/presentation/d/1vRzHRAz5WHDOogo1TK9Er2VYQHbb8a1BkWFjfS8GMzY/edit?usp=drive_link)

---

## 🎮 Descrição e Lore

**"O Grande Azul"**

Ninguém sabe exatamente quando as águas pararam de subir, apenas que elas levaram tudo. As grandes cidades agora são recifes submersos. Você é um **Drifter**, um sobrevivente solitário navegando em uma jangada improvisada feita de destroços do velho mundo.

Guiado apenas pela luz da sua tocha e pelas estrelas, você navega pela imensidão, enfrentando a solidão e o mar infinito, em busca da lendária *Terra Firme*.

### 🕹️ Controles

| Tecla / Ação | Função |
| :--- | :--- |
| **W, A, S, D** | Mover-se (Frente, Trás, Esquerda, Direita) |
| **Mouse** | Olhar ao redor (Câmera em 1ª Pessoa) |
| **ESC** | Pausar o jogo / Abrir Menu / Destravar Mouse |
| **Clique** | Iniciar / Travar Mouse na tela |

---

## ✅ Requisitos Técnicos Implementados

O projeto atende aos requisitos da disciplina utilizando **WebGL 2.0** sem bibliotecas gráficas de alto nível (como Three.js).

### 1. Requisitos Gerais e Específicos
* [x] **Câmera em 1ª Pessoa:** Sistema de câmera livre controlado por Mouse e Teclado.
* [x] **Iluminação de Phong:** Implementada nos Shaders (`fsSource`), calculando componentes Ambiente, Difusa e Especular.
* [x] **Fonte de Luz Móvel:** Uma tocha dinâmica que segue a mão do jogador e ilumina o cenário em tempo real.
* [x] **Transformações Geométricas:** Animação de rotação nos cubos de decoração e movimentação dos destroços/pássaros.
* [x] **Texturização:** Aplicação de texturas na jangada, caixas e vela.
* [x] **Cenário Construído Manualmente:** Toda a geometria (Jangada, Mar, Céu) é gerada via código (`main.js` e `utils.js`), sem importação de modelos externos.

### 2. Extras e Bônus (Criatividade)
* [x] **Shader de Água:** Vertex Shader personalizado que deforma a malha da água usando funções senoidais (`sin/cos`) para criar ondas orgânicas.
* [x] **Skybox:** Cubemap implementado manualmente para criar o céu e o horizonte infinito.
* [x] **Fog (Neblina):** Implementação de neblina linear no Fragment Shader para suavizar o horizonte e esconder o fim do mapa.
* [x] **Menu Interativo:** Interface HTML/CSS sobreposta ao Canvas para Menu Principal, Lore e HUD.
* [x] **Imersão:** Pássaros voando em círculos e destroços flutuando que acompanham o movimento das ondas.

---

## 🚀 Tutorial de Execução

Como este projeto utiliza **WebGL** e carrega texturas externas (imagens `.jpg`), ele **não pode ser aberto diretamente** clicando duas vezes no `index.html` devido à política de segurança CORS (Cross-Origin Resource Sharing) dos navegadores.

É necessário rodar o projeto através de um **Servidor Local**. Escolha uma das opções abaixo:

### Opção 1: VS Code (Recomendado)
1.  Instale a extensão **Live Server** no Visual Studio Code.
2.  Abra a pasta do projeto no VS Code.
3.  Clique com o botão direito no arquivo `index.html`.
4.  Selecione **"Open with Live Server"**.
5.  O navegador abrirá automaticamente o jogo.

### Opção 2: Python (Terminal)
Se você tem Python instalado no computador:
1.  Abra o terminal na pasta do projeto.
2.  Execute o comando:
    ```bash
    python -m http.server
    ```
3.  Abra seu navegador e acesse: `http://localhost:8000`

### Opção 3: Node.js (http-server)
Se você tem Node.js instalado:
1.  Instale o pacote globalmente: `npm install -g http-server`
2.  Na pasta do projeto, rode: `http-server`
3.  Acesse o endereço mostrado no terminal.

---

## 🛠️ Estrutura de Arquivos

* `index.html`: Estrutura da página, Canvas e Interface (Menu).
* `style.css`: Estilização da interface e reset do navegador.
* `js/main.js`: Lógica principal, loop de renderização, controle de input e setup da cena.
* `js/shaders.js`: Código GLSL (Vertex e Fragment Shaders) para iluminação, água e skybox.
* `js/utils.js`: Funções utilitárias para compilação de shaders, carregamento de texturas e matemática auxiliar.
* `assets/`: Pasta contendo as imagens de textura e skybox.

---

## 👨‍💻 Créditos

Desenvolvido por **Victor Gomes**.
Biblioteca auxiliar utilizada para Álgebra Linear: [gl-matrix](https://glmatrix.net/).  
