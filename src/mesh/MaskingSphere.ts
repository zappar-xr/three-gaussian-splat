import * as THREE from 'three';
import {maskMaterial} from '../materials/MaskMaterial';

export class MaskingSphere extends THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> {
  constructor() {
    super(new THREE.SphereGeometry(1, 16, 16), maskMaterial);
  }
}
