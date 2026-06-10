import * as THREE from 'three';
import { MAX_COLONIES, ROWS } from '../growth/ColonyField.js';

// Matériau de surface : MeshStandardMaterial enrichi (onBeforeCompile) qui peint
// des colonies organiques par-dessus l'éclairage. Pour chaque fragment on parcourt
// les colonies, on déforme l'espace (domain warping) pour obtenir des contours
// déchiquetés, on étale de façon anisotrope (asymétrique) et on colore selon une
// palette propre à chaque colonie, avec une texture interne mouchetée.

const noiseGLSL = /* glsl */`
  vec3 hash3(vec3 p){
    p = vec3(dot(p,vec3(127.1,311.7,74.7)),
             dot(p,vec3(269.5,183.3,246.1)),
             dot(p,vec3(113.5,271.9,124.6)));
    return fract(sin(p)*43758.5453123);
  }
  float vnoise(vec3 p){
    vec3 i = floor(p); vec3 f = fract(p);
    vec3 u = f*f*(3.0-2.0*f);
    float n000 = hash3(i+vec3(0,0,0)).x;
    float n100 = hash3(i+vec3(1,0,0)).x;
    float n010 = hash3(i+vec3(0,1,0)).x;
    float n110 = hash3(i+vec3(1,1,0)).x;
    float n001 = hash3(i+vec3(0,0,1)).x;
    float n101 = hash3(i+vec3(1,0,1)).x;
    float n011 = hash3(i+vec3(0,1,1)).x;
    float n111 = hash3(i+vec3(1,1,1)).x;
    float nx00 = mix(n000,n100,u.x);
    float nx10 = mix(n010,n110,u.x);
    float nx01 = mix(n001,n101,u.x);
    float nx11 = mix(n011,n111,u.x);
    float nxy0 = mix(nx00,nx10,u.y);
    float nxy1 = mix(nx01,nx11,u.y);
    return mix(nxy0,nxy1,u.z);
  }
  float fbm(vec3 p){
    float a=0.5, s=0.0;
    for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.02+vec3(11.3,7.7,3.1); a*=0.5; }
    return s;
  }
  // bruit cellulaire (Worley) approx -> donne un grain "cellules" à l'intérieur
  float worley(vec3 p){
    vec3 ip = floor(p); vec3 fp = fract(p);
    float md = 1.0;
    for(int x=-1;x<=1;x++)
    for(int y=-1;y<=1;y++)
    for(int z=-1;z<=1;z++){
      vec3 g = vec3(float(x),float(y),float(z));
      vec3 o = hash3(ip+g);
      vec3 r = g + o - fp;
      md = min(md, dot(r,r));
    }
    return sqrt(md);
  }
`;

// Palettes (core, mid, rim) — variées, façon cultures sur boîte de Pétri.
const paletteGLSL = /* glsl */`
  void getPalette(int idx, out vec3 core, out vec3 mid, out vec3 rim){
    if(idx==0){      // émeraude -> cyan
      core=vec3(0.85,0.98,0.78); mid=vec3(0.16,0.80,0.45); rim=vec3(0.05,0.40,0.55);
    } else if(idx==1){ // bleu cobalt -> indigo
      core=vec3(0.80,0.92,1.00); mid=vec3(0.20,0.50,0.95); rim=vec3(0.10,0.12,0.55);
    } else if(idx==2){ // ocre -> rouille (moisissure)
      core=vec3(1.00,0.93,0.70); mid=vec3(0.90,0.55,0.20); rim=vec3(0.45,0.18,0.10);
    } else if(idx==3){ // magenta -> violet
      core=vec3(1.00,0.85,0.95); mid=vec3(0.85,0.25,0.65); rim=vec3(0.35,0.10,0.45);
    } else {          // turquoise pâle -> sarcelle
      core=vec3(0.90,1.00,0.96); mid=vec3(0.30,0.85,0.78); rim=vec3(0.08,0.35,0.42);
    }
  }
`;

export function createSurfaceMaterial(colonyTex) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a0d12,
    roughness: 0.88,
    metalness: 0.0,
  });

  mat.userData.uniforms = {
    uColonies: { value: colonyTex },
    uCount: { value: 0 },
    uTime: { value: 0 },
    uMax: { value: MAX_COLONIES },
  };

  // coords y des 3 lignes de la texture de données (hauteur = ROWS)
  const ROW0 = (0 + 0.5) / ROWS;
  const ROW1 = (1 + 0.5) / ROWS;
  const ROW2 = (2 + 0.5) / ROWS;

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, mat.userData.uniforms);

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n varying vec3 vWorldPos;`);
    if (shader.vertexShader.includes('#include <worldpos_vertex>')) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>\n vWorldPos = (modelMatrix * vec4(transformed,1.0)).xyz;`
      );
    } else {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `vWorldPos = (modelMatrix * vec4(transformed,1.0)).xyz;\n#include <project_vertex>`
      );
    }

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWorldPos;
        uniform sampler2D uColonies;
        uniform int uCount;
        uniform int uMax;
        uniform float uTime;
        ${noiseGLSL}
        ${paletteGLSL}
      `)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float vColonyCover = 0.0;
        float vColonyCore = 0.0;
        {
          float texelW = 1.0 / float(uMax);
          vec3 accum = vec3(0.0);
          float cover = 0.0;
          float coreSum = 0.0;

          for (int i = 0; i < ${MAX_COLONIES}; i++) {
            if (i >= uCount) break;
            float fx = (float(i) + 0.5) * texelW;
            vec4 c0 = texture2D(uColonies, vec2(fx, ${ROW0.toFixed(5)})); // pos.xyz, radius
            float radius = c0.a;
            if (radius <= 0.0001) continue;

            vec4 c1 = texture2D(uColonies, vec2(fx, ${ROW1.toFixed(5)})); // uv, energy, seed
            vec4 c2 = texture2D(uColonies, vec2(fx, ${ROW2.toFixed(5)})); // palette, anisoDir, anisoAmt, wobble
            float energy = c1.b;
            float seed   = c1.a;
            int   pal    = int(c2.r + 0.5);
            float aDir   = c2.g;
            float aAmt   = c2.b;
            float wob    = c2.a;

            vec3 rel = vWorldPos - c0.rgb;
            float d = length(rel);
            // élague tôt : au-delà de ~2x le rayon, aucune contribution possible
            if (d > radius * 2.2) continue;

            // --- domain warping : on déforme l'espace pour des contours déchiquetés ---
            vec3 sp = vWorldPos * 6.0 + seed;
            vec3 warp = vec3(
              fbm(sp),
              fbm(sp + 5.2),
              fbm(sp + 9.7)
            ) - 0.5;
            vec3 wpos = rel + warp * radius * (0.6 * wob);

            // --- anisotropie : étalement plus fort dans une direction (sur le plan tangent approx XZ) ---
            vec2 dir = vec2(cos(aDir), sin(aDir));
            float along = dot(normalize(wpos.xz + 1e-5), dir);   // -1..1
            float aniso = 1.0 + aAmt * along;                    // rayon effectif modulé
            float rEff = radius * aniso;

            float dl = length(wpos);

            // bord plus net + contour : on garde un liseré marqué
            float edge0 = rEff * 0.97;
            float t = 1.0 - smoothstep(edge0, rEff, dl);
            if (t <= 0.0) continue;
            // anneau de contour sombre juste avant le bord
            float outline = smoothstep(rEff * 0.80, rEff * 0.95, dl) * (1.0 - smoothstep(rEff * 0.95, rEff, dl));

            // --- développement aléatoire : lobes/satellites via seuillage de bruit ---
            float lobe = fbm(vWorldPos * 9.0 + seed * 1.7);
            float lobeMask = smoothstep(0.30, 0.70, lobe + (rEff - dl) * 1.8);
            t *= mix(0.25, 1.0, lobeMask);

            // --- texture interne : grain cellulaire + moucheture ---
            float cells = worley(vWorldPos * 26.0 + seed);
            float speck = fbm(vWorldPos * 40.0 + seed * 3.0);
            float grain = mix(0.7, 1.15, cells) * mix(0.85, 1.1, speck);

            // anneaux de colonisation (fronts concentriques), désynchronisés par seed
            float rings = 0.5 + 0.5 * sin(dl * 55.0 - uTime * 1.2 - seed);

            // --- couleur depuis la palette propre à la colonie ---
            vec3 cCore, cMid, cRim;
            getPalette(pal, cCore, cMid, cRim);
            float radial = clamp(dl / max(rEff, 1e-4), 0.0, 1.0); // 0 centre -> 1 bord
            vec3 col = mix(cCore, cMid, smoothstep(0.0, 0.55, radial));
            col = mix(col, cRim, smoothstep(0.5, 1.0, radial));
            // liseré sombre net au bord (contour)
            col = mix(col, cRim * 0.25, outline * 0.85);

            float body = t * grain * (0.8 + 0.2 * rings) * (0.6 + energy * 0.7);

            accum += col * body;
            cover += body;
            float wet = 1.0 - smoothstep(0.0, 0.4, radial);
            coreSum += wet * t;
          }

          cover = clamp(cover, 0.0, 1.0);
          if (cover > 0.001) {
            vec3 stain = accum / max(cover, 0.001);
            diffuseColor.rgb = mix(diffuseColor.rgb, stain, cover);
          }
          vColonyCover = cover;
          vColonyCore = clamp(coreSum, 0.0, 1.0);
        }
      `);

    // zones colonisées au cœur = plus humides : rugosité plus basse
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
       roughnessFactor = mix(roughnessFactor, 0.3, vColonyCore);`
    );

    mat.userData.shader = shader;
  };

  return mat;
}
