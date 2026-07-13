'use client'
import { useMemo } from 'react';
import AxiosBuilder from './AxiosBuilder';
import useAuthState from '@/states/AuthState';
import AxiosEnum from '@/enums/AxiosEnum';
import { normalizeMediaUrlsDeep } from '@/utils/mediaUrl';

function useAxios() {
  const { token, isAuthenticated, logout } = useAuthState();

  const axiosInstance = useMemo(() => {
    const builder = new AxiosBuilder()
      .withBaseURL(AxiosEnum?.BASEURL)
      .withResponseType(AxiosEnum.RESPONSE_TYPE)
      .withTimeout(AxiosEnum.TIMEOUT)
      .withHeaders({ Accept: 'application/json', 'Content-Type': 'application/json' });

    if (isAuthenticated) {
      builder.withHeaders({
        Authorization: AxiosEnum.BEARER + token,
      });
    }

    const axios = builder.build();

    axios.interceptors.response.use(
      (response) => {
        if (response?.data) {
          response.data = normalizeMediaUrlsDeep(response.data);
        }
        return response;
      },
      (error) => {
        const status = error?.response?.status;

        if (status === 401 && typeof logout === 'function') {
          logout();
        }

        return Promise.reject(error);
      }
    );

    return axios;
  }, [isAuthenticated, logout, token]);

  return axiosInstance;
}

export default useAxios;
