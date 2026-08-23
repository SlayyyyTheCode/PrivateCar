import { Canvas } from '@react-three/fiber';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { BodyShape } from '../core/listing';
import { CarSceneContents } from './CarScene';

/**
 * Web canvas. The native build resolves CarModel3D.native.tsx instead, which is
 * the same scene mounted through expo-gl.
 */
export function CarModel3D({
  bodyShape = 'sedan',
  colour = '#3d7fd1',
  spinning = true,
  style,
}: {
  bodyShape?: BodyShape;
  colour?: string;
  spinning?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style} pointerEvents="none">
      <Canvas camera={{ position: [5.2, 2.4, 5.6], fov: 34 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <CarSceneContents bodyShape={bodyShape} colour={colour} spinning={spinning} />
      </Canvas>
    </View>
  );
}

export default CarModel3D;
