declare module "@fullhuman/postcss-purgecss" {
  import { PluginCreator } from "postcss";
  type RawContent<T = string> = { extension: string; raw: T };
  type ExtractorFunction<T = string> = (content: T) => string[];
  type Safelist = (RegExp | string)[] | ComplexSafelist;
  type Extractors = { extensions: string[]; extractor: ExtractorFunction };

  type ComplexSafelist = {
    standard?: (RegExp | string)[];
    deep?: RegExp[];
    greedy?: RegExp[];
    variables?: (RegExp | string)[];
    keyframes?: (RegExp | string)[];
  };

  type Options = {
    content?: (string | RawContent)[];
    contentFunction?: (sourceFile: string) => (string | RawContent)[];
    defaultExtractor?: ExtractorFunction;
    extractors?: Extractors[];
    fontFace?: boolean;
    keyframes?: boolean;
    output?: string;
    rejected?: boolean;
    stdin?: boolean;
    stdout?: boolean;
    variables?: boolean;
    safelist?: Safelist;
    blocklist?: (RegExp | string)[];
  };

  const plugin: PluginCreator<Options>;
  export default plugin;
}
