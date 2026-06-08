import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashSync } from "bcryptjs";
import type { AdminConfig, AgentLog, Order, Product, StoreData } from "@/lib/types";

const dataDir = join(process.cwd(), "data");
const storeFile = join(dataDir, "store.json");
const configFile = join(dataDir, "config.local.json");

function now() {
  return new Date().toISOString();
}

export const defaultAdminConfig: AdminConfig = {
  agentGateBaseUrl: "http://localhost:3001",
  agentId: "demo-commerce-support-agent",
  environment: "production",
};

const products: Product[] = [
  {
    id: "prod-backpack",
    slug: "summitpro-backpack",
    name: "SummitPro Backpack",
    category: "Backpacks",
    price: 249,
    inventory: 18,
    rating: 4.8,
    reviews: 126,
    image: "linear-gradient(135deg,#0f766e,#134e4a)",
    description: "A 45L technical pack with weatherproof fabric and trail-ready suspension.",
    features: ["45L capacity", "Rain shell pocket", "Hydration sleeve"],
  },
  {
    id: "prod-jacket",
    slug: "alpineshell-jacket",
    name: "AlpineShell Jacket",
    category: "Jackets",
    price: 180,
    inventory: 22,
    rating: 4.7,
    reviews: 89,
    image: "linear-gradient(135deg,#1d4ed8,#172554)",
    description: "Waterproof three-layer shell built for wet shoulder-season hikes.",
    features: ["Waterproof", "Packable hood", "Vent zips"],
  },
  {
    id: "prod-boots",
    slug: "ridgewalk-hiking-boots",
    name: "RidgeWalk Hiking Boots",
    category: "Hiking Boots",
    price: 149,
    inventory: 15,
    rating: 4.6,
    reviews: 73,
    image: "linear-gradient(135deg,#92400e,#451a03)",
    description: "Stable mid-height hiking boots for gravel, mud, and weekend climbs.",
    features: ["Vibram-style sole", "Water-resistant upper", "Ankle support"],
  },
  {
    id: "prod-bottle",
    slug: "traillite-water-bottle",
    name: "TrailLite Water Bottle",
    category: "Water Bottles",
    price: 39.99,
    inventory: 64,
    rating: 4.9,
    reviews: 211,
    image: "linear-gradient(135deg,#0891b2,#155e75)",
    description: "Insulated stainless bottle that keeps drinks cold through long trail days.",
    features: ["24 oz", "Leakproof cap", "Dishwasher safe"],
  },
  {
    id: "prod-tent",
    slug: "trailnest-tent",
    name: "TrailNest Tent",
    category: "Tents",
    price: 229,
    inventory: 9,
    rating: 4.5,
    reviews: 58,
    image: "linear-gradient(135deg,#15803d,#14532d)",
    description: "Two-person freestanding tent with quick setup and roomy vestibules.",
    features: ["2-person", "4 lb 3 oz", "Double vestibule"],
  },
  {
    id: "prod-light",
    slug: "camplight-mini",
    name: "CampLight Mini",
    category: "Camping Lights",
    price: 49.99,
    inventory: 37,
    rating: 4.6,
    reviews: 104,
    image: "linear-gradient(135deg,#f59e0b,#854d0e)",
    description: "USB-C rechargeable camp light with lantern, torch, and red-light modes.",
    features: ["USB-C", "Red-light mode", "Magnetic base"],
  },
  {
    id: "prod-gloves",
    slug: "stormgrip-gloves",
    name: "StormGrip Gloves",
    category: "Gloves",
    price: 59,
    inventory: 41,
    rating: 4.4,
    reviews: 47,
    image: "linear-gradient(135deg,#334155,#020617)",
    description: "Warm, grippy gloves for cold trail starts and camp chores.",
    features: ["Touchscreen tips", "Fleece lined", "Water resistant"],
  },
  {
    id: "prod-organizer",
    slug: "waypoint-travel-organizer",
    name: "Waypoint Travel Organizer",
    category: "Travel Organizers",
    price: 34,
    inventory: 52,
    rating: 4.7,
    reviews: 66,
    image: "linear-gradient(135deg,#7c3aed,#312e81)",
    description: "Compact organizer for cables, passports, trail permits, and small essentials.",
    features: ["Zippered dividers", "Passport sleeve", "Recycled nylon"],
  },
];

function seedData(): StoreData {
  const createdAt = now();

  return {
    products,
    customers: [
      { id: "cust-sarah", name: "Sarah Miller", email: "sarah@example.com" },
      { id: "cust-omar", name: "Omar Khan", email: "omar@example.com" },
    ],
    orders: [
      {
        id: "ord-1001",
        number: "NS-1001",
        customerId: "cust-sarah",
        customerName: "Sarah Miller",
        email: "sarah@example.com",
        status: "processing",
        total: 89.99,
        items: [
          { productId: "prod-bottle", name: "TrailLite Water Bottle", quantity: 1, price: 39.99 },
          { productId: "prod-light", name: "CampLight Mini", quantity: 1, price: 49.99 },
        ],
        eligibleForCancellation: true,
        eligibleForReturn: false,
        createdAt,
        agentActions: [],
      },
      {
        id: "ord-1002",
        number: "NS-1002",
        customerId: "cust-sarah",
        customerName: "Sarah Miller",
        email: "sarah@example.com",
        status: "processing",
        total: 429,
        items: [
          { productId: "prod-backpack", name: "SummitPro Backpack", quantity: 1, price: 249 },
          { productId: "prod-jacket", name: "AlpineShell Jacket", quantity: 1, price: 180 },
        ],
        eligibleForCancellation: true,
        eligibleForReturn: false,
        createdAt,
        agentActions: [],
      },
      {
        id: "ord-1003",
        number: "NS-1003",
        customerId: "cust-sarah",
        customerName: "Sarah Miller",
        email: "sarah@example.com",
        status: "shipped",
        total: 149,
        items: [{ productId: "prod-boots", name: "RidgeWalk Hiking Boots", quantity: 1, price: 149 }],
        eligibleForCancellation: false,
        eligibleForReturn: false,
        createdAt,
        agentActions: [],
      },
      {
        id: "ord-1004",
        number: "NS-1004",
        customerId: "cust-omar",
        customerName: "Omar Khan",
        email: "omar@example.com",
        status: "delivered",
        total: 229,
        items: [{ productId: "prod-tent", name: "TrailNest Tent", quantity: 1, price: 229 }],
        eligibleForCancellation: false,
        eligibleForReturn: true,
        createdAt,
        agentActions: [],
      },
    ],
    receipts: [],
    agentLogs: [],
    adminPasswordHash: hashSync("Password123!", 12),
  };
}

function ensureDataDir() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
}

export function resetStore() {
  ensureDataDir();
  writeFileSync(storeFile, JSON.stringify(seedData(), null, 2));
  writeFileSync(configFile, JSON.stringify(defaultAdminConfig, null, 2));
}

export function readStore(): StoreData {
  ensureDataDir();

  if (!existsSync(storeFile)) {
    resetStore();
  }

  return JSON.parse(readFileSync(storeFile, "utf8")) as StoreData;
}

export function writeStore(data: StoreData) {
  ensureDataDir();
  writeFileSync(storeFile, JSON.stringify(data, null, 2));
}

export function readAdminConfig(): AdminConfig {
  ensureDataDir();

  if (!existsSync(configFile)) {
    writeFileSync(configFile, JSON.stringify(defaultAdminConfig, null, 2));
  }

  return { ...defaultAdminConfig, ...(JSON.parse(readFileSync(configFile, "utf8")) as AdminConfig) };
}

export function writeAdminConfig(config: AdminConfig) {
  ensureDataDir();
  writeFileSync(configFile, JSON.stringify(config, null, 2));
}

export function safeAdminConfig(config = readAdminConfig()) {
  return {
    agentGateBaseUrl: config.agentGateBaseUrl,
    agentId: config.agentId,
    environment: config.environment,
    keyConfigured: Boolean(config.agentGateApiKey),
    keyPrefix: config.agentGateApiKey ? config.agentGateApiKey.slice(0, 17) : null,
  };
}

export function findOrder(orderNumber: string, email: string) {
  const store = readStore();

  return store.orders.find(
    (order) =>
      order.number.toLowerCase() === orderNumber.toLowerCase() &&
      order.email.toLowerCase() === email.toLowerCase(),
  );
}

export function updateOrder(updated: Order) {
  const store = readStore();
  store.orders = store.orders.map((order) => (order.id === updated.id ? updated : order));
  writeStore(store);
}

export function addAgentLog(log: AgentLog) {
  const store = readStore();
  store.agentLogs = [log, ...store.agentLogs].slice(0, 200);
  writeStore(store);
}
