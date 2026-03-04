import { db } from "./firebase-config.js"
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"

const elImg = document.getElementById("imgProduct")
const elName = document.getElementById("nameProduct")
const elOld = document.getElementById("oldPrice")
const elNew = document.getElementById("newPrice")
const elDetail = document.getElementById("detailText")
const elOffer = document.getElementById("offerEnds")
const elBtn = document.getElementById("btnOrder")

const fmtIdr = (n) => {
  const x = Number(n)
  if (!Number.isFinite(x)) return ""
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(x)
}

const safeText = (v) => (v === null || v === undefined ? "" : String(v))
const safeUrl = (v) => (typeof v === "string" && v.trim() ? v.trim() : "")

const qs = new URLSearchParams(location.search)
const id = qs.get("id") || ""

const toWhatsApp = (productName) => {
  const phone = "6282222216470"
  const text = `Halo, saya mau pesan: ${productName}`
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
  return url
}

const load = async () => {
  if (!id) return
  const ref = doc(db, "products", id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const d = snap.data() || {}
  const name = safeText(d.name)

  const imgUrl = safeUrl(d.imageUrl)
  if (imgUrl) elImg.src = imgUrl
  elImg.alt = name

  elName.textContent = name
  elOld.textContent = fmtIdr(d.priceOld)
  elNew.textContent = fmtIdr(d.priceNew)
  elDetail.textContent = safeText(d.detailText)
  elOffer.textContent = safeText(d.offerEnds)

  elBtn.href = toWhatsApp(name)
}

load()