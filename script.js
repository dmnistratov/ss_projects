import { gltf2_importer } from "./gltf2io.js";
import { Shader } from "./shader.js";
const {mat2, mat3, mat4, vec2, vec3, vec4, quat} = glMatrix;



function createTextures(gl, texturesInfo, images) {
    for(let texture of texturesInfo) {
        const glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texture.magFilter);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texture.minFilter);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, texture.wrapT);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, texture.wrapS);
        let image = images[texture.source]
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D)
        texture.texture_index = glTexture 
    }
}



function createSkins(gl, importedSkins, nodes) {
    let skins = []

    for(let skin of importedSkins) {
        let inverseBindMatrices = skin['inverseBindMatrices']
        let joints = new Float32Array(skin.joints.length*16)

        let skinRootIndex = nodes[skin.skeleton].parent
        let globalInverse = nodes[skinRootIndex].globalTransformation
        mat4.invert(globalInverse, globalInverse)

        for(let joint_index in skin.joints) {
            let inverseBindMatrix = mat4.fromValues.apply(this, inverseBindMatrices.slice(joint_index*16, joint_index*16+16))
            let nodeGlobal = nodes[skin.joints[joint_index]].globalTransformation

            mat4.mul(nodeGlobal, globalInverse, nodeGlobal)
            mat4.mul(nodeGlobal, nodeGlobal, inverseBindMatrix)

            for(let j=0; j<16; j++) {
                joints[joint_index*16 + j] = nodeGlobal[j]
            }
        } 

        var jointsTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, jointsTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, skin.joints.length, 0, gl.RGBA, gl.FLOAT, joints);

        skins.push({
            'texture': jointsTexture,
            'count': skin.joints.length
        })
    }

    return skins
}




function initWebGl(gl, importer) {
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendEquation(gl.FUNC_ADD);

    createTextures(gl, importer.textures, importer.images)

    let skins = createSkins(gl, importer.skins, importer.nodes)




    let transparent = []
    let opaque = []

    for(let renderable of importer.renderable) {
        let mesh = importer.meshes[renderable['mesh']]
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

        //texcoords1
        if(mesh['texcoords1']) {
            const texcoords1Buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, texcoords1Buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh['texcoords1']), gl.STATIC_DRAW);
            gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(3);   
        }

        // joints
        if(mesh['joints0']) {
            const joints0Buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, joints0Buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh['joints0']), gl.STATIC_DRAW);
            gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(4);   
        }

        // weights
        if(mesh['weights0']) {
            const weights0Buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, weights0Buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh['weights0']), gl.STATIC_DRAW);
            gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(5);   
        }

        //indices
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int32Array(mesh['indices']), gl.STATIC_DRAW);



        let mesh_info = {
            'vao': vao,
            'numberOfIndices': mesh['indices'].length,
            'material': mesh.material_index,
            'globalTransformation': renderable['globalTransformation'],
            'mode': mesh.mode,
            'skin': renderable['skin']
        }

        if(importer.materials[mesh.material_index]['alphaMode'] !== undefined) {
            transparent.push(mesh_info)
        }
        else {
            opaque.push(mesh_info)
        }
    }


    return {
        'opaque': opaque,
        'transparent': transparent,
        'skins': skins
    }
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

    // metallicRoughnessTexture
    if(material.metallicRoughnessTexture !== undefined) {
        let texture = textures[material.metallicRoughnessTexture]
        let textureLocation = gl.getUniformLocation(program, "material.metallicRoughnessTexture");
        gl.uniform1i(textureLocation, 2);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, texture.texture_index);
    }   

    // emissiveTexture
    if(material.emissiveTexture !== undefined) {
        let texture = textures[material.emissiveTexture]
        let textureLocation = gl.getUniformLocation(program, "material.emissiveTexture");
        gl.uniform1i(textureLocation, 3);
        gl.activeTexture(gl.TEXTURE3);
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

    // metallicRoughnessTexcoord
    {
        let location = gl.getUniformLocation(program, "material.metallicRoughnessTexcoord");
        gl.uniform1i(location, material.metallicRoughnessTexcoord) 
    }

    // metallicFactor
    {
        let location = gl.getUniformLocation(program, "material.metallicFactor");
        gl.uniform1f(location, material.metallicFactor) 
    }

    // roughnessFactor
    {
        let location = gl.getUniformLocation(program, "material.roughnessFactor");
        gl.uniform1f(location, material.roughnessFactor) 
    }

    // emissiveFactor
    {
        let location = gl.getUniformLocation(program, "material.emissiveFactor");
        gl.uniform3fv(location, material.emissiveFactor) 
    }

    // emissiveTexcoord
    {
        let location = gl.getUniformLocation(program, "material.emissiveTexcoord");
        gl.uniform1i(location, material.emissiveTexcoord) 
    }

}




function setSkin(gl, program, skin) {
    let location = gl.getUniformLocation(program, "numBones");
    gl.uniform1f(location, skin.count) 

    let texture = skin.texture
    let textureLocation = gl.getUniformLocation(program, "joints");
    gl.uniform1i(textureLocation, 10);
    gl.activeTexture(gl.TEXTURE10);
    gl.bindTexture(gl.TEXTURE_2D, texture);   
}



function sortTransparentMeshesByDepth(meshes, view) {
    meshes.transparent.sort((a,b) => {
        let aPos = vec3.create()
        let bPos = vec3.create()
        let amatrix = mat4.create()
        let bmatrix = mat4.create()
        mat4.mul(amatrix, view, a.globalTransformation)
        mat4.mul(bmatrix, view, b.globalTransformation)

        mat4.getTranslation(aPos, amatrix)
        mat4.getTranslation(bPos, bmatrix)
        
        return bPos[2] - aPos[2]
    })
}



function updateUniforms(gl, program, uniforms) {
    // camera position
    var u_camera = gl.getUniformLocation(program, "cameraPosition");
    gl.uniform3fv(u_camera, uniforms.camera.position) 

    //  view
    var u_view = gl.getUniformLocation(program, "View");
    gl.uniformMatrix4fv(u_view, false, uniforms.View) 

    // projection
    var u_projection = gl.getUniformLocation(program, "Projection");
    gl.uniformMatrix4fv(u_projection, false, uniforms.Projection) 
}



function drawMeshes(gl, program, uniforms, meshes, materials, textures, skins) {
    for(let mesh of meshes) {
        if(mesh['skin'] !== undefined) {
            let location = gl.getUniformLocation(program, "skinIndex");
            gl.uniform1i(location, mesh['skin']) 
            setSkin(gl, program, skins[mesh['skin']])
        }
        else {
            let location = gl.getUniformLocation(program, "skinIndex");
            gl.uniform1i(location, -1)    
        }

        let matrix = mat4.create()
        mat4.mul(matrix, uniforms.Model, mesh.globalTransformation)

        var u_model = gl.getUniformLocation(program, "Model");
        gl.uniformMatrix4fv(u_model, false, matrix) 

        applyMaterial(gl, program, mesh.material, materials, textures)

        gl.bindVertexArray(mesh.vao);
        gl.drawElements(gl.TRIANGLES, mesh.numberOfIndices, gl.UNSIGNED_INT, 0);
    }
}



function draw(gl, program, meshes, importer, uniforms) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    updateUniforms(gl, program, uniforms)

    //opaque
    drawMeshes(gl, program, uniforms, meshes.opaque, importer.materials, importer.textures, meshes.skins)

    sortTransparentMeshesByDepth(meshes, uniforms.View)

    //transparent
    drawMeshes(gl, program, uniforms, meshes.transparent, importer.materials, importer.textures, meshes.skins)

    requestAnimationFrame(function() {draw(gl, program, meshes, importer, uniforms)});
}





function getSceneRootScale(scene_aabb) {
    let max_size = Math.max(scene_aabb.width, scene_aabb.height)
    max_size = Math.max(max_size, scene_aabb.depth)

    let sceneRootScale = mat4.create()
    mat4.fromScaling(sceneRootScale, vec4.fromValues(2/scene_aabb.width*scene_aabb.width/max_size, 
                                                     2/scene_aabb.height*scene_aabb.height/max_size, 
                                                     2/scene_aabb.depth*scene_aabb.depth/max_size)
    )

    let center = vec3.fromValues(
        (scene_aabb['maxx']+scene_aabb['minx'])/2,
        (scene_aabb['maxy']+scene_aabb['miny'])/2,
        (scene_aabb['maxz']+scene_aabb['minz'])/2
    )

    vec3.negate(center, center)
    mat4.translate(sceneRootScale,sceneRootScale, center)

    return sceneRootScale
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

    // disable right-click context menu
    canvas.oncontextmenu = (event) => { 
        event.preventDefault();
        event.stopPropagation(); 
    }


    // resize canvas/viewport
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        gl.viewport(0, 0, canvas.width, canvas.height)
    }, false);


    let camera_pos = vec3.create()
    vec3.set(camera_pos,2.0,0.0,2.5)

    let camera_direction = vec3.create()
    vec3.negate(camera_direction, camera_pos)

    let camera = {
        'position': camera_pos,
        'direction': camera_direction
    };

    // model
    let Model = mat4.create();
    // view
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

    let translateCamera  = (event) => {
        let dx = (mousePrevX ? event.screenX - mousePrevX : 0)*0.001*4
        let dy = -(mousePrevY ? event.screenY - mousePrevY : 0)*0.001*4
        let radius = vec3.length(camera.position)

        let direction = vec3.create()
        vec3.negate(direction, camera.position)

        let left = vec3.create()
        let right = vec3.create()
        let up = vec3.fromValues(0,1,0)
        vec3.cross(left, up, direction)
        vec3.negate(right, left)
        vec3.normalize(right, right)

        vec3.scale(right, right, dx)
        vec3.scale(up, up, dy)
        let translation_right = mat4.create()
        mat4.fromTranslation(translation_right, right)
        let translation_up = mat4.create()
        mat4.fromTranslation(translation_up, up)
        mat4.mul(translation_right, translation_right, translation_up)
        mat4.mul(uniforms.Model, translation_right,uniforms.Model)

        mousePrevX = event.screenX;
        mousePrevY = event.screenY;
    };



    let zoom = (event) => {
        let camera_direction = vec3.create()
        let new_position = vec3.create()
        vec3.negate(camera_direction, camera.position)
        vec3.scaleAndAdd(new_position, camera.position, camera_direction, -event.deltaY*0.001)

        let length = vec3.length(new_position)
        if(length < 1 || length > 30) {
            return;
        }

        camera.position = new_position
        mat4.lookAt(uniforms.View, camera.position, [0,0,0], [0,1,0])
    };



    if ('onwheel' in document) {
        // IE9+, FF17+, Ch31+
        canvas.addEventListener("wheel", zoom);
    } else if ('onmousewheel' in document) {
        canvas.addEventListener("mousewheel", zoom);
    } else {
        // Firefox < 17
        canvas.addEventListener("MozMousePixelScroll", zoom);
    }
    



    canvas.addEventListener('pointerdown', function(event) {
        if(event.button == 0 && event.isPrimary) { // single touch
            mousePrevX = 0;
            mousePrevY = 0;
            canvas.addEventListener('pointermove', rotateCamera)
        }
        else if(event.button == 2 && event.isPrimary) {
            mousePrevX = 0;
            mousePrevY = 0;
            canvas.addEventListener('pointermove', translateCamera)   
        }
        else if(event.button == 0 && !event.isPrimary) { // multi-touch
            // TODO
        }
    })

    canvas.addEventListener('pointerup', function(event) {
        if(event.button == 0) {
            canvas.removeEventListener('pointermove', rotateCamera)
        }
        else if(event.button == 2) {
            canvas.removeEventListener('pointermove', translateCamera)
        }
    })
    


    let importer = new gltf2_importer()
    await importer.import("./assets/ruby_rose/scene.gltf")
    let shaderProgram = await Shader.loadFromFile(gl, "shaders/main.vert", "shaders/pbr.frag")


    let meshes = initWebGl(gl, importer)


    let sceneRootScale = getSceneRootScale(importer.scene_aabb)
    mat4.mul(uniforms.Model, uniforms.Model, sceneRootScale)


    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    draw(gl, shaderProgram, meshes, importer, uniforms)




    //  GUI
    var gui = new dat.GUI();
    gui.domElement.id = 'gui';
    var debugChannels = {'Debug Channels': 'None'};
    let channels =  [
        'None', 'Base Color', 'Metallic', 'Roughness', 
        'Normal', 'F0', 'F_Schlick','V_SmithGGXCorrelated', 
        'D_GGX', 'Diffuse', 'Specular', 'Emissive',
        'Alpha'
    ]

    let debugChannelsController = gui.add(debugChannels, 'Debug Channels', channels)

    debugChannelsController.onChange((value) => {
        let location = gl.getUniformLocation(shaderProgram, "debugValue");
        gl.uniform1f(location, channels.indexOf(value)) 
    })

}
 

window.onload = main;