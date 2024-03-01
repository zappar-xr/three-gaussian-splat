/* eslint-disable node/no-unsupported-features/node-builtins */
// import * as GUI from 'lil-gui';
import * as THREE from 'three';
import {renderer, camera, scene, controls} from './common';
import {GaussianSplatMesh} from '../src/index';
// import {MaskingSphere} from '../src/mesh/MaskingSphere';
// import {Test} from '../src/worker_test';
const bonsai = new URL('./bonsai.splat', import.meta.url).href;
const splat = new GaussianSplatMesh(bonsai, 1000000);
splat.load({progressive: true});
scene.add(splat);

renderer.setAnimationLoop(animation);

function animation() {
  controls.update();
  splat.update(camera, renderer);
  renderer.render(scene, camera);
}
