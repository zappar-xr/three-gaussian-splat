import * as THREE from 'three';

export const maskMaterial = new THREE.MeshBasicMaterial({
  wireframe: true,
  color: 0x808080,
  transparent: true,
  opacity: 0.4,
});
