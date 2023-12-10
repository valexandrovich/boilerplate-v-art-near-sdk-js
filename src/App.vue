<script setup>

import {onMounted, reactive, ref} from "vue";
import {keyStores} from "near-api-js";
import vArtNearApi from "@/sdk";
import {v4 as uuidv4} from 'uuid';


const sdk = ref(null)

const mintForm = reactive({
  tokenId: '',
  media: null,
  preview: null,
  title: 'Token title',
  medium: 'medium',
  genre: 'Some genre',
  bio: 'Biography',
  format: 'fbx',
  type: '3D model',
  description: 'Description',
  artist: 'v-art-manual.testnet',
  createdBy: 'v-art-manual.testnet',
  year: '2023',
  price: '1',
  artists: {
    'v-art-manual.testnet' : 90,
    'v-art-manual.testnet2' : 10,
  },
  royalties: {
    'v-art-manual.testnet' : 90
  },
  quantity: 1,
  edition: 1,
  copies: 1
})

onMounted(async () => {
  await initSdk();
  mintForm.tokenId = uuidv4();


})


const getMinters = async () => {
  const minters = await sdk.value.getMinters();
  console.log(minters)
}

const tst = async () => {
  await sdk.value.testPinPdf()
}

const initSdk = async () => {

  const configuration = {

    contract: {
      adminId: 'v-art-manual.testnet',                   // Admin ID like 'contract.near'
      // adminId: 'v-art-demo-2.testnet',                   // Admin ID like 'contract.near'
      nftContractId: 'nft.v-art-manual.testnet',             // NFT Contract ID like 'nft.contract.near'
      // nftContractId: 'nft.v-art-demo-2.testnet',             // NFT Contract ID like 'nft.contract.near'
      marketContractId: 'market.v-art-manual.testnet',          // Market Contract ID like 'market.contract.near'
      // marketContractId: 'market.v-art-demo-2.testnet',          // Market Contract ID like 'market.contract.near'
      licenseContractId: 'license.v-art-manual.testnet',         // License Contract ID like 'license.contract.near'
      // licenseContractId: 'license.v-art-demo-2.testnet',         // License Contract ID like 'license.contract.near'
      net: 'testnet',                       // NEAR net like 'mainnet'
      keyStore: keyStores.BrowserLocalStorageKeyStore,                  // KeyStore object like keyStores.BrowserLocalStorageKeyStore
      nodeUrl: 'https://rpc.testnet.near.org',                    // Near Node URL. See https://docs.near.org/tools/near-api-js/quick-reference
      walletUrl: 'https://wallet.testnet.near.org',                 // Near Wallet URL. See https://docs.near.org/tools/near-api-js/quick-reference
      helperUrl: 'https://helper.testnet.near.org',                 // Near Helper URL. See https://docs.near.org/tools/near-api-js/quick-reference
      explorerUrl: 'https://explorer.testnet.near.org',               // Near Helper URL. See https://docs.near.org/tools/near-api-js/quick-reference
    },

    backendUrl: 'https://licensing-testnet.v-art.digital:3100',                  // Backend URL for license validations etc.

    graphUrl: 'https://api.thegraph.com/subgraphs/name/valexandrovich/valexa-license',                    // URL for Graph hosted service. Find on https://thegraph.com/hosted-service

    ipfs: {
      apiKey: 'b77cb937f643a0f34be6',                    // Pinata API KEY
      apiKeySecret: 'a923a0dfe3acd142ca978a2a3436ecb7a6fe9a41ead143e495d1525cb9eb2eab',              // Pinata API KEY SECRET
      // gateway: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkYmRkZmVhNy0zZDc2LTQ0ZTgtOTE4NC0wNmQ1NTM1ZjZlNjMiLCJlbWFpbCI6ImJlbG9lbmtvMjNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siaWQiOiJGUkExIiwiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjF9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImI3N2NiOTM3ZjY0M2EwZjM0YmU2Iiwic2NvcGVkS2V5U2VjcmV0IjoiYTkyM2EwZGZlM2FjZDE0MmNhOTc4YTJhMzQzNmVjYjdhNmZlOWE0MWVhZDE0M2U0OTVkMTUyNWNiOWViMmVhYiIsImlhdCI6MTcwMTY4NzAwOH0.3CbDdeerwCWrPWP8H7mF5t8vbQRKfpn0bmV1BEyX6gY',                   // Pinata Gateway URL,,
      gateway: 'https://gateway.pinata.cloud/ipfs/'
    },

    certificate: {
      // host: '/cert',                      // Certificates server host
      host: 'https://certificate.v-art.digital',                      // Certificates server host
      // host: 'http://localhost',                      // Certificates server host
      tokenPrefix: '/api/certificates/v2/token',
      licensePrefix: '/api/certificates/v2/license',
      downloadPrefix: '/download'
      // apiUrl: 'api/certificates',                    // Certificates server postfix for interact
      // downloadUrl: 'storage/certificates',               // Certificates server postfix for downloading
    },
  }


  sdk.value = new vArtNearApi(configuration);

  await sdk.value.init()
}

const signIn = async () => {
  sdk.value.signIn()
}

const signOut = async () => {
  sdk.value.signOut()
}

const onChangeMediaFile = (e) => {
  mintForm.media = e.target.files[0];
}

const onChangePreviewFile = (e) => {
  mintForm.preview = e.target.files[0];
}

const whoami = () => {
  console.log(sdk.value.getAccount())
}

const fullMint = () => {
  sdk.value.fullMint(mintForm)
}

</script>

<template>
  <h1>
    Boilerplate
  </h1>


  <button @click="initSdk">Init</button>
  <button @click="signOut">Sign out</button>
  <button @click="signIn">Sign in</button>
  <button @click="whoami">Who am I</button>
  <button @click="fullMint">Full mint</button>
  <button @click="tst">TST</button>
  <button @click="getMinters">Get minters</button>


  <div>

    <table class="table_form">
      <tr>
        <th>Parameter</th>
        <th>Value</th>
      </tr>
      <tr>
        <td> Token ID</td>
        <td><input type="text" style="width: 100%" v-model="mintForm.tokenId"></td>
      </tr>
      <tr>
        <td> Media file</td>
        <td><input type="file"  @change="onChangeMediaFile"></td>
      </tr>
      <tr>
        <td> Preview file</td>
        <td><input type="file"  @change="onChangePreviewFile"></td>
      </tr>
      <tr><td>Title</td><td><input type="text" style="width: 100%" v-model="mintForm.title" ></td></tr>
      <tr><td>Medium</td><td><input type="text" style="width: 100%" v-model="mintForm.medium" ></td></tr>
      <tr><td>Genre</td><td><input type="text" style="width: 100%" v-model="mintForm.genre" ></td></tr>
      <tr><td>Bio</td><td><input type="text" style="width: 100%" v-model="mintForm.bio" ></td></tr>
      <tr><td>Description</td><td><input type="text" style="width: 100%" v-model="mintForm.description" ></td></tr>
      <tr><td>Format</td><td><input type="text" style="width: 100%" v-model="mintForm.format" ></td></tr>
      <tr><td>Type</td><td><input type="text" style="width: 100%" v-model="mintForm.type" ></td></tr>
      <tr><td>Artist</td><td><input type="text" style="width: 100%" v-model="mintForm.artist" ></td></tr>
      <tr><td>Created By</td><td><input type="text" style="width: 100%" v-model="mintForm.createdBy" ></td></tr>
      <tr><td>Year</td><td><input type="text" style="width: 100%" v-model="mintForm.year" ></td></tr>
      <tr><td>Price</td><td><input type="text" style="width: 100%" v-model="mintForm.price" ></td></tr>
      <tr><td>Artists</td><td><span>{{mintForm.artists}}</span></td></tr>
      <tr><td>Royalties</td><td><span>{{mintForm.royalties}}</span></td></tr>
      <tr><td>Quantity</td><td><input type="text" style="width: 100%" v-model="mintForm.quantity" ></td></tr>
      <tr><td>Edition</td><td><input type="text" style="width: 100%" v-model="mintForm.edition" ></td></tr>
      <tr><td>Copies</td><td><input type="text" style="width: 100%" v-model="mintForm.copies" ></td></tr>
    </table>


    <button @click="fullMint">Full mint</button>


    {{mintForm}}

  </div>


</template>

<style scoped>
.table_form {
  width: 100%;
  border-collapse: collapse; /* Collapses the border */
}

.table_form tr {
  height: 40px;
}

.table_form th, .table__form td {
  border: 1px solid #ddd; /* Adds border to th and td */
  padding: 8px; /* Adds padding */
  text-align: left; /* Aligns text to left */

}

.table_form th {
  background-color: #f2f2f2; /* Background color for headers */
  color: black; /* Text color for headers */

}

.table_form tr:nth-child(even) {
  background-color: #f9f9f9; /* Zebra striping for rows */
}

.table_form tr:hover {
  background-color: #ddd; /* Hover effect for rows */
}
</style>
