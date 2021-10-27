export class Texture2D {



    constructor(gl) {
        this.gl = gl
        this.sampler = {
            'wrapS': gl.REPEAT,
            'wrapT': gl.REPEAT,
            'minFilter': gl.LINEAR,
            'magFilter': gl.LINEAR
        }

        this.imageParameters = {
            'level': 0,
            'internalFormat': gl.RGBA,
            'width': 0,
            'height': 0,
            'border': 0,
            'format': gl.RGBA,
            'type': gl.UNSIGNED_BYTE,
        }

        this.texture = gl.createTexture()
    }



    setSamplingParameters(parameters) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)

        Object.keys(this.sampler).filter(key => (key in parameters)).forEach((key) => {
            this.sampler[key] = parameters[key]
        })

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.sampler.magFilter);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.sampler.minFilter);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.sampler.wrapT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.sampler.wrapS);

        return this
    }



    setImage(image, parameters) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)

        Object.keys(this.imageParameters).filter(key => (key in (parameters || []))).forEach((key) => {
            this.imageParameters[key] = parameters[key]
        })

        this.imageParameters.width = image.width || this.imageParameters.width
        this.imageParameters.height = image.height || this.imageParameters.height

        this.gl.texImage2D(this.gl.TEXTURE_2D, 
            this.imageParameters.level, 
            this.imageParameters.internalFormat, 
            this.imageParameters.width, 
            this.imageParameters.height, 
            this.imageParameters.border, 
            this.imageParameters.format, 
            this.imageParameters.type, 
            image);

        return this
    }



    generateMipmap() {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
        this.gl.generateMipmap(this.gl.TEXTURE_2D)
        return this
    }



    bind(binding) {
        this.gl.activeTexture(this.gl.TEXTURE0 + binding);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }
}