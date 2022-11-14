# mjmgr

**NOTE:** This is a very early prototype of what we want this tool to be. If you like it,
feel free to open issues and contribute!

The MJML email manager.

1. Write your emails in React/JSX using [MJML components](https://mjml.io/) (and
   [MJML-React](https://github.com/Faire/mjml-react))
2. Run `mjmgr generate` to compile them to HTML and publish to Mailgun or Sendgrid.

## Features

-   Built-in support for localization (using [i18next](https://www.i18next.com/))
-   Multiple backends:
    -   Publish to Mailgun templates
    -   Publish to Sendgrid dynamic templates
    -   Or just write to local HTML files and handle it yourself
-   Change detection to minimize amount of email versions

## How to use

See `example/` directory.

There should be one single folder containing emails. They can be written in jsx or tsx,
but if written in tsx they have to be transpiled to JS first at the moment.

The configuration happens in `mjmgr.json`:

-   `emails_dir` points to the directory where the email templates are stored.
-   `backends`: A list of backends that `mjmgr` will generate to.
    -   `fs` generates HTML files to the filesystem
    -   `mailgun` uploads HTML to Mailgun templates
    -   `sendgrid` uploads HTML to Sendgrid dynamic templates
-   `validation_level` sets the MJML validation level (`strict`, `soft` or `skip`)

The mailgun and sendgrid backends require additional environment variables to work.

Localization settings:

-   `supported_languages` is a list of locales the templates will be generated into.
-   `i18n.path` sets the path to the JSON file containing the i18n resources
-   `i18n.config` is an [i18next configuration object](https://www.i18next.com/overview/configuration-options)

## How it works

When the `mailgun` or `sendgrid` backends are enabled, a state file is used. The state
file tracks the uploaded versions and stores the sha256 digest of the latest upload, in
order to avoid creating multiple identical versions in a row.

NOTE: The state file is currently stored in the user's configuration directory (eg.
`~/.config/mjmgr-nodejs/mjmgr_state.json`). This will most likely change in the future.

## Future/wanted features

-   Support tsx directly (instead of having to transpile first)
-   Seamless support for images (Upload local images to Sendgrid/Mailgun CDNs)
-   Direct-to-MJML integrations (eg. Mailgun supports MJML templates, which can then be
    managed in the drag-and-drop editor)
-   Detection of existing email templates / recovering from duplicate errors etc
-   Better state management (fetch & compare versions)
-   Keep only N versions (configurable) of a template; delete older ones
-   Seamlessly support multiple environments (staging/production)
-   More remote backends
-   Git backend

## Acknowledgements

This tool is similar to / inspired by [JSX Mail](https://jsx-mail.org/).
Where it differs however, is that MJMGR does not try to implement its own components.
We build on the work done by the [MJML](https://mjml.io/) community, and rely on
[MJML-React](https://github.com/Faire/mjml-react) components for React support.

JSX Mail also takes no ownership of either i18n or uploading the resulting templates
somewhere. The (current) goal of MJMGR is not to create templates used just-in-time, but
rather to compile and manage them on a variety of backends
