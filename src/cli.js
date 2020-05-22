const fs = require('fs'),
    chalk = require('chalk'),
    Auth = require('./auth'),
    prompt = require('inquirer').prompt;

module.exports = class Cli extends Auth {
    static getList() {
        try {
            const authList = fs.readdirSync(Auth.dir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            if (!authList.length)
                Auth.error('NOAUTH');
            return authList;
        } catch (error) {
            Auth.error('NOAUTH');
        }
    }

    static cli(rawArgs) {
        const args = require('arg')(
            {
                '--name': String,
            },
            {
                argv: rawArgs.slice(2)
            }
        );

        const params = {
            name: args['--name'] || false
        }

        switch (args['_'][0]) {
            case 'new':
                Cli.new();
                break;
            case 'list':
                Cli.list();
                break;
            case "delete":
                Cli.delete(params.name);
                break;
            case 'change':
                Cli.change(params.name);
                break;

        }
    }

    static new() {
        let questions = [
            {
                type: 'input',
                name: 'name',
                message: "auth name:",
            },
            {
                type: 'input',
                name: 'login',
                message: "login:",
            },
            {
                type: 'password',
                name: 'password',
                message: "password:",
            },
            {
                type: 'input',
                name: 'portal',
                message: "portal:",
            },
            {
                type: 'input',
                name: 'client_id',
                message: "client_id:",
            },
            {
                type: 'input',
                name: 'client_secret',
                message: "client_secret:",
            }
        ];

        prompt(questions).then((answers, reject) => {
            Auth.authorize(answers).then((auth, reject) => {
                auth = Auth.supplement(auth, answers);
                Auth.write(answers.name, auth);
                Auth.setCurrent(answers.name);
            })
        });
    }

    static change(name) {
        if (name) {
            Auth.setCurrent(name);
            Auth.logs('SELECTED', name);
        }
        else {
            const questions = [{
                type: 'list',
                name: 'name',
                message: 'Choose which auth to use',
                choices: Cli.getList()
            }];
            prompt(questions).then((answers, reject) => {
                Auth.setCurrent(answers.name);
                Auth.logs('SELECTED', answers.name);
            });
        }
    }

    static delete(name) {
        if (name) {
            fs.rmdirSync(`auth/${name}`, { recursive: true });
            Auth.logs('DELETED', name);
        }
        else {
            const questions = [{
                type: 'list',
                name: 'name',
                message: 'Choose which auth to delete',
                choices: Cli.getList()
            }];
            prompt(questions).then((answers, reject) => {
                fs.rmdirSync(`auth/${answers.name}`, { recursive: true });
                Auth.logs('DELETED', answers.name);
            });
        }
    }

    static list() {
        let i = 1;
        for (const name of Cli.getList()) {
            console.log(`${i}. ${chalk.cyan(name)}`);
            i++;
        }
    }
}