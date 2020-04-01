const Rest = require('../src/rest');

(async () => {
    try {
        const rest = new Rest();
        
        let response = await rest.call();

        console.log(response);

    } catch (error) {
        console.log(error);
    }
})();
