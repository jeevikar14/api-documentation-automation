# api-documentation-automation

Simple Node.js CLI for scanning a backend folder, building an OpenAPI spec with `swagger-jsdoc`, and generating Swagger UI documentation.

## Project Structure

The source is organized with simple folders by responsibility:

- `src/application/` - app orchestration
- `src/cli/` - CLI entry and argument parsing
- `src/scanner/` - file discovery
- `src/parser/` - OpenAPI spec building
- `src/generator/` - HTML/JSON/YAML output generation

## Usage

```bash
node src/cli/cli.js .
node src/cli/cli.js --title="Backend API" --version="1.2.0" .
hiveapidocumenter .
```

## Supported Arguments

Use `--key=value` for options.

- `--title=value`
- `--version=value`
- `--description=value`
- `--output=path`

If an argument does not match `--key=value`, it is treated as the scan directory.

## Output

The tool writes these files to `output/` by default (generated at runtime):

- `documentation.html`
- `openapi-spec.json`
- `openapi-spec.yaml`
