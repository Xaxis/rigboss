import { SERVICE_NAME, SERVICE_VERSION } from "./constants.js";
import type { ApiResponse } from "./types.js";

export function ok<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
  };
}

export function fail(message: string): ApiResponse<never> {
  return {
    success: false,
    error: message,
    timestamp: Date.now(),
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
  };
}

