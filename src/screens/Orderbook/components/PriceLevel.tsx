import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors } from '../../../styles';

interface PriceLevelProps {
  type: 'bid' | 'ask';
  price: number;
  orderSize: number;
  total: number;
  style?: StyleProp<ViewStyle>;
}

const PriceLevel: React.FC<PriceLevelProps> = ({ price, orderSize, total, type, style }) => (
  <View style={[styles.levelRow, style]}>
    <Text style={[styles.levelRowText, { color: type === 'bid' ? Colors.Text.Green : Colors.Text.Red }]}>
      {CurrencyFormatter.format(price)}
    </Text>
    <Text style={styles.levelRowText}>{orderSize}</Text>
    <Text style={styles.levelRowText}>{total}</Text>
  </View>
);

const styles = StyleSheet.create({
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 32,
    marginBottom: 6,
  },
  levelRowText: {
    flex: 1,
    color: Colors.Text.Primary,
    textAlign: 'right',
    fontSize: 18,
  },
});

const CurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default PriceLevel;
