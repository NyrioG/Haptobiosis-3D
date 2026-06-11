import * as THREE from 'three';

// Petites particules ("braises") émises par les colonies actives : elles
// s'échappent doucement de la surface, dérivent puis s'éteignent. Donne un
// sentiment de vie/respiration en plus des spores ambiantes de SporeField.

// Couleurs "mid" des palettes du shader de surface (surfaceMaterial.js),
// pour que les braises matchent la teinte de leur colonie d'origine.
const PALETTE_MID = [
  [0.16, 0.80, 0.45],
  [0.20, 0.50, 0.95],
  [0.90, 0.55, 0.20],
  [0.85, 0.25, 0.65],
  [0.30, 0.85, 0.78],
];

const MAX_EMBERS = 220;

export class ColonyEmberField {
  constructor() {
    this.max = MAX_EMBERS;

    this.positions = new Float32Array(this.max * 3);
    this.velocities = new Float32Array(this.max * 3);
    this.life = new Float32Array(this.max).fill(-1); // -1 = inactive
    this.maxLife = new Float32Array(this.max);
    this.colors = new Float32Array(this.max * 3);
    this.sizes = new Float32Array(this.max);
    this.lifeFrac = new Float32Array(this.max).fill(-1);

    this._cursor = 0;
    this._spawnCarry = new Float32Array(96); // accumulateur par colonie

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aLifeFrac', new THREE.BufferAttribute(this.lifeFrac, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute float aLifeFrac;
        attribute vec3 aColor;
        attribute float aSize;
        varying vec3 vColor;
        varying float vAlpha;
        void main(){
          vColor = aColor;
          float lf = aLifeFrac;
          if (lf < 0.0) {
            vAlpha = 0.0;
            gl_PointSize = 0.0;
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            return;
          }
          vAlpha = smoothstep(0.0, 0.12, lf) * (1.0 - smoothstep(0.55, 1.0, lf));
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (1.0 - lf * 0.4) / max(-mv.z, 0.1);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        varying float vAlpha;
        void main(){
          if (vAlpha <= 0.0) discard;
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor * 1.3, a * vAlpha);
        }
      `,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.geo = geo;

    this._ref = new THREE.Vector3();
    this._tangent = new THREE.Vector3();
    this._bitangent = new THREE.Vector3();
  }

  _spawn(px, py, pz, nx, ny, nz, color) {
    let idx = -1;
    for (let n = 0; n < this.max; n++) {
      const i = (this._cursor + n) % this.max;
      if (this.life[i] < 0) { idx = i; break; }
    }
    if (idx < 0) idx = this._cursor;
    this._cursor = (idx + 1) % this.max;

    // base tangentielle perpendiculaire à la normale, pour disperser autour
    if (Math.abs(ny) < 0.9) this._ref.set(0, 1, 0); else this._ref.set(1, 0, 0);
    this._tangent.set(ny * this._ref.z - nz * this._ref.y, nz * this._ref.x - nx * this._ref.z, nx * this._ref.y - ny * this._ref.x).normalize();
    this._bitangent.set(
      ny * this._tangent.z - nz * this._tangent.y,
      nz * this._tangent.x - nx * this._tangent.z,
      nx * this._tangent.y - ny * this._tangent.x
    );
    const tangent = this._tangent, bitangent = this._bitangent;

    const ang = Math.random() * Math.PI * 2;
    const jitter = (Math.random() * 0.04);
    const ox = Math.cos(ang) * jitter;
    const oz = Math.sin(ang) * jitter;

    this.positions[idx * 3] = px + nx * 0.01 + tangent.x * ox + bitangent.x * oz;
    this.positions[idx * 3 + 1] = py + ny * 0.01 + tangent.y * ox + bitangent.y * oz;
    this.positions[idx * 3 + 2] = pz + nz * 0.01 + tangent.z * ox + bitangent.z * oz;

    const speed = 0.10 + Math.random() * 0.18;
    const spread = (Math.random() - 0.5) * 0.12;
    this.velocities[idx * 3] = nx * speed + tangent.x * spread;
    this.velocities[idx * 3 + 1] = ny * speed + tangent.y * spread;
    this.velocities[idx * 3 + 2] = nz * speed + bitangent.z * spread;

    this.life[idx] = 0;
    this.maxLife[idx] = 1.4 + Math.random() * 1.8;
    this.lifeFrac[idx] = 0;
    this.colors[idx * 3] = color[0];
    this.colors[idx * 3 + 1] = color[1];
    this.colors[idx * 3 + 2] = color[2];
    this.sizes[idx] = 5 + Math.random() * 6;
  }

  update(dt, field) {
    // émission depuis les colonies actives (proportionnelle à leur énergie)
    for (let i = 0; i < field.count; i++) {
      const rate = 0.4 + field.energy[i] * 6.0;
      this._spawnCarry[i] = (this._spawnCarry[i] || 0) + rate * dt;
      let guard = 0;
      while (this._spawnCarry[i] >= 1 && guard++ < 4) {
        this._spawnCarry[i] -= 1;
        const pal = PALETTE_MID[Math.min(PALETTE_MID.length - 1, Math.floor(field.palette[i]))] ?? PALETTE_MID[0];
        this._spawn(
          field.positions[i * 3], field.positions[i * 3 + 1], field.positions[i * 3 + 2],
          field.normals[i * 3], field.normals[i * 3 + 1], field.normals[i * 3 + 2],
          pal
        );
      }
    }

    // intégration des particules vivantes
    const drag = Math.exp(-dt * 0.6);
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] < 0) continue;
      this.life[i] += dt;
      if (this.life[i] >= this.maxLife[i]) {
        this.life[i] = -1;
        this.lifeFrac[i] = -1;
        continue;
      }
      this.velocities[i * 3] *= drag;
      this.velocities[i * 3 + 1] = this.velocities[i * 3 + 1] * drag + dt * 0.05;
      this.velocities[i * 3 + 2] *= drag;

      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;

      this.lifeFrac[i] = this.life[i] / this.maxLife[i];
    }

    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aLifeFrac.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
  }
}
