"use client";
import axios from "axios";
import useAuthState from "@/states/AuthState";
import { normalizeMediaUrlsDeep } from "@/utils/mediaUrl";

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.cuple.shop/api",
  headers: {
    Accept: "application/json",
  },
  timeout: 30000,
  withCredentials: true, // Required for session-based compare API
});

const request = async ({ ...options }) => {
  const token = useAuthState.getState()?.token;
  if (token) {
    client.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common.Authorization;
  }

  const onSuccess = (response) => {
    if (response?.data) {
      response.data = normalizeMediaUrlsDeep(response.data);
    }
    return response;
  };

  const onError = (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      useAuthState.getState()?.logout?.();
    }

    if (process.env.NODE_ENV === "development") {
      console.error("API Error:", {
        url: options?.url,
        status,
        message: error?.response?.data?.message || error?.message,
        errorCode: error?.code,
        errorName: error?.name,
        fullError: error,
      });
    }

    return error;
  };

  try {
    const response = await client(options);
    return onSuccess(response);
  } catch (error) {
    return onError(error);
  }
};

export default request;
