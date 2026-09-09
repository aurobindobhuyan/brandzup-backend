import { Request, Response } from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import {
  GATEWAY_HEADER_PERMISSION,
  GATEWAY_HEADER_USER_ID,
  GATEWAY_HEADER_WORKSPACE_ID,
  GATEWAY_TOKEN_HEADER,
} from "packages";

const ORG_SERVICE_URL = process.env.ORG_SERVICE_URL!;

export const orgProxy = createProxyMiddleware<Request, Response>({
  target: ORG_SERVICE_URL,
  changeOrigin: true,
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

      if (req.headers[GATEWAY_HEADER_WORKSPACE_ID]) {
        proxyReq.setHeader(
          GATEWAY_HEADER_WORKSPACE_ID,
          req.headers[GATEWAY_HEADER_WORKSPACE_ID] as string,
        );
      }

      if (req.headers[GATEWAY_HEADER_PERMISSION]) {
        proxyReq.setHeader(
          GATEWAY_HEADER_PERMISSION,
          req.headers[GATEWAY_HEADER_PERMISSION] as string,
        );
      }
    },
  },
});
