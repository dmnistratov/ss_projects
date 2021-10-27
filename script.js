import { gltf2io } from "./gltf2io.js";
import { Shader } from "./shader.js";
const {mat2, mat3, mat4, vec2, vec3, vec4, quat} = glMatrix;





async function createTextures(gl, textures) {
    let promises = []
    for(let gltfTexture of textures) {
        let imagePath = gltfTexture.source
        let image = new Image()
        image.src = imagePath

        promises.push(new Promise((resolve, reject) => {
            image.addEventListener('load', function() {
                resolve(this);
            });
        }))
    }

    return Promise.all(promises).then(images => {
        let webGlTextures = []
        for(let index in images) {
            var texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, textures[index].sampler.wrapS);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, textures[index].sampler.wrapT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, textures[index].sampler.minFilter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, textures[index].sampler.magFilter);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[index]);
            gl.generateMipmap(gl.TEXTURE_2D)
            webGlTextures.push(texture);
        }

        return webGlTextures
    })
}



function createSkinTextures(gl, gltfModel) {
    for(let skin of gltfModel.skins) {
        let root = gltfModel.nodes[gltfModel.nodes[skin.skeleton].parent]
        let rootTranform = mat4.fromValues.apply(null, root.globalTransformation)
        mat4.invert(rootTranform, rootTranform)

        let joints = []

        for(let jointIndex in skin.joints) {
            let jointNode = gltfModel.nodes[skin.joints[jointIndex]]
            let inverseBindMatrix = mat4.fromValues.apply(null, skin.inverseBindMatrices.buffer.slice(jointIndex*16, jointIndex*16+16))

            let jointTransform = mat4.create()
            mat4.mul(jointTransform, jointNode.globalTransformation, inverseBindMatrix)
            mat4.mul(jointTransform, rootTranform, jointTransform)

            joints.push.apply(joints, jointTransform)
        }

        console.log(joints)
        var skinTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, skinTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, skin.joints.length, 0, gl.RGBA, gl.FLOAT, new Float32Array(joints));
        skin.texture = skinTexture
    }
}



async function initWebGl(gl, gltfModel) {

    if(gltfModel.textures) {
        let webGlTextures = await createTextures(gl, gltfModel.textures)
        for(let gltfMaterial of gltfModel.materials) {

            if(gltfMaterial.pbrMetallicRoughness.baseColorTexture) {
                gltfMaterial.pbrMetallicRoughness.baseColorTexture.webGlTexture = webGlTextures[gltfMaterial.pbrMetallicRoughness.baseColorTexture.index]
            }
            if(gltfMaterial.pbrMetallicRoughness.metallicRoughnessTexture) {
                gltfMaterial.pbrMetallicRoughness.metallicRoughnessTexture.webGlTexture = webGlTextures[gltfMaterial.pbrMetallicRoughness.metallicRoughnessTexture.index]
            }

            if(gltfMaterial.normalTexture) {
                gltfMaterial.normalTexture.webGlTexture = webGlTextures[gltfMaterial.normalTexture.index]
            }
            if(gltfMaterial.emissiveTexture) {
                gltfMaterial.emissiveTexture.webGlTexture = webGlTextures[gltfMaterial.emissiveTexture.index]
            }
        }
    }

    if(gltfModel.skins) {
        createSkinTextures(gl, gltfModel)
    }

    let number_of_components_map = {
        "SCALAR": 1,
        "VEC2": 2,
        "VEC3": 3,
        "VEC4": 4,
        "MAT2": 4,
        "MAT3": 9,
        "MAT4": 16
    }




    for(let renderable of gltfModel.renderable) {
        let mesh = gltfModel.meshes[renderable.mesh]
        for(let gltfPrimitive of mesh.primitives) {
            let vertexAttribs = gltfPrimitive.attributes

            let positions = vertexAttribs['POSITION']
            gltfPrimitive.vao = gl.createVertexArray()
            gl.bindVertexArray(gltfPrimitive.vao)
            let positionBuffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, positions.buffer, gl.STATIC_DRAW);
            gl.vertexAttribPointer(0, number_of_components_map[positions.type], positions.componentType, false, 0, 0);
            gl.enableVertexAttribArray(0);

            if(vertexAttribs['NORMAL']) {
                let normals = vertexAttribs['NORMAL']
                let normalBuffer = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
                gl.bufferData(gl.ARRAY_BUFFER, normals.buffer, gl.STATIC_DRAW);
                gl.vertexAttribPointer(1, number_of_components_map[normals.type], normals.componentType, false, 0, 0);
                gl.enableVertexAttribArray(1);
            }
            if(vertexAttribs['TEXCOORD_0']) {
                let texcoords0 = vertexAttribs['TEXCOORD_0']
                let texcoord0Buffer = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, texcoord0Buffer)
                gl.bufferData(gl.ARRAY_BUFFER, texcoords0.buffer, gl.STATIC_DRAW);
                gl.vertexAttribPointer(2, number_of_components_map[texcoords0.type], texcoords0.componentType, false, 0, 0);
                gl.enableVertexAttribArray(2);
            }
            if(vertexAttribs['TEXCOORD_1']) {
                let texcoords1 = vertexAttribs['TEXCOORD_0']
                let texcoord1Buffer = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, texcoord1Buffer)
                gl.bufferData(gl.ARRAY_BUFFER, texcoords1.buffer, gl.STATIC_DRAW);
                gl.vertexAttribPointer(3, number_of_components_map[texcoords1.type], texcoords1.componentType, false, 0, 0);
                gl.enableVertexAttribArray(3);
            }


            if(vertexAttribs['JOINTS_0']) {
                let joints0 = vertexAttribs['JOINTS_0']
                let joint0Buffer = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, joint0Buffer)
                gl.bufferData(gl.ARRAY_BUFFER, joints0.buffer, gl.STATIC_DRAW);
                gl.vertexAttribPointer(4, number_of_components_map[joints0.type], joints0.componentType, false, 0, 0);
                gl.enableVertexAttribArray(4);
            }

            if(vertexAttribs['WEIGHTS_0']) {
                let weights0 = vertexAttribs['WEIGHTS_0']
                let weight0Buffer = gl.createBuffer()
                gl.bindBuffer(gl.ARRAY_BUFFER, weight0Buffer)
                gl.bufferData(gl.ARRAY_BUFFER, weights0.buffer, gl.STATIC_DRAW);
                gl.vertexAttribPointer(5, number_of_components_map[weights0.type], weights0.componentType, false, 0, 0);
                gl.enableVertexAttribArray(5);
            }

            let ebo = gl.createBuffer()
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo)
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER , gltfPrimitive.indices.buffer, gl.STATIC_DRAW);
        }
    }

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


    // // disable right-click context menu
    canvas.oncontextmenu = (event) => { 
        event.preventDefault();
        event.stopPropagation(); 
    }

    let gltfModel = await gltf2io.import("./assets/mclaren_p1/scene.gltf")





    gltfModel.renderable = gltfModel.nodes.filter((node) => node.mesh !== undefined)


    let shader = await Shader.loadFromFile(gl, './shaders/default.vert', './shaders/pbr.frag')

    await initWebGl(gl, gltfModel)



    let getSceneRootScale = (nodes) => {
        let aabb = {}
        for(let node of nodes) {
            let mesh = gltfModel.meshes[node.mesh]
            for(let primitive of mesh.primitives) {
                if(primitive.attributes.POSITION !== undefined) {
                    let min = vec3.fromValues.apply(null, primitive.attributes.POSITION.min)
                    let max = vec3.fromValues.apply(null, primitive.attributes.POSITION.max)
                    vec3.transformMat4(min, min, node.globalTransformation)
                    vec3.transformMat4(max, max, node.globalTransformation)

                    aabb['minx'] = aabb['minx'] == undefined ? min[0] : Math.min(min[0], aabb['minx'])
                    aabb['miny'] = aabb['miny'] == undefined ? min[1] : Math.min(min[1], aabb['miny'])
                    aabb['minz'] = aabb['minz'] == undefined ? min[2] : Math.min(min[2], aabb['minz'])
                    aabb['maxx'] = aabb['maxx'] == undefined ? max[0] : Math.max(max[0], aabb['maxx'])
                    aabb['maxy'] = aabb['maxy'] == undefined ? max[1] : Math.max(max[1], aabb['maxy'])
                    aabb['maxz'] = aabb['maxz'] == undefined ? max[2] : Math.max(max[2], aabb['maxz'])
                }
            }
        }

        let width = aabb.maxx - aabb.minx
        let height = aabb.maxy - aabb.miny
        let depth = aabb.maxz - aabb.minz

        let max_size = Math.max(width, height)
        max_size = Math.max(max_size, depth)

        let sceneRootScale = mat4.create()
        mat4.fromScaling(sceneRootScale, vec4.fromValues(2/max_size, 
                                                         2/max_size, 
                                                         2/max_size))

        let center = vec3.fromValues(
            (aabb['maxx']+aabb['minx'])/2,
            (aabb['maxy']+aabb['miny'])/2,
            (aabb['maxz']+aabb['minz'])/2
        )

        vec3.negate(center, center)
        mat4.translate(sceneRootScale, sceneRootScale, center)
        return sceneRootScale
    }


    
    let Model = getSceneRootScale(gltfModel.renderable)
    let View = mat4.create()
    let Projection = mat4.create()


    let mousePrevX;
    let mousePrevY;

    let rotateCamera  = (event) => {
        let dx = -(mousePrevX ? event.screenX - mousePrevX : 0)*0.004
        let dy = (mousePrevY ? event.screenY - mousePrevY : 0)*0.004
        let radius = vec3.length(camera.position)

        let theta = Math.asin(camera.position[1]/radius)
        theta += dy
        theta = Math.min(Math.max(theta, -Math.PI/2), Math.PI/2);

        let phi = Math.atan2(camera.position[0],camera.position[2])
        phi += dx

        camera.position[1] = radius*Math.sin(theta)
        camera.position[0] = radius*Math.sin(phi)*Math.cos(theta)
        camera.position[2] = radius*Math.cos(phi)*Math.cos(theta)
        mat4.lookAt(View, camera.position, [0,0,0], [0,1,0])

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
        mat4.mul(Model, translation_right, Model)

        mousePrevX = event.screenX;
        mousePrevY = event.screenY;
    };



    let zoom = (event) => {
        let camera_direction = vec3.create()
        let new_position = vec3.create()
        vec3.negate(camera_direction, camera.position)
        vec3.scaleAndAdd(new_position, camera.position, camera_direction, -event.deltaY*0.001)

        let length = vec3.length(new_position)
        // if(length < 1 || length > 30) {
        //     return;
        // }

        camera.position = new_position
        mat4.lookAt(View, camera.position, [0,0,0], [0,1,0])
    };


    canvas.addEventListener('pointerdown', function(event) {
        if(event.isPrimary) { // single touch
            if(event.button == 0) { // rotate camera
                mousePrevX = 0;
                mousePrevY = 0;
                canvas.addEventListener('pointermove', rotateCamera)
                canvas.addEventListener('pointerup', function(event) {
                    if(event.button == 0) {
                        canvas.removeEventListener('pointermove', rotateCamera)
                    }
                })
            }
            else if(event.button == 2) { // translate camera
                mousePrevX = 0;
                mousePrevY = 0;
                canvas.addEventListener('pointermove', translateCamera)
                canvas.addEventListener('pointerup', function(event) {
                    if(event.button == 2) {
                        canvas.removeEventListener('pointermove', translateCamera)
                    }
                })
            }
        }
        else {
            canvas.removeEventListener('pointermove', rotateCamera)
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

    if ('onwheel' in document) {
        // IE9+, FF17+, Ch31+
        canvas.addEventListener("wheel", zoom);
    } else if ('onmousewheel' in document) {
        canvas.addEventListener("mousewheel", zoom);
    } else {
        // Firefox < 17
        canvas.addEventListener("MozMousePixelScroll", zoom);
    }


    let camera = {
        'position': vec3.fromValues(2,2,2)
    }

    let toRadian = glMatrix.glMatrix.toRadian
    // out, fovy, aspect, near, far
    mat4.perspective(Projection, toRadian(45.0), canvas.width/canvas.height, 0.8, 1000.0)
    // out, eye, center, up
    mat4.lookAt(View, camera.position, vec3.fromValues(0,0,0), vec3.fromValues(0,1,0))


    shader.use()
    shader.setUniform("Model", Model)
    shader.setUniform("View", View)
    shader.setUniform("Projection", Projection)
    shader.setUniform("color", [1,1,1,1])


    gl.clearColor(0,0,0,1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    



    let applyMaterial = (shader, material) => {
        if(material.pbrMetallicRoughness.baseColorTexture) {
            gl.activeTexture(gl.TEXTURE0)
            shader.setUniform("material.baseColorTexture", 0)
            shader.setUniform("material.baseColorTexcoord", material.pbrMetallicRoughness.baseColorTexture.texCoord)
            gl.bindTexture(gl.TEXTURE_2D, material.pbrMetallicRoughness.baseColorTexture.webGlTexture)
        }
        else {
            shader.setUniform("material.baseColorTexcoord", -1)
        }
        if(material.pbrMetallicRoughness.metallicRoughnessTexture) {
            gl.activeTexture(gl.TEXTURE0 + 2)
            shader.setUniform("material.metallicRoughnessTexture", 2)
            shader.setUniform("material.metallicRoughnessTexcoord", material.pbrMetallicRoughness.metallicRoughnessTexture.texCoord)
            gl.bindTexture(gl.TEXTURE_2D, material.pbrMetallicRoughness.metallicRoughnessTexture.webGlTexture)
        }
        else {
            shader.setUniform("material.metallicRoughnessTexcoord", -1)
        }


        if(material.normalTexture) {
            gl.activeTexture(gl.TEXTURE0 + 1)
            shader.setUniform("material.normalTexture", 1)
            shader.setUniform("material.normalTexcoord", material.normalTexture.texCoord)
            gl.bindTexture(gl.TEXTURE_2D, material.normalTexture.webGlTexture)
        }
        else {
            shader.setUniform("material.normalTexcoord", -1)
        }

        if(material.emissiveTexture) {
            gl.activeTexture(gl.TEXTURE0 + 3)
            shader.setUniform("material.emissiveTexture", 3)
            shader.setUniform("material.emissiveTexcoord", material.emissiveTexture.texCoord)
            gl.bindTexture(gl.TEXTURE_2D, material.emissiveTexture.webGlTexture)
        }
        else {
            shader.setUniform("material.emissiveTexcoord", -1)
        }
        shader.setUniform("material.baseColorFactor", material.pbrMetallicRoughness.baseColorFactor)
        shader.setUniform("material.metallicFactor", material.pbrMetallicRoughness.metallicFactor)
        shader.setUniform("material.roughnessFactor", material.pbrMetallicRoughness.roughnessFactor)
        shader.setUniform("material.emissiveFactor", material.emissiveFactor)
    }


    function sortByDepth(meshes, view) {
        meshes.sort((a,b) => {
            let aPos = vec3.create()
            let bPos = vec3.create()
            let amatrix = mat4.create()
            let bmatrix = mat4.create()
            mat4.mul(amatrix, view, a.node.globalTransformation)
            mat4.mul(bmatrix, view, b.node.globalTransformation)

            mat4.getTranslation(aPos, amatrix)
            mat4.getTranslation(bPos, bmatrix)
            
            return bPos[2] - aPos[2]
        })
    }


    let updateAnimations = (animation, time) => {
        let currentTime = time % animation.duration
        for(let channel of animation.channels) {
            let node = gltfModel.nodes[channel.target.node]
            let path = channel.target.path
            let sampler = animation.samplers[channel.sampler]

            for(let keyFrameIndex=0; keyFrameIndex < sampler.input.buffer.length-1; keyFrameIndex++) {
                if(currentTime >= sampler.input.buffer[keyFrameIndex] && currentTime < sampler.input.buffer[keyFrameIndex+1]) {
                    let rotation = quat.create()
                    let scaling = vec3.create()
                    let translation = vec3.create()

                    mat4.getRotation(rotation, node.localTransformation)
                    mat4.getScaling(scaling, node.localTransformation)
                    mat4.getTranslation(translation, node.localTransformation)
                    
                    let dt = sampler.input.buffer[keyFrameIndex+1] - sampler.input.buffer[keyFrameIndex]
                    let factor = (currentTime - sampler.input.buffer[keyFrameIndex])/dt;

                    if(path == "rotation") {
                        rotation = quat.fromValues.apply(null, sampler.output.buffer.slice(keyFrameIndex*4, keyFrameIndex*4+4))
                        let nextRotation = quat.fromValues.apply(null, sampler.output.buffer.slice((keyFrameIndex+1)*4, (keyFrameIndex+1)*4+4))
                        quat.slerp(rotation, rotation, nextRotation, factor)
                    }
                    else if(path == "scale") {
                        scaling = vec3.fromValues.apply(null, sampler.output.buffer.slice(keyFrameIndex*3, keyFrameIndex*3+3))
                        let nextScaling = vec3.fromValues.apply(null, sampler.output.buffer.slice((keyFrameIndex+1)*3, (keyFrameIndex+1)*3+3))
                        quat.lerp(scaling, scaling, nextScaling, factor)
                    }
                    else if(path == "translation") {
                        translation = vec3.fromValues.apply(null, sampler.output.buffer.slice(keyFrameIndex*3, keyFrameIndex*3+3))
                        let nextTranslation = vec3.fromValues.apply(null, sampler.output.buffer.slice((keyFrameIndex+1)*3, (keyFrameIndex+1)*3+3))
                        quat.lerp(translation, translation, nextTranslation, factor)
                    }
                    
                    mat4.fromRotationTranslationScale(node.localTransformation, rotation, translation, scaling)
                    break
                }
            }
        }
    }



    let updateTransformations = () => {
        let update = (node) => {
            if(node.parent == -1) {
                node.globalTransformation = node.localTransformation
            }
            else {
                mat4.mul(node.globalTransformation, gltfModel.nodes[node.parent].globalTransformation, node.localTransformation)
            }

            if(node.children) {
                for(let child of node.children) {
                    update(gltfModel.nodes[child])
                }
            }
        }

        for(let scene of gltfModel.scenes) {
            for(let node of scene.nodes) {
                update(gltfModel.nodes[node])
            }
        }
    }



    let updateSkins = () => {
        for(let skin of gltfModel.skins) {
            let root = gltfModel.nodes[gltfModel.nodes[skin.skeleton].parent]
            let rootTranform = mat4.fromValues.apply(null, root.globalTransformation)
            mat4.invert(rootTranform, rootTranform)
    
            let joints = []
    
            for(let jointIndex in skin.joints) {
                let jointNode = gltfModel.nodes[skin.joints[jointIndex]]
                let inverseBindMatrix = mat4.fromValues.apply(null, skin.inverseBindMatrices.buffer.slice(jointIndex*16, jointIndex*16+16))
    
                let jointTransform = mat4.create()
                mat4.mul(jointTransform, jointNode.globalTransformation, inverseBindMatrix)
                mat4.mul(jointTransform, rootTranform, jointTransform)
    
                joints.push.apply(joints, jointTransform)
            }
    
            var skinTexture = skin.texture;
            gl.bindTexture(gl.TEXTURE_2D, skinTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, skin.joints.length, 0, gl.RGBA, gl.FLOAT, new Float32Array(joints));
        }
    }
        
    


    let draw = () => {
        gl.clear(gl.COLOR_BUFFER_BIT)
        shader.setUniform("View", View)

        if(gltfModel.animations) {
            updateAnimations(gltfModel.animations[0], new Date().getTime()/1000)
            updateTransformations()
            if(gltfModel.skins) {
                updateSkins()
            }
        }

        let nodes = []
        for(let renderable of gltfModel.renderable) {
            let mesh = gltfModel.meshes[renderable.mesh]
            for(let primitive of mesh.primitives) {
                nodes.push({'node': renderable, 'primitive': primitive})
            }
        }
        let transparent = nodes.filter(({node, primitive}) => primitive.material.alphaMode)
        let opaque = nodes.filter(({node, primitive}) => primitive.material.alphaMode == undefined)

        sortByDepth(transparent, View)


        for(let {node, primitive} of opaque) {
            let mesh = gltfModel.meshes[node.mesh]
            gl.bindVertexArray(primitive.vao)
            let nodeTransform = mat4.create()
            mat4.mul(nodeTransform, Model, node.globalTransformation)
            shader.setUniform("Model", nodeTransform)
            applyMaterial(shader, primitive.material)
            shader.setUniform("cameraPosition", camera.position)

            if(node.skin !== undefined) {
                shader.setUniform("boneCount", gltfModel.skins[node.skin].joints.length)
                gl.activeTexture(gl.TEXTURE0 + 5)
                shader.setUniform("skinTexture", 5)
                gl.bindTexture(gl.TEXTURE_2D,  gltfModel.skins[node.skin].texture)
            }
            else {
                shader.setUniform("boneCount", 0)
            }

            gl.drawElements(primitive.mode, primitive.indices.buffer.length, primitive.indices.componentType, 0);
        }

        for(let {node, primitive} of transparent) {
            let mesh = gltfModel.meshes[node.mesh]
            gl.bindVertexArray(primitive.vao)
            let nodeTransform = mat4.create()
            mat4.mul(nodeTransform, Model, node.globalTransformation)
            shader.setUniform("Model", nodeTransform)
            applyMaterial(shader, primitive.material)
            shader.setUniform("cameraPosition", camera.position)

            if(node.skin !== undefined) {
                shader.setUniform("boneCount", gltfModel.skins[node.skin].joints.length)
                gl.activeTexture(gl.TEXTURE0 + 5)
                shader.setUniform("skinTexture", 5)
                gl.bindTexture(gl.TEXTURE_2D,  gltfModel.skins[node.skin].texture)
            }
            else {
                shader.setUniform("boneCount", 0)
            }

            gl.drawElements(primitive.mode, primitive.indices.buffer.length, primitive.indices.componentType, 0);
        }

        requestAnimationFrame(draw)
    }


    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendEquation(gl.FUNC_ADD);
    draw()

   
}
 

window.onload = main;
