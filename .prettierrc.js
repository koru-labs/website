module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 120,
  tabWidth: 4,
  useTabs: false,
  overrides: [
    {
      files: '*.sol',
      options: {
        printWidth: 120,
        tabWidth: 4,
        useTabs: false,
        singleQuote: false,
        bracketSpacing: false,
        explicitTypes: 'always',
      },
    },
  ],
};
