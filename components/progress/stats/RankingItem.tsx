import { Text, View } from 'react-native';
import { statsStyles as styles } from './stats.styles';

type RankingItemProps = {
  title: string;
  meta?: string;
  detail?: string;
  value?: string;
};

export function RankingItem({ title, meta, detail, value }: RankingItemProps) {
  return (
    <View style={styles.rankingItem}>
      <View style={styles.rankingInfo}>
        <Text style={styles.routineName}>{title}</Text>
        {meta ? <Text style={styles.routineMeta}>{meta}</Text> : null}
        {detail ? <Text style={styles.routineDetail}>{detail}</Text> : null}
      </View>
      {value ? <Text style={styles.routinePercent}>{value}</Text> : null}
    </View>
  );
}
