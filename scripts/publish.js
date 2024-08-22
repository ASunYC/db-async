const fs = require('fs');

var packageJson = require('../package.json');
var version = packageJson.version;

let _dependencies = packageJson.dependencies;

delete _dependencies[packageJson.name];

const packageJsonStr = `{
    "name": "${packageJson.name}",
    "date(ISO)": "${new Date().toISOString()}",
    "date(Local)": "${new Date().toLocaleString()}",
    "version": "${version}",
    "description": "${packageJson.description}",
    "homepage": "${packageJson.homepage}",
    "keywords": ${JSON.stringify(packageJson.keywords)},  
    "main": "${packageJson.main}",
    "scripts": ${JSON.stringify(packageJson.scripts)},
    "author":"${packageJson.author}",
    "license": "${packageJson.license}",
    "publishConfig": ${JSON.stringify(packageJson.publishConfig)},
    "dependencies": ${JSON.stringify(_dependencies)}
  }
`;

try {
    process.chdir("./dist");
    // console.log('package: ', packageJsonStr);
    fs.writeFileSync('package.json', packageJsonStr);
} catch (error) {
    console.error('执行失败！');
}
