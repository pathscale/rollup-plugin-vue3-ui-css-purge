/** `@pathscale/rollup-vue3-ui-css-purge`'s full option list */
export interface Options {
  /**
   * Files to include for processing
   * @default /\.vue$/
   */
  include?: ReadonlyArray<string | RegExp> | string | RegExp | null;
  /**
   * Files to exclude from processing
   * @default ["**\\node_modules\\**"]
   */
  exclude?: ReadonlyArray<string | RegExp> | string | RegExp | null;
}

/** Parsed Vue SFC query */
export type Query =
  | { vue: false }
  | { filename: string; vue: true; type: "custom"; index?: number; src: boolean }
  | { filename: string; vue: true; type: "template"; id?: string; src: boolean }
  | { filename: string; vue: true; type: "script"; src: boolean }
  | {
      filename: string;
      vue: true;
      type: "style";
      index?: number;
      id?: string;
      scoped?: boolean;
      module?: string | boolean;
      src: boolean;
    };
