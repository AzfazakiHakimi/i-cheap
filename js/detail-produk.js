import { db } from "./firebase-config.js"
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"

const elImg = document.getElementById("imgProduct")
const elName = document.getElementById("nameProduct")
const elOld = document.getElementById("oldPrice")
const elNew = document.getElementById("newPrice")
const elDetail = document.getElementById("detailText")
const elOffer = document.getElementById("offerEnds")
const elBtn = document.getElementById("btnOrder")
const elTrack = document.getElementById("sliderTrack")
const elDots = document.getElementById("sliderDots")

const fmtIdr = (n) => {
  const x = Number(n)
  if (!Number.isFinite(x)) return ""
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(x)
}

const safeText = (v) => (v === null || v === undefined ? "" : String(v))
const safeUrl = (v) => (typeof v === "string" && v.trim() ? v.trim() : "")
const fmtIdDate = (v) => {
  const s = safeText(v).trim()
  if (!s) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const y = Number(s.slice(0, 4))
    const m = Number(s.slice(5, 7))
    const d = Number(s.slice(8, 10))
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ""
    const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]
    if (m < 1 || m > 12) return ""
    return `${d} ${months[m - 1]} ${y}`
  }
  return s
}

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

  const imgUrl = safeUrl(d.coverUrl)
  if (imgUrl) elImg.src = imgUrl
  elImg.alt = name

  elImg.loading = "lazy"
  elImg.decoding = "async"
  elImg.addEventListener("error", () => elImg.removeAttribute("src"))

  elName.textContent = name
  elOld.textContent = fmtIdr(d.priceOld)
  elNew.textContent = fmtIdr(d.priceNew)
  elDetail.textContent = safeText(d.detailText)
  elOffer.textContent = fmtIdDate(d.offerEnds)

  elBtn.href = toWhatsApp(name)
  const slider = Array.isArray(d.slider) ? d.slider : []
  renderSlider(slider)
}

const renderDots = (n) => {
  elDots.innerHTML = ""
  if (!n || n < 2) return
  for (let i = 0; i < n; i += 1) {
    const d = document.createElement("button")
    d.type = "button"
    d.className = "dot" + (i === 0 ? " active" : "")
    d.addEventListener("click", () => {
      const w = elTrack.clientWidth
      if (!w) return
      elTrack.scrollTo({ left: w * i, behavior: "smooth" })
      setActiveDot(i)
    })
    elDots.appendChild(d)
  }
}

const setActiveDot = (idx) => {
  const dots = elDots.querySelectorAll(".dot")
  for (let i = 0; i < dots.length; i += 1) {
    if (i === idx) dots[i].classList.add("active")
    else dots[i].classList.remove("active")
  }
}

const renderSlider = (items) => {
  elTrack.innerHTML = ""
  elDots.innerHTML = ""
  if (!items || !items.length) return

  for (const it of items) {
    const s = document.createElement("div")
    s.className = "slide"
    const img = document.createElement("img")
    img.alt = ""
    const u = safeUrl(it && (it.url || it))
    if (u) img.src = u
    s.appendChild(img)
    img.loading = "lazy"
    img.decoding = "async"
    img.addEventListener("error", () => img.removeAttribute("src"))
    elTrack.appendChild(s)
  }

  renderDots(items.length)

  let lastIdx = 0
  elTrack.addEventListener("scroll", () => {
    const w = elTrack.clientWidth
    if (!w) return
    const idx = Math.round(elTrack.scrollLeft / w)
    if (idx === lastIdx) return
    lastIdx = idx
    setActiveDot(idx)
  })
}

load()