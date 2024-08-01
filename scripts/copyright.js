let _package = require('../package.json');
module.exports = `/*!
 * ${_package.name} v${_package.version}
 * ------------------------------------------------------------------------------------
 * Copyright (c) ${_package.author}.
 * ${_package.license} License
 * https://github.com/ASunYC/db-async
 * ${_package.description}
 * ------------------------------------------------------------------------------------
 */`