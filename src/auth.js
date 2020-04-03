const fs = require('fs'),
    path = require('path'),
    axios = require('axios').default,
    chalk = require('chalk');

module.exports = class Auth {
    static dir = "./auth";

    constructor(params) {
        if(params === null)
            this.install();
    }

    static exceptionHandler(type) {
        switch (type) {
            case 'NOAUTH':
                console.log(chalk.red('No auth profiles'));
                console.log('Try: ' + chalk.cyan('bx-auth') + chalk.green(' --new'));
                process.exit();
        }
    }

    install() {
        try {
            this.auth = Auth.read();
        } catch (err) {
            Auth.exceptionHandler('NOAUTH');
        }
        if (this.isExpired()) {
            console.log('Auth is' + chalk.red('expired'));
            this.installEnd = this.refresh(this.auth.name);
        }
    }

    isExpired() {
        if (Number(this.auth.expires.toString() + "000") < new Date().getTime()) return true;
        else return false;
    }

    async refresh() {
        let auth = (await axios.get(`https://oauth.bitrix.info/oauth/token/?grant_type=refresh_token&client_id=${this.auth.client_id}&client_secret=${this.auth.client_secret}&refresh_token=${this.auth.refresh_token}`)).data;
        this.auth = Auth.supplement(auth, this.auth);
        Auth.write(this.auth.name, this.auth);
        console.log('Auth ' + chalk.cyan(this.auth.name) + ' has been ' + chalk.green('refreshed'));
    }

    static read() {
        return JSON.parse(fs.readFileSync(path.resolve(`${Auth.dir}/current.json`), 'utf-8'));
    }

    static write(name, authorization) {
        let pathStr = `${Auth.dir}/${name}/auth.json`;
        fs.mkdirSync(path.dirname(pathStr), { recursive: true });
        fs.writeFileSync(path.resolve(pathStr), JSON.stringify(authorization), 'utf-8');
        console.log("Auth "+chalk.cyan(name) + ' has been successfully created');
    }

    static getList() {
        try {
            const authList = fs.readdirSync(Auth.dir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            if (!authList.length)
                Auth.exceptionHandler('NOAUTH');
            return authList;
        } catch (error) {
            Auth.exceptionHandler('NOAUTH');
        }
    }

    static symLinkToCurrent(name) {
        try {
            return fs.symlinkSync(path.resolve(`${Auth.dir}/${name}/auth.json`), path.resolve(`${Auth.dir}/current.json`), 'file');
        } catch (error) {
            fs.unlinkSync(error.dest);
            Auth.symLinkToCurrent(name);
        }
    }

    static cli(rawArgs) {
        const args = require('arg')(
            {
                '--new': Boolean,
                '--delete': Boolean,
                '--change': Boolean,
                '--list': Boolean,
                '-n': '--new',
                '-d': '--delete',
                '-c': '--change',
                '-l': '--list'
            },
            {
                argv: rawArgs.slice(2)
            }
        );

        const params = {
            new: args['--new'] || false,
            delete: args['--delete'] || false,
            change: args['--change'] || false,
            list: args['--list'] || false
        }

        if (params.new) Auth.new();
        if (params.delete) Auth.delete(params.delete);
        if (params.change) Auth.change(params.change);
        if (params.list) Auth.list();
    }

    static new() {
        let questions = [
            {
                type: 'input',
                name: 'name',
                message: "Auth name:",
            },
            {
                type: 'input',
                name: 'login',
                message: "Bitrix24 login:",
            },
            {
                type: 'password',
                name: 'password',
                message: "Bitrix24 password:",
            },
            {
                type: 'input',
                name: 'portal',
                message: "Bitrix24 portal:",
            },
            {
                type: 'input',
                name: 'client_id',
                message: "Bitrix24 client_id:",
            },
            {
                type: 'input',
                name: 'client_secret',
                message: "Bitrix24 client_secret:",
            }
        ];

        Auth.prompt(questions).then((answers, reject) => {
            Auth.authorize(answers).then((auth, reject) => {
                auth = Auth.supplement(auth, answers);
                Auth.write(answers.name, auth);
                Auth.symLinkToCurrent(answers.name);
            })
        });
    }

    static supplement(auth, source) {
        auth.portal = source.portal;
        auth.client_secret = source.client_secret;
        auth.client_id = source.client_id;
        auth.name = source.name;
        return auth
    }

    static change() {
        let questions = [{
            type: 'list',
            name: 'name',
            message: "Choose which auth to use",
            choices: Auth.getList()
        }];
        Auth.prompt(questions).then((answers, reject) => {
            Auth.symLinkToCurrent(answers.name);
            console.log(`Auth ${chalk.cyan(answers.name)} has been selected`);
        });
    }

    static delete() {
        let questions = [{
            type: 'list',
            name: 'name',
            message: "Choose which auth to delete",
            choices: Auth.getList()
        }];
        Auth.prompt(questions).then((answers, reject) => {
            fs.rmdirSync(`auth/${answers.name}`, { recursive: true });
            console.log(`Auth ${chalk.cyan(answers.name)} has been deleted`);
        });

    }

    static list() {
        let i = 1;
        for (const authName of Auth.getList()) {
            console.log(i + ") " + chalk.cyan(authName));
            i++;
        }
    }

    static prompt(questions) {
        return require('inquirer').prompt(questions);
    }

    static async authorize(auth) {
        let response = await axios.get(`https://${auth.login}:${auth.password}@${auth.portal}/oauth/authorize/?client_id=${auth.client_id}`);
        return (await axios.get(`https://oauth.bitrix.info/oauth/token/?grant_type=authorization_code&client_id=${auth.client_id}&client_secret=${auth.client_secret}&code=${require('url').parse(response.request.path, true).query.code}`)).data;
    }
}