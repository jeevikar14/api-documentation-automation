const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const tempDir = path.join(rootDir, "test", ".tmp");
const backendDir = path.join(tempDir, "backend");
const outputDir = path.join(tempDir, "output");

function runCli(args) {
    return spawnSync(process.execPath, ["index.js", ...args], {
        cwd: rootDir,
        encoding: "utf8"
    });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function ensureMockBackend() {
    fs.mkdirSync(backendDir, { recursive: true });

    const mockRouteFile = path.join(backendDir, "auth.routes.js");
    const mockRouteSource = `'use strict';

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [token, user]
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   required: [id, email]
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 */
function noop() {}

module.exports = { noop };
`;

    fs.writeFileSync(mockRouteFile, mockRouteSource, "utf8");
}

function run() {
    fs.rmSync(tempDir, { recursive: true, force: true });
    ensureMockBackend();

    const generate = runCli([backendDir, `--output=${outputDir}`]);
    assert(generate.error === undefined, `CLI execution failed unexpectedly. ${String(generate.error)}`);
    assert(generate.status === 0, `Generate docs failed.\n${generate.stdout}\n${generate.stderr}`);
    assert(fs.existsSync(path.join(outputDir, "openapi-spec.json")), "openapi-spec.json not generated.");
    assert(fs.existsSync(path.join(outputDir, "documentation.html")), "documentation.html not generated.");
    console.log("✔ Generate docs");

    const requestValid = runCli([
        "validate",
        backendDir,
        "--requestFile=./sample-request-login.json"
    ]);
    assert(requestValid.error === undefined, `CLI execution failed unexpectedly. ${String(requestValid.error)}`);
    assert(requestValid.status === 0, `Request valid case failed.\n${requestValid.stdout}\n${requestValid.stderr}`);
    assert(/Request validation passed/i.test(requestValid.stdout), "Missing request pass message.");
    console.log("✔ Request valid");

    const requestInvalid = runCli([
        "validate",
        backendDir,
        "--requestFile=./sample-request-login-invalid.json"
    ]);
    assert(requestInvalid.error === undefined, `CLI execution failed unexpectedly. ${String(requestInvalid.error)}`);
    assert(requestInvalid.status === 1, `Request invalid case should fail.\n${requestInvalid.stdout}\n${requestInvalid.stderr}`);
    assert(/Request validation failed/i.test(requestInvalid.stdout + requestInvalid.stderr), "Missing request fail message.");
    console.log("✔ Request invalid");

    const contractValid = runCli([
        "validate",
        backendDir,
        "--requestFile=./sample-request-login.json",
        "--responseFile=./sample-response-login.json"
    ]);
    assert(contractValid.error === undefined, `CLI execution failed unexpectedly. ${String(contractValid.error)}`);
    assert(contractValid.status === 0, `Contract valid case failed.\n${contractValid.stdout}\n${contractValid.stderr}`);
    assert(/Response validation passed/i.test(contractValid.stdout), "Missing response pass message.");
    console.log("✔ Contract valid");

    const responseInvalid = runCli([
        "validate",
        backendDir,
        "--requestFile=./sample-request-login.json",
        "--responseFile=./sample-response-login-invalid.json"
    ]);
    assert(responseInvalid.error === undefined, `CLI execution failed unexpectedly. ${String(responseInvalid.error)}`);
    assert(responseInvalid.status === 1, `Response invalid case should fail.\n${responseInvalid.stdout}\n${responseInvalid.stderr}`);
    assert(/Response validation failed/i.test(responseInvalid.stdout + responseInvalid.stderr), "Missing response fail message.");
    console.log("✔ Response invalid");

    const responseSkipped = runCli([
        "validate",
        backendDir,
        "--requestFile=./sample-request-login-invalid.json",
        "--responseFile=./sample-response-login.json"
    ]);
    assert(responseSkipped.error === undefined, `CLI execution failed unexpectedly. ${String(responseSkipped.error)}`);
    assert(responseSkipped.status === 1, `Response skipped case should fail.\n${responseSkipped.stdout}\n${responseSkipped.stderr}`);
    assert(/Request validation failed/i.test(responseSkipped.stdout + responseSkipped.stderr), "Missing request fail message for skip case.");
    assert(/Response validation skipped/i.test(responseSkipped.stdout + responseSkipped.stderr), "Missing response skipped message.");
    console.log("✔ Response skipped");

    console.log("✅ All smoke tests passed");
}

try {
    run();
} finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
}
