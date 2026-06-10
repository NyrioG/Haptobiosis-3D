import * as THREE from 'three';

// Convertit un uv clavier (0..1, 0..1) en un point réel sur la face supérieure
// du mesh : on tire un rayon vertical du dessus de la boîte englobante vers le bas,
// à la position XZ correspondante, et on prend le premier impact.

export class SurfaceSampler {
  constructor(mesh) {
    this.mesh = mesh;
    this.box = new THREE.Box3().setFromObject(mesh);
    this.ray = new THREE.Raycaster();
    this._down = new THREE.Vector3(0, -1, 0);
  }

  refresh() {
    this.box.setFromObject(this.mesh);
  }

  // uv.x -> X (gauche..droite), uv.y -> Z (fond..devant)
  sample(u, v) {
    const min = this.box.min, max = this.box.max;
    const x = THREE.MathUtils.lerp(min.x, max.x, u);
    const z = THREE.MathUtils.lerp(min.z, max.z, v);
    const yTop = max.y + 0.5;
    this.ray.set(new THREE.Vector3(x, yTop, z), this._down);
    const hit = this.ray.intersectObject(this.mesh, false)[0];
    if (hit) {
      const normal = hit.face
        ? hit.face.normal.clone().transformDirection(this.mesh.matrixWorld).normalize()
        : new THREE.Vector3(0, 1, 0);
      return { point: hit.point.clone(), normal };
    }
    // pas d'impact (trou du mesh) : on retombe sur la surface plane de la boîte
    return {
      point: new THREE.Vector3(x, (min.y + max.y) * 0.5, z),
      normal: new THREE.Vector3(0, 1, 0),
    };
  }
}
