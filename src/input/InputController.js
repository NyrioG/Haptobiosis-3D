import * as THREE from 'three';
import { keyToUVLoose } from '../core/keymap.js';

// Traduit les entrées en évènements de croissance.
// - Clavier : réveille la scène, choisit une zone (uv->point sur le mesh) et l'ensemence.
// - Souris  : raycast sur le mesh ; au survol/clic, nourrit la croissance au point touché.

export class InputController {
  constructor({ dom, camera, getMesh, onSeed, onFeed, onPoke }) {
    this.dom = dom;
    this.camera = camera;
    this.getMesh = getMesh;
    this.onSeed = onSeed;
    this.onFeed = onFeed;
    this.onPoke = onPoke;

    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.hover = null;            // dernier hit souris {point, normal}
    this.pointerDown = false;
    this._lastFeed = 0;

    this._onKey = this._onKey.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onDown = this._onDown.bind(this);
    this._onUp = this._onUp.bind(this);

    window.addEventListener('keydown', this._onKey);
    dom.addEventListener('pointermove', this._onMove);
    dom.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointerup', this._onUp);
  }

  _onKey(e) {
    if (e.repeat) return;
    this.onPoke?.();
    const uv = keyToUVLoose(e.key);
    if (uv) this.onSeed?.(uv, { source: 'key', key: e.key });
  }

  _raycast(clientX, clientY) {
    const mesh = this.getMesh();
    if (!mesh) return null;
    const rect = this.dom.getBoundingClientRect();
    this.ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.intersectObject(mesh, false)[0];
    if (!hit) return null;
    const normal = hit.face
      ? hit.face.normal.clone().transformDirection(mesh.matrixWorld).normalize()
      : new THREE.Vector3(0, 1, 0);
    return { point: hit.point.clone(), normal, uv: hit.uv?.clone() ?? null };
  }

  _onMove(e) {
    this.onPoke?.();
    const hit = this._raycast(e.clientX, e.clientY);
    this.hover = hit;
    if (hit) {
      const now = performance.now();
      // throttle pour ne pas saturer
      if (now - this._lastFeed > 28) {
        this._lastFeed = now;
        this.onFeed?.(hit, { strong: this.pointerDown });
      }
    }
  }

  _onDown(e) {
    this.pointerDown = true;
    this.onPoke?.();
    const hit = this._raycast(e.clientX, e.clientY);
    if (hit) this.onSeed?.(null, { source: 'pointer', hit });
  }

  _onUp() { this.pointerDown = false; }

  dispose() {
    window.removeEventListener('keydown', this._onKey);
    this.dom.removeEventListener('pointermove', this._onMove);
    this.dom.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('pointerup', this._onUp);
  }
}
