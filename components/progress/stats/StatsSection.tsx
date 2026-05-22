import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { statsStyles as styles } from './stats.styles';

type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </>
  );
}

export function SubsectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subsectionTitle}>{children}</Text>;
}
