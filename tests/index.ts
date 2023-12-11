/* eslint-disable node/no-unsupported-features/node-builtins */
// import * as GUI from 'lil-gui';
import * as THREE from 'three';
import {renderer, camera, scene, controls} from './common';
import {GaussianSplatMesh} from '../src/index';
// import {MaskingSphere} from '../src/mesh/MaskingSphere';
// import {Test} from '../src/worker_test';
const bonsai = new URL('./bonsai.splat', import.meta.url).href;
const splat = new GaussianSplatMesh(camera, renderer, bonsai, Infinity);
const loadingManager = new THREE.LoadingManager();
splat.load(loadingManager);
scene.add(splat);

// setTimeout(() => {
//   const test = new Test();
// }, 10);

renderer.setAnimationLoop(animation);
splat.position.y = 3;
splat.scale.setScalar(2.3);

const spintest = false;
controls.autoRotate = spintest;
controls.autoRotateSpeed = 64;

let time = 0;
const amplitude = 10;
const frequency = 8;
const initialY = camera.position.y;

function animation() {
  time += 0.01;
  if (spintest) {
    camera.position.y = amplitude * Math.sin(frequency * time) + initialY;
  }

  controls.update();
  splat.update();
  renderer.render(scene, camera);
}
