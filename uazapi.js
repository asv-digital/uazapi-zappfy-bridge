const saveWebhook = async (data, token) => {
    try {
        const response = await fetch(`${process.env.UAZAPI_URL}/webhook`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'token': token
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error saving webhook:', error);
        throw error;
    }
}

module.exports = { saveWebhook };