import { Request, Response } from "express";
import { OrderModel } from "../models/order.model";
import { Product } from "../models/product.model";
import { Types } from "mongoose";
import { generateInvoiceData } from "../utils/invoice";

export class OrderController {
  // Create Order
  static async createOrder(req: Request, res: Response) {
    try {
      const { items, customerPhone, paymentMethod, discount = 0, notes = "", paymentStatus } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items are required" });
      }

      let total = 0;
      let profit = 0;
      const processedItems = [];

      // Check inventory and prepare updates
      for (const item of items) {
        if (!item.size) {
          return res.status(400).json({ error: "Size is required for each item" });
        }

        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({ error: `Product ${item.product} not found` });
        }

        // Check if size exists and has enough quantity
        const sizeInfo = product.sizes.find(s => s.size === item.size);
        if (!sizeInfo) {
          return res.status(400).json({ error: `Size ${item.size} not available for product ${product.name}` });
        }

        if (sizeInfo.quantity < item.qty) {
          return res.status(400).json({ 
            error: `Insufficient stock. Available: ${sizeInfo.quantity}, Requested: ${item.qty} for ${product.name} size ${item.size}` 
          });
        }

        const subtotal = item.qty * item.price;
        const itemProfit = item.qty * (item.price - product.wholesalePrice);

        processedItems.push({
          product: item.product,
          size: item.size,
          qty: item.qty,
          price: item.price,
          subtotal
        });

        total += subtotal;
        profit += itemProfit;
      }

      total -= discount;
      profit -= discount;

      // Update inventory quantities
      for (const item of items) {
        await Product.findOneAndUpdate(
          { _id: item.product, "sizes.size": item.size },
          { $inc: { "sizes.$.quantity": -item.qty } }
        );
      }

      const order = new OrderModel({
        date: new Date(),
        items: processedItems,
        total,
        profit,
        customerPhone,
        paymentStatus: paymentStatus || "PENDING",
        paymentMethod,
        discount,
        notes
      });

      await order.save();
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to create order" });
    }
  }

  // Update Order (Only non-inventory fields)
  static async updateOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { paymentStatus, customerPhone, paymentMethod, discount, notes } = req.body;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }

      const updates: any = {};
      if (paymentStatus !== undefined) updates.paymentStatus = paymentStatus;
      if (customerPhone !== undefined) updates.customerPhone = customerPhone;
      if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
      if (discount !== undefined) {
        updates.discount = discount;
        // Recalculate total and profit with new discount
        const order = await OrderModel.findById(id);
        if (order) {
          const itemsTotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
          updates.total = itemsTotal - discount;
          updates.profit = order.profit - (discount - (order.discount || 0));
        }
      }
      if (notes !== undefined) updates.notes = notes;

      const order = await OrderModel.findByIdAndUpdate(id, updates, { new: true });
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order" });
    }
  }

  // Get All Orders with Analytics
  static async getAllOrders(req: Request, res: Response) {
    try {
      const {
        from,
        to,
        paymentStatus,
        page = 1,
        limit = 20,
        sortBy = "date",
        sortDir = "desc",
        q = ""
      } = req.query;

      const filter: any = {};
      // Date filtering
      if (from || to) {
        filter.date = {};
        if (from) filter.date.$gte = new Date(from as string);
        if (to) filter.date.$lte = new Date(to as string);
      }
      if (paymentStatus) {
        filter.paymentStatus = paymentStatus;
      }

      if (q) {
        const regex = new RegExp(q as string, "i");
        filter.$or = [
          { _id: q },
          { customerPhone: regex },
          { "items.product.name": regex }
        ];
      }

      const pageNum = Math.max(Number(page), 1);
      const pageSize = Math.max(Number(limit), 1);
      const skip = (pageNum - 1) * pageSize;

      const allowedSort = ["date", "total", "profit"];
      let sortOptions: any = {};
      if (allowedSort.includes(sortBy as string)) {
        sortOptions[sortBy as string] = sortDir === "asc" ? 1 : -1;
      } else {
        sortOptions["date"] = -1;
      }

      let orders = await OrderModel.find(filter)
        .populate("items.product", "name category")
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize)
        .lean();

      if (["total", "profit"].includes(sortBy as string)) {
        orders = orders.sort((a: any, b: any) =>
          sortDir === "desc"
            ? b[sortBy as string] - a[sortBy as string]
            : a[sortBy as string] - b[sortBy as string]
        );
      }

      const analyticsFilter = { ...filter };
      if (!paymentStatus) {
        analyticsFilter.paymentStatus = { $ne: "CANCELLED" };
      }

      const analytics = await OrderModel.aggregate([
        { $match: analyticsFilter },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$total" },
            totalProfit: { $sum: "$profit" },
            avgOrderPrice: { $avg: "$total" }
          }
        }
      ]);

      const stats = analytics[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        totalProfit: 0,
        avgOrderPrice: 0
      };

      const totalCount = await OrderModel.countDocuments(filter);
      const totalPages = Math.ceil(totalCount / pageSize);

      res.status(200).json({
        orders,
        analytics: {
          totalOrders: stats.totalOrders,
          totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
          totalProfit: Math.round(stats.totalProfit * 100) / 100,
          avgOrderPrice: Math.round(stats.avgOrderPrice * 100) / 100
        },
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          pageSize
        }
      });
    } catch (error: any) {
      res.status(500).json({
        message: error.message || "Failed to fetch orders",
        code: "INTERNAL_ERROR"
      });
    }
  }

  // Cancel Order and Restore Inventory
  static async cancelOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }

      const order = await OrderModel.findById(id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.paymentStatus === "CANCELLED") {
        return res.status(400).json({ error: "Order already cancelled" });
      }

      // Restore inventory
      for (const item of order.items) {
        await Product.findOneAndUpdate(
          { _id: item.product, "sizes.size": item.size },
          { $inc: { "sizes.$.quantity": item.qty } }
        );
      }

      order.paymentStatus = "CANCELLED";
      await order.save();

      res.json({ message: "Order cancelled and inventory restored", order });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel order" });
    }
  }

  // Get Single Order
  static async getOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }

      const order = await OrderModel.findById(id).populate('items.product', 'name category');
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  }

  // Generate Invoice JSON for an order
  static async getInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }

      const order = await OrderModel.findById(id)
        .populate("items.product", "name hsnSac gst")
        .lean();

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // @ts-ignore populate flattens types at runtime for our generator contract
      const data = generateInvoiceData(order as any);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  }
}