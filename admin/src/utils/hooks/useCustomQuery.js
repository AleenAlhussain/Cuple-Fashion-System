import { useQuery } from "@tanstack/react-query";

const useCustomQuery = (queryKey, queryFn, options = {}) => {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  });
};

export default useCustomQuery;
