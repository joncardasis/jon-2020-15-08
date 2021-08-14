import { captureException } from '../../errorService';
import OrderbookService from '../OrderbookService';

jest.mock('../../errorService', () => ({
  captureException: jest.fn(),
}));

describe('OrderbookService', () => {
  let fakeWebSocket;
  let service;
  const simulateSocketConnected = () => service.socket.onopen();

  beforeEach(() => {
    fakeWebSocket = FakeWebSocket;
    global.WebSocket = fakeWebSocket;
    service = new OrderbookService();
  });

  describe('connect', () => {
    it('should subscribe to feed', () => {
      const productID = 'fake-product';
      service.connect(productID);
      simulateSocketConnected();

      expect(service.socket.send).toBeCalledWith(
        JSON.stringify({
          event: 'subscribe',
          feed: 'book_ui_1',
          product_ids: [productID],
        }),
      );
    });
  });

  describe('disconnect', () => {
    it('should unsubscribe and close socket', () => {
      const productID = 'fake-product';
      const feed = 'fake-feed';
      service.connect(productID, feed);
      simulateSocketConnected();
      service.disconnect();

      expect(service.socket.send).toBeCalledWith(
        JSON.stringify({
          event: 'unsubscribe',
          feed: feed,
          product_ids: [productID],
        }),
      );
      expect(service.socket.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('socket onmessage', () => {
    describe('when snapshot message', () => {
      it('should invoke onSnapshotMessage handler', () => {
        const snapshotCallback = jest.fn();
        const updateCallback = jest.fn();
        service.setHandler('onSnapshotMessage', snapshotCallback);
        service.setHandler('onUpdateMessage', updateCallback);
        service.connect('fake-product');

        service.socket.onmessage({
          data: JSON.stringify({
            feed: 'feed',
            product_id: 'product',
            numLevels: 5,
            bids: [[1000, 10]],
            asks: [],
          }),
        });

        expect(snapshotCallback).toHaveBeenCalledTimes(1);
        expect(updateCallback).not.toHaveBeenCalled();
      });
    });
    describe('when update message', () => {
      it('should invoke onUpdateMessage handler', () => {
        const snapshotCallback = jest.fn();
        const updateCallback = jest.fn();
        service.setHandler('onSnapshotMessage', snapshotCallback);
        service.setHandler('onUpdateMessage', updateCallback);
        service.connect('fake-product');

        service.socket.onmessage({
          data: JSON.stringify({
            feed: 'feed',
            product_id: 'product',
            bids: [],
            asks: [[1000, 5]],
          }),
        });

        expect(updateCallback).toHaveBeenCalledTimes(1);
        expect(snapshotCallback).not.toHaveBeenCalled();
      });
    });
    describe('if parsing message payload fails', () => {
      it('should captureException', () => {
        service.connect('fake-product');
        service.setHandler('onUpdateMessage', jest.fn());

        service.socket.onmessage({
          data: 'bad-data-format',
        });

        expect(captureException).toBeCalledTimes(1);
      });
    });
  });

  describe('when socket has active subscription', () => {
    describe('connect', () => {
      it('should unsubscribe and resubscribe with new options', () => {
        const productID = 'first-product';
        const feed = 'first-feed';
        service.connect(productID, feed);
        simulateSocketConnected();

        const newProductID = 'new-product';
        const newFeed = 'new-feed';
        service.connect(newProductID, newFeed);
        simulateSocketConnected();

        expect(service.socket.send).toBeCalledWith(
          JSON.stringify({
            event: 'unsubscribe',
            feed: feed,
            product_ids: [productID],
          }),
        );

        expect(service.socket.send).toBeCalledWith(
          JSON.stringify({
            event: 'subscribe',
            feed: newFeed,
            product_ids: [newProductID],
          }),
        );
      });
    });
  });
});

class FakeWebSocket {
  constructor(url) {}
  readyState = -1;
  send = jest.fn();
  close = jest.fn();
  onopen = jest.fn();
  onmessage = jest.fn();
  onerror = jest.fn();
  onclose = jest.fn();
}
