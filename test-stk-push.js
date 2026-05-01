const baseURL = 'http://localhost:3000/api';

async function runTest() {
    try {
        console.log("1. Signing up/Logging in as 0796615257...");
        const signupRes = await fetch(`${baseURL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: "Test User", phone: "0796615257" })
        }).then(r => r.json());

        if (!signupRes.success || !signupRes.visitor) {
            console.error("Signup failed:", signupRes);
            return;
        }
        const visitor_id = signupRes.visitor.id;
        console.log("   Visitor ID:", visitor_id);

        console.log("2. Fetching games...");
        const games = await fetch(`${baseURL}/games`).then(r => r.json());
        const targetGame = games.find(g => g.price === 200 || g.original_price === 200);
        if (!targetGame) {
            console.error("Could not find a game that costs 200 TZS.");
            return;
        }
        console.log(`   Found Game: "${targetGame.title}" (ID: ${targetGame.id}), Price: ${targetGame.price} TZS`);

        console.log("3. Initiating ZenoPay STK Push...");
        const checkoutPayload = {
            amount: targetGame.price,
            phone: "0796615257",
            gameTitle: targetGame.title,
            visitorId: visitor_id,
            postId: targetGame.id,
            email: "test@chidyprime.com",
            name: "Test User"
        };
        const checkoutRes = await fetch(`${baseURL}/payments/zenopay-checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkoutPayload)
        }).then(r => r.json());
        
        console.log("   Checkout Response:", checkoutRes);

        if (checkoutRes.status === 'success' || checkoutRes.message === 'success' || checkoutRes.order_id) {
            console.log("\n=======================================================");
            console.log("📢 TAFADHALI INGIZA PIN KWENYE SIMU YAKO (0796615257) 📢");
            console.log("=======================================================\n");

            console.log("4. Polling for payment status (Waiting for you to enter PIN)...");
            let attempts = 0;
            const pollInterval = setInterval(async () => {
                attempts++;
                process.stdout.write(`   Polling attempt ${attempts}... `);
                const accessRes = await fetch(`${baseURL}/check-access/${visitor_id}/${targetGame.id}`).then(r => r.json());
                
                if (accessRes.has_access) {
                    console.log("\n✅ PAYMENT SUCCESSFUL! Access Granted!");
                    console.log("   Game is unlocked:", accessRes.links);
                    clearInterval(pollInterval);
                } else {
                    console.log("Still waiting...");
                    if (attempts > 24) { // 2 minutes
                        console.log("❌ Timeout: Did not receive successful payment within 2 minutes.");
                        clearInterval(pollInterval);
                    }
                }
            }, 5000);
        } else {
            console.error("STK Push failed:", checkoutRes);
        }
    } catch (e) {
        console.error("Script error:", e);
    }
}

runTest();
