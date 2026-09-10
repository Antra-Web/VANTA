/**
 * VANTA Streamlined Canvas Sequence Engine
 * Instant ~1s first visual, progressive background frame streaming, 60FPS scroll lerp.
 */

class VantaCanvasEngine {
  constructor(options) {
    this.canvas = document.getElementById(options.canvasId);
    this.ctx = this.canvas.getContext('2d', { alpha: false }); // Disable alpha channel for GPU rendering optimization
    this.totalSections = 8;
    this.framesPerSection = 47;
    this.totalFrames = this.totalSections * this.framesPerSection; // 376 frames

    this.images = new Array(this.totalFrames);
    this.loadedStatus = new Uint8Array(this.totalFrames); // 0: unloaded, 1: loading, 2: loaded
    
    this.targetFrame = 0;
    this.currentFrame = 0;
    this.lastDrawnFrame = -1;
    this.lerpSpeed = 0.25; // Instant high-responsiveness for 60FPS scroll

    this.onFirstFrameReady = options.onFirstFrameReady || (() => {});
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // 1. Instantly load initial 5 frames for < 1s first render
    this.loadInitialPriorityFrames();

    // 2. Start RAF render loop immediately
    this.startRenderLoop();

    // 3. Start progressive background streamer
    this.startProgressiveStreamer();
  }

  resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x DPR for maximum performance
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'medium';
    this.ctx.scale(dpr, dpr);
    this.lastDrawnFrame = -1; // Force immediate re-render
  }

  getFramePath(index) {
    const sectionNum = Math.floor(index / 47) + 1;
    const frameNum = index % 47;
    const secStr = String(sectionNum).padStart(2, '0');
    const frameStr = String(frameNum).padStart(3, '0');
    return `section_${secStr}/frame_${frameStr}.jpg`;
  }

  loadInitialPriorityFrames() {
    // Load initial 5 frames immediately
    const priorityCount = 5;

    for (let i = 0; i < priorityCount; i++) {
      this.fetchFrame(i).then(() => {
        if (i === 0) {
          // Render frame 0 INSTANTLY as soon as frame 0 arrives (< 1s first visual)
          this.renderFrame(0);
          this.onFirstFrameReady();
        }
      });
    }
  }

  fetchFrame(index) {
    if (index < 0 || index >= this.totalFrames) return Promise.resolve(null);
    if (this.loadedStatus[index] === 2) return Promise.resolve(this.images[index]);
    if (this.loadedStatus[index] === 1) return Promise.resolve(null);

    this.loadedStatus[index] = 1;
    const path = this.getFramePath(index);
    const img = new Image();

    return new Promise((resolve) => {
      img.onload = () => {
        if ('decode' in img) {
          img.decode().then(() => {
            this.images[index] = img;
            this.loadedStatus[index] = 2;
            resolve(img);
          }).catch(() => {
            this.images[index] = img;
            this.loadedStatus[index] = 2;
            resolve(img);
          });
        } else {
          this.images[index] = img;
          this.loadedStatus[index] = 2;
          resolve(img);
        }
      };
      img.onerror = () => {
        this.loadedStatus[index] = 0;
        resolve(null);
      };
      img.src = path;
    });
  }

  startProgressiveStreamer() {
    let isStreaming = false;

    const streamNext = () => {
      if (isStreaming) return;
      isStreaming = true;

      const cur = Math.round(this.currentFrame);
      let targetToLoad = -1;

      // Priority 1: Check +/- 20 frames around current scroll position
      for (let offset = 0; offset <= 20; offset++) {
        const ahead = cur + offset;
        const behind = cur - offset;
        if (ahead < this.totalFrames && this.loadedStatus[ahead] === 0) {
          targetToLoad = ahead;
          break;
        }
        if (behind >= 0 && this.loadedStatus[behind] === 0) {
          targetToLoad = behind;
          break;
        }
      }

      // Priority 2: Sequential sweep
      if (targetToLoad === -1) {
        for (let i = 0; i < this.totalFrames; i++) {
          if (this.loadedStatus[i] === 0) {
            targetToLoad = i;
            break;
          }
        }
      }

      if (targetToLoad !== -1) {
        this.fetchFrame(targetToLoad).then(() => {
          isStreaming = false;
          setTimeout(streamNext, 5);
        });
      } else {
        isStreaming = false;
      }
    };

    setInterval(streamNext, 25);
  }

  updateScrollProgress(progressRatio) {
    const clampedProgress = Math.max(0, Math.min(1, progressRatio));
    this.targetFrame = clampedProgress * (this.totalFrames - 1);
  }

  findNearestLoadedFrame(index) {
    const target = Math.round(index);
    if (this.loadedStatus[target] === 2) return target;

    for (let r = 1; r < 60; r++) {
      if (target - r >= 0 && this.loadedStatus[target - r] === 2) return target - r;
      if (target + r < this.totalFrames && this.loadedStatus[target + r] === 2) return target + r;
    }
    return 0;
  }

  startRenderLoop() {
    const render = () => {
      const diff = this.targetFrame - this.currentFrame;
      if (Math.abs(diff) > 0.01) {
        this.currentFrame += diff * this.lerpSpeed;
      } else {
        this.currentFrame = this.targetFrame;
      }

      const frameToDraw = this.findNearestLoadedFrame(this.currentFrame);
      if (frameToDraw !== this.lastDrawnFrame) {
        this.renderFrame(frameToDraw);
        this.lastDrawnFrame = frameToDraw;
      }

      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  renderFrame(index) {
    const img = this.images[index];
    if (!img) return;

    const vw = this.width;
    const vh = this.height;
    const imgW = img.naturalWidth || 960;
    const imgH = img.naturalHeight || 540;

    const imgRatio = imgW / imgH;
    const screenRatio = vw / vh;

    let drawW, drawH, drawX, drawY;

    if (screenRatio > imgRatio) {
      drawW = vw;
      drawH = vw / imgRatio;
      drawX = 0;
      drawY = (vh - drawH) / 2;
    } else {
      drawH = vh;
      drawW = vh * imgRatio;
      drawX = (vw - drawW) / 2;
      drawY = 0;
    }

    this.ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }
}

window.VantaCanvasEngine = VantaCanvasEngine;
