import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import pkg from "./package.json" with { type: "json" };

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
  plugins: [
    babel({
      babelHelpers: 'bundled',
      presets: ['@babel/preset-env']
    })
  ],
  output: [
    {
      name: "DirtyForm",
      file: "dist/dirty-form.js",
      format: "umd",
      banner: banner
    },
    {
      name: "DirtyForm",
      file: "dist/dirty-form.min.js",
      format: "umd",
      banner: minBanner,
      plugins: [
        terser()
      ]
    },
    {
      file: "dist/dirty-form.esm.js",
      format: "es",
      banner: banner
    }
  ]
}
