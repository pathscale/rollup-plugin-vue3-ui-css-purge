declare module "@fullhuman/postcss-purgecss" {
  import { PluginCreator } from "postcss";
  type StringRegExpArray = Array<RegExp | string>;
  type RawContent<T = string> = { extension: string; raw: T };
  type ExtractorFunction<T = string> = (content: T) => string[];
  type Safelist = StringRegExpArray | ComplexSafelist;
  type Extractors = { extensions: string[]; extractor: ExtractorFunction };

  type ComplexSafelist = {
    standard?: StringRegExpArray;
    deep?: RegExp[];
    greedy?: RegExp[];
    variables?: StringRegExpArray;
    keyframes?: StringRegExpArray;
  };

  type Options = {
    content?: Array<string | RawContent>;
    contentFunction?: (sourceFile: string) => Array<string | RawContent>;
    defaultExtractor?: ExtractorFunction;
    extractors?: Array<Extractors>;
    fontFace?: boolean;
    keyframes?: boolean;
    output?: string;
    rejected?: boolean;
    stdin?: boolean;
    stdout?: boolean;
    variables?: boolean;
    safelist?: Safelist;
    blocklist?: StringRegExpArray;
  };

  const plugin: PluginCreator<Options>;
  export default plugin;
}
