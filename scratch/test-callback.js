const baseURL = 'http://localhost:3000/api';

async function runCallbackTest() {
    try {
        console.log("Simulating HarakaPay callback for order HP1779058686878...");
        const response = await fetch(`${baseURL}/payments/harakapay-callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: 'HP1779058686878',
                status: 'completed',
                amount: 2000,
                phone: '255796615257'
            })
        }).then(r => r.json());

        console.log("Callback Response:", response);

        console.log("Checking if access is now granted...");
        const accessRes = await fetch(`${baseURL}/check-access/123/800ccd67-429b-48ae-8f48-40ff6c230e8a`).then(r => r.json());
        console.log("Access Response:", accessRes);
    } catch (e) {
        console.error("Callback test failed:", e);
    }
}

runCallbackTest();
