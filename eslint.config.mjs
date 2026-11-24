import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  {
    rules: {
      // Carregar dados dentro de um efeito é o padrão deste app (tudo roda no navegador).
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    "supabase/functions/**",
    'referencia/**',
    'public/sw.js',
    'scripts/gerar-icones.cjs',
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
