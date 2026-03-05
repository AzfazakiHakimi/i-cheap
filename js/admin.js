import { db, storage } from "./firebase-config.js"
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js"

const elForm = document.getElementById("formProduct")
const elReset = document.getElementById("btnReset")
const elList = document.getElementById("list")

const elId = document.getElementById("productId")
const elName = document.getElementById("name")
const elOld = document.getElementById("priceOld")
const elNew = document.getElementById("priceNew")
const elHi = document.getElementById("isHighlight")
const elDetail = document.getElementById("detailText")
const elOffer = document.getElementById("offerEnds")
const elOfferText = document.getElementById("offerEndsText")

if (elOfferText && elOffer && typeof elOffer.showPicker === "function") {
  elOfferText.addEventListener("click", () => elOffer.showPicker())
  elOfferText.addEventListener("focus", () => elOffer.showPicker())
}

if (elOffer && elOfferText) {
  elOffer.addEventListener("change", () => {
    elOfferText.value = toIdSlash(elOffer.value)
  })
}

const elCoverFile = document.getElementById("coverFile")
const elCoverPreview = document.getElementById("coverPreview")
const elSliderFile = document.getElementById("sliderFile")
const elBtnAddSlider = document.getElementById("btnAddSlider")
const elSliderPreview = document.getElementById("sliderPreview")

const safeText = (v) => (v === null || v === undefined ? "" : String(v))
const safeUrl = (v) => (typeof v === "string" && v.trim() ? v.trim() : "")
const safeNum = (v) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

const toIsoDate = (v) => {
  const s = safeText(v).trim()
  if (!s) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length !== 3) return ""

  const dd = Number(parts[0])
  const yy = Number(parts[2])
  if (!Number.isFinite(dd) || !Number.isFinite(yy)) return ""

  const m = parts[1].toLowerCase()
  const months = {
    januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
    juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12
  }
  const mm = months[m]
  if (!mm) return ""

  const d2 = String(dd).padStart(2, "0")
  const m2 = String(mm).padStart(2, "0")
  return `${yy}-${m2}-${d2}`
}

const toIdSlash = (iso) => {
  const s = safeText(iso).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return ""
  const dd = s.slice(8, 10)
  const mm = s.slice(5, 7)
  const yy = s.slice(0, 4)
  return `${dd}/${mm}/${yy}`
}

const fmtIdr = (n) => {
  const x = Number(n)
  if (!Number.isFinite(x)) return ""
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(x)
}

let coverState = { existing: null, file: null, previewUrl: "" }
let sliderState = []
let deleteCoverPath = ""
let deleteSliderPaths = []

const revokeUrl = (u) => { if (u) URL.revokeObjectURL(u) }

const renderCoverPreview = () => {
  elCoverPreview.innerHTML = ""
  const src = coverState.file ? coverState.previewUrl : (coverState.existing ? coverState.existing.url : "")
  if (!src) return

  const card = document.createElement("div")
  card.className = "preview-card square"

  const img = document.createElement("img")
  img.src = src
  img.alt = ""

  const x = document.createElement("button")
  x.type = "button"
  x.className = "preview-x"
  x.textContent = "×"
  x.addEventListener("click", () => {
    if (coverState.file) {
      revokeUrl(coverState.previewUrl)
      coverState.file = null
      coverState.previewUrl = ""
      elCoverFile.value = ""
    } else if (coverState.existing) {
      deleteCoverPath = coverState.existing.path || ""
      coverState.existing = null
    }
    renderCoverPreview()
  })

  card.appendChild(img)
  card.appendChild(x)
  elCoverPreview.appendChild(card)
}

const renderSliderPreview = () => {
  elSliderPreview.innerHTML = ""
  for (let i = 0; i < sliderState.length; i += 1) {
    const it = sliderState[i]
    const src = it.kind === "new" ? it.previewUrl : it.url
    if (!src) continue

    const card = document.createElement("div")
    card.className = "preview-card wide"

    const img = document.createElement("img")
    img.src = src
    img.alt = ""

    const x = document.createElement("button")
    x.type = "button"
    x.className = "preview-x"
    x.textContent = "×"
    x.addEventListener("click", () => {
      const cur = sliderState[i]
      if (cur.kind === "new") revokeUrl(cur.previewUrl)
      if (cur.kind === "existing" && cur.path) deleteSliderPaths = deleteSliderPaths.concat([cur.path])
      sliderState = sliderState.slice(0, i).concat(sliderState.slice(i + 1))
      renderSliderPreview()
    })

    card.appendChild(img)
    card.appendChild(x)
    elSliderPreview.appendChild(card)
  }
}

const resetForm = () => {
  elId.value = ""
  elName.value = ""
  elOld.value = ""
  elNew.value = ""
  elHi.checked = false
  elDetail.value = ""
  if (elOffer) elOffer.value = ""
  if (elOfferText) elOfferText.value = ""

  elCoverFile.value = ""
  revokeUrl(coverState.previewUrl)
  coverState = { existing: null, file: null, previewUrl: "" }
  deleteCoverPath = ""

  for (const it of sliderState) if (it.kind === "new") revokeUrl(it.previewUrl)
  sliderState = []
  deleteSliderPaths = []
  elSliderFile.value = ""

  renderCoverPreview()
  renderSliderPreview()
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
      coverUrl: x.coverUrl,
      coverPath: x.coverPath,
      slider: x.slider,
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
  elOld.value = d.priceOld === null || d.priceOld === undefined ? "" : String(d.priceOld)
  elNew.value = d.priceNew === null || d.priceNew === undefined ? "" : String(d.priceNew)
  elHi.checked = Boolean(d.isHighlight)
  elDetail.value = safeText(d.detailText)
  const iso = toIsoDate(d.offerEnds)
  if (elOffer) elOffer.value = iso
  if (elOfferText) elOfferText.value = toIdSlash(iso)

  deleteCoverPath = ""
  deleteSliderPaths = []

  const coverUrl = safeText(d.coverUrl).trim()
  const coverPath = safeText(d.coverPath).trim()
  coverState.existing = coverUrl && coverPath ? { url: coverUrl, path: coverPath } : null
  revokeUrl(coverState.previewUrl)
  coverState.file = null
  coverState.previewUrl = ""
  elCoverFile.value = ""
  renderCoverPreview()

  for (const it of sliderState) if (it.kind === "new") revokeUrl(it.previewUrl)
  const arr = Array.isArray(d.slider) ? d.slider : []
  sliderState = arr
    .map((x) => ({ kind: "existing", path: safeText(x.path).trim(), url: safeText(x.url).trim() }))
    .filter((x) => x.path && x.url)
  renderSliderPreview()
}

const renderList = (items) => {
  elList.innerHTML = ""
  for (const p of items) {
    const row = document.createElement("div")
    row.className = "item"

    const th = document.createElement("div")
    th.className = "thumb"
    const img = document.createElement("img")
    const url = safeUrl(p.coverUrl)
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
      const refDoc = doc(db, "products", p.id)
      const snap = await getDoc(refDoc)
      if (snap.exists()) {
        const d = snap.data() || {}
        const coverPath = safeText(d.coverPath).trim()
        if (coverPath) await deleteObject(ref(storage, coverPath))

        const arr = Array.isArray(d.slider) ? d.slider : []
        for (const it of arr) {
          const sp = safeText(it.path).trim()
          if (sp) await deleteObject(ref(storage, sp))
        }
      }

      await deleteDoc(refDoc)
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

elCoverFile.addEventListener("change", () => {
  const f = elCoverFile.files && elCoverFile.files[0] ? elCoverFile.files[0] : null
  if (!f) return
  if (coverState.file) revokeUrl(coverState.previewUrl)
  coverState.file = f
  coverState.previewUrl = URL.createObjectURL(f)
  renderCoverPreview()
})

elBtnAddSlider.addEventListener("click", () => {
  const f = elSliderFile.files && elSliderFile.files[0] ? elSliderFile.files[0] : null
  if (!f) return
  const u = URL.createObjectURL(f)
  sliderState = sliderState.concat([{ kind: "new", file: f, previewUrl: u }])
  elSliderFile.value = ""
  renderSliderPreview()
})

elForm.addEventListener("submit", async (e) => {
  e.preventDefault()

  const idRaw = safeText(elId.value).trim()
  const name = safeText(elName.value).trim()
  const priceOld = safeNum(elOld.value)
  const priceNew = safeNum(elNew.value)
  const isHighlight = Boolean(elHi.checked)
  const detailText = safeText(elDetail.value).trim()
  const offerEnds = safeText(elOffer ? elOffer.value : "").trim()

  const hasCover = Boolean(coverState.file || coverState.existing)
  if (!name) return
  if (priceOld !== null && priceOld < 0) return
  if (priceNew < 0) return
  if (!hasCover) return

  if (isHighlight) {
    const count = await loadHighlightsCount(idRaw || null)
    if (count >= 3) return
  }

  const basePayload = {
    name,
    priceOld,
    priceNew,
    isHighlight,
    detailText,
    offerEnds,
    updatedAt: serverTimestamp()
  }

  let id = idRaw
  if (!id) {
    const created = await addDoc(collection(db, "products"), basePayload)
    id = created.id
  } else {
    await updateDoc(doc(db, "products", id), basePayload)
  }

  const patch = {}

  if (coverState.file) {
    const ext = (coverState.file.name.split(".").pop() || "jpg").toLowerCase()
    const path = `products/${id}/cover-${crypto.randomUUID()}.${ext}`
    const r = ref(storage, path)
    await uploadBytes(r, coverState.file)
    const url = await getDownloadURL(r)
    patch.coverPath = path
    patch.coverUrl = url

    if (coverState.existing && coverState.existing.path) {
      await deleteObject(ref(storage, coverState.existing.path))
    }
  } else if (!coverState.existing && deleteCoverPath) {
    await deleteObject(ref(storage, deleteCoverPath))
    patch.coverPath = ""
    patch.coverUrl = ""
  }

  const sliderExisting = sliderState.filter((x) => x.kind === "existing").map((x) => ({ path: x.path, url: x.url }))
  const sliderNew = sliderState.filter((x) => x.kind === "new")

  const uploaded = []
  for (const it of sliderNew) {
    const f = it.file
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase()
    const path = `products/${id}/slider/${crypto.randomUUID()}.${ext}`
    const r = ref(storage, path)
    await uploadBytes(r, f)
    const url = await getDownloadURL(r)
    uploaded.push({ path, url })
  }

  if (deleteSliderPaths.length) {
    for (const p of deleteSliderPaths) await deleteObject(ref(storage, p))
  }

  patch.slider = sliderExisting.concat(uploaded)

  if (Object.keys(patch).length) {
    await updateDoc(doc(db, "products", id), patch)
  }

  await refresh()
  resetForm()
})

refresh()