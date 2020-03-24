const BX24 = require('./rest/bx24');

(async function () {
    try {

        const BX = await new BX24();
        
        let response = await BX.call();
        
        console.log(response);

    } catch (error) {
        console.log(error);
    }
})()
