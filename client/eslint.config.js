import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    ...js.configs.recommended,
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^[A-Z_]',
          varsIgnorePattern: '^[A-Z_]|motion',
          caughtErrorsIgnorePattern: '^_|err|e',
        },
      ],
    },
  },
  {
    files: ['tailwind.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
]
