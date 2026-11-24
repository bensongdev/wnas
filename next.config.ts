import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // server-example:start
  // PGlite(로컬 DB)는 WASM 파일을 읽으므로 번들하지 않고 node_modules에서 그대로 불러온다.
  serverExternalPackages: ["@electric-sql/pglite"],
  // server-example:end
  // 프로젝트 폴더를 루트로 고정한다. 상위 폴더(예: 홈)에 다른 lockfile이 있어도 그쪽을 루트로 잡지 않는다.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
