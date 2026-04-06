const ResponseValidator = require("./ResponseValidator");
const { loadOpenApiSpec } = require("./validateRequest");

function createResponseValidator(options = {})
{
    const openApiSpec = loadOpenApiSpec(options);
    return new ResponseValidator(openApiSpec);
}

function validateResponse(response, options = {})
{
    const validator = createResponseValidator(options);
    return validator.validate(response, options.context || {});
}

module.exports = {
    validateResponse,
    createResponseValidator
};
