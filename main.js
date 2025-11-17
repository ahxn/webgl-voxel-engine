import { Renderer } from './src/renderer.js?v=3';
import { Camera } from './src/camera.js';
import { createDefaultWorld, createMinecraftForest } from './src/voxelWorld.js';
import { loadVoxelsFromJSON } from './src/voxelLoader.js';

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl', { antialias: true, alpha: false });

if (!gl) {
	console.error('Failed to create WebGL context.');
	alert('WebGL not supported in this browser or context creation failed.');
	throw new Error('WebGL not supported');
}

const renderer = new Renderer(gl);
const camera = new Camera();
let voxels = createDefaultWorld();

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
	requestAnimationFrame(render);
}

function setupUI() {
	const fileInput = document.getElementById('fileInput');
	const resetBtn = document.getElementById('resetCameraBtn');
	const sunX = document.getElementById('sunX');
	const sunY = document.getElementById('sunY');
	const sunZ = document.getElementById('sunZ');
	const sunXSlider = document.getElementById('sunXSlider');
	const sunYSlider = document.getElementById('sunYSlider');
	const sunZSlider = document.getElementById('sunZSlider');
	const canvas = document.getElementById('glcanvas');

	resetBtn.addEventListener('click', () => {
		camera.reset();
	});

	function getSunPos() {
		const p = renderer.sunPosition || [0, 25, 0];
		return [p[0], p[1], p[2]];
	}
	function setSunPos(pos) {
		if (typeof renderer.setSunPosition === 'function') {
			renderer.setSunPosition(pos[0], pos[1], pos[2]);
		} else {
			renderer.sunPosition = [pos[0], pos[1], pos[2]];
		}
	}
	function syncXYZFromPos() {
		const p = getSunPos();
		if (sunX) sunX.value = String(Number(p[0].toFixed(1)));
		if (sunY) sunY.value = String(Number(p[1].toFixed(1)));
		if (sunZ) sunZ.value = String(Number(p[2].toFixed(1)));
		if (sunXSlider) sunXSlider.value = String(p[0]);
		if (sunYSlider) sunYSlider.value = String(p[1]);
		if (sunZSlider) sunZSlider.value = String(p[2]);
	}
	function updatePosFromXYZ() {
		if (!sunX || !sunY || !sunZ) return;
		const x = Number(sunX.value);
		const y = Number(sunY.value);
		const z = Number(sunZ.value);
		setSunPos([x, y, z]);
		if (sunXSlider) sunXSlider.value = String(x);
		if (sunYSlider) sunYSlider.value = String(y);
		if (sunZSlider) sunZSlider.value = String(z);
	}
	function updatePosFromSliders() {
		if (!sunXSlider || !sunYSlider || !sunZSlider) return;
		const x = Number(sunXSlider.value);
		const y = Number(sunYSlider.value);
		const z = Number(sunZSlider.value);
		setSunPos([x, y, z]);
		if (sunX) sunX.value = String(Number(x.toFixed(1)));
		if (sunY) sunY.value = String(Number(y.toFixed(1)));
		if (sunZ) sunZ.value = String(Number(z.toFixed(1)));
	}
	syncXYZFromPos();
	if (sunX && sunY && sunZ) {
		const onNumChange = () => updatePosFromXYZ();
		sunX.addEventListener('input', onNumChange);
		sunY.addEventListener('input', onNumChange);
		sunZ.addEventListener('input', onNumChange);
		sunX.addEventListener('change', onNumChange);
		sunY.addEventListener('change', onNumChange);
		sunZ.addEventListener('change', onNumChange);
	}
	if (sunXSlider && sunYSlider && sunZSlider) {
		const onSliderChange = () => updatePosFromSliders();
		sunXSlider.addEventListener('input', onSliderChange);
		sunYSlider.addEventListener('input', onSliderChange);
		sunZSlider.addEventListener('input', onSliderChange);
	}

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
				console.log(`Loaded ${voxels.length} voxels from "${file.name}"`);
				frameToVoxels(voxels);
				syncXYZFromPos();
			} catch (err) {
				console.error('Failed to load voxel JSON:', err);
				alert('Invalid voxel JSON file. See console for details.');
			}
		};
		reader.onerror = () => {
			console.error('Failed to read file.');
			alert('Failed to read file.');
		};
		reader.readAsText(file);
		input.value = '';
	});
}

function render() {
	camera.getViewMatrix();
	renderer.drawScene(voxels, camera);
	requestAnimationFrame(render);
}

init();
