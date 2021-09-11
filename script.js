const {mat2, mat3, mat4, vec2, vec3, vec4} = glMatrix;

const vertexShaderSource = `
    attribute vec3 aVertexPosition;
    uniform mat4 Model;
    void main(void) {
        gl_Position = Model*vec4(aVertexPosition*0.3, 1);
    }
`;

const fragmentShaderSource = `
    precision highp float;
    uniform vec3 color;
    void main(void) {
        gl_FragColor = vec4(color,1);
    }
`;


const quadPositions = [
    //front
    -1, 1, -1,
    -1, -1, -1,
    1, -1, -1,   
    1, 1, -1,

    //right
    1, 1, 1,
    1, -1, 1,

    //top
    -1, 1, 1,

    //left
    -1, -1, 1,
];


const quadIndices = [
    //front
    0, 1,
    1, 2,
    2, 3,
    3, 0,

    //right
    3, 4,
    4, 5,
    5, 2,

    //top
    0, 6,
    6, 4,

    //left
    1, 7,
    7, 6,

    //back
    7, 5


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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadPositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);


    //indices
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(quadIndices), gl.STATIC_DRAW);


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
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(buffer.vao);
    gl.useProgram(program);




    var u_color = gl.getUniformLocation(program, "color");
    gl.uniform3fv(u_color, [1, 0, 1]);


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
    gl.drawElements(gl.LINES, quadIndices.length, gl.UNSIGNED_SHORT, 0);

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
    


    drawScene(gl, shaderProgram, buffer);


}
  





window.onload = main;