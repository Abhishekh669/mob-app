import { getOrderRequests } from "@/utils/actions/order/order.get";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const fetchOrderRequests = async () => {
  const res = await getOrderRequests();
  
  return res;
}

export const useGetOrderRequests = (pooling ?: boolean) => {
  return useQuery({
    queryKey: ["get-order-requests"],
    queryFn:  fetchOrderRequests,
    placeholderData: keepPreviousData,
    refetchInterval : pooling ? 5000 : false,
    refetchIntervalInBackground: pooling ? true : false, // Continue polling when tab is in background
    gcTime: 5 * 60 * 1000, // 5 minutes - garbage collection time (formerly cacheTime)
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: !pooling, // Don't refetch on window focus if polling
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 30 * 1000,
  });
}