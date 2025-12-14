precision mediump float;

uniform vec3 u_color;
uniform vec3 u_sunPositions[3];
uniform int u_numSuns;

varying vec3 v_normal;
varying vec3 v_worldPos;

void main() {
	vec3 N = normalize(v_normal);
	float totalDiffuse = 0.0;
	for (int i = 0; i < 3; i++) {
		if (i >= u_numSuns) break;
		vec3 L = normalize(u_sunPositions[i] - v_worldPos);
		totalDiffuse += max(dot(N, L), 0.0);
	}
	totalDiffuse = min(totalDiffuse, 1.0);
	float ambient = 0.2;
	vec3 color = u_color * (ambient + 0.8 * totalDiffuse);
	gl_FragColor = vec4(color, 1.0);
}
