import { captureException } from '../errorService';
import { OrderbookSocketMessage, SubscribeMessage, UnsubscribeMessage } from './socketMessages';

const ORDERBOOK_WS_URL = 'wss://www.cryptofacilities.com/ws/v1';

export type OrderbookProduct = 'PI_XBTUSD' | 'PI_ETHUSD';

/** [price, size] */
export type Level = [number, number];

type OrderbookSnapshotResponse = {
  feed: string;
  product_id: string;
  numLevels: number;
  bids: Level[];
  asks: Level[];
};

type OrderbookUpdateResponse = {
  feed: string;
  product_id: string;
  bids: Level[];
  asks: Level[];
};

type HandlerCallback<T extends 'onError' | 'onSnapshotMessage' | 'onUpdateMessage'> = T extends 'onError'
  ? (errorMessage: string) => void
  : T extends 'onSnapshotMessage'
  ? (message: OrderbookSnapshotResponse) => void
  : (message: OrderbookUpdateResponse) => void;

class OrderbookService {
  private websocketURL: string;
  private socket?: WebSocket;
  private subscription?: {
    feed: string;
    productID: OrderbookProduct;
  };
  private onSnapshotMessage?: HandlerCallback<'onSnapshotMessage'>;
  private onUpdateMessage?: HandlerCallback<'onUpdateMessage'>;
  private onError?: HandlerCallback<'onError'>;

  constructor(websocketURL: string = ORDERBOOK_WS_URL) {
    this.websocketURL = websocketURL;
  }

  public setHandler<T extends 'onError' | 'onSnapshotMessage' | 'onUpdateMessage'>(
    handler: T,
    callback: HandlerCallback<T>,
  ) {
    switch (handler) {
      case 'onError':
        this.onError = callback as HandlerCallback<'onError'>;
        return;
      case 'onSnapshotMessage':
        this.onSnapshotMessage = callback as HandlerCallback<'onSnapshotMessage'>;
        return;
      case 'onUpdateMessage':
        this.onUpdateMessage = callback as HandlerCallback<'onUpdateMessage'>;
        return;
    }
  }

  public connect(productID: OrderbookProduct, feed: string = 'book_ui_1') {
    if (!this.socket) {
      this.socket = new WebSocket(this.websocketURL);

      this.socket.onopen = () => {
        this.subscribe(feed, productID);
        this.subscription = { feed, productID };
      };

      this.socket.onerror = ({ message }) => this.onError && this.onError(message);

      this.socket.onmessage = ({ data }) => {
        if ((this.onSnapshotMessage || this.onUpdateMessage) && data) {
          try {
            const payload = JSON.parse(data);
            const isInitialMessage = typeof payload.numLevels === 'number';

            if (this.onSnapshotMessage && isInitialMessage) {
              this.onSnapshotMessage(payload as OrderbookSnapshotResponse);
            } else if (this.onUpdateMessage && payload.bids && payload.asks) {
              this.onUpdateMessage(payload as OrderbookUpdateResponse);
            }
          } catch (err) {
            captureException(err);
          }
        }
      };
    } else {
      // socket already opened. Unsubscribe from old feed and subscribe to new feed.
      this.subscription && this.unsubscribe(this.subscription.feed, this.subscription.productID);
      this.subscribe(feed, productID);
    }
  }

  public disconnect() {
    if (this.subscription) {
      this.unsubscribe(this.subscription.feed, this.subscription.productID);
    }
    this.socket?.close();
  }

  /** Throws a fake websocket error */
  public _throwWebsocketError() {
    if (this.socket && this.socket.onerror) {
      this.socket.onerror({
        message: 'Fake Error - Causing a Ruckus',
      });
    }
  }

  // Private

  private subscribe(feed: string, productID: OrderbookProduct) {
    this.sendMessage(new SubscribeMessage(feed, [productID]));
  }

  private unsubscribe(feed: string, productID: OrderbookProduct) {
    this.sendMessage(new UnsubscribeMessage(feed, [productID]));
  }

  private sendMessage(message: OrderbookSocketMessage) {
    this.socket?.send(message.toData());
  }
}

export default OrderbookService;
