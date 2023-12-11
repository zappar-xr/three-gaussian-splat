import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {Sky} from 'three/examples/jsm/objects/Sky.js';

const {innerWidth, innerHeight} = window;

export const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.0001, 100000);
// eslint-disable-next-line node/no-unsupported-features/node-builtins
export const UVTextureURL = new URL('./assets/textures/uvs.webp', import.meta.url).href;
export const textureLoader = new THREE.TextureLoader();
export const UVTexture = textureLoader.load(UVTextureURL);
export const UVMaterial = new THREE.MeshBasicMaterial({map: UVTexture});
UVMaterial.side = THREE.DoubleSide;
export const scene = new THREE.Scene();

export const renderer = new THREE.WebGLRenderer({antialias: false});
renderer.setSize(innerWidth, innerHeight);

document.body.appendChild(renderer.domElement);
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.updateProjectionMatrix();
}

export const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(1, 3, 10);

const gridSize = 10;
const gridDivisions = 10;
const gridHelper = new THREE.GridHelper(gridSize, gridDivisions);
scene.add(gridHelper);

const sky = new Sky();
sky.scale.setScalar(1000);
scene.add(sky);
//
const sun = new THREE.Vector3();

sky.material.uniforms['turbidity'].value = 10;
sky.material.uniforms['rayleigh'].value = 2;
sky.material.uniforms['mieCoefficient'].value = 0.005;
sky.material.uniforms['mieDirectionalG'].value = 0.7;
sky.material.uniforms['sunPosition'].value = sun;

sun.set(0, -0.5, -1);
