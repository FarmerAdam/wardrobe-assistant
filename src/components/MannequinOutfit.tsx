import { Image, StyleSheet, View } from 'react-native';
import { Outfit } from '../types';

type Zone = { top: `${number}%`; left: `${number}%`; width: `${number}%`; height: `${number}%` };

const POSES: { source: number; aspect: number }[] = [
  { source: require('../../assets/mannequins/pose1.png'), aspect: 810 / 1430 },
  { source: require('../../assets/mannequins/pose2.png'), aspect: 620 / 1460 },
  { source: require('../../assets/mannequins/pose3.png'), aspect: 610 / 1460 },
];

// Rough body zones as % of the frame, shared across poses since their
// proportions are close enough -- items are flat photos placed on the
// figure, not shaped to it, so exact per-pose tuning isn't worth chasing.
const ZONES: Record<string, Zone> = {
  top: { top: '23%', left: '18%', width: '64%', height: '38%' },
  bottom: { top: '58%', left: '20%', width: '60%', height: '38%' },
  dress: { top: '23%', left: '16%', width: '68%', height: '73%' },
  jumper: { top: '25%', left: '15%', width: '68%', height: '40%' },
  jacket: { top: '21%', left: '10%', width: '78%', height: '45%' },
  outerwear: { top: '19%', left: '7%', width: '84%', height: '47%' },
  shoes: { top: '91%', left: '25%', width: '50%', height: '9%' },
  accessory: { top: '28%', left: '70%', width: '18%', height: '14%' },
};

export function MannequinOutfit({ outfit, poseIndex }: { outfit: Outfit; poseIndex: number }) {
  const pose = POSES[poseIndex % POSES.length];

  return (
    <View style={[styles.frame, { aspectRatio: pose.aspect }]}>
      <Image source={pose.source} style={styles.mannequin} resizeMode="contain" />

      {outfit.dress ? (
        <Image source={{ uri: outfit.dress.photo_url }} style={[styles.itemZone, ZONES.dress]} resizeMode="cover" />
      ) : (
        <>
          {outfit.top && (
            <Image source={{ uri: outfit.top.photo_url }} style={[styles.itemZone, ZONES.top]} resizeMode="cover" />
          )}
          {outfit.bottom && (
            <Image
              source={{ uri: outfit.bottom.photo_url }}
              style={[styles.itemZone, ZONES.bottom]}
              resizeMode="cover"
            />
          )}
        </>
      )}

      {outfit.jumper && (
        <Image source={{ uri: outfit.jumper.photo_url }} style={[styles.itemZone, ZONES.jumper]} resizeMode="cover" />
      )}
      {outfit.jacket && (
        <Image source={{ uri: outfit.jacket.photo_url }} style={[styles.itemZone, ZONES.jacket]} resizeMode="cover" />
      )}
      {outfit.outerwear && (
        <Image
          source={{ uri: outfit.outerwear.photo_url }}
          style={[styles.itemZone, ZONES.outerwear]}
          resizeMode="cover"
        />
      )}
      {outfit.shoes && (
        <Image source={{ uri: outfit.shoes.photo_url }} style={[styles.itemZone, ZONES.shoes]} resizeMode="cover" />
      )}
      {outfit.accessory && (
        <Image
          source={{ uri: outfit.accessory.photo_url }}
          style={[styles.itemZone, ZONES.accessory]}
          resizeMode="cover"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mannequin: { width: '100%', height: '100%', position: 'absolute' },
  itemZone: { position: 'absolute', borderRadius: 6 },
});
