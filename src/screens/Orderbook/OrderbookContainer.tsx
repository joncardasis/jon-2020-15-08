import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Alert, SafeAreaView, SectionList, StatusBar, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import { captureException } from '../../services/errorService';
import OrderbookService, { OrderbookProduct } from '../../services/OrderbookService/OrderbookService';
import { Colors } from '../../styles';
import PriceLevel from './components/PriceLevel';
import orderbookReducer from './orderbookReducer';
import { useActionSheet } from '@expo/react-native-action-sheet';

const DEFAULT_ORDERBOOK_PRODUCT: OrderbookProduct = 'PI_XBTUSD';
const UPDATE_RENDER_BATCH_SIZE = 20;

const GroupSizeByProduct: { [productID in OrderbookProduct]: [number, number, number] } = {
  PI_XBTUSD: [0.5, 1, 2.5],
  PI_ETHUSD: [0.05, 0.1, 0.25],
};

const OrderbookContainer: React.FC = () => {
  const orderbookService = useRef<OrderbookService>();
  const [orderbookProduct, setOrderbookProduct] = useState<OrderbookProduct>(DEFAULT_ORDERBOOK_PRODUCT);
  const [state, dispatch] = useReducer(orderbookReducer, {
    groupingSize: GroupSizeByProduct[DEFAULT_ORDERBOOK_PRODUCT][0],
    bids: [],
    asks: [],
  });
  const [killFeedButtonAction, setKillFeedButtonAction] = useState<'kill-feed' | 'restart-feed'>('kill-feed');
  const { showActionSheetWithOptions } = useActionSheet();

  const orderbookUpdateCount = useRef<number>(0); // Used for UI render throttling
  const [bids, setBids] = useState<typeof state.bids>([]);
  const [asks, setAsks] = useState<typeof state.asks>([]);

  useEffect(() => {
    // --Throttle orderbook render updates (a bit crudely)--
    // Component state [bids, asks] are references and don't cost memory copy overhead.
    if (orderbookUpdateCount.current === 0 || orderbookUpdateCount.current > UPDATE_RENDER_BATCH_SIZE) {
      orderbookUpdateCount.current = 1;
      setBids(state.bids);
      setAsks(state.asks);
    }
  }, [state.bids, state.asks]);

  useEffect(() => {
    const orderbook = new OrderbookService();
    orderbookService.current = orderbook;

    orderbook.setHandler('onSnapshotMessage', (message) => {
      orderbookUpdateCount.current = 0;
      dispatch({ type: 'SET_BIDS_SNAPSHOT', payload: { bids: message.bids } });
      dispatch({ type: 'SET_ASKS_SNAPSHOT', payload: { asks: message.asks } });
    });

    orderbook.setHandler('onUpdateMessage', (message) => {
      orderbookUpdateCount.current += 1;
      dispatch({ type: 'UPDATE_BIDS', payload: { bids: message.bids } });
      dispatch({ type: 'UPDATE_ASKS', payload: { asks: message.asks } });
    });

    orderbook.setHandler('onError', (errorMsg) => {
      Alert.alert(
        'Orderbook Error',
        `${errorMsg}\n\nA toast would be better UX here. Prod should handle error codes for localized error messages.`,
      );
      captureException(new Error(errorMsg));
    });

    // Connect to orderbook service
    orderbook.connect(DEFAULT_ORDERBOOK_PRODUCT);

    return () => orderbook.disconnect();
  }, []);

  const resetFeed = useCallback((product: OrderbookProduct) => {
    dispatch({ type: 'RESET_ORDERBOOK' });
    orderbookService.current?.connect(product);

    // Reset component state
    setBids([]);
    setAsks([]);
    orderbookUpdateCount.current = 0;
  }, []);

  const groupingPressed = useCallback(() => {
    const options = [...GroupSizeByProduct[orderbookProduct].map((size) => size.toString()), 'Cancel'];
    const cancelButtonIndex = options.length - 1;
    showActionSheetWithOptions(
      {
        title: 'Select Grouping',
        options,
        cancelButtonIndex,
      },
      (index) => {
        if (index !== cancelButtonIndex) {
          dispatch({
            type: 'SET_GROUPING_SIZE',
            payload: { groupingSize: GroupSizeByProduct[orderbookProduct][index] },
          });
        }
      },
    );
  }, [showActionSheetWithOptions, orderbookProduct]);

  const toggleFeedPressed = useCallback(() => {
    const newProduct = orderbookProduct === 'PI_XBTUSD' ? 'PI_ETHUSD' : 'PI_XBTUSD';
    setOrderbookProduct(newProduct);
    resetFeed(newProduct);
  }, [orderbookProduct, resetFeed]);

  const killFeedPressed = useCallback(() => {
    if (killFeedButtonAction === 'kill-feed') {
      orderbookService.current?._throwWebsocketError();
    } else {
      resetFeed(orderbookProduct);
    }
    setKillFeedButtonAction((action) => (action === 'kill-feed' ? 'restart-feed' : 'kill-feed'));
  }, [killFeedButtonAction, resetFeed, orderbookProduct]);

  const orderbookList = useMemo(
    () => (
      <SectionList
        style={styles.orderbookContainer}
        sections={[
          { type: 'ASK', data: [...asks].reverse() },
          { type: 'BID', data: bids },
        ]}
        keyExtractor={(item, index) => `${item.price}-${index}`}
        getItemLayout={(_, index) => ({ length: 30, offset: 30 * index, index })}
        renderItem={({ item: level, section }) => (
          <PriceLevel
            key={`${section.type}-${level.price}`}
            type={section.type === 'BID' ? 'bid' : 'ask'}
            {...level}
            style={{ height: 30 }}
          />
        )}
      />
    ),
    [bids, asks],
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.Background.Primary }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.orderbookProductText}>{orderbookProduct}</Text>
          <Button
            text={`Grouping: ${state.groupingSize.toFixed(2)}`}
            style={styles.groupingButton}
            textStyle={{ color: 'white' }}
            onPress={groupingPressed}
          />
        </View>
        <View style={{ ...styles.levelRow, borderBottomWidth: 1, borderBottomColor: Colors.Text.Primary }}>
          <Text style={styles.levelRowText}>Price (USD)</Text>
          <Text style={styles.levelRowText}>Size</Text>
          <Text style={styles.levelRowText}>Total</Text>
        </View>

        {orderbookList}

        <View style={styles.actionContainer}>
          <Button
            text="Toggle Feed"
            style={styles.toggleFeedButton}
            textStyle={{ color: 'white' }}
            onPress={toggleFeedPressed}
          />
          <View style={{ width: 16 }} />
          <Button
            text={killFeedButtonAction === 'kill-feed' ? 'Kill Feed' : 'Restart Feed'}
            style={styles.killFeedButton}
            textStyle={{ color: 'white' }}
            onPress={killFeedPressed}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  orderbookContainer: {
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    marginHorizontal: 28,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  orderbookProductText: {
    color: Colors.Text.Primary,
    textAlign: 'center',
    fontSize: 21,
  },
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
    fontSize: 17,
  },
  groupingButton: {
    backgroundColor: Colors.Control.Active,
  },
  toggleFeedButton: {
    flex: 1,
    backgroundColor: '#5F35E2',
  },
  killFeedButton: {
    flex: 1,
    backgroundColor: Colors.Error.Primary,
  },
});

export default OrderbookContainer;
