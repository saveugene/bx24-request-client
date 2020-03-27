const axios = require('axios').default;
const fs = require('fs').promises;
const url = require('url');

class BX24 {
    constructor() {
        return (async () => {
            await this._loginSet();
            await this._authSet();
            return this;
        })();
    }

    static buildQS(obj, prefix) {
        let str = [];
        for (let p in obj) {
            if (obj.hasOwnProperty(p)) {
                let k = prefix ? prefix + "[" + p + "]" : p,
                    v = obj[p];
                str.push((v !== null && typeof v === "object") ?
                    BX24.buildQS(v, k) :
                    encodeURIComponent(k) + "=" + encodeURIComponent(v));
            }
        }
        return str.join("&");
    }

    static configPath = {
        login: "./config/login.json",
        auth: "./config/auth.json"
    }

    _authIsExpired() {
        if (Number(this.auth.expires.toString() + "000") > new Date().getTime()) return true;
        else return false;
    }

    async _loginSet() {
        this.login = await BX24.loginRead();
    }

    async _authSet() {
        try {
            this.auth = await BX24.authRead();
        } catch (err) {
            console.log('Missing authentication file');
            this.auth = await this._authGet();
            console.log('Authentication file was created');
        }
        if (!this._authIsExpired()) {
            console.log('Authentication file is deprecated');
            this.auth = await this._authRefresh();
            console.log('Authentication file was recreated');
        }
        await BX24.authWrite(this.auth);
    }

    async _authGet() {
        let response = await axios.get(`https://${this.login.login}:${this.login.password}@${this.login.portal}/oauth/authorize/?client_id=${this.login.client_id}`);
        return (await axios.get(`https://oauth.bitrix.info/oauth/token/?grant_type=authorization_code&client_id=${this.login.client_id}&client_secret=${this.login.client_secret}&code=${url.parse(response.request.path, true).query.code}`)).data;
    }

    async _authRefresh() {
        return (await axios.get(`https://oauth.bitrix.info/oauth/token/?grant_type=refresh_token&client_id=${this.login.client_id}&client_secret=${this.login.client_secret}&refresh_token=${this.auth.refresh_token}`)).data;
    }

    static async jsonWrite(path, data) {
        await path.split('/').slice(0, -1).reduce(async (last, folder) => {
            let folderPath = last ? (last + '/' + folder) : folder;
            try {
                await fs.access(folderPath);
            } catch (error) {
                await fs.mkdir(folderPath);
            }
        })
        return fs.writeFile(path, JSON.stringify(data), 'utf-8');
    }

    static async jsonRead(path) {
        return JSON.parse(await fs.readFile(path, 'utf-8'));
    }

    static authWrite(auth) {
        return BX24.jsonWrite(BX24.configPath.auth, auth);
    }

    static authRead() {
        return BX24.jsonRead(BX24.configPath.auth);
    }

    static loginRead() {
        return BX24.jsonRead(BX24.configPath.login);
    }

    async call(method, params = {}) {
        if (!!this.login) {
            try {
                if (!this.auth || this._authIsExpired()) await this._authSet();

                let url = `https://${this.login.portal}/rest/${method}`;
                if (typeof params === "string") {
                    params += `&access_token=${this.auth.access_token}`;
                    return (await axios.post(url + params)).data;
                }
                else {
                    params.access_token = this.auth.access_token;
                    return (await axios.post(url, params)).data;
                }
            } catch (error) {
                throw error;
            }
        } else {
            console.log("Missing login file");
        }
    }

    async batch(params) {
        let qs = `?halt=${params.halt}`;

        for (const call in params.cmd)
            qs += `&cmd[${call}]=` + params.cmd[call].method + "?" + BX24.buildQS(params.cmd[call].params);

        return this.call('batch', qs);
    }
}

module.exports = BX24;