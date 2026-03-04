import { db } from "./firebase-config.js"
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"

const elStage = document.getElementById("highlightStage")
const elGrid = document.getElementById("productGrid")

const fmtIdr = (n) => {
  const x = Number(n)
  if (!Number.isFinite(x)) return ""
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(x)
}

const safeText = (v) => (v === null || v === undefined ? "" : String(v))
const safeUrl = (v) => (typeof v === "string" && v.trim() ? v.trim() : "")

const goDetail = (id) => {
  if (!id) return
  location.href = `detail-produk.html?id=${encodeURIComponent(id)}`
}

const buildCard = (p, variant) => {
  const a = document.createElement("a")
  a.className = variant === "highlight" ? "highlight-card" : "product-card"
  a.href = "javascript:void(0)"

  const media = document.createElement("div")
  media.className = "card-media"

  const img = document.createElement("img")
  const url = safeUrl(p.imageUrl)
  if (url) img.src = url
  img.alt = safeText(p.name)

  media.appendChild(img)

  const body = document.createElement("div")
  body.className = "card-body"

  const name = document.createElement("div")
  name.className = "card-name"
  name.textContent = safeText(p.name)

  const prices = document.createElement("div")
  prices.className = "card-prices"

  const oldP = document.createElement("div")
  oldP.className = "price-old"
  oldP.textContent = fmtIdr(p.priceOld)

  const newP = document.createElement("div")
  newP.className = "price-new"
  newP.textContent = fmtIdr(p.priceNew)

  prices.appendChild(oldP)
  prices.appendChild(newP)

  body.appendChild(name)
  body.appendChild(prices)

  a.appendChild(media)
  a.appendChild(body)

  return a
}

let highlightIds = []
let highlightIndex = 0

const setHighlightPositions = () => {
  const ids = highlightIds.slice()
  if (ids.length !== 3) return
  const left = ids[(highlightIndex + 2) % 3]
  const center = ids[highlightIndex % 3]
  const right = ids[(highlightIndex + 1) % 3]

  const cards = elStage.querySelectorAll(".highlight-card")
  for (const c of cards) {
    const id = c.getAttribute("data-id") || ""
    if (id === left) c.setAttribute("data-pos", "left")
    if (id === center) c.setAttribute("data-pos", "center")
    if (id === right) c.setAttribute("data-pos", "right")
  }
}

const renderHighlights = (items) => {
  elStage.innerHTML = ""
  highlightIds = items.map((x) => x.id).slice(0, 3)
  highlightIndex = 0

  if (items.length < 3) return

  for (const p of items.slice(0, 3)) {
    const card = buildCard(p, "highlight")
    card.setAttribute("data-id", p.id)

    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id") || ""
      const pos = card.getAttribute("data-pos") || ""

      if (pos === "center") {
        goDetail(id)
        return
      }

      const idx = highlightIds.indexOf(id)
      if (idx < 0) return
      highlightIndex = idx
      setHighlightPositions()
    })

    elStage.appendChild(card)
  }

  setHighlightPositions()
}

const renderGrid = (items) => {
  elGrid.innerHTML = ""
  for (const p of items) {
    const card = buildCard(p, "grid")
    card.addEventListener("click", () => goDetail(p.id))
    elGrid.appendChild(card)
  }
}

const loadProducts = async () => {
  const qy = query(collection(db, "products"), orderBy("updatedAt", "desc"))
  const snap = await getDocs(qy)

  const all = []
  snap.forEach((doc) => {
    const d = doc.data() || {}
    all.push({
      id: doc.id,
      name: d.name,
      imageUrl: d.imageUrl,
      priceOld: d.priceOld,
      priceNew: d.priceNew,
      isHighlight: Boolean(d.isHighlight),
      detailText: d.detailText,
      offerEnds: d.offerEnds
    })
  })

  const highlights = all.filter((x) => x.isHighlight).slice(0, 3)
  const others = all.filter((x) => !x.isHighlight)

  renderHighlights(highlights)
  renderGrid(others)
}

loadProducts()