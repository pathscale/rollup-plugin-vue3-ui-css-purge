# @pathscale/rollup-plugin-vue3-ui-css-purge

Purger plugin for rollup hand crafted to match vue3-ui needs

## Usage

Import plugin and register plugin in _rollup.config.js_

    import vue3uiPurge from "@pathscale/rollup-plugin-vue3-ui-css-purge";

    export default [
        {
            input: "src/index.js",
            output: {
                file: "dist/bundle.js",
                format: "iife",
            },
            plugins: [
                vue3uiPurge(),
            vue()
            ]
        }
    ]

## Limitations

Any css you write must follow these rules for the purger to work correctly:

- Every css variable that depends on other variables will have be to be declared after their dependants
- Whenever commas are used to separate selectors, if one of those selectors it's body, it must go last
