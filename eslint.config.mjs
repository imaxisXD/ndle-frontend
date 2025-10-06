import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tailwind from "eslint-plugin-tailwindcss";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...
  "tailwindcss/no-custom-classname": [<enabled>, {
    "callees": Array<string>,
    "config": <string>|<object>,
    "cssFiles": Array<string>,
    "cssFilesRefreshRate": <number>,
    "skipClassAttribute": <boolean>,
    "tags": Array<string>,
    "whitelist": Array<string>,
  }]
  ...
  
  ...tailwind.configs["flat/recommended"],
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
