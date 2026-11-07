export const ROLES = {
  BUYER: "BUYER",
  FARMER: "FARMER",
  ADMIN: "ADMIN",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export function isRoleName(value: string): value is RoleName {
  return Object.values(ROLES).includes(value as RoleName);
}
