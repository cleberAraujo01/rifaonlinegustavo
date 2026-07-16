import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  inet,
  integer,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/** Um pedido = uma reserva com N números para um comprador. */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buyerName: varchar("buyer_name", { length: 100 }).notNull(),
    /** Só dígitos, ex.: 5511999998888 */
    buyerPhone: varchar("buyer_phone", { length: 20 }).notNull(),
    status: varchar("status", { length: 10 }).notNull().default("reserved"),
    /** Dinheiro sempre em centavos (integer), nunca float. */
    totalCents: integer("total_cents").notNull(),
    /** Venda presencial registrada pelo admin. */
    isManual: boolean("is_manual").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reservedUntil: timestamp("reserved_until", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    clientIp: inet("client_ip"),
  },
  (t) => [
    check(
      "orders_status_check",
      sql`${t.status} IN ('reserved', 'paid', 'cancelled')`,
    ),
    index("idx_orders_status").on(t.status, t.reservedUntil),
    index("idx_orders_ratelimit").on(t.clientIp, t.createdAt),
    index("idx_orders_phone").on(t.buyerPhone, t.createdAt),
  ],
);

/** Os 700 números (000–699), pré-populados pelo seed. */
export const numbers = pgTable(
  "numbers",
  {
    n: smallint("n").primaryKey(),
    status: varchar("status", { length: 10 }).notNull().default("available"),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("numbers_n_check", sql`${t.n} BETWEEN 0 AND 699`),
    check(
      "numbers_status_check",
      sql`${t.status} IN ('available', 'reserved', 'paid')`,
    ),
    index("idx_numbers_order").on(t.orderId),
  ],
);

export type Order = typeof orders.$inferSelect;
export type NumberRow = typeof numbers.$inferSelect;
