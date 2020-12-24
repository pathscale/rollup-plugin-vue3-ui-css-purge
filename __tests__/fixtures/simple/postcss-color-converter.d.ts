declare module "postcss-color-converter" {
  import { PluginCreator } from "postcss";
  export type Options = {
    /**
     * Set output color format.
     * @default ''
     */
    outputColorFormat: "hex" | "rgb" | "hsl";
    /**
     * Array of color formats, which you do not want to convert.
     * @default []
     */
    ignore?: [];
    /**
     * If true, output RGB and HSL colors will always have alpha chanel value (which will be equal to 1), even if converted from color without alpha chanel. This parameter does not apply to HEX color.
     * If ignore includes outputColorFormat color format, this parameter will be ignore.
     * @default false
     */
    alwaysAlpha?: boolean;
  };
  const plugin: PluginCreator<Options>;
  export default plugin;
}
