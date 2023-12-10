import * as nearAPI from "near-api-js";
// const axios = require("axios")
import axios from "axios";
const { keyStores, connect, WalletConnection } = nearAPI;
const { utils } = nearAPI;
import PinataService from "./pinata";
import CertificatesApi from "./certificates-api"
import moment from 'moment'
import { parseNearAmount } from 'near-api-js/lib/utils/format';

// let near, wallet, account, contract

class vArtNearApi {

    keyStore = new keyStores.BrowserLocalStorageKeyStore()
    nodeUrl = 'https://rpc.testnet.near.org'
    walletUrl = 'https://wallet.testnet.near.org'
    helperUrl = 'https://helper.testnet.near.org'
    explorerUrl = 'https://explorer.testnet.near.org'

    backendUrl = 'https://licensing-testnet.v-art.digital:3100'


    constructor(config) {
        this.adminId = config.contract.adminId
        this.nftContractId = config.contract.nftContractId
        this.marketContractId = config.contract.marketContractId
        this.licenseContractId = config.contract.licenseContractId
        this.net = config.contract.net

        if (typeof config.contract.keyStore != 'undefined') { this.nodeUrl = config.contract.keyStore }
        if (typeof config.contract.nodeUrl != 'undefined') { this.nodeUrl = config.contract.nodeUrl }
        if (typeof config.contract.walletUrl != 'undefined') { this.walletUrl = config.contract.walletUrl }
        if (typeof config.contract.helperUrl != 'undefined') { this.helperUrl = config.contract.helperUrl }
        if (typeof config.contract.explorerUrl != 'undefined') { this.explorerUrl = config.contract.explorerUrl }

        if (typeof config.backendUrl != 'undefined') { this.backendUrl = config.backendUrl }
        this.graphUrl = config.graphUrl

        this.ipfsApiKey = config.ipfs.apiKey
        this.ipfsApiKeySecret = config.ipfs.apiKeySecret
        this.ipfsGateway = config.ipfs.gateway

        this.certHost = config.certificate.host
        this.certTokenPrefix = config.certificate.tokenPrefix
        this.certLicensePrefix = config.certificate.licensePrefix
        this.certDownloadPrefix = config.certificate.downloadPrefix


        console.log(this.certHost)
        console.log(this.certTokenPrefix)
        console.log(this.certLicensePrefix)
        console.log(this.certDownloadPrefix)

        // this.certApiUrl = config.certificate.apiUrl
        // this.certDownloadUrl = config.certificate.downloadUrl

        this.ipfsService = new PinataService(this.ipfsApiKey, this.ipfsApiKeySecret)
        this.certificateService = new CertificatesApi(this.certHost, this.certTokenPrefix, this.certLicensePrefix,
            this.certDownloadPrefix)
    }

    /** SERVICE METHODS     */

    async init() {
            const config = {
                networkId: this.net,
                keyStore: this.keyStore,
                nodeUrl: this.nodeUrl,
                walletUrl: this.walletUrl,
                helperUrl: this.helperUrl,
                explorerUrl: this.explorerUrl,
            };
            this.near = await connect(config);
            this.wallet = new WalletConnection(this.near, 'v-art-sdk-app');
            this.nftContract = this.loadNftContract();
            this.marketContract = this.loadMarketContract();
            this.licenseContarct = this.loadLicenseContract();
            console.log('V-ART Near sdk initialized')
    }

    loadNftContract() {
        const walletAccountObj = this.wallet.account();
        return new nearAPI.Contract(walletAccountObj, this.nftContractId, {
            viewMethods: [
                'get_nft_token',
                'nft_payout',
                'nft_metadata',
                'get_minters',
                'nft_tokens_for_minter',
                'nft_total_supply',
                'nft_tokens_for_owner',
            ],
            changeMethods: ['update_minters', 'nft_mint', 'nft_approve', 'nft_burn', 'nft_transfer', 'nft_approve_initial'],
        });
    }

    loadMarketContract() {
        const walletAccountObj = this.wallet.account();
        return new nearAPI.Contract(walletAccountObj, this.marketContractId, {
            viewMethods: [
                'get_nft_price',
                'get_nfts',
                'license_sales_supply_by_token_id',
                'license_sales_by_token_id',
                'license_sales_supply',
                'license_sales',
                'get_market_settings'
            ],
            changeMethods: [
                'buy',
                'remove_from_market',
                'claim_nft',
                'withdraw_funds',
                'create_license_sale',
                'update_license_sale',
                'remove_license_sale',
                'license_buy',
                'add_beneficiary',
                'remove_beneficiary',
                'update_market_settings'
            ],
        });
    }

    loadLicenseContract() {
        const walletAccountObj = this.wallet.account();
        return new nearAPI.Contract(walletAccountObj, this.licenseContractId, {
            viewMethods: [
                'nft_licenses_for_token'
            ],

        });
    }





    async createBlob(file) {
        let blobResolve
        let blobDone = new Promise((resolve, reject) => {
            blobResolve = resolve
        });
        let reader = new FileReader()
        reader.onload = function (e) {
            let blob = new Blob([new Uint8Array(e.target.result)], {
                type: "image/jpeg",
            });
            blobResolve(blob)
        };
        reader.readAsArrayBuffer(file);
        await blobDone
        return blobDone
    }

    async fixPdf(blob) {
        let p = new Promise((resolve, reject) => {
            var fileReader = new FileReader();
            fileReader.onload = function (event) {
                resolve(event.target.result);
            };
            fileReader.onerror = reject;
            fileReader.readAsArrayBuffer(blob);
        });
        const arr = await p;
        const uint8array = new Uint8Array(arr);
        const pdfTriggerIndex = this.findPdfTrigger(uint8array);
        const arr2 = arr.slice(pdfTriggerIndex);
        return new Blob([arr2], { type: "application/pdf" });
    }

    findPdfTrigger(array) {
        var result = -1;
        const pdfTrigger = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
        const arrEquals = (a, b) =>
            a.length === b.length && a.every((v, i) => v === b[i]);
        array.forEach((e, index) => {
            if (e == pdfTrigger[0] && result == -1) {
                const tmpArray = array.slice(index, index + pdfTrigger.length);
                if (arrEquals(pdfTrigger, tmpArray)) {
                    result = index;
                }
            }
        });
        return result;
    }

    /** Requesting login to NEAR wallet (Before login signOut() will be processed!)
     *
     * signIn() : void
     */
    signIn() {
        this.signOut();
        this.wallet.requestSignIn({});
    }

    /** Logging out from NEAR wallet
     *
     * signOut(): void
     */
    signOut() {
        console.log(this.wallet)
        this.wallet.signOut();
    }

    /** Getting current logged account to NEAR wallet
     *
     * @returns string
     */
    getAccount() {
        if (this.wallet) {
            return this.wallet.getAccountId();
        } else {
            return null;
        }
    }

    /** ***************************   CONTRACT INTERACT  ***************************   */

    /** NFT CONTRACT */

    /**  Metadata about NFT contract
     * @returns {
     * "spec": string,
     * "name": string,
     * "symbol": string,
     * "icon": string,
     * "base_uri": string,
     * "reference": string,
     * "reference_hash": string
     * }
     */
    async getContractMetadata() {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const metadata = await this.nftContract.nft_metadata();
            return metadata;
        }
    }

    /** Method for all stages of minting NFT token
     *
     * - upload media and preview content to IPFS storage
     * - create certificate
     * - upload certificate to IPFS storage
     * - create token metadata (with links to certificate , media and preview)
     * - upload token metadata to IPFS storage
     * - mint token on NFT contract
     *
     * @param fullMintMetadata
     * object like => {
     * tokenId: string,                                     // tokenID - must be unique
     * media: File | null,                                  // media - file with original media content for NFT token
     * preview: File | null,                                // preview - file with preview image for NFT token
     * title: string,                                       // token title
     * medium: string,                                      // token medium ( ".JPG, .PNG, .MP4 etc")
     * genre: string,                                       // genre of NFT token  ("Art" ... )
     * bio: string,                                         // NFT token author biography
     * format: string,                                      // NFT token format (like .fbx, .png, .mp4 etc)
     * type: string,                                        // NFT token type (like 3D Model, Video, Image etc.)
     * description: string,                                 // Description of NFT Token
     * artist: string,                                      // NFT token artist name
     * createdBy: string,                                   // NFT token creator name
     * year: number,                                        // Year of creation NFT token
     * price: number,                                       // NFT token price (in NEAR)
     * artists: {string : number, string : number ... },    // NFT token artsists profit distribution (total must be equal to 100) ( {'artist1.near': 10, 'artist2.near': 90} )
     * royalties: {string : number, string : number ...},   // NFT token first sale profit distribution (total must be equal to 100) ( {'royalty1.near': 10, 'royalty2.near': 90} )
     * quantity: number,                                    // Quantity of minted NFT token
     * edition: number,                                     // Edition of NFT token
     * copies: number,                                      // Copies of minted NFT token
     * }
     * @param deposit : string                              // OPTIONAL Deposit for transaction (in NEAR; default '0.1')
     * @param gas     : string                              // OPTIONAL GAS for transaction (in NEAR; default '0.0000000003')
     */
    async fullMint(fullMintMetadata, deposit = '0.1', gas = '0.0000000003') {

        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        }

        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }

        if (!this.getAccount() || this.getAccount() === '') {
            throw new Error('You are not logged in wallet!');
        }

        let previewBlob;
        let mediaBlob;

        let previewUrl = '';
        let previewHash = '';
        let mediaUrl = '';
        let mediaHash = '';

        if (fullMintMetadata.preview) {
            previewBlob = await this.createBlob(fullMintMetadata.preview);
        } else {
            throw new Error('Preview in full mint metadata is empty!');
        }

        await this.ipfsService.pinFile(previewBlob, 'PREVIEW_' + fullMintMetadata.title).then((resp) => {
            previewUrl = this.ipfsGateway + resp.ipfsHash;
            previewHash = resp.hexB64;
        });


        if (fullMintMetadata.media) {
            mediaBlob = await this.createBlob(fullMintMetadata.media);
        } else {
            throw new Error('Media in full mint metadata is empty!');
        }

        await this.ipfsService.pinFile(mediaBlob, 'MEDIA_' + fullMintMetadata.media).then((resp) => {
            mediaUrl = this.ipfsGateway + resp.ipfsHash;
            mediaHash = resp.hexB64;
        });


        const date = new Date();
        const strDate = date.toISOString().slice(0, 10) + ' 00:00:00.000';



        const certificateMetadata = {
            tokenId: fullMintMetadata.tokenId,
            previewImage: previewBlob,
            creativeAsset: fullMintMetadata.title,
            owner: fullMintMetadata.createdBy,
            // year: fullMintMetadata.year,
            edition: fullMintMetadata.edition,
            quantity: fullMintMetadata.quantity,
            format: fullMintMetadata.format,
            type: fullMintMetadata.type,
            // url: mediaUrl,
            // currency: 'near',
            contract: this.nftContractId,
            // genre: fullMintMetadata.genre,
            // dimensions: 'x',
            // slugLink: fullMintMetadata.tokenId,
            artists: fullMintMetadata.artists,
            copyrights: [
                'adaption',
                'storage',
                'placement',
                'publication',
                'metadata',
                'demonstration',
                'personal_use',
                'advertising',
            ],
            creationDate: moment(new Date()).format('DD/MM/YYYY HH:mm:ss'),
        };


        const certificate = await this.certificateService.createTokenCertificate(certificateMetadata)



        const certificateBlob = await this.certificateService.downloadCertificate(
            certificate.downloadUrl
        );


        let certificateUrl;
        let certificateHash;

        await this.ipfsService.pinFile(certificateBlob, 'CERT_' + fullMintMetadata.title ).then((resp) => {
            console.log(resp)
            console.log('LINK')
            console.log(this.ipfsGateway + resp.ipfsHash)
            certificateUrl = this.ipfsGateway + resp.ipfsHash;
            certificateHash = resp.hexB64;
        });

        const referenceData = {
            name: fullMintMetadata.tokenId + '.json',
            product: {
                id: fullMintMetadata.tokenId,
                picture: fullMintMetadata.title + fullMintMetadata.medium,
                name: fullMintMetadata.title,
                medium: fullMintMetadata.medium,
                genre: fullMintMetadata.genre,
                bio: fullMintMetadata.bio,
                description: fullMintMetadata.description,
                artist: fullMintMetadata.artist,
                createdBy: fullMintMetadata.createdBy,
                ownedBy: null,
                year: fullMintMetadata.year,
                price: fullMintMetadata.price,
                blockchain: 'Near',
                artistsWallets: fullMintMetadata.artists,
                royaltiesWallets: fullMintMetadata.royalties,
                quantiy: fullMintMetadata.quantity,
                edition: fullMintMetadata.edition,
                media_preview: previewUrl,
                media_preview_hash: previewHash,
                media: mediaUrl,
                media_hash: mediaHash,
                metadata: null,
                metadata_hash: null,
                certificate: certificateUrl,
                certificate_hash: certificateHash,
                art_size: null,
            },
            certificate,
        };

        let referenceUrl;
        let referenceHash;
        await this.ipfsService.pinJson(referenceData, 'METADATA_' + fullMintMetadata.title).then((resp) => {
            referenceUrl = this.ipfsGateway + resp.ipfsHash
            referenceHash = resp.hexB64
        });


        const repackRoyalties = {}
        for (const k in fullMintMetadata.royalties) {
            repackRoyalties[fullMintMetadata.royalties[k].id] = fullMintMetadata.royalties[k].value
        }

        const repackArtists = {}
        for (const j in fullMintMetadata.artists) {
            repackArtists[fullMintMetadata.artists[j].id] = fullMintMetadata.artists[j].value
        }

        const tokenMetadata = {
            title: fullMintMetadata.title,
            description: fullMintMetadata.description,
            media: mediaUrl,
            media_hash: mediaHash,
            copies: fullMintMetadata.copies,
            issued_at: strDate,
            expires_at: strDate,
            starts_at: strDate,
            updated_at: strDate,
            reference: referenceUrl,
            reference_hash: referenceHash,
        };

        console.log(tokenMetadata)


        console.log(this.nftContract)
        console.log(fullMintMetadata.tokenId)
        console.log(this.getAccount())
        console.log(tokenMetadata)
        console.log(fullMintMetadata.royalties)
        console.log(utils.format.parseNearAmount(gas))
        console.log(utils.format.parseNearAmount(deposit))


        if (this.nftContract) {
            await this.nftContract.nft_mint({
                args: {
                    token_id: fullMintMetadata.tokenId,
                    token_owner_id: this.getAccount(),
                    token_metadata: tokenMetadata,
                    token_royalties: fullMintMetadata.royalties,
                },
                gas: utils.format.parseNearAmount(gas),
                amount: utils.format.parseNearAmount(deposit),
                accountId: this.getAccount(),
            })
                .then(resp => {
                    console.log(resp)
                })
            ;
        }
    }



    /** Method for simple direct minting NFT token
     * @param simpleMintMetadata
     * object like => {
     * tokenId : string,                                   // tokenID - must be unique
     * title : string,                                     // Token title
     * description : string,                               // Description of NFT Token
     * media : string,                                     // Link to original media content to IFPS storage
     * mediaHash : string,                                 // Hash of original media content in IFPS storage
     * copies : number,                                    // Copies of minted NFT token
     * reference : string,                                 // Link to token metadata in IPFS storage
     * referenceHash : string,                             // Hash for token metadata in IPFS storage
     * royalties : {string : number, string : number ...}, // NFT token first sale profit distribution (total must be equal to 100) ( {'royalty1.near': 10, 'royalty2.near': 90} )
     * }
     * @param deposit : string                             // OPTIONAL Deposit for transaction (in NEAR; default '0.1')
     * @param gas : string                                 // OPTIONAL GAS for transaction (in NEAR; default '0.0000000003')
     */
    async simpleMint(simpleMintMetadata, deposit = '0.1', gas = '0.0000000003') {

        let repackRoyalties = {}
        for (var k in simpleMintMetadata.royalties) {
            repackRoyalties[simpleMintMetadata.royalties[k].id] = simpleMintMetadata.royalties[k].value
        }

        const date = new Date()
        const strDate = date.toISOString().slice(0, 10) + ' 00:00:00.000'

        let nftContract, accId
        let txResolve, txReject
        let txPromise = new Promise((resolve, reject) => {
            txResolve = resolve
            txReject = reject
        })

        let tokenMetadata = {
            "title": simpleMintMetadata.title,
            "description": simpleMintMetadata.description,
            "media": simpleMintMetadata.media,
            "media_hash": simpleMintMetadata.mediaHash,
            "copies": simpleMintMetadata.copies,
            "issued_at": strDate,
            "expires_at": strDate,
            "starts_at": strDate,
            "updated_at": strDate,
            "reference": simpleMintMetadata.reference,
            "reference_hash": simpleMintMetadata.referenceHash
        }

        try {
            nftContract = this.loadNftContract()
            accId = nftContract.account.accountId
        } catch (err) {
            txReject(err)
        }
        await nftContract.nft_mint(
            {
                args: {
                    token_id: simpleMintMetadata.tokenId,
                    token_owner_id: accId,
                    token_metadata: tokenMetadata,
                    token_royalties: repackRoyalties,
                },
                gas: utils.format.parseNearAmount(gas),
                amount: utils.format.parseNearAmount(deposit),
                accountId: accId
            }
        )
            .then(resp => { txResolve(resp) })
            .catch(err => { txReject(err) })
        await txPromise
        return txPromise
    }

    /** Getting NFT token directly from contract
     *
     * @deprecated - USE getTokens() instead
     *
     * @param tokenId : string                                              // tokenID - id for search NFT token
     * @returns ContractToken
     * {
     * "token_id": string,                                                 // tokenID
     * "owner_id": string,                                                 // Name of token owner
     * "metadata": {                                                       // Metadata of NFT token
     *     "title": string,                                                // Token title
     *     "description": string,                                          // Description of NFT Token
     *     "media": string,                                                // Link to original media content to IFPS storage
     *     "media_hash": string,                                           // Hash of original media content in IFPS storage
     *     "copies": number,                                               // Copies of minted NFT token
     *     "issued_at": string,                                            // Datetime of issuing NFT token
     *     "expires_at": string,                                           // Datetime of token expires
     *     "starts_at": string,                                            // Datetime of issuing NFT token
     *     "updated_at": string,                                           // Datetime of updating NFT token
     *     "extra": string,                                                // ...
     *     "reference": sting,                                             // Link to token metadata in IPFS storage
     *     "reference_hash": string                                        // Hash for token metadata in IPFS storage
     *  },
     *  "approved_account_ids": {string : number, string : number ...},    // ...
     *  "royalty": {string : number, string : number ...}                  // NFT token first sale profit distribution (total must be equal to 100) ( {'royalty1.near': 10, 'royalty2.near': 90} )
     *  "minter": string                                                   // ID of token minter
     * }
     */
    async getNftTokenByIdFromContract(tokenId) {
        let nftContract
        let txResolve, txReject
        let txPromise = new Promise((resolve, reject) => {
            txResolve = resolve
            txReject = reject
        })
        try {
            nftContract = this.loadNftContract()
        } catch (err) {
            txReject(err)
        }
        await nftContract.get_nft_token({
                "token_id": tokenId
            }
        )
            .then(resp => { txResolve(resp) })
            .catch(err => { txReject(err) })
        await txPromise
        return txPromise
    }

    /** Calculate token royalties
     * @param tokenId : string                                             // tokenID - id for search NFT token
     * @param balance : string                                             // Sale price for calculating royalties
     * @param maxLenPayout : number                                        // Maximum payout length
     * @returns payout:
     * {
     * "string": number,                                                   // Calculated payouts
     *  ...
     * }
     */
    async calculateTokenRoyalties(tokenId, balance, maxLenPayout) {
        let nftContract
        let txResolve, txReject
        let txPromise = new Promise((resolve, reject) => {
            txResolve = resolve
            txReject = reject
        })
        try {
            nftContract = this.loadNftContract()
        } catch (err) {
            txReject(err)
        }
        await nftContract.nft_payout({
                "token_id": tokenId,
                "balance": balance,
                "max_len_payout": maxLenPayout
            }
        )
            .then(resp => { txResolve(resp) })
            .catch(err => { txReject(err) })
        await txPromise
        return txPromise
    }

    /** Getting tokens from cotract by minters
     *
     * @param minterId : string - Minter account ID
     * @returns ContractToken[
     * {
     * "token_id": string,                                                 // tokenID
     * "owner_id": string,                                                 // Name of token owner
     * "metadata": {                                                       // Metadata of NFT token
     *     "title": string,                                                // Token title
     *     "description": string,                                          // Description of NFT Token
     *     "media": string,                                                // Link to original media content to IFPS storage
     *     "media_hash": string,                                           // Hash of original media content in IFPS storage
     *     "copies": number,                                               // Copies of minted NFT token
     *     "issued_at": string,                                            // Datetime of issuing NFT token
     *     "expires_at": string,                                           // Datetime of token expires
     *     "starts_at": string,                                            // Datetime of issuing NFT token
     *     "updated_at": string,                                           // Datetime of updating NFT token
     *     "extra": string,                                                // ...
     *     "reference": sting,                                             // Link to token metadata in IPFS storage
     *     "reference_hash": string                                        // Hash for token metadata in IPFS storage
     *  },
     *  "approved_account_ids": {string : number, string : number ...},    // ...
     *  "royalty": {string : number, string : number ...}                  // NFT token first sale profit distribution (total must be equal to 100) ( {'royalty1.near': 10, 'royalty2.near': 90} )
     *  "minter": string                                                   // ID of token minter
     * }
     *  .....
     * ]
     */
    async getTokensByMinter(minterId) {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const tokens = await this.nftContract.nft_tokens_for_minter({
                account_id: minterId,
            });
            return tokens;
        }
    }

    /** Method for getting number of all nft tokens in NFT contract
     *
     * @returns number
     */
    async getCountAllMintedTokens() {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const count = await this.nftContract.nft_total_supply();
            return Number(count);
        }
    }

    /** Transfering token between accounts (should be init from token owner!)
     *
     * @param tokenId : string - ID of NFT token
     * @param recieverId : string - Account ID of token reciever
     * @param deposit  : string in NEAR OPTIONAL (default = "0.000000000000000000000001")
     * @param gas : string in NEAR OPTIONAL (default = "0.0000000003")
     */
    async transferToken(
        tokenId,
        recieverId,
        deposit = '0.000000000000000000000001',
        gas = '0.0000000003',
    ) {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const token = await this.getNftTokenByIdFromContract(tokenId);
            if (token?.owner_id !== this.getAccount()) {
                throw new Error('You has to be owner of token to transfer it! Current owner: ' + token?.owner_id);
            }
            await this.nftContract.nft_transfer({
                args: {
                    token_id: tokenId,
                    receiver_id: recieverId,
                },
                gas: utils.format.parseNearAmount(gas),
                amount: utils.format.parseNearAmount(deposit),
                ownerId: this.getAccount(),
            });
        }
    }

    /** Getting tokens from cotract by owner
     *
     * @param ownerId : string - Owner account ID
     * @returns ContractToken[
     * {
     * "token_id": string,                                                 // tokenID
     * "owner_id": string,                                                 // Name of token owner
     * "metadata": {                                                       // Metadata of NFT token
     *     "title": string,                                                // Token title
     *     "description": string,                                          // Description of NFT Token
     *     "media": string,                                                // Link to original media content to IFPS storage
     *     "media_hash": string,                                           // Hash of original media content in IFPS storage
     *     "copies": number,                                               // Copies of minted NFT token
     *     "issued_at": string,                                            // Datetime of issuing NFT token
     *     "expires_at": string,                                           // Datetime of token expires
     *     "starts_at": string,                                            // Datetime of issuing NFT token
     *     "updated_at": string,                                           // Datetime of updating NFT token
     *     "extra": string,                                                // ...
     *     "reference": sting,                                             // Link to token metadata in IPFS storage
     *     "reference_hash": string                                        // Hash for token metadata in IPFS storage
     *  },
     *  "approved_account_ids": {string : number, string : number ...},    // ...
     *  "royalty": {string : number, string : number ...}                  // NFT token first sale profit distribution (total must be equal to 100) ( {'royalty1.near': 10, 'royalty2.near': 90} )
     *  "minter": string                                                   // ID of token minter
     * }
     *  .....
     * ]
     */
    async getNftTokensForOwner(ownerId) {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const tokens = await this.nftContract.nft_tokens_for_owner({
                account_id: ownerId,
            });
            return tokens;
        }
    }

    /** Burning token from NEAR contract
     *
     * @param tokenId: string  - token ID
     * @param deposit: string in NEAR OPTIONAL (default = '0.000000000000000000000001')
     */
    async burnToken(tokenId, deposit = '0.000000000000000000000001') {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            await this.nftContract.nft_burn({
                args: {
                    token_id: tokenId,
                },
                amount: utils.format.parseNearAmount(deposit),
                accountId: this.getAccount(),
            });
        }
    }

    /** Get approved minters for contract
     * @returns ['string', 'string', ...]
     */
    async getMinters() {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const minters = await this.nftContract.get_minters();
            return minters
        }
    }

    /** Method for updating minters list in contract
     *
     * @param  minters : [string]                                      // Array with new minters list
     * @param  deposit: string                                         // OPTIONAL Deposit for transaction (in NEAR; default '0.000000000000000000000001')
     */
    async updateMinters(minters, deposit = '0.000000000000000000000001') {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            await this.nftContract.update_minters({
                args: {
                    minters,
                },
                amount: utils.format.parseNearAmount(deposit),
                accountId: this.getAccount(),
            });
        }
    }

    /** Method for adding minter to contract
     *
     * @param  minterId : string                                      // Minter ID to add
     * @param  deposit: string                                         // OPTIONAL Deposit for transaction (in NEAR; default '0.000000000000000000000001')
     */
    async addMinter(minterID, deposit = '0.000000000000000000000001') {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {

            const minters = await this.getMinters()
            if (!minters.includes(minterID)) {
                minters.push(minterID)
            }
            await this.nftContract.update_minters({
                args: {
                    minters,
                },
                amount: utils.format.parseNearAmount(deposit),
                accountId: this.getAccount(),
            });
        }
    }

    /** Method for updating minters list in contract
     *
     * @param  minterId : string                                       // MinterId for removing from contract
     * @param  deposit: string                                         // OPTIONAL Deposit for transaction (in NEAR; default '0.000000000000000000000001')
     */
    async removeMinter(minterID, deposit = '0.000000000000000000000001') {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const minters = await this.getMinters()
            let index = minters.indexOf(minterID)
            if (index !== -1) {
                minters.splice(index, 1)
            }
            await this.nftContract.update_minters({
                args: {
                    minters,
                },
                amount: utils.format.parseNearAmount(deposit),
                accountId: this.getAccount(),
            });
        }
    }

    /** MARKET CONTRACT */

    /** Method for getting offers from contract
     *
     * @param  from : number                                      // Start token index
     * @param  limit: number                                      // Page length
     * @returns {
     * has_next_batch : boolean,
     * tokens : [
     *   {
     *        approval_id : number,
     *        auction : object,
     *        initial_payout : {string : number, string : number ...},
     *        nft_contract_id : string,
     *        owner_id : string,
     *        price : number (In yoktoNEAR),
     *        token_id : string1
     *  },
     * ...
     * ],
     * total_count : number
     * }
     */
    async getOffersFromContract(from, limit) {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const offers = await this.marketContract.get_nfts({
                "from": from,
                "limit": limit
            });
            return offers
        }
    }

    /** Method for getting price on nft token sale from contract
     *
     * @param  tokenId : string   // Token ID
     * @returns number            //  In yoktoNEAR
     */
    async getPriceForTokenFromContract(tokenId) {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const price = await this.marketContract.get_nft_price({
                "token_uid": this.nftContractId + ':' + tokenId
            });
            // return utils.format.formatNearAmount(price.toLocaleString('fullwide', { useGrouping: false })); // uncomment fot NEAR returning
            return price
        }
    }

    /** Create FIRST NFT token sale on market contract
     *
     * @param {
     * tokenId : string                             // NFT token ID
     * price : string                               // sale price in NEAR
     * payout : array                               // payouts for sale
     * additionalMetadata: object                   // additional optional object
     * }
     * @param deposit : string                      // in NEAR - OPTIONAL default "0.0005"
     * @param gas : string                          // in NEAR - OPTIONAL default "0.0000000003"
     */
    async createInitialTokenSale(
        initialTokenSaleMetadata,
        deposit = '0.0005',
        gas = '0.0000000003',
    ) {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const msg = {
                additionalMetadata: initialTokenSaleMetadata.additionalMetadata,
                sale_conditions: {
                    price: utils.format.parseNearAmount(initialTokenSaleMetadata.price),
                },
            };
            await this.nftContract.nft_approve_initial({
                args: {
                    token_id: initialTokenSaleMetadata.tokenId,
                    account_id: this.marketContractId,
                    msg: JSON.stringify(msg),
                    payout: initialTokenSaleMetadata.payout,
                },
                amount: utils.format.parseNearAmount(deposit),
                gas: utils.format.parseNearAmount(gas),
                accountId: this.getAccount(),
            });
        }
    }

    /** Create NFT token sale on market contract
     *
     * @param tokenSaleMetadata
     * object like => {
     *  tokenId : string                     // NFT token ID
     * price : string                        // sale price in NEAR
     * additionalMetadata: object            // additional optional object
     * }
     * @param deposit : string               // in NEAR  OPTIONAL default "0.0005"
     * @param gas : string                   // in NEAR - OPTIONAL default "0.0000000003"
     */
    async createTokenSale(
        tokenSaleMetadata, deposit = '0.0005', gas = '0.0000000003') {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const msg = {
                sale_conditions: {
                    additionalMetadata: tokenSaleMetadata.additionalMetadata,
                    price: utils.format.parseNearAmount(tokenSaleMetadata.price),
                },
            };
            await this.nftContract.nft_approve({
                args: {
                    token_id: tokenSaleMetadata.tokenId,
                    account_id: this.marketContractId,
                    msg: JSON.stringify(msg),
                },
                amount: utils.format.parseNearAmount(deposit),
                gas: utils.format.parseNearAmount(gas),
                accountId: this.getAccount(),
            });
        }
    }

    /** Buy NFT token
     *
     * @param tokenId  : string                 // NFT token ID
     * @param deposit  : string                 // in NEAR - price of token + 15% fees
     * @param gas  : string                     // in NEAR - OPTIONAL default "0.0000000003"
     */
    async buyToken(tokenId, deposit, gas = '0.0000000003') {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.marketContract) {
            throw new Error('Market Contract is not initialized!');
        } else {
            await this.marketContract.buy({
                args: {
                    nft_contract_id: this.nftContractId,
                    token_id: tokenId,
                },
                amount: utils.format.parseNearAmount(deposit),
                gas: utils.format.parseNearAmount(gas),
                accountId: this.getAccount(),
            });
        }
    }

    /** Removing token sale from contract
     * @param tokenId: string                   // NFT token ID
     * @param gas : string                      // in NEAR - OPTIONAL default "0.0000000003"
     */
    async removeOffer(tokenId, gas = '0.0000000003') {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.marketContract) {
            throw new Error('Market Contract is not initialized!');
        } else {
            await this.marketContract.remove_from_market({
                args: {
                    nft_contract_id: this.nftContractId,
                    token_id: tokenId,
                },
                gas: parseNearAmount(gas),
                accountId: this.getAccount(),
            });
        }
    }

    /** Method for adding benificiary for market contract
     *
     * @param beneficiaryId : string                    // Beneficiary ID
     * @param fee : number                              // Commission
     */
    async addBeneficiary(beneficiaryId, fee) {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.marketContract) {
            throw new Error('Market Contract is not initialized!');
        } else {
            await this.marketContract.add_beneficiary({
                args: {
                    beneficiary: beneficiaryId,
                    fee: fee,
                },
                accountId: this.getAccount(),
            });
        }
    }

    /** Method for removing benificiary from market contract
     *
     * @param beneficiaryId : string                    // Beneficiary ID
     */
    async removeBeneficiary(beneficiaryId) {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.marketContract) {
            throw new Error('Market Contract is not initialized!');
        } else {
            await this.marketContract.remove_beneficiary({
                args: {
                    beneficiary: beneficiaryId,
                },
                accountId: this.getAccount(),
            });
        }
    }

    /** Method for withdraw funds from contract
     *
     * @param amount : string                   // In NEAR - amount of withdraw funds
     * @param address : string                  // Funds reciever
     */
    async withdrawFunds(amount, address) {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.marketContract) {
            throw new Error('Market Contract is not initialized!');
        } else {
            await this.marketContract.withdraw_funds({
                args: {
                    amount: utils.format.parseNearAmount(amount),
                    address: address
                },
                accountId: this.getAccount(),
            });
        }
    }


    /** Method for getting actual Market contract settings
     * @returns {
     * "marketplace_fee": string,
     * "english_auction_bet_step": string,
     * "min_auction_duration": string,
     * "max_auction_duration": string,
     * "allowed_nft": [string]
     * }
     */
    async getMarketContractSettings() {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.marketContract) {
            throw new Error('Market Contract is not initialized!');
        } else {
            const settings = await this.marketContract.get_market_settings();
            return settings
        }
    }

    /** Method for updating market contract settings
     * @param marketContractSettings {
     * english_auction_bet_step: string,
     * min_auction_duration: string,
     * max_auction_duration: string,
     * allowed_nft: [string],
     * marketplace_fee: string
     * }
     * @param deposit : string                      // OPTIONAL In NEAR  (default = '0.000000000000000000000001')
     * @returns
     */
    async updateMarketContractSettings(marketContractSettings, deposit = '0.000000000000000000000001') {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.marketContract) {
            throw new Error('Market Contract is not initialized!');
        } else {
            const settings = await this.marketContract.update_market_settings(
                {
                    args: {
                        'market_settings': marketContractSettings,
                    },
                    amount: utils.format.parseNearAmount(deposit)
                }
            );
            return settings
        }
    }


    /** Calculating royalties for NFT token
     *
     * @param tokenId : string - NFT token ID
     * @param balance : string in NEAR) Potential sale price for NFT token
     * @param maxLenPayout : string -  Count of royalty
     * @returns payout: {
     *  "accountId-1": "10",
     *  "accountId-2": "20",
     *  "accountId-3": "70",
     * }
     */
    async calcTokenRoyalties(tokenId, balance, maxLenPayout) {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const token = await this.nftContract.nft_payout({
                token_id: tokenId,
                balance: balance.toString(),
                max_len_payout: maxLenPayout,
            });
            return token;
        }
    }

    /** @deprecated - should use getTokens() - Getting tokens from cotract by minters
     *
     * @param minterId : string - Minter account ID
     * @returns ContractToken[
     * {
     * "token_id": string,                                  // tokenID
     * "owner_id": string,                                  // Name of token owner
     * "metadata": {                                        // Metadata of NFT token
     *     "title": string,                                 // Token title
     *     "description": string,                           // Description of NFT Token
     *     "media": string,                                 // Link to original media content to IFPS storage
     *     "media_hash": string,                            // Hash of original media content in IFPS storage
     *     "copies": number,                                // Copies of minted NFT token
     *     "issued_at": string,                             // Datetime of issuing NFT token
     *     "expires_at": string,                            // Datetime of token expires
     *     "starts_at": string,                             // Datetime of issuing NFT token
     *     "updated_at": string,                            // Datetime of updating NFT token
     *     "extra": string,                                 // ...
     *     "reference": sting,                              // Link to token metadata in IPFS storage
     *     "reference_hash": string                         // Hash for token metadata in IPFS storage
     *  },
     *  "approved_account_ids": object,                     // ...
     *  "royalty": Royalties                                // NFT token first sale profit distribution (total must be equal to 100) ( {'royalty1.near': 10, 'royalty2.near': 90} )
     *  "minter": string                                    // ID of token minter
     * }
     * ]
     */
    async getTokensByMinter(minterId) {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const tokens = await this.nftContract.nft_tokens_for_minter({
                account_id: minterId,
            });
            return tokens;
        }
    }


    /** Getting NFT tokens from indexer with filtering and soring
     *
     * @param {
     *   orderBy: string                    - (optional : default = "id") specifying ordering field (example: "title")
     *   orderDirection: string             - (optional : default = "asc") specifying ordering direction (acceptable values: ["asc", "desc"])
     *   filterBy: string                   - (optional) specifying field for filter applying (example: "description")
     *   filterType : string                - (optional) specifying filter type (
     *                                         acceptable values: [
     *                                          "equals"
     *                                          "not"
     *                                          "contains"
     *                                          "contains_nocase"
     *                                          "not_contains"
     *                                          "not_contains_nocase"
     *                                          "starts_with"
     *                                          "starts_with_nocase"
     *                                          "ends_with"
     *                                          "ends_with_nocase"
     *                                          "not_starts_with"
     *                                          "not_starts_with_nocase"
     *                                          "not_ends_with"
     *                                          "not_ends_with_nocase"
     *                                         ])
     *   filterCriteria
     *   isMyOwned
     * }
     * @returns : Tokens[
     * id: string;
     * ownerId: string;
     * title: string;
     * description: string;
     * media: string;
     * tokenId: string;
     * mintTimestamp: string;
     * sales: [
     *   id: string;
     *   tokenId: string;
     *   ownerId: string;
     *   price: string;
     *   auctionData: string;
     * ];
     * purchases: [
     *   id: string;
     *   tokenId: string;
     *   price: string;
     *   buyerId: string;
     *   timestamp: string;
     * ];
     * licenseSales: [
     *   id: string;
     *   sellerId: string;
     *   tokenId: string;
     *   goal: string;
     *   type: string;
     *   allowedRegions: string;
     *   duration: string;
     *   price: string;
     *   maxSales: string;
     *   totalSales: string;
     *   isActive: string;
     * ];
     * licensePurchases: [
     *   id: string;
     *   saleId: string;
     *   price: string;
     *   licenseId: string;
     *   buyerId: string;
     *   timestamp: string;
     *   tokenId: string;
     * ]
     * };
     * ]
     */
    async getTokens({
                        orderBy = 'id',
                        orderDirection = 'asc',
                        filterBy,
                        filterType,
                        filterCriteria,
                        isMyOwned = false,
                    }) {
        if (filterBy === 'ownerId' && filterType === '_' && filterCriteria !== this.getAccount() && isMyOwned) {
            throw new Error("You can't make filter by ownerId except your ID when isMyOwner parameter is true!");
        }

        let q = '{ tokens(';

        if (filterBy || isMyOwned) {
            q = q + 'where:{';
        }

        if (isMyOwned) {
            q = q + 'ownerId: "' + this.getAccount() + '" ';
        }

        if (filterBy) {
            q = q + filterBy;
        }

        if (filterType) {
            if (filterType !== 'equals') {
                q = q + '_' + filterType;
            }
        }

        if (filterBy) {
            q = q + ':"' + filterCriteria + '"';
        }

        if (filterBy || isMyOwned) {
            q = q + '}';
        }



        q = q + ' orderBy: ' + orderBy + ', orderDirection:' + orderDirection;

        // q = q + "){ id ownerId title description media contractId tokenId mintTimestamp}}"
        q =
            q +
            ') { id ownerId title description media tokenId mintTimestamp sales  { id tokenId  price auctionData } purchases { id tokenId price buyerId timestamp } licenseSales { id sellerId tokenId goal type allowedRegions duration duration price maxSales totalSales isActive } licensePurchases { id saleId price licenseId buyerId timestamp tokenId } } }';

        const data = JSON.stringify({
            query: q,
        });

        const config = {
            method: 'post',
            url: this.graphUrl,
            headers: {
                'Content-Type': 'application/json',
            },
            data,
        };

        const resp = await axios(config);
        if (resp.data.errors) {
            throw new Error('Error while executing GRAPH query! : ' + JSON.stringify(resp.data.errors));
        } else {
            return resp.data.data.tokens;
        }
    }


    /** Buy NFT token
     *
     * @param tokenId  : string - NFT token ID
     * @param deposit  : string in NEAR - price of token + 15% fees
     * @param gas  : string in NEAR - default "0.0000000003"
     */
    async buyToken(tokenId, deposit, gas = '0.0000000003') {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.marketContract) {
            throw new Error('Market Contract is not initialized!');
        } else {
            await this.marketContract.buy({
                args: {
                    nft_contract_id: this.nftContractId,
                    token_id: tokenId,
                },
                amount: utils.format.parseNearAmount(deposit),
                gas: utils.format.parseNearAmount(gas),
                accountId: this.getAccount(),
            });
        }
    }


    /** Getting sales of NFT tokens from indexer with filtering and soring
     *
     * @param {
     *   orderBy: string                    - (optional : default = "id") specifying ordering field (example: "title")
     *   orderDirection: string             - (optional : default = "asc") specifying ordering direction (acceptable values: ["asc", "desc"])
     *   filterBy: string                   - (optional) specifying field for filter applying (example: "description")
     *   filterType : string                - (optional) specifying filter type (
     *                                         acceptable values: [
     *                                          "equals"
     *                                          "not"
     *                                          "contains"
     *                                          "contains_nocase"
     *                                          "not_contains"
     *                                          "not_contains_nocase"
     *                                          "starts_with"
     *                                          "starts_with_nocase"
     *                                          "ends_with"
     *                                          "ends_with_nocase"
     *                                          "not_starts_with"
     *                                          "not_starts_with_nocase"
     *                                          "not_ends_with"
     *                                          "not_ends_with_nocase"
     *                                         ])
     *   filterCriteria
     *   isMyOwned
     * }
     * @returns : Offers[
     * {
     *   tokenId: string
     *   auctionData: object,
     *   id: string,
     *   price : string (in yoktoNEAR)
     * }
     * ]
     */
    async getOffers({
                        orderBy = 'id',
                        orderDirection = 'asc',
                        filterBy,
                        filterType,
                        filterCriteria,
                        isMyOwned = false,
                    }) {
        if (filterBy === 'ownerId' && filterType === '_' && filterCriteria !== this.getAccount() && isMyOwned) {
            throw new Error("You can't make filter by ownerId except your ID when isMyOwner parameter is true!");
        }

        let q = '{ tokenSales(';

        if (filterBy || isMyOwned) {
            q = q + 'where:{';
        }

        if (isMyOwned) {
            q = q + 'ownerId: "' + this.getAccount() + '" ';
        }

        if (filterBy) {
            q = q + filterBy;
        }

        if (filterType) {
            if (filterType !== 'equals') {
                q = q + '_' + filterType;
            }
        }

        if (filterBy) {
            q = q + ':"' + filterCriteria + '"';
        }

        if (filterBy || isMyOwned) {
            q = q + '}';
        }

        q = q + ' orderBy: ' + orderBy + ', orderDirection:' + orderDirection;

        // q = q + "){ id ownerId title description media contractId tokenId mintTimestamp}}"
        q = q + ') { id tokenId price auctionData } } ';

        const data = JSON.stringify({
            query: q,
        });

        const config = {
            method: 'post',
            url: this.graphUrl,
            headers: {
                'Content-Type': 'application/json',
            },
            data,
        };

        const resp = await axios(config);
        if (resp.data.errors) {
            throw new Error('Error while executing GRAPH query! : ' + JSON.stringify(resp.data.errors));
        } else {
            return resp.data.data.tokenSales;
        }
    }

    /** Removing token sale from contract
     * @param tokenId: string - NFT token ID
     * @param gas : string in NEAR - default "0.0000000003"
     */
    async removeOffer(tokenId, gas = '0.0000000003') {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.marketContract) {
            throw new Error('Market Contract is not initialized!');
        } else {
            await this.marketContract.remove_from_market({
                args: {
                    nft_contract_id: this.nftContractId,
                    token_id: tokenId,
                },
                gas: parseNearAmount(gas),
                accountId: this.getAccount(),
            });
        }
    }


    /** METHODS FOR LICENSING */

    /** Creating license sale for NFT token
     *
     * @param licenseSaleMetadata {
     *   tokenId: string;                       // Token id for creating license
     *   goal: number;                          // Creative = 1, Commercial = 2, Demonstrative = 3
     *   licenseType: number;                   // Exclusive = 1, NonExclusive = 2, Sole = 3
     *   duration: number;                      // License sale duration
     *   allowedRegions: string[];              // Array of ISO codes like 'US', 'GB' etc
     *   price: number;                         // in NEAR
     *   max_sales: number                      // Onl in non-exclusive licenses
     * } : LicenseSaleMetadta metadata for license sale
     * @param gas : string in NEAR - default = "0.000000000055"
     */
    async createLicenseSale(licenseSaleMetadata, gas = '0.000000000055') {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.marketContract) {
            throw new Error('Market Contract is not initialized!');
        } else {
            await this.marketContract.create_license_sale({
                args: {
                    contract_id: this.nftContractId,
                    token_id: licenseSaleMetadata.tokenId,
                    sale: {
                        goal: licenseSaleMetadata.goal,
                        license_type: licenseSaleMetadata.licenseType,
                        duration: licenseSaleMetadata.duration,
                        allowed_regions: licenseSaleMetadata.allowedRegions,
                        price: parseNearAmount(licenseSaleMetadata.price.toString()),
                        max_sales: licenseSaleMetadata.max_sales
                    },
                },
                accountId: this.getAccount(),
                amount: parseNearAmount(licenseSaleMetadata.price.toString()),
                gas: parseNearAmount(gas),
            });
        }
    }


    /** Method for buing NFT License sale
     *
     * @param  licenseId : string            // ID of license sale for buing
     * @param  price : number                // in NEAR Price for buying (must count contract fees)
     * @param  gas  : string                 //in NEAR - default "0.0000000003"
     */
    async buyLicenseSale(licenseId, price, gas = "0.0000000003") {
        const buyerId = this.getAccount();

        const config = {
            filterBy: "id",
            fileterType: "equals",
            filterCriteria: licenseId
        }

        const licenses = await this.getLicenseSales(config)
        const license = licenses[0]
        const validation = await this.validateLicenseSale(license, buyerId, price)
        const data = {
            args: {
                sale_id: Number(license.id),
                region: license.allowedRegions,
                license_token: {
                    payload: validation.tokens.payload,
                    signature: validation.tokens.signature
                }
            },
            accountId: this.getAccount(),
            gas: utils.format.parseNearAmount(gas),
            amount: utils.format.parseNearAmount(price.toString()),
        }
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.marketContract) {
            throw new Error('Market Contract is not initialized!');
        } else {
            console.log(data)
            await this.marketContract.license_buy(data);
        }
    }


    /** Getting sales of NFT tokens from indexer with filtering and soring
     *
     * @param {
     *   orderBy: string                    - (optional : default = "id") specifying ordering field (example: "title")
     *   orderDirection: string             - (optional : default = "asc") specifying ordering direction (acceptable values: ["asc", "desc"])
     *   filterBy: string                   - (optional) specifying field for filter applying (example: "description")
     *   filterType : string                - (optional) specifying filter type (
     *                                         acceptable values: [
     *                                          "equals"
     *                                          "not"
     *                                          "contains"
     *                                          "contains_nocase"
     *                                          "not_contains"
     *                                          "not_contains_nocase"
     *                                          "starts_with"
     *                                          "starts_with_nocase"
     *                                          "ends_with"
     *                                          "ends_with_nocase"
     *                                          "not_starts_with"
     *                                          "not_starts_with_nocase"
     *                                          "not_ends_with"
     *                                          "not_ends_with_nocase"
     *                                         ])
     *   filterCriteria
     *   isMyOwned
     * }
     * @returns : LicenseSales[
     * {
     *   id: string
     *   goal : number
     *   type: number
     *   duration : number
     *   allowedRegions : string[]
     *   isActive : boolean
     *   maxSales : number
     *   price : string
     *   tokenId : string
     *   totalSales : number
     *   purchases : array[]
     * }
     * ]
     */
    async getLicenseSales({
                              orderBy = 'id',
                              orderDirection = 'asc',
                              filterBy,
                              filterType,
                              filterCriteria,
                              isMyOwned = false,
                          }) {
        if (filterBy === 'ownerId' && filterType === '_' && filterCriteria !== this.getAccount() && isMyOwned) {
            throw new Error("You can't make filter by ownerId except your ID when isMyOwner parameter is true!");
        }

        let q = '{ licenseSales(';

        if (filterBy || isMyOwned) {
            q = q + 'where:{';
        }

        if (isMyOwned) {
            q = q + 'ownerId: "' + this.getAccount() + '" ';
        }

        if (filterBy) {
            q = q + filterBy;
        }

        if (filterType) {
            if (filterType !== 'equals') {
                q = q + '_' + filterType;
            }
        }

        if (filterBy) {
            q = q + ':"' + filterCriteria + '"';
        }

        if (filterBy || isMyOwned) {
            q = q + '}';
        }

        q = q + ' orderBy: ' + orderBy + ', orderDirection:' + orderDirection;

        // q = q + "){ id ownerId title description media contractId tokenId mintTimestamp}}"
        q = q + ') { id sellerId tokenId goal type allowedRegions duration price maxSales totalSales isActive purchases { id saleId price buyerId timestamp } } } ';

        const data = JSON.stringify({
            query: q,
        });

        const config = {
            method: 'post',
            url: this.graphUrl,
            headers: {
                'Content-Type': 'application/json',
            },
            data,
        };

        const resp = await axios(config);
        if (resp.data.errors) {
            throw new Error('Error while executing GRAPH query! : ' + JSON.stringify(resp.data.errors));
        } else {
            return resp.data.data.licenseSales;
        }
    }


    /** Getting Licenses from indexer with filtering and sorting
     *
     * @param {
     *   orderBy: string                    - (optional : default = "id") specifying ordering field (example: "title")
     *   orderDirection: string             - (optional : default = "asc") specifying ordering direction (acceptable values: ["asc", "desc"])
     *   filterBy: string                   - (optional) specifying field for filter applying (example: "id")
     *   filterType : string                - (optional) specifying filter type (
     *                                         acceptable values: [
     *                                          "equals"
     *                                          "not"
     *                                          "contains"
     *                                          "contains_nocase"
     *                                          "not_contains"
     *                                          "not_contains_nocase"
     *                                          "starts_with"
     *                                          "starts_with_nocase"
     *                                          "ends_with"
     *                                          "ends_with_nocase"
     *                                          "not_starts_with"
     *                                          "not_starts_with_nocase"
     *                                          "not_ends_with"
     *                                          "not_ends_with_nocase"
     *                                         ])
     *   filterCriteria
     *   isMyOwned
     * }
     * @returns : LicenseSales[
     * {
     *   id: string
     *   goal : number
     *   type: number
     *   duration : number
     *   assetTokenId : string
     *   ownerId : string
     *   issuedAt : string
     *   startsAt : string
     *   expiresAt : string
     * }
     * ]
     */
    async getLicenses({
                          orderBy = 'id',
                          orderDirection = 'asc',
                          filterBy,
                          filterType,
                          filterCriteria,
                          isMyOwned = false,
                      }) {
        if (filterBy === 'ownerId' && filterType === '_' && filterCriteria !== this.getAccount() && isMyOwned) {
            throw new Error("You can't make filter by ownerId except your ID when isMyOwner parameter is true!");
        }

        let q = '{ licenseTokens(';

        if (filterBy || isMyOwned) {
            q = q + 'where:{';
        }

        if (isMyOwned) {
            q = q + 'ownerId: "' + this.getAccount() + '" ';
        }

        if (filterBy) {
            q = q + filterBy;
        }

        if (filterType) {
            if (filterType !== 'equals') {
                q = q + '_' + filterType;
            }
        }

        if (filterBy) {
            q = q + ':"' + filterCriteria + '"';
        }

        if (filterBy || isMyOwned) {
            q = q + '}';
        }

        q = q + ' orderBy: ' + orderBy + ', orderDirection:' + orderDirection;

        // q = q + "){ id ownerId title description media contractId tokenId mintTimestamp}}"
        q = q + ') { id ownerId assetTokenId goal type region duration issuedAt startsAt expiresAt}} ';

        const data = JSON.stringify({
            query: q,
        });

        const config = {
            method: 'post',
            url: this.graphUrl,
            headers: {
                'Content-Type': 'application/json',
            },
            data,
        };

        const resp = await axios(config);
        if (resp.data.errors) {
            throw new Error('Error while executing GRAPH query! : ' + JSON.stringify(resp.data.errors));
        } else {
            return resp.data.data.licenseTokens;
        }
    }


    /** System method for validation licencing  on backend */
    async validateLicenseSale(licenseSale, buyerId, price) {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.nftContract) {
            throw new Error('NFT Contract is not initialized!');
        } else {
            const ar = licenseSale.allowedRegions.split(',')
            let firstRegion
            if (Array.isArray(ar)) {
                firstRegion = ar[0]
            } else {
                firstRegion = ar
            }
            const data = {
                "token_id": licenseSale.tokenId,
                "contract_id": this.nftContractId,
                "receiver_id": buyerId,
                "license": {
                    "goal": Number(licenseSale.goal),
                    "license_type": Number(licenseSale.type),
                    "region": firstRegion,
                    "duration": licenseSale.duration
                }
            }


            console.log(data)

            // var axios = require('axios');

            var config = {
                method: 'post',
                url: this.backendUrl + '/testing/api/v2/validation/license',
                headers: {
                    'Content-Type': 'application/json'
                },
                data
            };
            const resp = await axios(config);
            return resp.data;
        }
    }

    /** Method for updating licenseSale
     *
     * @param {
     * licenseSaleMetadata {
     *            saleId : number,                // Sale id
     *            price : string,                 // New price
     *            allowedRegions : string[],      // Allowed regions to sale license
     *            max_sales : number,             // Maximum sales count
     * },
     * gas : string                              // In NEAR (default = '0.000000000055')
     * }
     *
     */
    async updateLicenseSale(licenseSaleMetadata, gas = '0.000000000055') {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.marketContract) {
            throw new Error('Market Contract is not initialized!');
        } else {
            await this.marketContract.update_license_sale({
                    args: {
                        "sale_id": licenseSaleMetadata.sale_id,
                        "price": parseNearAmount(licenseSaleMetadata.price.toString()),
                        "allowed_regions": licenseSaleMetadata.allowed_regions,
                        "max_sales": licenseSaleMetadata.max_sales

                    },
                    account_id: this.getAccount(),
                    amount: utils.format.parseNearAmount(licenseSaleMetadata.price.toString()),
                    gas: parseNearAmount(gas)
                }
            )
        }
    }

    /** Method for removing license sale
     *
     * @param licenseSaleId : number            // id of license sale
     * @param deposit : string                  // in NEAR (optional - default = '0.000000000000000000000001')
     */
    async removeLicenseSale(licenseSaleId, deposit = "0.000000000000000000000001") {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.marketContract) {
            throw new Error('Market Contract is not initialized!');
        } else {
            await this.marketContract.remove_license_sale({
                    args: {
                        sale_id: licenseSaleId
                    },
                    account_id: this.getAccount(),
                    amount: utils.format.parseNearAmount(deposit)
                }
            );
        }
    }


    /** Method for getting license by full ID directly from contract
     *
     * @param {*} licenseId : string                 // Full license ID (like nft.contract-name:tokenAssetId:licenseId)
     * @returns -> {
     * "token_id": string,
     * "owner_id": string,
     * "metadata": {
     *     "title": string,
     *     "description": string,
     *     "media": string,
     *     "media_hash": string,
     *     "copies": string,
     *     "issued_at": string,
     *     "expires_at": string,
     *    "starts_at": string,
     *     "updated_at": string,
     *     "extra": string,
     *     "reference": string,
     *     "reference_hash": string
     * },
     * "licensing_metadata": {
     *     "goal": number,
     *     "license_type": number,
     *     "duration": number,
     *     "region": string,
     *     "prolongation_id": string,
     *    "asset_token_id": string,
     *     "asset_contract_id": string
     * }
     * }
     */
    async getLicenseByIdFromContract(licenseId) {
        if (!this.wallet.isSignedIn()) {
            throw new Error('You is not signed in wallet!');
        }
        if (!this.licenseContarct) {
            throw new Error('License Contract is not initialized!');
        } else {
            const tokenId = licenseId.replace(this.nftContractId, '').split(':')[1]
            console.log()


            let licenses = await this.licenseContarct.nft_licenses_for_token({
                contract_id: this.nftContractId,
                token_id: tokenId,
            });
            return licenses.filter(l => l.token_id == licenseId)
        }
    }

}

export default vArtNearApi