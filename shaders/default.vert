# version 300 es

in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexcoord0;
in vec2 aTexcoord1;
in vec4 aJoints0;
in vec4 aWeights0;


uniform mat4 Model;
uniform mat4 View;
uniform mat4 Projection;

uniform sampler2D skinTexture;

uniform float boneCount;

out vec3 normal;
out vec3 tangent;
out vec3 bitangent;
out vec3 position;
out mat3 TBN;
out vec2 texcoords[2];

out vec4 joints;
out vec4 weights;






#define ROW0_U ((0.5 + 0.0) / 4.)
#define ROW1_U ((0.5 + 1.0) / 4.)
#define ROW2_U ((0.5 + 2.0) / 4.)
#define ROW3_U ((0.5 + 3.0) / 4.)
 
mat4 getBoneMatrix(float boneNdx) {
  float v = (boneNdx + 0.5) / boneCount;
  return mat4(
    texture(skinTexture, vec2(ROW0_U, v)),
    texture(skinTexture, vec2(ROW1_U, v)),
    texture(skinTexture, vec2(ROW2_U, v)),
    texture(skinTexture, vec2(ROW3_U, v)));
}




void main(void) {
    gl_PointSize = 4.0f;

    vec3 vertexPosition;

    if(boneCount > 0.0) {
        mat4 jointTransformation = getBoneMatrix(aJoints0[0])*aWeights0[0] +
            getBoneMatrix(aJoints0[1])*aWeights0[1] +
            getBoneMatrix(aJoints0[2])*aWeights0[2] +
            getBoneMatrix(aJoints0[3])*aWeights0[3];

        vertexPosition = vec3(Model*jointTransformation*vec4(aPosition, 1.0));
        normal = normalize(transpose(inverse(mat3(Model*jointTransformation)))*aNormal);
    }
    else {
        vertexPosition = vec3(Model*vec4(aPosition, 1.0));
        normal = normalize(transpose(inverse(mat3(Model)))*aNormal);
    }


    
    gl_Position = Projection*View*vec4(vertexPosition, 1.0f);


    position = vertexPosition;



    texcoords[0] = aTexcoord0;
    texcoords[1] = aTexcoord1;

    joints = aJoints0;
    weights = aWeights0;
}