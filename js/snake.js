const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// --- SABİTLER ---
const tileSize        = 20;
const gap             = 4;
const cellSize        = tileSize - gap;
const halfGap         = gap / 2;
const canvasCols      = 800  / tileSize;   // 40 sütun
const canvasRows      = 7;                 // 7 satır
const initialFoodCount = 120;
const snakeLength     = 4;
const fps             = 9;
const cornerRadius    = 8;                 

canvas.width  = canvasCols * tileSize;  // 800
canvas.height = canvasRows * tileSize;  // 140

// --- OYUN DURUMU ---
let snake     = [];
let foods     = [];
let dir;
let returning = false;             // “dönüş” modu
let startPos  = { x: 0, y: 0 };    // başlangıç pozisyonu

// Oyun durumunu sıfırla
function resetGame() {
  snake = [];
  // Rasgele başlangıç noktası (yılan boyunu sığdıracak şekilde)
  const startX = Math.floor(Math.random() * (canvasCols - snakeLength)) + snakeLength;
  const startY = Math.floor(Math.random() * canvasRows);
  for (let i = 0; i < snakeLength; i++) {
    snake.push({ x: startX - i, y: startY });
  }
  startPos  = { x: startX, y: startY };
  dir       = { x: 1, y: 0 };
  returning = false;
  spawnFoods();
}

// Rastgele, tekrar etmeyen yemler oluştur
function spawnFoods() {
  foods = [];
  while (foods.length < initialFoodCount) {
    const pos = {
      x: Math.floor(Math.random() * canvasCols),
      y: Math.floor(Math.random() * canvasRows)
    };
    const onSnake   = snake.some(s => s.x === pos.x && s.y === pos.y);
    const duplicate = foods.some(f => f.x === pos.x && f.y === pos.y);
    if (!onSnake && !duplicate) foods.push(pos);
  }
}

// Otomatik hareket: hedef ya yem ya başlangıç, duvara asla çarpmaz
function autoMove() {
  const head = snake[0];
  let target;

  if (returning) {
    target = startPos;
  } else if (foods.length > 0) {
    // en yakın yemi bul
    target = foods.reduce((closest, f) => {
      const dF = Math.abs(f.x - head.x) + Math.abs(f.y - head.y);
      const dC = Math.abs(closest.x - head.x) + Math.abs(closest.y - head.y);
      return dF < dC ? f : closest;
    }, foods[0]);
  } else {
    // artık yem kalmadı, dönüş modunu başlat
    returning = true;
    target    = startPos;
  }

  // Geri dönüşü yasakla
  const candidates = [
    { x:  1, y:  0 },
    { x: -1, y:  0 },
    { x:  0, y:  1 },
    { x:  0, y: -1 }
  ];
  const opposite = { x: -dir.x, y: -dir.y };
  let allowed = candidates.filter(d => !(d.x === opposite.x && d.y === opposite.y));

  // Duvar dışına çıkmayacak güvenli yönler
  const safe = allowed.filter(d => {
    const nx = head.x + d.x, ny = head.y + d.y;
    return nx >= 0 && nx < canvasCols && ny >= 0 && ny < canvasRows;
  });
  if (safe.length) allowed = safe;

  // Hedefe en yakın yönü seç (Manhattan)
  let best = allowed[0];
  let bestDist = Math.abs(target.x - (head.x + best.x)) + Math.abs(target.y - (head.y + best.y));
  for (const d of allowed) {
    const nx = head.x + d.x, ny = head.y + d.y;
    const dist = Math.abs(target.x - nx) + Math.abs(target.y - ny);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  dir = best;
}

// Oyun döngüsü
function gameLoop() {
  autoMove();
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  snake.unshift(head);

  // Başlangıca dönme kontrolü
  if (returning && head.x === startPos.x && head.y === startPos.y) {
    return resetGame();
  }

  // Yem yeme kontrolü (dönüş modunda değilken)
  if (!returning) {
    const idx = foods.findIndex(f => f.x === head.x && f.y === head.y);
    if (idx !== -1) foods.splice(idx, 1);
  }

  // Sabit uzunluk
  while (snake.length > snakeLength) snake.pop();

  draw();
}

// Rounded rectangle yardımcı
function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Çizim fonksiyonu
function draw() {
  // 1) Oyun alanı çerçevesi
  drawRoundedRect(0, 0, canvas.width, canvas.height, cornerRadius);
  ctx.fillStyle = '#000';
  ctx.fill();

  // 2) Grid kutucukları
  for (let y = 0; y < canvasRows; y++) {
    for (let x = 0; x < canvasCols; x++) {
      const px = x * tileSize + halfGap;
      const py = y * tileSize + halfGap;
      drawRoundedRect(px, py, cellSize, cellSize, cornerRadius);
      ctx.fillStyle = '#111';
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // 3) Yemler (dönüşte gizlenir)
  if (!returning) {
    ctx.fillStyle = 'green';
    foods.forEach(f => {
      const px = f.x * tileSize + halfGap;
      const py = f.y * tileSize + halfGap;
      drawRoundedRect(px, py, cellSize, cellSize, cornerRadius);
      ctx.fill();
    });
  }

  // 4) Yılan segmentleri
  snake.forEach((seg, i) => {
    const factor = (snakeLength - i) / snakeLength;
    const segSize = cellSize * factor;
    const off     = (tileSize - segSize) / 2;
    const px      = seg.x * tileSize + off + halfGap;
    const py      = seg.y * tileSize + off + halfGap;
    drawRoundedRect(px, py, segSize, segSize, cornerRadius);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });
}

// Manuel tuş kontrolü (isteğe bağlı)
window.addEventListener('keydown', e => {
  const { x, y } = dir;
  if (e.key === 'ArrowUp'    && y !== 1)  dir = { x: 0, y: -1 };
  if (e.key === 'ArrowDown'  && y !== -1) dir = { x: 0, y: 1 };
  if (e.key === 'ArrowLeft'  && x !== 1)  dir = { x: -1, y: 0 };
  if (e.key === 'ArrowRight' && x !== -1) dir = { x: 1, y: 0 };
});

// Oyunu başlat
resetGame();
setInterval(gameLoop, 1000 / fps);
