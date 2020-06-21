declare module "download-git-repo" {
  export default function (url: string, dir: string, options: unknown, cb: () => void): void;
}
