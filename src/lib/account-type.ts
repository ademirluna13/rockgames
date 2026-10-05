import type { AccountType } from "./data/contracts";

export const accountTypeLabel = (type: AccountType | null): string =>
  type === "primary" ? "Cuenta principal" : type === "secondary" ? "Cuenta secundaria" : "Modalidad por confirmar";
