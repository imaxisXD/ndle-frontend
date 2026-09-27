// MDX posts import their JSX runtime through these .ts files (next.config.ts
// sets jsxImportSource). With webpack, Next only applies the React Server
// Components layer to JS/TS files, so a .mdx file importing "react/jsx-runtime"
// directly gets the client runtime and the dev server fails with "Cannot read
// properties of undefined (reading 'recentlyCreatedOwnerStacks')". Re-exported
// from a .ts file, the runtime resolves to the server build.
export { Fragment, jsx, jsxs } from "react/jsx-runtime";
