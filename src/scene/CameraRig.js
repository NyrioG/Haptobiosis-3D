import * as THREE from 'three';
import { Phase } from '../core/StateMachine.js';

// Pilote la caméra selon la phase. Interpolation douce (critically-damped-ish)
// vers une cible position/regard, recalculée à chaque changement de phase ou
// quand on inspecte une nouvelle zone.

const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

export class CameraRig {
  constructor(camera) {
    this.cam = camera;
    this.pos = camera.position.clone();
    this.target = new THREE.Vector3(0, 0.2, 0);

    this.goalPos = this.pos.clone();
    this.goalTarget = this.target.clone();

    this._t = 0;
  }

  // vue de veille : caméra lointaine qui dérive
  idleView() {
    this.goalPos.set(0, 2.6, 5.4);
    this.goalTarget.set(0, 0.2, 0);
  }

  // vue d'ensemble du clavier, légèrement plongeante
  overview() {
    this.goalPos.set(0, 3.1, 3.7);
    this.goalTarget.set(0, 0.1, 0.1);
  }

  // plongée au-dessus d'un point monde (inspection d'une touche)
  inspect(worldPoint, normal) {
    const n = normal && normal.lengthSq() > 1e-4 ? normal.clone().normalize() : new THREE.Vector3(0, 1, 0);
    // caméra au-dessus, légèrement en biais pour garder du relief
    const up = n.clone().multiplyScalar(1.15);
    const tilt = new THREE.Vector3(0.0, 0.0, 0.9);
    this.goalPos.copy(worldPoint).add(up).add(tilt);
    this.goalTarget.copy(worldPoint);
  }

  onPhase(phase, ctx = {}) {
    if (phase === Phase.IDLE) this.idleView();
    else if (phase === Phase.AWAKE) this.overview();
    else if (phase === Phase.INSPECT) this.inspect(ctx.point, ctx.normal);
  }

  update(dt, phase) {
    this._t += dt;
    const lambda = phase === Phase.INSPECT ? 3.2 : 2.0;

    // dérive ambiante en veille
    let gp = this.goalPos.clone();
    let gt = this.goalTarget.clone();
    if (phase === Phase.IDLE) {
      gp.x += Math.sin(this._t * 0.15) * 0.6;
      gp.y += Math.sin(this._t * 0.11) * 0.25;
      gt.x += Math.sin(this._t * 0.13) * 0.15;
    } else if (phase === Phase.AWAKE) {
      gp.x += Math.sin(this._t * 0.25) * 0.3;
    }

    this.pos.x = damp(this.pos.x, gp.x, lambda, dt);
    this.pos.y = damp(this.pos.y, gp.y, lambda, dt);
    this.pos.z = damp(this.pos.z, gp.z, lambda, dt);
    this.target.x = damp(this.target.x, gt.x, lambda, dt);
    this.target.y = damp(this.target.y, gt.y, lambda, dt);
    this.target.z = damp(this.target.z, gt.z, lambda, dt);

    this.cam.position.copy(this.pos);
    this.cam.lookAt(this.target);
  }
}
