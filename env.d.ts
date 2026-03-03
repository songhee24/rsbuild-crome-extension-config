/// <reference types="@rsbuild/core/types" />

// Rspack/Webpack runtime variable for dynamic publicPath
declare let __webpack_public_path__: string;

// Allow dynamic import with string variable
declare function importScripts(...urls: string[]): void;
