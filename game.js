// Game Variables
let canvas, ctx;
let gameStarted = false;
let gamePaused = false;
let gameOver = false;
let score = 0;
let highScore = 0;
let timer = 60;
let interval;
let gameMode = ""; // "math" or "letter"
let currentLevel = 1;
let currentQuestion = {};
let answers = [];
let consecutiveCorrect = 0; // Số câu trả lời đúng liên tiếp
let stars = 0; // Số sao đã nhận được
let fuelLevel = 100; // Mức nhiên liệu (0-100)
let fuelInterval; // Interval cho việc giảm nhiên liệu
let obstacles = []; // Chướng ngại vật
let bonusItems = []; // Các vật phẩm bonus (nhiên liệu, sao)
let unlocked = { plane2: false, plane3: false }; // Trạng thái mở khóa máy bay

// Cài đặt cho từng loại máy bay
const planeTypes = {
    1: {
        name: "Máy bay thường",
        width: 80,
        height: 40,
        speed: 5,
        fuelConsumption: 1 // Mức tiêu thụ nhiên liệu (mỗi 2 giây)
    },
    2: {
        name: "Phi thuyền",
        width: 70,
        height: 50,
        speed: 6,
        fuelConsumption: 0.8
    },
    3: {
        name: "Siêu máy bay",
        width: 90,
        height: 45,
        speed: 7,
        fuelConsumption: 0.6
    }
};

// Khai báo máy bay
let plane = {
    type: 1,
    x: 100,
    y: 300,
    width: 80,
    height: 40,
    speed: 5,
    moving: 0, // -1 up, 1 down, 0 not moving
    glowing: false,
    glowTime: 0,
    boosting: false,
    boostTime: 0,
    shaking: false,
    shakeTime: 0,
    shakeMagnitude: 0
};

// Cài đặt cho từng cấp độ
const levelSettings = {
    1: {
        name: "Bầu trời xanh",
        skyColor: { start: "#87CEEB", end: "#1E90FF" },
        obstacles: false,
        answerSpeed: { min: 2, max: 3 },
        fuelDrain: 0.5 // Tốc độ giảm nhiên liệu
    },
    2: {
        name: "Bầu trời hoàng hôn",
        skyColor: { start: "#FF9E7A", end: "#FF5E62" },
        obstacles: true,
        obstacleFrequency: 0.005, // Tần suất xuất hiện chướng ngại
        answerSpeed: { min: 3, max: 4 },
        fuelDrain: 0.7
    },
    3: {
        name: "Không gian",
        skyColor: { start: "#0F2027", end: "#203A43" },
        obstacles: true,
        obstacleFrequency: 0.01,
        answerSpeed: { min: 4, max: 5.5 },
        fuelDrain: 1
    }
};

// Sound Effects
let soundEnabled = true;
const sounds = {
    correct: new Audio("https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3"),
    wrong: new Audio("https://assets.mixkit.co/active_storage/sfx/2058/2058-preview.mp3"),
    background: new Audio("https://assets.mixkit.co/active_storage/sfx/2097/2097-preview.mp3"),
    levelUp: new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3"),
    gameOver: new Audio("https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3"),
    fuelLow: new Audio("https://assets.mixkit.co/active_storage/sfx/2065/2065-preview.mp3"),
    collectFuel: new Audio("https://assets.mixkit.co/active_storage/sfx/2061/2061-preview.mp3")
};

// Thiết lập âm lượng
Object.values(sounds).forEach(sound => {
    sound.volume = 0.5;
});
sounds.background.loop = true;
sounds.fuelLow.loop = true;

// Background Elements
let clouds = [];
let starsBg = []; // Renamed to avoid conflict with stars variable
for (let i = 0; i < 5; i++) {
    clouds.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        width: 80 + Math.random() * 120,
        height: 50 + Math.random() * 30,
        speed: 0.5 + Math.random() * 1
    });
}

// Tạo sao cho cấp độ 3
for (let i = 0; i < 50; i++) {
    starsBg.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: 1 + Math.random() * 2,
        opacity: 0.2 + Math.random() * 0.8,
        twinkle: Math.random() > 0.7
    });
}

// Phát hiện thiết bị di động
function isMobileDevice() {
    return (window.innerWidth <= 800) || 
           ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0);
}

// Điều chỉnh giao diện dựa trên thiết bị
function adjustForDevice() {
    if (isMobileDevice()) {
        document.getElementById("mobile-controls").style.display = "block";
        // Tối ưu kích thước canvas cho màn hình nhỏ
        if (window.innerWidth < canvas.width) {
            const ratio = canvas.height / canvas.width;
            canvas.width = window.innerWidth - 20; // Trừ lề
            canvas.height = canvas.width * ratio;
        }
    } else {
        document.getElementById("mobile-controls").style.display = "none";
    }
}

// Lưu điểm cao vào LocalStorage
function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('planeGameHighScore', highScore);
    }
}

// Tải điểm cao từ LocalStorage
function loadHighScore() {
    const savedScore = localStorage.getItem('planeGameHighScore');
    if (savedScore) {
        highScore = parseInt(savedScore);
        document.getElementById("highscore-value").innerText = highScore;
    }
}

// Lưu trạng thái mở khóa máy bay
function saveUnlockedPlanes() {
    localStorage.setItem('planeGameUnlocked', JSON.stringify(unlocked));
}

// Tải trạng thái mở khóa máy bay
function loadUnlockedPlanes() {
    const savedUnlocked = localStorage.getItem('planeGameUnlocked');
    if (savedUnlocked) {
        unlocked = JSON.parse(savedUnlocked);
        updatePlaneSelection();
    }
}

// Cập nhật hiển thị lựa chọn máy bay dựa trên trạng thái mở khóa
function updatePlaneSelection() {
    const plane2Element = document.querySelector('.plane-option[data-plane="2"]');
    const plane3Element = document.querySelector('.plane-option[data-plane="3"]');
    
    if (unlocked.plane2) {
        plane2Element.querySelector('.locked').style.display = 'none';
    }
    
    if (unlocked.plane3) {
        plane3Element.querySelector('.locked').style.display = 'none';
    }
}

// Kiểm tra và mở khóa máy bay dựa trên điểm số
function checkUnlockPlanes() {
    if (highScore >= 100 && !unlocked.plane2) {
        unlocked.plane2 = true;
        saveUnlockedPlanes();
        updatePlaneSelection();
        
        // Hiển thị thông báo mở khóa
        alert('Chúc mừng! Bạn đã mở khóa "Phi thuyền"!');
    }
    
    if (highScore >= 200 && !unlocked.plane3) {
        unlocked.plane3 = true;
        saveUnlockedPlanes();
        updatePlaneSelection();
        
        // Hiển thị thông báo mở khóa
        alert('Chúc mừng! Bạn đã mở khóa "Siêu máy bay"!');
    }
}

// Chọn máy bay để chơi
function selectPlane(planeType) {
    if (planeType === 1 || (planeType === 2 && unlocked.plane2) || (planeType === 3 && unlocked.plane3)) {
        // Bỏ chọn tất cả
        document.querySelectorAll('.plane-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Chọn máy bay mới
        document.querySelector(`.plane-option[data-plane="${planeType}"]`).classList.add('selected');
        
        // Cập nhật loại máy bay được chọn
        plane.type = planeType;
        plane.width = planeTypes[planeType].width;
        plane.height = planeTypes[planeType].height;
        plane.speed = planeTypes[planeType].speed;
    }
}

// Initialize Game
window.onload = function() {
    // Get canvas and set dimensions
    canvas = document.getElementById("gameCanvas");
    canvas.width = 800;
    canvas.height = 600;
    ctx = canvas.getContext("2d");
    
    // Vẽ máy bay trong menu lựa chọn
    drawPlaneInSelector(1, document.getElementById("plane1"));
    drawPlaneInSelector(2, document.getElementById("plane2"));
    drawPlaneInSelector(3, document.getElementById("plane3"));
    
    // Tải điểm cao và trạng thái mở khóa máy bay
    loadHighScore();
    loadUnlockedPlanes();
    
    // Event listeners cho lựa chọn máy bay
    document.querySelectorAll('.plane-option').forEach(option => {
        option.addEventListener('click', function() {
            const planeType = parseInt(this.getAttribute('data-plane'));
            selectPlane(planeType);
        });
    });
    
    // Event listeners for game start
    document.getElementById("math-mode").addEventListener("click", function() {
        startGame("math");
    });
    
    document.getElementById("letter-mode").addEventListener("click", function() {
        startGame("letter");
    });
    
    // Game control event listeners
    document.getElementById("play-again").addEventListener("click", restartGame);
    document.getElementById("change-mode").addEventListener("click", showStartScreen);
    document.getElementById("pause-btn").addEventListener("click", pauseGame);
    document.getElementById("restart-btn").addEventListener("click", restartGame);
    document.getElementById("resume-btn").addEventListener("click", resumeGame);
    document.getElementById("exit-to-menu").addEventListener("click", showStartScreen);
    document.getElementById("continue-btn").addEventListener("click", continueAfterLevelUp);
    document.getElementById("sound-btn").addEventListener("click", toggleSound);
    
    // Keyboard controls
    window.addEventListener("keydown", function(e) {
        if (gameStarted && !gameOver && !gamePaused) {
            if (e.key === "ArrowUp") {
                plane.moving = -1;
            } else if (e.key === "ArrowDown") {
                plane.moving = 1;
            } else if (e.key === "Escape" || e.key === "p") {
                pauseGame();
            } else if (e.key === "m") {
                toggleSound();
            }
        }
    });
    
    window.addEventListener("keyup", function(e) {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            plane.moving = 0;
        }
    });
    
    // Mobile controls - Touch
    const touchArea = document.getElementById("touch-area");
    
    touchArea.addEventListener("touchstart", function(e) {
        e.preventDefault();
        handleTouch(e);
    });
    
    touchArea.addEventListener("touchmove", function(e) {
        e.preventDefault();
        handleTouch(e);
    });
    
    touchArea.addEventListener("touchend", function(e) {
        e.preventDefault();
        plane.moving = 0;
    });
    
    function handleTouch(e) {
        if (gameStarted && !gameOver && !gamePaused) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const touchY = touch.clientY - rect.top;
            
            if (touchY < plane.y - 20) {
                plane.moving = -1;
            } else if (touchY > plane.y + plane.height + 20) {
                plane.moving = 1;
            } else {
                plane.moving = 0;
            }
        }
    }
    
    // Initial draw
    drawBackground();
    drawStartScreen();
    
    // Điều chỉnh giao diện cho thiết bị
    adjustForDevice();
    
    // Lắng nghe sự kiện thay đổi kích thước màn hình
    window.addEventListener("resize", adjustForDevice);
};

// Vẽ máy bay trong menu lựa chọn
function drawPlaneInSelector(planeType, canvas) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    
    // Xóa canvas
    ctx.clearRect(0, 0, width, height);
    
    // Vẽ máy bay tương ứng
    switch(planeType) {
        case 1: // Máy bay thường
            drawNormalPlane(ctx, width/2, height/2, 0.8);
            break;
        case 2: // Phi thuyền
            drawSpaceship(ctx, width/2, height/2, 0.8);
            break;
        case 3: // Siêu máy bay
            drawSuperPlane(ctx, width/2, height/2, 0.8);
            break;
    }
}

// Bật/tắt âm thanh
function toggleSound() {
    soundEnabled = !soundEnabled;
    
    // Cập nhật biểu tượng
    const soundBtn = document.getElementById("sound-btn");
    if (soundEnabled) {
        soundBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        if (gameStarted && !gamePaused && !gameOver) {
            sounds.background.play();
        }
    } else {
        soundBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        Object.values(sounds).forEach(sound => sound.pause());
    }
}

// Game Start Function
function startGame(mode) {
    gameMode = mode;
    gameStarted = true;
    gamePaused = false;
    gameOver = false;
    score = 0;
    timer = 60;
    currentLevel = 1;
    consecutiveCorrect = 0;
    stars = 0;
    fuelLevel = 100;
    obstacles = [];
    bonusItems = [];
    
    // Cập nhật hiển thị sao
    updateStarsDisplay();
    
    // Reset trạng thái máy bay
    plane.glowing = false;
    plane.boosting = false;
    plane.shaking = false;
    
    // Lấy thông số máy bay dựa trên loại được chọn
    const planeInfo = planeTypes[plane.type];
    plane.width = planeInfo.width;
    plane.height = planeInfo.height;
    plane.speed = planeInfo.speed;
    plane.x = 100;
    plane.y = 300;
    
    // Hide all screens
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("game-over-screen").style.display = "none";
    document.getElementById("pause-screen").style.display = "none";
    document.getElementById("level-up-screen").style.display = "none";
    
    // Update UI
    document.getElementById("score").querySelector("span").innerText = score;
    document.getElementById("timer").querySelector("span").innerText = timer + "s";
    document.getElementById("level-badge").querySelector("span").innerText = currentLevel;
    updateFuelBar();
    
    // Start background music
    if (soundEnabled) {
        sounds.background.currentTime = 0;
        sounds.background.play().catch(e => console.log("Autoplay prevented:", e));
    }
    
    // Generate first question
    generateQuestion();
    
    // Start game loop
    requestAnimationFrame(gameLoop);
    
    // Start timer
    interval = setInterval(function() {
        if (!gamePaused) {
            timer--;
            document.getElementById("timer").querySelector("span").innerText = timer + "s";
            
            if (timer <= 0) {
                endGame();
            }
        }
    }, 1000);
    
    // Start fuel consumption
    fuelInterval = setInterval(function() {
        if (gameStarted && !gamePaused && !gameOver) {
            // Giảm nhiên liệu dựa trên cấp độ và loại máy bay
            fuelLevel -= levelSettings[currentLevel].fuelDrain * planeTypes[plane.type].fuelConsumption;
            
            // Giới hạn 0-100
            fuelLevel = Math.max(0, Math.min(100, fuelLevel));
            
            // Cập nhật thanh nhiên liệu
            updateFuelBar();
            
            // Kiểm tra nhiên liệu cạn
            if (fuelLevel <= 0) {
                endGame();
            } else if (fuelLevel <= 20) {
                // Cảnh báo nhiên liệu thấp
                if (soundEnabled && sounds.fuelLow.paused) {
                    sounds.fuelLow.play().catch(e => console.log("Play prevented:", e));
                }
            } else {
                // Ngừng âm thanh cảnh báo nếu đã đủ nhiên liệu
                sounds.fuelLow.pause();
                sounds.fuelLow.currentTime = 0;
            }
        }
    }, 1000);
}

// Cập nhật thanh nhiên liệu
function updateFuelBar() {
    const fuelBar = document.getElementById("fuel-level");
    fuelBar.style.width = fuelLevel + "%";
    
    // Thay đổi màu dựa trên mức nhiên liệu
    if (fuelLevel <= 20) {
        fuelBar.style.background = "red";
    } else if (fuelLevel <= 50) {
        fuelBar.style.background = "yellow";
    } else {
        fuelBar.style.background = "linear-gradient(90deg, #ff0000, #fff200, #00ff00)";
    }
}

// Cập nhật hiển thị sao
function updateStarsDisplay() {
    const star1 = document.getElementById("star1");
    const star2 = document.getElementById("star2");
    const star3 = document.getElementById("star3");
    
    // Reset trạng thái sao
    star1.innerHTML = '<i class="far fa-star"></i>';
    star2.innerHTML = '<i class="far fa-star"></i>';
    star3.innerHTML = '<i class="far fa-star"></i>';
    
    // Hiển thị số sao đã nhận
    if (stars >= 1) star1.innerHTML = '<i class="fas fa-star"></i>';
    if (stars >= 2) star2.innerHTML = '<i class="fas fa-star"></i>';
    if (stars >= 3) star3.innerHTML = '<i class="fas fa-star"></i>';
}

// Pause Game
function pauseGame() {
    if (gameStarted && !gameOver) {
        gamePaused = true;
        document.getElementById("pause-screen").style.display = "flex";
        
        // Tạm dừng âm thanh
        if (soundEnabled) {
            sounds.background.pause();
            sounds.fuelLow.pause();
        }
    }
}

// Resume Game
function resumeGame() {
    if (gamePaused) {
        gamePaused = false;
        document.getElementById("pause-screen").style.display = "none";
        
        // Tiếp tục âm thanh
        if (soundEnabled) {
            sounds.background.play().catch(e => console.log("Autoplay prevented:", e));
            if (fuelLevel <= 20) {
                sounds.fuelLow.play().catch(e => console.log("Play prevented:", e));
            }
        }
        
        requestAnimationFrame(gameLoop);
    }
}

// Tiếp tục chơi sau khi lên cấp
function continueAfterLevelUp() {
    document.getElementById("level-up-screen").style.display = "none";
    
    // Tạo câu hỏi mới cho cấp độ mới
    generateQuestion();
    
    // Tiếp tục game
    gamePaused = false;
    if (soundEnabled) {
        sounds.background.play().catch(e => console.log("Autoplay prevented:", e));
    }
    
    requestAnimationFrame(gameLoop);
}

// Main Game Loop
function gameLoop() {
    if (!gameStarted || gameOver || gamePaused) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background based on level
    drawBackground();
    
    // Move and draw obstacles
    moveAndDrawObstacles();
    
    // Move and draw bonus items
    moveAndDrawBonusItems();
    
    // Move and draw plane
    movePlane();
    drawPlane();
    
    // Draw answers
    moveAndDrawAnswers();
    
    // Check collisions
    checkCollisions();
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Background Drawing
function drawBackground() {
    // Get current level settings
    const level = levelSettings[currentLevel];
    
    // Draw sky based on level
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, level.skyColor.start);
    gradient.addColorStop(1, level.skyColor.end);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Level 3: Draw stars in space
    if (currentLevel === 3) {
        drawStars();
    } else {
        // Draw clouds for levels 1 & 2
        drawClouds();
    }
    
    // Always draw sun/moon based on level
    if (currentLevel === 1) {
        drawSun();
    } else if (currentLevel === 2) {
        drawSunset();
    } else {
        drawMoon();
    }
}

// Draw clouds for sky levels
function drawClouds() {
    ctx.fillStyle = "#FFF";
    for (let cloud of clouds) {
        // Move clouds
        cloud.x -= cloud.speed;
        if (cloud.x + cloud.width < 0) {
            cloud.x = canvas.width;
            cloud.y = Math.random() * 600;
        }
        
        // Draw cloud
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.height/2, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.3, cloud.y - cloud.height * 0.1, cloud.height/2.5, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.6, cloud.y, cloud.height/2.3, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.9, cloud.y - cloud.height * 0.15, cloud.height/2.7, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw stars for space level
function drawStars() {
    for (let star of starsBg) {
        // Make stars twinkle
        if (star.twinkle) {
            star.opacity = 0.2 + 0.8 * Math.abs(Math.sin(Date.now() / 1000 + star.x));
        }
        
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw sun for level 1
function drawSun() {
    // Draw sun
    ctx.fillStyle = "#FFFF00";
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 100, 40, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw sun rays
    ctx.strokeStyle = "#FFFF00";
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(
            canvas.width - 100 + Math.cos(angle) * 45,
            100 + Math.sin(angle) * 45
        );
        ctx.lineTo(
            canvas.width - 100 + Math.cos(angle) * 60,
            100 + Math.sin(angle) * 60
        );
        ctx.stroke();
    }
}

// Draw sunset for level 2
function drawSunset() {
    // Draw setting sun
    const gradient = ctx.createRadialGradient(
        canvas.width - 100, canvas.height - 50, 10,
        canvas.width - 100, canvas.height - 50, 60
    );
    gradient.addColorStop(0, "#FF5E5E");
    gradient.addColorStop(1, "#FF9E7A");
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(canvas.width - 100, canvas.height - 30, 50, Math.PI, 0, false);
    ctx.fill();
}

// Draw moon for level 3
function drawMoon() {
    // Draw moon with craters
    ctx.fillStyle = "#E6E6E6";
    ctx.beginPath();
    ctx.arc(100, 100, 35, 0, Math.PI * 2);
    ctx.fill();
    
    // Moon shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.beginPath();
    ctx.arc(85, 85, 35, 0, Math.PI * 2);
    ctx.fill();
    
    // Moon craters
    ctx.fillStyle = "#C0C0C0";
    ctx.beginPath();
    ctx.arc(85, 105, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(110, 90, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(120, 115, 5, 0, Math.PI * 2);
    ctx.fill();
}

// Vẽ máy bay dựa trên loại đã chọn
function drawPlane() {
    ctx.save();
    
    // Hiệu ứng rung khi va chạm vật cản
    if (plane.shaking) {
        ctx.translate(
            Math.random() * plane.shakeMagnitude * 2 - plane.shakeMagnitude,
            Math.random() * plane.shakeMagnitude * 2 - plane.shakeMagnitude
        );
        
        plane.shakeTime--;
        if (plane.shakeTime <= 0) {
            plane.shaking = false;
        }
    }
    
    // Hiệu ứng sáng khi trả lời đúng
    if (plane.glowing) {
        ctx.shadowColor = "yellow";
        ctx.shadowBlur = 20;
        
        plane.glowTime--;
        if (plane.glowTime <= 0) {
            plane.glowing = false;
        }
    }
    
    // Hiệu ứng tăng tốc
    if (plane.boosting) {
        // Draw boost flames
        const flameLength = 30 + Math.random() * 20;
        
        ctx.fillStyle = "#FF4500"; // Orange-Red
        ctx.beginPath();
        ctx.moveTo(plane.x - flameLength, plane.y + plane.height / 2);
        ctx.lineTo(plane.x, plane.y + plane.height * 0.7);
        ctx.lineTo(plane.x, plane.y + plane.height * 0.3);
        ctx.fill();
        
        ctx.fillStyle = "#FFD700"; // Gold
        ctx.beginPath();
        ctx.moveTo(plane.x - flameLength * 0.7, plane.y + plane.height / 2);
        ctx.lineTo(plane.x, plane.y + plane.height * 0.6);
        ctx.lineTo(plane.x, plane.y + plane.height * 0.4);
        ctx.fill();
        
        plane.boostTime--;
        if (plane.boostTime <= 0) {
            plane.boosting = false;
        }
    }
    
    // Vẽ máy bay tương ứng với loại đã chọn
    switch(plane.type) {
        case 1:
            drawNormalPlane(ctx, plane.x, plane.y, 1);
            break;
        case 2:
            drawSpaceship(ctx, plane.x, plane.y, 1);
            break;
        case 3:
            drawSuperPlane(ctx, plane.x, plane.y, 1);
            break;
    }
    
    ctx.restore();
}

// Vẽ máy bay thường (loại 1)
function drawNormalPlane(ctx, x, y, scale = 1) {
    const width = planeTypes[1].width * scale;
    const height = planeTypes[1].height * scale;
    
    // Main body - more cartoonish
    ctx.fillStyle = "#4169E1"; // Royal Blue
    ctx.beginPath();
    ctx.moveTo(x, y + height/2);
    ctx.quadraticCurveTo(
        x + width * 0.4, y - height * 0.2,
        x + width * 0.8, y + height * 0.2
    );
    ctx.quadraticCurveTo(
        x + width * 0.6, y + height,
        x, y + height/2
    );
    ctx.fill();
    
    // Cockpit window
    ctx.fillStyle = "#87CEFA"; // Light Sky Blue
    ctx.beginPath();
    ctx.arc(x + width * 0.6, y + height * 0.3, height * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner window detail
    ctx.fillStyle = "#ADD8E6"; // Light Blue
    ctx.beginPath();
    ctx.arc(x + width * 0.6 - 5, y + height * 0.3 - 5, height * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Wings
    ctx.fillStyle = "#6495ED"; // Cornflower Blue
    // Top wing
    ctx.beginPath();
    ctx.moveTo(x + width * 0.4, y + height * 0.3);
    ctx.lineTo(x + width * 0.3, y - height * 0.2);
    ctx.lineTo(x + width * 0.5, y + height * 0.1);
    ctx.fill();
    // Bottom wing
    ctx.beginPath();
    ctx.moveTo(x + width * 0.4, y + height * 0.7);
    ctx.lineTo(x + width * 0.3, y + height * 1.2);
    ctx.lineTo(x + width * 0.5, y + height * 0.9);
    ctx.fill();
    
    // Tail
    ctx.fillStyle = "#FF6347"; // Tomato
    ctx.beginPath();
    ctx.moveTo(x + width * 0.1, y + height * 0.4);
    ctx.lineTo(x - width * 0.1, y + height * 0.1);
    ctx.lineTo(x + width * 0.15, y + height * 0.45);
    ctx.fill();
    
    // Propeller center
    ctx.fillStyle = "#A0522D"; // Sienna
    ctx.beginPath();
    ctx.arc(x + width * 0.9, y + height * 0.5, height * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Propeller animation
    const time = new Date().getTime() / 30; // Faster rotation
    ctx.fillStyle = "#8B4513"; // Saddle Brown
    for (let i = 0; i < 2; i++) {
        const angle = time + (i * Math.PI);
        ctx.save();
        ctx.translate(x + width * 0.9, y + height * 0.5);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, height * 0.5, height * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    // Outline for better visibility
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + height/2);
    ctx.quadraticCurveTo(
        x + width * 0.4, y - height * 0.2,
        x + width * 0.8, y + height * 0.2
    );
    ctx.quadraticCurveTo(
        x + width * 0.6, y + height,
        x, y + height/2
    );
    ctx.stroke();
}

// Vẽ phi thuyền (loại 2)
function drawSpaceship(ctx, x, y, scale = 1) {
    const width = planeTypes[2].width * scale;
    const height = planeTypes[2].height * scale;
    
    // Main body
    ctx.fillStyle = "#C0C0C0"; // Silver
    ctx.beginPath();
    ctx.ellipse(x + width * 0.4, y + height * 0.5, width * 0.6, height * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Cockpit dome
    ctx.fillStyle = "#5F9EA0"; // Cadet Blue
    ctx.beginPath();
    ctx.arc(x + width * 0.7, y + height * 0.4, height * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Dome highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(x + width * 0.7 - 5, y + height * 0.4 - 5, height * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Bottom fins
    ctx.fillStyle = "#B22222"; // FireBrick
    ctx.beginPath();
    ctx.moveTo(x + width * 0.2, y + height * 0.7);
    ctx.lineTo(x - width * 0.1, y + height * 1.0);
    ctx.lineTo(x + width * 0.3, y + height * 0.8);
    ctx.fill();
    
    // Top fin
    ctx.beginPath();
    ctx.moveTo(x + width * 0.4, y + height * 0.3);
    ctx.lineTo(x + width * 0.3, y - height * 0.2);
    ctx.lineTo(x + width * 0.5, y + height * 0.2);
    ctx.fill();
    
    // Engine nozzles
    ctx.fillStyle = "#444444";
    ctx.beginPath();
    ctx.rect(x - width * 0.05, y + height * 0.4, width * 0.1, height * 0.2);
    ctx.fill();
    
    // Lights (blinking)
    const blinkRate = Date.now() % 1000 < 500;
    ctx.fillStyle = blinkRate ? "#FF0000" : "#00FF00";
    ctx.beginPath();
    ctx.arc(x + width * 0.2, y + height * 0.2, height * 0.05, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = !blinkRate ? "#FF0000" : "#00FF00";
    ctx.beginPath();
    ctx.arc(x + width * 0.2, y + height * 0.8, height * 0.05, 0, Math.PI * 2);
    ctx.fill();
    
    // Outline
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + width * 0.4, y + height * 0.5, width * 0.6, height * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
}

// Vẽ siêu máy bay (loại 3)
function drawSuperPlane(ctx, x, y, scale = 1) {
    const width = planeTypes[3].width * scale;
    const height = planeTypes[3].height * scale;
    
    // Main body - sleek jet fighter
    ctx.fillStyle = "#2F4F4F"; // Dark Slate Gray
    ctx.beginPath();
    ctx.moveTo(x, y + height/2);
    ctx.lineTo(x + width * 0.8, y + height * 0.3);
    ctx.lineTo(x + width, y + height * 0.4);
    ctx.lineTo(x + width * 0.8, y + height * 0.7);
    ctx.lineTo(x, y + height/2);
    ctx.fill();
    
    // Canopy
    ctx.fillStyle = "#4682B4"; // Steel Blue
    ctx.beginPath();
    ctx.moveTo(x + width * 0.5, y + height * 0.3);
    ctx.lineTo(x + width * 0.7, y + height * 0.2);
    ctx.lineTo(x + width * 0.8, y + height * 0.3);
    ctx.lineTo(x + width * 0.7, y + height * 0.4);
    ctx.lineTo(x + width * 0.5, y + height * 0.3);
    ctx.fill();
    
    // Canopy highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.moveTo(x + width * 0.55, y + height * 0.28);
    ctx.lineTo(x + width * 0.65, y + height * 0.23);
    ctx.lineTo(x + width * 0.7, y + height * 0.28);
    ctx.fill();
    
    // Wings - delta shape
    ctx.fillStyle = "#708090"; // Slate Gray
    
    // Main wings
    ctx.beginPath();
    ctx.moveTo(x + width * 0.3, y + height * 0.4);
    ctx.lineTo(x, y - height * 0.2);
    ctx.lineTo(x + width * 0.5, y + height * 0.35);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + width * 0.3, y + height * 0.6);
    ctx.lineTo(x, y + height * 1.2);
    ctx.lineTo(x + width * 0.5, y + height * 0.65);
    ctx.fill();
    
    // Vertical stabilizer
    ctx.beginPath();
    ctx.moveTo(x + width * 0.7, y + height * 0.5);
    ctx.lineTo(x + width * 0.6, y + height * 0.2);
    ctx.lineTo(x + width * 0.8, y + height * 0.4);
    ctx.fill();
    
    // Engine nozzles
    ctx.fillStyle = "#B8860B"; // Dark Golden Rod
    ctx.beginPath();
    ctx.ellipse(x + width * 0.1, y + height * 0.4, width * 0.1, height * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(x + width * 0.1, y + height * 0.6, width * 0.1, height * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Afterburner effect - random flame
    if (Math.random() > 0.5) {
        const gradientL = ctx.createLinearGradient(
            x - width * 0.2, y + height * 0.4,
            x + width * 0.1, y + height * 0.4
        );
        gradientL.addColorStop(0, "rgba(255, 165, 0, 0)");
        gradientL.addColorStop(1, "rgba(255, 165, 0, 0.7)");
        
        ctx.fillStyle = gradientL;
        ctx.beginPath();
        ctx.ellipse(x - width * 0.05, y + height * 0.4, width * 0.15, height * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        
        const gradientR = ctx.createLinearGradient(
            x - width * 0.2, y + height * 0.6,
            x + width * 0.1, y + height * 0.6
        );
        gradientR.addColorStop(0, "rgba(255, 165, 0, 0)");
        gradientR.addColorStop(1, "rgba(255, 165, 0, 0.7)");
        
        ctx.fillStyle = gradientR;
        ctx.beginPath();
        ctx.ellipse(x - width * 0.05, y + height * 0.6, width * 0.15, height * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Outline for better visibility
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + height/2);
    ctx.lineTo(x + width * 0.8, y + height * 0.3);
    ctx.lineTo(x + width, y + height * 0.4);
    ctx.lineTo(x + width * 0.8, y + height * 0.7);
    ctx.lineTo(x, y + height/2);
    ctx.stroke();
}// Vẽ máy bay thường (loại 1)
function drawNormalPlane(ctx, x, y, scale = 1) {
    const width = planeTypes[1].width * scale;
    const height = planeTypes[1].height * scale;
    
    // Main body - more cartoonish
    ctx.fillStyle = "#4169E1"; // Royal Blue
    ctx.beginPath();
    ctx.moveTo(x, y + height/2);
    ctx.quadraticCurveTo(
        x + width * 0.4, y - height * 0.2,
        x + width * 0.8, y + height * 0.2
    );
    ctx.quadraticCurveTo(
        x + width * 0.6, y + height,
        x, y + height/2
    );
    ctx.fill();
    
    // Cockpit window
    ctx.fillStyle = "#87CEFA"; // Light Sky Blue
    ctx.beginPath();
    ctx.arc(x + width * 0.6, y + height * 0.3, height * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner window detail
    ctx.fillStyle = "#ADD8E6"; // Light Blue
    ctx.beginPath();
    ctx.arc(x + width * 0.6 - 5, y + height * 0.3 - 5, height * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Wings
    ctx.fillStyle = "#6495ED"; // Cornflower Blue
    // Top wing
    ctx.beginPath();
    ctx.moveTo(x + width * 0.4, y + height * 0.3);
    ctx.lineTo(x + width * 0.3, y - height * 0.2);
    ctx.lineTo(x + width * 0.5, y + height * 0.1);
    ctx.fill();
    // Bottom wing
    ctx.beginPath();
    ctx.moveTo(x + width * 0.4, y + height * 0.7);
    ctx.lineTo(x + width * 0.3, y + height * 1.2);
    ctx.lineTo(x + width * 0.5, y + height * 0.9);
    ctx.fill();
    
    // Tail
    ctx.fillStyle = "#FF6347"; // Tomato
    ctx.beginPath();
    ctx.moveTo(x + width * 0.1, y + height * 0.4);
    ctx.lineTo(x - width * 0.1, y + height * 0.1);
    ctx.lineTo(x + width * 0.15, y + height * 0.45);
    ctx.fill();
    
    // Propeller center
    ctx.fillStyle = "#A0522D"; // Sienna
    ctx.beginPath();
    ctx.arc(x + width * 0.9, y + height * 0.5, height * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Propeller animation
    const time = new Date().getTime() / 30; // Faster rotation
    ctx.fillStyle = "#8B4513"; // Saddle Brown
    for (let i = 0; i < 2; i++) {
        const angle = time + (i * Math.PI);
        ctx.save();
        ctx.translate(x + width * 0.9, y + height * 0.5);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, height * 0.5, height * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    // Outline for better visibility
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + height/2);
    ctx.quadraticCurveTo(
        x + width * 0.4, y - height * 0.2,
        x + width * 0.8, y + height * 0.2
    );
    ctx.quadraticCurveTo(
        x + width * 0.6, y + height,
        x, y + height/2
    );
    ctx.stroke();
}

// Vẽ phi thuyền (loại 2)
function drawSpaceship(ctx, x, y, scale = 1) {
    const width = planeTypes[2].width * scale;
    const height = planeTypes[2].height * scale;
    
    // Main body
    ctx.fillStyle = "#C0C0C0"; // Silver
    ctx.beginPath();
    ctx.ellipse(x + width * 0.4, y + height * 0.5, width * 0.6, height * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Cockpit dome
    ctx.fillStyle = "#5F9EA0"; // Cadet Blue
    ctx.beginPath();
    ctx.arc(x + width * 0.7, y + height * 0.4, height * 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Dome highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(x + width * 0.7 - 5, y + height * 0.4 - 5, height * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Bottom fins
    ctx.fillStyle = "#B22222"; // FireBrick
    ctx.beginPath();
    ctx.moveTo(x + width * 0.2, y + height * 0.7);
    ctx.lineTo(x - width * 0.1, y + height * 1.0);
    ctx.lineTo(x + width * 0.3, y + height * 0.8);
    ctx.fill();
    
    // Top fin
    ctx.beginPath();
    ctx.moveTo(x + width * 0.4, y + height * 0.3);
    ctx.lineTo(x + width * 0.3, y - height * 0.2);
    ctx.lineTo(x + width * 0.5, y + height * 0.2);
    ctx.fill();
    
    // Engine nozzles
    ctx.fillStyle = "#444444";
    ctx.beginPath();
    ctx.rect(x - width * 0.05, y + height * 0.4, width * 0.1, height * 0.2);
    ctx.fill();
    
    // Lights (blinking)
    const blinkRate = Date.now() % 1000 < 500;
    ctx.fillStyle = blinkRate ? "#FF0000" : "#00FF00";
    ctx.beginPath();
    ctx.arc(x + width * 0.2, y + height * 0.2, height * 0.05, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = !blinkRate ? "#FF0000" : "#00FF00";
    ctx.beginPath();
    ctx.arc(x + width * 0.2, y + height * 0.8, height * 0.05, 0, Math.PI * 2);
    ctx.fill();
    
    // Outline
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + width * 0.4, y + height * 0.5, width * 0.6, height * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
}

// Vẽ siêu máy bay (loại 3)
function drawSuperPlane(ctx, x, y, scale = 1) {
    const width = planeTypes[3].width * scale;
    const height = planeTypes[3].height * scale;
    
    // Main body - sleek jet fighter
    ctx.fillStyle = "#2F4F4F"; // Dark Slate Gray
    ctx.beginPath();
    ctx.moveTo(x, y + height/2);
    ctx.lineTo(x + width * 0.8, y + height * 0.3);
    ctx.lineTo(x + width, y + height * 0.4);
    ctx.lineTo(x + width * 0.8, y + height * 0.7);
    ctx.lineTo(x, y + height/2);
    ctx.fill();
    
    // Canopy
    ctx.fillStyle = "#4682B4"; // Steel Blue
    ctx.beginPath();
    ctx.moveTo(x + width * 0.5, y + height * 0.3);
    ctx.lineTo(x + width * 0.7, y + height * 0.2);
    ctx.lineTo(x + width * 0.8, y + height * 0.3);
    ctx.lineTo(x + width * 0.7, y + height * 0.4);
    ctx.lineTo(x + width * 0.5, y + height * 0.3);
    ctx.fill();
    
    // Canopy highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.moveTo(x + width * 0.55, y + height * 0.28);
    ctx.lineTo(x + width * 0.65, y + height * 0.23);
    ctx.lineTo(x + width * 0.7, y + height * 0.28);
    ctx.fill();
    
    // Wings - delta shape
    ctx.fillStyle = "#708090"; // Slate Gray
    
    // Main wings
    ctx.beginPath();
    ctx.moveTo(x + width * 0.3, y + height * 0.4);
    ctx.lineTo(x, y - height * 0.2);
    ctx.lineTo(x + width * 0.5, y + height * 0.35);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + width * 0.3, y + height * 0.6);
    ctx.lineTo(x, y + height * 1.2);
    ctx.lineTo(x + width * 0.5, y + height * 0.65);
    ctx.fill();
    
    // Vertical stabilizer
    ctx.beginPath();
    ctx.moveTo(x + width * 0.7, y + height * 0.5);
    ctx.lineTo(x + width * 0.6, y + height * 0.2);
    ctx.lineTo(x + width * 0.8, y + height * 0.4);
    ctx.fill();
    
    // Engine nozzles
    ctx.fillStyle = "#B8860B"; // Dark Golden Rod
    ctx.beginPath();
    ctx.ellipse(x + width * 0.1, y + height * 0.4, width * 0.1, height * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(x + width * 0.1, y + height * 0.6, width * 0.1, height * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Afterburner effect - random flame
    if (Math.random() > 0.5) {
        const gradientL = ctx.createLinearGradient(
            x - width * 0.2, y + height * 0.4,
            x + width * 0.1, y + height * 0.4
        );
        gradientL.addColorStop(0, "rgba(255, 165, 0, 0)");
        gradientL.addColorStop(1, "rgba(255, 165, 0, 0.7)");
        
        ctx.fillStyle = gradientL;
        ctx.beginPath();
        ctx.ellipse(x - width * 0.05, y + height * 0.4, width * 0.15, height * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        
        const gradientR = ctx.createLinearGradient(
            x - width * 0.2, y + height * 0.6,
            x + width * 0.1, y + height * 0.6
        );
        gradientR.addColorStop(0, "rgba(255, 165, 0, 0)");
        gradientR.addColorStop(1, "rgba(255, 165, 0, 0.7)");
        
        ctx.fillStyle = gradientR;
        ctx.beginPath();
        ctx.ellipse(x - width * 0.05, y + height * 0.6, width * 0.15, height * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Outline for better visibility
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + height/2);
    ctx.lineTo(x + width * 0.8, y + height * 0.3);
    ctx.lineTo(x + width, y + height * 0.4);
    ctx.lineTo(x + width * 0.8, y + height * 0.7);
    ctx.lineTo(x, y + height/2);
    ctx.stroke();
}

// Plane Movement
function movePlane() {
    if (plane.moving === -1) {
        plane.y -= plane.speed;
    } else if (plane.moving === 1) {
        plane.y += plane.speed;
    }
    
    // Keep plane on canvas
    if (plane.y < 0) plane.y = 0;
    if (plane.y + plane.height > canvas.height) plane.y = canvas.height - plane.height;
}

// Generate and manage obstacles
function moveAndDrawObstacles() {
    // Only generate obstacles in higher levels
    if (currentLevel >= 2 && !gamePaused && Math.random() < levelSettings[currentLevel].obstacleFrequency) {
        generateObstacle();
    }
    
    // Move and draw existing obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        
        // Move obstacle
        obstacle.x -= obstacle.speed;
        
        // Remove off-screen obstacles
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(i, 1);
            continue;
        }
        
        // Draw obstacle
        drawObstacle(obstacle);
    }
}

// Generate random obstacle
function generateObstacle() {
    const obstacleTypes = ["bird", "cloud", "lightning"];
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    
    let obstacle = {
        type: type,
        x: canvas.width,
        y: 100 + Math.random() * (canvas.height - 200),
        speed: 3 + Math.random() * 2
    };
    
    // Set size based on type
    switch(type) {
        case "bird":
            obstacle.width = 40;
            obstacle.height = 30;
            break;
        case "cloud":
            obstacle.width = 80;
            obstacle.height = 50;
            break;
        case "lightning":
            obstacle.width = 20;
            obstacle.height = 80;
            obstacle.flash = true; // Special property for lightning
            break;
    }
    
    obstacles.push(obstacle);
}

// Draw obstacle based on type
function drawObstacle(obstacle) {
    switch(obstacle.type) {
        case "bird":
            drawBirdObstacle(obstacle);
            break;
        case "cloud":
            drawCloudObstacle(obstacle);
            break;
        case "lightning":
            drawLightningObstacle(obstacle);
            break;
    }
}

// Draw bird obstacle
function drawBirdObstacle(obstacle) {
    // Animation cycle for wings
    const wingPosition = Math.sin(Date.now() / 200) * 0.5;
    
    // Bird body
    ctx.fillStyle = "#8B4513"; // Saddle Brown
    ctx.beginPath();
    ctx.ellipse(obstacle.x, obstacle.y, obstacle.width / 2, obstacle.height / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird head
    ctx.beginPath();
    ctx.arc(obstacle.x + obstacle.width * 0.3, obstacle.y - obstacle.height * 0.1, obstacle.height / 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird beak
    ctx.fillStyle = "#FFA500"; // Orange
    ctx.beginPath();
    ctx.moveTo(obstacle.x + obstacle.width * 0.4, obstacle.y - obstacle.height * 0.1);
    ctx.lineTo(obstacle.x + obstacle.width * 0.6, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.width * 0.4, obstacle.y + obstacle.height * 0.1);
    ctx.fill();
    
    // Bird wings
    ctx.fillStyle = "#A0522D"; // Sienna
    
    // Upper wing
    ctx.beginPath();
    ctx.moveTo(obstacle.x, obstacle.y - obstacle.height * 0.1);
    ctx.quadraticCurveTo(
        obstacle.x - obstacle.width * 0.2, obstacle.y - obstacle.height * (0.5 + wingPosition),
        obstacle.x - obstacle.width * 0.4, obstacle.y - obstacle.height * 0.2
    );
    ctx.lineTo(obstacle.x, obstacle.y);
    ctx.fill();
    
    // Lower wing
    ctx.beginPath();
    ctx.moveTo(obstacle.x, obstacle.y + obstacle.height * 0.1);
    ctx.quadraticCurveTo(
        obstacle.x - obstacle.width * 0.2, obstacle.y + obstacle.height * (0.5 - wingPosition),
        obstacle.x - obstacle.width * 0.4, obstacle.y + obstacle.height * 0.2
    );
    ctx.lineTo(obstacle.x, obstacle.y);
    ctx.fill();
    
    // Bird eye
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(obstacle.x + obstacle.width * 0.4, obstacle.y - obstacle.height * 0.15, obstacle.height / 12, 0, Math.PI * 2);
    ctx.fill();
}

// Draw cloud obstacle
function drawCloudObstacle(obstacle) {
    // Dark storm cloud
    ctx.fillStyle = "#4D4D4D";
    ctx.beginPath();
    ctx.arc(obstacle.x, obstacle.y, obstacle.height * 0.6, 0, Math.PI * 2);
    ctx.arc(obstacle.x + obstacle.width * 0.3, obstacle.y - obstacle.height * 0.1, obstacle.height * 0.5, 0, Math.PI * 2);
    ctx.arc(obstacle.x + obstacle.width * 0.5, obstacle.y + obstacle.height * 0.2, obstacle.height * 0.4, 0, Math.PI * 2);
    ctx.arc(obstacle.x - obstacle.width * 0.3, obstacle.y + obstacle.height * 0.1, obstacle.height * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Cloud highlight
    ctx.fillStyle = "#737373";
    ctx.beginPath();
    ctx.arc(obstacle.x, obstacle.y - obstacle.height * 0.2, obstacle.height * 0.3, 0, Math.PI * 2);
    ctx.arc(obstacle.x + obstacle.width * 0.3, obstacle.y - obstacle.height * 0.3, obstacle.height * 0.25, 0, Math.PI * 2);
    ctx.fill();
}

// Draw lightning obstacle
function drawLightningObstacle(obstacle) {
    // Flash effect
    if (obstacle.flash && Date.now() % 500 < 250) {
        ctx.strokeStyle = "#FFFFFF";
    } else {
        ctx.strokeStyle = "#FFFF00";
    }
    
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    // Zigzag lightning pattern
    ctx.moveTo(obstacle.x, obstacle.y - obstacle.height / 2);
    ctx.lineTo(obstacle.x - obstacle.width * 0.3, obstacle.y - obstacle.height * 0.2);
    ctx.lineTo(obstacle.x + obstacle.width * 0.3, obstacle.y + obstacle.height * 0.2);
    ctx.lineTo(obstacle.x - obstacle.width * 0.3, obstacle.y + obstacle.height * 0.6);
    ctx.lineTo(obstacle.x, obstacle.y + obstacle.height / 2);
    
    ctx.stroke();
    
    // Glow effect
    ctx.shadowColor = "#FFFF00";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
    ctx.lineWidth = 8;
    ctx.stroke();
    
    // Reset shadow for other elements
    ctx.shadowBlur = 0;
}

// Generate and manage bonus items
function moveAndDrawBonusItems() {
    // Generate random bonus items (fuel, star)
    if (Math.random() < 0.002) {
        generateBonusItem();
    }
    
    // Move and draw existing bonus items
    for (let i = bonusItems.length - 1; i >= 0; i--) {
        const item = bonusItems[i];
        
        // Move item
        item.x -= item.speed;
        
        // Remove off-screen items
        if (item.x + item.size < 0) {
            bonusItems.splice(i, 1);
            continue;
        }
        
        // Draw item
        drawBonusItem(item);
    }
}

// Generate random bonus item
function generateBonusItem() {
    const itemTypes = ["fuel", "star"];
    const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    
    bonusItems.push({
        type: type,
        x: canvas.width,
        y: 100 + Math.random() * (canvas.height - 200),
        size: 30,
        speed: 2 + Math.random() * 2,
        rotation: 0,
        rotationSpeed: 0.05 + Math.random() * 0.05
    });
}

// Draw bonus item
function drawBonusItem(item) {
    ctx.save();
    
    // Apply rotation animation
    ctx.translate(item.x, item.y);
    item.rotation += item.rotationSpeed;
    ctx.rotate(item.rotation);
    ctx.translate(-item.x, -item.y);
    
    if (item.type === "fuel") {
        // Fuel can
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(item.x - item.size/2, item.y - item.size/2, item.size, item.size);
        
        // Fuel nozzle
        ctx.fillStyle = "#000000";
        ctx.fillRect(item.x - item.size/4, item.y - item.size/2 - item.size/4, item.size/2, item.size/4);
        
        // Fuel icon
        ctx.fillStyle = "#FFFFFF";
        ctx.font = item.size * 0.8 + "px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("F", item.x, item.y);
    } else {
        // Star
        const spikes = 5;
        const outerRadius = item.size / 2;
        const innerRadius = item.size / 4;
        
        ctx.beginPath();
        ctx.fillStyle = "#FFD700";
        
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = Math.PI / spikes * i;
            const x = item.x + Math.cos(angle) * radius;
            const y = item.y + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

// Question Generation
function generateQuestion() {
    // Clear previous answers
    answers = [];
    
    if (gameMode === "math") {
        generateMathQuestion();
    } else {
        generateLetterQuestion();
    }
    
    // Display question
    document.getElementById("question").innerText = currentQuestion.text;
}

// Math Question Generation
function generateMathQuestion() {
    let num1, num2, operation, correctAnswer;
    
    // Adjust difficulty based on level
    if (currentLevel === 1) {
        // Simple addition with small numbers
        num1 = Math.floor(Math.random() * 10);
        num2 = Math.floor(Math.random() * 10);
        operation = "+";
        correctAnswer = num1 + num2;
        currentQuestion = {
            text: `${num1} ${operation} ${num2} = ?`,
            answer: correctAnswer
        };
    } else if (currentLevel === 2) {
        // Addition and subtraction
        num1 = Math.floor(Math.random() * 20);
        num2 = Math.floor(Math.random() * 10);
        operation = Math.random() > 0.5 ? "+" : "-";
        correctAnswer = operation === "+" ? num1 + num2 : num1 - num2;
        
        // Ensure no negative results for subtraction
        if (operation === "-" && num1 < num2) {
            let temp = num1;
            num1 = num2;
            num2 = temp;
            correctAnswer = num1 - num2;
        }
        
        currentQuestion = {
            text: `${num1} ${operation} ${num2} = ?`,
            answer: correctAnswer
        };
    } else {
        // Multiplication and more complex operations
        num1 = Math.floor(Math.random() * 10);
        num2 = Math.floor(Math.random() * 10);
        let operations = ["+", "-", "×"];
        operation = operations[Math.floor(Math.random() * operations.length)];
        
        if (operation === "+") {
            correctAnswer = num1 + num2;
        } else if (operation === "-") {
            // Ensure no negative results
            if (num1 < num2) {
                let temp = num1;
                num1 = num2;
                num2 = temp;
            }
            correctAnswer = num1 - num2;
        } else {
            correctAnswer = num1 * num2;
        }
        
        currentQuestion = {
            text: `${num1} ${operation} ${num2} = ?`,
            answer: correctAnswer
        };
    }
    
    // Generate answers
    generateAnswerObjects(correctAnswer);
}

// Letter Question Generation
function generateLetterQuestion() {
    // Words for different levels with Vietnamese words
    const level1Words = ["BÉ", "TÔ", "BÀ", "CÁ", "MÈO", "CHÓ", "CON", "ĐI", "ĂN", "TẮM"];
    const level2Words = ["BÁNH", "NƯỚC", "SÁCH", "THÍCH", "CHẠY", "NHẢY", "XANH", "TRỜI", "NẮNG", "SÁNG"];
    const level3Words = ["TRƯỜNG", "HỌC BÀI", "BẠN BÈ", "HOA QUẢ", "NHANH NHẸN", "THÔNG MINH", "NGOAN NGOÃN", "YÊU THÍCH"];
    
    let words;
    if (currentLevel === 1) {
        words = level1Words;
    } else if (currentLevel === 2) {
        words = level2Words;
    } else {
        words = level3Words;
    }
    
    // Pick a random word
    const word = words[Math.floor(Math.random() * words.length)];
    
    // Remove a random letter
    const missingIndex = Math.floor(Math.random() * word.length);
    const missingLetter = word[missingIndex];
    
    let displayWord = "";
    for (let i = 0; i < word.length; i++) {
        if (i === missingIndex) {
            displayWord += "_";
        } else {
            displayWord += word[i];
        }
    }
    
    currentQuestion = {
        text: displayWord,
        answer: missingLetter
    };
    
    // Generate answers
    generateLetterAnswerObjects(missingLetter);
}

// Generate Math Answer Objects
function generateAnswerObjects(correctAnswer) {
    // Add correct answer
    answers.push({
        value: correctAnswer,
        x: canvas.width,
        y: 100 + Math.random() * 400,
        speed: levelSettings[currentLevel].answerSpeed.min + Math.random() * (levelSettings[currentLevel].answerSpeed.max - levelSettings[currentLevel].answerSpeed.min),
        size: 50,
        isCorrect: true,
        vehicle: Math.floor(Math.random() * 3) // 0: balloon, 1: cloud, 2: bird
    });
    
    // Add wrong answers
    for (let i = 0; i < 3; i++) {
        let wrongAnswer;
        do {
            // Generate wrong answers based on level
            if (currentLevel === 1) {
                wrongAnswer = Math.floor(Math.random() * 20);
            } else if (currentLevel === 2) {
                wrongAnswer = Math.floor(Math.random() * 30);
            } else {
                wrongAnswer = Math.floor(Math.random() * 50);
            }
        } while (wrongAnswer === correctAnswer);
        
        answers.push({
            value: wrongAnswer,
            x: canvas.width + (i+1) * 200,
            y: 100 + Math.random() * 400,
            speed: levelSettings[currentLevel].answerSpeed.min + Math.random() * (levelSettings[currentLevel].answerSpeed.max - levelSettings[currentLevel].answerSpeed.min),
            size: 50,
            isCorrect: false,
            vehicle: Math.floor(Math.random() * 3)
        });
    }
}

// Generate Letter Answer Objects
function generateLetterAnswerObjects(missingLetter) {
    // All Vietnamese letters for answers
    const allLetters = "AĂÂBCDĐEÊGHIKLMNOÔƠPQRSTUƯVXY";
    
    // Add correct answer
    answers.push({
        value: missingLetter,
        x: canvas.width,
        y: 100 + Math.random() * 400,
        speed: levelSettings[currentLevel].answerSpeed.min + Math.random() * (levelSettings[currentLevel].answerSpeed.max - levelSettings[currentLevel].answerSpeed.min),
        size: 50,
        isCorrect: true,
        vehicle: Math.floor(Math.random() * 3)
    });
    
    // Add wrong answers
    for (let i = 0; i < 3; i++) {
        let wrongLetter;
        do {
            wrongLetter = allLetters.charAt(Math.floor(Math.random() * allLetters.length));
        } while (wrongLetter === missingLetter);
        
        answers.push({
            value: wrongLetter,
            x: canvas.width + (i+1) * 200,
            y: 100 + Math.random() * 400,
            speed: levelSettings[currentLevel].answerSpeed.min + Math.random() * (levelSettings[currentLevel].answerSpeed.max - levelSettings[currentLevel].answerSpeed.min),
            size: 50,
            isCorrect: false,
            vehicle: Math.floor(Math.random() * 3)
        });
    }
}

// Move and Draw Answers
function moveAndDrawAnswers() {
    for (let answer of answers) {
        // Move answer
        answer.x -= answer.speed;
        
        // Draw answer vehicle and text
        drawAnswerObject(answer);
    }
    
    // Check if all answers are off screen
    if (answers.length > 0 && answers.every(a => a.x + a.size < 0)) {
        generateQuestion();
    }
}

// Draw Answer Object
function drawAnswerObject(answer) {
    ctx.save();
    
    if (answer.vehicle === 0) {
        // Balloon
        const balloonWidth = answer.size * 1.2;
        const balloonHeight = answer.size * 1.5;
        
        // Draw balloon
        ctx.fillStyle = answer.isCorrect ? "#FF9900" : "#66CC66";
        ctx.beginPath();
        ctx.arc(answer.x, answer.y, answer.size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Add balloon highlights
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.arc(answer.x - answer.size/4, answer.y - answer.size/4, answer.size/6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw string
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(answer.x, answer.y + answer.size/2);
        ctx.lineTo(answer.x, answer.y + answer.size);
        ctx.stroke();
    } else if (answer.vehicle === 1) {
        // Cloud
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(answer.x, answer.y, answer.size/2, 0, Math.PI * 2);
        ctx.arc(answer.x + answer.size * 0.3, answer.y - answer.size * 0.1, answer.size/2.5, 0, Math.PI * 2);
        ctx.arc(answer.x - answer.size * 0.3, answer.y + answer.size * 0.1, answer.size/2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Add cloud shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        ctx.beginPath();
        ctx.ellipse(answer.x, answer.y + answer.size/2 + 5, answer.size/1.5, answer.size/6, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Bird
        ctx.fillStyle = answer.isCorrect ? "#FF6666" : "#6699FF";
        
        // Bird body
        ctx.beginPath();
        ctx.ellipse(answer.x, answer.y, answer.size/2, answer.size/3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bird head
        ctx.beginPath();
        ctx.arc(answer.x + answer.size/2, answer.y - answer.size/6, answer.size/4, 0, Math.PI * 2);
        ctx.fill();
        
        // Bird beak
        ctx.fillStyle = "#FFCC00";
        ctx.beginPath();
        ctx.moveTo(answer.x + answer.size/2 + answer.size/4, answer.y - answer.size/6);
        ctx.lineTo(answer.x + answer.size/2 + answer.size/2, answer.y);
        ctx.lineTo(answer.x + answer.size/2 + answer.size/4, answer.y);
        ctx.fill();
        
        // Bird wing
        ctx.fillStyle = answer.isCorrect ? "#FF9999" : "#99CCFF";
        ctx.beginPath();
        ctx.ellipse(answer.x, answer.y - answer.size/4, answer.size/3, answer.size/5, Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
        
        // Bird eye
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(answer.x + answer.size/2 + answer.size/8, answer.y - answer.size/6 - answer.size/10, answer.size/12, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw answer text
    ctx.fillStyle = "#000000";
    ctx.font = "bold " + answer.size/1.5 + "px 'Baloo 2', cursive";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Add text shadow for better visibility
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.strokeText(answer.value, answer.x, answer.y);
    ctx.fillStyle = "#000000";
    ctx.fillText(answer.value, answer.x, answer.y);
    
    ctx.restore();
}

// Collision Detection
function checkCollisions() {
    // Check for collisions with answers
    for (let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        
        // Simple rectangle collision detection
        if (
            plane.x < answer.x + answer.size/2 &&
            plane.x + plane.width > answer.x - answer.size/2 &&
            plane.y < answer.y + answer.size/2 &&
            plane.y + plane.height > answer.y - answer.size/2
        ) {
            if (answer.isCorrect) {
                // Correct answer
                handleCorrectAnswer();
            } else {
                // Wrong answer
                handleWrongAnswer();
            }
            
            // Remove this answer
            answers.splice(i, 1);
            i--;
            
            // Generate new question if no answers left
            if (answers.length === 0) {
                generateQuestion();
            }
        }
    }
    
    // Check for collisions with obstacles
    for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i];
        
        // Simple rectangle collision detection
        if (
            plane.x < obstacle.x + obstacle.width/2 &&
            plane.x + plane.width > obstacle.x - obstacle.width/2 &&
            plane.y < obstacle.y + obstacle.height/2 &&
            plane.y + plane.height > obstacle.y - obstacle.height/2
        ) {
            // Handle obstacle collision
            handleObstacleCollision(obstacle);
            
            // Remove obstacle
            obstacles.splice(i, 1);
            i--;
        }
    }
    
    // Check for collisions with bonus items
    for (let i = 0; i < bonusItems.length; i++) {
        const item = bonusItems[i];
        
        // Simple circle collision detection
        const dx = (plane.x + plane.width/2) - item.x;
        const dy = (plane.y + plane.height/2) - item.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < (plane.width/2 + item.size/2)) {
            // Handle bonus item collection
            collectBonusItem(item);
            
            // Remove item
            bonusItems.splice(i, 1);
            i--;
        }
    }
}

// Handle collecting bonus item
function collectBonusItem(item) {
    if (item.type === "fuel") {
        // Add fuel
        fuelLevel = Math.min(100, fuelLevel + 30);
        updateFuelBar();
        
        // Play sound
        if (soundEnabled) {
            sounds.collectFuel.currentTime = 0;
            sounds.collectFuel.play().catch(e => console.log("Play prevented:", e));
        }
    } else if (item.type === "star") {
        // Add star if not already at max
        if (stars < 3) {
            stars++;
            updateStarsDisplay();
            
            // Play level up sound
            if (soundEnabled) {
                sounds.levelUp.currentTime = 0;
                sounds.levelUp.play().catch(e => console.log("Play prevented:", e));
            }
        }
    }
}

// Handle obstacle collision
function handleObstacleCollision(obstacle) {
    // Play wrong sound
    if (soundEnabled) {
        sounds.wrong.currentTime = 0;
        sounds.wrong.play().catch(e => console.log("Play prevented:", e));
    }
    
    // Shake effect
    plane.shaking = true;
    plane.shakeTime = 20;
    plane.shakeMagnitude = 5;
    
    // Lose fuel
    fuelLevel = Math.max(0, fuelLevel - 15);
    updateFuelBar();
    
    // Check for game over due to no fuel
    if (fuelLevel <= 0) {
        endGame();
    }
}

// Handle correct answer
function handleCorrectAnswer() {
    // Play correct sound
    if (soundEnabled) {
        sounds.correct.currentTime = 0;
        sounds.correct.play().catch(e => console.log("Play prevented:", e));
    }
    
    // Add points based on level
    score += currentLevel * 10;
    document.getElementById("score").querySelector("span").innerText = score;
    
    // Make plane glow
    plane.glowing = true;
    plane.glowTime = 30;
    
    // Add boost effect
    plane.boosting = true;
    plane.boostTime = 30;
    
    // Add fuel
    fuelLevel = Math.min(100, fuelLevel + 5);
    updateFuelBar();
    
    // Update consecutive correct answers
    consecutiveCorrect++;
    
    // Check for star award
    if (consecutiveCorrect >= 5 && stars < 3) {
        stars++;
        updateStarsDisplay();
        consecutiveCorrect = 0;
    }
    
    // Check for level up
    if (score >= currentLevel * 100) {
        levelUp();
    }
}

// Handle wrong answer
function handleWrongAnswer() {
    // Play wrong sound
    if (soundEnabled) {
        sounds.wrong.currentTime = 0;
        sounds.wrong.play().catch(e => console.log("Play prevented:", e));
    }
    
    // Lose points
    score = Math.max(0, score - 5);
    document.getElementById("score").querySelector("span").innerText = score;
    
    // Reset consecutive correct counter
    consecutiveCorrect = 0;
    
    // Shake effect
    plane.shaking = true;
    plane.shakeTime = 15;
    plane.shakeMagnitude = 3;
    
    // Lose fuel
    fuelLevel = Math.max(0, fuelLevel - 5);
    updateFuelBar();
    
    // Check for game over due to no fuel
    if (fuelLevel <= 0) {
        endGame();
    }
}

// Level up function
function levelUp() {
    if (currentLevel < 3) {
        currentLevel++;
        
        // Pause game temporarily
        gamePaused = true;
        
        // Stop background music
        if (soundEnabled) {
            sounds.background.pause();
            sounds.levelUp.currentTime = 0;
            sounds.levelUp.play().catch(e => console.log("Play prevented:", e));
        }
        
        // Update level badge
        document.getElementById("level-badge").querySelector("span").innerText = currentLevel;
        
        // Show level up screen
        document.getElementById("level-up-screen").style.display = "flex";
        document.getElementById("new-level").innerText = currentLevel;
        
        // Set level description
        let description = "";
        switch(currentLevel) {
            case 2:
                description = "Bầu trời hoàng hôn - Nhiều thử thách hơn!";
                break;
            case 3:
                description = "Không gian vũ trụ - Cẩn thận chướng ngại vật!";
                break;
        }
        document.getElementById("level-description").innerText = description;
        
        // Clear current answers and obstacles
        answers = [];
        obstacles = [];
    }
}

// End Game
function endGame() {
    gameOver = true;
    clearInterval(interval);
    clearInterval(fuelInterval);
    
    if (soundEnabled) {
        sounds.background.pause();
        sounds.fuelLow.pause();
        sounds.gameOver.currentTime = 0;
        sounds.gameOver.play().catch(e => console.log("Play prevented:", e));
    }
    
    // Save high score
    saveHighScore();
    
    // Check for unlocking planes
    checkUnlockPlanes();
    
    // Show game over screen
    document.getElementById("game-over-screen").style.display = "flex";
    document.getElementById("final-score").querySelector("span").innerText = score;
    
    // Show earned stars
    const starsEarned = document.getElementById("stars-earned");
    starsEarned.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        if (i < stars) {
            starsEarned.innerHTML += '<i class="fas fa-star"></i>';
        } else {
            starsEarned.innerHTML += '<i class="far fa-star"></i>';
        }
    }
    
    // Set encouragement message based on score
    let encouragement;
    if (score < 30) {
        encouragement = "Cố gắng thêm nhé! Bạn có thể làm tốt hơn!";
    } else if (score < 100) {
        encouragement = "Tốt lắm! Tiếp tục luyện tập nhé!";
    } else {
        encouragement = "Xuất sắc! Bạn thật giỏi!";
    }
    
    document.getElementById("encouragement").innerText = encouragement;
}

// Restart Game
function restartGame() {
    clearInterval(interval);
    clearInterval(fuelInterval);
    startGame(gameMode);
}

// Show Start Screen
function showStartScreen() {
    gameStarted = false;
    gameOver = false;
    gamePaused = false;
    clearInterval(interval);
    clearInterval(fuelInterval);
    
    if (soundEnabled) {
        sounds.background.pause();
        sounds.fuelLow.pause();
    }
    
    document.getElementById("start-screen").style.display = "flex";
    document.getElementById("game-over-screen").style.display = "none";
    document.getElementById("pause-screen").style.display = "none";
    document.getElementById("level-up-screen").style.display = "none";
    
    // Update high score display
    document.getElementById("highscore-value").innerText = highScore;
}

// Thêm vào phần adjustForDevice trong file game.js
function adjustForDevice() {
    const isMobile = (window.innerWidth <= 800) || 
           ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0);
    
    if (isMobile) {
        document.getElementById("mobile-controls").style.display = "block";
        
        // Điều chỉnh kích thước canvas dựa trên orientation
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (isLandscape) {
            // Điều chỉnh cho chế độ ngang
            canvas.width = Math.min(800, window.innerWidth);
            canvas.height = Math.min(600, window.innerHeight);
        } else {
            // Điều chỉnh cho chế độ dọc
            const ratio = 4/3; // tỷ lệ chiều rộng/chiều cao
            canvas.width = window.innerWidth;
            canvas.height = canvas.width / ratio;
            
            // Đảm bảo không vượt quá chiều cao màn hình
            if (canvas.height > window.innerHeight * 0.8) {
                canvas.height = window.innerHeight * 0.8;
                canvas.width = canvas.height * ratio;
            }
        }
    } else {
        document.getElementById("mobile-controls").style.display = "none";
        canvas.width = 800;
        canvas.height = 600;
    }
    
    // Redraw nếu game đang chạy
    if (gameStarted && !gamePaused && !gameOver) {
        drawBackground();
        drawPlane();
        moveAndDrawAnswers();
    }
}

// Thêm listener cho sự kiện xoay màn hình
window.addEventListener("orientationchange", function() {
    setTimeout(adjustForDevice, 100); // Delay để đảm bảo màn hình đã xoay xong
});

// Thay đổi xử lý touch trong file game.js
function setupTouchControls() {
    const touchArea = document.getElementById("touch-area");
    
    // Xóa những event listener cũ nếu có
    touchArea.removeEventListener("touchstart", handleTouch);
    touchArea.removeEventListener("touchmove", handleTouch);
    touchArea.removeEventListener("touchend", handleTouchEnd);
    
    // Thêm event listener mới
    touchArea.addEventListener("touchstart", handleTouch);
    touchArea.addEventListener("touchmove", handleTouch);
    touchArea.addEventListener("touchend", handleTouchEnd);
}

function handleTouch(e) {
    e.preventDefault();
    if (gameStarted && !gameOver && !gamePaused) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const touchY = (touch.clientY - rect.top) * (canvas.height / rect.height);
        const planeCenter = plane.y + plane.height/2;
        
        // Di chuyển máy bay dựa vào vị trí chạm
        if (touchY < planeCenter - 20) {
            plane.moving = -1;
        } else if (touchY > planeCenter + 20) {
            plane.moving = 1;
        } else {
            plane.moving = 0;
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    plane.moving = 0;
}

// Thêm gọi setupTouchControls() vào trong window.onload

// Thêm hàm này và gọi nó mỗi khi adjustForDevice được gọi
function adjustUIPositions() {
    const isLandscape = window.innerWidth > window.innerHeight;
    const centerUI = document.getElementById("center-ui");
    
    if (isLandscape) {
        centerUI.style.top = "25%";
    } else {
        centerUI.style.top = "15%";
    }
}