import { getRestaurantInformation } from "@/utils/actions/setting/setting.get";
import { keepPreviousData, useQuery } from "@tanstack/react-query";


export const fetchRestaruantInfo = async () => {
  const res = await getRestaurantInformation();
  return res;
}

export const useGetRestaurantInformation = () => {
  return useQuery({
    queryKey: ["get-restaurant-information"],
    queryFn: fetchRestaruantInfo,
    placeholderData: keepPreviousData,
  });
}