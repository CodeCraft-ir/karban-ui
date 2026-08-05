import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // False-positives with @gsap/react's `contextSafe(...)`: handlers are
      // created during render but only read refs at event time (documented
      // GSAP pattern: https://gsap.com/resources/React).
      "react-hooks/refs": "off",
      // The mounted-guard pattern (`useEffect(() => setMounted(true), [])`)
      // is intentional in portaled components and the theme toggle: they must
      // render nothing / a neutral shape on the server and only mount client
      // UI after hydration (documented next-themes + portal hydration fix).
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
