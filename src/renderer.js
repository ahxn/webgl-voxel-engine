import { mat4, vec3 } from './math.js?v=2';

function compileShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const info = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error('Shader compile error: ' + info);
	}
	return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
	const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
	const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
	const program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	gl.deleteShader(vs);
	gl.deleteShader(fs);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const info = gl.getProgramInfoLog(program);
		gl.deleteProgram(program);
		throw new Error('Program link error: ' + info);
	}
	return program;
}

function createCubeGeometry() {
	const p = [];
	const n = [];
	const faces = [
		{ n: [1, 0, 0], v: [[1,0,0], [1,1,0], [1,1,1], [1,0,1]] },
		{ n: [-1, 0, 0], v: [[0,0,1], [0,1,1], [0,1,0], [0,0,0]] },
		{ n: [0, 1, 0], v: [[0,1,1], [1,1,1], [1,1,0], [0,1,0]] },
		{ n: [0, -1, 0], v: [[0,0,0], [1,0,0], [1,0,1], [0,0,1]] },
		{ n: [0, 0, 1], v: [[0,0,1], [1,0,1], [1,1,1], [0,1,1]] },
		{ n: [0, 0, -1], v: [[0,1,0], [1,1,0], [1,0,0], [0,0,0]] }
	];
	for (const f of faces) {
		const [a, b, c, d] = f.v;
		const tri = [a, b, c, a, c, d];
		for (const v of tri) {
			p.push(v[0], v[1], v[2]);
			n.push(f.n[0], f.n[1], f.n[2]);
		}
	}
	return {
		positions: new Float32Array(p),
		normals: new Float32Array(n),
		vertexCount: 36
	};
}

export class Renderer {
	constructor(gl) {
		this.gl = gl;
		this.program = null;
		this.attribs = {};
		this.uniforms = {};
		this.buffers = {};
		this.cube = createCubeGeometry();
		this.sunPosition = [0, 25, 0];
		this.sunDistance = 20;

		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.clearColor(0.07, 0.07, 0.09, 1);
	}

	async init() {
		const shaderVersion = 'v=' + Date.now();
		const [vsSource, fsSource] = await Promise.all([
			fetch(`./shaders/vertex.glsl?${shaderVersion}`).then(r => r.text()),
			fetch(`./shaders/fragment.glsl?${shaderVersion}`).then(r => r.text())
		]);
		const gl = this.gl;
		this.program = createProgram(gl, vsSource, fsSource);

		this.attribs.a_position = gl.getAttribLocation(this.program, 'a_position');
		this.attribs.a_normal = gl.getAttribLocation(this.program, 'a_normal');
		this.uniforms.u_model = gl.getUniformLocation(this.program, 'u_model');
		this.uniforms.u_view = gl.getUniformLocation(this.program, 'u_view');
		this.uniforms.u_projection = gl.getUniformLocation(this.program, 'u_projection');
		this.uniforms.u_color = gl.getUniformLocation(this.program, 'u_color');
		this.uniforms.u_sunPosition = gl.getUniformLocation(this.program, 'u_sunPosition');

		this.buffers.position = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
		gl.bufferData(gl.ARRAY_BUFFER, this.cube.positions, gl.STATIC_DRAW);

		this.buffers.normal = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
		gl.bufferData(gl.ARRAY_BUFFER, this.cube.normals, gl.STATIC_DRAW);
	}

	setSize(width, height) {
		this.gl.viewport(0, 0, width, height);
	}

	setLightDirection(x, y, z) {
		const dirLen = Math.hypot(x, y, z) || 1;
		const d = Math.hypot(this.sunPosition[0], this.sunPosition[1], this.sunPosition[2]) || 20;
		this.sunPosition = [ (x / dirLen) * d, (y / dirLen) * d, (z / dirLen) * d ];
	}
	setSunDistance(d) {
		this.sunDistance = Math.max(1, Number(d) || 1);
	}
	setSunPosition(x, y, z) {
		this.sunPosition = [Number(x) || 0, Number(y) || 0, Number(z) || 0];
	}

	drawScene(voxels, camera) {
		const gl = this.gl;
		if (!this.program) return;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);

		const view = camera.getViewMatrix();
		const proj = camera.getProjectionMatrix();
		gl.uniformMatrix4fv(this.uniforms.u_view, false, new Float32Array(view));
		gl.uniformMatrix4fv(this.uniforms.u_projection, false, new Float32Array(proj));

		gl.uniform3f(this.uniforms.u_sunPosition, this.sunPosition[0], this.sunPosition[1], this.sunPosition[2]);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
		gl.enableVertexAttribArray(this.attribs.a_position);
		gl.vertexAttribPointer(this.attribs.a_position, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
		gl.enableVertexAttribArray(this.attribs.a_normal);
		gl.vertexAttribPointer(this.attribs.a_normal, 3, gl.FLOAT, false, 0, 0);

		for (let i = 0; i < voxels.length; i++) {
			const v = voxels[i];
			const model = mat4.translation(v.position[0], v.position[1], v.position[2]);
			gl.uniformMatrix4fv(this.uniforms.u_model, false, new Float32Array(model));
			gl.uniform3f(this.uniforms.u_color, v.color[0], v.color[1], v.color[2]);
			gl.drawArrays(gl.TRIANGLES, 0, this.cube.vertexCount);
		}

		const sunPos = this.sunPosition;
		const translate = mat4.translation(sunPos[0], sunPos[1], sunPos[2]);
		const scaleM = (typeof mat4.scaling === 'function')
			? mat4.scaling(0.5, 0.5, 0.5)
			: [
				0.5, 0,   0,   0,
				0,   0.5, 0,   0,
				0,   0,   0.5, 0,
				0,   0,   0,   1
			];
		const modelSun = mat4.multiply(translate, scaleM);
		gl.uniformMatrix4fv(this.uniforms.u_model, false, new Float32Array(modelSun));
		gl.uniform3f(this.uniforms.u_color, 1.0, 0.9, 0.25);
		gl.drawArrays(gl.TRIANGLES, 0, this.cube.vertexCount);
	}
}



