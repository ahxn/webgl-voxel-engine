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
		this.suns = [
			{ position: [0, 25, 0], color: [1.0, 0.9, 0.25] }
		];
		this.lastDrawCount = 0;

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
		this.uniforms.u_sunPositions = [];
		for (let i = 0; i < 3; i++) {
			this.uniforms.u_sunPositions[i] = gl.getUniformLocation(this.program, `u_sunPositions[${i}]`);
		}
		this.uniforms.u_numSuns = gl.getUniformLocation(this.program, 'u_numSuns');

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

	setSunPosition(index, x, y, z) {
		if (index >= 0 && index < this.suns.length) {
			this.suns[index].position = [Number(x) || 0, Number(y) || 0, Number(z) || 0];
		}
	}
	
	addSun(x = 0, y = 25, z = 10) {
		if (this.suns.length < 3) {
			const colors = [
				[1.0, 0.9, 0.25],
				[0.25, 0.9, 1.0],
				[1.0, 0.25, 0.9]
			];
			this.suns.push({
				position: [x, y, z],
				color: colors[this.suns.length % 3]
			});
			return this.suns.length - 1;
		}
		return -1;
	}
	
	removeSun(index) {
		if (index > 0 && index < this.suns.length) {
			this.suns.splice(index, 1);
			return true;
		}
		return false;
	}

	drawChunks(chunkManager, camera) {
		const gl = this.gl;
		if (!this.program) return;
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.program);
		const view = camera.getViewMatrix();
		const proj = camera.getProjectionMatrix();
		gl.uniformMatrix4fv(this.uniforms.u_view, false, new Float32Array(view));
		gl.uniformMatrix4fv(this.uniforms.u_projection, false, new Float32Array(proj));
		gl.uniform1i(this.uniforms.u_numSuns, this.suns.length);
		for (let i = 0; i < 3; i++) {
			if (i < this.suns.length) {
				const pos = this.suns[i].position;
				gl.uniform3f(this.uniforms.u_sunPositions[i], pos[0], pos[1], pos[2]);
			}
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
		gl.enableVertexAttribArray(this.attribs.a_position);
		gl.vertexAttribPointer(this.attribs.a_position, 3, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
		gl.enableVertexAttribArray(this.attribs.a_normal);
		gl.vertexAttribPointer(this.attribs.a_normal, 3, gl.FLOAT, false, 0, 0);
		this.lastDrawCount = 0;
		const visibleChunks = chunkManager.getVisibleChunks(camera);
		for (const chunk of visibleChunks) {
			const [chunkWorldX, chunkWorldY, chunkWorldZ] = chunk.getWorldPosition();
			for (const voxel of chunk.voxels) {
				const worldX = chunkWorldX + voxel.position[0];
				const worldY = chunkWorldY + voxel.position[1];
				const worldZ = chunkWorldZ + voxel.position[2];
				const model = mat4.translation(worldX, worldY, worldZ);
				gl.uniformMatrix4fv(this.uniforms.u_model, false, new Float32Array(model));
				gl.uniform3f(this.uniforms.u_color, voxel.color[0], voxel.color[1], voxel.color[2]);
				gl.drawArrays(gl.TRIANGLES, 0, this.cube.vertexCount);
				this.lastDrawCount++;
			}
		}
		for (let i = 0; i < this.suns.length; i++) {
			const sun = this.suns[i];
			const translate = mat4.translation(sun.position[0], sun.position[1], sun.position[2]);
			const scaleM = [
				0.5, 0,   0,   0,
				0,   0.5, 0,   0,
				0,   0,   0.5, 0,
				0,   0,   0,   1
			];
			const modelSun = mat4.multiply(translate, scaleM);
			gl.uniformMatrix4fv(this.uniforms.u_model, false, new Float32Array(modelSun));
			gl.uniform3f(this.uniforms.u_color, sun.color[0], sun.color[1], sun.color[2]);
			gl.drawArrays(gl.TRIANGLES, 0, this.cube.vertexCount);
			this.lastDrawCount++;
		}
	}
}
