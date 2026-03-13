#!/usr/bin/env node

const { main } = require("./src/cli/cli");

try
{
	main();
}
catch (error)
{
	console.error("Documentation generation failed:", error.message);
	process.exitCode = 1;
}