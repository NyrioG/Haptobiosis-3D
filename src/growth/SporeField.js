import * as THREE from 'three';

// Particules ambiantes en suspension : des spores qui dérivent. Plus on
// interagit (energie), plus elles s'agitent et convergent vers les colonies —
// l'héritage direct d'Haptobiosis transposé en 3D.

export class SporeField {
  constructor(count = 1400, bounds = new THREE.Vector3(5, 3, 3)) {
    this.count = count;
    this.bounds = bounds;
    this.agitation = 0; // 0..1, monté par les interactions

    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * bounds.x * 2;
      pos[i * 3 + 1] = Math.random() * bounds.y;
      pos[i * 3 + 2] = (Math.random() - 0.5) * bounds.z * 2;
      seed[i] = Math.random() * 1000;
    }
    this._home = pos.slice();

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uAgitation: { value: 0 },
        uSize: { value: 9.0 },
        uColorA: { value: new THREE.Color(0x49b0ff) },
        uColorB: { value: new THREE.Color(0x53f0a0) },
      },
      vertexShader: /* glsl */`
        attribute float aSeed;
        uniform float uTime; uniform float uAgitation; uniform float uSize;
        varying float vGlow;
        void main(){
          vec3 p = position;
          float t = uTime + aSeed;
          float drift = 0.08 + uAgitation * 0.5;
          p.x += sin(t*0.7 + aSeed)*drift;
          p.y += cos(t*0.5 + aSeed*1.3)*drift*0.7;
          p.z += sin(t*0.6 + aSeed*0.7)*drift;
          vGlow = 0.4 + 0.6*uAgitation + 0.3*sin(t*2.0);
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          gl_PointSize = uSize * (1.0 + uAgitation) / max(-mv.z, 0.1);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uColorA; uniform vec3 uColorB; uniform float uAgitation;
        varying float vGlow;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          vec3 col = mix(uColorA, uColorB, uAgitation);
          gl_FragColor = vec4(col * vGlow, a * (0.5 + 0.5*vGlow));
        }
      `,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.mat = mat;
  }

  // pousse l'agitation (interaction)
  pulse(amount = 0.3) {
    this.agitation = Math.min(1, this.agitation + amount);
  }

  update(dt, time) {
    this.agitation = Math.max(0, this.agitation - dt * 0.4);
    this.mat.uniforms.uTime.value = time;
    this.mat.uniforms.uAgitation.value = this.agitation;
  }
}
