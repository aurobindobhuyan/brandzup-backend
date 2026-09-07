import { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { GATEWAY_HEADER_USER_ID, GATEWAY_TOKEN_HEADER } from "packages";

const ORG_SERVICE_URL = process.env.ORG_SERVICE_URL!;

export const userProxy = createProxyMiddleware<Request, Response>({
  target: ORG_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => `/org${path}`,
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.setHeader(
        GATEWAY_HEADER_USER_ID,
        req.headers[GATEWAY_HEADER_USER_ID!] as string,
      );

      proxyReq.setHeader(
        GATEWAY_TOKEN_HEADER,
        req.headers[GATEWAY_TOKEN_HEADER!] as string,
      );
    },
  },
});
