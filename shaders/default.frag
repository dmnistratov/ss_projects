# version 300 es
precision highp float;

out vec4 fragColor;

uniform vec4 color;
uniform vec3 cameraPosition;

in vec2 texcoords[2];

in vec3 position;
in vec3 normal;



struct Material {
    sampler2D baseColorTexture;
    sampler2D normalTexture;
    sampler2D metallicRoughnessTexture;
    sampler2D emissiveTexture;

    float metallicFactor;
    float roughnessFactor;
    vec4 baseColorFactor;
    vec3 emissiveFactor;

    int baseColorTexcoord;
    int normalTexcoord;
    int metallicRoughnessTexcoord;
    int emissiveTexcoord;
};

uniform Material material;



const float gamma = 2.2f;

vec4 SRGBtoLINEAR(vec4 srgbIn) {
    return vec4(pow(srgbIn.xyz, vec3(gamma)), srgbIn.w);
}

vec3 LINEARtoSRGB(vec3 color) {
    return pow(color, vec3(1.0f/gamma));
}


vec3 getNormal() {
    vec2 uv = texcoords[material.normalTexcoord];
    vec3 tangentNormal = texture(material.normalTexture, uv).xyz * 2.0 - 1.0;

    vec3 q1 = dFdx(position);
    vec3 q2 = dFdy(position);
    vec2 st1 = dFdx(uv);
    vec2 st2 = dFdy(uv);

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

    float metallic = material.metallicFactor;
    float roughness = material.roughnessFactor;
    if(material.metallicRoughnessTexcoord != -1) {
        vec4 metallicRoughnessTexture = texture(material.metallicRoughnessTexture, texcoords[material.metallicRoughnessTexcoord]);
        metallic *= metallicRoughnessTexture.b;
        roughness *= metallicRoughnessTexture.g;
    }
    
    vec3 n;
    if(material.normalTexcoord != -1) {
        n = normalize(getNormal());
    }
    else {
        n = normalize(normal);
    }






    // vec3 lightPos = cameraPosition;
    vec3 lightPos = vec3(10,10,10);
    vec3 l = normalize(lightPos-position);
    vec3 v = normalize(cameraPosition-position);

    float NdotL = max(dot(n,l), 0.0);


    vec3 halfway = normalize(l+v); 
    float HdotN = max(dot(halfway, n), 0.0);

    vec3 diffuse = baseColor.rgb*NdotL;

    float specular = pow(HdotN, 128.0);

    vec3 emissive = material.emissiveFactor;
    if(material.emissiveTexcoord != -1) {
        emissive *= SRGBtoLINEAR(texture(material.emissiveTexture, texcoords[material.emissiveTexcoord])).rgb;
    }
    vec3 ambient = 0.1*baseColor.rgb;
    fragColor = vec4(LINEARtoSRGB(vec3(ambient + diffuse + vec3(specular)*vec3(0.3) + emissive)), baseColor.a);
}