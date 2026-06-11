import { z } from "zod/v4";

export const DOMAIN_STATUS_OPTIONS = ["ACTIVE", "DISABLED"] as const;
export const DOMAIN_USAGE_STATUS_OPTIONS = [
  "AVAILABLE",
  "IN_USE",
  "DISABLED",
] as const;
export const DOMAIN_GROUP_STATUS_OPTIONS = ["ACTIVE", "DISABLED"] as const;

export const domainSchema = z.object({
  domain: z.string().trim().min(1, "Domain is required").max(253),
  domainGroupKey: z.string().trim().max(80).optional().or(z.literal("")),
  status: z.enum(DOMAIN_STATUS_OPTIONS).default("ACTIVE"),
});

export const domainGroupSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Key is required")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens"),
  name: z.string().trim().min(1, "Name is required").max(160),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  status: z.enum(DOMAIN_GROUP_STATUS_OPTIONS).default("ACTIVE"),
});
