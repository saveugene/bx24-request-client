const axios = require('axios').default;
const Auth = require('./auth');

module.exports = class Rest extends Auth {
    constructor() {
        super();
    }

    static buildQS(obj, prefix) {
        let str = [];
        for (let p in obj) {
            if (obj.hasOwnProperty(p)) {
                let k = prefix ? prefix + "[" + p + "]" : p,
                    v = obj[p];
                str.push((v !== null && typeof v === "object") ?
                    Rest.buildQS(v, k) :
                    encodeURIComponent(k) + "=" + encodeURIComponent(v));
            }
        }
        return str.join("&");
    }

    async call(method, params = {}) {
        await this.installEnd;
        try {
            if (!this.auth || this.isExpired()) this.install();
            let url = `https://${this.auth.portal}/rest/${method}`;
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

    }

    async batch(params) {
        await this.installEnd;
        let qs = `?halt=${params.halt}`;

        for (const call in params.cmd)
            qs += `&cmd[${call}]=` + params.cmd[call].method + "?" + Rest.buildQS(params.cmd[call].params);

        return this.call('batch', qs);
    }
}