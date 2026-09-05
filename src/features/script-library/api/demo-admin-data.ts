import type { DemoOrder, DemoUser } from './types';

export const initialUsers: DemoUser[] = [
  {
    id: 'user-shen',
    name: '沈予安',
    email: 'shen@xinzhi.demo',
    points: 6800,
    discount: 90,
    role: 'member'
  },
  {
    id: 'user-song',
    name: '宋知遥',
    email: 'song@xinzhi.demo',
    points: 2480,
    discount: 85,
    role: 'member'
  },
  {
    id: 'user-liang',
    name: '梁墨',
    email: 'liang@xinzhi.demo',
    points: 9200,
    discount: 100,
    role: 'member'
  },
  {
    id: 'admin-luo',
    name: '罗嘉宁',
    email: 'admin@xinzhi.demo',
    points: 0,
    discount: 100,
    role: 'admin'
  }
];

export const initialOrders: DemoOrder[] = [
  {
    id: 'ORD-260904-018',
    scriptTitle: '长夜来信',
    buyer: '宋知遥',
    amount: 2720,
    status: 'completed',
    createdAt: '2026-09-04 10:26'
  }
];
