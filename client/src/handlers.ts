import { App } from "./app"

const app = new App(
  "3otYy2KpQQB2j4aJgmpcNARrJ1eiJNff21Bb822dBonp",
  "https://api.testnet.solana.com"
)
app.init()

const connectBtn = document.getElementById("connectBtn")
connectBtn?.addEventListener("click", sconnectWallet)

const donateBtn = document.getElementById("donateBtn")
donateBtn?.addEventListener("click", donate)
const withdrawBtn = document.getElementById("withdrawBtn")
withdrawBtn?.addEventListener("click", withdraw)

async function sconnectWallet(this: HTMLElement) {
  await app.connectWallet()
}

async function donate() {
  const inputElement = document.getElementById("donateInput") as HTMLInputElement
  let amount = inputElement.value as number
  await app.donate(amount)
}

async function withdraw() {
  await app.withdraw()
}
