function clamp01(v) {
	return Math.min(1, Math.max(0, v));
}

export function loadVoxelsFromJSON(jsonData) {
	if (!jsonData || !Array.isArray(jsonData.voxels)) {
		throw new Error('Invalid format: expected { "voxels": [...] }');
	}
	const result = [];
	for (const item of jsonData.voxels) {
		if (
			!item ||
			typeof item.x !== 'number' ||
			typeof item.y !== 'number' ||
			typeof item.z !== 'number' ||
			!Array.isArray(item.color) ||
			item.color.length !== 3
		) {
			throw new Error('Invalid voxel entry: expected { x, y, z, color:[r,g,b] }');
		}
		const x = (item.x | 0);
		const y = (item.y | 0);
		const z = (item.z | 0);
		const r = clamp01(Number(item.color[0]));
		const g = clamp01(Number(item.color[1]));
		const b = clamp01(Number(item.color[2]));
		result.push({
			position: [x, y, z],
			color: [r, g, b]
		});
	}
	return result;
}



