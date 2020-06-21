const path = require("path");
const fs = require("fs-extra");
const fg = require("fast-glob");
// const htmlparser2 = require("htmlparser2");

const repoDir = path.join(__dirname, "ui");
const srcDir = path.join(repoDir, "src");

// const rollup = require("rollup");
// const vue = require("rollup-plugin-vue");

/**
 * @param {string} url
 * @param {string} dir
 */
const downloadAsync = (url, dir) =>
  new Promise(resolve => require("download-git-repo")(url, dir, {}, resolve));

/** @type {Map<string,string[]>} */
const mappings = new Map();

/**
 * @param  {...string} paths
 */
function normalizePath(...paths) {
  const f = path.join(...paths).replace(/\\/g, "/");
  if (/^\.[/\\]/.test(paths[0])) return `./${f}`;
  return f;
}

// /** @type {string[]} */
// const whitelist = [];

// const parser = new htmlparser2.Parser(
//   {
//     onattribute(name, data) {
//       if (name === "class") whitelist.push(data);
//       if (name === "id") whitelist.push(data);
//     },
//   },
//   { decodeEntities: true },
// );

async function gatherMappings() {
  fs.removeSync(repoDir);
  await downloadAsync("pathscale/vue3-ui", repoDir);

  const pattern = normalizePath(path.join(srcDir, "**", "*.vue"));
  const vueFiles = await fg(pattern);

  for (const file of vueFiles) {
    const { name } = path.parse(file);
    const source = fs.readFileSync(file, "utf-8");
    console.log(name, source.slice(0, 80));
  }
  console.log(vueFiles);

  return mappings;
}

gatherMappings().then(m => console.log(m));
