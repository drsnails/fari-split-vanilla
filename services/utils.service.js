
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
const num = v => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0)
const fmt = n => Number(n).toFixed(2)
const $ = s => document.querySelector(s)

const escapeHtml = s =>
    String(s).replace(
        /[&<>"']/g,
        c =>
        ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        }[c])
    )

function encodeStateToUrlParam(data) {
    const jsonString = JSON.stringify(data)
    const utf8Bytes = new TextEncoder().encode(jsonString)
    const binaryString = Array.from(utf8Bytes, byte =>
        String.fromCharCode(byte)
    ).join("")
    return encodeURIComponent(btoa(binaryString))
}

function decodeStateFromUrlParam(param) {
    const binaryString = atob(decodeURIComponent(param))
    const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    return JSON.parse(json)
}

