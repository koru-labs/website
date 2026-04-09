function logStep(message) {
    console.log(`\n== ${message} ==`);
}

function logInfo(message, extra) {
    if (extra === undefined) {
        console.log(message);
        return;
    }
    console.log(message, extra);
}

function logWarn(message) {
    console.warn(`[warn] ${message}`);
}

module.exports = {
    logInfo,
    logStep,
    logWarn,
};
