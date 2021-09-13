import { gltf2_importer } from "./gltf2io.js";
const {mat2, mat3, mat4, vec2, vec3, vec4} = glMatrix;





const vertexShaderSource = `# version 300 es
    in vec3 aVertexPosition;
    in vec3 aNormal;
    in vec2 aTexcoord0;

    out vec3 debugColor;
    out vec3 normal;
    out vec3 position;
    out vec2 texcoord0;
    uniform mat4 Model;
    uniform mat4 Projection;


    void main(void) {
        float scale = 1.0f;
        vec4 world_pos = Model*vec4(aVertexPosition, 1);
        world_pos.y -= 0.9f;
        gl_Position = world_pos;
        normal = normalize(transpose(inverse(mat3(Model))) * aNormal);
        position = vec3(world_pos);

        texcoord0 = aTexcoord0;   
    }
`;

const fragmentShaderSource = `# version 300 es
    precision highp float;
    uniform vec3 color;
    uniform sampler2D uBaseColorTexture;
    uniform sampler2D uNormalTexture;
    out vec4 fragColor;
    
    in vec3 normal;
    in vec3 position;
    in vec2 texcoord0;
    in vec3 debugColor;


    vec3 getNormal() {
        vec3 tangentNormal = texture(uNormalTexture, texcoord0).xyz * 2.0 - 1.0;
    
        vec3 q1 = dFdx(position);
        vec3 q2 = dFdy(position);
        vec2 st1 = dFdx(texcoord0);
        vec2 st2 = dFdy(texcoord0);
    
        vec3 N = normalize(normal);
        vec3 T = normalize(q1 * st2.t - q2 * st1.t);
        vec3 B = -normalize(cross(N, T));
        mat3 TBN = mat3(T, B, N);
    
        return normalize(TBN * tangentNormal);
    }

    void main(void) {
        vec4 baseColor = texture(uBaseColorTexture, texcoord0);
        vec3 n = normalize(getNormal());
        vec3 lightPos = vec3(0, 0, -10);
        vec3 lightDir = normalize(-(position-lightPos));
        vec3 cameraPosition = vec3(15,5,-5);
        vec3 cameraDirection = normalize(-(position-cameraPosition));

        float NdotL = max(dot(lightDir, n), 0.3);
        vec3 diffuse_contrib = NdotL*baseColor.rgb;

        vec3 r = normalize(reflect(-lightDir, n));
        vec3 halfway = normalize(lightDir+cameraDirection); 
        float HdotN = max(dot(halfway, n), 0.0);
        float specular_contrib = pow(HdotN, 64.0);

        fragColor = vec4(diffuse_contrib+specular_contrib*1.0, 1);
    }
`;


function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
  
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
  
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
  
    return shader;
}


function createShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return null;
    }
  
    return shaderProgram;
}





function initWebGl(gl, importer) {
    gl.enable(gl.DEPTH_TEST)
    for(let texture of importer.textures) {
        const gl_texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, gl_texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texture.magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texture.magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, texture.wrapT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, texture.wrapS);
        let image = importer.images[texture.source_index]
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        texture.texture_index = gl_texture
    }


    let meshes = []
    let raw_meshes = importer.meshes

    for(let mesh of raw_meshes) {
        var vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        //positions
        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh['vertices']), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

        //normals
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh['normals']), gl.STATIC_DRAW);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(1);

        //texcoords0
        const texcoords0Buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoords0Buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh['texcoords0']), gl.STATIC_DRAW);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(2);

        //indices
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh['indices']), gl.STATIC_DRAW);


        meshes.push({
            'vao': vao,
            'positions': posBuffer,
            'indices':  indexBuffer,
            'numberOfIndices': mesh['indices'].length,
            'material': mesh.material_index
        })
    }

    return meshes
}


var start_time = undefined
var ModelMatrix = mat4.create();
var current_angle = 0
var degrees_per_second = 45.0;

function draw(gl, program, buffers, importer) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);

    //set unfiorms
    //  color
    var u_color = gl.getUniformLocation(program, "color");
    gl.uniform3fv(u_color, [124/255,252/255,0]);

    //  animation
    if(start_time == undefined) {
        start_time = new Date().getTime();
    }
    var elapsed_time = new Date().getTime() - start_time;
    current_angle = degrees_per_second*(elapsed_time/1000)
    mat4.fromYRotation(ModelMatrix, glMatrix.glMatrix.toRadian(current_angle))

    if(current_angle == 360) {
        start_time = new Date().getTime();
        current_angle = 0
    }

    //  model
    var u_model = gl.getUniformLocation(program, "Model");
    gl.uniformMatrix4fv(u_model, false, ModelMatrix) 


    // draw
    for(let buffer of buffers) {
        let material = importer.materials[buffer.material]

        //bind color texture
        let texture = importer.textures[material.baseColorTexture]
        gl.bindVertexArray(buffer.vao);
        var textureLocation = gl.getUniformLocation(program, "uBaseColorTexture");
        gl.uniform1i(textureLocation, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture.texture_index);

        //bind normal texture
        texture = importer.textures[material.normalTexture]
        textureLocation = gl.getUniformLocation(program, "uNormalTexture");
        gl.uniform1i(textureLocation, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texture.texture_index);
 
        gl.drawElements(gl.TRIANGLES, buffer.numberOfIndices, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(function() {draw(gl, program, buffers, importer)});
}



async function main() {
    const canvas = document.querySelector("#glCanvas");
    const gl = canvas.getContext("webgl2");
  
    if (gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }
  
    const shaderProgram = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

    let importer = new gltf2_importer()
    await importer.import("./assets/Flair/Flair.gltf")

    let buffers = initWebGl(gl, importer)
    draw(gl, shaderProgram, buffers, importer)
}
  
window.onload = main;
