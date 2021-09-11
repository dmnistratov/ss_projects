const {mat2, mat3, mat4, vec2, vec3, vec4} = glMatrix;


class gltf2_importer {
    constructor() {
        this.meshes = []
        this.component_type_map = {
            5120: 1,
            5121: 1,
            5122: 2,
            5123: 2,
            5125: 4,
            5126: 4
        }

        this.number_of_components_map = {
            "SCALAR": 1,
            "VEC2": 2,
            "VEC3": 3,
            "VEC4": 4,
            "MAT2": 4,
            "MAT3": 9,
            "MAT4": 16
        }
    }


    import(path) {
        this.path = path
        this.buffers = []

        return new Promise((resolve, reject) =>  {
            fetch(path)
            .then(response => response.text())
            .then((data) => {
                this.json_file = JSON.parse(data)
                this.readBuffers(this.json_file['buffers']).then(buffers => {
                    this.buffers = buffers
                    this.readMeshes(this.json_file['meshes'])
                    resolve(this)
                })
            })
        })
    }


    readMeshes(json_meshes) {
        for(let json_mesh of json_meshes) {
            for(let json_primitive of json_mesh['primitives']) {
                let indices = this.readAccessor(json_primitive['indices'])
                let vertices = this.readAccessor(json_primitive['attributes']['POSITION'])
                let normals = this.readAccessor(json_primitive['attributes']['NORMAL'])
                this.meshes.push({
                    'vertices': vertices,
                    'indices': indices,
                    'normals': normals
                })
            }
        }
    }


    readAccessor(index) {
        let accessor = this.json_file['accessors'][index]
        let bufferView = this.json_file['bufferViews'][accessor['bufferView']]
        let buffer_index = bufferView['buffer']
        let buffer = this.buffers[buffer_index]
        let buffer_size = accessor['count']*this.number_of_components_map[accessor['type']]
        let byteOffset = bufferView['byteOffset'] ? bufferView['byteOffset'] : 0
        byteOffset += accessor['byteOffset'] ? accessor['byteOffset'] : 0

        let typed_buffer = []
        if(accessor['componentType'] == 5125) {
            typed_buffer = new Int32Array(buffer, byteOffset, buffer_size)
        }
        else if(accessor['componentType'] == 5126) {
            typed_buffer = new Float32Array(buffer, byteOffset, buffer_size)
        }
        else if(accessor['componentType'] == 5121) {
            typed_buffer = new Int8Array(buffer, byteOffset, buffer_size)
        }
        else {
            typed_buffer = new Int16Array(buffer, byteOffset, buffer_size)
        }
        return typed_buffer
    }


    async readBuffers(json_buffers) {
        let path_to_asset = this.path.substring(0, this.path.lastIndexOf("/"));
        let uris = []
        for(let json_buffer of json_buffers) {
            uris.push(path_to_asset + '/' + json_buffer['uri'])
        }

        let requests = uris.map(uri => fetch(uri));
        return Promise.all(requests).then(responses => {
            return Promise.all(responses.map(r => r.arrayBuffer()))
        })
    }
}







const vertexShaderSource = `# version 300 es
    in vec3 aVertexPosition;
    in vec3 aNormal;

    out vec3 normal;
    out vec3 position;
    uniform mat4 Model;
    void main(void) {
        float scale = 0.9f;
        vec4 world_pos = Model*vec4(aVertexPosition*scale, 1);
        world_pos.y -= 0.8f;
        gl_Position = world_pos;
        normal = normalize(transpose(inverse(mat3(Model))) * aNormal);
        position = vec3(Model*vec4(aVertexPosition*scale, 1));
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

        fragColor = vec4(diffuse_contrib+specular_contrib*0.3, 1);
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


function initWebGl(gl, raw_meshes) {
    meshes = []

    for(mesh of raw_meshes) {
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

        //indices
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh['indices']), gl.STATIC_DRAW);

        meshes.push({
            'vao': vao,
            'positions': posBuffer,
            'indices':  indexBuffer,
            'numberOfIndices': mesh['indices'].length
        })
    }

    return meshes
}


var start_time = undefined
var ModelMatrix = mat4.create();
var current_angle = 0
var degrees_per_second = 45.0;

function draw(gl, program, buffers) {
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
    for(buffer of buffers) {
        gl.bindVertexArray(buffer.vao);
        gl.drawElements(gl.TRIANGLES, buffer.numberOfIndices, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(function() {draw(gl, program, buffers)});
}



function main() {
    const canvas = document.querySelector("#glCanvas");
    const gl = canvas.getContext("webgl2");
  
    if (gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }
  
    const shaderProgram = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

    var importer = new gltf2_importer()
    importer.import("./assets/Flair/Flair.gltf").then(importer => {
        let buffers = initWebGl(gl, importer.meshes)
        draw(gl, shaderProgram, buffers)
        gl.enable(gl.DEPTH_TEST)
    })
}
  
window.onload = main;