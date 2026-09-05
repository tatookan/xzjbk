export type PaymentDriver = 'alipay';

export interface CreateCheckoutInput {
  orderNo: string;
  subject: string;
  amountCents: number;
  returnUrl: string;
  notifyUrl: string;
}

export interface PaymentCheckout {
  provider: PaymentDriver;
  externalTradeNo: string;
  redirectUrl: string;
}

export interface PaymentNotification {
  externalEventId: string;
  externalTradeNo: string;
  paid: boolean;
  paidAt: Date | null;
  rawPayload: Record<string, string>;
}

export interface PaymentProvider {
  readonly driver: PaymentDriver;
  createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckout>;
  verifyNotification(payload: Record<string, string>): Promise<PaymentNotification>;
  closeTrade(externalTradeNo: string): Promise<void>;
}
