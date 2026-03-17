import { Polar } from '@polar-sh/sdk';

const accessToken = process.env.POLAR_ACCESS_TOKEN;

export const polarClient = accessToken
  ? new Polar({
      accessToken,
      server: process.env.POLAR_SERVER || 'sandbox',
    })
  : null;

// Currently only one paid plan: Pro
export const PLAN_MAP = process.env.POLAR_PRODUCT_ID_PRO
  ? {
      [process.env.POLAR_PRODUCT_ID_PRO]: 'pro',
    }
  : {};

