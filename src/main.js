import * as THREE from 'three';
import { buildScene } from './scene/buildScene.js';
import { StateMachine, Phase } from './core/StateMachine.js';
import { CameraRig } from './scene/CameraRig.js';
import { SurfaceSampler } from './scene/SurfaceSampler.js';
import { ColonyField } from './growth/ColonyField.js';
import { SporeField } from './growth/SporeField.js';
import { ColonyEmberField } from './growth/ColonyEmberField.js';
import { InputController } from './input/InputController.js';

const canvas = document.getElementById('scene');
const screensaver = document.getElementById('screensaver');
const hud = document.getElementById('hud');
const hudColonies = document.getElementById('hud-colonies');
const hudMass = document.getElementById('hud-mass');
const hudHint = document.getElementById('hud-hint');

(async function start() {
  const { renderer, scene, camera, keyboard, attachSurfaceMaterial } = await buildScene(canvas);

  // --- systèmes de croissance ---
  const field = new ColonyField();
  attachSurfaceMaterial(field.tex);
  const spores = new SporeField();
  scene.add(spores.points);
  const embers = new ColonyEmberField();
  scene.add(embers.points);

  const sampler = new SurfaceSampler(keyboard);
  sampler.refresh();

  // --- état + caméra ---
  const machine = new StateMachine();
  const rig = new CameraRig(camera);
  rig.idleView();

  machine.addEventListener('change', (e) => {
    const { to } = e.detail;
    rig.onPhase(to, machine._lastInspect || {});
    screensaver.classList.toggle('hidden', to !== Phase.IDLE);
    hud.classList.toggle('hidden', to === Phase.IDLE);
  });

  // --- entrées ---
  new InputController({
    dom: canvas,
    camera,
    getMesh: () => keyboard,
    onPoke: () => machine.poke(),
    onSeed: (uv, meta) => {
      spores.pulse(0.5);
      let s;
      if (meta.source === 'pointer' && meta.hit) {
        s = { point: meta.hit.point, normal: meta.hit.normal };
      } else if (uv) {
        s = sampler.sample(uv.u, uv.v);
      }
      if (!s) return;
      field.seed(s.point, s.normal, new THREE.Vector2(uv?.u ?? 0.5, uv?.v ?? 0.5), {
        energy: 0.7,
      });
      // passe en inspection au-dessus de la zone ensemencée
      machine._lastInspect = { point: s.point, normal: s.normal };
      machine.to(Phase.INSPECT);
      rig.inspect(s.point, s.normal);
      flashHint('colonie ensemencée');
    },
    onFeed: (hit, opts) => {
      spores.pulse(opts.strong ? 0.25 : 0.08);
      const added = field.feedNearest(hit.point, opts.strong ? 0.08 : 0.03, 0.35);
      if (added < 0 && opts.strong) {
        // clic dans le vide colonisable -> nouvelle colonie
        field.seed(hit.point, hit.normal, new THREE.Vector2(0.5, 0.5), { energy: 0.5 });
      }
    },
  });

  // --- resize ---
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- boucle ---
  const clock = new THREE.Clock();
  let elapsed = 0;

  // résolution adaptative : si le frame time grimpe durablement, on réduit
  // discrètement le pixel ratio (puis on le remonte dès que ça respire à nouveau)
  const maxPixelRatio = Math.min(window.devicePixelRatio, 2);
  const minPixelRatio = Math.min(maxPixelRatio, 1);
  let pixelRatio = maxPixelRatio;
  let slowFrames = 0;
  let fastFrames = 0;

  // HUD : n'écrire dans le DOM que si la valeur affichée change
  let lastHudColonies = -1;
  let lastHudMass = -1;

  function loop() {
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    elapsed += dt;

    machine.update(dt);
    field.update(dt);
    spores.update(dt, elapsed);
    embers.update(dt, field);
    rig.update(dt, machine.phase);

    // uniforms du shader de surface
    const sh = keyboard.material.userData?.shader;
    if (sh) {
      sh.uniforms.uCount.value = field.count;
      sh.uniforms.uTime.value = elapsed;
    }

    // HUD
    if (field.count !== lastHudColonies) {
      hudColonies.textContent = String(field.count);
      lastHudColonies = field.count;
    }
    const massRounded = Math.round(field.massCache * 10) / 10;
    if (massRounded !== lastHudMass) {
      hudMass.textContent = massRounded.toFixed(1);
      lastHudMass = massRounded;
    }

    renderer.render(scene, camera);

    // ajuste le pixel ratio si le frame time dévie durablement (>~33ms / <~18ms)
    if (maxPixelRatio > minPixelRatio) {
      if (rawDt > 0.033) {
        slowFrames++; fastFrames = 0;
        if (slowFrames > 30 && pixelRatio > minPixelRatio) {
          pixelRatio = Math.max(minPixelRatio, pixelRatio - 0.25);
          renderer.setPixelRatio(pixelRatio);
          slowFrames = 0;
        }
      } else if (rawDt < 0.018) {
        fastFrames++; slowFrames = 0;
        if (fastFrames > 90 && pixelRatio < maxPixelRatio) {
          pixelRatio = Math.min(maxPixelRatio, pixelRatio + 0.25);
          renderer.setPixelRatio(pixelRatio);
          fastFrames = 0;
        }
      } else {
        slowFrames = 0; fastFrames = 0;
      }
    }

    requestAnimationFrame(loop);
  }
  loop();

  // petit utilitaire d'indice
  let hintTimer = null;
  function flashHint(txt) {
    hudHint.textContent = txt;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      hudHint.textContent = 'survolez le clavier · tapez pour ensemencer';
    }, 2200);
  }

  // expose pour debug
  window.__hapto = { field, machine, rig, scene };
})();
