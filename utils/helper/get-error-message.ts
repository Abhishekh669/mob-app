import axios from "axios";

export interface ApiErrorResponse {
  error: string;
  success: boolean;
  message?: string;
  statusCode?: number;
}

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Handle your Express.js backend error format
    if (error.response?.data?.error) {
      return error.response.data.error;
    }

    // Fallback to message if error field doesn't exist
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    // Handle case where data is a string
    if (typeof error.response?.data === "string") {
      return error.response.data;
    }

    // Default axios error message
    return error.message || "Network error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred";
};

// Enhanced version that returns full error details
export const getErrorDetails = (error: unknown): ApiErrorResponse => {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;

    // Handle your Express.js backend error format
    if (error.response?.data?.error) {
      return {
        error: error.response.data.error,
        success: false,
        message: error.response.data.message,
        statusCode
      };
    }

    // Fallback handling
    const errorMessage = error.response?.data?.message ||
      error.response?.data ||
      error.message ||
      "Network error occurred";

    return {
      error: typeof errorMessage === "string" ? errorMessage : "Network error occurred",
      success: false,
      statusCode
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      success: false
    };
  }

  if (typeof error === "string") {
    return {
      error,
      success: false
    };
  }

  return {
    error: "An unknown error occurred",
    success: false
  };
};