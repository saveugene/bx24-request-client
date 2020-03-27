const BX24 = require('./rest/bx24');

(async () => {
    try {

        const BX = await new BX24();

        let response = await BX.call();

        console.log(response);

    } catch (error) {
        console.log(error);
    }
})()
