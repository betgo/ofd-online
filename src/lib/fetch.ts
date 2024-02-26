import VaildFetchError from '../errors/FetchErrors';

type FetchMethod = 'POST' | 'GET';

type FetchMode = 'no-cors' | 'cors' | 'same-origin';

type FetchCredentials = 'include' | 'same-origin' | 'omit';

type FetchCache =
  | 'default'
  | 'no-cache'
  | 'reload'
  | 'force-cache'
  | 'only-if-cached';
interface FetchHeader {
  [key: string]: string;
}

interface FetchOptions {
  method?: FetchMethod;
  headers?: FetchHeader;
  mode?: FetchMode;
  credentials?: FetchCredentials;
  cache?: FetchCache;
  body?: any;
}

export default async (url: string, data: any, options: FetchOptions) => {
  try {
    const {
      method = 'GET',
      mode = 'cors',
      cache = 'no-cache',
      credentials = 'same-origin',
      headers,
      body,
      ...restOpts
    } = options || {};
    const fetchOptions: FetchOptions = {
      method,
      mode,
      cache,
      credentials
    };
    if (method === 'POST') {
      fetchOptions.headers = { 'Content-type': 'application/json;' };
      fetchOptions.body = JSON.stringify(data);
    }
    Object.assign(fetchOptions, { ...restOpts });
    const response = await window.fetch(url, {
      ...fetchOptions
    });
    if (!response.ok) {
      throw new Error('Network response was not OK');
    }
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    if (response && contentType) {
      if (contentType.includes('application/xml')) {
        return response.text();
      }
      return response.arrayBuffer();
    }
  } catch (err) {
    return new VaildFetchError(500);
  }
  return new VaildFetchError(9999);
};
