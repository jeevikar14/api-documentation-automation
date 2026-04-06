class SchemaValidator
{
    constructor(refResolver)
    {
        this.refResolver = refResolver;
    }

    validate(value, schema, fieldPath, errors, allowPrimitiveCoercion = false)
    {
        const resolvedSchema = this.refResolver ? this.refResolver.resolveReferenceObject(schema) : schema;

        if (!resolvedSchema || typeof resolvedSchema !== "object")
        {
            return;
        }

        if (resolvedSchema.nullable && value === null)
        {
            return;
        }

        if (resolvedSchema.enum && !resolvedSchema.enum.includes(value))
        {
            errors.push(`${fieldPath} must be one of: ${resolvedSchema.enum.join(", ")}.`);
        }

        const expectedType = resolvedSchema.type;

        if (!expectedType)
        {
            if (resolvedSchema.properties || resolvedSchema.required)
            {
                this.#validateObjectSchema(value, resolvedSchema, fieldPath, errors, allowPrimitiveCoercion);
            }

            return;
        }

        if (expectedType === "object")
        {
            this.#validateObjectSchema(value, resolvedSchema, fieldPath, errors, allowPrimitiveCoercion);
            return;
        }

        if (expectedType === "array")
        {
            this.#validateArraySchema(value, resolvedSchema, fieldPath, errors, allowPrimitiveCoercion);
            return;
        }

        this.#validatePrimitiveSchema(value, resolvedSchema, fieldPath, errors, allowPrimitiveCoercion);
    }

    #validateObjectSchema(value, schema, fieldPath, errors, allowPrimitiveCoercion)
    {
        if (!this.#isPlainObject(value))
        {
            errors.push(`${fieldPath} must be an object.`);
            return;
        }

        const requiredFields = Array.isArray(schema.required) ? schema.required : [];

        for (const requiredField of requiredFields)
        {
            if (value[requiredField] === undefined)
            {
                errors.push(`${fieldPath}.${requiredField} is required.`);
            }
        }

        const properties = schema.properties || {};

        for (const [propertyName, propertySchema] of Object.entries(properties))
        {
            if (value[propertyName] !== undefined)
            {
                this.validate(
                    value[propertyName],
                    propertySchema,
                    `${fieldPath}.${propertyName}`,
                    errors,
                    allowPrimitiveCoercion
                );
            }
        }

        if (schema.additionalProperties === false)
        {
            for (const key of Object.keys(value))
            {
                if (!Object.prototype.hasOwnProperty.call(properties, key))
                {
                    errors.push(`${fieldPath}.${key} is not allowed.`);
                }
            }
        }
    }

    #validateArraySchema(value, schema, fieldPath, errors, allowPrimitiveCoercion)
    {
        if (!Array.isArray(value))
        {
            errors.push(`${fieldPath} must be an array.`);
            return;
        }

        if (typeof schema.minItems === "number" && value.length < schema.minItems)
        {
            errors.push(`${fieldPath} must contain at least ${schema.minItems} items.`);
        }

        if (typeof schema.maxItems === "number" && value.length > schema.maxItems)
        {
            errors.push(`${fieldPath} must contain at most ${schema.maxItems} items.`);
        }

        if (schema.items)
        {
            for (let index = 0; index < value.length; index += 1)
            {
                this.validate(
                    value[index],
                    schema.items,
                    `${fieldPath}[${index}]`,
                    errors,
                    allowPrimitiveCoercion
                );
            }
        }
    }

    #validatePrimitiveSchema(value, schema, fieldPath, errors, allowPrimitiveCoercion)
    {
        const expectedType = schema.type;

        if (!this.#matchesPrimitiveType(value, expectedType, allowPrimitiveCoercion))
        {
            errors.push(`${fieldPath} must be of type ${expectedType}.`);
            return;
        }

        if (expectedType === "string")
        {
            const asText = String(value);

            if (typeof schema.minLength === "number" && asText.length < schema.minLength)
            {
                errors.push(`${fieldPath} must be at least ${schema.minLength} characters long.`);
            }

            if (typeof schema.maxLength === "number" && asText.length > schema.maxLength)
            {
                errors.push(`${fieldPath} must be at most ${schema.maxLength} characters long.`);
            }

            if (schema.pattern)
            {
                const pattern = new RegExp(schema.pattern);

                if (!pattern.test(asText))
                {
                    errors.push(`${fieldPath} does not match required pattern.`);
                }
            }

            if (schema.format === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(asText))
            {
                errors.push(`${fieldPath} must be a valid email.`);
            }
        }

        if (expectedType === "number" || expectedType === "integer")
        {
            const numericValue = Number(value);

            if (expectedType === "integer" && !Number.isInteger(numericValue))
            {
                errors.push(`${fieldPath} must be an integer.`);
            }

            if (typeof schema.minimum === "number" && numericValue < schema.minimum)
            {
                errors.push(`${fieldPath} must be >= ${schema.minimum}.`);
            }

            if (typeof schema.maximum === "number" && numericValue > schema.maximum)
            {
                errors.push(`${fieldPath} must be <= ${schema.maximum}.`);
            }
        }
    }

    #matchesPrimitiveType(value, expectedType, allowPrimitiveCoercion)
    {
        if (expectedType === "string")
        {
            return typeof value === "string";
        }

        if (expectedType === "boolean")
        {
            if (typeof value === "boolean")
            {
                return true;
            }

            return allowPrimitiveCoercion && (value === "true" || value === "false");
        }

        if (expectedType === "number")
        {
            if (typeof value === "number" && Number.isFinite(value))
            {
                return true;
            }

            return allowPrimitiveCoercion && value !== "" && Number.isFinite(Number(value));
        }

        if (expectedType === "integer")
        {
            if (typeof value === "number" && Number.isInteger(value))
            {
                return true;
            }

            return allowPrimitiveCoercion && /^-?\d+$/.test(String(value));
        }

        return true;
    }

    #isPlainObject(value)
    {
        return typeof value === "object" && value !== null && !Array.isArray(value);
    }
}

module.exports = SchemaValidator;
