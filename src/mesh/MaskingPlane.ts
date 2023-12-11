import * as THREE from 'three';
import {maskMaterial} from '../materials/MaskMaterial';

import {VertexNormalsHelper} from 'three/examples/jsm/helpers/VertexNormalsHelper';

export class MaskingPlane extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  private _helper: VertexNormalsHelper;
  constructor() {
    super(new THREE.PlaneGeometry(10, 10, 4, 4), maskMaterial);
    this._helper = new VertexNormalsHelper(this, 0.3, 0x808080);
    this.add(this._helper);
    this._helper.update();
  }
}
