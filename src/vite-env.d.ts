/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.geojson' {
  const value: unknown;
  export default value;
}

declare module '*.geojson?raw' {
  const value: string;
  export default value;
}
