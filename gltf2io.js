const {mat2, mat3, mat4, vec2, vec3, vec4, quat} = glMatrix;

export class gltf2io {

    static component_type_map = {
        5120: 1,
        5121: 1,
        5122: 2,
        5123: 2,
        5125: 4,
        5126: 4
    }

    static number_of_components_map = {
        "SCALAR": 1,
        "VEC2": 2,
        "VEC3": 3,
        "VEC4": 4,
        "MAT2": 4,
        "MAT3": 9,
        "MAT4": 16
    }
    

    static async import(path) {
        this.pathToFile = path
        

        let response = await fetch(path)
        this.gltf = await response.json()
        this.buffers = await this.readBuffers()

        this.meshes = []

        if(this.gltf.textures) {
            this.textures = this.readTextures()
        }
        this.materials = this.readMaterials()
        this.scenes = this.gltf.scenes

        this.nodes = new Array(this.gltf.nodes.length)
        this.readNodes()
        this.readMeshes()

        if(this.gltf.skins) {
            this.skins = this.readSkins()
        }

        if(this.gltf.animations) {
            this.animations = this.readAnimations()
        }

        return {
            'scenes': this.scenes,
            'nodes': this.nodes,
            'meshes': this.meshes,
            'textures': this.textures,
            'materials': this.materials,
            'skins': this.skins,
            'animations': this.animations
        }
    }

   
    static readAnimations() {
        let animations = this.gltf.animations
        for(let animation of animations) {
            animation.duration = 0
            for(let sampler of animation.samplers) {
                sampler.input = this.readAccessor(sampler.input)
                sampler.output = this.readAccessor(sampler.output)
                animation.duration = Math.max(animation.duration, sampler.input.buffer[sampler.input.buffer.length-1])
            }
        }

        return animations
    }


    static readSkins() {
        let skins = []
        for(let skin of this.gltf.skins) {
            let joints = skin.joints
            let inverseBindMatrices = this.readAccessor(skin.inverseBindMatrices)
            skins.push({
                'joints': joints,
                'inverseBindMatrices': inverseBindMatrices,
                'skeleton': skin.skeleton || joints[0]
            })
        }
        return skins
    }


    static readNodes() {

        let readSceneNodes = (nodeIndex, parentIndex = -1) => {
            let nodeLocalTransformation = this.readLocalTransformation(this.gltf.nodes[nodeIndex])
            let globalTransformation = mat4.create()

            if(parentIndex != -1) {
                mat4.mul(globalTransformation, this.nodes[parentIndex].globalTransformation, nodeLocalTransformation)
            }
            else {
                globalTransformation = nodeLocalTransformation
            }

            this.nodes[nodeIndex] = {
                'localTransformation': nodeLocalTransformation,
                'globalTransformation': globalTransformation,
                'parent': parentIndex
            }

            if(this.gltf.nodes[nodeIndex].mesh !== undefined) {
                this.nodes[nodeIndex].mesh = this.gltf.nodes[nodeIndex].mesh
            }

            if(this.gltf.nodes[nodeIndex].skin !== undefined) {
                this.nodes[nodeIndex].skin = this.gltf.nodes[nodeIndex].skin
            }

            if(this.gltf.nodes[nodeIndex].children !== undefined) {
                this.nodes[nodeIndex].children = this.gltf.nodes[nodeIndex].children
                for(let childIndex of this.gltf.nodes[nodeIndex].children) {
                    readSceneNodes(childIndex, nodeIndex)
                }
            }
        }

        for(let gltfScene of this.gltf.scenes) {
            for(let sceneRootIndex of gltfScene.nodes) {
                readSceneNodes(sceneRootIndex)
            }
        }
        // console.log(this.nodes)
    }

    static readLocalTransformation(node) {
        let matrix = mat4.create()
        if(node['matrix']) {
            let m = node['matrix']
            matrix = mat4.fromValues.apply(null, node['matrix'] )

        }
        else {
            let scale = vec3.fromValues(1,1,1)
            let translation = vec3.fromValues(0,0,0)
            let rotation = quat.fromValues(0,0,0,1)
            
            if(node['rotation']) {
                rotation = quat.fromValues(node['rotation'][0],node['rotation'][1],node['rotation'][2],node['rotation'][3])
            }
            if(node['scale']) {
                scale = vec3.fromValues(node['scale'][0],node['scale'][1],node['scale'][2])
            }
            if(node['translation']) {
                translation = vec3.fromValues(node['translation'][0],node['translation'][1],node['translation'][2])
            }
            quat.normalize(rotation, rotation)
            mat4.fromRotationTranslationScale(matrix, rotation, translation, scale)

            let s = mat4.create()
            let r = mat4.create()
            let t = mat4.create() 
            mat4.fromScaling(s, scale)
            mat4.fromQuat(r, rotation)
            mat4.fromTranslation(t, translation)

            mat4.mul(matrix, t, r)
            mat4.mul(matrix, matrix, s)
        }
        return matrix
    }

    
    static readTextures() {
        let textures = []
        for(let gltfTexture of this.gltf.textures) {
            let textureSource =  this.pathToFile.substring(0, this.pathToFile.lastIndexOf("/")) + '/' + this.gltf.images[gltfTexture.source].uri
            let textureSampler = this.gltf.samplers[gltfTexture.sampler]
            textures.push({
                'source': textureSource,
                'sampler': textureSampler 
            })
        }
        return textures
    }

    static readMaterials() {
        let MAX_TEXCOORDS = 1
        let materials = []
        for(let gltfMaterial of this.gltf.materials) {
            let material = {}
            if(gltfMaterial.normalTexture) {
                let index = gltfMaterial.normalTexture.index
                let texCoord = gltfMaterial.normalTexture.texCoord || 0
                // if(texCoord > MAX_TEXCOORDS) texCoord = 0
                material['normalTexture'] = {
                    'index': index,
                    'texCoord': texCoord
                }
            }
            if(gltfMaterial.emissiveTexture) {
                let index = gltfMaterial.emissiveTexture.index
                let texCoord = gltfMaterial.emissiveTexture.texCoord || 0
                // if(texCoord > MAX_TEXCOORDS) texCoord = 0
                material['emissiveTexture'] = {
                    'index': index,
                    'texCoord': texCoord
                }
            }
            let pbr = {
                'baseColorFactor':  [1,1,1,1],
                'metallicFactor': 1,
                'roughnessFactor': 1
            }
            if(gltfMaterial.pbrMetallicRoughness) {
                pbr.baseColorFactor = gltfMaterial.pbrMetallicRoughness.baseColorFactor || pbr.baseColorFactor
                pbr.metallicFactor = gltfMaterial.pbrMetallicRoughness.metallicFactor || pbr.metallicFactor
                pbr.roughnessFactor = gltfMaterial.pbrMetallicRoughness.roughnessFactor || pbr.roughnessFactor
                if(gltfMaterial.pbrMetallicRoughness.metallicRoughnessTexture) {
                    let index = gltfMaterial.pbrMetallicRoughness.metallicRoughnessTexture.index
                    let texCoord = gltfMaterial.pbrMetallicRoughness.metallicRoughnessTexture.texCoord || 0
                    // if(texCoord > MAX_TEXCOORDS) texCoord = 0
                    pbr.metallicRoughnessTexture = {
                        'index': index,
                        'texCoord': texCoord
                    }
                }
                if(gltfMaterial.pbrMetallicRoughness.baseColorTexture) {
                    let index = gltfMaterial.pbrMetallicRoughness.baseColorTexture.index
                    let texCoord = gltfMaterial.pbrMetallicRoughness.baseColorTexture.texCoord || 0
                    // if(texCoord > MAX_TEXCOORDS) texCoord = 0
                    pbr.baseColorTexture = {
                        'index': index,
                        'texCoord': texCoord
                    }
                }
            }
            material.pbrMetallicRoughness = pbr

            material.emissiveFactor = gltfMaterial.emissiveFactor || [0,0,0]

            if(gltfMaterial.alphaMode) {
                material.alphaMode = gltfMaterial.alphaMode
            }

            materials.push(material)
        }

        return materials
    }

    static readMeshes() {
        for(let gltfMesh of this.gltf.meshes) {
            let mesh = {'primitives': []}
            for(let gltfPrimitive of gltfMesh.primitives) {
                let attributes = {}
                for(let vertexAttrib in gltfPrimitive.attributes) {
                    attributes[vertexAttrib] = this.readAccessor(gltfPrimitive.attributes[vertexAttrib])
                }
                let indices = this.readAccessor(gltfPrimitive.indices)
                let mode = gltfPrimitive.mode || 4

                let material = this.materials[gltfPrimitive.material]

                mesh.primitives.push({
                    'attributes': attributes,
                    'indices': indices,
                    'mode': mode,
                    'material': material
                })
            }
            this.meshes.push(mesh)
        }
    }


    static readAccessor(index) {
        let accessor = this.gltf['accessors'][index]

        let bufferView = this.gltf['bufferViews'][accessor['bufferView']]
        let buffer_index = bufferView['buffer']
        let buffer = this.buffers[buffer_index]
        let buffer_size = accessor['count']*this.number_of_components_map[accessor['type']]
        let byteOffset = bufferView['byteOffset'] ? bufferView['byteOffset'] : 0
        byteOffset += accessor['byteOffset'] ? accessor['byteOffset'] : 0
        let typed_buffer = []
        if(accessor['componentType'] == 5125) {
            typed_buffer = new Uint32Array(buffer, byteOffset, buffer_size)
        }
        else if(accessor['componentType'] == 5126) {
            typed_buffer = new Float32Array(buffer, byteOffset, buffer_size)
        }
        else if(accessor['componentType'] == 5121) {
            typed_buffer = new Int8Array(buffer, byteOffset, buffer_size)
        }
        else if(accessor['componentType'] == 5123) {
            typed_buffer = new Uint16Array(buffer, byteOffset, buffer_size)
        }
        else if(accessor['componentType'] == 5122) {
            typed_buffer = new Int16Array(buffer, byteOffset, buffer_size)
        }
        else if(accessor['componentType'] == 5120) {
            typed_buffer = new Int8Array(buffer, byteOffset, buffer_size)
        }

        let output = {
            'buffer': typed_buffer,
            'componentType': accessor.componentType,
            'type': accessor.type
        }

        if(accessor.min !== undefined) {
            output.min = accessor.min
        }
        if(accessor.min !== undefined) {
            output.max = accessor.max
        }

        return output
    }


    static async readBuffers() {
        let path_to_asset = this.pathToFile.substring(0, this.pathToFile.lastIndexOf("/"));
        let uris = []
        for(let json_buffer of this.gltf.buffers) {
            uris.push(fetch(path_to_asset + '/' + json_buffer['uri']))
        }
        return Promise.all(uris).then(responses => {
            return Promise.all(responses.map(r => r.arrayBuffer()))
        })
    }
}