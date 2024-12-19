import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "path";

export default [{
    files: ["**/*.ts", "**/*.js"],
    ignores: [
        "**/node_modules/**", 
        "**/out/**", 
        "**/dist/**", 
        "**/.bak/**"
    ],
}, {
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },
    languageOptions: {
        parser: tsParser,
        parserOptions: {
            project: [
                path.resolve("./tsconfig.json"),
                path.resolve("./behaviour/integration/tsconfig.json")
            ],
            tsconfigRootDir: path.resolve("."),
        },
        ecmaVersion: 2022,
        sourceType: "module",
    },
    rules: {
        "@typescript-eslint/naming-convention": ["warn", {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        }],
        "curly": ["warn", "all"],
        "eqeqeq": "warn",
        "no-throw-literal": "warn",
        "semi": "warn",
        // Add Cucumber-specific rules
        "@typescript-eslint/no-unused-expressions": "off", // For Cucumber expressions
        "@typescript-eslint/explicit-function-return-type": "off" // For step definitions
    },
}];