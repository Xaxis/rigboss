import { z } from "zod";

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: z.number(),
    service: z.string(),
    version: z.string(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  service: string;
  version: string;
};

export const ServiceStatusEnum = z.enum(["healthy", "degraded", "unhealthy"]);
export type ServiceStatus = z.infer<typeof ServiceStatusEnum>;

export const ServiceHealthSchema = z.object({
  name: z.string(),
  version: z.string(),
  status: ServiceStatusEnum,
  uptimeSec: z.number(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ServiceHealth = z.infer<typeof ServiceHealthSchema>;

export const ServiceEndpointSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string(),
  description: z.string().optional(),
});
export type ServiceEndpoint = z.infer<typeof ServiceEndpointSchema>;

export const ServiceMetadataSchema = z.object({
  name: z.string(),
  version: z.string(),
  endpoints: z.array(ServiceEndpointSchema).optional(),
});
export type ServiceMetadata = z.infer<typeof ServiceMetadataSchema>;

