import { db } from "./firebase-config.js"
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"

const elForm = document.getElementById("formProduct")
const elReset = document.getElementById("btnReset")
const elList = document.getElementById("list")

const elId = document.getElementById("productId")
const elName = document.getElementById("name")
const elImg = document.getElementById("imageUrl")
const elOld = document.getElementById("priceOld")
const elNew = document.getElementById("priceNew")
const elHi = document.getElementById("isHighlight")
const elDetail = document.getElementById("detailText")
const elOffer = document.getElementById("offerEnds")

const safeText = (v) => (v === null || v === undefined ? "" : String(v))
const safeUrl = (v) => (typeof v === "string" && v.trim() ? v.trim() : "")
const safeNum = (v) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

const fmtIdr = (n) => {
  const x = Number(n)
  if (!Number.isFinite(x)) return ""
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(x)
}

const resetForm = () => {
  elId.value = ""
  elName.value = ""
  elImg.value = ""
  elOld.value = ""
  elNew.value = ""
  elHi.checked = false
  elDetail.value = ""
  elOffer.value = ""
}

const loadHighlightsCount = async (excludeId) => {
  const snap = await getDocs(collection(db, "products"))
  let c = 0
  snap.forEach((d) => {
    if (excludeId && d.id === excludeId) return
    const x = d.data() || {}
    if (Boolean(x.isHighlight)) c += 1
  })
  return c
}

const getAll = async () => {
  const qy = query(collection(db, "products"), orderBy("updatedAt", "desc"))
  const snap = await getDocs(qy)
  const out = []
  snap.forEach((d) => {
    const x = d.data() || {}
    out.push({
      id: d.id,
      name: x.name,
      imageUrl: x.imageUrl,
      priceOld: x.priceOld,
      priceNew: x.priceNew,
      isHighlight: Boolean(x.isHighlight),
      detailText: x.detailText,
      offerEnds: x.offerEnds
    })
  })
  return out
}

const setFormFromDoc = async (id) => {
  const ref = doc(db, "products", id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const d = snap.data() || {}
  elId.value = id
  elName.value = safeText(d.name)
  elImg.value = safeText(d.imageUrl)
  elOld.value = d.priceOld === null || d.priceOld === undefined ? "" : String(d.priceOld)
  elNew.value = d.priceNew === null || d.priceNew === undefined ? "" : String(d.priceNew)
  elHi.checked = Boolean(d.isHighlight)
  elDetail.value = safeText(d.detailText)
  elOffer.value = safeText(d.offerEnds)
}

const renderList = (items) => {
  elList.innerHTML = ""
  for (const p of items) {
    const row = document.createElement("div")
    row.className = "item"

    const th = document.createElement("div")
    th.className = "thumb"
    const img = document.createElement("img")
    const url = safeUrl(p.imageUrl)
    if (url) img.src = url
    img.alt = safeText(p.name)
    th.appendChild(img)

    const info = document.createElement("div")
    info.className = "info"

    const name = document.createElement("div")
    name.className = "name"
    name.textContent = safeText(p.name)

    const sub = document.createElement("div")
    sub.className = "sub"

    const s1 = document.createElement("div")
    s1.textContent = fmtIdr(p.priceNew)

    const s2 = document.createElement("div")
    s2.textContent = p.isHighlight ? "highlight" : ""

    sub.appendChild(s1)
    sub.appendChild(s2)

    const tags = document.createElement("div")
    tags.className = "tags"

    if (p.isHighlight) {
      const t = document.createElement("div")
      t.className = "tag tag-hi"
      t.textContent = "highlight"
      tags.appendChild(t)
    }

    info.appendChild(name)
    info.appendChild(sub)
    info.appendChild(tags)

    const actions = document.createElement("div")
    actions.className = "item-actions"

    const btnEdit = document.createElement("button")
    btnEdit.type = "button"
    btnEdit.className = "btn"
    btnEdit.textContent = "Edit"
    btnEdit.addEventListener("click", () => setFormFromDoc(p.id))

    const btnDel = document.createElement("button")
    btnDel.type = "button"
    btnDel.className = "btn btn-danger"
    btnDel.textContent = "Hapus"
    btnDel.addEventListener("click", async () => {
      await deleteDoc(doc(db, "products", p.id))
      await refresh()
      resetForm()
    })

    actions.appendChild(btnEdit)
    actions.appendChild(btnDel)

    row.appendChild(th)
    row.appendChild(info)
    row.appendChild(actions)

    elList.appendChild(row)
  }
}

const refresh = async () => {
  const items = await getAll()
  renderList(items)
}

elReset.addEventListener("click", resetForm)

elForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const id = safeText(elId.value).trim()
  const name = safeText(elName.value).trim()
  const imageUrl = safeText(elImg.value).trim()
  const priceOld = safeNum(elOld.value)
  const priceNew = safeNum(elNew.value)
  const isHighlight = Boolean(elHi.checked)
  const detailText = safeText(elDetail.value).trim()
  const offerEnds = safeText(elOffer.value).trim()

  if (!name) return
  if (!imageUrl) return
  if (priceNew === null) return

  if (isHighlight) {
    const count = await loadHighlightsCount(id || null)
    if (count >= 3) return
  }

  const payload = {
    name,
    imageUrl,
    priceOld,
    priceNew,
    isHighlight,
    detailText,
    offerEnds,
    updatedAt: serverTimestamp()
  }

  if (id) {
    await updateDoc(doc(db, "products", id), payload)
  } else {
    await addDoc(collection(db, "products"), payload)
  }

  await refresh()
  resetForm()
})

refresh()