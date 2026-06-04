import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name is required.")
    .max(80, "Organization name is too long."),
  name: z
    .string()
    .trim()
    .min(2, "Name is required.")
    .max(80, "Name is too long."),
  email: emailSchema,
  password: passwordSchema,
});

export function slugifyOrganizationName(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return slug || "organization";
}
