const swaggerJsdoc = require("swagger-jsdoc");

const RESERVED_SPEC_KEYS = new Set([
    "openapi",
    "info",
    "servers",
    "tags",
    "paths",
    "components",
    "security",
    "externalDocs"
]);

class SpecBuilder
{
    build(apiFiles, options)
    {
        const swaggerOptions = {
            definition: {
                openapi: "3.0.0",
                info: {
                    title: options.title,
                    version: options.version,
                    description: options.description
                }
            },
            apis: apiFiles
        };

        const spec = swaggerJsdoc(swaggerOptions);

        return {
            openapi: spec.openapi || "3.0.0",
            info: spec.info || swaggerOptions.definition.info,
            servers: spec.servers || [],
            tags: spec.tags || [],
            paths: spec.paths || {},
            components: spec.components || {},
            security: spec.security || [],
            externalDocs: spec.externalDocs,
            ...this.#additionalFields(spec)
        };
    }

    #additionalFields(spec)
    {
        const extra = {};

        for (const [key, value] of Object.entries(spec))
        {
            if (!RESERVED_SPEC_KEYS.has(key))
            {
                extra[key] = value;
            }
        }

        return extra;
    }
}

module.exports = SpecBuilder;
