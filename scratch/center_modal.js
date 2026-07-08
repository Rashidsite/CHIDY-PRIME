const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../views/index.html');
let content = fs.readFileSync(indexPath, 'utf-8');

// 1. Replace the description paragraph with truncated version and Read More button
const oldDesc = `<div style="background:rgba(255,255,255,0.03); border-radius:12px; padding:15px; border:1px solid rgba(255,255,255,0.05); margin-bottom:20px;">
                        <p style="color:#a0a0b0; font-size:0.85rem; line-height:1.6; margin:0;">\${game.description || 'Gundua ulimwengu mpya wa michezo na Chidy Prime. Download sasa na ufurahie uzoefu bora wa gaming.'}</p>
                    </div>`;

const newDesc = `<div style="background:rgba(255,255,255,0.03); border-radius:12px; padding:12px; border:1px solid rgba(255,255,255,0.05); margin-bottom:15px;">
                        <p id="gameDescText" style="color:#a0a0b0; font-size:0.75rem; line-height:1.6; margin:0; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">\${game.description || 'Gundua ulimwengu mpya wa michezo na Chidy Prime. Download sasa na ufurahie uzoefu bora wa gaming.'}</p>
                        <div style="text-align:right; margin-top:5px;">
                            <span id="readMoreBtn" onclick="toggleReadMore()" style="color:var(--primary); font-size:0.7rem; font-weight:700; cursor:pointer; font-family:'Orbitron';">Soma Zaidi <i class="fas fa-chevron-down"></i></span>
                        </div>
                    </div>`;

if (content.includes(oldDesc)) {
    content = content.replace(oldDesc, newDesc);
}

// 2. Add toggleReadMore function
const toggleScript = `
    <!-- TOGGLE READ MORE SCRIPT -->
    <script>
        function toggleReadMore() {
            const desc = document.getElementById('gameDescText');
            const btn = document.getElementById('readMoreBtn');
            if (desc.style.webkitLineClamp === '3' || desc.style.webkitLineClamp === 3) {
                desc.style.webkitLineClamp = 'unset';
                btn.innerHTML = 'Ficha <i class="fas fa-chevron-up"></i>';
            } else {
                desc.style.webkitLineClamp = '3';
                btn.innerHTML = 'Soma Zaidi <i class="fas fa-chevron-down"></i>';
            }
        }
    </script>
</body>`;

if (!content.includes('TOGGLE READ MORE SCRIPT')) {
    content = content.replace('</body>', toggleScript);
}

// 3. Add CSS to Center and Narrow the Modal
const centerModalCSS = `
    <!-- CENTER AND NARROW MODAL -->
    <style>
        @media (max-width: 768px) {
            .detail-overlay {
                align-items: center !important; /* Float in middle */
                padding: 20px !important; /* Spacing from edges */
            }
            .detail-card {
                border-radius: 20px !important;
                width: 100% !important;
                max-width: 380px !important; /* Narrower */
                margin: auto !important;
                box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 30px rgba(0, 242, 255, 0.1) !important;
                animation: none !important;
                transform: scale(0.95);
                animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
            }
            .detail-image {
                border-radius: 20px 20px 0 0 !important;
            }
        }
        @keyframes popIn {
            to { transform: scale(1); opacity: 1; }
        }
    </style>
</head>`;

if (!content.includes('CENTER AND NARROW MODAL')) {
    content = content.replace('</head>', centerModalCSS);
}

fs.writeFileSync(indexPath, content, 'utf-8');
console.log('Successfully centered modal, made it narrower, and added Read More truncation.');
