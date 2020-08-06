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
            if (this.auth)
                params += `&access_token=${this.auth.access_token}`;
            return (await axios.post(url, params)).data;
        }
        else {
            if (this.auth)
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

    async batch(cmd_dict, halt = false) {
        await this.installEnd;
        let qs = `?halt=${halt}`;

        for (const cmd in cmd_dict)
            qs += `&cmd[${cmd}]=` + cmd_dict[cmd].method + "?" + Rest.buildQS(cmd_dict[cmd].params);

        return this.call('batch', qs);
    }

    static batch_packer(method, parameters) {
        const batchPack = {}
        let { params, total, is_dynamic_params = false, start = 0 } = parameters

        const batchPacksCount = Math.ceil(is_dynamic_params ? params.length / 50 : total / 50)

        if (batchPacksCount > 50) return "Too many queries to pack"

        for (let index = 0; index < batchPacksCount; index++) {
            if (is_dynamic_params) {
                batchPack[index] = []
                let j = index
                let counter = 0
                while (counter != 50) {
                    batchPack[index][j] = {
                        'method': method,
                        'params': params[j]
                    }
                    counter++
                    j++
                }
            }
            else {
                batchPack[index] = {
                    'method': method,
                    'params': Object.assign({ start }, params)
                }
                start += 50
            }
        }
        return batchPack
    }
}