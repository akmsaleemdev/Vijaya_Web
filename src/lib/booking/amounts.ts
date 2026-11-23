import type { Prisma } from "@prisma/client";

export type Money = number | Prisma.Decimal;
type BookingPrice = { baseAmount: Money; weekendUplift: Money; taxAmount: Money; depositAmount: Money; totalPayable: Money };

export function totalContract(row: Pick<BookingPrice, "baseAmount" | "weekendUplift" | "taxAmount">) {
  return sumMoney([row.baseAmount, row.weekendUplift, row.taxAmount]);
}

export function sumMoney(values: Money[]) {
  return values.reduce<number>((cents, amount) => cents + Math.round(Number(amount) * 100), 0) / 100;
}

export function publicAmounts(row: BookingPrice) {
  return {
    base: Number(row.baseAmount), weekendUplift: Number(row.weekendUplift),
    tax: Number(row.taxAmount), deposit: Number(row.depositAmount), totalPayable: Number(row.totalPayable),
    totalContract: totalContract(row),
  };
}
