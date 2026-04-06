# API Documentation + Validation Tool

Generates OpenAPI docs from JSDoc and validates request/response payloads against the generated contract.

## Setup

```bash
npm install
npm link
```

## Core Commands

Generate docs:

```bash
hiveapidocumenter <targetDir> --output=./output
```

Validate request only:

```bash
hiveapidocumenter validate <targetDir> --requestFile=./sample-request-login.json
```

Validate request + response:

```bash
hiveapidocumenter validate <targetDir> --requestFile=./sample-request-login.json --responseFile=./sample-response-login.json
```

## Output (Validate)

- `✔ Request validation passed`
- `✔ Response validation passed`

or

- `❌ Request validation failed`
- `❌ Response validation skipped`

or

- `✔ Request validation passed`
- `❌ Response validation failed`

## Exit Codes

- `0` success
- `1` failure


