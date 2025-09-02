// models/product.ts
import { Schema, model, Document } from "mongoose";

export interface ISizeQuantity {
  size: string;
  quantity: number;
}

export interface IProduct extends Document {
  name: string;
  category: string;
  wholesalePrice: number;
  retailPrice: number;
  sizes: ISizeQuantity[];
  description?: string;
  brand?: string;
  barcode?: string;
  hsnSac?: string;
  gst?: number;
  createdAt: Date;
  updatedAt: Date;
}

const sizeQuantitySchema = new Schema<ISizeQuantity>(
  {
    size: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    wholesalePrice: { type: Number, required: true, min: 0 },
    retailPrice: { type: Number, required: true, min: 0 },
    sizes: {
      type: [sizeQuantitySchema],
      required: true,
      validate: [(val: ISizeQuantity[]) => val.length > 0, "At least one size must be provided"],
    },

    // Optional fields
    description: { type: String, default: "" },
    brand: { type: String, default: "" },
    barcode: { type: String, unique: false, sparse: true },
  hsnSac: { type: String, default: "" },
  gst: { type: Number, default: null },
  },
  { timestamps: true }
);

// Optimized text search index with weighted fields
productSchema.index(
  { name: "text", brand: "text", description: "text" },
  { weights: { name: 5, brand: 3, description: 1 }, name: "ProductTextIndex" }
);

export const Product = model<IProduct>("Product", productSchema);

export interface IQuantityChange {
  productId: string;
  size: string;
  oldQuantity: number;
  newQuantity: number;
}

export interface IUploadBatch extends Document {
  uploadId: string;
  fileName: string;
  fileHash: string;
  productIds: string[];
  quantityChanges: IQuantityChange[];
  uploadedAt: Date;
}

const quantityChangeSchema = new Schema<IQuantityChange>({
  productId: { type: String, required: true },
  size: { type: String, required: true },
  oldQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true }
}, { _id: false });

const uploadBatchSchema = new Schema<IUploadBatch>({
  uploadId: { type: String, required: true, unique: true },
  fileName: { type: String, required: true },
  fileHash: { type: String, required: true, unique: true },
  productIds: [{ type: String, required: true }],
  quantityChanges: [quantityChangeSchema],
  uploadedAt: { type: Date, default: Date.now }
});

export const UploadBatch = model<IUploadBatch>("UploadBatch", uploadBatchSchema);
