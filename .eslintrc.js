module.exports = {
  root: true,
  extends: 'airbnb-base',
  parser: '@babel/eslint-parser',
  env: {
    node: true,
    es6: true,
  },
  rules: {
    'object-curly-newline': 'off',
  },
};
