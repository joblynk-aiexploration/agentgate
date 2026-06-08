import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import {
  createCustomerUser,
  createSession,
  deleteSession,
  findUserByEmail,
  findUserById,
  findValidSession,
  mergeAnonymousCartIntoUserCart,
} from "@/lib/store";

const customerCookieName = "northstar_customer_session";
export const cartCookieName = "northstar_cart_id";

export async function getCurrentCustomer() {
  const cookieStore = await cookies();
  const session = findValidSession(cookieStore.get(customerCookieName)?.value, "customer");

  if (!session) {
    return null;
  }

  const user = findUserById(session.userId);

  if (!user || user.role !== "customer") {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function requireCustomer(returnTo = "/account") {
  const customer = await getCurrentCustomer();

  if (!customer) {
    throw new Error(`AUTH_REQUIRED:${returnTo}`);
  }

  return customer;
}

export async function loginCustomer(email: string, password: string) {
  const user = findUserByEmail(email);

  if (!user || user.role !== "customer" || !(await compare(password, user.passwordHash))) {
    return null;
  }

  const session = createSession(user.id, "customer");
  const cookieStore = await cookies();
  const anonymousCartId = cookieStore.get(cartCookieName)?.value;
  mergeAnonymousCartIntoUserCart(anonymousCartId, user.id);
  cookieStore.set(customerCookieName, session.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  cookieStore.delete(cartCookieName);

  return user;
}

export async function registerCustomer(input: { name: string; email: string; password: string }) {
  const user = createCustomerUser({
    name: input.name,
    email: input.email,
    passwordHash: await hash(input.password, 12),
  });
  await loginCustomer(user.email, input.password);

  return user;
}

export async function logoutCustomer() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(customerCookieName)?.value;

  if (sessionId) {
    deleteSession(sessionId);
  }

  cookieStore.delete(customerCookieName);
}

export async function getRequestCartOwner() {
  const customer = await getCurrentCustomer();
  const cookieStore = await cookies();

  if (customer) {
    return { customer, owner: { userId: customer.id } };
  }

  return { customer: null, owner: { cartId: cookieStore.get(cartCookieName)?.value } };
}

export async function setAnonymousCartCookie(cartId: string) {
  const cookieStore = await cookies();
  cookieStore.set(cartCookieName, cartId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
