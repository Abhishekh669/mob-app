import { getErrorMessage } from "@/utils/helper/get-error-message";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface MenuItemsResponse {
  id: string
  category_name: string
  category_slug: string
  name: string
  description?: string | null
  price: number
  category_id: string
  is_available: boolean
  image_url?: string | null
  display_order: number
  created_at: string
  updated_at: string
}


export type CategoryMenuGroup = {
  category_name: string
  category_slug: string
  menu_items: MenuItemsResponse[]
}

export type GroupedMenuResponse = {
  [slug: string]: CategoryMenuGroup
}

export interface GroupedApiResponse {
    success : boolean;
    grouped_menu : GroupedMenuResponse
}

export const fetchCachedMenuItems = async () => {
  try {

    const res = await axios.get(`${process.env.EXPO_PUBLIC_BACKEND_URL}/get-menu-n-categories`)

    const data  : GroupedApiResponse  = res.data;
    const groupedmenu = data?.grouped_menu as GroupedMenuResponse;
    return {
        success : data?.success,
        grouped_menu : groupedmenu
    };
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export const useGetCachedMenuItems = (pooling ?: boolean) => {
  return useQuery({
    queryKey: ["get-cached-menu-items"],
    queryFn:  fetchCachedMenuItems,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchInterval : pooling ? 30 * 1000 : false,
    retryDelay: 1000,
    meta : {
      persist : true
    }
  });
}