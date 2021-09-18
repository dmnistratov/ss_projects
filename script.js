import { gltf2_importer } from "./gltf2io.js";
import { Shader } from "./shader.js";
const {mat2, mat3, mat4, vec2, vec3, vec4, quat} = glMatrix;



function initWebGl(gl, importer) {
    gl.enable(gl.DEPTH_TEST)

    //create textures
    for(let texture of importer.textures) {
        const gl_texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, gl_texture);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texture.magFilter);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texture.magFilter );
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, texture.wrapT);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, texture.wrapS);
        let image = importer.images[texture.source_index]
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D)
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









function applyMaterial(gl, program, material_index, materials, textures) {
    let material = materials[material_index]

    // baseColorTexture
    if(material.baseColorTexture !== undefined) {
        let texture = textures[material.baseColorTexture]
        let textureLocation = gl.getUniformLocation(program, "material.baseColorTexture");
        gl.uniform1i(textureLocation, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture.texture_index);
    }

    // normalTexture
    if(material.normalTexture !== undefined) {
        let texture = textures[material.normalTexture]
        let textureLocation = gl.getUniformLocation(program, "material.normalTexture");
        gl.uniform1i(textureLocation, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texture.texture_index);
    }

    // baseColorFactor
    {
        let location = gl.getUniformLocation(program, "material.baseColorFactor");
        gl.uniform4fv(location, material.baseColorFactor) 
    }

    // baseColorTexcoord
    {
        let location = gl.getUniformLocation(program, "material.baseColorTexcoord");
        gl.uniform1i(location, material.baseColorTexcoord) 
    }

    // normalTexcoord
    {
        let location = gl.getUniformLocation(program, "material.normalTexcoord");
        gl.uniform1i(location, material.normalTexcoord) 
    }
}




var start_time = undefined
var current_angle = 0
var degrees_per_second = 45.0;

function draw(gl, program, buffers, importer, uniforms) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);



    //  animation
    // if(start_time == undefined) {
    //     start_time = new Date().getTime();
    // }
    // var elapsed_time = new Date().getTime() - start_time;
    // current_angle = degrees_per_second*(elapsed_time/1000)
    // mat4.fromYRotation(uniforms.Model, glMatrix.glMatrix.toRadian(current_angle))

    // if(current_angle == 360) {
    //     start_time = new Date().getTime();
    //     current_angle = 0
    // }


    //set unfiorms
    //  color
    var u_color = gl.getUniformLocation(program, "color");
    gl.uniform3fv(u_color, [124/255,252/255,0]);


    //  camera direction
    var u_camera = gl.getUniformLocation(program, "cameraDirection");
    gl.uniform3fv(u_camera, uniforms.camera.direction) 

    //  model
    var u_model = gl.getUniformLocation(program, "Model");
    gl.uniformMatrix4fv(u_model, false, uniforms.Model) 

    //  view
    var u_view = gl.getUniformLocation(program, "View");
    gl.uniformMatrix4fv(u_view, false, uniforms.View) 

    // projection
    var u_projection = gl.getUniformLocation(program, "Projection");
    gl.uniformMatrix4fv(u_projection, false, uniforms.Projection) 

    // draw
    for(let buffer of buffers) {
        applyMaterial(gl, program, buffer.material, importer.materials, importer.textures)
        gl.bindVertexArray(buffer.vao);
        gl.drawElements(gl.TRIANGLES, buffer.numberOfIndices, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(function() {draw(gl, program, buffers, importer, uniforms)});
}



async function main() {
    var canvas = document.querySelector("#glCanvas");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const gl = canvas.getContext("webgl2");

    if (gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }
  

    canvas.ondragstart = () => false
    // resize canvas/viewport
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        gl.viewport(0, 0, canvas.width, canvas.height)
    }, false);


    let camera_pos = vec3.create()
    vec3.set(camera_pos, 1, 2, 3)

    let camera_direction = vec3.create()
    vec3.negate(camera_direction, camera_pos)

    let camera = {
        'position': camera_pos,
        'direction': camera_direction
    };

    // model
    let Model = mat4.create();
    //  view
    let View = mat4.create()
    mat4.lookAt(View, camera.position, [0,0,0], [0,1,0])
    // projection
    let Projection = mat4.create()
    mat4.perspective(Projection, glMatrix.glMatrix.toRadian(45.0), canvas.width/canvas.height, 0.5, 200.0)




    let uniforms = {
        'Model': Model,
        'View': View,
        'Projection': Projection,
        'camera': camera 
    };


    let mousePrevX;
    let mousePrevY;

    let rotateCamera  = (event) => {
        let dx = -(mousePrevX ? event.screenX - mousePrevX : 0)*0.01
        let dy = (mousePrevY ? event.screenY - mousePrevY : 0)*0.01
        let radius = vec3.length(camera.position)
        
        let theta = Math.asin(camera.position[1]/radius)
        theta += dy
        theta = Math.min(Math.max(theta, -Math.PI/2), Math.PI/2);

        let phi = Math.atan2(camera.position[0],camera.position[2])
        phi += dx

        camera.position[1] = radius*Math.sin(theta)
        camera.position[0] = radius*Math.sin(phi)*Math.cos(theta)
        camera.position[2] = radius*Math.cos(phi)*Math.cos(theta)
        mat4.lookAt(uniforms.View, camera.position, [0,0,0], [0,1,0])

        mousePrevX = event.screenX;
        mousePrevY = event.screenY;
    };


//     let zoom = (event) => {
//         let camera_direction = vec3.create()
//         let new_position = vec3.create()
//         vec3.negate(camera_direction, camera.position)
//         vec3.scaleAndAdd(new_position, camera.position, camera_direction, -event.deltaY*0.001)

//         let length = vec3.length(new_position)
//         if(length < 1 || length > 30) {
//             return;
//         }

//         camera.position = new_position
//         mat4.lookAt(uniforms.View, camera.position, [0,0,0], [0,1,0])
//     };



//     if ('onwheel' in document) {
//         // IE9+, FF17+, Ch31+
//         canvas.addEventListener("wheel", zoom);
//     } else if ('onmousewheel' in document) {
//         canvas.addEventListener("mousewheel", zoom);
//     } else {
//         // Firefox < 17
//         canvas.addEventListener("MozMousePixelScroll", zoom);
//     }
    




    canvas.addEventListener('pointerdown', function(event) {
        if(event.button == 0) {
            mousePrevX = 0;
            mousePrevY = 0;
            canvas.addEventListener('pointermove', rotateCamera)
        }
    })

    canvas.addEventListener('pointerup', function(event) {
        if(event.button == 0) {
            canvas.removeEventListener('pointermove', rotateCamera)
        }
    })
    


    let importer = new gltf2_importer()
    await importer.import("./assets/ruby_rose/scene.gltf")
    let shaderProgram = await Shader.loadFromFile(gl, "shaders/main.vert", "shaders/blinn-phong.frag")
    let buffers = initWebGl(gl, importer)
    draw(gl, shaderProgram, buffers, importer, uniforms)
}
  

window.onload = main;
