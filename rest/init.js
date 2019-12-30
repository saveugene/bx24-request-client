const fs = require('fs');
let readline = require('readline');

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let questionList = [{
        question: 'BX24 login: ',
        key: 'login',
    },
    {
        question: 'BX24 password: ',
        key: 'password',
    },
    {
        question: 'BX24 portal name (e.g: portal.bitrix24.ru): ',
        key: 'portal',
    },
    {
        question: 'BX24 client_id: ',
        key: 'client_id',
    },
    {
        question: 'BX24 client_secret: ',
        key: 'client_secret',
    },
];

async function rlQuestionPromisified(quest) {
    return await new Promise((resolve, reject) => {
        rl.question(quest.question, answer => {
            resolve(answer);
        })
    })
}

function writeFileSyncRecursive(filename, content, charset) {
    filename.split('/').slice(0, -1).reduce((last, folder) => {
        let folderPath = last ? (last + '/' + folder) : folder
        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath)
        return folderPath
    })
    fs.writeFileSync(filename, content, charset)
}

(async function () {
    let login = {};

    for (let quest of questionList) {
        login[quest.key] = await rlQuestionPromisified(quest);
    }
    rl.close();
    console.log(login);
    writeFileSyncRecursive('./config/login.json', JSON.stringify(login), 'utf8');
    console.log('Login file was successfully created');
})()