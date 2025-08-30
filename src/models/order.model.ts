// models/order.ts
import { Schema, model, Document, Types } from "mongoose";

// 1. Interfaces
export interface IOrderItem {
  product: Types.ObjectId; // Reference to Product
  size: string; // Size of the product
  qty: number;
  price: number; // Unit retail price at time of order
  subtotal: number; // qty * price
}

export interface IOrder extends Document {
  date: Date; // Order date
  items: IOrderItem[];
  total: number;
  profit: number;

  customerPhone?: string;
  paymentStatus?: "PENDING" | "PAID" | "CANCELLED";
  paymentMethod?: "CASH" | "UPI";
  discount?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  size: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
});

const orderSchema = new Schema<IOrder>(
  {
    date: { type: Date, required: true },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    profit: { type: Number, required: true, min: 0 },

    customerPhone: { type: String, default: "" },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "CANCELLED"],
      default: "PENDING",
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI"],
      default: "CASH",
    },
    discount: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const OrderModel = model<IOrder>("Order", orderSchema);
