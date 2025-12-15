const API_URL = "https://script.google.com/macros/s/AKfycbwhFlGMXgGGjWf1J55Frtsjit6REI74-JMufF_Xbn4Oy0727xdsqZBMUyPloyLs6BecTA/exec";

async function apiCall(data = {}) {
    const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(data)
    });

    return res.json();
}
