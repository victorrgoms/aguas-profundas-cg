// js/shaders.js
// Aqui ficam os códigos GLSL que rodam direto na Placa de Vídeo

// =================================================================
// 1. SHADER PADRÃO (Objetos Sólidos: Jangada, Caixas, Pássaros)
// =================================================================
export const vsSource = `#version 300 es
// REQUISITO GERAL I: Projeção Perspectiva (feita pelas matrizes u_projection * u_view)
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_texCoord;

uniform mat4 u_model;      // Transforma o objeto no mundo
uniform mat4 u_view;       // Posiciona a câmera
uniform mat4 u_projection; // Cria a perspectiva (FOV)

out vec3 v_normal;
out vec3 v_fragPos;
out vec2 v_texCoord;

void main() {
    // Calcula posição final do vértice
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
    
    // Passa dados pro Fragment Shader interpolar
    v_fragPos = vec3(u_model * vec4(a_position, 1.0));
    v_normal = mat3(u_model) * a_normal; // Ajusta normal conforme rotação
    v_texCoord = a_texCoord;
}
`;

export const fsSource = `#version 300 es
precision mediump float;

// Dados vindos do Vertex Shader
in vec3 v_normal;
in vec3 v_fragPos;
in vec2 v_texCoord;

// Uniforms (Variáveis globais)
uniform vec3 u_viewPos;     // Posição da câmera (pra brilho especular)
uniform vec3 u_sunDir;      // Direção do Sol
uniform vec3 u_sunColor;
uniform vec3 u_torchPos;    // REQUISITO GERAL II: Fonte de Luz Móvel (Tocha)
uniform vec3 u_torchColor;

uniform sampler2D u_texture; // Textura do objeto
uniform bool u_useTexture;   // Usa textura ou cor sólida?
uniform vec3 u_objectColor;  // Cor sólida (se não tiver textura)

out vec4 outColor;

// REQUISITO GERAL II: Modelo de Reflexão de PHONG
// Função auxiliar para calcular Ambiente + Difusa + Especular
vec3 calcLight(vec3 lightDir, vec3 lightColor, vec3 normal, vec3 viewDir, float specularStrength, float shininess) {
    // 1. Difusa (Ângulo entre luz e normal)
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * lightColor;
    
    // 2. Especular (Reflexo brilhante)
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = specularStrength * spec * lightColor;
    
    return (diffuse + specular);
}

void main() {
    // Decide a cor base (Textura ou Cor Sólida)
    vec4 baseColor = u_useTexture ? texture(u_texture, v_texCoord) : vec4(u_objectColor, 1.0);
    
    vec3 norm = normalize(v_normal);
    vec3 viewDir = normalize(u_viewPos - v_fragPos);
    
    // Iluminação 1: SOL (Direcional)
    vec3 lighting = calcLight(normalize(u_sunDir), u_sunColor, norm, viewDir, 0.8, 64.0);

    // Iluminação 2: TOCHA (Ponto de luz móvel com atenuação)
    vec3 torchDir = normalize(u_torchPos - v_fragPos);
    float distance = length(u_torchPos - v_fragPos);
    // Fórmula de atenuação física (1 / ax² + bx + c) para a luz não ir infinito
    float attenuation = 1.0 / (1.0 + 0.1 * distance + 3.0 * distance * distance);
    
    vec3 torchLight = calcLight(torchDir, u_torchColor, norm, viewDir, 2.0, 128.0);
    lighting += torchLight * attenuation * 2.5; // * 2.5 para dar um boost na força

    // Ambiente (Luz de fundo constante)
    vec3 ambient = vec3(0.02, 0.02, 0.05) * baseColor.rgb;

    outColor = vec4(ambient + lighting * baseColor.rgb, baseColor.a);
}
`;

// =================================================================
// 2. SHADER DE ÁGUA (Estilizado + Animação de Vértice)
// =================================================================
export const waterVsSource = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 2) in vec2 a_texCoord;

uniform mat4 u_model, u_view, u_projection;
uniform float u_time;   // Tempo para animação
uniform float u_speedZ; // Velocidade da onda

out vec3 v_fragPos;
out float v_waveHeight; // Altura da onda (para colorir no frag)
out vec2 v_texCoord;
out float v_dist;       // Distância para o Fog

// Função de onda orgânica (Soma de senos)
// REQUISITO GERAL III: Objeto animado por transformação geométrica
// (Aqui deformamos a geometria da água em tempo real)
float calculateWave(float x, float z, float time) {
    float wave = 0.0;
    wave += sin(x * 0.5 + time * 0.5) * 0.5;
    wave += cos((z * 0.3 + x * 0.1) + time * 0.8) * 0.3;
    wave += sin((z * 0.8) + time * 1.5) * 0.1;
    return wave;
}

void main() {
    vec3 pos = a_position;
    float movement = u_time * u_speedZ;

    // Se for a ÁGUA (y ~ 0), aplica ondas
    float h = 0.0;
    if(pos.y > -2.0 && pos.y < 2.0) {
        h = calculateWave(pos.x, pos.z + movement, u_time);
        pos.y += h; // Modifica a altura Y do vértice
    }

    vec4 worldPos = u_model * vec4(pos, 1.0);
    v_fragPos = vec3(worldPos);
    v_waveHeight = h;
    v_texCoord = a_texCoord;
    
    gl_Position = u_projection * u_view * worldPos;
    
    // Salva profundidade para calcular Neblina (Fog)
    v_dist = gl_Position.w; 
}
`;

export const waterFsSource = `#version 300 es
precision mediump float;

in vec3 v_fragPos;
in float v_waveHeight;
in vec2 v_texCoord;
in float v_dist;

uniform bool u_isWater; // Diferencia se é Água ou a Vela do barco
uniform vec3 u_lightPos;
uniform vec3 u_viewPos;
uniform vec3 u_torchPos;
uniform vec3 u_torchColor;
uniform sampler2D u_texture;
uniform bool u_useTexture;

out vec4 outColor;

void main() {
    vec4 finalColor;
    vec3 viewDir = normalize(u_viewPos - v_fragPos);

    // REQUISITO BÔNUS: Efeito de Neblina (Fog) no horizonte
    vec3 fogColor = vec3(0.1, 0.1, 0.15); // Cor do céu noturno
    float fogStart = 20.0;
    float fogEnd = 200.0;
    float fogFactor = smoothstep(fogStart, fogEnd, v_dist);

    if (u_isWater) {
        // Cores do mar (Estilo Raft)
        vec3 deepColor = vec3(0.01, 0.03, 0.1);  // Fundo escuro
        vec3 shallowColor = vec3(0.0, 0.2, 0.3); // Crista clara
        
        // Mistura cor baseado na altura da onda
        float heightFactor = smoothstep(-0.5, 0.8, v_waveHeight);
        vec3 waterColor = mix(deepColor, shallowColor, heightFactor);

        // Espuma fake no topo
        if(v_waveHeight > 0.6) waterColor = mix(waterColor, vec3(0.8, 0.9, 1.0), 0.5);
        
        // Recalcula normal baseada na inclinação da onda (aproximado)
        vec3 norm = normalize(vec3(v_waveHeight * 0.5, 1.0, 0.0));
        
        // Reflexo Especular da Tocha na água
        vec3 torchDir = normalize(u_torchPos - v_fragPos);
        float dist = length(u_torchPos - v_fragPos);
        float att = 1.0 / (1.0 + 0.1 * dist + 1.5 * dist * dist);
        
        vec3 torchReflect = reflect(-torchDir, norm);
        float spec = pow(max(dot(viewDir, torchReflect), 0.0), 32.0);
        vec3 specular = u_torchColor * spec * 2.0 * att;

        finalColor = vec4(waterColor + specular, 0.95);
        
        // Aplica o Fog
        finalColor = vec4(mix(finalColor.rgb, fogColor, fogFactor), 0.95);

    } else {
        // Renderiza a Vela (Tecido)
        vec4 texColor = u_useTexture ? texture(u_texture, v_texCoord) : vec4(1.0);
        
        // Iluminação simples na vela
        float dist = length(u_torchPos - v_fragPos);
        float att = 1.0 / (1.0 + 0.1 * dist + 3.0 * dist * dist);
        vec3 lighting = u_torchColor * att * 2.0; // Luz da tocha
        
        vec3 objColor = (vec3(0.1) + lighting) * texColor.rgb;
        finalColor = vec4(mix(objColor, fogColor, fogFactor), texColor.a);
    }

    outColor = finalColor;
}
`;

// SHADERS DO SKYBOX (Cubo infinito no fundo)
export const skyboxVsSource = `#version 300 es
layout(location = 0) in vec3 a_position;
out vec3 v_texCoord;
uniform mat4 u_projection, u_view;
void main() {
    v_texCoord = a_position;
    // Remove translação da câmera para o céu parecer infinito
    mat4 view = mat4(mat3(u_view)); 
    vec4 pos = u_projection * view * vec4(a_position, 1.0);
    // Truque: Z = W para desenhar sempre no fundo (depth máxima)
    gl_Position = pos.xyww;
}
`;
export const skyboxFsSource = `#version 300 es
precision mediump float;
in vec3 v_texCoord;
uniform samplerCube u_skybox;
out vec4 outColor;
void main() { outColor = texture(u_skybox, v_texCoord); }
`;