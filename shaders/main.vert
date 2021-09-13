# version 300 es


in vec3 aVertexPosition;
in vec3 aNormal;
in vec2 aTexcoord0;


out vec3 debugColor;
out vec3 normal;
out vec3 position;
out vec2 texcoord0;


uniform mat4 Model;
uniform mat4 View;
uniform mat4 Projection;


void main(void) {
    float scale = 0.008f;
    vec4 world_pos = Projection*View*Model*vec4(aVertexPosition*scale, 1);
    gl_Position = world_pos;
    normal = normalize(transpose(inverse(mat3(Model))) * aNormal);
    position = vec3(world_pos);
    texcoord0 = aTexcoord0;   
}