const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..");

function resolveOutputDir(environment) {
    return path.resolve(repoRoot, environment.outputDir);
}

function ensureOutputDir(environment) {
    const outputDir = resolveOutputDir(environment);
    fs.mkdirSync(outputDir, {recursive: true});
    return outputDir;
}

function writeArtifact(environment, name, payload) {
    const outputDir = ensureOutputDir(environment);
    const filePath = path.join(outputDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    return filePath;
}

function readArtifact(environment, name) {
    const filePath = path.join(resolveOutputDir(environment), `${name}.json`);
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function artifactExists(environment, name) {
    const filePath = path.join(resolveOutputDir(environment), `${name}.json`);
    return fs.existsSync(filePath);
}

module.exports = {
    artifactExists,
    readArtifact,
    resolveOutputDir,
    writeArtifact,
};
