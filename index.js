#!/usr/bin/env node

const { main } = require("./src/cli/cli");
const { validateRequest, createRequestValidator } = require("./src/validator/validateRequest");

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
	createRequestValidator
};