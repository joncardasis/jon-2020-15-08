import { Level } from '../../services/OrderbookService';

type OrderSizeByPrice = { [price: number]: number };

type LevelData = {
  values: OrderSizeByPrice;
  order: number[];
};

type OrderbookState = {
  bidLevels?: LevelData;
  askLevels?: LevelData;
  groupingSize: number;
  bids: {
    price: number;
    orderSize: number;
    total: number;
  }[];
  asks: {
    price: number;
    orderSize: number;
    total: number;
  }[];
};

type OrderbookAction =
  | { type: 'SET_BIDS_SNAPSHOT'; payload: { bids: Level[] } }
  | { type: 'SET_ASKS_SNAPSHOT'; payload: { asks: Level[] } }
  | { type: 'UPDATE_BIDS'; payload: { bids: Level[] } }
  | { type: 'UPDATE_ASKS'; payload: { asks: Level[] } }
  | { type: 'RESET_ORDERBOOK' }
  | { type: 'SET_GROUPING_SIZE'; payload: { groupingSize: number } };

const orderbookReducer = (state: OrderbookState, action: OrderbookAction): OrderbookState => {
  switch (action.type) {
    case 'SET_BIDS_SNAPSHOT':
      const snapshotBidLevels = parseSnapshot(action.payload.bids);
      return {
        ...state,
        bidLevels: snapshotBidLevels,
        bids: generatePricingLevels({ bids: snapshotBidLevels, groupingSize: state.groupingSize }),
      };
    case 'SET_ASKS_SNAPSHOT':
      const snapshotAskLevels = parseSnapshot(action.payload.asks);
      return {
        ...state,
        askLevels: snapshotAskLevels,
        asks: generatePricingLevels({ bids: snapshotAskLevels, groupingSize: state.groupingSize }),
      };
    case 'UPDATE_BIDS':
      if (!state.bidLevels) {
        return state;
      }
      const updatedBidLevels = amendLevelUpdate(action.payload.bids, state.bidLevels);
      return {
        ...state,
        bidLevels: updatedBidLevels,
        bids: generatePricingLevels({ bids: updatedBidLevels, groupingSize: state.groupingSize }),
      };
    case 'UPDATE_ASKS':
      if (!state.askLevels) {
        return state;
      }
      const updatedAskLevels = amendLevelUpdate(action.payload.asks, state.askLevels);
      return {
        ...state,
        askLevels: updatedAskLevels,
        asks: generatePricingLevels({ bids: updatedAskLevels, groupingSize: state.groupingSize }),
      };
    case 'RESET_ORDERBOOK':
      return {
        ...state,
        bidLevels: undefined,
        bids: [],
        askLevels: undefined,
        asks: [],
      };
    case 'SET_GROUPING_SIZE':
      return {
        ...state,
        bids: state.bidLevels ? generatePricingLevels({ bids: state.bidLevels, groupingSize: state.groupingSize }) : [],
        asks: state.askLevels ? generatePricingLevels({ bids: state.askLevels, groupingSize: state.groupingSize }) : [],
        groupingSize: action.payload.groupingSize,
      };
    default:
      return state;
  }
};

const generatePricingLevels = ({ bids, groupingSize }: { bids: LevelData; groupingSize: number }) => {
  let priceGrouping: { price: number; orderSize: number; total: number } | undefined;
  const pricingLevels: NonNullable<typeof priceGrouping>[] = [];

  bids.order.forEach((price) => {
    const size = bids.values[price];
    const groupPrice = Math.floor(price / groupingSize) * groupingSize;

    if (priceGrouping && priceGrouping.price === groupPrice) {
      priceGrouping.orderSize += size;
      priceGrouping.total += size;
    } else {
      if (priceGrouping) {
        pricingLevels.push(priceGrouping);
      }

      priceGrouping = {
        price: groupPrice,
        orderSize: size,
        total: (priceGrouping?.total || 0) + size,
      };
    }
  });

  if (priceGrouping) {
    pricingLevels.push(priceGrouping);
  }

  return pricingLevels;
};

const parseSnapshot = (levels: Level[]): LevelData => {
  const values: OrderSizeByPrice = {};
  const order: number[] = [];

  levels.forEach((level) => {
    const price = level[0];
    const size = level[1];
    values[price] = size;

    order.push(price);
  });

  return {
    values,
    order: order.sort(),
  };
};

const amendLevelUpdate = (levelUpdates: Level[], state: LevelData): LevelData => {
  const newState = { values: { ...state.values }, order: [...state.order] };

  levelUpdates.forEach((levelUpdate) => {
    const price = levelUpdate[0];
    const size = levelUpdate[1];

    const index = newState.order.indexOf(price, 0);

    if (size === 0) {
      delete newState.values[price];

      if (index > -1) {
        const order = [...newState.order];
        order.splice(index, 1);
        newState.order = order;
      }
    } else {
      newState.values[price] = size;

      if (index === -1) {
        const order = [...newState.order];
        order.push(price);
        newState.order = order.sort();
      }
    }
  });

  return newState;
};

export default orderbookReducer;
