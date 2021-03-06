# Translator Action

A GitHub Action that checks mergeability of locale file changesets in pull requests.

If a PR contains locale file changes, it is blocked until all translations have been added.
A PR is unblocked if it contains _no_ locale file changes, or if all translation values are added.
For now, only projects containing both english (`en`) and danish (`da`) locales are supported.

You can manage translations of your PRs via the [Translator UI](https://translator.e-conomic.ws/).

# Translator Action config

Below is a sample workflow that uses the Translator Action.

```yml
name: Translator Service

on: [pull_request]

jobs:
  check_changeset:
    runs-on: ubuntu-latest
    steps:
      - uses: e-conomic/action-translator-pr-check@v2.0.3
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          locale-path: public/locales/
```

# Translator Action inputs

| Input        | Required | Default        | Note                                  |
| ------------ | -------- | -------------- | ------------------------------------- |
| github-token | yes      |                | Use ${{ secrets.GITHUB_TOKEN}} or PAT |
| locale-path  | yes      | public/locales | Path of locale files                  |

# Updates to the Action script

After updating the `lib/index.js` script, one must run `npm run package` before pushing changes to source control.
