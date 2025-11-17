attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

varying vec3 v_normal;
varying vec3 v_worldPos;

void main() {
	vec4 worldPos = u_model * vec4(a_position, 1.0);
	gl_Position = u_projection * u_view * worldPos;

	v_normal = mat3(u_model) * a_normal;
	v_worldPos = worldPos.xyz;
}


