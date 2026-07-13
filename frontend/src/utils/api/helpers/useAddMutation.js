'use client'
import { useMutation } from '@tanstack/react-query';
import useAxios from './useAxios';

import { toast } from 'react-toastify';

import useAuthState from '@/states/AuthState';
import AxiosEnum from '@/enums/AxiosEnum';


function useAddMutation(
  key,
  url,
  message = '',
) {
  const axios = useAxios();
    const {logout} = useAuthState()
   
  return useMutation({
    mutationFn: async (dataToSend) => {
      const response = await axios.post(url, dataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          [AxiosEnum.HEADER_KEY]: key,
          [AxiosEnum.HEADER_CUSTOM_MESSAGE]: message,
        },
      });
      
      return response.data;
    },
    
    onError: (error) => {
      const status = error.response?.status;
      if (status === 403 ) {
        toast.error("please_login_first")
        
        logout()
      }else if (status === 409){
        toast.error("not_have_mony")
      }
      
      else{        

        toast.error(error?.response?.data?.message || "something_went_wrong")

      }
      return error; // Preserve the original error for further handling
    },
  });

}


export default useAddMutation;

