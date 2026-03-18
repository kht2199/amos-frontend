import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginReactQuery } from "@kubb/plugin-react-query";
import { pluginTs } from "@kubb/plugin-ts";

const excludeTags = [{ type: "tag" as const, pattern: /^Notification$/ }];

export default defineConfig({
	input: {
		path: "http://localhost:8080/v3/api-docs",
	},
	output: {
		path: "./src/api",
		clean: true,
		format: "biome",
		lint: "biome",
	},
	plugins: [
		pluginOas(),
		pluginClient({
			output: { path: "clients" },
			exclude: excludeTags,
			group: { type: "tag" },
		}),
		pluginTs({
			output: { path: "models" },
			exclude: excludeTags,
			group: { type: "tag" },
		}),
		pluginReactQuery({
			output: { path: "hooks" },
			exclude: excludeTags,
			group: { type: "tag" },
		}),
	],
});
