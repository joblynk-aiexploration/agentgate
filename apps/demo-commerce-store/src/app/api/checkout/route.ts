import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "Demo Customer").trim();
  const email = String(form.get("email") ?? "demo@example.com").trim().toLowerCase();
  const store = readStore();
  const products = store.products.slice(0, 2);
  const total = products.reduce((sum, product) => sum + product.price, 0);
  const number = `NS-${Math.floor(2000 + Math.random() * 7000)}`;

  store.orders = [
    {
      id: `ord-${Date.now()}`,
      agentActions: [],
      createdAt: new Date().toISOString(),
      customerId: `cust-${Date.now()}`,
      customerName: name,
      eligibleForCancellation: true,
      eligibleForReturn: false,
      email,
      items: products.map((product) => ({
        name: product.name,
        price: product.price,
        productId: product.id,
        quantity: 1,
      })),
      number,
      status: "processing",
      total,
    },
    ...store.orders,
  ];
  writeStore(store);

  return NextResponse.redirect(new URL(`/order-lookup?created=${number}`, request.url), 303);
}
