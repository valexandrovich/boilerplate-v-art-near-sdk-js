let apiKey
let apiKeySecret


import axios from "axios";
import FormData from 'form-data'
// const axios = require('axios');
// const FormData = require('form-data');
const pinImgUrl = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
const pinJsonUrl = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
import { sha256 } from 'js-sha256';
// import firebaseService from './firebase-service';
// import sjcl from "sjcl";

class PinataService {

    #apiKey
    #apiKeySecret

    constructor(API_KEY, API_KEY_SECRET){
        this.apiKey = API_KEY
        this.apiKeySecret = API_KEY_SECRET
    }

    async getHexBase64FromBlob(blob) {
        const unit8array = await blob.arrayBuffer()
        var hash = sha256.create()
        hash.update(unit8array)
        const b64 = Buffer.from(hash.hex(), 'hex').toString('base64')
        return b64
    }

    async getHexBase64FromJson(jsonObject) {
        // const unit8array = await blob.arrayBuffer()
        var hash = sha256.create()
        hash.update(JSON.stringify(jsonObject))
        const b64 = Buffer.from(hash.hex(), 'hex').toString('base64')
        return b64
    }

    async pinFile(blob, name) {

        const b64 = await this.getHexBase64FromBlob(blob)
        let data = new FormData();
        data.append('file', blob)
        data.append('pinataMetadata', '{"name" : "' + name + '"}')
        return axios
            .post(pinImgUrl, data, {
                maxBodyLength: 'Infinity',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                    pinata_api_key: this.apiKey,
                    pinata_secret_api_key: this.apiKeySecret
                }
            })
            .then(resp => {
                return {
                    ipfsHash: resp.data.IpfsHash,
                    hexB64: b64
                }
            })
            .catch(err => console.log(err))
    }

    async pinJson(content, name) {
        const b64 = await this.getHexBase64FromJson(content)
        // console.log('JSON hex')
        // console.log(hexB64)

        let pinataJson = {
            pinataMetadata: {
                name: name,
            },
            pinataContent: content
        }
        return axios
            .post(pinJsonUrl, JSON.stringify(pinataJson), {
                headers: {
                    pinata_api_key: this.apiKey,
                    pinata_secret_api_key: this.apiKeySecret,
                    'Content-Type': 'application/json'
                }
            })
            .then(resp => {
                return {
                    ipfsHash: resp.data.IpfsHash,
                    hexB64: b64
                }
            })
            .catch(err => console.log(err))
    }
}

export default  PinataService