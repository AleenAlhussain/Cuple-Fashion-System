'use client'
import { useMutation } from '@tanstack/react-query';
import useAxios from './useAxios';
import AxiosEnum from '@/enums/AxiosEnum';

function useDeleteMutation(
  key,
  url,
  message = '',
  showMessage = true
) {
  const axios = useAxios();

  return useMutation({
    mutationFn: async (dataToSend) => {
      const { data } = await axios.delete(
        `${url}/${dataToSend.id}`,
        {
          headers: {
            [AxiosEnum.HEADER_KEY]: key,
            [AxiosEnum.HEADER_CUSTOM_MESSAGE]: message,
            [AxiosEnum.ADD_MESSAGE] : showMessage
          },
        },
      );
      return data;
    },
  });
}

export default useDeleteMutation;

