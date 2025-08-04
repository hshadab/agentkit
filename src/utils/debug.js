// Simple debug utility for demos
const DEBUG = process.env.DEBUG === 'true';

export const debug = (...args) => {
    if (DEBUG) {
        console.log('[DEBUG]', ...args);
    }
};

export const log = (...args) => {
    console.log(...args);
};

export const error = (...args) => {
    console.error(...args);
};

export default { debug, log, error, DEBUG };