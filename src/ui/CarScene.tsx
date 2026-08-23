import { useEffect, useMemo, useRef } from 'react';
import {
  DataTexture,
  DoubleSide,
  EquirectangularReflectionMapping,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  LinearFilter,
  PMREMGenerator,
  RGBAFormat,
  Shape,
  SRGBColorSpace,
  type Texture,
  Vector2,
  type WebGLRenderTarget,
} from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { BodyShape } from '../core/listing';
import {
  CAR_DIMENSIONS,
  bodyOutline,
  glassOutline,
  greenhouseOutline,
  tyreProfile,
  wheelPlacements,
  type Vec2,
} from './carProfile';

/**
 * A procedural car.
 *
 * Built by extruding the side profile from carProfile.ts rather than stacking
 * boxes — the silhouette, the bevelled edges and the reflections off the
 * clearcoat are what separate a car from a pile of blocks. No real 3D model
 * exists for an arbitrary used-car listing, so this is an honest representation
 * and the screen says so.
 */

/** Turns a 2D outline into a bevelled solid of the given width. */
function extrude(points: Vec2[], width: number, bevel: number): ExtrudeGeometry {
  const shape = new Shape();
  points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();

  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(0.05, width - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
    bevelSegments: 3,
    curveSegments: 4,
  });

  // Extrusion runs along +z from the profile plane; centre it on the car's axis.
  geometry.translate(0, 0, -width / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function Wheel({ x, radius, width }: { x: number; radius: number; width: number }) {
  const tyre = useMemo(
    () => new LatheGeometry(tyreProfile(radius).map(([r, y]) => new Vector2(r, y)), 36),
    [radius],
  );
  const rim = radius * 0.62;

  return (
    <group position={[x, radius, width]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={tyre} castShadow>
        <meshStandardMaterial color="#141820" roughness={0.85} metalness={0.05} side={DoubleSide} />
      </mesh>

      {/* Rim face, set slightly outboard of the tyre's inner edge. */}
      <mesh position={[0, 0.055, 0]}>
        <cylinderGeometry args={[rim, rim, 0.03, 28]} />
        <meshStandardMaterial color="#8f9bad" roughness={0.28} metalness={0.95} />
      </mesh>

      {/* Spokes: what stops the wheel reading as a plain disc. */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh
          key={i}
          position={[0, 0.072, 0]}
          rotation={[0, 0, (i / 5) * Math.PI * 2]}
        >
          <boxGeometry args={[rim * 1.5, 0.012, rim * 0.24]} />
          <meshStandardMaterial color="#c3ccda" roughness={0.22} metalness={1} />
        </mesh>
      ))}

      <mesh position={[0, 0.086, 0]}>
        <cylinderGeometry args={[rim * 0.3, rim * 0.3, 0.02, 20]} />
        <meshStandardMaterial color="#5a6472" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Brake disc, glimpsed behind the spokes. */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[rim * 0.78, rim * 0.78, 0.015, 24]} />
        <meshStandardMaterial color="#3a4049" roughness={0.55} metalness={0.7} />
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
  const d = CAR_DIMENSIONS[bodyShape] ?? CAR_DIMENSIONS.sedan;

  const geometry = useMemo(() => {
    const cabinWidth = d.width * d.tumblehome;
    return {
      body: extrude(bodyOutline(bodyShape), d.width, 0.05),
      cabin: extrude(greenhouseOutline(bodyShape), cabinWidth, 0.04),
      // A shade wider than the cabin so the glass reads as glass from the side.
      glass: extrude(glassOutline(bodyShape), cabinWidth + 0.03, 0.012),
    };
  }, [bodyShape, d.width, d.tumblehome]);

  useEffect(
    () => () => {
      geometry.body.dispose();
      geometry.cabin.dispose();
      geometry.glass.dispose();
    },
    [geometry],
  );

  useFrame((_state, delta) => {
    if (spinning && group.current) group.current.rotation.y += delta * 0.42;
  });

  const wheelInset = d.width / 2 - 0.1;
  const lampY = d.bonnetY - 0.18;

  return (
    <group ref={group} position={[0, -d.roofY / 2, 0]}>
      <mesh geometry={geometry.body} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={colour}
          roughness={0.28}
          metalness={0.65}
          clearcoat={1}
          clearcoatRoughness={0.06}
          envMapIntensity={1.15}
        />
      </mesh>

      <mesh geometry={geometry.cabin} castShadow>
        <meshPhysicalMaterial
          color={colour}
          roughness={0.28}
          metalness={0.65}
          clearcoat={1}
          clearcoatRoughness={0.06}
          envMapIntensity={1.15}
        />
      </mesh>

      <mesh geometry={geometry.glass}>
        <meshPhysicalMaterial
          color="#0b1220"
          roughness={0.05}
          metalness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.02}
          envMapIntensity={2.2}
        />
      </mesh>

      {/* Lights. Small, but they tell you which end is the front. */}
      {[1, -1].map((side) => (
        <mesh key={`head-${side}`} position={[d.length / 2 - 0.06, lampY, side * (d.width * 0.3)]}>
          <boxGeometry args={[0.1, 0.13, 0.34]} />
          <meshStandardMaterial color="#f4f7ff" emissive="#dce8ff" emissiveIntensity={0.9} roughness={0.1} />
        </mesh>
      ))}
      {[1, -1].map((side) => (
        <mesh
          key={`tail-${side}`}
          position={[-d.length / 2 + 0.05, d.beltlineY - 0.22, side * (d.width * 0.32)]}
        >
          <boxGeometry args={[0.08, 0.11, 0.3]} />
          <meshStandardMaterial color="#d9382c" emissive="#ff4436" emissiveIntensity={0.75} roughness={0.2} />
        </mesh>
      ))}

      {wheelPlacements(bodyShape).map((wheel) => (
        <group key={wheel.x}>
          <Wheel x={wheel.x} radius={wheel.radius} width={wheelInset} />
          <Wheel x={wheel.x} radius={wheel.radius} width={-wheelInset} />
        </group>
      ))}
    </group>
  );
}

/**
 * A small studio environment, generated rather than loaded.
 *
 * Car paint is almost entirely reflection: without an environment to reflect,
 * a clearcoat material just looks like flat plastic. This builds a gradient sky
 * with a bright overhead strip — the same trick a photographer uses — and costs
 * a 64x32 texture rather than a downloaded HDRI.
 */
function useStudioEnvironment(): Texture | null {
  const { gl } = useThree();

  const generated = useMemo(() => {
    const width = 64;
    const height = 32;
    const data = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y += 1) {
      const v = y / (height - 1);
      // Bright sky overhead falling to a dim floor, plus a soft strip light.
      const sky = Math.pow(1 - v, 1.4);
      const strip = Math.exp(-Math.pow((v - 0.17) / 0.07, 2)) * 0.85;
      const floor = v > 0.55 ? 0.06 : 0;
      const level = Math.min(1, sky * 0.55 + strip + floor);

      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        data[i] = Math.round(255 * level * 0.94);
        data[i + 1] = Math.round(255 * level * 0.97);
        data[i + 2] = Math.round(255 * level);
        data[i + 3] = 255;
      }
    }

    const equirect = new DataTexture(data, width, height, RGBAFormat);
    equirect.mapping = EquirectangularReflectionMapping;
    equirect.colorSpace = SRGBColorSpace;
    equirect.minFilter = LinearFilter;
    equirect.magFilter = LinearFilter;
    equirect.needsUpdate = true;

    let pmrem: PMREMGenerator | null = null;
    let target: WebGLRenderTarget | null = null;
    try {
      pmrem = new PMREMGenerator(gl);
      pmrem.compileEquirectangularShader();
      target = pmrem.fromEquirectangular(equirect);
    } catch {
      // Some GL implementations cannot build a PMREM. The lights alone still
      // render a perfectly reasonable car, so carry on without reflections.
      target = null;
    } finally {
      pmrem?.dispose();
      equirect.dispose();
    }

    return target;
  }, [gl]);

  useEffect(() => () => generated?.dispose(), [generated]);

  return generated?.texture ?? null;
}

/** A soft blob of shadow, so the car does not appear to float. */
function ContactShadow({ radius }: { radius: number }) {
  const texture = useMemo(() => {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = (x / (size - 1)) * 2 - 1;
        const dy = (y / (size - 1)) * 2 - 1;
        // Elliptical: a car's shadow is longer than it is wide.
        const dist = Math.hypot(dx, dy * 1.9);
        const alpha = Math.max(0, 1 - dist) ** 2.1;
        const i = (y * size + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
        data[i + 3] = Math.round(alpha * 190);
      }
    }
    const map = new DataTexture(data, size, size, RGBAFormat);
    map.minFilter = LinearFilter;
    map.magFilter = LinearFilter;
    map.needsUpdate = true;
    return map;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
      <planeGeometry args={[radius * 2.4, radius * 2.4]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

/** Lighting, environment and ground, shared by the web and native canvases. */
export function CarSceneContents({
  bodyShape,
  colour,
  spinning,
}: {
  bodyShape: BodyShape;
  colour: string;
  spinning?: boolean;
}) {
  const environment = useStudioEnvironment();
  const d = CAR_DIMENSIONS[bodyShape] ?? CAR_DIMENSIONS.sedan;

  return (
    <>
      {/* Attached declaratively rather than assigned onto the scene. */}
      {environment ? <primitive object={environment} attach="environment" /> : null}

      <ambientLight intensity={0.35} />
      {/* Key, rim and fill — the rim light is what draws the roofline. */}
      <directionalLight position={[4, 7, 5]} intensity={2.1} />
      <directionalLight position={[-5, 3.5, -4]} intensity={1.1} color="#8fc2ff" />
      <directionalLight position={[0, 2, -7]} intensity={0.7} color="#ffe6c2" />

      <group position={[0, -d.roofY / 2 + 0.02, 0]}>
        <ContactShadow radius={d.length / 2} />
      </group>

      <Car bodyShape={bodyShape} colour={colour} spinning={spinning} />
    </>
  );
}
