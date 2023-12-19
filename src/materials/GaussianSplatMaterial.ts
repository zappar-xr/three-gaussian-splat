import * as THREE from 'three';

import {fragmentShaderSource, vertexShaderSource} from '../shaders';

const computeFocalLengths = (width: number, height: number, fov: number, aspect: number, dpr: number) => {
  const fovRad = THREE.MathUtils.degToRad(fov);
  const fovXRad = 2 * Math.atan(Math.tan(fovRad / 2) * aspect);
  const fy = (dpr * height) / (2 * Math.tan(fovRad / 2));
  const fx = (dpr * width) / (2 * Math.tan(fovXRad / 2));
  return new THREE.Vector2(fx, fy);
};

interface GaussianSplatUniforms {
  viewport: {value: THREE.Vector2};
  focal: {value: THREE.Vector2};
  minAlpha: {value: number};
  sphereRadius: {value: number};
  sphereCenter: {value: THREE.Vector3};
  planeNormal: {value: THREE.Vector3};
  planeDistance: {value: number};
  [key: string]: {value: any};
}

export class GaussianSplatMaterial extends THREE.RawShaderMaterial {
  private currentCamera?: THREE.PerspectiveCamera | THREE.Camera;
  private renderer?: THREE.WebGLRenderer;

  public set sphereRadius(value: number) {
    this.uniforms.sphereRadius.value = value;
    this.needsUpdate = true;
  }

  public set sphereCenter(value: THREE.Vector3) {
    this.uniforms.sphereCenter.value = value;
    this.needsUpdate = true;
  }

  public set minAlpha(value: number) {
    this.uniforms.minAlpha.value = value;
    this.needsUpdate = true;
  }

  public set planeNormal(value: THREE.Vector3) {
    this.uniforms.planeNormal.value = value;
    this.needsUpdate = true;
  }

  public set planeDistance(value: number) {
    this.uniforms.planeDistance.value = value;
    this.needsUpdate = true;
  }

  constructor() {
    const uniforms: GaussianSplatUniforms = {
      viewport: {
        value: new THREE.Vector2(),
      },
      focal: {
        value: new THREE.Vector2(),
      },
      minAlpha: {
        value: 0.02,
      },
      sphereRadius: {
        value: -1,
      },
      sphereCenter: {
        value: new THREE.Vector3(0, 0, 0),
      },
      planeNormal: {
        value: new THREE.Vector3(0, 0, 0),
      },
      planeDistance: {
        value: 0,
      },
    };
    super({
      uniforms: uniforms,
      fragmentShader: fragmentShaderSource,
      vertexShader: vertexShaderSource,
      depthTest: true,
      depthWrite: false,
      transparent: true,
    });

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    if (!this.currentCamera) return;

    const size = new THREE.Vector2();
    this.renderer?.getSize(size);
    const width = size.x;
    const height = size.y;

    const dpr = this.renderer?.getPixelRatio() || 1;

    let fov = 75;
    let aspect = width / height;

    if (this.currentCamera instanceof THREE.PerspectiveCamera) {
      fov = this.currentCamera.fov;
      aspect = this.currentCamera.aspect;
    }

    this.uniforms.focal.value = computeFocalLengths(width, height, fov, aspect, dpr);
    this.uniforms.viewport.value = new THREE.Vector2(width * dpr, height * dpr);
  };

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    return super.dispose();
  }

  public initialize(camera: THREE.PerspectiveCamera | THREE.Camera, renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    this.currentCamera = camera;
    const size = new THREE.Vector2();
    renderer.getSize(size);
    const dpr = renderer.getPixelRatio();
    let fov = 75;
    let aspect = size.x / size.y;

    if (this.currentCamera instanceof THREE.PerspectiveCamera) {
      fov = this.currentCamera.fov;
      aspect = this.currentCamera.aspect;
    }

    this.uniforms.focal.value = computeFocalLengths(size.x, size.y, fov, aspect, dpr);
    this.uniforms.viewport.value = new THREE.Vector2(size.x * dpr, size.y * dpr);
  }
}
