import { Canvas } from '@react-three/fiber/native';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { BodyShape } from '../core/listing';
import { CarSceneContents } from './CarScene';

/**
 * Native canvas, rendered through expo-gl so it runs in Expo Go without a
 * custom development build. The scene itself is shared with the web version.
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
      <Canvas camera={{ position: [5.2, 2.4, 5.6], fov: 34 }} gl={{ antialias: true }}>
        <CarSceneContents bodyShape={bodyShape} colour={colour} spinning={spinning} />
      </Canvas>
    </View>
  );
}

export default CarModel3D;
