import { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { GATEWAY_HEADER_USER_ID, GATEWAY_TOKEN_HEADER } from "packages";

const USER_SERVICE_URL = process.env.USER_SERVICE_URL!;

export const userProxy = createProxyMiddleware<Request, Response>({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => `/user${path}`,
  on: {
    proxyReq: (proxyReq, req) => {
      if (req.headers[GATEWAY_HEADER_USER_ID]) {
        proxyReq.setHeader(
          GATEWAY_HEADER_USER_ID,
          req.headers[GATEWAY_HEADER_USER_ID] as string,
        );
      }

      if (req.headers[GATEWAY_TOKEN_HEADER]) {
        proxyReq.setHeader(
          GATEWAY_TOKEN_HEADER,
          req.headers[GATEWAY_TOKEN_HEADER!] as string,
        );
      }
    },
  },
});
