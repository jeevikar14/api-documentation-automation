const PORTAL_URLS = Object.freeze([
    "http://msrit.hiveeduplatform.com",
    "http://127.0.0.1:49152"
]);

const PORTAL_ENDPOINTS = Object.freeze( {
    PUBLISH_DOCUMENTATION_REQUEST: "/PublishDocumentationRequest"
});

const FILE_NAMES = Object.freeze( {
    OPENAPI: "openapi-spec.json",
    DOCUMENTATION: "documentation.html"
});

const PAYLOAD_FIELDS = Object.freeze( {
    SERVICE_NAME: "serviceName",
    DOCUMENTATION_HTML: "documentationHtml"
});

const DEFAULTS = Object.freeze( {
    SERVICE_NAME: "service",
    VERSION: "v1.0.0",
    OUTPUT_DIR: "output",
    DEVICE_ID: "api-doc-tool"
});

module.exports = {
    PORTAL_URLS,
    PORTAL_ENDPOINTS,
    FILE_NAMES,
    PAYLOAD_FIELDS,
    DEFAULTS
};
