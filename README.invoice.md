# Invoice API for Elite sports

This backend exposes an invoice endpoint that calculates GST per item as:

- unitGST = price * (gstRate / 100)
- unitBase = price - unitGST
- line totals multiply by qty

Totals: baseAmount + gstAmount - discount = grandTotal.

Shop name is fixed: "Elite sports".

Endpoint

- GET /api/elite/orders/:id/invoice
  - Path params: id = Order ID
  - Response 200: JSON with structure below
  - 400: Invalid order ID
  - 404: Order not found

Response example

{
  "shop": { "name": "Elite sports" },
  "invoice": {
    "id": "66df...",
    "date": "2025-09-08T10:30:00.000Z",
    "customerPhone": "",
    "paymentMethod": "UPI",
    "notes": "",
    "discount": 0
  },
  "items": [
    {
      "productId": "66de...",
      "name": "Cricket Bat",
      "hsnSac": "9506",
      "gstRate": 5,
      "qty": 2,
      "unitPriceIncl": 250,
      "unitGstAmount": 12.5,
      "unitPriceExcl": 237.5,
      "lineBaseAmount": 475,
      "lineGstAmount": 25,
      "lineTotal": 500
    }
  ],
  "totals": {
    "baseAmount": 475,
    "gstAmount": 25,
    "discount": 0,
    "grandTotal": 500
  },
  "gstBreakup": [
    { "rate": 5, "amount": 25 }
  ]
}
