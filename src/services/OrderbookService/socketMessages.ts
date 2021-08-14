export class OrderbookSocketMessage {
  protected payload: Record<string, any>;

  constructor(payload: Record<string, any>) {
    this.payload = payload;
  }

  public toData() {
    return JSON.stringify(this.payload);
  }
}

export class SubscribeMessage extends OrderbookSocketMessage {
  constructor(feed: string, productIDs: string[]) {
    super({
      event: 'subscribe',
      feed,
      product_ids: productIDs,
    });
  }
}

export class UnsubscribeMessage extends OrderbookSocketMessage {
  constructor(feed: string, productIDs: string[]) {
    super({
      event: 'unsubscribe',
      feed,
      product_ids: productIDs,
    });
  }
}
