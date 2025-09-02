import { Request, Response } from "express";
import {Product, UploadBatch, IQuantityChange} from "../models/product.model";
import * as XLSX from "xlsx";
import * as crypto from "crypto";

/**
 * Add new product
 */
export const addProduct = async (req: Request, res: Response) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();
    return res.status(201).json({ success: true, data: savedProduct });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get all products
 */
export const getProducts = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      q = "",
      sortBy = "name",
      sortDir = "asc"
    } = req.query;

    const filter: any = {};
    if (q) {
      const regex = new RegExp(q as string, "i");
      filter.$or = [
        { name: regex },
        { category: regex },
        { brand: regex },
        { barcode: regex }
      ];
    }

    const sortOptions: any = {};
    const allowedSort = ["name", "retailPrice", "quantity"];
    if (allowedSort.includes(sortBy as string)) {
      sortOptions[sortBy as string] = sortDir === "desc" ? -1 : 1;
    } else {
      sortOptions["name"] = 1;
    }

    const pageNum = Math.max(Number(page), 1);
    const pageSize = Math.max(Number(limit), 1);
    const skip = (pageNum - 1) * pageSize;

    let products = await Product.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize)
      .lean();

    products = products.map((product: any) => ({
      ...product,
      quantity: Array.isArray(product.sizes)
        ? product.sizes.reduce((sum: number, sz: any) => sum + (sz.quantity || 0), 0)
        : 0
    }));

    if (sortBy === "quantity") {
      products.sort((a: any, b: any) =>
        sortDir === "desc"
          ? b.quantity - a.quantity
          : a.quantity - b.quantity
      );
    }

    const totalCount = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / pageSize);

    return res.status(200).json({
      products,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        pageSize
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error.message,
      code: "INTERNAL_ERROR"
    });
  }
};

/**
 * Get single product by ID
 */
export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    return res.status(200).json({ success: true, data: product });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update product by ID
 */
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    return res.status(200).json({ success: true, data: updatedProduct });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete product by ID
 */
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    return res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Bulk upload products from Excel with duplicate prevention and rollback
 */
export const uploadProductsFromExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileHash = crypto.createHash('md5').update(req.file.buffer).digest('hex');
    const uploadId = crypto.randomUUID();
    
    // Check if file already uploaded
    const existingUpload = await UploadBatch.findOne({ fileHash });
    if (existingUpload) {
      return res.status(409).json({ 
        success: false, 
        message: "This file has already been uploaded",
        uploadId: existingUpload.uploadId,
        uploadedAt: existingUpload.uploadedAt
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const grouped: Record<string, any> = {};
    (sheetData as any[]).forEach(row => {
      const key = `${row["name"]}|${row["category"]}|${row["brand"] || ""}`;
      if (!grouped[key]) {
        grouped[key] = {
          name: row["name"],
          category: row["category"],
          wholesalePrice: Number(row["wholesalePrice"]),
          retailPrice: Number(row["retailPrice"]),
          sizes: [],
          description: row["description"] || "",
          brand: row["brand"] || "",
          barcode: row["barcode"] || ""
        };
      }
      grouped[key].sizes.push({
        size: row["size"],
        quantity: Number(row["quantity"]) || 0
      });
    });

    const products = Object.values(grouped);
    const insertedIds: string[] = [];
    const quantityChanges: IQuantityChange[] = [];

    // Process each product
    for (const productData of products) {
      const existing = await Product.findOne({
        name: productData.name,
        category: productData.category,
        brand: productData.brand
      });

      if (existing) {
        // Track quantity changes for rollback
        for (const newSize of productData.sizes) {
          const existingSize = existing.sizes.find(s => s.size === newSize.size);
          if (existingSize) {
            quantityChanges.push({
              productId: (existing as any)._id.toString(),
              size: newSize.size,
              oldQuantity: existingSize.quantity,
              newQuantity: existingSize.quantity + newSize.quantity
            });
            existingSize.quantity += newSize.quantity;
          } else {
            existing.sizes.push(newSize);
          }
        }
        await existing.save();
      } else {
        const newProduct = await Product.create(productData);
        insertedIds.push((newProduct as any)._id.toString());
      }
    }

    // Track upload for rollback
    await UploadBatch.create({
      uploadId,
      fileName: req.file.originalname,
      fileHash,
      productIds: insertedIds,
      quantityChanges
    });

    return res.status(201).json({
      success: true,
      uploadId,
      inserted: insertedIds.length,
      updated: quantityChanges.length
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Rollback a specific upload batch
 */
export const rollbackUpload = async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.params;
    const batch = await UploadBatch.findOne({ uploadId });
    
    if (!batch) {
      return res.status(404).json({ success: false, message: "Upload batch not found" });
    }

    // Delete newly inserted products
    await Product.deleteMany({ _id: { $in: batch.productIds } });

    // Revert quantity changes
    for (const change of batch.quantityChanges) {
      const product = await Product.findById(change.productId);
      if (product) {
        const sizeIndex = product.sizes.findIndex(s => s.size === change.size);
        if (sizeIndex !== -1) {
          product.sizes[sizeIndex].quantity = change.oldQuantity;
          await product.save();
        }
      }
    }

    await UploadBatch.deleteOne({ uploadId });

    return res.status(200).json({
      success: true,
      message: `Rolled back ${batch.productIds.length} products and ${batch.quantityChanges.length} quantity changes`,
      fileName: batch.fileName
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all upload batches
 */
export const getUploadBatches = async (req: Request, res: Response) => {
  try {
    const batches = await UploadBatch.find().sort({ uploadedAt: -1 });
    return res.status(200).json({ success: true, data: batches });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


