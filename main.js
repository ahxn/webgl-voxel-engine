import { Renderer } from './src/renderer.js?v=5';
import { Camera } from './src/camera.js';
import { createDefaultWorld } from './src/voxelWorld.js?v=7';
import { loadVoxelsFromJSON } from './src/voxelLoader.js';
import { ChunkManager } from './src/chunk.js';

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl', { antialias: true, alpha: false });

if (!gl) {
	alert('WebGL not supported in this browser or context creation failed.');
	throw new Error('WebGL not supported');
}

const renderer = new Renderer(gl);
const camera = new Camera();
const chunkManager = new ChunkManager();
let voxels = createDefaultWorld();
chunkManager.loadVoxels(voxels);

let frameCount = 0;
let fps = 0;
let lastFpsUpdate = performance.now();

function resizeCanvasToDisplaySize() {
	const pixelRatio = window.devicePixelRatio || 1;
	const displayWidth = Math.floor(gl.canvas.clientWidth * pixelRatio);
	const displayHeight = Math.floor(gl.canvas.clientHeight * pixelRatio);
	if (gl.canvas.width !== displayWidth || gl.canvas.height !== displayHeight) {
		gl.canvas.width = displayWidth;
		gl.canvas.height = displayHeight;
	}
	renderer.setSize(gl.canvas.width, gl.canvas.height);
	camera.setAspect(gl.canvas.width / gl.canvas.height);
}

function onResize() {
	canvas.style.width = '100vw';
	canvas.style.height = '100vh';
	resizeCanvasToDisplaySize();
}

function frameToVoxels(vxs) {
	if (!vxs || vxs.length === 0) return;
	let minX = Infinity, minY = Infinity, minZ = Infinity;
	let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
	for (const v of vxs) {
		const x0 = v.position[0], y0 = v.position[1], z0 = v.position[2];
		minX = Math.min(minX, x0);
		minY = Math.min(minY, y0);
		minZ = Math.min(minZ, z0);
		maxX = Math.max(maxX, x0 + 1);
		maxY = Math.max(maxY, y0 + 1);
		maxZ = Math.max(maxZ, z0 + 1);
	}
	const center = [
		(minX + maxX) * 0.5,
		(minY + maxY) * 0.5,
		(minZ + maxZ) * 0.5
	];
	const dx = maxX - minX;
	const dy = maxY - minY;
	const dz = maxZ - minZ;
	const radius = Math.max(dx, dy, dz) * 0.5;
	camera.target = center;
	const fitDist = (radius / Math.tan(camera.fov * 0.5)) * 1.3 + 1.0;
	camera.distance = Math.max(fitDist, 2);
}

async function init() {
	onResize();
	window.addEventListener('resize', onResize);

	camera.reset();
	camera.setAspect(gl.canvas.width / gl.canvas.height);
	camera.attachControls(canvas);

	await renderer.init();
	frameToVoxels(voxels);

	setupUI();
	updateStats();
	requestAnimationFrame(render);
}

function setupUI() {
	const fileInput = document.getElementById('fileInput');
	const resetBtn = document.getElementById('resetCameraBtn');
	const addSunBtn = document.getElementById('addSunBtn');
	const sunControlsContainer = document.getElementById('sunControls');

	resetBtn.addEventListener('click', () => {
		camera.reset();
	});

	function renderSunControls() {
		sunControlsContainer.innerHTML = '';
		renderer.suns.forEach((sun, index) => {
			const sunDiv = document.createElement('div');
			sunDiv.className = 'sun-control';
			sunDiv.innerHTML = `
				<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
					<span style="font-weight: 600;">Sun ${index + 1}</span>
					${index > 0 ? `<button class="remove-sun-btn" data-index="${index}" style="font-size: 10px; padding: 2px 6px;">Remove</button>` : ''}
				</div>
				<div class="sun-xyz">
					<label>X</label>
					<input type="range" class="sunSlider" data-index="${index}" data-axis="0" min="-50" max="50" step="0.5" value="${sun.position[0]}" />
					<input type="number" class="sunInput" data-index="${index}" data-axis="0" step="0.1" value="${sun.position[0]}" />
					<label>Y</label>
					<input type="range" class="sunSlider" data-index="${index}" data-axis="1" min="-50" max="50" step="0.5" value="${sun.position[1]}" />
					<input type="number" class="sunInput" data-index="${index}" data-axis="1" step="0.1" value="${sun.position[1]}" />
					<label>Z</label>
					<input type="range" class="sunSlider" data-index="${index}" data-axis="2" min="-50" max="50" step="0.5" value="${sun.position[2]}" />
					<input type="number" class="sunInput" data-index="${index}" data-axis="2" step="0.1" value="${sun.position[2]}" />
				</div>
			`;
			sunControlsContainer.appendChild(sunDiv);
		});

		document.querySelectorAll('.sunSlider').forEach(slider => {
			slider.addEventListener('input', (e) => {
				const index = parseInt(e.target.dataset.index);
				const axis = parseInt(e.target.dataset.axis);
				const value = parseFloat(e.target.value);
				const sun = renderer.suns[index];
				sun.position[axis] = value;
				renderer.setSunPosition(index, sun.position[0], sun.position[1], sun.position[2]);
				const input = document.querySelector(`.sunInput[data-index="${index}"][data-axis="${axis}"]`);
				if (input) input.value = value.toFixed(1);
			});
		});

		document.querySelectorAll('.sunInput').forEach(input => {
			const onChange = (e) => {
				const index = parseInt(e.target.dataset.index);
				const axis = parseInt(e.target.dataset.axis);
				const value = parseFloat(e.target.value);
				const sun = renderer.suns[index];
				sun.position[axis] = value;
				renderer.setSunPosition(index, sun.position[0], sun.position[1], sun.position[2]);
				const slider = document.querySelector(`.sunSlider[data-index="${index}"][data-axis="${axis}"]`);
				if (slider) slider.value = value;
			};
			input.addEventListener('input', onChange);
			input.addEventListener('change', onChange);
		});

		document.querySelectorAll('.remove-sun-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const index = parseInt(e.target.dataset.index);
				renderer.removeSun(index);
				renderSunControls();
			});
		});

		if (addSunBtn) {
			addSunBtn.disabled = renderer.suns.length >= 3;
		}
	}

	if (addSunBtn) {
		addSunBtn.addEventListener('click', () => {
			if (renderer.suns.length < 3) {
				const offset = renderer.suns.length * 10;
				renderer.addSun(offset, 25, offset);
				renderSunControls();
			}
		});
	}

	renderSunControls();

	fileInput.addEventListener('change', (e) => {
		const input = e.target;
		if (!input || !input.files || input.files.length === 0) return;
		const file = input.files[0];
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const json = JSON.parse(String(reader.result));
				const loaded = loadVoxelsFromJSON(json);
				voxels = loaded;
				chunkManager.loadVoxels(voxels);
				frameToVoxels(voxels);
				updateStats();
			} catch (err) {
				alert('Invalid voxel JSON file.');
			}
		};
		reader.onerror = () => {
			alert('Failed to read file.');
		};
		reader.readAsText(file);
		input.value = '';
	});
}

function updateStats() {
	const fpsEl = document.getElementById('statFps');
	const chunksEl = document.getElementById('statChunks');
	const voxelsEl = document.getElementById('statVoxels');
	const drawsEl = document.getElementById('statDraws');

	if (fpsEl) {
		const fpsValue = fps > 0 ? fps.toFixed(0) : '60';
		fpsEl.textContent = fpsValue;
		const fpsNum = parseFloat(fpsValue);
		fpsEl.className = 'value ' + (fpsNum >= 55 ? 'stat-good' : fpsNum >= 30 ? 'stat-warn' : 'stat-bad');
	}
	if (chunksEl) {
		const stats = chunkManager.getStats();
		chunksEl.textContent = stats.nonEmptyChunks.toLocaleString();
		chunksEl.className = 'value ' + (stats.nonEmptyChunks < 50 ? 'stat-good' : stats.nonEmptyChunks < 200 ? 'stat-warn' : 'stat-bad');
	}
	if (voxelsEl) {
		const count = voxels.length;
		voxelsEl.textContent = count.toLocaleString();
		voxelsEl.className = 'value ' + (count < 5000 ? 'stat-good' : count < 20000 ? 'stat-warn' : 'stat-bad');
	}
	if (drawsEl) {
		const draws = renderer.lastDrawCount || (voxels.length + 1);
		drawsEl.textContent = draws.toLocaleString();
		drawsEl.className = 'value ' + (draws < 5000 ? 'stat-good' : draws < 20000 ? 'stat-warn' : 'stat-bad');
	}
}

function render() {
	const now = performance.now();
	frameCount++;
	if (now - lastFpsUpdate >= 500) {
		fps = (frameCount / (now - lastFpsUpdate)) * 1000;
		frameCount = 0;
		lastFpsUpdate = now;
		updateStats();
	}

	camera.getViewMatrix();
	renderer.drawChunks(chunkManager, camera);
	requestAnimationFrame(render);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}