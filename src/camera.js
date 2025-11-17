import { mat4, vec3 } from './math.js';

export class Camera {
	constructor() {
		this.target = vec3.create(0, 0, 0);
		this.distance = 10;
		this.azimuth = Math.PI * 0.25;
		this.elevation = Math.PI * 0.2;
		this.fov = Math.PI / 3;
		this.aspect = 1;
		this.near = 0.1;
		this.far = 1000;
		this._view = mat4.identity();
		this._projection = mat4.identity();
		this._isDragging = false;
		this._lastX = 0;
		this._lastY = 0;
		this._elevationMin = -Math.PI * 0.44;
		this._elevationMax = Math.PI * 0.44;
		this._zoomMin = 1.5;
		this._zoomMax = 200;
	}

	reset() {
		this.distance = 12;
		this.azimuth = Math.PI * 0.3;
		this.elevation = Math.PI * 0.2;
	}

	setAspect(aspect) {
		this.aspect = aspect;
	}

	getViewMatrix() {
		const r = this.distance;
		const cosE = Math.cos(this.elevation);
		const sinE = Math.sin(this.elevation);
		const cosA = Math.cos(this.azimuth);
		const sinA = Math.sin(this.azimuth);

		const eye = [
			this.target[0] + r * cosE * cosA,
			this.target[1] + r * sinE,
			this.target[2] + r * cosE * sinA
		];
		this._view = mat4.lookAt(eye, this.target, [0, 1, 0]);
		return this._view;
	}

	getProjectionMatrix() {
		this._projection = mat4.perspective(this.fov, this.aspect, this.near, this.far);
		return this._projection;
	}

	attachControls(canvas) {
		const onMouseDown = (e) => {
			if (e.button !== 0) return;
			this._isDragging = true;
			this._lastX = e.clientX;
			this._lastY = e.clientY;
		};
		const onMouseMove = (e) => {
			if (!this._isDragging) return;
			const dx = e.clientX - this._lastX;
			const dy = e.clientY - this._lastY;
			this._lastX = e.clientX;
			this._lastY = e.clientY;
			const rotationSpeed = 0.005;
			this.azimuth += dx * rotationSpeed;
			this.elevation += dy * rotationSpeed;
			if (this.elevation < this._elevationMin) this.elevation = this._elevationMin;
			if (this.elevation > this._elevationMax) this.elevation = this._elevationMax;
		};
		const onMouseUp = () => {
			this._isDragging = false;
		};
		const onWheel = (e) => {
			e.preventDefault();
			const delta = Math.sign(e.deltaY);
			const zoomFactor = 1 + 0.1 * delta;
			this.distance *= zoomFactor;
			if (this.distance < this._zoomMin) this.distance = this._zoomMin;
			if (this.distance > this._zoomMax) this.distance = this._zoomMax;
		};
		canvas.addEventListener('mousedown', onMouseDown);
		canvas.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
		canvas.addEventListener('wheel', onWheel, { passive: false });
	}
}



