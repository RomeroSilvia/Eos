import { StyleSheet, Text, View } from 'react-native';

export default function ProductsIndexScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Pantalla de Productos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#0B132B',
    fontSize: 20,
    fontWeight: '700',
  },
});
