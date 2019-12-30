const BX24Rest = require('./rest/bx24');
const fs = require('fs').promises;

(async function () {
    try {
        let BX = new BX24Rest(JSON.parse(await fs.readFile('./config/login.json', 'utf8')));
        // BX.CallMethod();

    } catch (error) {
        console.log(error);
    }
})()