import { IOrder } from "../models/order.model";
import { IProduct } from "../models/product.model";

type PopulatedOrderItem = IOrder["items"][number] & {
  product: Pick<IProduct, "_id" | "name" | "hsnSac" | "gst">;
};

export interface InvoiceItem {
  productId: string;
  name: string;
  hsnSac: string;
  gstRate: number; // percent
  qty: number;
  unitPriceIncl: number; // selling price provided on order (inclusive)
  unitGstAmount: number; // per unit GST amount per requested calc: price * rate%
  unitPriceExcl: number; // per unit base (price - gst amount)
  lineBaseAmount: number; // qty * unitPriceExcl
  lineGstAmount: number; // qty * unitGstAmount
  lineTotal: number; // qty * unitPriceIncl
}

export interface InvoiceData {
  shop: {
    name: string;
  };
  invoice: {
    id: string;
    date: string;
    customerPhone?: string;
    paymentMethod?: string;
    notes?: string;
    discount: number;
  };
  items: InvoiceItem[];
  totals: {
    baseAmount: number;
    gstAmount: number;
    discount: number;
    grandTotal: number; // base + gst - discount
  };
  gstBreakup: Array<{
    rate: number;
    amount: number; // total GST amount at that rate
  }>;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function generateInvoiceData(order: Omit<IOrder, "items"> & {
  items: PopulatedOrderItem[];
}): InvoiceData {
  const items: InvoiceItem[] = order.items.map((it) => {
    const rate = typeof it.product?.gst === "number" ? it.product.gst : 0;
    const unitGst = r2((it.price * rate) / 100);
    const unitBase = r2(it.price - unitGst);
    const lineBase = r2(unitBase * it.qty);
    const lineGst = r2(unitGst * it.qty);
    const lineTotal = r2(it.price * it.qty);

    return {
      productId: String(it.product?._id || ""),
      name: it.product?.name || "",
      hsnSac: it.product?.hsnSac || "",
      gstRate: rate,
      qty: it.qty,
      unitPriceIncl: r2(it.price),
      unitGstAmount: unitGst,
      unitPriceExcl: unitBase,
      lineBaseAmount: lineBase,
      lineGstAmount: lineGst,
      lineTotal,
    };
  });

  const baseAmount = r2(items.reduce((s, x) => s + x.lineBaseAmount, 0));
  const gstAmount = r2(items.reduce((s, x) => s + x.lineGstAmount, 0));
  const discount = r2(order.discount || 0);
  const grandTotal = r2(baseAmount + gstAmount - discount);

  const rateMap = new Map<number, number>();
  for (const it of items) {
    rateMap.set(it.gstRate, r2((rateMap.get(it.gstRate) || 0) + it.lineGstAmount));
  }

  const gstBreakup = Array.from(rateMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([rate, amount]) => ({ rate, amount: r2(amount) }));

  return {
    shop: { name: "Elite sports" },
    invoice: {
      id: String((order as any)._id || ""),
      date: new Date(order.date).toISOString(),
      customerPhone: order.customerPhone || undefined,
      paymentMethod: order.paymentMethod || undefined,
      notes: order.notes || undefined,
      discount,
    },
    items,
    totals: { baseAmount, gstAmount, discount, grandTotal },
    gstBreakup,
  };
}
