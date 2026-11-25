/** @type {import('next').NextConfig} */
export default {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // Optional x402 payment deps pulled in by unused wallet connectors (@coinbase/cdp-sdk).
    for (const mod of ["@x402/core/client", "@x402/evm", "@x402/evm/exact/client", "@x402/evm/upto/client", "@x402/svm/exact/client"]) {
      config.resolve.alias[mod] = false;
    }
    return config;
  },
};
