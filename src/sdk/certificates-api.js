// const Ajv = require("ajv")
// import Ajv from "ajv";
// const ajv = new Ajv()
import axios from "axios"
// import moment from "moment"
// const FormData = require('form-data');
import FormData from 'form-data'
// const schema = {
//     type: "object",
//     properties: {
//         preview_image: { type: "string" },
//         author: { type: "string" },
//         name: { type: "string" },
//         year: { type: "string" },
//         edition: { type: "string" },
//         quantity: { type: "integer" },
//         url: { type: "string" },
//         currency: { enum: ["ethereum", "near"] },
//         contract: { type: "string" },
//         genre: { type: "string" },
//         dimensions: { type: "string" },
//         slug_link: { type: "string" },
//         copyrights: {
//             type: "array",
//             items: {
//                 type: "string",
//                 enum: [
//                     "adaption",
//                     "storage",
//                     "placement",
//                     "publication",
//                     "metadata",
//                     "demonstration",
//                     "personal_use",
//                     "advertising"
//                 ]
//             }
//
//         },
//         token_id: { type: "string" },
//         creation_date: { type: "string" },
//     },
//     required: ["preview_image", "author", "name", "year", "edition", "quantity", "url",
//         "currency", "contract", "genre", "dimensions", "slug_link", "copyrights",
//         "token_id", "creation_date"
//     ],
//     additionalProperties: false
// }

// const validate = ajv.compile(schema)

class CertificatesApi {

    constructor(
        certHost, certTokenPrefix, certLicensePrefix, certDownloadPrefix
    ) {
        this.certHost = certHost
        this.certTokenPrefix = certTokenPrefix
        this.certLicensePrefix = certLicensePrefix
        this.certFownloadPrefix = certDownloadPrefix

    }

    async downloadCertificate(certificateDownloadUrl) {
        console.log("CERTIFICATE URL")
        console.log(certificateDownloadUrl)

        // const pdfUrl = this.certHost + "/" + this.certDownloadUrl + '/' + certificateId + "/certificate.pdf";
        var config = {
            method: 'GET',
            url: certificateDownloadUrl,
            responseType: "blob",
            headers: {}
        };

        // const response = await axios(config)
        // return new Blob([response.data], { type: 'application/pdf' })
        return await axios(config)
    }

    async createCertificate(certificateMetadata) {
        let certResolve, certReject;
        let certCreate = new Promise(function (resolve, reject) {
            certResolve = resolve;
            certReject = reject;
        });
        let data = new FormData()
        data.append('preview_image', certificateMetadata.previewImage)
        data.append('creative_asset', certificateMetadata.name),
            //     data.append('author', certificateMetadata.author)
            // data.append('year', certificateMetadata.year)
            // data.append('edition', certificateMetadata.edition)
            // data.append('quantity', certificateMetadata.quantity)
            data.append('url', certificateMetadata.url)
        // data.append('currency', certificateMetadata.currency)
        data.append('contract', certificateMetadata.contract)
        data.append('genre', certificateMetadata.genre)
        // data.append('dimensions', certificateMetadata.dimensions)
        // data.append('slug_link', certificateMetadata.slugLink)
        certificateMetadata.copyrights.forEach((c, i) => {
            data.append('copyrights[' + i + ']', c)
        })
        data.append('token_id', certificateMetadata.tokenId)
        // data.append('creation_date', certificateMetadata.creationDate)


        // add for new
        // data.append('licence_owner', certificateMetadata.)
        // data.append('licence_type', certificateMetadata.)
        data.append('currency', certificateMetadata.currency)
        // data.append('regions', certificateMetadata.)
        // data.append('dimensions', certificateMetadata.)
        // data.append('format', certificateMetadata.)
        // data.append('biography', certificateMetadata.)
        // data.append('original_ip_token', certificateMetadata.)
        // data.append('licence_from', certificateMetadata.)
        // data.append('licence_to', certificateMetadata.)
        // data.append('goal', certificateMetadata.)
        await axios.post(
            this.certHost + '/' + this.certApiUrl
            , data, {
                maxBodyLength: 'Infinity',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                }
            }
        )
            .then(resp => {
                certResolve(resp.data)
            })
            .catch(err => {
                certReject(err)
            })
        await certCreate
        return certCreate
    }


    async createTokenCertificate(certificateMetadata) {


        let certResolve, certReject;
        let certCreate = new Promise(function (resolve, reject) {
            certResolve = resolve;
            certReject = reject;
        });
        let data = new FormData()
        data.append('preview_image', certificateMetadata.previewImage)
        data.append('creativeAsset', certificateMetadata.creativeAsset)
        data.append('contract', certificateMetadata.contract)
        data.append('tokenId', certificateMetadata.tokenId)
        !data.append('format', certificateMetadata.format)
        data.append('owner', certificateMetadata.owner)
        data.append('creationDate', certificateMetadata.creationDate)
        data.append('edition', certificateMetadata.edition)
        data.append('quantity', certificateMetadata.quantity)
        data.append('type', certificateMetadata.type)
        //     data.append('author', certificateMetadata.author)
        // data.append('year', certificateMetadata.year)
        // data.append('edition', certificateMetadata.edition)
        // data.append('quantity', certificateMetadata.quantity)
        // data.append('url', certificateMetadata.url)
        // data.append('currency', certificateMetadata.currency)
        // data.append('contract', certificateMetadata.contract)
        // data.append('genre', certificateMetadata.genre)
        // data.append('dimensions', certificateMetadata.dimensions)
        // data.append('slug_link', certificateMetadata.slugLink)
        certificateMetadata.copyrights.forEach((c, i) => {
            data.append('copyrights[' + i + ']', c)
        })


        let index = 0;
        for (let artist in certificateMetadata.artists) {
            if (certificateMetadata.artists.hasOwnProperty(artist)) {
                console.log(`artists[${index}]`, artist)
                data.append(`artists[${index}]`, artist);
                index++;
            }
        }

        await axios.post(
            this.certHost  + this.certTokenPrefix
            , data, {
                maxBodyLength: 'Infinity',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                }
            }
        )
            .then(resp => {
                certResolve(resp.data)
            })
            .catch(err => {
                certReject(err)
            })
        await certCreate
        return certCreate
    }

    // validateData(metadata) {
    //     const cd = moment(metadata.creation_date, 'DD/MM/YYYY HH:mm:ss')
    //     if (cd.isValid() && validate(metadata)) {
    //         return true
    //     } else {
    //         return false
    //     }
    // }

}

export default CertificatesApi