import { z } from 'zod';

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  bonusCoins: number;
  priceThb: number;
  popular?: boolean;
  bestValue?: boolean;
}

export const COIN_PACKAGES: readonly CoinPackage[] = [
  {
    id: 'starter',
    name: 'เริ่มต้น (Starter)',
    coins: 500,
    bonusCoins: 0,
    priceThb: 59,
  },
  {
    id: 'popular',
    name: 'ยอดนิยม (Popular)',
    coins: 1200,
    bonusCoins: 150,
    priceThb: 129,
    popular: true,
  },
  {
    id: 'best_value',
    name: 'สุดคุ้ม (Best Value)',
    coins: 2500,
    bonusCoins: 450,
    priceThb: 249,
    bestValue: true,
  },
  {
    id: 'vip_pro',
    name: 'โปรพิเศษ (VIP Pro)',
    coins: 6500,
    bonusCoins: 1500,
    priceThb: 590,
  },
] as const;

export const userTopupInfoSchema = z.object({
  user_id: z.string().uuid(),
  alias: z.string(),
  alias_color: z.string(),
  display_name: z.string(),
  tier: z.string(),
  coin_balance: z.number().int().nonnegative(),
});
export type UserTopupInfo = z.infer<typeof userTopupInfoSchema>;

export const createTopupOrderInputSchema = z.object({
  packageId: z.enum(['starter', 'popular', 'best_value', 'vip_pro']),
  slipUrl: z.string().url().optional().nullable(),
  targetUserId: z.string().uuid().optional().nullable(),
});
export type CreateTopupOrderInput = z.infer<typeof createTopupOrderInputSchema>;

export const topupOrderResultSchema = z.object({
  order_id: z.string().uuid(),
  user_id: z.string().uuid(),
  package_id: z.string(),
  package_name: z.string(),
  coin_amount: z.number().int(),
  bonus_coins: z.number().int(),
  total_coins: z.number().int(),
  price_thb: z.number(),
  slip_url: z.string().nullable().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  created_at: z.string(),
});
export type TopupOrderResult = z.infer<typeof topupOrderResultSchema>;

export const myTopupOrdersSchema = z.array(
  z.object({
    id: z.string().uuid(),
    package_id: z.string(),
    package_name: z.string(),
    coin_amount: z.number().int(),
    bonus_coins: z.number().int(),
    total_coins: z.number().int(),
    price_thb: z.number(),
    slip_url: z.string().nullable().optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
    created_at: z.string(),
    approved_at: z.string().nullable().optional(),
  }),
);
export type MyTopupOrderItem = z.infer<typeof myTopupOrdersSchema>[number];
