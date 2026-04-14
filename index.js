#!/usr/bin/env node

const { main } = require("./src/cli/cli");
const { validateRequest, createRequestValidator } = require("./src/validator/RequestValidation");
const { validateResponse, createResponseValidator } = require("./src/validator/ResponseValidation");
const { validateContract, createContractValidator } = require("./src/validator/ContractValidation");

if (require.main === module)
{
	try
	{
		main();
	}
	catch (error)
	{
		console.error("Documentation generation failed:", error.message);
		process.exitCode = 1;
	}
}

module.exports = {
	main,
	validateRequest,
	createRequestValidator,
	validateResponse,
	createResponseValidator,
	validateContract,
	createContractValidator
};