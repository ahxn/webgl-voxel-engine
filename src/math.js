export const vec3 = {
	create(x = 0, y = 0, z = 0) {
		return [x, y, z];
	},
	add(a, b) {
		return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
	},
	subtract(a, b) {
		return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
	},
	scale(a, s) {
		return [a[0] * s, a[1] * s, a[2] * s];
	},
	dot(a, b) {
		return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
	},
	cross(a, b) {
		return [
			a[1] * b[2] - a[2] * b[1],
			a[2] * b[0] - a[0] * b[2],
			a[0] * b[1] - a[1] * b[0]
		];
	},
	length(a) {
		return Math.hypot(a[0], a[1], a[2]);
	},
	normalize(a) {
		const len = vec3.length(a) || 1;
		return [a[0] / len, a[1] / len, a[2] / len];
	}
};

export const mat4 = {
	identity() {
		return [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		];
	},
	multiply(a, b) {
		const out = new Array(16);
		for (let r = 0; r < 4; r++) {
			for (let c = 0; c < 4; c++) {
				out[r * 4 + c] =
					a[r * 4 + 0] * b[0 * 4 + c] +
					a[r * 4 + 1] * b[1 * 4 + c] +
					a[r * 4 + 2] * b[2 * 4 + c] +
					a[r * 4 + 3] * b[3 * 4 + c];
			}
		}
		return out;
	},
	translation(tx, ty, tz) {
		return [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			tx, ty, tz, 1
		];
	},
	scaling(sx, sy, sz) {
		return [
			sx, 0, 0, 0,
			0, sy, 0, 0,
			0, 0, sz, 0,
			0, 0, 0, 1
		];
	},
	rotationY(angle) {
		const c = Math.cos(angle);
		const s = Math.sin(angle);
		return [
			c, 0, -s, 0,
			0, 1, 0, 0,
			s, 0, c, 0,
			0, 0, 0, 1
		];
	},
	rotationX(angle) {
		const c = Math.cos(angle);
		const s = Math.sin(angle);
		return [
			1, 0, 0, 0,
			0, c, s, 0,
			0, -s, c, 0,
			0, 0, 0, 1
		];
	},
	perspective(fovRadians, aspect, near, far) {
		const f = 1.0 / Math.tan(fovRadians / 2);
		const nf = 1 / (near - far);
		return [
			f / aspect, 0, 0, 0,
			0, f, 0, 0,
			0, 0, (far + near) * nf, -1,
			0, 0, (2 * far * near) * nf, 0
		];
	},
	lookAt(eye, target, up) {
		const zAxis = vec3.normalize(vec3.subtract(eye, target));
		const xAxis = vec3.normalize(vec3.cross(up, zAxis));
		const yAxis = vec3.cross(zAxis, xAxis);
		return [
			xAxis[0], yAxis[0], zAxis[0], 0,
			xAxis[1], yAxis[1], zAxis[1], 0,
			xAxis[2], yAxis[2], zAxis[2], 0,
			-vec3.dot(xAxis, eye), -vec3.dot(yAxis, eye), -vec3.dot(zAxis, eye), 1
		];
	}
};
