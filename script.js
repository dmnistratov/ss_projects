


const vertexShaderSource = `
    attribute vec4 aVertexPosition;

    void main(void) {
        gl_Position = aVertexPosition;
    }
`;

const fragmentShaderSource = `
    void main(void) {
        gl_FragColor = vec4(1,0,0,1);
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



function initBuffer(gl) {
    const verticesBuffer = gl.createBuffer();
  
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
  
    const vertices = [
        -1, 1, 1,
        -1, -1, 1,
        1, -1, 1
    ];
  
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    return verticesBuffer;
}






function drawScene(gl, program, buffer) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0); 

  
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  


    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(
          0,
          3,
          gl.FLOAT,
          false,
          0,
          0);

    gl.enableVertexAttribArray(0);
    
  

  
    gl.useProgram(program);
  

    {
      const offset = 0;
      const vertexCount = 3;
      gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}



function main() {
    const canvas = document.querySelector("#glCanvas");
    const gl = canvas.getContext("webgl");
  
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