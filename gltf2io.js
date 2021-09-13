
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
    }



    readMaterials(json_materials) {
        let materials = []
        for(let json_material of json_materials) {
            let baseColorTexture = json_material['pbrMetallicRoughness']['baseColorTexture']
            let normalTexture = json_material['normalTexture']
            let baseColorFactor = json_material['pbrMetallicRoughness']['baseColorFactor']
            let baseColorTexcoord = baseColorTexture ? 0 : -1
            let normalTexcoord = normalTexture ? 0 : -1

            materials.push({
                'normalTexture': normalTexture ? normalTexture['index'] : undefined,
                'baseColorTexture': baseColorTexture ?  baseColorTexture['index'] : undefined,
                'baseColorTexcoord': baseColorTexcoord,
                'normalTexcoord': normalTexcoord,
                'baseColorFactor': baseColorFactor ? baseColorFactor : [1, 1, 1, 1]
            })
        }

        return materials
    }


    readTextures(json_textures) {
        let textures = []

        for(let json_texture of json_textures) {
            let sampler = this.json_file['samplers'][json_texture['sampler']]
            let source = this.json_file['images'][json_texture['source']]
            
            textures.push({
                'magFilter': sampler['magFilter'] ? sampler['magFilter'] : 9729,
                'minFilter': sampler['minFilter'] ? sampler['minFilter'] : 9728,
                'wrapS': sampler['wrapS'] ? sampler['wrapS'] : 10497,
                'wrapT': sampler['wrapT'] ? sampler['wrapT'] : 10497,
                'name': source['name'],
                'source_index': json_texture['source']
            })
        }
        return textures
    }


    async readImages(json_images) {
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

                let indices = this.readAccessor(json_primitive['indices'])
                let material_index = json_primitive['material']
                this.meshes.push({
                    'vertices': vertices,
                    'indices': indices,
                    'normals': normals,
                    'texcoords0': texcoords0,
                    'material_index': material_index
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


    readBuffers(json_buffers) {
        let path_to_asset = this.path.substring(0, this.path.lastIndexOf("/"));
        let uris = []
        for(let json_buffer of json_buffers) {
            uris.push(fetch(path_to_asset + '/' + json_buffer['uri']))
            console.log('uri')
        }

        return Promise.all(uris).then(responses => {
            return Promise.all(responses.map(r => r.arrayBuffer()))
        })
    }
}


