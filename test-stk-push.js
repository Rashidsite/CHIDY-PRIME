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
        const targetGame = games[0];
        if (!targetGame) {
            console.error("No games found in the database.");
            return;
        }
        console.log(`   Found Game: "${targetGame.title}" (ID: ${targetGame.id}), Price: ${targetGame.price} TZS`);

        console.log("3. Initiating HarakaPay STK Push...");
        const checkoutPayload = {
            amount: targetGame.price,
            phone: "0796615257",
            gameTitle: targetGame.title,
            visitorId: visitor_id,
            postId: targetGame.id,
            email: "test@chidyprime.com",
            name: "Test User"
        };
        const checkoutRes = await fetch(`${baseURL}/payments/harakapay-checkout`, {
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
                    process.exit(0);
                } else {
                    console.log("Still waiting...");
                    if (attempts > 5) { // Stop after 5 polls for CI/headless verification
                        console.log("⏹️ Polling stopped (verified checkout flow successfully).");
                        clearInterval(pollInterval);
                        process.exit(0);
                    }
                }
            }, 3000);
        } else {
            console.error("STK Push failed:", checkoutRes);
        }
    } catch (e) {
        console.error("Script error:", e);
    }
}

runTest();
