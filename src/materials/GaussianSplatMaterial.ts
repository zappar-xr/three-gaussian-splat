import * as THREE from 'three';

import {fragmentShaderSource, vertexShaderSource} from '../shaders';

const computeFocalLengths = (width: number, height: number, fov: number, aspect: number, dpr: number) => {
  const fovRad = THREE.MathUtils.degToRad(fov);
  const fovXRad = 2 * Math.atan(Math.tan(fovRad / 2) * aspect);
  const fy = (dpr * height) / (2 * Math.tan(fovRad / 2));
  const fx = (dpr * width) / (2 * Math.tan(fovXRad / 2));
  return new THREE.Vector2(fx, fy);
};

export class GaussianSplatMaterial extends THREE.RawShaderMaterial {
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

  constructor(private camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    const size = new THREE.Vector2();
    renderer.getSize(size);
    const dpr = renderer.getPixelRatio();

    const {fov, aspect} = camera;
    const uniforms = {
      viewport: {
        value: new THREE.Vector2(size.x * dpr, size.y * dpr),
      },
      focal: {
        value: computeFocalLengths(size.x, size.y, fov, aspect, dpr),
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

  private onResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = 1;
    const {fov, aspect} = this.camera;
    this.uniforms.focal.value = computeFocalLengths(width, height, fov, aspect, dpr);
    this.uniforms.viewport.value = new THREE.Vector2(width * dpr, height * dpr);
  };

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    return super.dispose();
  }
}
