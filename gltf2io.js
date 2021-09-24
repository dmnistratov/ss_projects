const {mat2, mat3, mat4, vec2, vec3, vec4, quat} = glMatrix;

export class gltf2_importer {
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


    async import(path) {
        this.path = path
        this.buffers = []

        //read gltf file
        let response = await fetch(path)
        this.json_file = await response.json()

        //read images/buffers
        let p_images = this.readImages(this.json_file['images'])
        let p_buffers = this.readBuffers(this.json_file['buffers'])
        let [buffers, images] = await Promise.all([p_buffers, p_images])
        this.images = images
        this.buffers = buffers

        this.textures = this.readTextures(this.json_file['textures'])
        this.materials = this.readMaterials(this.json_file['materials'])
        this.readMeshes(this.json_file['meshes'])


        this.nodes = new Array(this.json_file['scenes'].length)
        this.renderable = []

        this.readSceneGraph(this.json_file['scenes'][0]['nodes'][0])
        this.readSceneAABB()
        
    }



    readSceneGraph(node_index, parent_index = -1, offset = 1) {
        let json_node = this.json_file['nodes'][node_index]
        let transformation = this.readTransformation(json_node)
        let globalTransformation = mat4.create()


        if(parent_index != -1) {
            mat4.mul(globalTransformation, this.nodes[parent_index]['globalTransformation'], transformation)
        }
        else {
            globalTransformation = transformation
        }



        let node = {
            'parentIndex': parent_index,
            'localTransformation': transformation,
            'globalTransformation': globalTransformation
        }


        if(json_node['mesh'] !== undefined) {
            let aabb = this.readMeshAABB(json_node['mesh'], globalTransformation)
            node['aabb'] = aabb
            node['meshIndex'] =  json_node['mesh']
            this.renderable.push(node)
        }

        this.nodes[node_index] = node

        if(json_node['children'] !== undefined) {
            for(let child of json_node['children']) {
                this.readSceneGraph(child, node_index)
            }
        }

    }



    readMeshAABB(mesh, globalTransformation) {
        let json_mesh = this.json_file['meshes'][mesh]
        let mesh_aabb = {}
        for(let json_primitive of json_mesh['primitives'])  {
            let accessor_index = json_primitive['attributes']['POSITION']
            let accessor = this.json_file['accessors'][accessor_index]

            let min = vec4.fromValues(accessor['min'][0], accessor['min'][1], accessor['min'][2], 0)
            let max = vec4.fromValues(accessor['max'][0], accessor['max'][1], accessor['max'][2], 0)

            vec4.transformMat4(min, min, globalTransformation)
            vec4.transformMat4(max, max, globalTransformation)

            mesh_aabb['minx'] = mesh_aabb['minx'] ? Math.min(mesh_aabb['minx'], min[0]) : min[0]
            mesh_aabb['miny'] = mesh_aabb['miny'] ? Math.min(mesh_aabb['miny'], min[1]) : min[1]
            mesh_aabb['minz'] = mesh_aabb['minz'] ? Math.min(mesh_aabb['minz'], min[2]) : min[2]
            mesh_aabb['maxx'] = mesh_aabb['maxx'] ? Math.max(mesh_aabb['maxx'], max[0]) : max[0]
            mesh_aabb['maxy'] = mesh_aabb['maxy'] ? Math.max(mesh_aabb['maxy'], max[1]) : max[1]
            mesh_aabb['maxz'] = mesh_aabb['maxz'] ? Math.max(mesh_aabb['maxz'], max[2]) : max[2]
    
            mesh_aabb['width'] =  mesh_aabb['maxx'] - mesh_aabb['minx']
            mesh_aabb['height'] =  mesh_aabb['maxy'] - mesh_aabb['miny']
            mesh_aabb['depth'] =  mesh_aabb['maxz'] - mesh_aabb['minz']
        }

        return mesh_aabb
    }


    readTransformation(node) {
        let matrix = mat4.create()
        if(node['matrix']) {
            let m = node['matrix']
 
            matrix = mat4.fromValues(
                m[0],
                m[1],
                m[2],
                m[3],
                m[4],
                m[5],
                m[6],
                m[7],
                m[8],
                m[9],
                m[10],
                m[11],
                m[12],
                m[13],
                m[14],
                m[15])

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

    readSceneAABB() {
        this.scene_aabb = {}

        for(let mesh of this.renderable) {
            let aabb = mesh.aabb
            this.scene_aabb['minx'] = this.scene_aabb['minx'] ? Math.min(this.scene_aabb['minx'], aabb['minx']) : aabb['minx']
            this.scene_aabb['miny'] = this.scene_aabb['miny'] ? Math.min(this.scene_aabb['miny'], aabb['miny']) : aabb['miny']
            this.scene_aabb['minz'] = this.scene_aabb['minz'] ? Math.min(this.scene_aabb['minz'], aabb['minz']) : aabb['minz']
            this.scene_aabb['maxx'] = this.scene_aabb['maxx'] ? Math.max(this.scene_aabb['maxx'], aabb['maxx']) : aabb['maxx']
            this.scene_aabb['maxy'] = this.scene_aabb['maxy'] ? Math.max(this.scene_aabb['maxy'], aabb['maxy']) : aabb['maxy']
            this.scene_aabb['maxz'] = this.scene_aabb['maxz'] ? Math.max(this.scene_aabb['maxz'], aabb['maxz']) : aabb['maxz']
        }

        this.scene_aabb['width'] =  this.scene_aabb['maxx'] - this.scene_aabb['minx']
        this.scene_aabb['height'] =  this.scene_aabb['maxy'] - this.scene_aabb['miny']
        this.scene_aabb['depth'] =  this.scene_aabb['maxz'] - this.scene_aabb['minz']

    }



    readMaterials(json_materials) {
        let materials = []
        for(let json_material of json_materials) {
            let baseColorTexture;
            let metallicRoughnessTexture;
            let metallicFactor = 1;
            let roughnessFactor = 1;
            let baseColorFactor;
            let emissiveFactor = json_material['emissiveFactor'] ?  json_material['emissiveFactor'] : [1,1,1];
            if(json_material['pbrMetallicRoughness']) {
                baseColorTexture = json_material['pbrMetallicRoughness']['baseColorTexture']
                metallicRoughnessTexture = json_material['pbrMetallicRoughness']['metallicRoughnessTexture']
                metallicFactor = json_material['pbrMetallicRoughness']['metallicFactor']
                roughnessFactor = json_material['pbrMetallicRoughness']['roughnessFactor']
                baseColorFactor = json_material['pbrMetallicRoughness']['baseColorFactor']
            }


            let emissiveTexture = json_material['emissiveTexture'] 
            let emissiveTexcoord = emissiveTexture ? emissiveTexture['texCoord'] ? emissiveTexture['texCoord'] : 0 : -1
            let normalTexture = json_material['normalTexture']
            let baseColorTexcoord = baseColorTexture ? baseColorTexture['texCoord'] ? baseColorTexture['texCoord'] : 0 : -1
            let normalTexcoord = normalTexture ? normalTexture['texCoord'] ? normalTexture['texCoord'] : 0 : -1
            let metallicRoughnessTexcoord = metallicRoughnessTexture ? metallicRoughnessTexture['texCoord'] ? metallicRoughnessTexture['texCoord'] : 0 : -1

            materials.push({
                'baseColorTexture': baseColorTexture ?  baseColorTexture['index'] : undefined,
                'normalTexture': normalTexture ? normalTexture['index'] : undefined,
                'metallicRoughnessTexture': metallicRoughnessTexture ? metallicRoughnessTexture['index'] : undefined,
                'metallicFactor' : metallicFactor ? metallicFactor : 1,
                'roughnessFactor' : roughnessFactor ? roughnessFactor : 1,
                'emissiveTexture': emissiveTexture ? emissiveTexture['index'] : undefined,
                'emissiveTexcoord' : emissiveTexcoord,
                'emissiveFactor': emissiveFactor,
                'baseColorTexcoord': baseColorTexcoord,
                'normalTexcoord': normalTexcoord,
                'metallicRoughnessTexcoord': metallicRoughnessTexcoord,
                'baseColorFactor': baseColorFactor ? baseColorFactor : [1, 1, 1, 1]
            })
        }

        return materials
    }


    readTextures(json_textures) {
        if(!json_textures) return [];
        let textures = []
        for(let json_texture of json_textures) {
            let sampler = this.json_file['samplers'][json_texture['sampler']]
            let source = this.json_file['images'][json_texture['source']]
            textures.push({
                'magFilter': sampler['magFilter'] ? sampler['magFilter'] : 9729,
                'minFilter': sampler['minFilter'] ? sampler['minFilter'] : 9729,
                'wrapS': sampler['wrapS'] ? sampler['wrapS'] : 10497,
                'wrapT': sampler['wrapT'] ? sampler['wrapT'] : 10497,
                'name': source['name'],
                'source_index': json_texture['source']
            })
        }
        return textures
    }


    async readImages(json_images) {
        if(!json_images) return;
        let path_to_asset = this.path.substring(0, this.path.lastIndexOf("/"));
        let images = []
        for(let json_image of json_images) {
            images.push(
                new Promise((resolve, reject) => {
                    let image_path = path_to_asset + '/' + json_image['uri']
                    let image = new Image()
                    image.src = image_path
                    image.addEventListener('load', function() {
                        resolve(this);
                    });
                })
            )
        }
        return Promise.all(images)
    }


    readMeshes(json_meshes) {
        for(let json_mesh of json_meshes) {
            for(let json_primitive of json_mesh['primitives']) {
                let vertices = this.readAccessor(json_primitive['attributes']['POSITION'])
                let normals = this.readAccessor(json_primitive['attributes']['NORMAL'])
                let texcoords0 = this.readAccessor(json_primitive['attributes']['TEXCOORD_0'])
                let texcoords1 = undefined
                if('TEXCOORD_1' in json_primitive['attributes']) {
                    texcoords1 = this.readAccessor(json_primitive['attributes']['TEXCOORD_1'])
                }

                let indices = this.readAccessor(json_primitive['indices'])

                let material_index = json_primitive['material']
                this.meshes.push({
                    'vertices': vertices,
                    'indices': indices,
                    'normals': normals,
                    'texcoords0': texcoords0,
                    'texcoords1': texcoords1,
                    'material_index': material_index
                })
            }
        }
    }


    readAccessor(index) {
        let accessor = this.json_file['accessors'][index]
        if(!accessor) return;

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
            uris.push(fetch(path_to_asset + '/' + json_buffer['uri']))
        }

        return Promise.all(uris).then(responses => {
            return Promise.all(responses.map(r => r.arrayBuffer()))
        })
    }
}


