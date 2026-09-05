'use client';

import { inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: ['member', 'admin'], required: true },
        pointsBalance: { type: 'number', required: true },
        discountBasisPoints: { type: 'number', required: true }
      }
    })
  ]
});

export type AuthSession = typeof authClient.$Infer.Session;
