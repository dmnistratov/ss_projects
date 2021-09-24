# version 300 es
precision highp float;

in vec3 normal;
in vec3 position;
in vec2 texcoords[2];

out vec4 fragColor;


struct Material {
    sampler2D baseColorTexture;
    sampler2D normalTexture;
    sampler2D metallicRoughnessTexture;
    sampler2D emissiveTexture;
    int baseColorTexcoord;
    int normalTexcoord;
    int metallicRoughnessTexcoord;
    float metallicFactor;
    float roughnessFactor;
    vec4 baseColorFactor;
    vec3 emissiveFactor;
    int emissiveTexcoord;
};

uniform Material material;
uniform vec3 cameraPosition;


//Tonemapping --------------------------------------------------------------------------
const float gamma = 2.2f;

vec4 SRGBtoLINEAR(vec4 srgbIn) {
    return vec4(pow(srgbIn.xyz, vec3(gamma)), srgbIn.w);
}

vec3 LINEARtoSRGB(vec3 color) {
    return pow(color, vec3(1.0f/gamma));
}

vec3 toneMapUncharted2Impl(vec3 color) {
    const float A = 0.15;
    const float B = 0.50;
    const float C = 0.10;
    const float D = 0.20;
    const float E = 0.02;
    const float F = 0.30;
    return ((color*(A*color+C*B)+D*E)/(color*(A*color+B)+D*F))-E/F;
}

// Uncharted 2 tonemapping http://filmicworlds.com/blog/filmic-tonemapping-operators/
vec3 toneMapUncharted(vec3 color) {
    const float W = 11.2;
    color = toneMapUncharted2Impl(color * 2.0);
    vec3 whiteScale = 1.0 / toneMapUncharted2Impl(vec3(W));
    return LINEARtoSRGB(color * whiteScale);
}
//--------------------------------------------------------------------------------------


vec3 getNormal() {
    vec3 tangentNormal = texture(material.normalTexture, texcoords[material.normalTexcoord]).xyz * 2.0 - 1.0;

    vec3 q1 = dFdx(position);
    vec3 q2 = dFdy(position);
    vec2 st1 = dFdx(texcoords[material.normalTexcoord]);
    vec2 st2 = dFdy(texcoords[material.normalTexcoord]);

    vec3 N = normalize(normal);
    vec3 T = normalize(q1 * st2.t - q2 * st1.t);
    vec3 B = -normalize(cross(N, T));
    mat3 TBN = mat3(T, B, N);

    return normalize(TBN * tangentNormal);
}


void main(void) {
    vec4 baseColor = material.baseColorFactor;
    if(material.baseColorTexcoord != -1) {
        baseColor *= SRGBtoLINEAR(texture(material.baseColorTexture, texcoords[material.baseColorTexcoord]));
    }

    vec3 n;
    if(material.normalTexcoord != -1) {
        n = normalize(getNormal());
    }
    else {
        n = normalize(normal); 
    }

    // float metallic = material.metallicFactor;
    // float roughness = material.roughnessFactor;
    // if(material.metallicRoughnessTexcoord != -1) {
    //     vec4 metallicRoughnessTexture = (texture(material.metallicRoughnessTexture, texcoords[material.metallicRoughnessTexcoord]));
    //     metallic *= metallicRoughnessTexture.b;
    //     roughness *= metallicRoughnessTexture.g;
    // }


    vec3 lightPos = cameraPosition;
    vec3 lightDir = normalize(-(position-lightPos));
    vec3 cameraDir = normalize(-(position-cameraPosition));

    float NdotL = max(dot(lightDir, n), 0.3);
    vec3 diffuse_contrib = NdotL*baseColor.rgb;

    vec3 r = normalize(reflect(-lightDir, n));
    vec3 halfway = normalize(lightDir+cameraDir); 
    float HdotN = max(dot(halfway, n), 0.0);
    float specular_contrib = pow(HdotN, 256.0);


    vec3 emissiveFactor = material.emissiveFactor;
    vec3 f_emissive = vec3(0.0);
    if(material.emissiveTexcoord != -1) {
        f_emissive = SRGBtoLINEAR(texture(material.emissiveTexture,  texcoords[material.emissiveTexcoord])).rgb;
    }

    vec3 color = toneMapUncharted(diffuse_contrib+specular_contrib+f_emissive);
    fragColor = vec4(color, baseColor.a);
}