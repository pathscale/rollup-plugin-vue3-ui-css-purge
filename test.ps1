$target = "example-tailwind"
$command = "build"
$projRoot = "D:\CodeProjects"

Set-Location $projRoot\rollup-plugin-vue3-ui-css-purge
pnpm run prepublishOnly

Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $projRoot\$target\node_modules\@pathscale\rollup-plugin-vue3-ui-css-purge\dist
Move-Item $projRoot\rollup-plugin-vue3-ui-css-purge\dist $projRoot\$target\node_modules\@pathscale\rollup-plugin-vue3-ui-css-purge\dist

Set-Location $projRoot\$target\
pnpm run $command
.\node_modules\.bin\serve dist