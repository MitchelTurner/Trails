/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_FORMSPREE_SIGNON?: string;
  readonly PUBLIC_FORMSPREE_REPORT?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_PLAUSIBLE_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
