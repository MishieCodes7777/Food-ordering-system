import { useEffect, useRef } from "react";
import * as THREE from "three";

const AuroraBackground = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 3;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100vw";
        renderer.domElement.style.height = "100vh";
        container.appendChild(renderer.domElement);

        // Shader material for aurora effect
        const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

        const fragmentShader = `
      uniform float uTime;
      uniform vec2 uResolution;
      varying vec2 vUv;

      // Simplex noise function
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = vUv;
        
        // Dark base
        vec3 color = vec3(0.02, 0.02, 0.04);
        
        // Green aurora (top-left)
        float noise1 = snoise(vec2(uv.x * 2.0 + uTime * 0.15, uv.y * 1.5 + uTime * 0.1));
        float noise2 = snoise(vec2(uv.x * 3.0 - uTime * 0.1, uv.y * 2.0 + uTime * 0.12));
        
        // Green glow
        float green = smoothstep(0.3, 0.8, noise1 * 0.5 + 0.5);
        green *= smoothstep(0.0, 0.6, 1.0 - length(uv - vec2(0.2, 0.7)));
        color += vec3(0.05, 0.4, 0.2) * green * 0.8;
        
        // Teal accent
        float teal = smoothstep(0.4, 0.9, noise2 * 0.5 + 0.5);
        teal *= smoothstep(0.0, 0.5, 1.0 - length(uv - vec2(0.3, 0.5)));
        color += vec3(0.0, 0.3, 0.25) * teal * 0.6;
        
        // Purple/blue glow (bottom-right)
        float noise3 = snoise(vec2(uv.x * 2.5 + uTime * 0.08, uv.y * 2.0 - uTime * 0.15));
        float purple = smoothstep(0.3, 0.8, noise3 * 0.5 + 0.5);
        purple *= smoothstep(0.0, 0.6, 1.0 - length(uv - vec2(0.8, 0.3)));
        color += vec3(0.3, 0.1, 0.5) * purple * 0.7;
        
        // Subtle blue
        float noise4 = snoise(vec2(uv.x * 1.5 - uTime * 0.12, uv.y * 3.0 + uTime * 0.08));
        float blue = smoothstep(0.5, 0.9, noise4 * 0.5 + 0.5);
        blue *= smoothstep(0.0, 0.5, 1.0 - length(uv - vec2(0.7, 0.2)));
        color += vec3(0.1, 0.15, 0.4) * blue * 0.5;

        // Vignette
        float vignette = 1.0 - length((uv - 0.5) * 1.2);
        color *= smoothstep(0.0, 0.7, vignette);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

        const uniforms = {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        };

        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms,
        });

        const geometry = new THREE.PlaneGeometry(5, 5);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Animation loop
        let animationId;
        const clock = new THREE.Clock();

        const animate = () => {
            animationId = requestAnimationFrame(animate);
            uniforms.uTime.value = clock.getElapsedTime();
            renderer.render(scene, camera);
        };

        animate();

        // Handle resize
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            uniforms.uResolution.value.set(width, height);
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationId);
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="fixed top-0 left-0 w-screen h-screen -z-10"
            style={{ background: "#0a0a0f", margin: 0, padding: 0 }}
        />
    );
};

export default AuroraBackground;
