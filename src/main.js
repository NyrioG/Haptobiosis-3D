import * as THREE from 'three';
import { buildScene } from './scene/buildScene.js';
import { StateMachine, Phase } from './core/StateMachine.js';
import { CameraRig } from './scene/CameraRig.js';
import { SurfaceSampler } from './scene/SurfaceSampler.js';
import { ColonyField } from './growth/ColonyField.js';
import { SporeField } from './growth/SporeField.js';
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

  function loop() {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    machine.update(dt);
    field.update(dt);
    spores.update(dt, elapsed);
    rig.update(dt, machine.phase);

    // uniforms du shader de surface
    const sh = keyboard.material.userData?.shader;
    if (sh) {
      sh.uniforms.uCount.value = field.count;
      sh.uniforms.uTime.value = elapsed;
    }

    // HUD
    hudColonies.textContent = String(field.count);
    hudMass.textContent = field.massCache.toFixed(1);

    renderer.render(scene, camera);
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
