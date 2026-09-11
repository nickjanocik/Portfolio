import { useEffect, useRef } from "react";
import { useMotionSettings } from "@/components/motion-settings";

interface FloatingParticlesProps {
  particleCount?: number;
  particleColor1?: string;
  particleColor2?: string;
  className?: string;
}

// Adapted from the supplied floating particles: one bounded point cloud,
// time-based movement and color, and no per-frame React or physics allocations.
export function FloatingParticles({
  particleCount = 3200,
  particleColor1 = "#d7e68c",
  particleColor2 = "#80c5ce",
  className = "",
}: FloatingParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { enabled } = useMotionSettings();
  const enabledRef = useRef(enabled);
  const syncRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    enabledRef.current = enabled;
    syncRef.current?.();
  }, [enabled]);
  useEffect(() => {
    const container = containerRef.current!;
    let disposed = false,
      cleanup = () => {};
    void import("three")
      .then((THREE) => {
        if (disposed) return;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("webgl2", {
          alpha: true,
          antialias: false,
          powerPreference: "low-power",
        });
        if (!context) {
          container.dataset.render = "fallback";
          return;
        }
        let renderer: InstanceType<typeof THREE.WebGLRenderer>;
        try {
          renderer = new THREE.WebGLRenderer({
            canvas,
            context,
            alpha: true,
            antialias: false,
          });
        } catch {
          container.dataset.render = "fallback";
          context.getExtension("WEBGL_lose_context")?.loseContext();
          return;
        }
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 1, 2500);
        camera.position.set(0, 0, 940);
        const count = Math.max(
          200,
          Math.min(
            Math.floor(particleCount),
            container.clientWidth < 700 ? 1600 : 4800,
          ),
        );
        const positions = new Float32Array(count * 3),
          phases = new Float32Array(count),
          sizes = new Float32Array(count);
        let seed = 941;
        const random = () => {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        for (let i = 0; i < count; i++) {
          const angle = random() * Math.PI * 2;
          const radius = 90 + Math.pow(random(), 0.62) * 380;
          const spiral = angle + radius * 0.006;
          positions[i * 3] = Math.cos(spiral) * radius * 1.18;
          positions[i * 3 + 1] = Math.sin(spiral) * radius * 0.62 + 95;
          positions[i * 3 + 2] = (random() - 0.5) * 260;
          phases[i] = random() * Math.PI * 2;
          sizes[i] = 1.1 + random() * 2.5;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3),
        );
        geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
        geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
        const uniforms = {
          uTime: { value: 0 },
          uRatio: { value: 1 },
          uColorA: { value: new THREE.Color(particleColor1) },
          uColorB: { value: new THREE.Color(particleColor2) },
          uColorC: { value: new THREE.Color("#bfa4e5") },
        };
        const material = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms,
          vertexShader: `attribute float aPhase; attribute float aSize; uniform float uTime; uniform float uRatio; varying float vPhase; varying float vDepth;
        void main(){vPhase=aPhase; vec3 p=position; float angle=uTime*.035; mat2 spin=mat2(cos(angle),-sin(angle),sin(angle),cos(angle)); p.xy=spin*p.xy; p.y+=sin(uTime*.25+aPhase)*17.; p.z+=cos(uTime*.2+aPhase)*25.; vec4 mv=modelViewMatrix*vec4(p,1.); vDepth=clamp((p.z+200.)/400.,0.,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(aSize*uRatio*(850./-mv.z),1.,7.);}`,
          fragmentShader: `uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uColorC; varying float vPhase; varying float vDepth;
        void main(){float radius=length(gl_PointCoord-.5); if(radius>.5)discard; float blend=.5+.5*sin(uTime*.12+vPhase); vec3 color=mix(uColorA,uColorB,blend); color=mix(color,uColorC,.3+.3*sin(uTime*.08+vPhase*1.7)); float alpha=smoothstep(.5,.05,radius)*(.35+vDepth*.45); gl_FragColor=vec4(color,alpha);}`,
        });
        const cloud = new THREE.Points(geometry, material);
        cloud.frustumCulled = false;
        scene.add(cloud);
        renderer.setClearColor(0, 0);
        container.appendChild(canvas);
        container.dataset.render = "webgl";
        let raf = 0,
          last = 0,
          time = 0,
          visible = false,
          contextLost = false;
        const render = () => renderer.render(scene, camera);
        const resize = () => {
          const { width, height } = container.getBoundingClientRect();
          if (contextLost || width < 1 || height < 1) return;
          const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
          renderer.setPixelRatio(ratio);
          renderer.setSize(width, height);
          uniforms.uRatio.value = ratio;
          camera.aspect = width / height;
          camera.position.z = width < 650 ? 1250 : 940;
          camera.updateProjectionMatrix();
          render();
        };
        const frame = (now: number) => {
          raf = 0;
          if (
            contextLost ||
            !visible ||
            !enabledRef.current ||
            document.hidden
          ) {
            last = 0;
            return;
          }
          const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
          last = now;
          time += dt;
          uniforms.uTime.value = time;
          render();
          raf = requestAnimationFrame(frame);
        };
        const sync = () => {
          if (
            !contextLost &&
            visible &&
            enabledRef.current &&
            !document.hidden &&
            !raf
          )
            raf = requestAnimationFrame(frame);
          else if (
            (contextLost ||
              !visible ||
              !enabledRef.current ||
              document.hidden) &&
            raf
          ) {
            cancelAnimationFrame(raf);
            raf = 0;
            last = 0;
          }
        };
        syncRef.current = sync;
        const size = new ResizeObserver(resize);
        size.observe(container);
        const observer = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          sync();
        });
        observer.observe(container);
        const lost = (event: Event) => {
          event.preventDefault();
          contextLost = true;
          cancelAnimationFrame(raf);
          raf = 0;
          visible = false;
          container.dataset.render = "fallback";
          canvas.style.opacity = "0";
        };
        canvas.addEventListener("webglcontextlost", lost);
        document.addEventListener("visibilitychange", sync);
        cleanup = () => {
          syncRef.current = null;
          cancelAnimationFrame(raf);
          size.disconnect();
          observer.disconnect();
          document.removeEventListener("visibilitychange", sync);
          canvas.removeEventListener("webglcontextlost", lost);
          geometry.dispose();
          material.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          canvas.remove();
        };
        resize();
        if (disposed) cleanup();
      })
      .catch(() => {
        cleanup();
        if (!disposed) container.dataset.render = "fallback";
      });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [particleCount, particleColor1, particleColor2]);
  return (
    <div
      ref={containerRef}
      className={`floating-particles ${className}`}
      aria-hidden="true"
    />
  );
}
