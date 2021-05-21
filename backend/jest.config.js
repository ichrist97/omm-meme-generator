const esModules = ["meme-generator-lib"].join("|");

module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    ".+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$": "identity-obj-proxy",
  },
  transformIgnorePatterns: ["<rootDir>/node_modules", "/node_modules/"],
  modulePathIgnorePatterns: ["<rootDir>/node_modules/", "/node_modules/", "../lib"],
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
