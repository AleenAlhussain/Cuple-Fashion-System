const AxiosEnum = {
  //BASEURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.cuple.shop/api/website',
  BASEURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.cuple.shop/api',
  RESPONSE_TYPE: 'json',
  TIMEOUT: 60000,
  BEARER: 'Bearer ',
  HEADER_KEY: 'X-Key',
  HEADER_CUSTOM_MESSAGE: 'X-Custom-Message',
  ADD_MESSAGE: 'X-Add-Message',
};

export default AxiosEnum;

