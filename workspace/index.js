const Client = require('../src/client');

(async () => {
    try {
        const client = new Client();
        
        let response = await client.call_method();

        console.log(response);

    } catch (error) {
        console.log(error);
    }
})();
