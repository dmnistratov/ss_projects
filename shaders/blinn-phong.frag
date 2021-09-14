# version 300 es
precision highp float;


in vec3 normal;
in vec3 position;
in vec2 texcoord0;
in vec3 debugColor;

out vec4 fragColor;

uniform vec3 color;
uniform vec3 cameraDirection;


struct Material {
    sampler2D baseColorTexture;
    sampler2D normalTexture;
    int normalTexcoord;
    int baseColorTexcoord;
    vec4 baseColorFactor;
};

uniform Material material;

vec3 getNormal() {
    vec3 tangentNormal = texture(material.normalTexture, texcoord0).xyz * 2.0 - 1.0;

    vec3 q1 = dFdx(position);
    vec3 q2 = dFdy(position);
    vec2 st1 = dFdx(texcoord0);
    vec2 st2 = dFdy(texcoord0);

    vec3 N = normalize(normal);
    vec3 T = normalize(q1 * st2.t - q2 * st1.t);
    vec3 B = -normalize(cross(N, T));
    mat3 TBN = mat3(T, B, N);

    return normalize(TBN * tangentNormal);
}


void main(void) {
    vec4 baseColor = material.baseColorFactor;
    if(material.baseColorTexcoord != -1) {
        baseColor *= texture(material.baseColorTexture, texcoord0);
    }

    vec3 n = normalize(normal);
    if(material.normalTexcoord != -1) {
        n = normalize(getNormal());
    }

    vec3 lightPos = vec3(5, 5, 10);
    vec3 lightDir = normalize(-(position-lightPos));
    // vec3 cameraPosition = vec3(15,5,-5);
    vec3 cameraDir = -normalize(cameraDirection);

    float NdotL = max(dot(lightDir, n), 0.3);
    vec3 diffuse_contrib = NdotL*baseColor.rgb;

    vec3 r = normalize(reflect(-lightDir, n));
    vec3 halfway = normalize(lightDir+cameraDir); 
    float HdotN = max(dot(halfway, n), 0.0);
    float specular_contrib = pow(HdotN, 64.0);

    fragColor = vec4(diffuse_contrib+specular_contrib*0.4, 1);
}