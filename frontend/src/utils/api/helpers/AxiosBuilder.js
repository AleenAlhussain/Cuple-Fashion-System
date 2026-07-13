import axios from 'axios';

class AxiosBuilder {
  constructor() {
    this.baseURL = '';
    this.headers = {};
    this.timeout = 60000;
    this.responseType = 'json';
  }

  withBaseURL(baseURL) {
    this.baseURL = baseURL;
    return this;
  }

  withHeaders(headers) {
    this.headers = { ...this.headers, ...headers };
    return this;
  }

  withTimeout(timeout) {
    this.timeout = timeout;
    return this;
  }

  withResponseType(responseType) {
    this.responseType = responseType;
    return this;
  }

  withCredentials(value = true) {
    this.withCredentialsValue = value;
    return this;
  }

  build() {
    const config = {
      baseURL: this.baseURL,
      headers: this.headers,
      timeout: this.timeout,
      responseType: this.responseType,
      withCredentials: this.withCredentialsValue ?? true, // Enable cookies/sessions by default
    };

    return axios.create(config);
  }
}

export default AxiosBuilder;

