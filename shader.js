export class Shader {

    constructor(gl, vertexSource, fragmentSource) {
        this.gl = gl
        const vertexShader = this.compile(gl, gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
      
        this._program = gl.createProgram();
        this.uniforms = {}
        gl.attachShader(this._program, vertexShader);
        gl.attachShader(this._program, fragmentShader);
        gl.linkProgram(this._program);
    
        if (!gl.getProgramParameter(this._program, gl.LINK_STATUS)) {
            alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(this._program));
            return null;
        }


        const numUniforms = gl.getProgramParameter(this._program, gl.ACTIVE_UNIFORMS);
        for (let i=0; i<numUniforms; i++) {
            const info = gl.getActiveUniform(this._program, i);
            let location = gl.getUniformLocation(this.program(), info.name)
            this.uniforms[info.name] = {
                'type': info.type,
                'size': info.size,
                'location': location
            }
        }

        // float 5126
        // int 5124
        // vec2 35664
        // vec3 35665
        // vec4 35666
        // mat2 35674
        // mat3 35675
        // mat4 35676
        // sampler2D 35678
        this.setUniformFunctions = {
            5126 : (location, value) => {
                this.gl.uniform1f(location, value)
            },
            5124 : (location, value) => {
                this.gl.uniform1i(location, value)
            },
            35664 : (location, value) => {
                this.gl.uniform2fv(location, value)
            },
            35665 : (location, value) => {
                this.gl.uniform3fv(location, value)
            },
            35666 : (location, value) => {
                this.gl.uniform4fv(location, value)
            },
            35674 : (location, value, transpose=false) => {
                this.gl.uniformMatrix2fv(location, value)
            },
            35675 : (location, value, transpose=false) => {
                this.gl.uniformMatrix3fv(location, false, value)
            },
            35676 : (location, value, transpose=false) => {
                this.gl.uniformMatrix4fv(location, false, value)
            },
            35678: (location, value) => {
                this.gl.uniform1i(location, value)
            }
        }


    }


    use() {
        this.gl.useProgram(this._program)
    }

    program() {
        return this._program
    }

    setUniform(name, value, transpose=false) {
        if(!(name in this.uniforms)) return
        // console.log(name, value, this.uniforms[name].type)
        let location = this.uniforms[name].location
        let type = this.uniforms[name].type
        let uniformFunction = this.setUniformFunctions[type]
        uniformFunction(location, value, transpose)
    }


    static async readShaderSourceFromFile(path) {
        let response = await fetch(path)
        return response.text()
    }
    

    static async loadFromFile(gl, vertexShaderPath, fragmentShaderPath) {
        let p_vertex = this.readShaderSourceFromFile(vertexShaderPath)
        let p_fragment = this.readShaderSourceFromFile(fragmentShaderPath)
        return await Promise.all([p_vertex, p_fragment]).then((sources) => {
            return new Shader(gl, sources[0], sources[1])
        })
    }


    
    compile(gl, type, source) {
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
}

