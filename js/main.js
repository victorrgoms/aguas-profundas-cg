// js/main.js
// Ponto de entrada da aplicação. Gerencia input, câmera e renderização.

import { createShader, createProgram, loadTexture, loadCubemap, createWaterGrid } from './utils.js';
import { vsSource, fsSource, skyboxVsSource, skyboxFsSource, waterVsSource, waterFsSource } from './shaders.js';

// Biblioteca glMatrix (Matemática Vetorial)
const mat4 = window.mat4;
const vec3 = window.vec3;
const glMatrixUtils = window.glMatrix;

// --- VARIÁVEIS GLOBAIS ---
let canvas, gl;
let program, skyboxProgram, waterProgram;
let cubeVAO, skyboxVAO, waterVAO, sailClothVAO, birdVAO;
let boxTexture, woodFloorTexture, skyboxTexture, sailTexture;

// --- ÁUDIO ---
const audioAmbient = new Audio('./assets/sounds/ocean.wav');
const audioClick = new Audio('./assets/sounds/click.wav');

audioAmbient.oncanplaythrough = () => console.log("Áudio do mar carregado e pronto!");
audioAmbient.onerror = () => console.error("Erro ao carregar arquivo de áudio. Verifique o nome/caminho.");

// Controle de Estado (Menu ou Jogo)
let gameState = "MENU"; 

// REQUISITO ESPECÍFICO I: Câmera em Primeira Pessoa
const playerHeight = 1.6;
let cameraPos = vec3.fromValues(0, playerHeight, 10.0);
let cameraFront = vec3.fromValues(0, 0, -1); 
let cameraUp = vec3.fromValues(0, 1, 0);     

// Configurações da Jangada
const raftScaleX = 4.0; const raftScaleZ = 7.0; 
const boundaryX = (raftScaleX / 2) - 0.2; 
const boundaryZ = (raftScaleZ / 2) - 0.2;

// Controle de Visão (Mouse)
let yaw = -90; let pitch = 0; 
const keys = {};

// Matrizes de Transformação (Model, View, Projection)
const projectionMatrix = mat4.create();
const viewMatrix = mat4.create();
const modelMatrix = mat4.create();
let cullFaceCheckbox; 

// --- OBJETOS DA CENA ---
// Caixas flutuando (Destroços)
const debris = [
    { x: -5, z: 20, speed: 2.0, rot: 0 },
    { x: 8,  z: 40, speed: 2.5, rot: 45 },
    { x: -12, z: 60, speed: 1.8, rot: 90 },
    { x: 3,  z: 90, speed: 2.2, rot: 10 }
];

// Pássaros voando em círculo
const birds = [
    { r: 15, y: 12, speed: 0.5, angle: 0 },
    { r: 25, y: 18, speed: 0.3, angle: 3.14 },
    { r: 10, y: 9, speed: 0.6, angle: 1.5 }
];

// Iluminação
const sunDir = vec3.fromValues(1.0, 0.3, 0.0); 
const sunColor = vec3.fromValues(1.0, 0.6, 0.3); 
const torchColor = vec3.fromValues(1.0, 0.8, 0.4); 
let moveRight = vec3.create();
let torchPosWorld = vec3.create(); // Posição calculada da tocha na mão

// --- DADOS DE VÉRTICES (GEOMETRIA) ---

// --- DADOS DE VÉRTICES (GEOMETRIA) ---

// Cubo Skybox (Invertido)
const skyboxData = new Float32Array([
    -1, 1, -1,  -1, -1, -1,  1, -1, -1,  1, -1, -1,  1, 1, -1,  -1, 1, -1,
    -1, -1, 1,  -1, -1, -1,  -1, 1, -1,  -1, 1, -1,  -1, 1, 1,  -1, -1, 1,
    1, -1, -1,  1, -1, 1,  1, 1, 1,  1, 1, 1,  1, 1, -1,  1, -1, -1,
    -1, -1, 1,  -1, 1, 1,  1, 1, 1,  1, 1, 1,  1, -1, 1,  -1, -1, 1,
    -1, 1, -1,  1, 1, -1,  1, 1, 1,  1, 1, 1,  -1, 1, 1,  -1, 1, -1,
    -1, -1, -1,  -1, -1, 1,  1, -1, -1,  1, -1, -1,  -1, -1, 1,  1, -1, 1
]);

// Cubo Padrão (Com Normais e UVs)
// Formato: X,Y,Z,  NX,NY,NZ,  U,V
const cubeData = new Float32Array([
    // Front face
    -0.5, -0.5,  0.5,  0, 0,  1,  0, 0,
     0.5, -0.5,  0.5,  0, 0,  1,  1, 0,
     0.5,  0.5,  0.5,  0, 0,  1,  1, 1,
     0.5,  0.5,  0.5,  0, 0,  1,  1, 1,
    -0.5,  0.5,  0.5,  0, 0,  1,  0, 1,
    -0.5, -0.5,  0.5,  0, 0,  1,  0, 0,
    // Back face
    -0.5, -0.5, -0.5,  0, 0, -1,  0, 0,
    -0.5,  0.5, -0.5,  0, 0, -1,  0, 1,
     0.5,  0.5, -0.5,  0, 0, -1,  1, 1,
     0.5,  0.5, -0.5,  0, 0, -1,  1, 1,
     0.5, -0.5, -0.5,  0, 0, -1,  1, 0,
    -0.5, -0.5, -0.5,  0, 0, -1,  0, 0,
    // Left face
    -0.5,  0.5,  0.5, -1, 0, 0,  1, 0,
    -0.5,  0.5, -0.5, -1, 0, 0,  1, 1,
    -0.5, -0.5, -0.5, -1, 0, 0,  0, 1,
    -0.5, -0.5, -0.5, -1, 0, 0,  0, 1,
    -0.5, -0.5,  0.5, -1, 0, 0,  0, 0,
    -0.5,  0.5,  0.5, -1, 0, 0,  1, 0,
    // Right face
     0.5,  0.5,  0.5,  1, 0, 0,  1, 0,
     0.5, -0.5, -0.5,  1, 0, 0,  0, 1,
     0.5,  0.5, -0.5,  1, 0, 0,  1, 1,
     0.5, -0.5, -0.5,  1, 0, 0,  0, 1,
     0.5,  0.5,  0.5,  1, 0, 0,  1, 0,
     0.5, -0.5,  0.5,  1, 0, 0,  0, 0,
    // Top face
    -0.5,  0.5, -0.5,  0, 1, 0,  0, 1,
    -0.5,  0.5,  0.5,  0, 1, 0,  0, 0,
     0.5,  0.5,  0.5,  0, 1, 0,  1, 0,
     0.5,  0.5,  0.5,  0, 1, 0,  1, 0,
     0.5,  0.5, -0.5,  0, 1, 0,  1, 1,
    -0.5,  0.5, -0.5,  0, 1, 0,  0, 1,
    // Bottom face
    -0.5, -0.5, -0.5,  0, -1, 0,  0, 1,
     0.5, -0.5, -0.5,  0, -1, 0,  1, 1,
     0.5, -0.5,  0.5,  0, -1, 0,  1, 0,
     0.5, -0.5,  0.5,  0, -1, 0,  1, 0,
    -0.5, -0.5,  0.5,  0, -1, 0,  0, 0,
    -0.5, -0.5, -0.5,  0, -1, 0,  0, 1
]);

// Geometria da Gaivota (Simples V)
// Formato: X,Y,Z,  NX,NY,NZ,  U,V
const birdData = new Float32Array([
     0.0,  0.0,  0.0,  0, 1, 0,  0, 0, // Centro
    -0.5,  0.0,  0.5,  0, 1, 0,  0, 0, // Asa Esq
    -0.2,  0.0, -0.2,  0, 1, 0,  0, 0, // Trás
     0.0,  0.0,  0.0,  0, 1, 0,  0, 0, // Centro
     0.5,  0.0,  0.5,  0, 1, 0,  0, 0, // Asa Dir
     0.2,  0.0, -0.2,  0, 1, 0,  0, 0  // Trás
]);

// Helper para criar Buffer na GPU
function createShape(gl, data) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    
    // Configura os atributos (Layout no Shader)
    // 0: Posição (3 floats)
    // 1: Normal (3 floats)
    // 2: TexCoord (2 floats)
    const stride = 8 * 4; // 8 floats por vértice * 4 bytes
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0); gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12); gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 24); gl.enableVertexAttribArray(2);
    return vao;
}

// --- SETUP INICIAL ---
function init() {
    canvas = document.getElementById("glcanvas");
    gl = canvas.getContext("webgl2");
    if (!gl) return;

    // --- CORREÇÃO: CONFIGURAR ÁUDIO AQUI ---
    audioAmbient.loop = true; // Repete o som do mar infinitamente
    audioAmbient.volume = 0.5; // 50% do volume
    // ---------------------------------------
    
    // ... resto do seu código ...
    // Controle da UI e Ponteiro do Mouse
    const mainMenu = document.getElementById('main-menu');
    const uiGame = document.getElementById('ui-game');
    const btnStart = document.getElementById('btn-start');
    const btnLore = document.getElementById('btn-lore');
    const loreModal = document.getElementById('lore-modal');

    // REQUISITO ESPECÍFICO II: Controle de Câmera (Pointer Lock API)
   // Eventos de Menu
    // Eventos de Menu
    btnStart.addEventListener('click', () => { 
        // Tenta travar o mouse (PC)
        canvas.requestPointerLock();
        
        // Toca o som do mar quando o jogo começa
        audioAmbient.play().catch(e => console.log("Erro ao tocar áudio:", e));
        
        // Toca o som de clique
        audioClick.currentTime = 0; 
        audioClick.play();

        // --- CORREÇÃO PARA CELULAR (Força o início) ---
        setTimeout(() => {
            if (document.pointerLockElement !== canvas) {
                // Se não travou o mouse (é celular), inicia mesmo assim
                gameState = "PLAYING";
                mainMenu.style.display = 'none';
                uiGame.style.display = 'block';
            }
        }, 100);
    });

    // Opcional: Som nos outros botões
    btnLore.addEventListener('click', () => { 
        audioClick.currentTime = 0; 
        audioClick.play();
        loreModal.classList.remove('hidden'); 
    });
    
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) {
            gameState = "PLAYING";
            mainMenu.style.display = 'none';
            uiGame.style.display = 'block';
            
            audioAmbient.play(); // Garante que volta a tocar
        } else {
            gameState = "MENU";
            mainMenu.style.display = 'flex';
            uiGame.style.display = 'none';
            
            audioAmbient.pause(); // Pausa o barulho do mar no menu (ou deixa tocando se preferir)
        }
    });

    // Movimento do Mouse (Olhar)
    document.addEventListener('mousemove', (e) => {
        if (gameState === "PLAYING" && document.pointerLockElement === canvas) {
            yaw += e.movementX * 0.1; 
            pitch -= e.movementY * 0.1;
            // Trava para não quebrar o pescoço (Gimbal Lock preventivo)
            if (pitch > 89.0) pitch = 89.0; if (pitch < -89.0) pitch = -89.0;
        }
    });

    // Teclado
    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    // ... (logo abaixo de window.addEventListener('keyup'... )

    // --- CONTROLE DE TOQUE (PARA CELULAR) ---
    let lastTouchX = 0;
    let lastTouchY = 0;

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            lastTouchX = e.touches[0].pageX;
            lastTouchY = e.touches[0].pageY;
        }
    }, {passive: false});

    canvas.addEventListener('touchmove', (e) => {
        if (gameState === "PLAYING" && e.touches.length > 0) {
            // Evita que a tela role para baixo
            e.preventDefault();

            const touchX = e.touches[0].pageX;
            const touchY = e.touches[0].pageY;

            const deltaX = touchX - lastTouchX;
            const deltaY = touchY - lastTouchY;

            // Ajusta a sensibilidade (0.2 fica bom no celular)
            yaw += deltaX * 0.4;
            pitch -= deltaY * 0.4;

            // Trava para não quebrar o pescoço
            if (pitch > 89.0) pitch = 89.0; 
            if (pitch < -89.0) pitch = -89.0;

            lastTouchX = touchX;
            lastTouchY = touchY;
        }
    }, {passive: false});

    cullFaceCheckbox = document.getElementById('cullFace');

    // Compila Shaders
    program = createProgram(gl, createShader(gl, gl.VERTEX_SHADER, vsSource), createShader(gl, gl.FRAGMENT_SHADER, fsSource));
    skyboxProgram = createProgram(gl, createShader(gl, gl.VERTEX_SHADER, skyboxVsSource), createShader(gl, gl.FRAGMENT_SHADER, skyboxFsSource));
    waterProgram = createProgram(gl, createShader(gl, gl.VERTEX_SHADER, waterVsSource), createShader(gl, gl.FRAGMENT_SHADER, waterFsSource));

    // Cria os objetos
    cubeVAO = createShape(gl, cubeData);
    // REQUISITO ESPECÍFICO IV: Cenário construído manualmente no código
    waterVAO = createShape(gl, createWaterGrid(800, 800, 300)); // Mar gigante
    sailClothVAO = createShape(gl, createWaterGrid(3.0, 2.5, 20)); // Pano da vela
    birdVAO = createShape(gl, birdData);
    
    // Skybox (Vértices manuais)
    skyboxVAO = gl.createVertexArray();
    gl.bindVertexArray(skyboxVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, skyboxData, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);

    // Carrega Texturas
    boxTexture = loadTexture(gl, 'assets/texturas/box.jpg');
    woodFloorTexture = loadTexture(gl, 'assets/texturas/box.jpg'); 
    skyboxTexture = loadCubemap(gl, 'assets/skybox/');
    sailTexture = loadTexture(gl, 'textura_vela.jpg'); 

    // Configurações Globais do OpenGL
    gl.enable(gl.DEPTH_TEST); // Z-Buffer (Requisito Técnico)
    gl.enable(gl.CULL_FACE);  // Otimização (Não desenha costas do triângulo)
    gl.enable(gl.BLEND);      // Transparência
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    resize(); window.addEventListener('resize', resize);
    requestAnimationFrame(render);
}

// --- LÓGICA DE MOVIMENTO (FÍSICA SIMPLES) ---
function updateCamera() {
    const speed = 0.05;
    const front = vec3.create();
    
    // Converte Euler Angles para Vetor Direção
    front[0] = Math.cos(glMatrixUtils.toRadian(yaw)) * Math.cos(glMatrixUtils.toRadian(pitch));
    front[1] = Math.sin(glMatrixUtils.toRadian(pitch));
    front[2] = Math.sin(glMatrixUtils.toRadian(yaw)) * Math.cos(glMatrixUtils.toRadian(pitch));
    vec3.normalize(cameraFront, front);

    // Vetores de movimento (Strafe)
    const moveFront = vec3.fromValues(front[0], 0, front[2]); vec3.normalize(moveFront, moveFront);
    vec3.cross(moveRight, front, cameraUp); vec3.normalize(moveRight, moveRight); 
    
    let newPos = vec3.clone(cameraPos);
    
    // REQUISITO ESPECÍFICO II: Controle via Teclado (WASD)
    if (keys['KeyW']) vec3.scaleAndAdd(newPos, newPos, moveFront, speed);
    if (keys['KeyS']) vec3.scaleAndAdd(newPos, newPos, moveFront, -speed);
    if (keys['KeyA']) vec3.scaleAndAdd(newPos, newPos, moveRight, -speed);
    if (keys['KeyD']) vec3.scaleAndAdd(newPos, newPos, moveRight, speed);

    // Colisão simples com a borda da jangada
    newPos[0] = Math.max(-boundaryX, Math.min(boundaryX, newPos[0]));
    newPos[2] = Math.max(-boundaryZ, Math.min(boundaryZ, newPos[2]));
    
    vec3.copy(cameraPos, newPos);
    cameraPos[1] = playerHeight; // Mantém altura do olho fixa
}

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; gl.viewport(0, 0, canvas.width, canvas.height); }

// =================================================================
// LOOP DE RENDERIZAÇÃO (Game Loop)
// =================================================================
function render(time) {
    time *= 0.001; // Converte para segundos
    
    gl.clearColor(0.1, 0.1, 0.1, 1.0); 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // 1. LÓGICA DE CÂMERA (MENU vs JOGO)
    if (gameState === "PLAYING") {
        updateCamera();
        
        // --- Cálculo da Tocha em 1ª Pessoa ---
        // A tocha segue a câmera, mas um pouco deslocada para a direita e baixo (mão)
        vec3.copy(torchPosWorld, cameraPos);
        const radYaw = glMatrixUtils.toRadian(yaw);
        const radPitch = glMatrixUtils.toRadian(pitch);
        
        // Recalcula vetores locais da câmera para posicionar a tocha
        const dirX = Math.cos(radYaw) * Math.cos(radPitch);
        const dirY = Math.sin(radPitch);
        const dirZ = Math.sin(radYaw) * Math.cos(radPitch);
        const cf = vec3.fromValues(dirX, dirY, dirZ); vec3.normalize(cf, cf);
        const cr = vec3.create(); vec3.cross(cr, cf, cameraUp); vec3.normalize(cr, cr);
        const cu = vec3.create(); vec3.cross(cu, cr, cf);
        
        // Offset da mão (frente, direita, baixo)
        vec3.scaleAndAdd(torchPosWorld, torchPosWorld, cf, 0.5); 
        vec3.scaleAndAdd(torchPosWorld, torchPosWorld, cr, 0.25); 
        vec3.scaleAndAdd(torchPosWorld, torchPosWorld, cu, -0.15);
    } else {
        // --- Câmera Cinematográfica do Menu ---
        // Gira sozinha em volta da jangada
        const radius = 15.0;
        cameraPos[0] = Math.sin(time * 0.2) * radius;
        cameraPos[2] = Math.cos(time * 0.2) * radius;
        cameraPos[1] = 6.0; 
        
        const target = vec3.fromValues(0, 0, 0);
        vec3.subtract(cameraFront, target, cameraPos);
        vec3.normalize(cameraFront, cameraFront);
        
        // Esconde a tocha longe no menu
        vec3.set(torchPosWorld, 0, -50, 0); 
    }

    // Configura Matrizes de Projeção
    const fov = gameState === "PLAYING" ? 75 : 60; // FOV maior no jogo para imersão
    mat4.perspective(projectionMatrix, glMatrixUtils.toRadian(fov), canvas.width / canvas.height, 0.1, 1000.0);
    const target = vec3.create(); vec3.add(target, cameraPos, cameraFront); 
    mat4.lookAt(viewMatrix, cameraPos, target, cameraUp);

    // ==========================================
    // RENDERIZAR OBJETOS SÓLIDOS (Program 1)
    // ==========================================
    gl.useProgram(program);
    // Envia uniformes (Matrizes, Luz, Cor)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_projection"), false, projectionMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_view"), false, viewMatrix);
    gl.uniform3fv(gl.getUniformLocation(program, "u_viewPos"), cameraPos);
    gl.uniform3fv(gl.getUniformLocation(program, "u_sunDir"), sunDir);
    gl.uniform3fv(gl.getUniformLocation(program, "u_sunColor"), sunColor);
    gl.uniform3fv(gl.getUniformLocation(program, "u_torchPos"), torchPosWorld);
    gl.uniform3fv(gl.getUniformLocation(program, "u_torchColor"), torchColor);

    // Configura Skybox para reflexo
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    gl.uniform1i(gl.getUniformLocation(program, "u_skybox"), 1);
    
    gl.activeTexture(gl.TEXTURE0); // Slot principal de textura

    // 1. JANGADA (Chão de madeira)
    gl.bindVertexArray(cubeVAO);
    gl.bindTexture(gl.TEXTURE_2D, woodFloorTexture);
    gl.uniform1i(gl.getUniformLocation(program, "u_useTexture"), true);
    gl.uniform1i(gl.getUniformLocation(program, "u_useReflection"), false);
    
    // Transformação Geométrica (Escala e Translação)
    mat4.identity(modelMatrix); 
    mat4.translate(modelMatrix, modelMatrix, [0.0, -0.1, 0.0]); 
    mat4.scale(modelMatrix, modelMatrix, [raftScaleX, 0.2, raftScaleZ]); 
    
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    // 2. PEDESTAL DA VELA
    gl.bindTexture(gl.TEXTURE_2D, boxTexture);
    mat4.identity(modelMatrix); mat4.translate(modelMatrix, modelMatrix, [1.0, 0.5, 1.5]);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    // 3. MASTRO
    gl.bindTexture(gl.TEXTURE_2D, woodFloorTexture);
    mat4.identity(modelMatrix); mat4.translate(modelMatrix, modelMatrix, [0.0, 2.0, -0.5]); mat4.scale(modelMatrix, modelMatrix, [0.15, 4.0, 0.15]);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    // 4. DECORAÇÃO GIRATÓRIA (Requisito: Objeto Animado por Transformação)
    gl.uniform3fv(gl.getUniformLocation(program, "u_objectColor"), [0.0, 1.0, 1.0]);
    gl.uniform1i(gl.getUniformLocation(program, "u_useTexture"), false); // Cor sólida (Ciano)
    gl.uniform1i(gl.getUniformLocation(program, "u_useReflection"), true); // Bônus: Reflexo
    gl.uniform1f(gl.getUniformLocation(program, "u_reflectivity"), 0.3);
    
    // Cubo Esquerdo
    mat4.identity(modelMatrix); 
    mat4.translate(modelMatrix, modelMatrix, [-1.5, 0.25, -3.0]); 
    mat4.rotateY(modelMatrix, modelMatrix, time * 1.0); // ANIMAÇÃO AQUI
    mat4.scale(modelMatrix, modelMatrix, [0.5, 0.5, 0.5]);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix); gl.drawArrays(gl.TRIANGLES, 0, 36);
    
    // Cubo Direito
    mat4.identity(modelMatrix); 
    mat4.translate(modelMatrix, modelMatrix, [1.5, 0.25, 3.0]); 
    mat4.rotateY(modelMatrix, modelMatrix, time * 1.0); // ANIMAÇÃO AQUI
    mat4.scale(modelMatrix, modelMatrix, [0.5, 0.5, 0.5]);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix); gl.drawArrays(gl.TRIANGLES, 0, 36);

    // 5. TOCHA (Apenas no modo Jogo)
    if (gameState === "PLAYING") {
        gl.uniform3fv(gl.getUniformLocation(program, "u_objectColor"), [0.4, 0.2, 0.1]); 
        gl.uniform1i(gl.getUniformLocation(program, "u_useTexture"), false);
        gl.uniform1i(gl.getUniformLocation(program, "u_useReflection"), false);
        
        // Cabo da tocha
        mat4.identity(modelMatrix);
        mat4.translate(modelMatrix, modelMatrix, cameraPos); // Grudado na câmera
        // Rotações para alinhar com a mão
        mat4.rotateY(modelMatrix, modelMatrix, glMatrixUtils.toRadian(-yaw - 90)); 
        mat4.rotateX(modelMatrix, modelMatrix, glMatrixUtils.toRadian(-pitch));
        mat4.translate(modelMatrix, modelMatrix, [0.25, -0.3, -0.5]); 
        mat4.rotateY(modelMatrix, modelMatrix, glMatrixUtils.toRadian(-10));
        mat4.rotateX(modelMatrix, modelMatrix, glMatrixUtils.toRadian(30));  
        mat4.scale(modelMatrix, modelMatrix, [0.05, 0.05, 0.6]); 
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
        
        // Ponta brilhante (Amarela)
        gl.uniform3fv(gl.getUniformLocation(program, "u_objectColor"), [1.0, 1.0, 0.0]); // Cor sólida amarela
        mat4.scale(modelMatrix, modelMatrix, [1.0/0.05, 1.0/0.05, 1.0/0.6]); // Desfaz escala anterior
        mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -0.3]); 
        mat4.scale(modelMatrix, modelMatrix, [0.06, 0.06, 0.06]); 
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }

    // 6. DESTROÇOS FLUTUANTES (Imersão)
    gl.bindVertexArray(cubeVAO);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, boxTexture);
    gl.uniform1i(gl.getUniformLocation(program, "u_useTexture"), true);
    
    debris.forEach(d => {
        d.z -= d.speed * 0.05; // Move em direção à câmera
        if (d.z < -10) { // Respawn lá no fundo quando passa
            d.z = 100 + Math.random() * 50; 
            d.x = (Math.random() - 0.5) * 40; 
        }
        
        // Lógica de onda simples para boiar igual ao shader da água
        let movement = time * 3.0;
        let waveY = Math.sin(d.x * 0.8 + time * 1.0) * 0.25 + Math.cos((d.z + movement) * 0.6) * 0.25;
        
        mat4.identity(modelMatrix);
        mat4.translate(modelMatrix, modelMatrix, [d.x, waveY - 0.2, d.z]); 
        mat4.rotate(modelMatrix, modelMatrix, d.rot + time * 0.5, [1, 1, 0]); 
        mat4.scale(modelMatrix, modelMatrix, [0.8, 0.8, 0.8]); 
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
    });

    // 7. PÁSSAROS
    gl.disable(gl.CULL_FACE); // Importante: Pássaro é plano, precisa ver de baixo
    gl.bindVertexArray(birdVAO);
    gl.uniform1i(gl.getUniformLocation(program, "u_useTexture"), false); 
    gl.uniform3fv(gl.getUniformLocation(program, "u_objectColor"), [0.9, 0.9, 0.9]); 
    
    birds.forEach(b => {
        b.angle += b.speed * 0.01; // Movimento circular
        let bx = Math.cos(b.angle) * b.r;
        let bz = Math.sin(b.angle) * b.r;
        
        mat4.identity(modelMatrix);
        mat4.translate(modelMatrix, modelMatrix, [bx, b.y, bz]);
        mat4.rotateY(modelMatrix, modelMatrix, -b.angle); // Gira pra frente do voo
        
        // Animação de bater asas (Escala Y oscilando)
        let flap = 1.0 + Math.sin(time * 10.0) * 0.3; 
        mat4.scale(modelMatrix, modelMatrix, [2.0, flap * 2.0, 2.0]); 
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    if (cullFaceCheckbox && cullFaceCheckbox.checked) gl.enable(gl.CULL_FACE);


    // ==========================================
    // RENDERIZAR ÁGUA E VELA (Program 2)
    // ==========================================
    gl.useProgram(waterProgram);
    // Envia uniformes específicos da água
    gl.uniformMatrix4fv(gl.getUniformLocation(waterProgram, "u_projection"), false, projectionMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(waterProgram, "u_view"), false, viewMatrix);
    gl.uniform3fv(gl.getUniformLocation(waterProgram, "u_viewPos"), cameraPos);
    gl.uniform3fv(gl.getUniformLocation(waterProgram, "u_torchPos"), torchPosWorld);
    gl.uniform3fv(gl.getUniformLocation(waterProgram, "u_torchColor"), torchColor);
    
    const sunPosFake = vec3.create(); vec3.scale(sunPosFake, sunDir, 100.0);
    gl.uniform3fv(gl.getUniformLocation(waterProgram, "u_lightPos"), sunPosFake);

    // 8. ÁGUA (Mar)
    gl.bindVertexArray(waterVAO);
    gl.uniform1f(gl.getUniformLocation(waterProgram, "u_time"), time); 
    gl.uniform1f(gl.getUniformLocation(waterProgram, "u_speedZ"), 3.0); 
    gl.uniform1i(gl.getUniformLocation(waterProgram, "u_isWater"), true); // Ativa modo Água no shader
    gl.uniform1i(gl.getUniformLocation(waterProgram, "u_useTexture"), false); 
    
    mat4.identity(modelMatrix); mat4.translate(modelMatrix, modelMatrix, [0.0, -1.0, 0.0]); 
    gl.uniformMatrix4fv(gl.getUniformLocation(waterProgram, "u_model"), false, modelMatrix);
    // Desenha grade de 300x300 quads (muitos triângulos)
    gl.drawArrays(gl.TRIANGLES, 0, 300 * 300 * 6);

    // 9. VELA (Tecido)
    gl.disable(gl.CULL_FACE); // Ver os dois lados do pano
    gl.bindVertexArray(sailClothVAO);
    // Vela balança mais devagar e não anda pra frente (speedZ = 0)
    gl.uniform1f(gl.getUniformLocation(waterProgram, "u_time"), time * 2.0); 
    gl.uniform1f(gl.getUniformLocation(waterProgram, "u_speedZ"), 0.0);
    gl.uniform1i(gl.getUniformLocation(waterProgram, "u_isWater"), false); // Modo Vela
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sailTexture);
    gl.uniform1i(gl.getUniformLocation(waterProgram, "u_texture"), 0);
    gl.uniform1i(gl.getUniformLocation(waterProgram, "u_useTexture"), true);

    mat4.identity(modelMatrix); 
    mat4.translate(modelMatrix, modelMatrix, [0.0, 2.5, -0.3]); 
    mat4.rotate(modelMatrix, modelMatrix, glMatrixUtils.toRadian(90), [1, 0, 0]); // De pé
    gl.uniformMatrix4fv(gl.getUniformLocation(waterProgram, "u_model"), false, modelMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, 20 * 20 * 6);
    if (cullFaceCheckbox && cullFaceCheckbox.checked) gl.enable(gl.CULL_FACE);

    // ==========================================
    // RENDERIZAR CÉU (SKYBOX) - Sempre por último
    // ==========================================
    gl.depthFunc(gl.LEQUAL); // Truque para desenhar no fundo
    gl.useProgram(skyboxProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, "u_view"), false, viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, "u_projection"), false, projectionMatrix);
    
    gl.bindVertexArray(skyboxVAO); 
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    gl.uniform1i(gl.getUniformLocation(skyboxProgram, "u_skybox"), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 36); 
    gl.depthFunc(gl.LESS); // Volta ao normal
    
    // Chama o próximo frame
    requestAnimationFrame(render);
}

// Inicia tudo quando carregar a página
window.onload = init;