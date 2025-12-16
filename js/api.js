const API_URL = "https://script.google.com/macros/s/AKfycbzsfRDjqwojT9yg_VvP-lN4O1y132eV_dxBKKKX7Xh7N9J4uAuLKP3Cy9liI2p5YbHU3A/exec";

async function apiCall(data = {}) {
    const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(data)
    });

    return res.json();
}
