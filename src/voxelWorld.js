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

function seededRandom(seed) {
	let s = seed;
	return function() {
		s = (s * 9301 + 49297) % 233280;
		return s / 233280;
	};
}

function addTree(voxels, x, z, rand) {
	const trunkHeight = 4 + Math.floor(rand() * 2);
	const WOOD = [0.55, 0.35, 0.2];
	const LEAVES = [0.2, 0.6, 0.2];
	
	for (let y = 1; y <= trunkHeight; y++) {
		voxels.push({ position: [x, y, z], color: WOOD });
	}
	
	const leafY = trunkHeight;
	for (let dy = 0; dy <= 2; dy++) {
		const radius = dy === 2 ? 1 : 2;
		for (let dx = -radius; dx <= radius; dx++) {
			for (let dz = -radius; dz <= radius; dz++) {
				if (dx === 0 && dz === 0 && dy < 2) continue;
				if (Math.abs(dx) + Math.abs(dz) <= radius) {
					voxels.push({
						position: [x + dx, leafY + dy, z + dz],
						color: LEAVES
					});
				}
			}
		}
	}
	voxels.push({ position: [x, leafY + 3, z], color: LEAVES });
}

export function createMinecraftForest() {
	const voxels = [];
	const size = 20;
	const rand = seededRandom(12345);
	
	const mounds = [];
	const numMounds = 5;
	for (let i = 0; i < numMounds; i++) {
		mounds.push({
			x: Math.floor(rand() * (size * 2)) - size,
			z: Math.floor(rand() * (size * 2)) - size,
			radius: 5 + Math.floor(rand() * 5),
			height: 1
		});
	}
	
	const heightMap = {};
	for (let z = -size; z <= size; z++) {
		for (let x = -size; x <= size; x++) {
			let h = 0;
			for (const mound of mounds) {
				const dist = Math.sqrt((x - mound.x) ** 2 + (z - mound.z) ** 2);
				if (dist < mound.radius) {
					const influence = 1 - (dist / mound.radius);
					h = Math.max(h, Math.floor(influence * mound.height + 0.5));
				}
			}
			heightMap[`${x},${z}`] = h;
			
			for (let y = -2; y < h; y++) {
				voxels.push({
					position: [x, y, z],
					color: [0.4, 0.25, 0.15]
				});
			}
			
			const grassVariation = rand() * 0.05;
			voxels.push({
				position: [x, h, z],
				color: [0.3 + grassVariation, 0.55 + grassVariation, 0.25 + grassVariation]
			});
		}
	}
	
	const treeRand = seededRandom(54321);
	const treeSpacing = 5;
	for (let gridZ = -size + 2; gridZ <= size - 2; gridZ += treeSpacing) {
		for (let gridX = -size + 2; gridX <= size - 2; gridX += treeSpacing) {
			const offsetX = Math.floor(treeRand() * 3) - 1;
			const offsetZ = Math.floor(treeRand() * 3) - 1;
			const treeX = gridX + offsetX;
			const treeZ = gridZ + offsetZ;
			
			if (treeX >= -size && treeX <= size && treeZ >= -size && treeZ <= size) {
				const groundY = heightMap[`${treeX},${treeZ}`] || 0;
				
				const treeVoxels = [];
				addTree(treeVoxels, treeX, groundY, treeRand);
				voxels.push(...treeVoxels);
			}
		}
	}
	
	return voxels;
}



