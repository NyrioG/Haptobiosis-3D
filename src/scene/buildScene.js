import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createSurfaceMaterial } from '../shaders/surfaceMaterial.js';

// Construit la scène 3D, charge le clavier, applique le matériau de croissance,
// installe lumières + environnement. Renvoie les objets utiles à la boucle.

export async function buildScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070b);
  scene.fog = new THREE.FogExp2(0x05070b, 0.085);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 2.6, 5.4);

  // environnement doux pour les reflets PBR
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // lumières
  const key = new THREE.DirectionalLight(0xcfe8ff, 1.4);
  key.position.set(3, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x2f6bff, 0.8);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x101820, 0.6));

  // sol sombre réfléchissant discret
  const floorGeo = new THREE.CircleGeometry(14, 64);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x05070b, roughness: 0.6, metalness: 0.2 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  scene.add(floor);

  // chargement du clavier
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(import.meta.env.BASE_URL + 'models/keyboard.glb');

  let keyboard = null;
  let surfaceMat = null;
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      if (!o.geometry.attributes.uv) {
        // pas d'uv exporté : on en fabrique un planaire (suffit au shader 3D-distance)
        applyPlanarUV(o.geometry);
      }
      o.geometry.computeVertexNormals();
      keyboard = o;
    }
  });

  // place et centre
  const group = new THREE.Group();
  group.add(gltf.scene);
  scene.add(group);

  return { renderer, scene, camera, group, keyboard, attachSurfaceMaterial, pmrem };

  function attachSurfaceMaterial(colonyTex) {
    const bounds = new THREE.Box3().setFromObject(keyboard);
    surfaceMat = createSurfaceMaterial(colonyTex, bounds);
    keyboard.material = surfaceMat;
    return surfaceMat;
  }
}

// UV planaire basé sur les bornes XZ -> utile seulement pour d'éventuels effets uv.
function applyPlanarUV(geo) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    uv[i * 2] = (x - bb.min.x) / (bb.max.x - bb.min.x || 1);
    uv[i * 2 + 1] = (z - bb.min.z) / (bb.max.z - bb.min.z || 1);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
