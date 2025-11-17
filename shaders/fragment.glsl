precision mediump float;

uniform vec3 u_color;
uniform vec3 u_sunPosition;

varying vec3 v_normal;
varying vec3 v_worldPos;

void main() {
	vec3 N = normalize(v_normal);
	vec3 L = normalize(u_sunPosition - v_worldPos);
	float diffuse = max(dot(N, L), 0.0);
	float ambient = 0.2;
	vec3 color = u_color * (ambient + 0.8 * diffuse);
	gl_FragColor = vec4(color, 1.0);
}


