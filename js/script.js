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
        
        const frameWidth = 64;
        const frameHeight = 64;
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9'];
        
        for (let i = 0; i < 5; i++) {
            const x = i * frameWidth;
            const y = 8;
            ctx.fillStyle = colors[i % colors.length];
            ctx.fillRect(x + 16, y + 20, 32, 40);
            ctx.fillStyle = '#ffd93d';
            ctx.fillRect(x + 22, y + 8, 20, 20);
            ctx.fillStyle = '#2d3436';
            ctx.fillRect(x + 28, y + 14, 4, 4);
            ctx.fillRect(x + 36, y + 14, 4, 4);
            ctx.fillStyle = colors[i % colors.length];
            if (i % 2 === 0) {
                ctx.fillRect(x + 8, y + 28, 12, 8);
                ctx.fillRect(x + 44, y + 32, 12, 8);
            } else {
                ctx.fillRect(x + 8, y + 32, 12, 8);
                ctx.fillRect(x + 44, y + 28, 12, 8);
            }
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

    // ---------- ЭКСПОРТ В GIF с помощью gifshot ----------
    async function exportAsGIF() {
        if (animationSequence.length === 0) {
            warningMsg.innerText = "❌ Нет кадров для экспорта! Добавьте кадры в анимацию.";
            return;
        }
        
        warningMsg.innerHTML = "🎨 Создание GIF... <span id='gifProgress'>0%</span>";
        
        // Собираем выбранные кадры
        const selectedFrames = [];
        for (let idx of animationSequence) {
            const frame = frames[idx];
            if (frame) selectedFrames.push(frame);
        }
        
        if (selectedFrames.length === 0) {
            warningMsg.innerText = "❌ Нет валидных кадров!";
            return;
        }
        
        // Определяем единый размер для всех кадров
        let maxWidth = 0, maxHeight = 0;
        for (let frame of selectedFrames) {
            maxWidth = Math.max(maxWidth, frame.width);
            maxHeight = Math.max(maxHeight, frame.height);
        }
        
        // Ограничиваем размер GIF (не больше 500px)
        const maxGifSize = 500;
        let scale = 1;
        if (maxWidth > maxGifSize || maxHeight > maxGifSize) {
            scale = Math.min(maxGifSize / maxWidth, maxGifSize / maxHeight);
        }
        
        const gifWidth = Math.floor(maxWidth * scale);
        const gifHeight = Math.floor(maxHeight * scale);
        
        // Подготавливаем изображения для GIF
        const images = [];
        
        for (let i = 0; i < selectedFrames.length; i++) {
            const frame = selectedFrames[i];
            
            // Создаем новый canvas для каждого кадра
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = gifWidth;
            frameCanvas.height = gifHeight;
            const frameCtx = frameCanvas.getContext('2d');
            
            // Очищаем canvas (важно!)
            frameCtx.clearRect(0, 0, gifWidth, gifHeight);
            
            // Заливаем черным фоном (или можно прозрачным)
            frameCtx.fillStyle = '#000000';
            frameCtx.fillRect(0, 0, gifWidth, gifHeight);
            
            const drawScale = Math.min(gifWidth / frame.width, gifHeight / frame.height);
            const drawW = frame.width * drawScale;
            const drawH = frame.height * drawScale;
            const dx = (gifWidth - drawW) / 2;
            const dy = (gifHeight - drawH) / 2;
            
            frameCtx.drawImage(frame, dx, dy, drawW, drawH);
            
            // Конвертируем в Image
            const img = new Image();
            img.src = frameCanvas.toDataURL();
            await new Promise((resolve) => {
                img.onload = resolve;
            });
            images.push(img);
            
            const progress = Math.round(((i + 1) / selectedFrames.length) * 50);
            const progressSpan = document.getElementById('gifProgress');
            if (progressSpan) progressSpan.innerText = `${progress}%`;
        }
        
        // Создаем GIF с помощью gifshot
        const frameDelay = Math.floor(1000 / fps);
        
        // Используем fallback для GIF с правильной очисткой
        const options = {
            images: images,
            gifWidth: gifWidth,
            gifHeight: gifHeight,
            frameDuration: frameDelay / 10,
            numWorkers: 2,
            sampleInterval: 10,
            transparent: null, // Отключаем прозрачность
            backgroundColor: '#000000' // Черный фон
        };
        
        gifshot.createGIF(options, (obj) => {
            if (!obj.error) {
                const progressSpan = document.getElementById('gifProgress');
                if (progressSpan) progressSpan.innerText = `100%`;
                
                const url = obj.image;
                const a = document.createElement('a');
                a.href = url;
                a.download = `pixelforge_animation_${Date.now()}.gif`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                warningMsg.innerHTML = "✅ GIF успешно создан и скачан!";
                setTimeout(() => {
                    if (warningMsg.innerHTML.includes("успешно")) warningMsg.innerHTML = '';
                }, 3000);
            } else {
                console.error('GIF Error:', obj.error);
                warningMsg.innerHTML = "❌ Ошибка создания GIF. Попробуйте WebM формат.";
            }
        });
    }
    
    // ---------- ЭКСПОРТ В WEBM (запасной вариант) ----------
    async function exportAsWebM() {
        if (animationSequence.length === 0) {
            warningMsg.innerText = "❌ Нет кадров для экспорта! Добавьте кадры в анимацию.";
            return;
        }
        
        warningMsg.innerHTML = "⏳ Создание WebM видео... <span id='webmProgress'>0%</span>";
        
        const framesList = [];
        let maxWidth = 0, maxHeight = 0;
        
        for (let idx of animationSequence) {
            const frame = frames[idx];
            if (frame) {
                maxWidth = Math.max(maxWidth, frame.width);
                maxHeight = Math.max(maxHeight, frame.height);
                framesList.push(frame);
            }
        }
        
        if (framesList.length === 0) {
            warningMsg.innerText = "❌ Нет валидных кадров для экспорта!";
            return;
        }
        
        const maxSize = 800;
        let scale = 1;
        if (maxWidth > maxSize || maxHeight > maxSize) {
            scale = Math.min(maxSize / maxWidth, maxSize / maxHeight);
        }
        
        const videoWidth = Math.floor(maxWidth * scale);
        const videoHeight = Math.floor(maxHeight * scale);
        
        const preparedFrames = [];
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoWidth;
        tempCanvas.height = videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.imageSmoothingEnabled = false;
        
        for (let i = 0; i < framesList.length; i++) {
            const frame = framesList[i];
            tempCtx.clearRect(0, 0, videoWidth, videoHeight);
            
            const drawScale = Math.min(videoWidth / frame.width, videoHeight / frame.height);
            const drawW = frame.width * drawScale;
            const drawH = frame.height * drawScale;
            const dx = (videoWidth - drawW) / 2;
            const dy = (videoHeight - drawH) / 2;
            
            tempCtx.drawImage(frame, dx, dy, drawW, drawH);
            
            const clonedCanvas = document.createElement('canvas');
            clonedCanvas.width = videoWidth;
            clonedCanvas.height = videoHeight;
            clonedCanvas.getContext('2d').drawImage(tempCanvas, 0, 0);
            preparedFrames.push(clonedCanvas);
            
            const progress = Math.round(((i + 1) / framesList.length) * 100);
            const progressSpan = document.getElementById('webmProgress');
            if (progressSpan) progressSpan.innerText = `${progress}%`;
            
            await new Promise(r => setTimeout(r, 5));
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        
        const stream = canvas.captureStream(fps);
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm',
            videoBitsPerSecond: 5000000
        });
        
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `pixelforge_animation_${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            warningMsg.innerHTML = "✅ Видео WebM успешно создано!";
            setTimeout(() => {
                if (warningMsg.innerHTML.includes("успешно")) warningMsg.innerHTML = '';
            }, 3000);
        };
        
        mediaRecorder.start();
        
        let frameIndex = 0;
        const interval = setInterval(() => {
            if (frameIndex >= preparedFrames.length) {
                clearInterval(interval);
                mediaRecorder.stop();
                return;
            }
            ctx.clearRect(0, 0, videoWidth, videoHeight);
            ctx.drawImage(preparedFrames[frameIndex], 0, 0);
            frameIndex++;
        }, 1000 / fps);
    }
    
    // ---------- ЭКСПОРТ В PNG СПРАЙТ-ЛИСТ ----------
    function exportAsPNGSequence() {
        if (animationSequence.length === 0) {
            warningMsg.innerText = "❌ Нет кадров для экспорта! Добавьте кадры в анимацию.";
            return;
        }
        
        warningMsg.innerText = "📦 Создание PNG спрайт-листа...";
        
        const selectedFrames = [];
        for (let idx of animationSequence) {
            const frame = frames[idx];
            if (frame) selectedFrames.push(frame);
        }
        
        if (selectedFrames.length === 0) {
            warningMsg.innerText = "❌ Нет валидных кадров!";
            return;
        }
        
        const frameWidth = selectedFrames[0].width;
        const frameHeight = selectedFrames[0].height;
        const framesPerRow = Math.min(4, selectedFrames.length);
        const rows = Math.ceil(selectedFrames.length / framesPerRow);
        
        const spriteSheet = document.createElement('canvas');
        spriteSheet.width = frameWidth * framesPerRow;
        spriteSheet.height = frameHeight * rows;
        const ctx = spriteSheet.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        
        for (let i = 0; i < selectedFrames.length; i++) {
            const col = i % framesPerRow;
            const row = Math.floor(i / framesPerRow);
            const x = col * frameWidth;
            const y = row * frameHeight;
            ctx.drawImage(selectedFrames[i], x, y);
        }
        
        const link = document.createElement('a');
        link.download = `pixelforge_spritesheet_${Date.now()}.png`;
        link.href = spriteSheet.toDataURL('image/png');
        link.click();
        
        warningMsg.innerText = "✅ PNG спрайт-лист успешно скачан!";
        setTimeout(() => {
            if (warningMsg.innerText.includes("успешно")) warningMsg.innerText = '';
        }, 3000);
    }
    
    // ---------- ЭКСПОРТ В ОТДЕЛЬНЫЕ PNG ----------
    function exportAsIndividualPNGs() {
        if (animationSequence.length === 0) {
            warningMsg.innerText = "❌ Нет кадров для экспорта!";
            return;
        }
        
        warningMsg.innerText = "📸 Скачивание отдельных PNG...";
        
        const selectedFrames = [];
        for (let idx of animationSequence) {
            const frame = frames[idx];
            if (frame) selectedFrames.push(frame);
        }
        
        function downloadNext(index) {
            if (index >= selectedFrames.length) {
                warningMsg.innerText = `✅ Скачано ${selectedFrames.length} PNG файлов!`;
                setTimeout(() => {
                    if (warningMsg.innerText.includes("Скачано")) warningMsg.innerText = '';
                }, 3000);
                return;
            }
            
            const frame = selectedFrames[index];
            const link = document.createElement('a');
            link.download = `frame_${String(index).padStart(3, '0')}.png`;
            link.href = frame.toDataURL('image/png');
            link.click();
            
            setTimeout(() => downloadNext(index + 1), 100);
        }
        
        downloadNext(0);
    }
    
    // ---------- ДОБАВЛЯЕМ НОВЫЕ КНОПКИ В ИНТЕРФЕЙС ----------
    function addExportButtons() {
        const previewBlock = document.querySelector('.preview-block');
        if (!previewBlock) return;
        
        const oldExportContainer = previewBlock.querySelector('.export-container');
        if (oldExportContainer) {
            oldExportContainer.remove();
        }
        
        const exportContainer = document.createElement('div');
        exportContainer.className = 'export-container';
        exportContainer.style.marginTop = '15px';
        exportContainer.style.display = 'flex';
        exportContainer.style.flexDirection = 'column';
        exportContainer.style.gap = '8px';
        
        const exportTitle = document.createElement('div');
        exportTitle.style.fontSize = '0.8rem';
        exportTitle.style.color = '#a78bfa';
        exportTitle.style.marginBottom = '5px';
        exportTitle.innerHTML = '<i class="fas fa-download"></i> Экспорт анимации:';
        
        const btnGIF = document.createElement('button');
        btnGIF.innerHTML = '<i class="fas fa-file-image"></i> Скачать как GIF';
        btnGIF.style.background = 'linear-gradient(105deg, #059669, #047857)';
        btnGIF.style.width = '100%';
        btnGIF.onclick = exportAsGIF;
        
        const btnWebM = document.createElement('button');
        btnWebM.innerHTML = '<i class="fas fa-video"></i> Скачать WebM (видео)';
        btnWebM.style.background = 'linear-gradient(105deg, #2563eb, #1d4ed8)';
        btnWebM.style.width = '100%';
        btnWebM.onclick = exportAsWebM;
        
        const btnSpriteSheet = document.createElement('button');
        btnSpriteSheet.innerHTML = '<i class="fas fa-table"></i> Скачать PNG спрайт-лист';
        btnSpriteSheet.style.background = 'linear-gradient(105deg, #d97706, #b45309)';
        btnSpriteSheet.style.width = '100%';
        btnSpriteSheet.onclick = exportAsPNGSequence;
        
        const btnIndividual = document.createElement('button');
        btnIndividual.innerHTML = '<i class="fas fa-images"></i> Скачать отдельные PNG';
        btnIndividual.style.background = 'linear-gradient(105deg, #7c3aed, #6d28d9)';
        btnIndividual.style.width = '100%';
        btnIndividual.onclick = exportAsIndividualPNGs;
        
        exportContainer.appendChild(exportTitle);
        exportContainer.appendChild(btnGIF);
        exportContainer.appendChild(btnWebM);
        exportContainer.appendChild(btnSpriteSheet);
        exportContainer.appendChild(btnIndividual);
        
        const existingButtons = previewBlock.querySelector('div[style*="display: flex; gap: 12px; justify-content: center;"]');
        if (existingButtons) {
            existingButtons.after(exportContainer);
        } else {
            previewBlock.appendChild(exportContainer);
        }
    }
    
    // Переопределяем старую кнопку на GIF
    if (downloadGifBtn) {
        const oldBtnClone = downloadGifBtn.cloneNode(true);
        downloadGifBtn.parentNode.replaceChild(oldBtnClone, downloadGifBtn);
        const newDownloadBtn = document.getElementById('downloadGifBtn');
        if (newDownloadBtn) {
            newDownloadBtn.onclick = exportAsGIF;
            newDownloadBtn.innerHTML = '<i class="fas fa-download"></i> Скачать GIF';
        }
    }
    
    setTimeout(addExportButtons, 100);

    // ---------- ОСНОВНАЯ ЛОГИКА АНИМАЦИИ ----------
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