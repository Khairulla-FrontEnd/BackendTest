const datefns = require('date-fns');

const logger = (req, res, next) => {
    console.log(`[${datefns.format(new Date(),'yyyy-MM-dd hh:mm:ss')}] ${req.method} request to ${req.path}`);
    next();
};

module.exports = logger;