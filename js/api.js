const API_URL = "https://script.google.com/macros/s/AKfycbws2jSpfT22-Tcp1g8Ur996QrUu3TH78TnQCRIr6fWBIcbmJ-qmL0DUYSEj6o1HWICx8A/exec";

async function apiCall(data = {}) {
    const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(data)
    });

    return res.json();
}
