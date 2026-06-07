(function(){
    // ---------- STATE ----------
    let originalImage = null;
    let frames = [];
    let animationSequence = [];
    let currentAnimInterval = null;
    let isPlaying = false;
    let currentAnimFrameIdx = 0;
    let fps = 12;
    
    // DOM elements
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const spriteControls = document.getElementById('spriteControls');
    const galleryPanel = document.getElementById('galleryPanel');
    const animationPanel = document.getElementById('animationPanel');
    const colsInput = document.getElementById('colsCount');
    const rowsInput = document.getElementById('rowsCount');
    const applySplitBtn = document.getElementById('applySplitBtn');
    const framesContainer = document.getElementById('framesContainer');
    const sequenceContainer = document.getElementById('sequenceContainer');
    const addAllFramesBtn = document.getElementById('addAllFramesBtn');
    const clearSeqBtn = document.getElementById('clearSeqBtn');
    const clearSequenceBtnSmall = document.getElementById('clearSequenceBtnSmall');
    const playAnimBtn = document.getElementById('playAnimBtn');
    const stopAnimBtn = document.getElementById('stopAnimBtn');
    const downloadGifBtn = document.getElementById('downloadGifBtn');
    const fpsSlider = document.getElementById('fpsSlider');
    const fpsValue = document.getElementById('fpsValue');
    const animationCanvas = document.getElementById('animationCanvas');
    const frameCountBadge = document.getElementById('frameCountBadge');
    const warningMsg = document.getElementById('warningMsg');

    let ctxAnim = animationCanvas.getContext('2d');
    ctxAnim.imageSmoothingEnabled = false;

    // ---------- Банер с инструкцией (сворачивание) ----------
    const banner = document.getElementById('instructionBanner');
    const bannerToggle = document.querySelector('.banner-toggle');
    const bannerContent = document.querySelector('.banner-content');
    
    if (bannerToggle && bannerContent) {
        bannerToggle.addEventListener('click', () => {
            bannerContent.classList.toggle('collapsed');
            bannerToggle.style.transform = bannerContent.classList.contains('collapsed') ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }

    // ---------- Пример спрайта для демонстрации ----------
    function drawExampleSprite() {
        const exampleCanvas = document.getElementById('exampleSpriteCanvas');
        if (!exampleCanvas) return;
        const ctx = exampleCanvas.getContext('2d');
        exampleCanvas.width = 320;
        exampleCanvas.height = 80;
        ctx.imageSmoothingEnabled = false;
        
        // Рисуем пример спрайт-листа (ходьба персонажа)
        const frameWidth = 64;
        const frameHeight = 64;
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];
        
        for (let i = 0; i < 5; i++) {
            const x = i * frameWidth;
            const y = 8;
            // Тело
            ctx.fillStyle = colors[i % colors.length];
            ctx.fillRect(x + 16, y + 20, 32, 40);
            // Голова
            ctx.fillStyle = '#ffd93d';
            ctx.fillRect(x + 22, y + 8, 20, 20);
            // Глаза
            ctx.fillStyle = '#2d3436';
            ctx.fillRect(x + 28, y + 14, 4, 4);
            ctx.fillRect(x + 36, y + 14, 4, 4);
            // Руки (анимация ходьбы)
            ctx.fillStyle = colors[i % colors.length];
            if (i % 2 === 0) {
                ctx.fillRect(x + 8, y + 28, 12, 8);
                ctx.fillRect(x + 44, y + 32, 12, 8);
            } else {
                ctx.fillRect(x + 8, y + 32, 12, 8);
                ctx.fillRect(x + 44, y + 28, 12, 8);
            }
            // Ноги
            ctx.fillRect(x + 20, y + 60, 8, 12);
            ctx.fillRect(x + 36, y + 60, 8, 12);
        }
    }
    
    function drawExampleAnimation() {
        const animCanvas = document.getElementById('exampleAnimCanvas');
        if (!animCanvas) return;
        animCanvas.width = 80;
        animCanvas.height = 80;
        let frame = 0;
        setInterval(() => {
            const ctx = animCanvas.getContext('2d');
            ctx.clearRect(0, 0, 80, 80);
            ctx.imageSmoothingEnabled = false;
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
            ctx.fillStyle = colors[frame % colors.length];
            ctx.fillRect(16, 20, 48, 48);
            ctx.fillStyle = '#ffd93d';
            ctx.fillRect(30, 8, 20, 20);
            ctx.fillStyle = '#2d3436';
            ctx.fillRect(35, 14, 4, 4);
            ctx.fillRect(41, 14, 4, 4);
            frame++;
        }, 200);
    }
    
    drawExampleSprite();
    drawExampleAnimation();

    // ---------- GIF Экспорт (с использованием gif.js) ----------
    function downloadAsGif() {
        if (animationSequence.length === 0) {
            warningMsg.innerText = "❌ Нет кадров для экспорта! Добавьте кадры в анимацию.";
            return;
        }
        
        warningMsg.innerText = "⏳ Создание GIF... Пожалуйста, подождите.";
        
        // Определяем размеры GIF (максимальный размер кадра)
        let maxWidth = 0, maxHeight = 0;
        for (let idx of animationSequence) {
            const frame = frames[idx];
            if (frame) {
                maxWidth = Math.max(maxWidth, frame.width);
                maxHeight = Math.max(maxHeight, frame.height);
            }
        }
        
        // Оптимальный размер для превью (не больше 300px)
        const scale = Math.min(300 / maxWidth, 300 / maxHeight, 3);
        const gifWidth = Math.floor(maxWidth * scale);
        const gifHeight = Math.floor(maxHeight * scale);
        
        // Создаем GIF
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: gifWidth,
            height: gifHeight,
            workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
        });
        
        // Добавляем кадры
        const delay = Math.floor(1000 / fps);
        let processedFrames = 0;
        
        for (let i = 0; i < animationSequence.length; i++) {
            const frameIdx = animationSequence[i];
            const sourceCanvas = frames[frameIdx];
            if (!sourceCanvas) continue;
            
            // Создаем временный canvas с нужным размером
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = gifWidth;
            tempCanvas.height = gifHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.imageSmoothingEnabled = false;
            
            // Рисуем с сохранением пропорций
            const w = sourceCanvas.width;
            const h = sourceCanvas.height;
            const scaleX = gifWidth / w;
            const scaleY = gifHeight / h;
            const drawScale = Math.min(scaleX, scaleY);
            const drawW = w * drawScale;
            const drawH = h * drawScale;
            const dx = (gifWidth - drawW) / 2;
            const dy = (gifHeight - drawH) / 2;
            
            tempCtx.drawImage(sourceCanvas, dx, dy, drawW, drawH);
            
            gif.addFrame(tempCanvas, { delay: delay, copy: true });
            processedFrames++;
        }
        
        gif.on('finished', function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pixelforge_animation_${Date.now()}.gif`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            warningMsg.innerText = "✅ GIF успешно создан и скачан!";
            setTimeout(() => {
                if (warningMsg.innerText.includes("успешно")) warningMsg.innerText = '';
            }, 3000);
        });
        
        gif.on('progress', function(p) {
            warningMsg.innerText = `⏳ Создание GIF: ${Math.round(p * 100)}%`;
        });
        
        gif.render();
    }
    
    // Привязываем кнопку скачивания
    if (downloadGifBtn) {
        downloadGifBtn.addEventListener('click', downloadAsGif);
    }

    // ---------- Остальная логика (без изменений) ----------
    function clearAnimationInterval() {
        if(currentAnimInterval) {
            clearInterval(currentAnimInterval);
            currentAnimInterval = null;
        }
        isPlaying = false;
    }

    function stopAnimation() {
        clearAnimationInterval();
        isPlaying = false;
        drawCurrentAnimationFrame();
    }

    function drawCurrentAnimationFrame() {
        if(!animationCanvas) return;
        if(animationSequence.length === 0) {
            ctxAnim.clearRect(0, 0, animationCanvas.width, animationCanvas.height);
            ctxAnim.fillStyle = "#0a0e1a";
            ctxAnim.fillRect(0,0, animationCanvas.width, animationCanvas.height);
            return;
        }
        let frameIdx = animationSequence[currentAnimFrameIdx % animationSequence.length];
        if(frames[frameIdx]) {
            let srcCanvas = frames[frameIdx];
            ctxAnim.clearRect(0, 0, animationCanvas.width, animationCanvas.height);
            let w = srcCanvas.width;
            let h = srcCanvas.height;
            let scale = Math.min(animationCanvas.width / w, animationCanvas.height / h);
            let nw = w * scale;
            let nh = h * scale;
            let dx = (animationCanvas.width - nw)/2;
            let dy = (animationCanvas.height - nh)/2;
            ctxAnim.drawImage(srcCanvas, dx, dy, nw, nh);
        } else {
            ctxAnim.clearRect(0,0, animationCanvas.width, animationCanvas.height);
        }
    }

    function startAnimation() {
        if(animationSequence.length === 0) {
            warningMsg.innerText = "⚠️ Добавьте хотя бы один кадр в последовательность!";
            return;
        }
        clearAnimationInterval();
        isPlaying = true;
        currentAnimFrameIdx = 0;
        drawCurrentAnimationFrame();
        currentAnimInterval = setInterval(() => {
            if(animationSequence.length === 0) {
                stopAnimation();
                return;
            }
            currentAnimFrameIdx = (currentAnimFrameIdx + 1) % animationSequence.length;
            drawCurrentAnimationFrame();
        }, 1000 / fps);
    }

    function renderSequenceList() {
        sequenceContainer.innerHTML = '';
        if(animationSequence.length === 0) {
            sequenceContainer.innerHTML = '<div style="color:#7d85b5; text-align:center; width:100%;">✨ Анимация пуста. Кликни на кадры, чтобы добавить</div>';
            drawCurrentAnimationFrame();
            return;
        }
        for(let i = 0; i < animationSequence.length; i++) {
            const frameId = animationSequence[i];
            const frameCanvas = frames[frameId];
            if(!frameCanvas) continue;
            const wrapper = document.createElement('div');
            wrapper.className = 'seq-item';
            const idxSpan = document.createElement('div');
            idxSpan.className = 'badge-index';
            idxSpan.innerText = `#${frameId}`;
            const miniCanvas = document.createElement('canvas');
            miniCanvas.width = frameCanvas.width;
            miniCanvas.height = frameCanvas.height;
            let ctxMini = miniCanvas.getContext('2d');
            ctxMini.drawImage(frameCanvas, 0, 0);
            miniCanvas.style.width = '52px';
            miniCanvas.style.height = 'auto';
            const btnGroup = document.createElement('div');
            btnGroup.className = 'seq-controls';
            const upBtn = document.createElement('button');
            upBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            upBtn.title = 'Вверх';
            upBtn.onclick = (e) => {
                e.stopPropagation();
                if(i > 0) {
                    [animationSequence[i-1], animationSequence[i]] = [animationSequence[i], animationSequence[i-1]];
                    renderSequenceList();
                    if(isPlaying) { restartAnimation(); }
                    else { drawCurrentAnimationFrame(); }
                }
            };
            const downBtn = document.createElement('button');
            downBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
            downBtn.onclick = (e) => {
                e.stopPropagation();
                if(i < animationSequence.length-1) {
                    [animationSequence[i+1], animationSequence[i]] = [animationSequence[i], animationSequence[i+1]];
                    renderSequenceList();
                    if(isPlaying) { restartAnimation(); }
                    else { drawCurrentAnimationFrame(); }
                }
            };
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<i class="fas fa-trash"></i>';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                animationSequence.splice(i,1);
                renderSequenceList();
                if(animationSequence.length === 0) stopAnimation();
                else if(isPlaying) restartAnimation();
                else drawCurrentAnimationFrame();
            };
            btnGroup.append(upBtn, downBtn, delBtn);
            wrapper.append(idxSpan, miniCanvas, btnGroup);
            sequenceContainer.appendChild(wrapper);
        }
        drawCurrentAnimationFrame();
    }

    function restartAnimation() {
        if(isPlaying) {
            stopAnimation();
            startAnimation();
        }
    }

    function renderFramesGallery() {
        framesContainer.innerHTML = '';
        if(!frames.length) {
            framesContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center;">Нет кадров. Загрузите спрайт и нажмите "Разрезать"</div>';
            frameCountBadge.innerText = '0';
            return;
        }
        frameCountBadge.innerText = frames.length;
        frames.forEach((frameCanvas, idx) => {
            const card = document.createElement('div');
            card.className = 'frame-card';
            const canvasCopy = document.createElement('canvas');
            canvasCopy.width = frameCanvas.width;
            canvasCopy.height = frameCanvas.height;
            let ctxCopy = canvasCopy.getContext('2d');
            ctxCopy.drawImage(frameCanvas, 0, 0);
            canvasCopy.style.width = '100%';
            canvasCopy.style.height = 'auto';
            const label = document.createElement('div');
            label.className = 'frame-label';
            label.innerText = `кадр ${idx}`;
            card.appendChild(canvasCopy);
            card.appendChild(label);
            card.addEventListener('click', () => {
                animationSequence.push(idx);
                renderSequenceList();
                if(isPlaying) restartAnimation();
                warningMsg.innerText = `➕ Кадр ${idx} добавлен в анимацию`;
                setTimeout(()=>{ if(warningMsg.innerText.includes('добавлен')) warningMsg.innerText = '';}, 1500);
            });
            framesContainer.appendChild(card);
        });
    }

    function generateFramesFromImage() {
        if(!originalImage) {
            warningMsg.innerText = "Изображение не загружено";
            return false;
        }
        const cols = parseInt(colsInput.value, 10);
        const rows = parseInt(rowsInput.value, 10);
        if(isNaN(cols) || isNaN(rows) || cols < 1 || rows < 1) {
            warningMsg.innerText = "Кол-во строк/столбцов должно быть >=1";
            return false;
        }
        const imgW = originalImage.width;
        const imgH = originalImage.height;
        const frameW = imgW / cols;
        const frameH = imgH / rows;
        if(!Number.isInteger(frameW) || !Number.isInteger(frameH)) {
            warningMsg.innerText = `⚠️ Внимание: кадры получатся дробными (${frameW.toFixed(1)}x${frameH.toFixed(1)}). Рекомендуем использовать спрайт, где размеры кратны сетке.`;
        } else {
            warningMsg.innerText = `✓ Кадры ${Math.floor(frameW)}x${Math.floor(frameH)} пикс. Всего кадров: ${cols*rows}`;
        }
        const newFrames = [];
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imgW;
        tempCanvas.height = imgH;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(originalImage, 0, 0);
        
        for(let row = 0; row < rows; row++) {
            for(let col = 0; col < cols; col++) {
                const sx = col * frameW;
                const sy = row * frameH;
                const sw = frameW;
                const sh = frameH;
                const frameCanvas = document.createElement('canvas');
                frameCanvas.width = sw;
                frameCanvas.height = sh;
                const fCtx = frameCanvas.getContext('2d');
                fCtx.drawImage(tempCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
                newFrames.push(frameCanvas);
            }
        }
        frames = newFrames;
        animationSequence = [];
        renderFramesGallery();
        renderSequenceList();
        if(isPlaying) stopAnimation();
        drawCurrentAnimationFrame();
        return true;
    }

    function loadImageFromFile(file) {
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                spriteControls.style.display = 'flex';
                galleryPanel.style.display = 'block';
                animationPanel.style.display = 'block';
                warningMsg.innerText = `✅ Загружено: ${img.width}x${img.height} px. Укажите сетку кадров (столбцы/строки) и нажмите "Разрезать".`;
                if(img.width / img.height > 1.5) colsInput.value = 4;
                if(img.height > img.width) rowsInput.value = 2;
                frames = [];
                animationSequence = [];
                renderFramesGallery();
                renderSequenceList();
                stopAnimation();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Event listeners
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#b3a6ff';
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'rgba(150, 170, 255, 0.5)';
    });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'rgba(150, 170, 255, 0.5)';
        const file = e.dataTransfer.files[0];
        if(file && file.type === 'image/png') {
            loadImageFromFile(file);
        } else {
            warningMsg.innerText = "Пожалуйста, загрузите PNG изображение (пиксель-арт).";
        }
    });
    fileInput.addEventListener('change', (e) => {
        if(e.target.files.length) loadImageFromFile(e.target.files[0]);
    });

    applySplitBtn.addEventListener('click', () => {
        if(originalImage) {
            generateFramesFromImage();
        } else {
            warningMsg.innerText = "Сначала загрузите изображение!";
        }
    });

    addAllFramesBtn.addEventListener('click', () => {
        if(frames.length === 0) {
            warningMsg.innerText = "Нет кадров. Сначала нарежьте спрайт!";
            return;
        }
        for(let i=0; i<frames.length; i++) animationSequence.push(i);
        renderSequenceList();
        if(isPlaying) restartAnimation();
        else drawCurrentAnimationFrame();
        warningMsg.innerText = `➕ Все ${frames.length} кадров добавлены в последовательность.`;
        setTimeout(()=>{ if(warningMsg.innerText.includes('Все')) warningMsg.innerText = '';}, 2000);
    });

    function clearSequence() {
        animationSequence = [];
        renderSequenceList();
        stopAnimation();
        drawCurrentAnimationFrame();
        warningMsg.innerText = "🧹 Анимация очищена.";
        setTimeout(()=>{ if(warningMsg.innerText.includes('очищена')) warningMsg.innerText = '';}, 1200);
    }
    clearSeqBtn.addEventListener('click', clearSequence);
    clearSequenceBtnSmall.addEventListener('click', clearSequence);

    playAnimBtn.addEventListener('click', () => {
        if(animationSequence.length === 0) {
            warningMsg.innerText = "Нет кадров в последовательности! Добавьте кадры из галереи.";
            return;
        }
        startAnimation();
    });
    stopAnimBtn.addEventListener('click', stopAnimation);
    
    fpsSlider.addEventListener('input', (e) => {
        fps = parseInt(e.target.value, 10);
        fpsValue.innerText = fps;
        if(isPlaying) {
            restartAnimation();
        }
    });
    
    animationCanvas.width = 240;
    animationCanvas.height = 240;
    ctxAnim.imageSmoothingEnabled = false;
    drawCurrentAnimationFrame();
})();