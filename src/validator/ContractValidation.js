const ContractValidator = require("./ContractValidator");
const
{ loadOpenApiSpec } = require("./RequestValidation");

function createContractValidator(options = {})
{
    const openApiSpec = loadOpenApiSpec(options);
    return new ContractValidator(openApiSpec);
}

function validateContract(contractInput, options = {})
{
    const validator = createContractValidator(options);
    return validator.validate(contractInput);
}

module.exports = {
    validateContract,
    createContractValidator
};
