import { getAllApprovalRequest } from "@/utils/actions/approval-request/approval.get";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const fetchRequests = async () => {
  const res = await getAllApprovalRequest();
  return res;
}

export const useGetFetchApprovalRequests = (pooling ?: boolean) => {
  return useQuery({
    queryKey: ["get-approval-requests"],
    queryFn:  fetchRequests,
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