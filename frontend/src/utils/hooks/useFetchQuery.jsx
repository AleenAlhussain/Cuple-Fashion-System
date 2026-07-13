import { useQuery } from "@tanstack/react-query";
const useFetchQuery = (queryKey, queryFn, options = {}) => {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  });   
};

export default useFetchQuery;
