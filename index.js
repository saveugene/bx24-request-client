const BX24 = require('./rest/bx24');

(async function () {
    try {
        const BX = await new BX24();
        
        let data = await BX.call();
        
        console.log(data);

    } catch (error) {
        console.log(error);
    }
})()
