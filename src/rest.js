const axios = require('axios').default;
const Auth = require('./auth');

module.exports = class Rest extends Auth {
    constructor(params = null) {
        super(params);
        if (params !== null)
            this.webhook = params.webhook;
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

    async execCall(url, params) {
        if (typeof params === "string") {
            if(this.auth)
                params += `&access_token=${this.auth.access_token}`;
            return (await axios.post(url, params)).data;
        }
        else {
            if(this.auth)
                params.access_token = this.auth.access_token;
            return (await axios.post(url, params)).data;
        }
    }

    async call(method, params = {}) {
        try {
            let url;
            if (this.webhook) 
                url = this.webhook + method;
            else {
                await this.installEnd;
                if (!this.auth || this.isExpired()) this.install();
                url = `https://${this.auth.portal}/rest/${method}`;
            }
            return this.execCall(url, params);
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