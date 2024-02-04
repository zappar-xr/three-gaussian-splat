/// <reference types="emscripten"/>
import {expose, transfer} from 'comlink';
import type {MainModule} from './ISort';
import workerPromise from './sort';
import sharedArrayBufferWorkerPromise from './sort';
import {BufferPool} from './BufferPool';

export class WasmSorter {
  public module: EmscriptenModule & MainModule;
  private viewProjPtr: number;
  private globalBufferPtr: number;
  private combinedPtr: number;
  private bufferPool: BufferPool;

  constructor(private vertexCount: number, private globalBuffer: Uint8Array) {
    const combinedLength = this.calculateCombinedLength();
    // we're double buffering, so 2 is the magic number here
    this.bufferPool = new BufferPool(combinedLength, 2);
  }

  public async load() {
    const sharedABSupported = typeof SharedArrayBuffer !== 'undefined';
    this.module = await (sharedABSupported ? sharedArrayBufferWorkerPromise() : workerPromise());
    this.viewProjPtr = this.module._malloc(16 * Float32Array.BYTES_PER_ELEMENT);
    this.globalBufferPtr = this.module._malloc(this.vertexCount * 32);
    this.combinedPtr = this.module._malloc(this.calculateCombinedLength());
    this.module.HEAPU8.set(this.globalBuffer, this.globalBufferPtr);
  }

  public runSort(viewProj: Float32Array): ArrayBuffer {
    this.module.HEAPF32.set(viewProj, this.viewProjPtr / Float32Array.BYTES_PER_ELEMENT);
    this.module.runSort(this.viewProjPtr, this.globalBufferPtr, this.vertexCount, this.combinedPtr);

    const byteStart = this.combinedPtr;
    const byteLength = this.calculateCombinedLength();
    const bufferToTransfer = this.bufferPool.getBuffer();
    new Uint8Array(bufferToTransfer).set(new Uint8Array(this.module.HEAPU8.buffer, byteStart, byteLength));
    return transfer(bufferToTransfer, [bufferToTransfer]);
  }

  public updateGlobalBuffer(globalBuffer: Uint8Array = this.globalBuffer) {
    this.globalBuffer = globalBuffer;
    this.module?.HEAPU8.set(globalBuffer, this.globalBufferPtr);
  }

  public returnBuffer(buffer: ArrayBuffer): void {
    this.bufferPool.returnBuffer(buffer);
  }

  private calculateCombinedLength(): number {
    return 4 * 4 * this.vertexCount + 3 * 4 * this.vertexCount + 3 * 4 * this.vertexCount + 4 * 4 * this.vertexCount * Float32Array.BYTES_PER_ELEMENT;
  }

  public dispose(): void {
    if (this.module) {
      this.module._free(this.viewProjPtr);
      this.module._free(this.globalBufferPtr);
      this.module._free(this.combinedPtr);
    }
  }
}

expose(WasmSorter);
