const RequestValidator = require("./RequestValidator");
const ResponseValidator = require("./ResponseValidator");

class ContractValidator
{
    constructor(openApiSpec = {})
    {

        this.requestValidator = new RequestValidator(openApiSpec);
        this.responseValidator = new ResponseValidator(openApiSpec);
    }

    validate(contractInput = {})
    {

        const request = contractInput.request;
        const response = contractInput.response;

        const requestResult = this.requestValidator.validate(request);

        if (!requestResult.isValid)
        {
            return {
                isValid: false,
                requestValidation: requestResult,
                responseValidation: {
                    isValid: false,
                    skipped: true,
                    errors: ["Request validation failed, so response validation was skipped."],
                    matchedEndpoint: requestResult.matchedEndpoint
                },
                matchedEndpoint: requestResult.matchedEndpoint
            };
        }

        const responseResult = this.responseValidator.validate(response, {
            path: requestResult.matchedEndpoint && requestResult.matchedEndpoint.path,
            method: requestResult.matchedEndpoint && requestResult.matchedEndpoint.method
        });

        return {
            isValid: requestResult.isValid && responseResult.isValid,
            requestValidation: requestResult,
            responseValidation: responseResult,
            matchedEndpoint: requestResult.matchedEndpoint
        };
    }
}

module.exports = ContractValidator;
