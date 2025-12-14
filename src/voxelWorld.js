export function createDefaultWorld() {
	const voxels = [];
	for (let z = -8; z < 8; z++) {
		for (let x = -8; x < 8; x++) {
			voxels.push({
				position: [x, 0, z],
				color: [0.5, 0.5, 0.5]
			});
		}
	}
	return voxels;
}
