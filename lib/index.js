const core = require("@actions/core");
const github = require("@actions/github");
const path = require("path");

const getLocaleFiles = (pullRequestFiles, localePath) => {
  const localePattern = `${localePath}/[a-zA-Z]+.json`;
  const normalizedLocalePattern = path.normalize(localePattern);
  const re = new RegExp(normalizedLocalePattern);
  const localeFiles = pullRequestFiles.filter((file) => re.test(file.filename));
  return localeFiles;
};

const getLocaleFromFilename = (filename, localePath) =>
  filename.match(path.normalize(localePath + "(.*).json"))[1];

const getTranslationsFromPatch = (patch) => {
  const changes = patch
    .split("\n")
    .filter((change) => /^\+\s*\"/g.test(change))
    .map((change) => {
      const output = change.replace(/^\+/, "").trim();
      return output.slice(-1) === "," ? output.slice(0, -1) : output;
    });

  return JSON.parse(`{${changes.join(",")}}`);
};

const getChangeset = (pullRequestFiles, localePath) => {
  return pullRequestFiles
    .filter((file) => file.filename.startsWith(localePath))
    .reduce(
      (changeset, change) => {
        const locale = getLocaleFromFilename(change.filename, localePath);
        changeset[locale] = getTranslationsFromPatch(change.patch);
        return changeset;
      },
      Object.create({
        ...Object.values(
          pullRequestFiles.map((file) =>
            getLocaleFromFilename(file.filename, localePath)
          )
        ),
      })
    );
};

const isChangesetExisting = async (githubToken, localePath) => {
  const payload = github.context.payload;
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const prNumber = payload.number;
  const octokit = github.getOctokit(githubToken);

  try {
    const prFiles = await octokit.paginate(octokit.rest.pulls.listFiles, {
      owner,
      repo,
      pull_number: prNumber,
    });

    const localeFiles = getLocaleFiles(prFiles, localePath);
    const localeFileChangesetExists = localeFiles.length > 0;

    if (!localeFileChangesetExists) {
      core.notice("No changes found in locale files.");
    } else {
      const changeset = getChangeset(localeFiles, localePath);

      let translationKeysContainValues = Object.create({
        ...Object.keys(changeset),
      });

      for (const locale in changeset) {
        if (Object.hasOwnProperty.call(changeset, locale)) {
          const translations = changeset[locale];
          translationKeysContainValues[locale] = Object.values(
            translations
          ).every((truthy) => truthy);
        }
      }

      if (
        Object.values(translationKeysContainValues).every((truthy) => truthy)
      ) {
        core.notice("✔ All translations added.");
      } else {
        let localesWithMissingValues = Object.create({
          ...Object.keys(changeset),
        });

        for (const locale in changeset) {
          if (Object.hasOwnProperty.call(changeset, locale)) {
            const translations = changeset[locale];
            localesWithMissingValues[locale] = Object.entries(translations)
              .map((entry) => !translations[entry[0]] && entry[0])
              .filter((truthy) => truthy);
          }
        }

        core.notice(
          "\n❌ Missing translations:\n" +
            `${localesWithMissingValues.da.reduce(
              (output, value) => output + `  - ${value}\n`,
              ""
            )}` +
            `\nGo to the [Translator UI](https://translator.e-conomic.ws/repository/${github.context.payload.repository.name}/pr/${github.context.payload.pull_request.number}) to manage translations for this pull request`
        );
        throw "Missing translations";
      }
    }

    console.log(`Action finished running`);
    return 0;
  } catch (error) {
    core.setFailed(`Action failed with error: "${error}"`);
    return 1;
  }
};

try {
  const githubToken = core.getInput("github-token");

  if (!githubToken) {
    core.setFailed("No github-token provided as input to the action");
  }

  const localePath = core.getInput("locale-path");

  if (!localePath) {
    core.setFailed(
      "No locale-path provided as input to the action - expand to see what was provided^"
    );
  }

  isChangesetExisting(githubToken, localePath);
} catch (error) {
  core.setFailed(`Action failed with error ${error}`);
}
