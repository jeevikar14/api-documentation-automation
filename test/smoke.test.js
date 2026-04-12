const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const tempDir = path.join(rootDir, "test", ".tmp");
const backendDir = path.join(tempDir, "backend");
const outputDir = path.join(tempDir, "output");
const SAMPLES_DIR = path.join(rootDir, "samples");

function runCli(args)
{
    return spawnSync(process.execPath, ["index.js", ...args],
    {
        cwd: rootDir,
        encoding: "utf8"
    });
}

function assert(condition, message)
{
    if (!condition)
    {
        throw new Error(message);
    }
}

const testResults = [];

function printTestResult(label, expected, outcome, passed)
{
    testResults.push({ label, expected, outcome, passed });

    console.log(`\n  Test:     ${label}`);
    console.log(`  Expected: ${expected}`);
    console.log(`  Outcome:  ${outcome}`);
    console.log(`  Result:   ${passed ? "✔  PASS" : "❌ FAIL"}`);
}

function printSummaryTable()
{
    const columns = {
        index:  { header: "#",      width: 2 },
        label:  { header: "Test",   width: "Test".length },
        result: { header: "Result", width: "Result".length }
    };

    for (let index = 0; index < testResults.length; index += 1)
    {
        const entry = testResults[index];
        columns.index.width  = Math.max(columns.index.width,  String(index + 1).length);
        columns.label.width  = Math.max(columns.label.width,  entry.label.length);
        columns.result.width = Math.max(columns.result.width, 7);
    }

    const pad        = (text, width) => String(text).padEnd(width);
    const totalWidth = 2 + columns.index.width + 3 + columns.label.width + 3 + columns.result.width + 2;
    const line       = (left, fill, mid, right) =>
        left
        + fill.repeat(columns.index.width + 2)
        + mid
        + fill.repeat(columns.label.width + 2)
        + mid
        + fill.repeat(columns.result.width + 2)
        + right;

    const passCount = testResults.filter((entry) => entry.passed).length;
    const failCount = testResults.length - passCount;
    const passRate  = testResults.length === 0 ? 0 : Math.round((passCount / testResults.length) * 100);

    console.log("\n");
    console.log(line("┌", "─", "┬", "┐"));
    console.log(`│ ${pad(columns.index.header, columns.index.width)} │ ${pad(columns.label.header, columns.label.width)} │ ${pad(columns.result.header, columns.result.width)} │`);
    console.log(line("├", "─", "┼", "┤"));

    for (let index = 0; index < testResults.length; index += 1)
    {
        const entry  = testResults[index];
        const result = entry.passed ? "✔  PASS" : "❌ FAIL";
        console.log(`│ ${pad(index + 1, columns.index.width)} │ ${pad(entry.label, columns.label.width)} │ ${pad(result, columns.result.width)} │`);
    }

    console.log(line("├", "─", "┴", "┤").replace(/┴/g, "─"));
    const summaryText = `  Total: ${testResults.length}   Passed: ${passCount}   Failed: ${failCount}   Pass Rate: ${passRate}%`;
    console.log(`│${summaryText.padEnd(totalWidth - 2)}│`);
    console.log("└" + "─".repeat(totalWidth - 2) + "┘");
}

function ensureMockBackend()
{
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
function noop()
{
}

module.exports = { noop };
`;

    fs.writeFileSync(mockRouteFile, mockRouteSource, "utf8");
}

function run()
{
    fs.rmSync(tempDir, { recursive: true, force: true });
    ensureMockBackend();

    const generate = runCli([backendDir, `--output=${outputDir}`]);
    const specGenerated = fs.existsSync(path.join(outputDir, "openapi-spec.json"));
    const htmlGenerated = fs.existsSync(path.join(outputDir, "documentation.html"));

    printTestResult(
        "Generate docs",
        "Exit code 0, openapi-spec.json generated, documentation.html generated",
        `Exit code ${generate.status}, openapi-spec.json ${specGenerated ? "found" : "missing"}, documentation.html ${htmlGenerated ? "found" : "missing"}`,
        generate.status === 0 && specGenerated && htmlGenerated
    );

    assert(generate.error === undefined, `CLI execution failed unexpectedly. ${String(generate.error)}`);
    assert(generate.status === 0, `Generate docs failed.\n${generate.stdout}\n${generate.stderr}`);
    assert(specGenerated, "openapi-spec.json not generated.");
    assert(htmlGenerated, "documentation.html not generated.");

    const requestValid = runCli([
        "validate",
        backendDir,
        `--requestFile=${path.join(SAMPLES_DIR, "sample-request-login.json")}`
    ]);
    const requestValidPassed = requestValid.status === 0 && /Request validation passed/i.test(requestValid.stdout);

    printTestResult(
        "Request valid",
        "Exit code 0, Request validation passed",
        `Exit code ${requestValid.status}, ${requestValid.stdout.match(/request validation \w+/i)?.[0] ?? "no validation message"}`,
        requestValidPassed
    );

    assert(requestValid.error === undefined, `CLI execution failed unexpectedly. ${String(requestValid.error)}`);
    assert(requestValid.status === 0, `Request valid case failed.\n${requestValid.stdout}\n${requestValid.stderr}`);
    assert(/Request validation passed/i.test(requestValid.stdout), "Missing request pass message.");

    const requestInvalid = runCli([
        "validate",
        backendDir,
        `--requestFile=${path.join(SAMPLES_DIR, "sample-request-login-invalid.json")}`
    ]);
    const requestInvalidPassed = requestInvalid.status === 1 && /Request validation failed/i.test(requestInvalid.stdout + requestInvalid.stderr);

    printTestResult(
        "Request invalid",
        "Exit code 1, Request validation failed",
        `Exit code ${requestInvalid.status}, ${(requestInvalid.stdout + requestInvalid.stderr).match(/request validation \w+/i)?.[0] ?? "no validation message"}`,
        requestInvalidPassed
    );

    assert(requestInvalid.error === undefined, `CLI execution failed unexpectedly. ${String(requestInvalid.error)}`);
    assert(requestInvalid.status === 1, `Request invalid case should fail.\n${requestInvalid.stdout}\n${requestInvalid.stderr}`);
    assert(/Request validation failed/i.test(requestInvalid.stdout + requestInvalid.stderr), "Missing request fail message.");

    const contractValid = runCli([
        "validate",
        backendDir,
        `--requestFile=${path.join(SAMPLES_DIR, "sample-request-login.json")}`,
        `--responseFile=${path.join(SAMPLES_DIR, "sample-response-login.json")}`
    ]);
    const contractValidPassed = contractValid.status === 0 && /Response validation passed/i.test(contractValid.stdout);

    printTestResult(
        "Contract valid",
        "Exit code 0, Request validation passed, Response validation passed",
        `Exit code ${contractValid.status}, ${contractValid.stdout.match(/request validation \w+/i)?.[0] ?? "no request message"}, ${contractValid.stdout.match(/response validation \w+/i)?.[0] ?? "no response message"}`,
        contractValidPassed
    );

    assert(contractValid.error === undefined, `CLI execution failed unexpectedly. ${String(contractValid.error)}`);
    assert(contractValid.status === 0, `Contract valid case failed.\n${contractValid.stdout}\n${contractValid.stderr}`);
    assert(/Response validation passed/i.test(contractValid.stdout), "Missing response pass message.");

    const responseInvalid = runCli([
        "validate",
        backendDir,
        `--requestFile=${path.join(SAMPLES_DIR, "sample-request-login.json")}`,
        `--responseFile=${path.join(SAMPLES_DIR, "sample-response-login-invalid.json")}`
    ]);
    const responseInvalidPassed = responseInvalid.status === 1 && /Response validation failed/i.test(responseInvalid.stdout + responseInvalid.stderr);

    printTestResult(
        "Response invalid",
        "Exit code 1, Response validation failed",
        `Exit code ${responseInvalid.status}, ${(responseInvalid.stdout + responseInvalid.stderr).match(/response validation \w+/i)?.[0] ?? "no response message"}`,
        responseInvalidPassed
    );

    assert(responseInvalid.error === undefined, `CLI execution failed unexpectedly. ${String(responseInvalid.error)}`);
    assert(responseInvalid.status === 1, `Response invalid case should fail.\n${responseInvalid.stdout}\n${responseInvalid.stderr}`);
    assert(/Response validation failed/i.test(responseInvalid.stdout + responseInvalid.stderr), "Missing response fail message.");

    const responseSkipped = runCli([
        "validate",
        backendDir,
        `--requestFile=${path.join(SAMPLES_DIR, "sample-request-login-invalid.json")}`,
        `--responseFile=${path.join(SAMPLES_DIR, "sample-response-login.json")}`
    ]);
    const responseSkippedPassed = responseSkipped.status === 1
        && /Request validation failed/i.test(responseSkipped.stdout + responseSkipped.stderr)
        && /Response validation skipped/i.test(responseSkipped.stdout + responseSkipped.stderr);

    printTestResult(
        "Response skipped",
        "Exit code 1, Request validation failed, Response validation skipped",
        `Exit code ${responseSkipped.status}, ${(responseSkipped.stdout + responseSkipped.stderr).match(/request validation \w+/i)?.[0] ?? "no request message"}, ${(responseSkipped.stdout + responseSkipped.stderr).match(/response validation \w+/i)?.[0] ?? "no response message"}`,
        responseSkippedPassed
    );

    assert(responseSkipped.error === undefined, `CLI execution failed unexpectedly. ${String(responseSkipped.error)}`);
    assert(responseSkipped.status === 1, `Response skipped case should fail.\n${responseSkipped.stdout}\n${responseSkipped.stderr}`);
    assert(/Request validation failed/i.test(responseSkipped.stdout + responseSkipped.stderr), "Missing request fail message for skip case.");
    assert(/Response validation skipped/i.test(responseSkipped.stdout + responseSkipped.stderr), "Missing response skipped message.");

    printSummaryTable();
    console.log("\n✅ All smoke tests passed");
}

try
{
    run();
}
finally
{
    fs.rmSync(tempDir, { recursive: true, force: true });
}