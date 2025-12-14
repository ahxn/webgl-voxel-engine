export const CHUNK_SIZE = 16;

export class Chunk {
	constructor(chunkX, chunkY, chunkZ) {
		this.chunkX = chunkX;
		this.chunkY = chunkY;
		this.chunkZ = chunkZ;
		this.voxels = [];
		this.isDirty = true;
	}
	
	getKey() {
		return `${this.chunkX},${this.chunkY},${this.chunkZ}`;
	}
	
	getWorldPosition() {
		return [
			this.chunkX * CHUNK_SIZE,
			this.chunkY * CHUNK_SIZE,
			this.chunkZ * CHUNK_SIZE
		];
	}
	
	addVoxel(localX, localY, localZ, color) {
		this.voxels.push({
			position: [localX, localY, localZ],
			color: color
		});
		this.isDirty = true;
	}
	
	getBounds() {
		const [wx, wy, wz] = this.getWorldPosition();
		return {
			min: [wx, wy, wz],
			max: [wx + CHUNK_SIZE, wy + CHUNK_SIZE, wz + CHUNK_SIZE]
		};
	}
	
	isEmpty() {
		return this.voxels.length === 0;
	}
}

export class ChunkManager {
	constructor() {
		this.chunks = new Map();
	}
	
	getChunkKey(chunkX, chunkY, chunkZ) {
		return `${chunkX},${chunkY},${chunkZ}`;
	}
	
	worldToChunk(x, y, z) {
		return [
			Math.floor(x / CHUNK_SIZE),
			Math.floor(y / CHUNK_SIZE),
			Math.floor(z / CHUNK_SIZE)
		];
	}
	
	worldToLocal(x, y, z) {
		const mod = (n, m) => ((n % m) + m) % m;
		return [
			mod(x, CHUNK_SIZE),
			mod(y, CHUNK_SIZE),
			mod(z, CHUNK_SIZE)
		];
	}
	
	getOrCreateChunk(chunkX, chunkY, chunkZ) {
		const key = this.getChunkKey(chunkX, chunkY, chunkZ);
		if (!this.chunks.has(key)) {
			this.chunks.set(key, new Chunk(chunkX, chunkY, chunkZ));
		}
		return this.chunks.get(key);
	}
	
	getChunk(chunkX, chunkY, chunkZ) {
		const key = this.getChunkKey(chunkX, chunkY, chunkZ);
		return this.chunks.get(key) || null;
	}
	
	addVoxel(worldX, worldY, worldZ, color) {
		const [chunkX, chunkY, chunkZ] = this.worldToChunk(worldX, worldY, worldZ);
		const [localX, localY, localZ] = this.worldToLocal(worldX, worldY, worldZ);
		const chunk = this.getOrCreateChunk(chunkX, chunkY, chunkZ);
		chunk.addVoxel(localX, localY, localZ, color);
	}
	
	loadVoxels(voxels) {
		this.chunks.clear();
		for (const voxel of voxels) {
			const [x, y, z] = voxel.position;
			this.addVoxel(x, y, z, voxel.color);
		}
	}
	
	getAllChunks() {
		return Array.from(this.chunks.values());
	}
	
	getVisibleChunks(camera) {
		const allChunks = this.getAllChunks();
		return allChunks.filter(chunk => !chunk.isEmpty());
	}
	
	getStats() {
		const chunks = this.getAllChunks();
		const totalVoxels = chunks.reduce((sum, chunk) => sum + chunk.voxels.length, 0);
		const nonEmptyChunks = chunks.filter(c => !c.isEmpty()).length;
		return {
			totalChunks: chunks.length,
			nonEmptyChunks: nonEmptyChunks,
			totalVoxels: totalVoxels
		};
	}
}

