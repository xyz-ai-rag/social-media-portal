module.exports = {
  "extends": [
    "next/core-web-vitals",
    "next/typescript",
    "plugin:storybook/recommended"
  ],
  "rules": {
   // Disable unused variables and imports checks
   'no-unused-vars': 'off',
   '@typescript-eslint/no-unused-vars': 'off',

   // Allow the use of `any`
   '@typescript-eslint/no-explicit-any': 'off',
    
  }
}