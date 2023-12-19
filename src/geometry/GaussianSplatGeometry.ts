import * as THREE from 'three';
import {SplatLoader} from '../loaders/SplatLoader';
import type {WasmSorter} from '../../cpp-sorter/worker';
import {Remote, transfer, wrap} from 'comlink';

const worker = new Worker(new URL('../../cpp-sorter/worker', import.meta.url), {type: 'module'});
const SortWorker = wrap<new (vertexCount: number, globalBuffer: Uint8Array) => WasmSorter>(worker);
export class GaussianSplatGeometry extends THREE.InstancedBufferGeometry {
  private worker: Remote<WasmSorter>;

  constructor(private maxSplats: number) {
    super();
  }

  private viewProj: number[] = [];
  private _sortRunning = false;

  public loading = false;
  private _initialized = false;

  public async update(camera: THREE.PerspectiveCamera | THREE.Camera, meshMatrixWorld: THREE.Matrix4) {
    if (this._sortRunning || !this._initialized || !this.worker) {
      return;
    }

    camera.updateMatrixWorld(true);

    this.viewProj = new THREE.Matrix4().multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(meshMatrixWorld).elements;

    this._sortRunning = true;
    const viewProj = new Float32Array(this.viewProj);
    const result = await this.worker.runSort(viewProj);

    const {quat, scale, center, color} = this.extractViews(result);

    (this.attributes.color as THREE.InstancedBufferAttribute).array = color;
    (this.attributes.quat as THREE.InstancedBufferAttribute).array = quat;
    (this.attributes.scale as THREE.InstancedBufferAttribute).array = scale;
    (this.attributes.center as THREE.InstancedBufferAttribute).array = center;

    this.attributes.color.needsUpdate = true;
    this.attributes.quat.needsUpdate = true;
    this.attributes.scale.needsUpdate = true;
    this.attributes.center.needsUpdate = true;

    await Promise.all([
      new Promise<void>(resolve => (this.attributes.color as THREE.InstancedBufferAttribute).onUpload(resolve)),
      new Promise<void>(resolve => (this.attributes.quat as THREE.InstancedBufferAttribute).onUpload(resolve)),
      new Promise<void>(resolve => (this.attributes.scale as THREE.InstancedBufferAttribute).onUpload(resolve)),
      new Promise<void>(resolve => (this.attributes.center as THREE.InstancedBufferAttribute).onUpload(resolve)),
    ]);

    await this.worker.returnBuffer(transfer(result, [result]));

    this._sortRunning = false;
  }

  async load(url: string, loadingManager?: THREE.LoadingManager) {
    if (this.loading) {
      console.warn('Geometry is already loading or loaded');
      return;
    }

    this.loading = true;

    try {
      const loader = new SplatLoader(undefined, loadingManager);
      const {data, bytesRead} = await loader.loadAsync(url);
      const vertexCount = Math.floor(bytesRead / ROW_LENGTH);
      const bufferInfo = trimBuffer(data, this.maxSplats, vertexCount);
      this.worker = await new SortWorker(bufferInfo.vertexCount, transfer(bufferInfo.buffer, [bufferInfo.buffer.buffer]));
      await this.worker.load();
      this.vertexCount = vertexCount;
      this.initAttributes();
    } catch (error) {
      console.error('Error loading geometry:', error);
    }
  }

  private vertexCount = 0;

  private async initAttributes() {
    const viewProj = new Float32Array(this.viewProj);
    const result = await this.worker.runSort(viewProj);
    const {quat, scale, center, color} = this.extractViews(result);

    this.setAttribute('color', new THREE.InstancedBufferAttribute(color, 4, true));
    this.setAttribute('quat', new THREE.InstancedBufferAttribute(quat, 4, true));
    this.setAttribute('scale', new THREE.InstancedBufferAttribute(scale, 3, true));
    this.setAttribute('center', new THREE.InstancedBufferAttribute(center, 3, true));
    this.setAttribute('position', new THREE.BufferAttribute(new Float32Array([1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 0]), 3, true));

    this.attributes.position.needsUpdate = true;
    this.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 2, 3, 0]), 1, true));
    this.instanceCount = Math.min(quat.length / 4, this.maxSplats);
    this.loading = false;
    this._initialized = true;
  }

  private extractViews(receivedBuffer: ArrayBuffer): {quat: Float32Array; scale: Float32Array; center: Float32Array; color: Float32Array} {
    const combined = new Float32Array(receivedBuffer);

    const quatLength = 4 * this.vertexCount;
    const scaleLength = 3 * this.vertexCount;
    const centerLength = 3 * this.vertexCount;
    const colorLength = 4 * this.vertexCount;

    const quatOffset = 0;
    const scaleOffset = quatOffset + quatLength;
    const centerOffset = scaleOffset + scaleLength;
    const colorOffset = centerOffset + centerLength;

    const quat = combined.subarray(quatOffset, quatOffset + quatLength);
    const scale = combined.subarray(scaleOffset, scaleOffset + scaleLength);
    const center = combined.subarray(centerOffset, centerOffset + centerLength);
    const color = combined.subarray(colorOffset, colorOffset + colorLength);

    return {quat, scale, center, color};
  }

  public dispose() {
    this.worker?.dispose();
    return super.dispose();
  }
}

const ROW_LENGTH = 3 * 4 + 3 * 4 + 4 + 4;

function trimBuffer(_buffer: Uint8Array, _maxSplats: number, _vertexCount: number): {buffer: Uint8Array; vertexCount: number} {
  const actualVertexCount = Math.min(_vertexCount, _maxSplats);
  const actualBufferSize = ROW_LENGTH * actualVertexCount;
  const buffer = _buffer.slice(0, actualBufferSize);
  return {buffer, vertexCount: actualVertexCount};
}
