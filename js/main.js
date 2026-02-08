import { createShader, createProgram, loadTexture, loadCubemap, createWaterGrid } from './utils.js';
import { vsSource, fsSource, skyboxVsSource, skyboxFsSource, waterVsSource, waterFsSource } from './shaders.js';

// Biblioteca glMatrix
const mat4 = window.mat4;
const vec3 = window.vec3;
const glMatrixUtils = window.glMatrix;

// --- VARIÁVEIS GLOBAIS ---
let canvas, gl;
let program, skyboxProgram, waterProgram;
let cubeVAO, skyboxVAO, waterVAO, sailClothVAO, birdVAO;
let boxTexture, woodFloorTexture, skyboxTexture, sailTexture;

// --- ÁUDIO (Com tratamento de erro para mobile) ---
// Tenta carregar .wav, se não der, tente .mp3 renomeando no código se precisar
const audioAmbient = new Audio('./assets/sounds/ocean.wav');
const audioClick = new Audio('./assets/sounds/click.wav');

let gameState = "MENU"; 

// Câmera
const playerHeight = 1.6;
let cameraPos = vec3.fromValues(0, playerHeight, 10.0);
let cameraFront = vec3.fromValues(0, 0, -1); 
let cameraUp = vec3.fromValues(0, 1, 0);     

// Jangada
const raftScaleX = 4.0; const raftScaleZ = 7.0; 
const boundaryX = (raftScaleX / 2) - 0.2; 
const boundaryZ = (raftScaleZ / 2) - 0.2;

// Visão
let yaw = -90; let pitch = 0; 
const keys = {};

// Matrizes
const projectionMatrix = mat4.create();
const viewMatrix = mat4.create();
const modelMatrix = mat4.create();
let cullFaceCheckbox; 

// Objetos
const debris = [
    { x: -5, z: 20, speed: 2.0, rot: 0 },
    { x: 8,  z: 40, speed: 2.5, rot: 45 },
    { x: -12, z: 60, speed: 1.8, rot: 90 },
    { x: 3,  z: 90, speed: 2.2, rot: 10 }
];

const birds = [
    { r: 15, y: 12, speed: 0.5, angle: 0 },
    { r: 25, y: 18, speed: 0.3, angle: 3.14 },
    { r: 10, y: 9, speed: 0.6, angle: 1.5 }
];

// Luzes
const sunDir = vec3.fromValues(1.0, 0.3, 0.0); 
const sunColor = vec3.fromValues(1.0, 0.6, 0.3); 
const torchColor = vec3.fromValues(1.0, 0.8, 0.4); 
let moveRight = vec3.create();
let torchPosWorld = vec3.create();

// GEOMETRIA (Vértices)
const skyboxData = new Float32Array([ -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, 1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -1, 1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -1, 1, -1, -1, 1, -1, 1, -1, 1, 1, -1, 1, 1, 1, 1, 1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, 1, -1, 1 ]);

const cubeData = new Float32Array([ -0.5, -0.5, 0.5, 0,0,1, 0,0,  0.5, -0.5, 0.5, 0,0,1, 1,0,  0.5, 0.5, 0.5, 0,0,1, 1,1, 0.5, 0.5, 0.5, 0,0,1, 1,1,  -0.5, 0.5, 0.5, 0,0,1, 0,1,  -0.5, -0.5, 0.5, 0,0,1, 0,0, -0.5, -0.5, -0.5, 0,0,-1, 0,0,  -0.5, 0.5, -0.5, 0,0,-1, 0,1,  0.5, 0.5, -0.5, 0,0,-1, 1,1, 0.5, 0.5, -0.5, 0,0,-1, 1,1,  0.5, -0.5, -0.5, 0,0,-1, 1,0,  -0.5, -0.5, -0.5, 0,0,-1, 0,0, -0.5, 0.5, 0.5, -1,0,0, 1,0,  -0.5, 0.5, -0.5, -1,0,0, 1,1,  -0.5, -0.5, -0.5, -1,0,0, 0,1, -0.5, -0.5, -0.5, -1,0,0, 0,1,  -0.5, -0.5, 0.5, -1,0,0, 0,0,  -0.5, 0.5, 0.5, -1,0,0, 1,0, 0.5, 0.5, 0.5, 1,0,0, 1,0,  0.5, -0.5, -0.5, 1,0,0, 0,1,  0.5, 0.5, -0.5, 1,0,0, 1,1, 0.5, -0.5, -0.5, 1,0,0, 0,1,  0.5, 0.5, 0.5, 1,0,0, 1,0,  0.5, -0.5, 0.5, 1,0,0, 0,0, -0.5, 0.5, -0.5, 0,1,0, 0,1,  -0.5, 0.5, 0.5, 0,1,0, 0,0,  0.5, 0.5, 0.5, 0,1,0, 1,0, 0.5, 0.5, 0.5, 0,1,0, 1,0,  0.5, 0.5, -0.5, 0,1,0, 1,1,  -0.5, 0.5, -0.5, 0,1,0, 0,1, -0.5, -0.5, -0.5, 0,-1,0, 0,1,  0.5, -0.5, -0.5, 0,-1,0, 1,1,  0.5, -0.5, 0.5, 0,-1,0, 1,0, 0.5, -0.5, 0.5, 0,-1,0, 1,0,  -0.5, -0.5, 0.5, 0,-1,0, 0,0,  -0.5, -0.5, -0.5, 0,-1,0, 0,1 ]);

const birdData = new Float32Array([
    0.0, 0.0, 0.0,   0.0, 1.0, 0.0,   0.0, 0.0,
    -0.5, 0.0, 0.5,  0.0, 1.0, 0.0,   0.0, 0.0,
    -0.2, 0.0, -0.2, 0.0, 1.0, 0.0,   0.0, 0.0,
    0.0, 0.0, 0.0,   0.0, 1.0, 0.0,   0.0, 0.0,
    0.5, 0.0, 0.5,   0.0, 1.0, 0.0,   0.0, 0.0,
    0.2, 0.0, -0.2,  0.0, 1.0, 0.0,   0.0, 0.0
]);

function createShape(gl, data) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const stride = 8 * 4;
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0); gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12); gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 24); gl.enableVertexAttribArray(2);
    return vao;
}

// --- CONTROLES DE TOQUE (CELULAR) ---
let touchStartX = 0;
let touchStartY = 0;
let isTwoFingerTouch = false; // Para andar automático

function init() {
    canvas = document.getElementById("glcanvas");
    gl = canvas.getContext("webgl2");
    if (!gl) return;
    
    // Configura Áudio
    audioAmbient.loop = true; 
    audioAmbient.volume = 0.5;

    const mainMenu = document.getElementById('main-menu');
    const uiGame = document.getElementById('ui-game');
    const btnStart = document.getElementById('btn-start');
    const btnLore = document.getElementById('btn-lore');
    const loreModal = document.getElementById('lore-modal');

    // === FUNÇÃO DE INÍCIO DO JOGO (ROBUSTA) ===
    const startGame = () => {
        // 1. Toca o som (Interação do usuário permite isso)
        audioClick.play().catch(e => {});
        audioAmbient.play().catch(e => console.log("Erro audio:", e));

        // 2. Tenta travar o mouse (Pode falhar no celular)
        try {
            canvas.requestPointerLock();
        } catch (e) {
            console.log("Pointer lock não suportado ou bloqueado (normal em mobile)");
        }

        // 3. FORÇA O INÍCIO DO JOGO (Mesmo se o mouse não travar)
        setTimeout(() => {
            gameState = "PLAYING";
            mainMenu.style.display = 'none';
            uiGame.style.display = 'block';
        }, 100); // Espera 100ms e força a entrada
    };

    btnStart.addEventListener('click', startGame);
    // Adiciona suporte a toque no botão também, pra garantir
    btnStart.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Evita clique duplo
        startGame();
    }, {passive: false});

    btnLore.addEventListener('click', () => { 
        loreModal.classList.remove('hidden'); 
        audioClick.play().catch(e=>{});
    });
    
    // Detector de Pause/Menu (PC)
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) {
            gameState = "PLAYING";
            mainMenu.style.display = 'none';
            uiGame.style.display = 'block';
        } else {
            // Se saiu do PointerLock, só pausa se não for Mobile (no mobile nunca entra em pointerlock)
            // Lógica simplificada: Se estava jogando e soltou, pausa.
            if(gameState === "PLAYING" && !isMobile()) {
                gameState = "MENU";
                mainMenu.style.display = 'flex';
                uiGame.style.display = 'none';
                audioAmbient.pause();
            }
        }
    });

    // === CONTROLES ===

    // 1. Mouse (PC)
    document.addEventListener('mousemove', (e) => {
        if (gameState === "PLAYING" && document.pointerLockElement === canvas) {
            yaw += e.movementX * 0.1; 
            pitch -= e.movementY * 0.1;
            if (pitch > 89.0) pitch = 89.0; if (pitch < -89.0) pitch = -89.0;
        }
    });

    // 2. Toque (Celular)
    canvas.addEventListener('touchstart', (e) => {
        if(e.touches.length === 1) {
            touchStartX = e.touches[0].pageX;
            touchStartY = e.touches[0].pageY;
            isTwoFingerTouch = false;
        } else if (e.touches.length === 2) {
            isTwoFingerTouch = true; // Dois dedos para andar
        }
    }, {passive: false});

    canvas.addEventListener('touchend', (e) => {
        if(e.touches.length < 2) isTwoFingerTouch = false;
    });

    canvas.addEventListener('touchmove', (e) => {
        if (gameState === "PLAYING" && e.touches.length === 1) {
            e.preventDefault(); // Não rolar a tela
            const dx = e.touches[0].pageX - touchStartX;
            const dy = e.touches[0].pageY - touchStartY;
            
            // Sensibilidade do toque
            yaw += dx * 0.3;
            pitch -= dy * 0.3;
            
            if (pitch > 89.0) pitch = 89.0; if (pitch < -89.0) pitch = -89.0;
            
            touchStartX = e.touches[0].pageX;
            touchStartY = e.touches[0].pageY;
        }
    }, {passive: false});

    // 3. Teclado
    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    cullFaceCheckbox = document.getElementById('cullFace');

    // Shaders
    program = createProgram(gl, createShader(gl, gl.VERTEX_SHADER, vsSource), createShader(gl, gl.FRAGMENT_SHADER, fsSource));
    skyboxProgram = createProgram(gl, createShader(gl, gl.VERTEX_SHADER, skyboxVsSource), createShader(gl, gl.FRAGMENT_SHADER, skyboxFsSource));
    waterProgram = createProgram(gl, createShader(gl, gl.VERTEX_SHADER, waterVsSource), createShader(gl, gl.FRAGMENT_SHADER, waterFsSource));

    // Shapes
    cubeVAO = createShape(gl, cubeData);
    waterVAO = createShape(gl, createWaterGrid(800, 800, 300));
    sailClothVAO = createShape(gl, createWaterGrid(3.0, 2.5, 20));
    birdVAO = createShape(gl, birdData);
    
    skyboxVAO = gl.createVertexArray();
    gl.bindVertexArray(skyboxVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, skyboxData, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);

    // Texturas
    boxTexture = loadTexture(gl, 'assets/texturas/box.jpg');
    woodFloorTexture = loadTexture(gl, 'assets/texturas/box.jpg'); 
    skyboxTexture = loadCubemap(gl, 'assets/skybox/');
    sailTexture = loadTexture(gl, 'textura_vela.jpg'); 

    gl.enable(gl.DEPTH_TEST); 
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    resize(); window.addEventListener('resize', resize);
    requestAnimationFrame(render);
}

// Helper simples para saber se é mobile (evita pausar o jogo sozinho)
function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// --- UPDATE FISICO ---
function updateCamera() {
    const speed = 0.05;
    const front = vec3.create();
    front[0] = Math.cos(glMatrixUtils.toRadian(yaw)) * Math.cos(glMatrixUtils.toRadian(pitch));
    front[1] = Math.sin(glMatrixUtils.toRadian(pitch));
    front[2] = Math.sin(glMatrixUtils.toRadian(yaw)) * Math.cos(glMatrixUtils.toRadian(pitch));
    vec3.normalize(cameraFront, front);

    const moveFront = vec3.fromValues(front[0], 0, front[2]); vec3.normalize(moveFront, moveFront);
    vec3.cross(moveRight, front, cameraUp); vec3.normalize(moveRight, moveRight); 
    
    let newPos = vec3.clone(cameraPos);
    
    // Movimento Teclado (WASD) OU Toque Duplo (Celular)
    if (keys['KeyW'] || isTwoFingerTouch) vec3.scaleAndAdd(newPos, newPos, moveFront, speed);
    if (keys['KeyS']) vec3.scaleAndAdd(newPos, newPos, moveFront, -speed);
    if (keys['KeyA']) vec3.scaleAndAdd(newPos, newPos, moveRight, -speed);
    if (keys['KeyD']) vec3.scaleAndAdd(newPos, newPos, moveRight, speed);

    newPos[0] = Math.max(-boundaryX, Math.min(boundaryX, newPos[0]));
    newPos[2] = Math.max(-boundaryZ, Math.min(boundaryZ, newPos[2]));
    vec3.copy(cameraPos, newPos);
    cameraPos[1] = playerHeight; 
}

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; gl.viewport(0, 0, canvas.width, canvas.height); }

// --- RENDER LOOP ---
function render(time) {
    time *= 0.001;
    gl.clearColor(0.1, 0.1, 0.1, 1.0); 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    if (gameState === "PLAYING") {
        updateCamera();
        
        vec3.copy(torchPosWorld, cameraPos);
        const radYaw = glMatrixUtils.toRadian(yaw);
        const radPitch = glMatrixUtils.toRadian(pitch);
        const dirX = Math.cos(radYaw) * Math.cos(radPitch);
        const dirY = Math.sin(radPitch);
        const dirZ = Math.sin(radYaw) * Math.cos(radPitch);
        const cf = vec3.fromValues(dirX, dirY, dirZ); vec3.normalize(cf, cf);
        const cr = vec3.create(); vec3.cross(cr, cf, cameraUp); vec3.normalize(cr, cr);
        const cu = vec3.create(); vec3.cross(cu, cr, cf);
        vec3.scaleAndAdd(torchPosWorld, torchPosWorld, cf, 0.5); 
        vec3.scaleAndAdd(torchPosWorld, torchPosWorld, cr, 0.25); 
        vec3.scaleAndAdd(torchPosWorld, torchPosWorld, cu, -0.15);
    } else {
        const radius = 15.0;
        cameraPos[0] = Math.sin(time * 0.2) * radius;
        cameraPos[2] = Math.cos(time * 0.2) * radius;
        cameraPos[1] = 6.0; 
        
        const target = vec3.fromValues(0, 0, 0);
        vec3.subtract(cameraFront, target, cameraPos);
        vec3.normalize(cameraFront, cameraFront);
        
        vec3.set(torchPosWorld, 0, -50, 0); 
    }

    mat4.perspective(projectionMatrix, glMatrixUtils.toRadian(gameState === "PLAYING" ? 75 : 60), canvas.width / canvas.height, 0.1, 1000.0);
    const target = vec3.create(); vec3.add(target, cameraPos, cameraFront); mat4.lookAt(viewMatrix, cameraPos, target, cameraUp);

    // --- DESENHO DA CENA ---
    gl.useProgram(program);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_projection"), false, projectionMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_view"), false, viewMatrix);
    gl.uniform3fv(gl.getUniformLocation(program, "u_viewPos"), cameraPos);
    gl.uniform3fv(gl.getUniformLocation(program, "u_sunDir"), sunDir);
    gl.uniform3fv(gl.getUniformLocation(program, "u_sunColor"), sunColor);
    gl.uniform3fv(gl.getUniformLocation(program, "u_torchPos"), torchPosWorld);
    gl.uniform3fv(gl.getUniformLocation(program, "u_torchColor"), torchColor);

    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    gl.uniform1i(gl.getUniformLocation(program, "u_skybox"), 1);
    gl.activeTexture(gl.TEXTURE0); gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);

    // Jangada
    gl.bindVertexArray(cubeVAO);
    gl.bindTexture(gl.TEXTURE_2D, woodFloorTexture);
    gl.uniform1i(gl.getUniformLocation(program, "u_useTexture"), true);
    gl.uniform1i(gl.getUniformLocation(program, "u_useReflection"), false);
    mat4.identity(modelMatrix); mat4.translate(modelMatrix, modelMatrix, [0.0, -0.1, 0.0]); mat4.scale(modelMatrix, modelMatrix, [raftScaleX, 0.2, raftScaleZ]); 
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    // Pedestal
    gl.bindTexture(gl.TEXTURE_2D, boxTexture);
    mat4.identity(modelMatrix); mat4.translate(modelMatrix, modelMatrix, [1.0, 0.5, 1.5]);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    // Mastro
    gl.bindTexture(gl.TEXTURE_2D, woodFloorTexture);
    mat4.identity(modelMatrix); mat4.translate(modelMatrix, modelMatrix, [0.0, 2.0, -0.5]); mat4.scale(modelMatrix, modelMatrix, [0.15, 4.0, 0.15]);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    // Decoração Giratória
    gl.uniform3fv(gl.getUniformLocation(program, "u_objectColor"), [0.0, 1.0, 1.0]);
    gl.uniform1i(gl.getUniformLocation(program, "u_useTexture"), false);
    gl.uniform1i(gl.getUniformLocation(program, "u_useReflection"), true);
    gl.uniform1f(gl.getUniformLocation(program, "u_reflectivity"), 0.3);
    
    mat4.identity(modelMatrix); mat4.translate(modelMatrix, modelMatrix, [-1.5, 0.25, -3.0]); mat4.rotateY(modelMatrix, modelMatrix, time * 1.0); mat4.scale(modelMatrix, modelMatrix, [0.5, 0.5, 0.5]);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix); gl.drawArrays(gl.TRIANGLES, 0, 36);
    
    mat4.identity(modelMatrix); mat4.translate(modelMatrix, modelMatrix, [1.5, 0.25, 3.0]); mat4.rotateY(modelMatrix, modelMatrix, time * 1.0); mat4.scale(modelMatrix, modelMatrix, [0.5, 0.5, 0.5]);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix); gl.drawArrays(gl.TRIANGLES, 0, 36);

    // Tocha
    if (gameState === "PLAYING") {
        gl.uniform3fv(gl.getUniformLocation(program, "u_objectColor"), [0.4, 0.2, 0.1]); 
        gl.uniform1i(gl.getUniformLocation(program, "u_useTexture"), false);
        gl.uniform1i(gl.getUniformLocation(program, "u_useReflection"), false);
        mat4.identity(modelMatrix);
        mat4.translate(modelMatrix, modelMatrix, cameraPos); 
        mat4.rotateY(modelMatrix, modelMatrix, glMatrixUtils.toRadian(-yaw - 90)); 
        mat4.rotateX(modelMatrix, modelMatrix, glMatrixUtils.toRadian(-pitch));
        mat4.translate(modelMatrix, modelMatrix, [0.25, -0.3, -0.5]); 
        mat4.rotateY(modelMatrix, modelMatrix, glMatrixUtils.toRadian(-10));
        mat4.rotateX(modelMatrix, modelMatrix, glMatrixUtils.toRadian(30));  
        mat4.scale(modelMatrix, modelMatrix, [0.05, 0.05, 0.6]); 
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
        // Ponta
        gl.uniform3fv(gl.getUniformLocation(program, "u_objectColor"), [1.0, 1.0, 0.0]); 
        mat4.scale(modelMatrix, modelMatrix, [1.0/0.05, 1.0/0.05, 1.0/0.6]); 
        mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -0.3]); 
        mat4.scale(modelMatrix, modelMatrix, [0.06, 0.06, 0.06]); 
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }

    // Destroços
    gl.bindVertexArray(cubeVAO);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, boxTexture);
    gl.uniform1i(gl.getUniformLocation(program, "u_useTexture"), true);
    debris.forEach(d => {
        d.z -= d.speed * 0.05; 
        if (d.z < -10) { d.z = 100 + Math.random() * 50; d.x = (Math.random() - 0.5) * 40; }
        let movement = time * 3.0;
        let waveY = Math.sin(d.x * 0.8 + time * 1.0) * 0.25 + Math.cos((d.z + movement) * 0.6) * 0.25;
        mat4.identity(modelMatrix);
        mat4.translate(modelMatrix, modelMatrix, [d.x, waveY - 0.2, d.z]); 
        mat4.rotate(modelMatrix, modelMatrix, d.rot + time * 0.5, [1, 1, 0]); 
        mat4.scale(modelMatrix, modelMatrix, [0.8, 0.8, 0.8]); 
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
    });

    // Pássaros
    gl.disable(gl.CULL_FACE); 
    gl.bindVertexArray(birdVAO);
    gl.uniform1i(gl.getUniformLocation(program, "u_useTexture"), false); 
    gl.uniform3fv(gl.getUniformLocation(program, "u_objectColor"), [0.9, 0.9, 0.9]); 
    birds.forEach(b => {
        b.angle += b.speed * 0.01;
        let bx = Math.cos(b.angle) * b.r;
        let bz = Math.sin(b.angle) * b.r;
        mat4.identity(modelMatrix);
        mat4.translate(modelMatrix, modelMatrix, [bx, b.y, bz]);
        mat4.rotateY(modelMatrix, modelMatrix, -b.angle); 
        let flap = 1.0 + Math.sin(time * 10.0) * 0.3; 
        mat4.scale(modelMatrix, modelMatrix, [2.0, flap * 2.0, 2.0]); 
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model"), false, modelMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    if (cullFaceCheckbox && cullFaceCheckbox.checked) gl.enable(gl.CULL_FACE);

    // Água e Vela
    gl.useProgram(waterProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(waterProgram, "u_projection"), false, projectionMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(waterProgram, "u_view"), false, viewMatrix);
    gl.uniform3fv(gl.getUniformLocation(waterProgram, "u_viewPos"), cameraPos);
    gl.uniform3fv(gl.getUniformLocation(waterProgram, "u_torchPos"), torchPosWorld);
    gl.uniform3fv(gl.getUniformLocation(waterProgram, "u_torchColor"), torchColor);
    const sunPosFake = vec3.create(); vec3.scale(sunPosFake, sunDir, 100.0);
    gl.uniform3fv(gl.getUniformLocation(waterProgram, "u_lightPos"), sunPosFake);

    // Água
    gl.bindVertexArray(waterVAO);
    gl.uniform1f(gl.getUniformLocation(waterProgram, "u_time"), time); 
    gl.uniform1f(gl.getUniformLocation(waterProgram, "u_speedZ"), 3.0); 
    gl.uniform4fv(gl.getUniformLocation(waterProgram, "u_baseColor"), [0.02, 0.05, 0.15, 0.95]); 
    gl.uniform1i(gl.getUniformLocation(waterProgram, "u_isWater"), true);
    gl.uniform1i(gl.getUniformLocation(waterProgram, "u_useTexture"), false); 
    mat4.identity(modelMatrix); mat4.translate(modelMatrix, modelMatrix, [0.0, -1.0, 0.0]); 
    gl.uniformMatrix4fv(gl.getUniformLocation(waterProgram, "u_model"), false, modelMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, 300 * 300 * 6);

    // Vela
    gl.disable(gl.CULL_FACE); 
    gl.bindVertexArray(sailClothVAO);
    gl.uniform1f(gl.getUniformLocation(waterProgram, "u_time"), time * 2.0); 
    gl.uniform1f(gl.getUniformLocation(waterProgram, "u_speedZ"), 0.0);
    gl.uniform4fv(gl.getUniformLocation(waterProgram, "u_baseColor"), [1.0, 1.0, 1.0, 1.0]); 
    gl.uniform1i(gl.getUniformLocation(waterProgram, "u_isWater"), false);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sailTexture);
    gl.uniform1i(gl.getUniformLocation(waterProgram, "u_texture"), 0);
    gl.uniform1i(gl.getUniformLocation(waterProgram, "u_useTexture"), true);

    mat4.identity(modelMatrix); mat4.translate(modelMatrix, modelMatrix, [0.0, 2.5, -0.3]); mat4.rotate(modelMatrix, modelMatrix, glMatrixUtils.toRadian(90), [1, 0, 0]); 
    gl.uniformMatrix4fv(gl.getUniformLocation(waterProgram, "u_model"), false, modelMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, 20 * 20 * 6);
    if (cullFaceCheckbox && cullFaceCheckbox.checked) gl.enable(gl.CULL_FACE);

    // Skybox
    gl.depthFunc(gl.LEQUAL); gl.useProgram(skyboxProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, "u_view"), false, viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, "u_projection"), false, projectionMatrix);
    gl.bindVertexArray(skyboxVAO); gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
    gl.uniform1i(gl.getUniformLocation(skyboxProgram, "u_skybox"), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 36); gl.depthFunc(gl.LESS);
    
    requestAnimationFrame(render);
}
window.onload = init;