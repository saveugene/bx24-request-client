const RP = require('request-promise-native');
const FSP = require('fs').promises;
const URLP = require('url').parse;

class BX24 {
    constructor() {
        return (async () => {
            await this._loginSet();
            await this._authSet();
            return this;
        })();
    }
    static configPath = {
        login: "./config/login.json",
        auth: "./config/auth.json"
    }
    _authIsExpired() {
        if (Number(this.auth.expires.toString() + "000") < new Date().getTime()) return false;
        else return true;
    }
    async _loginSet() {
        this.login = await BX24.loginRead();
    }
    async _authSet() {
        try {
            this.auth = await BX24.authRead();
        } catch (err) {
            this.auth = await this._authGet();
            await BX24.authWrite(this.auth)
            console.log('Authentication file was created');
        }
        if (!this._authIsExpired()) {
            this.auth = await this._authRefresh();
            await BX24.authWrite(this.auth)
            console.log('Authentication file was recreated');
        }
    }
    async _authGet() {
        let response = await RP({
            method: 'GET',
            uri: `https://${this.login.login}:${this.login.password}@${this.login.portal}/oauth/authorize/?client_id=${this.login.client_id}`,
            resolveWithFullResponse: true
        });
        return JSON.parse(await RP({
            method: 'GET',
            uri: `https://oauth.bitrix.info/oauth/token/?grant_type=authorization_code&client_id=${this.login.client_id}&client_secret=${this.login.client_secret}&code=${URLP(response.request.uri.href, true).query.code}`,
        }));
    }
    async _authRefresh() {
        return JSON.parse(await RP({
            method: 'GET',
            uri: `https://oauth.bitrix.info/oauth/token/?grant_type=refresh_token&client_id=${this.login.client_id}&client_secret=${this.login.client_secret}&refresh_token=${this.auth.refresh_token}`,
        }));
    }
    static authWrite(auth) {
        return BX24.jsonWrite(this.configPath.auth, auth);
    }
    static jsonWrite(path, data) {
        path.split('/').slice(0, -1).reduce((last, folder) => {
            let folderPath = last ? (last + '/' + folder) : folder
            if (!FSP.access(folderPath)) FSP.mkdir(folderPath)
            return folderPath;
        })
        return FSP.writeFile(path, JSON.stringify(data), 'utf-8');
    }
    static async jsonRead(path) {
        return JSON.parse(await FSP.readFile(path, 'utf-8'));
    }
    static authRead() {
        return BX24.jsonRead(BX24.configPath.auth);
    }
    static loginRead() {
        return BX24.jsonRead(BX24.configPath.login);
    }
    async call(method, params) {
        if (!!this.login) {
            try {
                if (!this.auth || !this._authIsExpired()) await this._authSet();
                params.access_token = this.auth.access_token;
                return JSON.parse(await RP({
                    method: 'POST',
                    uri: `https://${this.login.portal}/rest/${method}`,
                    qs: params,
                }));
            } catch (error) {
                throw error;
            }
        } else {
            console.log("Missing login file");
        }
    }
}

module.exports = BX24;