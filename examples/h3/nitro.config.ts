import { defineNitroConfig } from 'nitropack/config';

export default defineNitroConfig({
  typescript: {
    strict: true,
  },
  experimental: {
    asyncContext: true,
  },
  devServer: {
    port: 4000,
  },
});