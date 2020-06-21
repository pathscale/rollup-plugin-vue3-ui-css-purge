ncu -u --dep prod,dev --concurrency 16

ncu -u --dep prod,dev --concurrency 16 -n -f `
@pathscale/vue3-ui,`
@pathscale/bulma-css-var-only,`
@vue/composition-api,`
@vue/compiler-sfc,`
@vue/runtime-dom,`
vue,`
vue-router,`
vuex,`
rollup-plugin-vue,`
vue-composable

sort-package-json
wsl rm -rf node_modules package-lock.json yarn.lock pnpm-lock.yaml
pnpm i
