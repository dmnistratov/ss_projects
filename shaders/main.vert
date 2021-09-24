# version 300 es

in vec3 aVertexPosition;
in vec3 aNormal;
in vec2 aTexcoord0;
in vec2 aTexcoord1;

out vec3 normal;
out vec3 position;
out vec2 texcoord0;
out vec2 texcoords[2];

uniform mat4 Model;
uniform mat4 View;
uniform mat4 Projection;


void main(void) {
    vec3 vertexPosition = vec3(Model*vec4(aVertexPosition, 1.0));
    vec4 world_pos = Projection*View*vec4(vertexPosition, 1.0);
    gl_Position = world_pos;
    normal = normalize(transpose(inverse(mat3(Model))) * aNormal);
    position = vec3(vertexPosition);

    texcoords[0] = aTexcoord0;
    texcoords[1] = aTexcoord1;
}