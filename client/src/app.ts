import "regenerator-runtime/runtime"
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js"
import { deserialize, serialize } from "borsh"
import Wallet from "@project-serum/sol-wallet-adapter"
import lo from "buffer-layout"
import BN from "bn.js"

declare global {
  interface Window {
    solana: any
  }
}

class Payload {
  action: number
  amount: number

  constructor(fields: { action: number; amount: number } | undefined = undefined) {
    if (fields) {
      this.action = fields.action
      this.amount = fields.amount
    }
  }

  static scheme = new Map([
    [
      Payload,
      {
        kind: "struct",
        fields: [
          ["action", "u8"],
          ["amount", "u64"],
        ],
      },
    ],
  ])
}

class Donator {
  action: number
  user: Uint8Array

  constructor(fields: { action: number; user: Uint8Array } | undefined = undefined) {
    if (fields) {
      this.action = fields.action
      this.user = fields.user
    }
  }

  static scheme = new Map([
    [
      Donator,
      {
        kind: "struct",
        fields: [
          ["action", "u8"],
          ["user", [32]],
        ],
      },
    ],
  ])
}

class WithdrawAccount {
  action = 1
  constructor(fields: { action: number } | undefined = undefined) {
    if (fields) {
      this.action = fields.action
    }
  }
  static scheme = new Map([[WithdrawAccount, { kind: "struct", fields: [["action", "u8"]] }]])
}
//Borsh schema definition for greeting accounts

export class App {
  static moneyStorageSeed = "money11111"
  static donatorSeed = "donator33333"

  programId: PublicKey
  moneyStorage: PublicKey
  connection: Connection
  userWallet: Wallet
  donatorPubkey: PublicKey

  constructor(programId: string, providerUrl) {
    this.programId = new PublicKey(programId)
    this.connection = new Connection(providerUrl)
    this.userWallet = new Wallet("https://www.sollet.io")
  }

  async init() {
    this.moneyStorage = (
      await PublicKey.findProgramAddress(
        [Buffer.from(App.moneyStorageSeed, "utf-8")],
        this.programId
      )
    )[0]

    console.log(this.moneyStorage.toBase58())
    this.getAllDonators()
  }

  async getAllDonators() {
    let accounts = await this.connection.getProgramAccounts(this.programId)
    let x = []
    accounts.forEach((e) => {
      // console.log(e.pubkey.toBase58())
      // try {
      //     let campData = deserialize(CampaignDetails.schema, CampaignDetails, e.account.data);
      //     x.push({
      //         pubId: e.pubkey,
      //         name: campData.name,
      //         description: campData.description,
      //         image_link: campData.image_link,
      //         amount_donated: campData.amount_donated,
      //         admin: campData.admin,
      //     });
      // } catch (err) {
      //     console.log(err);
      // }
    })
    return x
  }

  async getDonatorPubKey() {
    this.donatorPubkey = await PublicKey.createWithSeed(
      this.userWallet.publicKey,
      App.donatorSeed,
      this.programId
    )
  }

  async createDonatorPDA() {
    const query = new Donator({ action: 0, user: this.userWallet.publicKey.toBytes() })
    console.log(123)
    const data = serialize(Donator.scheme, query)
    console.log(2)
    const lamports = await this.connection.getMinimumBalanceForRentExemption(data.length)
    console.log(3)
    const createAccountIx = SystemProgram.createAccountWithSeed({
      fromPubkey: this.userWallet.publicKey,
      basePubkey: this.userWallet.publicKey,
      seed: App.donatorSeed,
      newAccountPubkey: this.donatorPubkey,
      space: data.length,
      lamports: lamports,
      programId: this.programId,
    })

    const tx = new Transaction().add(createAccountIx)
    tx.feePayer = this.userWallet.publicKey
    tx.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash
    let signedTx = await this.userWallet.signTransaction(tx)
    console.log(55)
    let signature = await this.connection.sendRawTransaction(signedTx.serialize())
    await this.connection.confirmTransaction(signature)
  }

  async donate(amount: number) {
    await this.getDonatorPubKey()
    const query = new Payload({ action: 0, amount: amount })
    const data = serialize(Payload.scheme, query)
    // this.createDonatorPDA()
    console.log(this.donatorPubkey.toBase58())

    const donateIx = new TransactionInstruction({
      keys: [
        { pubkey: this.userWallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: this.moneyStorage, isSigner: false, isWritable: true },
        { pubkey: this.donatorPubkey, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: Buffer.from(data),
    })
    let tx = new Transaction()
    tx.add(donateIx)
    tx.feePayer = this.userWallet.publicKey
    tx.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash
    let signedTx = await this.userWallet.signTransaction(tx)
    let signature = await this.connection.sendRawTransaction(signedTx.serialize())
    await this.connection.confirmTransaction(signature)
  }

  async connectWallet() {
    await this.userWallet.connect()
  }

  async withdraw() {
    // let withdrawQuery = new WithdrawAccount({action: 1, admin: this.userWallet.publicKey.toBytes()})
    // const data = serialize(WithdrawAccount.scheme, withdrawQuery)
    const query = new WithdrawAccount({ action: 1 })
    const data = serialize(WithdrawAccount.scheme, query)
    const donateIx = new TransactionInstruction({
      keys: [
        { pubkey: this.userWallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: this.moneyStorage, isSigner: false, isWritable: true },
      ],
      programId: this.programId,
      data: Buffer.from(data),
    })
    let tx = new Transaction()
    tx.add(donateIx)
    tx.feePayer = this.userWallet.publicKey
    tx.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash
    let signedTx = await this.userWallet.signTransaction(tx)
    let signature = await this.connection.sendRawTransaction(signedTx.serialize())
    await this.connection.confirmTransaction(signature)
  }
}
