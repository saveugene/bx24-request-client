const RP = require('request-promise-native');
const fs = require('fs');

function parseURLQS(url) {
    var queryString = url.split('?')[1];
    var obj = {};
    if (queryString) {
        queryString = queryString.split('#')[0];
        var arr = queryString.split('&');
        for (var i = 0; i < arr.length; i++) {
            var a = arr[i].split('=');
            var paramName = a[0];
            var paramValue = typeof (a[1]) === 'undefined' ? true : a[1];
            paramName = paramName.toLowerCase();
            if (typeof paramValue === 'string') paramValue = paramValue.toLowerCase();
            if (paramName.match(/\[(\d+)?\]$/)) {
                var key = paramName.replace(/\[(\d+)?\]/, '');
                if (!obj[key]) obj[key] = [];
                if (paramName.match(/\[\d+\]$/)) {
                    var index = /\[(\d+)\]/.exec(paramName)[1];
                    obj[key][index] = paramValue;
                } else {
                    obj[key].push(paramValue);
                }
            } else {
                if (!obj[paramName]) {
                    obj[paramName] = paramValue;
                } else if (obj[paramName] && typeof obj[paramName] === 'string') {
                    obj[paramName] = [obj[paramName]];
                    obj[paramName].push(paramValue);
                } else {
                    obj[paramName].push(paramValue);
                }
            }
        }
    }
    return obj;
}

function writeFileRecursive(filename, content, charset) {
    filename.split('/').slice(0, -1).reduce((last, folder) => {
        let folderPath = last ? (last + '/' + folder) : folder
        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath)
        return folderPath;
    })
    return fs.promises.writeFile(filename, content, charset)
}

function isAuthRelevant(auth) {
    if (Number(auth.expires.toString() + "000") < new Date().getTime()) return false;
    else return true;
}

class BX24Rest {
    constructor(login) {
        this.login = login;
        this._SetAuth;
    }
    async _GetAuth() {
        let response = await RP({
            method: 'GET',
            uri: `https://${this.login.login}:${this.login.password}@${this.login.portal}/oauth/authorize/?client_id=${this.login.client_id}`,
            resolveWithFullResponse: true
        });
        return JSON.parse(await RP({
            method: 'GET',
            uri: `https://oauth.bitrix.info/oauth/token/?grant_type=authorization_code&client_id=${this.login.client_id}&client_secret=${this.login.client_secret}&code=${parseURLQS(response.request.uri.href).code}`,
        }));
    }
    async _RefreshAuth() {
        return JSON.parse(await RP({
            method: 'GET',
            uri: `https://oauth.bitrix.info/oauth/token/?grant_type=refresh_token&client_id=${this.login.client_id}&client_secret=${this.login.client_secret}&refresh_token=${this.auth.refresh_token}`,
        }));
    }
    static async WriteAuth(auth) {
        return writeFileRecursive('./config/auth.json', JSON.stringify(auth), 'utf8');
    }
    static async ReadAuth() {
        let auth = await fs.promises.readFile('./config/auth.json', 'utf8');
        return JSON.parse(auth);
    }
    async _SetAuth() {
        try {
            this.auth = await BX24Rest.ReadAuth();
        } catch (err) {
            this.auth = await this._GetAuth();
            await BX24Rest.WriteAuth(this.auth)
            console.log('Authentication file was created');
        }
        if (!isAuthRelevant(this.auth)) {
            this.auth = await this._RefreshAuth();
            await BX24Rest.WriteAuth(this.auth)
            console.log('Authentication file was recreated');
        }
    }
    async CallMethod(method, params) {
        if (!!this.login) {
            try {
                if (!this.auth || !isAuthRelevant(this.auth)) {
                    await this._SetAuth();
                }
                params.access_token = this.auth.access_token;
                return RP({
                    method: 'POST',
                    uri: `https://${this.login.portal}/rest/${method}`,
                    qs: params,
                });
            } catch (error) {
                throw error;
            }
        } else {
            console.log("Missing login file");
        }
    }
}

module.exports = BX24Rest;