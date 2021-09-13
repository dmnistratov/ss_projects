export class Shader {
    static async loadFromFile(gl, vertexShaderPath, fragmentShaderPath) {
        let p_vertex = readShaderSourceFromFile(vertexShaderPath)
        let p_fragment = readShaderSourceFromFile(fragmentShaderPath)
        let [vSource, fSource] = await Promise.all([p_vertex, p_fragment])
        let program = createShaderProgram(gl, vSource, fSource)
        return program
    }
}


async function readShaderSourceFromFile(path) {
    let response = await fetch(path)
    return response.text()
}


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