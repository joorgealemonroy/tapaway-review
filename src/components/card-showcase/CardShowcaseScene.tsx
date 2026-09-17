import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CardDesign } from "@/types/cardShowcase";

export const CARD_WIDTH = 5.398;
export const CARD_HEIGHT = 8.56;
export const CARD_DEPTH = 0.076;
export const CARD_RADIUS = 0.318;
export const CARD_BEVEL = 0.008;

const HALF_DEPTH = CARD_DEPTH / 2;
const START_YAW = THREE.MathUtils.degToRad(15);
const FRONT_HOLD_DURATION = 3;
const ROTATION_DURATION = 5;
const CYCLE_DURATION = FRONT_HOLD_DURATION + ROTATION_DURATION;
const blankBack = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1713"><rect width="100%" height="100%" fill="white"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" fill="#777">BLANK WHITE BACK</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
})();

const roundedShape = (inset = 0) => {
  const width = CARD_WIDTH - inset * 2;
  const height = CARD_HEIGHT - inset * 2;
  const radius = CARD_RADIUS - inset;
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.absarc(x + width - radius, y + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(x + width, y + height - radius);
  shape.absarc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(x + radius, y + height);
  shape.absarc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + radius);
  shape.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false);
  return shape;
};

const makeFaceGeometry = (flipU: boolean) => {
  const geometry = new THREE.ShapeGeometry(roundedShape(), 48);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let index = 0; index < uv.count; index += 1) {
    const u = (position.getX(index) + CARD_WIDTH / 2) / CARD_WIDTH;
    uv.setXY(index, flipU ? 1 - u : u, (position.getY(index) + CARD_HEIGHT / 2) / CARD_HEIGHT);
  }
  uv.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
};

const makeEdgeGeometry = () => {
  const outer = roundedShape().getSpacedPoints(192);
  const inner = roundedShape(CARD_BEVEL).getSpacedPoints(192);
  const vertices: number[] = [];
  const indices: number[] = [];
  const rings = [
    { points: outer, z: HALF_DEPTH - CARD_BEVEL },
    { points: inner, z: HALF_DEPTH },
    { points: inner, z: -HALF_DEPTH },
    { points: outer, z: -HALF_DEPTH + CARD_BEVEL },
  ];
  rings.forEach(({ points, z }) => points.forEach((point) => vertices.push(point.x, point.y, z)));
  const ringSize = outer.length;
  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let index = 0; index < ringSize; index += 1) {
      const next = (index + 1) % ringSize;
      const a = ring * ringSize + index;
      const b = ring * ringSize + next;
      const c = (ring + 1) * ringSize + next;
      const d = (ring + 1) * ringSize + index;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
};

const makeContainedTexture = (source: THREE.Texture, anisotropy: number) => {
  const image = source.image as CanvasImageSource & { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number };
  const sourceWidth = image.naturalWidth ?? image.width ?? 1;
  const sourceHeight = image.naturalHeight ?? image.height ?? 1;
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = Math.round(canvas.width * CARD_HEIGHT / CARD_WIDTH);
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.drawImage(image, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
};

interface CardMeshProps {
  design: CardDesign;
  paused: boolean;
  visible: boolean;
  interactive?: boolean;
  onReady: () => void;
  onCycle: () => void;
  onPoster?: (poster: string) => void;
}

function CardMesh({ design, paused, visible, interactive = true, onReady, onCycle, onPoster }: CardMeshProps) {
  const yawGroup = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const cycleSent = useRef(false);
  const readyFrames = useRef(0);
  const dragging = useRef(false);
  const dragMoved = useRef(false);
  const pointerStart = useRef({ x: 0, y: 0, yaw: START_YAW });
  const manualYaw = useRef(START_YAW);
  const { gl, scene, camera } = useThree();
  const sourceMaps = useTexture([design.frontImageUrl, design.backImageUrl ?? blankBack]);
  const maxAnisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  const maps = useMemo(
    () => sourceMaps.map((texture) => makeContainedTexture(texture, maxAnisotropy)),
    [maxAnisotropy, sourceMaps],
  );
  const frontGeometry = useMemo(() => makeFaceGeometry(false), []);
  const backGeometry = useMemo(() => makeFaceGeometry(false), []);
  const edgeGeometry = useMemo(makeEdgeGeometry, []);

  useEffect(() => () => {
    maps.forEach((map, index) => { if (map !== sourceMaps[index]) map.dispose(); });
    frontGeometry.dispose();
    backGeometry.dispose();
    edgeGeometry.dispose();
  }, [backGeometry, edgeGeometry, frontGeometry, maps, sourceMaps]);

  useLayoutEffect(() => {
    readyFrames.current = 0;
  }, [design.id, maps]);

  useFrame(() => {
    if (!yawGroup.current || !visible) return;
    if (readyFrames.current < 2) {
      readyFrames.current += 1;
      if (readyFrames.current === 2) {
        gl.render(scene, camera);
        onReady();
        if (onPoster) {
          try { onPoster(gl.domElement.toDataURL("image/png")); } catch { /* poster capture is optional */ }
        }
      }
    }
  });

  useFrame((_, rawDelta) => {
    if (!yawGroup.current || !visible || paused || dragging.current) return;
    elapsed.current += Math.min(rawDelta, 0.05);
    const cycle = elapsed.current % CYCLE_DURATION;
    const progress = cycle <= FRONT_HOLD_DURATION ? 0 : (cycle - FRONT_HOLD_DURATION) / ROTATION_DURATION;
    const yaw = START_YAW + progress * Math.PI * 2;
    yawGroup.current.rotation.y = yaw;
    manualYaw.current = yaw;
    const cameraRelativeEdge = Math.abs(Math.cos(yaw)) < 0.045;
    if (progress > 0.68 && cameraRelativeEdge && !cycleSent.current) {
      cycleSent.current = true;
      onCycle();
    }
    if (cycle < 0.3) cycleSent.current = false;
  });

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    pointerStart.current = { x: event.clientX, y: event.clientY, yaw: manualYaw.current };
    dragMoved.current = false;
    dragging.current = true;
    const target = event.target as Element;
    target.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive || !dragging.current || !yawGroup.current) return;
    const dx = event.clientX - pointerStart.current.x;
    const dy = event.clientY - pointerStart.current.y;
    if (!dragMoved.current && Math.abs(dx) < 5) return;
    if (!dragMoved.current && Math.abs(dy) > Math.abs(dx)) return;
    dragMoved.current = true;
    manualYaw.current = pointerStart.current.yaw + dx * 0.012;
    yawGroup.current.rotation.y = manualYaw.current;
  };
  const onPointerUp = (event: ThreeEvent<PointerEvent>) => {
    const normalizedYaw = THREE.MathUtils.euclideanModulo(manualYaw.current - START_YAW, Math.PI * 2);
    elapsed.current = FRONT_HOLD_DURATION + normalizedYaw / (Math.PI * 2) * ROTATION_DURATION;
    dragging.current = false;
    const target = event.target as Element;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  };

  return (
    <group position={[0, -0.54, 0]} rotation={[THREE.MathUtils.degToRad(-3), 0, THREE.MathUtils.degToRad(-1.5)]}>
      <group ref={yawGroup} rotation={[0, START_YAW, 0]}>
        <mesh geometry={edgeGeometry} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <meshPhysicalMaterial color="#ffffff" metalness={0} roughness={0.48} clearcoat={0.22} clearcoatRoughness={0.34} ior={1.46} transmission={0} opacity={1} />
        </mesh>
        <mesh geometry={frontGeometry} position={[0, 0, HALF_DEPTH]} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <meshPhysicalMaterial map={maps[0]} color="#ffffff" metalness={0} roughness={0.38} clearcoat={0.26} clearcoatRoughness={0.3} ior={1.46} transmission={0} opacity={1} emissive="#000000" side={THREE.FrontSide} />
        </mesh>
        <mesh geometry={backGeometry} position={[0, 0, -HALF_DEPTH]} rotation={[0, Math.PI, 0]} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <meshPhysicalMaterial map={maps[1]} color="#ffffff" metalness={0} roughness={0.38} clearcoat={0.26} clearcoatRoughness={0.3} ior={1.46} transmission={0} opacity={1} emissive="#000000" side={THREE.FrontSide} />
        </mesh>
      </group>
    </group>
  );
}

export interface CardShowcaseSceneProps extends CardMeshProps {
  mobile: boolean;
}

export default function CardShowcaseScene(props: CardShowcaseSceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 22.5], fov: 28, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={props.visible ? "always" : "never"}
      aria-label={`3D printed card for ${props.design.businessName}`}
      style={{ background: "transparent", touchAction: "pan-y" }}
    >
      <ambientLight intensity={0.42} />
      <directionalLight position={[-7, 10, 12]} intensity={1.35} />
      <directionalLight position={[8, 3, 10]} intensity={0.42} />
      <directionalLight position={[2, 4, -8]} intensity={0.3} />
      <Suspense fallback={null}>
        <CardMesh {...props} />
        <Environment resolution={128} background={false}>
          <Lightformer color="#ffffff" intensity={2.25} position={[-5, 7, 8]} rotation-x={-0.35} scale={[9, 5, 1]} />
          <Lightformer color="#f7f7f5" intensity={1.1} position={[7, 2, 8]} rotation-y={-0.45} scale={[7, 4, 1]} />
          <Lightformer color="#ffffff" intensity={0.55} position={[1, 5, -7]} rotation-y={Math.PI} scale={[5, 3, 1]} />
        </Environment>
        <mesh position={[0, -4.66, -0.35]} rotation-x={-Math.PI / 2} scale={[3.4, 0.46, 1]}>
          <circleGeometry args={[1, 64]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.1} depthWrite={false} />
        </mesh>
      </Suspense>
    </Canvas>
  );
}