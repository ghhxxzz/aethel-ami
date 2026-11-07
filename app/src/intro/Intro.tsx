import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { THEMES } from "../themes/themes";
import { useSettings } from "../store/settings";
import "../styles/intro.css";

interface Props {
  onDone: () => void;
}

// Linha do tempo (ms). A introdução inteira dura ~5 s. Ajuste aqui se quiser mais rápida ou lenta.
const APPROACH_MS = 2800; // a estrela vem até a câmera
const FLASH_START = 2800; // o mergulho final e o clarão começam
const FLASH_PEAK = 3300; // tela toda clara: a estrela some
const FLASH_END = 4100;
const TITLE_OUT = 4700;
const END_MS = 5200;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Textura de brilho macio desenhada em canvas (sem arquivos de imagem). */
function glowTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, color + "55");
    grad.addColorStop(1, color + "00");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const NOISE = /* glsl */ `
float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x), f.y), f.z);
}`;

/** Estrela 3D com plasma na superfície, raios de difração e brilho (bloom), vindo em direção à câmera. */
export function Intro({ onDone }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    // Respeita a configuração "reduzir movimento" do Windows.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doneRef.current();
      return;
    }
    const host = hostRef.current;
    const root = rootRef.current;
    const flash = flashRef.current;
    const title = titleRef.current;
    const line = lineRef.current;
    if (!host || !root || !flash || !title || !line) {
      doneRef.current();
      return;
    }

    // Cores vêm do tema escolhido, para a intro combinar com o app.
    const themeId = useSettings.getState().theme;
    const pv = (THEMES.find((t) => t.id === themeId) ?? THEMES[0]).preview;
    const cMain = new THREE.Color(pv.a);
    const cB = new THREE.Color(pv.b);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      doneRef.current(); // sem WebGL: não trava o app, só pula a introdução
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x030208, 1);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);

    // ----- campo de estrelas (a câmera atravessa ele durante a aproximação) -----
    const N = 2600;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 220;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 140;
      pos[i * 3 + 2] = -14 - Math.random() * 246; // sempre à frente da câmera: nenhuma estrela passa colada na lente
      tmp.setHSL(0.6 + Math.random() * 0.25, 0.5, 0.65 + Math.random() * 0.3);
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const dotTex = glowTexture("#ffffff");
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 1.7, map: dotTex, vertexColors: true, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    scene.add(stars);

    // ----- nebulosas suaves ao fundo -----
    const nebulae: THREE.Sprite[] = [];
    const nebColors = [pv.a, pv.c, pv.b, pv.a, pv.c];
    nebColors.forEach((hex, i) => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture(hex), transparent: true, opacity: 0.09,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      s.position.set((i - 2) * 26 + Math.random() * 10, (Math.random() - 0.5) * 30, -70 - i * 18);
      s.scale.setScalar(90 + Math.random() * 50);
      nebulae.push(s);
      scene.add(s);
    });

    // ----- a estrela -----
    const star = new THREE.Group();
    scene.add(star);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 64, 64),
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColor: { value: cMain } },
        vertexShader: /* glsl */ `
          varying vec3 vPos; varying vec3 vN;
          void main(){ vPos = position; vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform vec3 uColor; varying vec3 vPos; varying vec3 vN;
          ${NOISE}
          void main(){
            float n = noise(vPos*5.0 + uTime*0.35)*0.6 + noise(vPos*12.0 - uTime*0.25)*0.4;
            float rim = pow(1.0 - max(dot(normalize(vN), vec3(0.0,0.0,1.0)), 0.0), 2.2);
            vec3 c = mix(uColor, vec3(1.0), 0.2 + 0.5*n) * (0.8 + 1.0*n);
            c += uColor * rim * 1.5;
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    star.add(core);

    const spikeMaterial = (len: number, intensity: number) =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: cB }, uLen: { value: len }, uInt: { value: intensity } },
        vertexShader: /* glsl */ `
          uniform float uLen; varying float vA;
          void main(){ vA = (position.y + uLen*0.5)/uLen;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uInt; varying float vA;
          void main(){ float a = pow(1.0 - vA, 1.7) * uInt;
            vec3 c = mix(uColor, vec3(1.0), 0.65*(1.0 - vA));
            gl_FragColor = vec4(c * a, a); }`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
    const addSpike = (len: number, radius: number, intensity: number, angle: number) => {
      const pivot = new THREE.Object3D();
      const m = new THREE.Mesh(new THREE.ConeGeometry(radius, len, 20, 1, true), spikeMaterial(len, intensity));
      m.position.y = len / 2;
      pivot.add(m);
      pivot.rotation.z = angle;
      star.add(pivot);
    };
    for (let k = 0; k < 4; k++) addSpike(3.6, 0.075, 1.6, (k * Math.PI) / 2); // raios principais
    for (let k = 0; k < 4; k++) addSpike(1.7, 0.05, 0.9, Math.PI / 4 + (k * Math.PI) / 2); // raios diagonais

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture("#" + cMain.getHexString()), transparent: true, opacity: 0.45,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    halo.scale.setScalar(3.4);
    scene.add(halo);

    // ----- pós-processamento: brilho (bloom) -----
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.6, 0.35);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    let finished = false;
    let spin = 0;
    let last = performance.now();
    const t0 = last;
    const coreMat = core.material as THREE.ShaderMaterial;

    const loop = (now: number) => {
      const ms = now - t0;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (ms >= END_MS) {
        if (!finished) { finished = true; doneRef.current(); }
        return;
      }

      const t = clamp01(ms / APPROACH_MS);
      const p = 0.5 * t + 0.5 * t * t; // a estrela cresce de forma bem visível o tempo todo
      let z = lerp(14, 2.6, p);
      if (ms >= FLASH_START) z = lerp(2.6, 0.9, clamp01((ms - FLASH_START) / (FLASH_PEAK - FLASH_START))); // mergulho final
      if (ms > FLASH_PEAK) z = 0.9 - (ms - FLASH_PEAK) * 0.006; // segue atravessando o espaço
      camera.position.set(Math.sin(ms * 0.0006) * 0.35 * (1 - t), Math.cos(ms * 0.0005) * 0.2 * (1 - t), z);
      camera.lookAt(0, 0, 0);

      spin += dt * (1.1 + t * 5); // gira em torno do próprio eixo, cada vez mais rápido
      star.rotation.set(0.38, spin, 0.18);
      coreMat.uniforms.uTime.value = ms * 0.001;
      halo.position.set(0, 0, 0);
      const visible = ms < FLASH_PEAK;
      star.visible = visible;
      halo.visible = visible;
      stars.rotation.z = ms * 0.00003;
      bloom.strength = ms < FLASH_PEAK ? lerp(0.6, 1.5, p) : 0.8;

      // clarão
      let f = 0;
      if (ms >= FLASH_START && ms < FLASH_PEAK) f = (ms - FLASH_START) / (FLASH_PEAK - FLASH_START);
      else if (ms >= FLASH_PEAK && ms < FLASH_END) f = 1 - (ms - FLASH_PEAK) / (FLASH_END - FLASH_PEAK);
      flash.style.opacity = String(f);

      // O fundo da introdução é preto sólido desde o primeiro quadro (nada do app ou do tema aparece por trás).
      // A cena entra suavemente e, no fim, a introdução inteira some revelando o app.
      host.style.opacity = String(clamp01(ms / 500));
      root.style.opacity = String(clamp01((END_MS - ms) / (END_MS - TITLE_OUT)));

      // título
      const tin = clamp01((ms - (FLASH_PEAK + 100)) / 1100);
      const tout = clamp01((ms - TITLE_OUT) / (END_MS - TITLE_OUT));
      const eased = 1 - Math.pow(1 - tin, 3);
      title.style.opacity = String(eased * (1 - tout));
      title.style.letterSpacing = `${lerp(0.55, 0.16, eased)}em`;
      title.style.filter = `blur(${lerp(14, 0, eased)}px)`;
      line.style.transform = `scaleX(${eased})`;
      line.style.opacity = String(eased * (1 - tout));

      composer.render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") doneRef.current();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      dotTex.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="intro" ref={rootRef} role="presentation">
      <div className="intro-host" ref={hostRef} />
      <div className="intro-vignette" />
      <div ref={flashRef} className="intro-flash" />
      <div className="intro-center">
        <h1 ref={titleRef} className="intro-title">Aethel A.M.I.</h1>
        <div ref={lineRef} className="intro-line" />
      </div>
      <button type="button" className="intro-skip" onClick={onDone}>Pular introdução</button>
    </div>
  );
}
