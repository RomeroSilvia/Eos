import { StyleSheet, Text, View } from 'react-native';

export default function QuizScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Quiz de piel</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#0B132B',
    fontSize: 28,
    fontWeight: 'bold',
  },
});
