import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import type { BodyShape } from '../core/listing';

/**
 * A procedural car, built from primitives and shaped by the listing's body type.
 *
 * No real 3D model exists for an arbitrary used-car listing, so this is an
 * honest representation rather than a scan of the actual vehicle — the screen
 * says so. Building it from boxes and cylinders keeps it a few kilobytes with
 * no asset loading, which matters when it is the first thing on the page.
 */

export interface BodyProportions {
  /** Overall length, width and height of the lower body. */
  length: number;
  width: number;
  height: number;
  /** Cabin size and where it sits along the body. */
  cabinLength: number;
  cabinHeight: number;
  cabinOffset: number;
  /** How far the roof tapers in at the top, which is what separates the shapes. */
  roofTaper: number;
  wheelRadius: number;
  groundClearance: number;
}

export const BODY_PROPORTIONS: Record<BodyShape, BodyProportions> = {
  sedan: {
    length: 4.2, width: 1.8, height: 0.72,
    cabinLength: 1.95, cabinHeight: 0.62, cabinOffset: -0.1,
    roofTaper: 0.72, wheelRadius: 0.36, groundClearance: 0.18,
  },
  suv: {
    length: 4.3, width: 1.95, height: 1.0,
    cabinLength: 2.35, cabinHeight: 0.82, cabinOffset: -0.05,
    roofTaper: 0.88, wheelRadius: 0.44, groundClearance: 0.34,
  },
  hatchback: {
    length: 3.7, width: 1.75, height: 0.72,
    cabinLength: 1.85, cabinHeight: 0.66, cabinOffset: -0.25,
    roofTaper: 0.78, wheelRadius: 0.34, groundClearance: 0.18,
  },
  mpv: {
    length: 4.4, width: 1.9, height: 0.92,
    cabinLength: 2.7, cabinHeight: 0.86, cabinOffset: -0.05,
    roofTaper: 0.9, wheelRadius: 0.38, groundClearance: 0.26,
  },
  wagon: {
    length: 4.4, width: 1.82, height: 0.74,
    cabinLength: 2.5, cabinHeight: 0.64, cabinOffset: -0.3,
    roofTaper: 0.8, wheelRadius: 0.36, groundClearance: 0.18,
  },
  coupe: {
    length: 4.1, width: 1.85, height: 0.64,
    cabinLength: 1.6, cabinHeight: 0.5, cabinOffset: -0.15,
    roofTaper: 0.6, wheelRadius: 0.37, groundClearance: 0.14,
  },
};

function Wheel({ position, radius }: { position: [number, number, number]; radius: number }) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, 0.26, 28]} />
        <meshStandardMaterial color="#12161d" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Rim, inset slightly so it catches the light against the tyre. */}
      <mesh position={[0, 0.135, 0]}>
        <cylinderGeometry args={[radius * 0.58, radius * 0.58, 0.02, 24]} />
        <meshStandardMaterial color="#b9c4d4" roughness={0.28} metalness={0.85} />
      </mesh>
    </group>
  );
}

export function Car({
  bodyShape,
  colour,
  spinning = true,
}: {
  bodyShape: BodyShape;
  colour: string;
  spinning?: boolean;
}) {
  const group = useRef<Group>(null);
  const p = useMemo(() => BODY_PROPORTIONS[bodyShape] ?? BODY_PROPORTIONS.sedan, [bodyShape]);

  useFrame((_state, delta) => {
    if (spinning && group.current) group.current.rotation.y += delta * 0.45;
  });

  const wheelY = p.wheelRadius;
  const bodyY = wheelY + p.groundClearance;
  const axleX = p.length / 2 - p.wheelRadius - 0.22;
  const wheelZ = p.width / 2 - 0.09;

  return (
    <group ref={group} position={[0, -0.55, 0]}>
      {/* Lower body */}
      <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[p.length, p.height, p.width]} />
        <meshStandardMaterial color={colour} roughness={0.32} metalness={0.55} />
      </mesh>

      {/* Cabin */}
      <mesh position={[p.cabinOffset, bodyY + p.height / 2 + p.cabinHeight / 2, 0]} castShadow>
        <boxGeometry args={[p.cabinLength, p.cabinHeight, p.width * 0.9]} />
        <meshStandardMaterial color={colour} roughness={0.32} metalness={0.55} />
      </mesh>

      {/* Glasshouse: a dark band standing slightly proud of the cabin, so it
          reads as glass from every angle without any z-fighting. */}
      <mesh position={[p.cabinOffset, bodyY + p.height / 2 + p.cabinHeight * 0.62, 0]}>
        <boxGeometry args={[p.cabinLength * 0.88, p.cabinHeight * 0.44, p.width * 0.93]} />
        <meshStandardMaterial color="#0d1622" roughness={0.1} metalness={0.4} />
      </mesh>

      {/* Roof, tapered in to separate a coupe from an MPV. */}
      <mesh
        position={[p.cabinOffset, bodyY + p.height / 2 + p.cabinHeight, 0]}
        castShadow
      >
        <boxGeometry args={[p.cabinLength * p.roofTaper, 0.08, p.width * 0.88 * p.roofTaper]} />
        <meshStandardMaterial color={colour} roughness={0.32} metalness={0.55} />
      </mesh>

      {/* Headlights and tail lights */}
      <mesh position={[p.length / 2 - 0.02, bodyY + 0.06, p.width * 0.28]}>
        <boxGeometry args={[0.06, 0.14, 0.42]} />
        <meshStandardMaterial color="#fdf6d8" emissive="#fdf6d8" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[p.length / 2 - 0.02, bodyY + 0.06, -p.width * 0.28]}>
        <boxGeometry args={[0.06, 0.14, 0.42]} />
        <meshStandardMaterial color="#fdf6d8" emissive="#fdf6d8" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[-p.length / 2 + 0.02, bodyY + 0.08, p.width * 0.3]}>
        <boxGeometry args={[0.05, 0.11, 0.34]} />
        <meshStandardMaterial color="#e0483c" emissive="#e0483c" emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[-p.length / 2 + 0.02, bodyY + 0.08, -p.width * 0.3]}>
        <boxGeometry args={[0.05, 0.11, 0.34]} />
        <meshStandardMaterial color="#e0483c" emissive="#e0483c" emissiveIntensity={0.55} />
      </mesh>

      <Wheel position={[axleX, wheelY, wheelZ]} radius={p.wheelRadius} />
      <Wheel position={[axleX, wheelY, -wheelZ]} radius={p.wheelRadius} />
      <Wheel position={[-axleX, wheelY, wheelZ]} radius={p.wheelRadius} />
      <Wheel position={[-axleX, wheelY, -wheelZ]} radius={p.wheelRadius} />
    </group>
  );
}

/** Lighting and ground, shared by the web and native canvases. */
export function CarSceneContents({
  bodyShape,
  colour,
  spinning,
}: {
  bodyShape: BodyShape;
  colour: string;
  spinning?: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 4]} intensity={1.5} castShadow />
      <directionalLight position={[-6, 4, -5]} intensity={0.5} color="#7fb2ff" />
      <Car bodyShape={bodyShape} colour={colour} spinning={spinning} />
      {/* A soft disc under the car reads as a shadow without needing a shadow map. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.56, 0]}>
        <circleGeometry args={[2.6, 48]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>
    </>
  );
}
