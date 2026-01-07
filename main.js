
const state = {
    people: [{ id: uid(), name: "You" }],
    expenses: [],
    currency: "₪",
    dark: false,
}


// ---------- Init ----------
const init = () => {
    loadStateFromStorage()
    document.body.classList.toggle("dark", state.dark)
    $("#currencyInput").value = state.currency
    $("#darkSwitch").dataset.checked = state.dark ? "true" : "false"
    $("#headerBadge").textContent = state.dark ? '☀️' : '🌓'

    renderPeopleList()
    renderExpenseList()
    updateSummaryAndSettlements(false)

    $("#addPersonBtn").onclick = () => {
        state.people.push({ id: uid(), name: `P${state.people.length + 1}` })
        renderPeopleList()
        updateAllPayerSelectOptions()
        updateSummaryAndSettlements()
    }

    $("#addExpenseBtn").onclick = () => {
        if (!state.people.length) return
        state.expenses.push({
            id: uid(),
            payerId: state.people[0].id,
            amount: 0,
            note: "",
        })
        renderExpenseList()
        updateSummaryAndSettlements()
    }

    $("#resetBtn").onclick = () => {
        state.people = [{ id: uid(), name: "You" }]
        state.expenses = []
        state.currency = "₪"
        $("#headerBadge").textContent = state.dark ? '☀️' : '🌓'
        $("#currencyInput").value = state.currency
        renderPeopleList()
        renderExpenseList()
        updateSummaryAndSettlements()
        saveStateToStorage()
    }

    $("#shareBtn").onclick = shareState

    $("#currencyInput").addEventListener("input", e => {
        state.currency = e.target.value
        updateCurrencyUI()
    })

    $("#darkToggle").addEventListener("change", e => {
        state.dark = e.target.checked
        document.body.classList.toggle("dark", state.dark)
        $("#headerBadge").textContent = state.dark ? '☀️' : '🌓'

        $("#darkSwitch").dataset.checked = state.dark ? "true" : "false"
        saveStateToStorage()
    })

    $("#bottomAddExpense").onclick = () => $("#addExpenseBtn").click()
    $("#bottomAddPerson").onclick = () => $("#addPersonBtn").click()
}


const saveStateToStorage = () => localStorage.setItem("fairsplit_single_v4", JSON.stringify(state))
const loadStateFromStorage = () => {
    try {
        const s = JSON.parse(localStorage.getItem("fairsplit_single_v4")) || {}
        if (Array.isArray(s.people) && s.people.length) state.people = s.people
        if (Array.isArray(s.expenses)) state.expenses = s.expenses
        if (typeof s.currency === "string") state.currency = s.currency
        if (typeof s.dark === "boolean") state.dark = s.dark
    } catch { }
    const m = location.hash.match(/#data=([^&]+)/)
    if (m) {
        try {
            const s = decodeStateFromUrlParam(m[1])
            if (Array.isArray(s.people)) state.people = s.people
            if (Array.isArray(s.expenses)) state.expenses = s.expenses
            if (typeof s.currency === "string") state.currency = s.currency
        } catch { }
    }
}







const totals = () => {
    const n = Math.max(state.people.length, 1)
    const totalPaid = state.expenses.reduce((s, e) => s + (e.amount || 0), 0)
    const share = n ? totalPaid / n : 0
    const byPerson = new Map(
        state.people.map(p => [
            p.id,
            { person: p, paid: 0, owes: share, net: 0 },
        ])
    )
    for (const e of state.expenses) {
        const row = byPerson.get(e.payerId)
        if (row) row.paid += e.amount || 0
    }
    for (const row of byPerson.values()) {
        row.net = round(row.paid - row.owes)
    }
    return { totalPaid: round(totalPaid), share: round(share), byPerson }
}

// ---------- Renderers (targeted, no full re-render) ----------
const renderPeopleList = () => {
    const box = $("#peopleList")
    box.innerHTML = ""
    if (!state.people.length) {
        box.innerHTML = `<div class="hint">Add at least one person</div>`
        return
    }
    for (const p of state.people) {
        const card = document.createElement("div")
        card.className = "card fade-in"
        card.innerHTML = `
<div class="card-body">
<div class="row">
  <input class="input person-name" data-id="${p.id}" value="${escapeHtml(
            p.name
        )}" />
  <div></div>
  <button class="btn person-remove" data-id="${p.id}">Delete</button>
</div>
</div>
`
        box.appendChild(card)
    }

    box.querySelectorAll(".person-name").forEach(inp => {
        inp.addEventListener("input", e => {
            const id = e.target.dataset.id
            const name = e.target.value
            state.people = state.people.map(p =>
                p.id === id ? { ...p, name } : p
            )
            updateOptionLabelsForPerson(id, name)
            updateSummaryAndSettlements(false)
            saveStateToStorage()
        })
    })

    box.querySelectorAll(".person-remove").forEach(btn => {
        btn.addEventListener("click", e => {
            const id = e.currentTarget.dataset.id
            state.people = state.people.filter(p => p.id !== id)
            state.expenses = state.expenses.filter(x => x.payerId !== id)
            renderPeopleList()
            renderExpenseList()
            updateAllPayerSelectOptions()
            updateSummaryAndSettlements()
            saveStateToStorage()
        })
    })
}

const renderExpenseList = () => {
    const box = $("#expenseList")
    box.innerHTML = ""
    if (!state.expenses.length) {
        box.innerHTML = `<div class="hint">Tap <b>Add</b> and enter who paid how much</div>`
        return
    }
    for (const e of state.expenses) {
        const card = document.createElement("div")
        card.className = "card fade-in"
        card.innerHTML = `
<div class="card-body">
<div class="row">
  <select class="payer" data-id="${e.id}"></select>
  <input class="input amount" data-id="${e.id
            }" type="number" inputmode="decimal" placeholder="${state.currency
            } 0.00" value="${e.amount ?? ""}" />
  <button class="btn expense-remove" data-id="${e.id}">Delete</button>
</div>
<div style="margin-top:8px">
  <input class="input note" data-id="${e.id
            }" placeholder="Note (optional)" value="${escapeHtml(e.note || "")}" />
</div>
</div>
`
        box.appendChild(card)
    }

    updateAllPayerSelectOptions()

    box.querySelectorAll(".payer").forEach(sel => {
        sel.addEventListener("change", e => {
            const id = e.target.dataset.id
            const payerId = e.target.value
            state.expenses = state.expenses.map(x =>
                x.id === id ? { ...x, payerId } : x
            )
            updateSummaryAndSettlements()
            saveStateToStorage()
        })
    })

    box.querySelectorAll(".amount").forEach(inp => {
        inp.addEventListener("input", e => {
            const id = e.target.dataset.id
            const amount = num(e.target.value)
            state.expenses = state.expenses.map(x =>
                x.id === id ? { ...x, amount } : x
            )
            updateSummaryAndSettlements(false) // keep focus
            saveStateToStorage()
        })
    })

    box.querySelectorAll(".note").forEach(inp => {
        inp.addEventListener("input", e => {
            const id = e.target.dataset.id
            const note = e.target.value
            state.expenses = state.expenses.map(x =>
                x.id === id ? { ...x, note } : x
            )
            saveStateToStorage()
        })
    })

    box.querySelectorAll(".expense-remove").forEach(btn => {
        btn.addEventListener("click", e => {
            const id = e.currentTarget.dataset.id
            state.expenses = state.expenses.filter(x => x.id !== id)
            renderExpenseList()
            updateSummaryAndSettlements()
            saveStateToStorage()
        })
    })
}

const updateAllPayerSelectOptions = () => {
    document.querySelectorAll("select.payer").forEach(sel => {
        const id = sel.dataset.id
        const exp = state.expenses.find(x => x.id === id)
        const cur = exp ? exp.payerId : state.people[0]?.id
        const opts = state.people
            .map(
                p =>
                    `<option value="${p.id}" ${cur === p.id ? "selected" : ""
                    }>${escapeHtml(p.name)}</option>`
            )
            .join("")
        sel.innerHTML = opts
    })
}

const updateOptionLabelsForPerson = (personId, newName) => {
    document.querySelectorAll("select.payer").forEach(sel => {
        sel.querySelectorAll("option").forEach(opt => {
            if (opt.value === personId) opt.textContent = newName
        })
    })
}

const updateSummary = () => {
    const t = totals()
    const box = $("#summaryBox")
    const rows = [
        `<div class="stat"><span>Total Paid</span><span class="mono">${state.currency
        }${fmt(t.totalPaid)}</span></div>`,
        `<div class="stat" style="color:var(--muted)"><span>Equal share per person (${state.people.length
        })</span><b class="mono">${state.currency}${fmt(t.share)}</b></div>`,
    ]
    for (const r of t.byPerson.values()) {
        rows.push(`
<div class="stat">
    <span class="truncate">${escapeHtml(r.person.name)}</span>
    <span class="mono ${r.net >= 0 ? "pos" : "neg"}">${r.net >= 0 ? "+" : ""
            }${fmt(r.net)}</span>
</div>
`)
    }
    box.innerHTML = rows.join("")
}

// Uses your getPaymentTrans logic (based on total paid per person)
const updateSettlements = () => {
    const box = $("#settlementsBox")

    if (!state.people.length || !state.expenses.length) {
        box.innerHTML = `<div class="hint">Enter expenses and your settlement plan will appear here</div>`
        return
    }

    // Build users[] as: { name, amount } where amount = total paid
    const byPaid = new Map(state.people.map(p => [p.id, 0]))
    for (const e of state.expenses) {
        byPaid.set(e.payerId, (byPaid.get(e.payerId) || 0) + (e.amount || 0))
    }
    const users = state.people.map(p => ({
        name: p.name,
        amount: round(byPaid.get(p.id) || 0),
    }))
    const { results, avg } = getPaymentTrans(users)
    if (!results.length) {
        box.innerHTML = `<div class="hint">Nothing to settle ✅</div><div class="small">Avg per person: <span class="mono">${state.currency
            }${fmt(avg)}</span></div>`
        return
    }

    const header = `<div class="stat" style="margin-bottom:6px"><b>Who pays who</b><b><span class="mono">${state.currency
        }${fmt(avg)}</span></b></div>`
    const list = results
        .map(
            t => `
<div class="stat fade-in">
<span>${escapeHtml(t.from)} → ${escapeHtml(t.to)}</span>
<span class="mono">${state.currency}${fmt(t.amount)}</span>
</div>
`
        )
        .join("")

    box.innerHTML = header + list
}

const updateSummaryAndSettlements = (persist = true) => {
    updateSummary()
    updateSettlements()
    if (persist) saveStateToStorage()
}

const updateCurrencyUI = () => {
    console.log('state.dark:', state.dark)
    $("#headerBadge").textContent = state.dark ? '☀️' : '🌓'
    $("#currencyInput").value = state.currency
    document.querySelectorAll(".amount").forEach(inp => {
        inp.placeholder = `${state.currency} 0.00`
    })
    updateSummaryAndSettlements(false)
    saveStateToStorage()
}

const toast = txt => {
    const elx = document.createElement("div")
    elx.textContent = txt
    elx.style.position = "fixed"
    elx.style.left = "50%"
    elx.style.bottom = "84px"
    elx.style.transform = "translateX(-50%)"
    elx.style.background = "var(--panel)"
    elx.style.border = "1px solid var(--border)"
    elx.style.padding = "10px 14px"
    elx.style.borderRadius = "12px"
    elx.style.boxShadow = "var(--shadow)"
    elx.style.color = "var(--ink)"
    elx.style.zIndex = "100"
    document.body.appendChild(elx)
    setTimeout(
        () => document.body.contains(elx) && document.body.removeChild(elx),
        2200
    )
}

const shareState = async () => {
    const data = encodeStateToUrlParam({
        people: state.people,
        expenses: state.expenses,
        currency: state.currency,
    })

    const url = `${location.origin}${location.pathname}#data=${data}`

    try {
        await navigator.clipboard.writeText(url)
        toast("Link copied to clipboard")
    } catch {
        prompt("Copy this link:", url)
    }
}
