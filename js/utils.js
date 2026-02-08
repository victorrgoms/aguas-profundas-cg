// js/utils.js
// Arquivo de utilitários para separar a lógica "chata" do WebGL

// Função genérica para compilar um Shader (Vertex ou Fragment)
export function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    // Verifica se deu erro na compilação
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Erro no shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Linka os shaders num Programa executável na GPU
export function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Erro no programa:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

// REQUISITO GERAL IV: Objeto com Textura
// Função para carregar imagens JPG/PNG e mandar pra GPU
export function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Placeholder: Cria um pixel azul enquanto a imagem carrega pra não dar erro
    const pixel = new Uint8Array([0, 0, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    const image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        // REQUISITO EXTRA: Mipmap
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // Se não for potência de 2, configura para esticar (CLAMP)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };
    image.src = url;
    return texture;
}

// Auxiliar pra ver se a imagem é 256, 512, 1024, etc.
function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

// REQUISITO EXTRA: Skybox / Cubemap
// Carrega 6 imagens para formar o fundo infinito (Céu)
export function loadCubemap(gl, basePath) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    const faces = [
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, url: basePath + 'right.jpg' },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, url: basePath + 'left.jpg' },
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, url: basePath + 'top.jpg' },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, url: basePath + 'bottom.jpg' },
        { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, url: basePath + 'front.jpg' },
        { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, url: basePath + 'back.jpg' },
    ];

    // Configura filtros para evitar emenda feia no céu
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    faces.forEach((face) => {
        const img = new Image();
        img.onload = () => {
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
            gl.texImage2D(face.target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        };
        img.src = face.url;
    });
    
    return texture;
}

// REQUISITO ESPECÍFICO IV: Cenário construído manualmente
// Gera um "tapete" de vértices para ser a água ou a vela
export function createWaterGrid(width, depth, subdivisions) {
    const finalData = [];
    const stepX = width / subdivisions;
    const stepZ = depth / subdivisions;

    // Cria quadriculados (2 triângulos por quadrado)
    for (let z = 0; z < subdivisions; z++) {
        for (let x = 0; x < subdivisions; x++) {
            // Coordenadas X e Z
            const x0 = -width/2 + x * stepX;
            const z0 = -depth/2 + z * stepZ;
            const x1 = x0 + stepX;
            const z1 = z0 + stepZ;
            
            // Coordenadas de Textura (UV) - de 0.0 a 1.0
            const u0 = x / subdivisions; const v0 = z / subdivisions;
            const u1 = (x+1) / subdivisions; const v1 = (z+1) / subdivisions;

            // Formato dos dados: X, Y, Z,  Nx, Ny, Nz,  U, V
            // Triângulo 1
            finalData.push(x0, 0, z0,  0,1,0,  u0, v0);
            finalData.push(x0, 0, z1,  0,1,0,  u0, v1);
            finalData.push(x1, 0, z0,  0,1,0,  u1, v0);
            
            // Triângulo 2
            finalData.push(x1, 0, z0,  0,1,0,  u1, v0);
            finalData.push(x0, 0, z1,  0,1,0,  u0, v1);
            finalData.push(x1, 0, z1,  0,1,0,  u1, v1);
        }
    }
    return new Float32Array(finalData);
}