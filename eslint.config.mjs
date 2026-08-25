import next from "eslint-config-next/core-web-vitals";

const config = [
  ...next,
  {
    ignores: ["reference/**", "node_modules/**", ".next/**", "coverage/**"],
  },
];

export default config;
