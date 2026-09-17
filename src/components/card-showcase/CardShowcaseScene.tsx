import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useTexture } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CardDesign } from "@/types/cardShowcase";

const WIDTH = 3.154;
const HEIGHT = 5;
const DEPTH = 0.0444;
const RADIUS = 0.186;

const blankBack = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="638" height="1007"><rect width="100%" height="100%" fill="white"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" fill="#777">BLANK WHITE BACK</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
})();

const roundedShape = () => {
  const x = -WIDTH / 2;
  const y = -HEIGHT / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + RADIUS, y);
  shape.lineTo(x + WIDTH - RADIUS, y);
  shape.quadraticCurveTo(x + WIDTH, y, x + WIDTH, y + RADIUS);
  shape.lineTo(x + WIDTH, y + HEIGHT - RADIUS);
  shape.quadraticCurveTo(x + WIDTH, y + HEIGHT, x + WIDTH - RADIUS, y + HEIGHT);
  shape.lineTo(x + RADIUS, y + HEIGHT);
  shape.quadraticCurveTo(x, y + HEIGHT, x, y + HEIGHT - RADIUS);
  shape.lineTo(x, y + RADIUS);
  shape.quadraticCurveTo(x, y, x + RADIUS, y);
  return shape;
};

const makeFaceGeometry = () => {
  const geometry = new THREE.ShapeGeometry(roundedShape(), 32);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, (position.getX(i) + WIDTH / 2) / WIDTH, (position.getY(i) + HEIGHT / 2) / HEIGHT);
  }
  uv.needsUpdate = true;
  return geometry;
};

interface CardMeshProps {
  design: CardDesign;
  paused: boolean;
  visible: boolean;
  onReady: () => void;
  onCycle: () => void;
}

function CardMesh({ design, paused, visible, onReady, onCycle }: CardMeshProps) {
  const group = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const designRef = useRef(design);
  const cycleSent = useRef(false);
  const readyFrames = useRef(0);
  const maps = useTexture([design.frontImageUrl, design.backImageUrl ?? blankBack]);
  const faceGeometry = useMemo(makeFaceGeometry, []);
  const edgeGeometry = useMemo(() => new THREE.ExtrudeGeometry(roundedShape(), {
    depth: DEPTH,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.008,
    curveSegments: 32,
  }).translate(0, 0, -DEPTH / 2), []);

  useLayoutEffect(() => {
    maps.forEach((map) => {
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
      map.anisotropy = 4;
      map.needsUpdate = true;
    });
    readyFrames.current = 0;
    if (designRef.current.id !== design.id) {
      elapsed.current = 6.232;
      designRef.current = design;
    }
  }, [maps, design.id]);

  useFrame((_, rawDelta) => {
    if (!group.current || !visible) return;
    if (readyFrames.current < 2) {
      readyFrames.current += 1;
      if (readyFrames.current === 2) onReady();
    }
    if (paused) return;
    elapsed.current += Math.min(rawDelta, 0.05);
    const cycle = elapsed.current % 8;
    const progress = cycle < 3 ? 0 : (cycle - 3) / 5;
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    group.current.rotation.y = eased * Math.PI * 2;
    if (progress >= 0.64 && !cycleSent.current && Math.abs(Math.cos(group.current.rotation.y)) < 0.08) {
      cycleSent.current = true;
      onCycle();
    }
    if (cycle < 0.2) cycleSent.current = false;
  });

  return (
    <group ref={group} rotation={[THREE.MathUtils.degToRad(-4), 0, THREE.MathUtils.degToRad(-2)]}>
      <mesh geometry={edgeGeometry} castShadow>
        <meshPhysicalMaterial color="white" metalness={0} roughness={0.52} clearcoat={0.16} clearcoatRoughness={0.5} />
      </mesh>
      <mesh geometry={faceGeometry} position={[0, 0, DEPTH / 2 + 0.016]} castShadow>
        <meshPhysicalMaterial map={maps[0]} metalness={0} roughness={0.6} clearcoat={0.12} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh geometry={faceGeometry} position={[0, 0, -DEPTH / 2 - 0.016]} rotation={[0, Math.PI, 0]} castShadow>
        <meshPhysicalMaterial map={maps[1]} metalness={0} roughness={0.6} clearcoat={0.12} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
    </group>
  );
}

interface CardShowcaseSceneProps extends CardMeshProps {
  mobile: boolean;
}

export default function CardShowcaseScene(props: CardShowcaseSceneProps) {
  return (
    <Canvas
      shadows
      dpr={props.mobile ? 1 : [1, 1.5]}
      camera={{ position: [0, 0.15, 7.35], fov: 35, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={props.visible ? "always" : "never"}
      aria-label={`3D printed card for ${props.design.businessName}`}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 6, 6]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <Suspense fallback={null}>
        <CardMesh {...props} />
        <Environment resolution={128}>
          <Lightformer intensity={2.4} position={[0, 5, 4]} scale={[8, 3, 1]} />
          <Lightformer intensity={1.2} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        </Environment>
        <ContactShadows position={[0, -2.75, 0]} opacity={0.2} scale={7} blur={2.8} far={4} />
      </Suspense>
    </Canvas>
  );
}
