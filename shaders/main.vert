# version 300 es

in vec3 aVertexPosition;
in vec3 aNormal;
in vec2 aTexcoord0;
in vec2 aTexcoord1;
in vec4 aJoints0;
in vec4 aWeights0;


uniform int skinIndex;

out vec3 normal;
out vec3 position;
out vec2 texcoord0;
out vec2 texcoords[2];

uniform mat4 Model;
uniform mat4 View;
uniform mat4 Projection;


out vec3 debugColor;
out vec4 joint_indices;
out vec4 joint_weights;

uniform float numBones;
uniform sampler2D joints;

#define ROW0_U ((0.5 + 0.0) / 4.0)
#define ROW1_U ((0.5 + 1.0) / 4.0)
#define ROW2_U ((0.5 + 2.0) / 4.0)
#define ROW3_U ((0.5 + 3.0) / 4.0)
 
mat4 getBoneMatrix(float boneNdx) {
    float v = (boneNdx + 0.5) / numBones;
    return mat4(
        texture(joints, vec2(ROW0_U, v)),
        texture(joints, vec2(ROW1_U, v)),
        texture(joints, vec2(ROW2_U, v)),
        texture(joints, vec2(ROW3_U, v)));
}







void main(void) {
    vec3 vertexPosition;


    if(numBones != 0.0) {
        mat4 jointTransformation = (getBoneMatrix(aJoints0[0])  * aWeights0[0] +
                getBoneMatrix(aJoints0[1]) * aWeights0[1] +
                getBoneMatrix(aJoints0[2]) * aWeights0[2] +
                getBoneMatrix(aJoints0[3]) * aWeights0[3]);

        vertexPosition = vec3(Model*jointTransformation*vec4(aVertexPosition, 1.0));
        normal = normalize(transpose(inverse(mat3(Model*jointTransformation))) * aNormal);
    }
    else {
        vertexPosition = vec3(Model*vec4(aVertexPosition, 1.0));
        normal = normalize(transpose(inverse(mat3(Model))) * aNormal);
    }

    vec4 world_pos = Projection*View*vec4(vertexPosition, 1.0);
    gl_Position = world_pos;
    position = vec3(vertexPosition);
    texcoords[0] = aTexcoord0;
    texcoords[1] = aTexcoord1;
    debugColor = vec3(aWeights0);

    joint_indices = aJoints0;
    joint_weights = aWeights0;
}