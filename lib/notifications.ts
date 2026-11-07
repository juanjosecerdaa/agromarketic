import type { Prisma } from "@prisma/client";

type NotificationTransaction = Prisma.TransactionClient;

export function createNotification(
  transaction: NotificationTransaction,
  data: {
    userId: string;
    type:
      | "MESSAGE"
      | "RESERVATION_REQUEST"
      | "RESERVATION_CONFIRMED"
      | "RESERVATION_REJECTED"
      | "RESERVATION_CANCELLED"
      | "RESERVATION_COMPLETED";
    title: string;
    message: string;
    href?: string;
  },
) {
  return transaction.notification.create({ data });
}
