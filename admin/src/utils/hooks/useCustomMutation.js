import { useMutation } from "@tanstack/react-query";

const useCustomMutation = (mutationFn, options = {}) => {
  return useMutation({
    mutationFn,
    ...options,
  });
};

export default useCustomMutation;
