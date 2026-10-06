# vendor

Third-party code the game ships with. Nothing here is edited by hand.

| File | What it is |
| --- | --- |
| `ink-full.js` | inkjs 2.4.0 (runtime and compiler), the ES module build. Upstream it is `dist/ink-full.mjs` in the npm package `inkjs@2.4.0` (https://github.com/y-lohse/inkjs); only the trailing source-map comment was removed. |
| `inkjs-license.md` | inkjs's MIT licence, copied unchanged from the same package. |

To update inkjs, replace `ink-full.js` with the new version's `dist/ink-full.mjs`, keep the licence file in step, and update the version here and in `CREDITS.md`.
