'use client'
import { useMutation } from '@tanstack/react-query';
import useAxios from './useAxios';
import AxiosEnum from '@/enums/AxiosEnum';


function useUpdateFormMutation(
  key,
  url,
  message = '',
  showMessage = true
) {
  const axios = useAxios();

  return useMutation({
    mutationFn: async (dataToSend) => {
      const { id, newData } = dataToSend;
      const newUrl = `${url}/${id}`;
      const MutateData = newData instanceof FormData ? newData : { ...newData };
      const { data } = await axios.putForm(
        newUrl,
        MutateData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
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

export default useUpdateFormMutation;

