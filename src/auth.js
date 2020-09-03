const fs = require('fs'),
    path = require('path'),
    axios = require('axios').default,
    chalk = require('chalk');

module.exports = class Auth {
    static dir = "./auth";

    constructor(params) {
        if (params === null)
            this.install();
    }

    install() {
        try {
            this.auth = Auth.read();
        } catch (err) {
            Auth.error('NOAUTH');
        }
        if (this.isExpired()) {
            Auth.log_it('EXPIRED', this.auth.name);
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
        Auth.log_it('REFRESHED', this.auth.name);
    }

    static error(type) {
        switch (type) {
            case 'NOAUTH':
                Auth.log_it('NOAUTH');
                process.exit();
        }
    }

    static log_it(type, value = false) {
        let message = "";
        switch (type) {
            case 'CREATED':
                message = `Auth ${chalk.cyan(value)} has been ${chalk.green('created')}`;
                break;
            case 'SELECTED':
                message = `Auth ${chalk.cyan(value)} has been ${chalk.green('selected')}`;
                break;
            case 'DELETED':
                message = `Auth ${chalk.cyan(value)} has been ${chalk.red('deleted')}`;
                break;
            case 'REFRESHED':
                message = `Auth ${chalk.cyan(value)} has been ${chalk.green('refreshed')}`;
                break;
            case 'EXPIRED':
                message = `Auth ${chalk.cyan(value)} is ${chalk.red('expired')}`;
                break;
            case 'NOAUTH':
                message = chalk.red('No auth profiles \n') + `Try: ${chalk.cyan('bx-auth')} ${chalk.green('new')}`;
                break;
        }
        console.log(message);
    }

    static read() {
        return JSON.parse(fs.readFileSync(path.resolve(`${Auth.dir}/current.json`), 'utf-8'));
    }

    static write(name, authorization) {
        let pathStr = `${Auth.dir}/${name}/auth.json`;
        fs.mkdirSync(path.dirname(pathStr), { recursive: true });
        fs.writeFileSync(path.resolve(pathStr), JSON.stringify(authorization), 'utf-8');
        Auth.log_it('CREATED', name);
    }


    static setCurrent(name) {
        try {
            return fs.symlinkSync(path.resolve(`${Auth.dir}/${name}/auth.json`), path.resolve(`${Auth.dir}/current.json`), 'file');
        } catch (error) {
            fs.unlinkSync(error.dest);
            Auth.setCurrent(name);
        }
    }

    static supplement(auth, source) {
        auth.portal = source.portal;
        auth.client_secret = source.client_secret;
        auth.client_id = source.client_id;
        auth.name = source.name;
        return auth
    }

    static async authorize(auth) {
        let response = await axios.get(`https://${auth.login}:${auth.password}@${auth.portal}/oauth/authorize/?client_id=${auth.client_id}`);
        return (await axios.get(`https://oauth.bitrix.info/oauth/token/?grant_type=authorization_code&client_id=${auth.client_id}&client_secret=${auth.client_secret}&code=${require('url').parse(response.request.path, true).query.code}`)).data;
    }
}