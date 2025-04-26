$manager = "bun"

$disabledList = @(
    "vue-composable"

    "shadow-flux"
)

$nextList = @(
    "vue-composable"

    "vue"
    "vuex"
    "vue-router"
    "rollup-plugin-vue"
    "rolldown-plugin-vue"
    "@vue/compiler-sfc"

    "@pathscale/vue3-ui"
    "@pathscale/bulma-css-var-only"
    "@pathscale/bulma-extensions-css-var"
    "@pathscale/bulma-pull-2981-css-var-only"
)

$disabled = $disabledList -join ","
$next = $nextList -join ","

ncu -u --dep "prod,dev" --concurrency 16 -x $disabled
ncu -u --dep "prod,dev" --concurrency 16 --target newest -f $next
sort-package-json
wsl rm -rf node_modules package-lock.json yarn.lock pnpm-lock.yaml bun.lock
Invoke-Expression "${manager} i"
