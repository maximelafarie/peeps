import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import svelte from "eslint-plugin-svelte";
import svelteEslintParser from "svelte-eslint-parser";

const commonRules = {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console": ["error", { allow: ["info", "debug", "warn", "error"] }]
}

export default [
    {
        ignores: [
            "node_modules",
            "dist"
        ]
    },
    js.configs.recommended,
    {
        files: ["**/*.{js,ts}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module"
            },
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        plugins: {
            "@typescript-eslint": tsPlugin
        },
        rules: {
            ...commonRules,
            ...tsPlugin.configs.recommended.rules
        }
    },
    {
        files: ["**/*.svelte"],
        plugins: {
            svelte
        },
        languageOptions: {
            parser: svelteEslintParser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                parser: tsParser
            },
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            ...commonRules,
            "svelte/no-at-html-tags": "warn",
            "svelte/no-unused-svelte-ignore": "warn",
            "svelte/valid-compile": "error"
        }
    }
];
