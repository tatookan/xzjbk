import { ConfigurationError } from '@/shared/api/errors';
import { getServerEnv } from '@/shared/config/server-env';

import type { PaymentProvider } from './payment-provider';

export function isPaymentEnabled(): boolean {
  return getServerEnv().PAYMENT_DRIVER !== 'disabled';
}

export function getPaymentProvider(): PaymentProvider {
  const driver = getServerEnv().PAYMENT_DRIVER;
  if (driver === 'disabled') {
    throw new ConfigurationError('Online payment is not enabled');
  }

  throw new ConfigurationError('Alipay adapter is reserved but not configured');
}

export type {
  CreateCheckoutInput,
  PaymentCheckout,
  PaymentDriver,
  PaymentNotification,
  PaymentProvider
} from './payment-provider';
