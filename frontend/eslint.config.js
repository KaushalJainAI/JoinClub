import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  { ignores: ['dist'] },
  { files: ['*.config.js'], languageOptions: { globals: globals.node } },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      // Accessibility, aiming at WCAG 2.1 AA. "error" is reserved for the rules that stop a
      // keyboard or screen-reader user reaching something at all; the rest are warnings, so
      // the pages written before this rule existed can be fixed without blocking CI.
      ...jsxA11y.flatConfigs.recommended.rules,
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/label-has-associated-control': 'warn',
      // Moving focus to the first field of a login or OTP form is deliberate and helps a
      // keyboard or screen-reader user, so this warns rather than fails the build.
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-tabindex': 'warn',
      'jsx-a11y/interactive-supports-focus': 'warn',
      'react/jsx-no-target-blank': 'off',
      // Plain JS project without PropTypes; apostrophes in copy are fine in JSX text.
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
