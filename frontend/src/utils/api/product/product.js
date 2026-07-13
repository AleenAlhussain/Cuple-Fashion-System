"use client";
import {
  useAddMutation,
  useDeleteMutation,
  useGetQuery,
  useGetQueryPagination,
  useUpdateFormMutation,
} from "../helpers/index";

const API = {
  GET: "/products",
  GET_ONE: "/products/",
  ADD: "/products",
  DELETE: "/products",
  UPDATE: "/products",
};

const KEY = "products";

export const useGetProducts = (params, options) =>
  useGetQueryPagination(KEY, API.GET, params, options);
export const useGetOneProduct = (params, options) =>
  useGetQuery(KEY, API.GET_ONE + params.id, params, options);
export const useAddProducts = () => useAddMutation(KEY, API.ADD);
export const useUpdateProducts = () => useUpdateFormMutation(KEY, API.UPDATE);

export const useDeleteProducts = () => useDeleteMutation(KEY, API.DELETE);
