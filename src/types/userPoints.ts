import type { PaginatedResponse } from "./api";
import type { User } from "./auth";

export interface UserPointWallet {
  agency_id: number | null;
  user_id: number;
  points_balance: number;
  points_earned: number;
  points_redeemed: number;
  last_movement_at: string | null;
}

export interface UserPointTotals {
  points_earned: number;
  points_deducted: number;
  movements_count: number;
}

export interface UserPointMovement {
  id: number;
  type: string;
  type_label: string;
  direction: "credit" | "debit";
  points: number;
  points_abs: number;
  purchase_id: number | null;
  purchase_points_id: number | null;
  description: string | null;
  meta?: Record<string, unknown> | null;
  created_at: string | null;
}

export interface UserPointsData {
  enabled: boolean;
  agency: {
    id: number;
    name: string;
  } | null;
  wallet: UserPointWallet;
  totals: UserPointTotals;
  movements: PaginatedResponse<UserPointMovement>;
}

export interface UserProfileWithPoints {
  user: User;
  points: UserPointsData;
}

