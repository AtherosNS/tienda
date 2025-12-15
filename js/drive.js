function toBase64(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(file);
    });
}

async function subirImagen(file) {
    const base64 = await toBase64(file);
    const resp = await api("subirImagen", {
        fileName: file.name,
        base64
    });

    return resp.url;
}
