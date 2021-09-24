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

// Uncharted2 tonemapping http://filmicworlds.com/blog/filmic-tonemapping-operators/
vec3 toneMapUncharted(vec3 color) {
    const float W = 11.2;
    color = toneMapUncharted2Impl(color * 2.0);
    vec3 whiteScale = 1.0 / toneMapUncharted2Impl(vec3(W));
    return LINEARtoSRGB(color * whiteScale);
}
//--------------------------------------------------------------------------------------



const float M_PI = 3.141592653589793;


float D_GGX(float NdotH, float a) {
    float a2 = a * a;
    float f = (NdotH * a2 - NdotH) * NdotH + 1.0;
    return a2 / (M_PI * f * f);
}

vec3 F_Schlick(float u, vec3 f0) {
    return f0 + (vec3(1.0) - f0) * pow(1.0 - u, 5.0);
}

float V_SmithGGXCorrelated(float NdotV, float NdotL, float a) {
    float a2 = a * a;
    float GGXL = NdotV * sqrt((-NdotL * a2 + NdotL) * NdotL + a2);
    float GGXV = NdotL * sqrt((-NdotV * a2 + NdotV) * NdotV + a2);
    return 0.5 / (GGXV + GGXL);
}



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


    float metallic = material.metallicFactor;
    float roughness = material.roughnessFactor;
    if(material.metallicRoughnessTexcoord != -1) {
        vec4 metallicRoughnessTexture = (texture(material.metallicRoughnessTexture, texcoords[material.metallicRoughnessTexcoord]));
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

    vec3 lightPos = cameraPosition;
    vec3 l = normalize(-(position-lightPos));
    vec3 v = normalize(-(position-cameraPosition));
    vec3 h = normalize(l + v); 

    float NdotL = max(dot(n, l), 0.0);
    float NdotV = max(dot(n, v), 0.0 + 0.0001);
    float NdotH = max(dot(n, h), 0.0);
    float LdotH = max(dot(l, h), 0.0);
    float VdotH = max(dot(v, h), 0.0);

    vec3 F0 = mix(vec3(0.04), baseColor.rgb, metallic);
    float alphaRoughness = roughness*roughness;


    vec3 F = F_Schlick(VdotH, F0);
    float G = V_SmithGGXCorrelated(NdotV, NdotL, alphaRoughness);
    float D = D_GGX(NdotH, alphaRoughness);

    vec3 f_diffuse = vec3(0.0);
    vec3 f_specular = vec3(0.0);
    if(NdotL > 0.0) {
        f_diffuse = NdotL * (baseColor.rgb / M_PI) * (vec3(1.0f) - F) * (1.0f - metallic); //Lambertian
        f_specular = NdotL*D*F*G; //Cook-Torrance
    }


    vec3 emissiveFactor = material.emissiveFactor;
    vec3 f_emissive = vec3(0.0);
    if(material.emissiveTexcoord != -1) {
        f_emissive = SRGBtoLINEAR(texture(material.emissiveTexture,  texcoords[material.emissiveTexcoord])).rgb;
    }


    vec3 ambient = baseColor.rgb*0.3f;
    vec3 color = toneMapUncharted(vec3(ambient + f_diffuse + f_specular + f_emissive));
    fragColor = vec4(vec3(color), baseColor.a);
}