# Contributing

Thank you for considering a contribution to Media Loader. Contributions should
preserve the project's rights-aware workflow and security boundaries.

## Before You Start

- Open an issue to discuss a substantial change before implementing it.
- Keep changes focused and explain the user-visible behavior or problem they
  address.
- Do not add DRM bypasses, browser-cookie access, login-wall circumvention, or
  direct download paths that bypass URL validation, policy checks, and rights
  confirmation.
- Never commit credentials, tokens, or local environment files.

## Development Setup

Follow the [developer guide](docs/en/DEVELOPER_GUIDE.md) to set up Node.js,
`pnpm`, Python, `uv`, and the required services. Use `pnpm` for Node.js packages
and `uv` for Python packages.

## Before Opening a Pull Request

- Describe the change and any relevant issue.
- Run the checks relevant to the files you changed. The repository CI runs the
  frontend lint/build, API and worker tests, and Docker image builds.
- Update documentation when behavior or setup changes.
- Confirm that your changes contain no secrets or unauthorized media.

By submitting a contribution, you agree that it is provided under the
repository's [MIT License](LICENSE).
