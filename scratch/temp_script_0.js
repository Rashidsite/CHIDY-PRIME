
        // --- EXTREME ACTIVE EFFECTS ---
        function initGamingBg() {
            const bg = document.getElementById('quantumBg');
            
            // Particles
            for (let i = 0; i < 40; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.left = `${Math.random() * 100}%`;
                p.style.bottom = '-5%';
                p.style.width = p.style.height = `${Math.random() * 4 + 2}px`;
                p.style.animationDelay = `${Math.random() * 5}s`;
                p.style.background = i % 2 === 0 ? '#00f2ff' : '#bc13fe';
                bg.appendChild(p);
            }

            // Floating Icons
            const icons = ['fa-gamepad', 'fa-ghost', 'fa-skull', 'fa-dragon', 'fa-hat-wizard', 'fa-rocket'];
            for (let i = 0; i < 15; i++) {
                const icon = document.createElement('i');
                icon.className = `fas ${icons[i % icons.length]} floating-icon`;
                icon.style.left = `${Math.random() * 100}%`;
                icon.style.animationDelay = `${Math.random() * 15}s`;
                icon.style.fontSize = `${Math.random() * 1.5 + 1}rem`;
                bg.appendChild(icon);
            }
        }
        initGamingBg();

        // 3D Tilt Effect
        const overlay = document.getElementById('vaultOverlay');
        const card = document.getElementById('loginCard');
        
        overlay.addEventListener('mousemove', (e) => {
            const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
            card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
        });

        overlay.addEventListener('mouseenter', () => {
            card.style.transition = 'none';
        });

        overlay.addEventListener('mouseleave', () => {
            card.style.transition = 'all 0.5s ease';
            card.style.transform = `rotateY(0deg) rotateX(0deg)`;
        });

        let enteredPin = "";

        function addPin(val) {
            if (enteredPin.length < 4) {
                enteredPin += val;
                updatePinDisplay();
                if (enteredPin.length === 4) {
                    setTimeout(verifyPin, 300);
                }
            }
        }

        function updatePinDisplay() {
            const slots = document.querySelectorAll('.pin-slot');
            const powerBar = document.getElementById('powerBar');
            
            slots.forEach((slot, i) => {
                if (i < enteredPin.length) {
                    slot.classList.add('filled');
                    slot.innerText = '●';
                    slot.style.borderColor = '#00f2ff';
                } else {
                    slot.classList.remove('filled');
                    slot.innerText = '';
                    slot.style.borderColor = 'rgba(0, 242, 255, 0.2)';
                }
            });

            powerBar.style.width = `${(enteredPin.length / 4) * 100}%`;
        }

        function clearPin() {
            enteredPin = "";
            updatePinDisplay();
        }

        function verifyPin() {
            const status = document.getElementById('pinStatusText');
            status.innerText = "AUTHENTICATING...";
            status.style.color = "#bc13fe";
            
            fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: enteredPin })
            })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    localStorage.setItem('adminToken', result.token);
                    status.innerText = "ACCESS GRANTED - WELCOME BOSS";
                    status.style.color = "#00d25b";
                    
                    document.getElementById('powerBar').style.background = "#00d25b";
                    document.getElementById('powerBar').style.boxShadow = "0 0 20px #00d25b";
                    
                    document.querySelectorAll('.pin-slot').forEach(s => {
                        s.style.borderColor = "#00d25b";
                        s.style.color = "#00d25b";
                    });

                    setTimeout(() => {
                        unlockVault();
                        if (typeof refreshAllData === 'function') refreshAllData();
                    }, 600);
                } else {
                    handleWrongPin();
                }
            })
            .catch(err => {
                console.error("Login Error:", err);
                handleWrongPin();
            });
        }

        function handleWrongPin() {
            const container = document.querySelector('.security-container');
            container.style.animation = 'shake 0.4s ease-in-out';
            const status = document.getElementById('pinStatusText');
            status.innerText = "ACCESS DENIED - SYSTEM LOCKED";
            status.style.color = "#ff3366";
            
            document.getElementById('powerBar').style.background = "#ff3366";
            
            setTimeout(() => {
                enteredPin = "";
                updatePinDisplay();
                container.style.animation = 'none';
                status.innerText = "AWAITING SECONDARY AUTHORIZATION";
                status.style.color = "#6c7293";
                document.getElementById('powerBar').style.background = "linear-gradient(90deg, #00f2ff, #bc13fe)";
            }, 1200);
        }

        function unlockVault() {
            const overlay = document.getElementById('vaultOverlay');
            overlay.style.transition = '1s cubic-bezier(0.16, 1, 0.3, 1)';
            overlay.style.filter = 'brightness(2) blur(20px)';
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(1.5)';
            
            setTimeout(() => {
                overlay.style.display = "none";
                document.body.classList.remove('scanning');
            }, 1000);
        }

        window.addEventListener('load', () => {
            // PIN Login is default
        });
    