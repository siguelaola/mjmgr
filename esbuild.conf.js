const { build } = require("esbuild");
const { dependencies } = require("./package.json");

build({
	entryPoints: ["src/index.ts"],
	outdir: "dist",
	platform: "node",
	bundle: true,
	external: Object.keys(dependencies),
	target: "node16",
});
