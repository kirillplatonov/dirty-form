import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import buble from "@rollup/plugin-buble";
import terser from "@rollup/plugin-terser";
import pkg from "./package.json" assert { type: "json" };

const banner =
`/*!
 * DirtyForm v${pkg.version}
 * ${pkg.description}
 * ${pkg.repository.url}
 * ${pkg.license} License
 */
`;

const minBanner = `/*! DirtyForm v${pkg.version} | ${pkg.license} License */`;

export default {
  input: "src/index.js",
  output: [
    {
      name: "DirtyForm",
      file: "dist/dirty-form.js",
      format: "umd",
      banner: banner,
      plugins: [
        resolve(),
        commonjs(),
        buble()
      ]
    },
    {
      name: "DirtyForm",
      file: "dist/dirty-form.min.js",
      format: "umd",
      banner: minBanner,
      plugins: [
        resolve(),
        commonjs(),
        buble(),
        terser()
      ]
    },
    {
      file: "dist/dirty-form.esm.js",
      format: "es",
      banner: banner,
      plugins: [
        buble()
      ]
    }
  ]
}
