# Command Guide

[commandguide.com](https://commandguide.com) helps you find the right command for the job. Say what you want to do in plain English, such as "undo the last commit" or "list listening ports", and copy the command you need.

## What's in it

The site is organised into guides, each with its own page and search:

- **Linux:** files, text, networking, SSH and processes
- **Git:** branches, commits, pushing changes and undoing mistakes
- **Docker:** containers, logs, shells and Compose stacks

Each command shows the platforms it works on. The home page searches across every guide.

More guides are planned, including Windows and Cisco, along with tools such as a subnet calculator.

## Add content

To add a command, edit the guide's file in `src/guides/`. Each command needs a `task`, a `cmd` and `platforms`, and can have a `warning` for anything destructive.

To add a guide, create `src/guides/<slug>.json`, with a `tone` for its colour (amber, coral, sky, mint or violet), and add the slug to `src/guide-order.json`. The build creates its page, navigation link and sitemap entry.

## Run it locally

You'll need Node.js 22.22 or newer.

```sh
npm ci
npm run build
npm run check
npx --yes serve dist
```

## How changes go live

1. Make the change on a branch and open a pull request.
2. GitHub Actions builds the site and runs the checks.
3. Merge to `main`.
4. GitHub Actions deploys the site and confirms the live version matches the merged commit.
