const {mat2, mat3, mat4, vec2, vec3, vec4} = glMatrix;

const vertexShaderSource = `# version 300 es
    in vec3 aVertexPosition;
    in vec3 aNormal;

    out vec3 normal;
    out vec3 position;
    uniform mat4 Model;
    void main(void) {
        gl_Position = Model*vec4(aVertexPosition*0.3, 1);
        normal = vec3(Model*vec4(aNormal, 0));
        position = vec3(Model*vec4(aVertexPosition*0.3, 1));
    }
`;

const fragmentShaderSource = `# version 300 es
    precision highp float;
    uniform vec3 color;
    out vec4 fragColor;
    in vec3 normal;
    in vec3 position;
    void main(void) {
        vec3 n = normalize(normal);
        vec3 lightPos = vec3(0, 0, -10);
        vec3 lightDir = normalize(-(position-lightPos));
        vec3 cameraPosition = vec3(15,5,-5);
        vec3 cameraDirection = normalize(-(position-cameraPosition));

        float NdotL = max(dot(lightDir, n), 0.2);
        vec3 diffuse_contrib = NdotL*color;


        vec3 r = normalize(reflect(-lightDir, n));
        vec3 halfway = normalize(lightDir+cameraDirection); 
        float HdotN = max(dot(halfway, n), 0.0);
        float specular_contrib = pow(HdotN, 64.0);

        fragColor = vec4(diffuse_contrib+specular_contrib*0.5, 1);
    }
`;


//lines
// const cubePositions = [
//     //front
//     -1, 1, -1,
//     -1, -1, -1,
//     1, -1, -1,   
//     1, 1, -1,

//     //right
//     1, 1, 1,
//     1, -1, 1,

//     //top
//     -1, 1, 1,

//     //left
//     -1, -1, 1,
// ];


// const cubeIndices = [
//     //front
//     0, 1,
//     1, 2,
//     2, 3,
//     3, 0,

//     //right
//     3, 4,
//     4, 5,
//     5, 2,

//     //top
//     0, 6,
//     6, 4,

//     //left
//     1, 7,
//     7, 6,

//     //back
//     7, 5
// ];


//triangles
const cubePositions = [
    //front
    -1, 1, -1,  //0
    -1, -1, -1, //1
    1, -1, -1,  //2
    1, 1, -1,   //3

    //right
    1, -1, -1,  //2 (4)
    1, 1, -1,   //3 (5)
    1, 1, 1,    //4 (6)
    1, -1, 1,   //5 (7)


    //top
    -1, 1, -1,  //0 (8)
    1, 1, -1,   //3 (9)
    1, 1, 1,    //4 (10)
    -1, 1, 1,   //6 (11)


    //left
    -1, 1, -1,  //0 (12)
    -1, -1, -1, //1 (13)
    -1, -1, 1,  //7 (14)
    -1, 1, 1,   //6 (15)

    //bottom
    -1, -1, -1, //1 (16)
    1, -1, -1,  //2 (17)
    1, -1, 1,   //5 (18)
    -1, -1, 1,  //7 (19)


    //back
    -1, -1, 1,  //7 (20)
    -1, 1, 1,   //6 (21) 
    1, 1, 1,    //4 (22)
    1, -1, 1,   //5 (23)
];


const cubeNormals = [
    //front
    0, 0, -1,  //0
    0, 0, -1,  //0
    0, 0, -1,  //0
    0, 0, -1,  //0

    //right
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,


    //top
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,


    //left
    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,

    //bottom
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,


    //back
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1
];


const cubeIndices = [
    // front
    0, 1, 2,
    0, 3, 2,

    //right
    5, 4, 7,
    5, 7, 6,

    //top
    8, 9, 10,
    8, 11, 10,

    //left
    12, 13, 14,
    12, 15, 14,

    //bottom
    16, 19, 17,
    19, 18, 17,

    //back
    20, 21, 23,
    21, 22, 23
];


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






function initBuffer(gl) {
    //vertex array
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    
    //positions
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubePositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);


    //normals
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeNormals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);


    //indices
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeIndices), gl.STATIC_DRAW);


    verticesBuffer = {
        'vao': vao,
        'positions': posBuffer,
        'indices':  indexBuffer,
        'numberOfIndices': 6
    };
    
    return verticesBuffer;
}






var start_time = undefined
var ModelMatrix = mat4.create();
var current_angle = 0

function drawScene(gl, program, buffer) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindVertexArray(buffer.vao);
    gl.useProgram(program);




    var u_color = gl.getUniformLocation(program, "color");
    gl.uniform3fv(u_color, [124/255,252/255,0]);


    if(start_time == undefined) {
        start_time = new Date().getTime();
    }
    var elapsed_time = new Date().getTime() - start_time;
    console.log(elapsed_time);


    var degrees_per_second = 45.0;

    current_angle = degrees_per_second*(elapsed_time/1000)


    var x_rot = mat4.create();
    mat4.fromXRotation(x_rot, glMatrix.glMatrix.toRadian(10.0))
    mat4.fromYRotation(ModelMatrix, glMatrix.glMatrix.toRadian(current_angle))

    mat4.mul(ModelMatrix, ModelMatrix, x_rot)
    if(current_angle == 360) {
        start_time = new Date().getTime();
        current_angle = 0
    }


    var u_model = gl.getUniformLocation(program, "Model");
    gl.uniformMatrix4fv(u_model, false, ModelMatrix) 
    gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(function() {drawScene(gl, program, buffer)});
}






function main() {
    const canvas = document.querySelector("#glCanvas");
    const gl = canvas.getContext("webgl2");
  
    if (gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }
  
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);


    const shaderProgram = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
    const buffer = initBuffer(gl);
    

    gl.enable(gl.DEPTH_TEST)
    drawScene(gl, shaderProgram, buffer);


}
  





window.onload = main;