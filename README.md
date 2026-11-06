# commandguide.com

A searchable command cheat sheet, used to test a Claude → GitHub → Hostinger pipeline.

## How a change goes live

1. Make the change on a branch and open a pull request.
2. The CI workflow builds the site and runs the checks.
3. Merge to `main`.
4. The Deploy workflow rebuilds, syncs `dist/` to Hostinger with rsync, then confirms `version.txt` on the live site matches the commit.

To add a command, edit the guide's file in `src/guides/`. Each command needs a `task`, a `cmd` and `platforms`, and can have a `warning` for anything destructive.

To add a guide, create `src/guides/<slug>.json` and add the slug to `src/guide-order.json`. The build creates its page, navigation link and sitemap entry.

## Run it locally

```sh
npm ci
npm test
npx --yes serve dist
```

## Deploy settings

Repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `HOSTINGER_SSH_HOST` | SSH IP from hPanel |
| `HOSTINGER_SSH_PORT` | SSH port from hPanel |
| `HOSTINGER_SSH_USER` | SSH username from hPanel |
| `HOSTINGER_SSH_KEY` | Private key used only for this deployment |
| `HOSTINGER_KNOWN_HOSTS` | Output of `ssh-keyscan -p PORT HOST`, checked against the server |
| `HOSTINGER_DEPLOY_PATH` | `/home/USER/domains/commandguide.com/public_html` |

Repository variable: set `DEPLOY_ENABLED` to `true` to deploy on every merge. Until then, only manual runs work.

Manual runs of the Deploy workflow default to a dry run, which lists changes without applying them.
