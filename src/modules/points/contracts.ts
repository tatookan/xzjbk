export interface PointsUserDto {
  id: string;
  name: string;
  email: string;
  points: number;
  role: 'member' | 'admin';
  createdAt: string;
}

export interface PointLedgerDto {
  id: string;
  direction: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  source: 'admin-adjustment' | 'recharge' | 'purchase' | 'refund';
  note: string;
  createdAt: string;
}

export interface RechargePlanDto {
  id: string;
  name: string;
  amountCents: number;
  amountYuan: number;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  effectiveDiscount: number;
  isActive: boolean;
}

export interface AccountPointsDto {
  user: PointsUserDto;
  ledger: PointLedgerDto[];
  purchasedScriptIds: string[];
}
