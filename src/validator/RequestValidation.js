const fs = require("fs");
const path = require("path");
const RequestValidator = require("./RequestValidator");

const DEFAULT_SPEC_PATH = path.join(process.cwd(), "output", "openapi-spec.json");

function loadOpenApiSpec(options = {})
{
    if (options.spec && typeof options.spec === "object")
    {
        return options.spec;
    }

    const specPath = path.resolve(options.specPath || DEFAULT_SPEC_PATH);

    if (!fs.existsSync(specPath))
    {
        throw new Error(`OpenAPI spec not found at: ${specPath}`);
    }

    const raw = fs.readFileSync(specPath, "utf8");

    try
    {
        return JSON.parse(raw);
    }
    catch (error)
    {
        throw new Error(`OpenAPI spec JSON is invalid at: ${specPath}`);
    }
}

function createRequestValidator(options = {})
{
    const openApiSpec = loadOpenApiSpec(options);
    return new RequestValidator(openApiSpec);
}

function validateRequest(request, options = {})
{
    const validator = createRequestValidator(options);
    return validator.validate(request);
}

module.exports = {
    validateRequest,
    createRequestValidator,
    loadOpenApiSpec
};
