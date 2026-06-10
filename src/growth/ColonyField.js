import * as THREE from 'three';

// Gère l'ensemble des colonies (les "graines" de croissance).
// Chaque colonie = un point sur la surface qui s'étale de façon irrégulière.
// Données empaquetées dans une DataTexture (3 lignes) lue par le shader de surface.
//
//   ligne 0 : position.xyz , rayon courant
//   ligne 1 : uv.xy        , énergie , seed
//   ligne 2 : palette      , anisoDir (rad) , anisoAmount , wobble

const MAX_COLONIES = 96;
const ROWS = 3;

export class ColonyField {
  constructor() {
    this.max = MAX_COLONIES;
    this.count = 0;

    this.positions = new Float32Array(this.max * 3);
    this.normals = new Float32Array(this.max * 3);
    this.uvs = new Float32Array(this.max * 2);
    this.age = new Float32Array(this.max);
    this.energy = new Float32Array(this.max);
    this.seedArr = new Float32Array(this.max);     // graine de bruit unique
    this.palette = new Float32Array(this.max);     // indice de palette (0..N)
    this.anisoDir = new Float32Array(this.max);    // direction d'étalement privilégiée
    this.anisoAmt = new Float32Array(this.max);    // intensité de l'asymétrie
    this.wobble = new Float32Array(this.max);      // irrégularité du contour
    this.growthRate = new Float32Array(this.max);  // vitesse propre (développement aléatoire)
    this.capArr = new Float32Array(this.max);      // rayon plafond propre

    this.tex = new THREE.DataTexture(
      new Float32Array(this.max * 4 * ROWS),
      this.max, ROWS, THREE.RGBAFormat, THREE.FloatType
    );
    this.tex.minFilter = THREE.NearestFilter;
    this.tex.magFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false;
    this.tex.needsUpdate = true;

    this.massCache = 0;
    this._paletteCount = 5;
  }

  seed(pos, normal, uv, { energy = 0.6, mergeDist = 0.1, palette = -1 } = {}) {
    // coalescence : renforce une colonie proche plutôt que d'en empiler
    for (let i = 0; i < this.count; i++) {
      const dx = this.positions[i * 3] - pos.x;
      const dy = this.positions[i * 3 + 1] - pos.y;
      const dz = this.positions[i * 3 + 2] - pos.z;
      if (dx * dx + dy * dy + dz * dz < mergeDist * mergeDist) {
        this.energy[i] = Math.min(1.5, this.energy[i] + energy * 0.5);
        return i;
      }
    }
    let idx;
    if (this.count >= this.max) {
      let victim = 0, best = Infinity;
      for (let i = 0; i < this.count; i++) {
        const score = this.energy[i] - this.age[i] * 0.01;
        if (score < best) { best = score; victim = i; }
      }
      idx = victim;
    } else {
      idx = this.count++;
    }
    this._write(idx, pos, normal, uv, energy, palette);
    return idx;
  }

  _write(i, pos, normal, uv, energy, palette) {
    this.positions[i * 3] = pos.x;
    this.positions[i * 3 + 1] = pos.y;
    this.positions[i * 3 + 2] = pos.z;
    this.normals[i * 3] = normal.x;
    this.normals[i * 3 + 1] = normal.y;
    this.normals[i * 3 + 2] = normal.z;
    this.uvs[i * 2] = uv.x;
    this.uvs[i * 2 + 1] = uv.y;
    this.age[i] = 0;
    this.energy[i] = energy;
    // caractère unique de la colonie -> formes et couleurs jamais identiques
    this.seedArr[i] = Math.random() * 1000;
    this.palette[i] = palette >= 0 ? palette : Math.floor(Math.random() * this._paletteCount);
    this.anisoDir[i] = Math.random() * Math.PI * 2;
    this.anisoAmt[i] = 0.25 + Math.random() * 0.5;       // étalement plus marqué d'un côté
    this.wobble[i] = 0.5 + Math.random() * 0.8;          // contour plus ou moins déchiqueté
    this.growthRate[i] = 0.45 + Math.random() * 0.9;     // certaines poussent vite, d'autres lentement
    this.capArr[i] = 0.16 + Math.random() * 0.28;        // tailles finales variées
  }

  feedNearest(pos, amount = 0.04, radius = 0.25) {
    let found = -1, bd = radius * radius;
    for (let i = 0; i < this.count; i++) {
      const dx = this.positions[i * 3] - pos.x;
      const dy = this.positions[i * 3 + 1] - pos.y;
      const dz = this.positions[i * 3 + 2] - pos.z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; found = i; }
    }
    if (found >= 0) this.energy[found] = Math.min(1.6, this.energy[found] + amount);
    return found;
  }

  update(dt) {
    let mass = 0;
    const data = this.tex.image.data;
    const W = this.max;
    for (let i = 0; i < this.count; i++) {
      this.age[i] += dt;
      // croissance logistique, plafond et vitesse PROPRES à la colonie
      const cap = this.capArr[i] + this.energy[i] * 0.22;
      const k = this.growthRate[i];
      const r = cap * (1 - Math.exp(-k * this.age[i]));
      this.energy[i] = Math.max(0, this.energy[i] - dt * 0.01);
      mass += r;

      const a = i * 4;                  // ligne 0
      data[a] = this.positions[i * 3];
      data[a + 1] = this.positions[i * 3 + 1];
      data[a + 2] = this.positions[i * 3 + 2];
      data[a + 3] = r;

      const b = (W + i) * 4;            // ligne 1
      data[b] = this.uvs[i * 2];
      data[b + 1] = this.uvs[i * 2 + 1];
      data[b + 2] = this.energy[i];
      data[b + 3] = this.seedArr[i];

      const c = (2 * W + i) * 4;        // ligne 2
      data[c] = this.palette[i];
      data[c + 1] = this.anisoDir[i];
      data[c + 2] = this.anisoAmt[i];
      data[c + 3] = this.wobble[i];
    }
    this.tex.needsUpdate = true;
    this.massCache = mass;
  }
}

export { MAX_COLONIES, ROWS };
