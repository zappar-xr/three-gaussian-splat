import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

const {innerWidth, innerHeight} = window;

export const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.01, 1000);

export const scene = new THREE.Scene();

export const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
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

// const sky = new Sky();
// sky.scale.setScalar(1000);
// scene.add(sky);
// //
// const sun = new THREE.Vector3();

// sky.material.uniforms['turbidity'].value = 10;
// sky.material.uniforms['rayleigh'].value = 2;
// sky.material.uniforms['mieCoefficient'].value = 0.005;
// sky.material.uniforms['mieDirectionalG'].value = 0.7;
// sky.material.uniforms['sunPosition'].value = sun;

// sun.set(0, -0.5, -1);
