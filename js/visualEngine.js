// Visual Effects Engine
class VisualEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        this.isRunning = false;

        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Algorithm settings
        this.algorithm = 'rotoZoom';
        this.showWaveform = true;
        this.showBars = false;

        // Visual state
        this.rotation = 0;
        this.zoom = 1;
        this.time = 0;
        this.currentImage = null;
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    initAudio(audioElement) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (!this.analyser) {
            const source = this.audioContext.createMediaElementAudioSource(audioElement);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    setImage(img) {
        this.currentImage = img;
    }

    setAlgorithm(algo) {
        this.algorithm = algo;
    }

    setShowWaveform(show) {
        this.showWaveform = show;
    }

    setShowBars(show) {
        this.showBars = show;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    animate = () => {
        if (!this.isRunning) return;

        // Get audio data
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.dataArray);
        } else {
            this.dataArray = new Uint8Array(128).fill(0);
        }

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw based on selected algorithm
        switch (this.algorithm) {
            case 'rotoZoom':
                this.drawRotoZoom();
                break;
            case 'tunnel':
                this.drawTunnel();
                break;
            case 'wave':
                this.drawWave();
                break;
            case 'kaleidoscope':
                this.drawKaleidoscope();
                break;
            case 'vhs':
                this.drawVHS();
                break;
        }

        // Draw overlays
        if (this.showWaveform) this.drawWaveform();
        if (this.showBars) this.drawFrequencyBars();

        this.time += 0.016; // ~60fps
        this.rotation += 0.02;
        this.zoom = 1 + Math.sin(this.time * 0.5) * 0.3;

        this.animationId = requestAnimationFrame(this.animate);
    };

    drawRotoZoom() {
        if (!this.currentImage) {
            this.drawDefaultRotoZoom();
            return;
        }

        const w = this.canvas.width;
        const h = this.canvas.height;
        const centerX = w / 2;
        const centerY = h / 2;

        // Save context state
        this.ctx.save();

        // Translate to center
        this.ctx.translate(centerX, centerY);

        // Rotate
        this.ctx.rotate(this.rotation);

        // Scale based on audio
        const audioLevel = (this.dataArray[0] || 0) / 255;
        this.ctx.scale(this.zoom + audioLevel * 0.5, this.zoom + audioLevel * 0.5);

        // Draw image centered
        this.ctx.drawImage(this.currentImage, -this.currentImage.width / 2, -this.currentImage.height / 2);

        this.ctx.restore();
    }

    drawDefaultRotoZoom() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const centerX = w / 2;
        const centerY = h / 2;
        const radius = Math.min(w, h) / 2;

        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.rotation);

        // Draw rotating spiral pattern
        this.ctx.strokeStyle = `rgba(0, 255, 136, ${0.3 + (this.dataArray[0] || 0) / 255 * 0.5})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        for (let i = 0; i < 200; i++) {
            const angle = (i / 20) + this.time;
            const r = (i / 200) * radius;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawTunnel() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const centerX = w / 2;
        const centerY = h / 2;

        const audioLevel = (this.dataArray[0] || 0) / 255;

        for (let i = 0; i < 30; i++) {
            const size = (i / 30) * Math.max(w, h) * (1 + audioLevel * 0.5);
            const alpha = 1 - (i / 30);

            this.ctx.strokeStyle = `rgba(0, 255, 136, ${alpha * 0.3})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            const rotation = this.rotation + i * 0.1;
            const corners = 4 + Math.floor((this.dataArray[i % this.dataArray.length] || 0) / 255 * 4);

            for (let j = 0; j <= corners; j++) {
                const angle = (j / corners) * Math.PI * 2 + rotation;
                const x = centerX + Math.cos(angle) * size;
                const y = centerY + Math.sin(angle) * size;
                if (j === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }

    drawWave() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.strokeStyle = `rgba(0, 255, 136, 0.6)`;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        for (let x = 0; x < w; x += 2) {
            const dataIndex = Math.floor((x / w) * this.dataArray.length);
            const audioValue = (this.dataArray[dataIndex] || 0) / 255;
            const waveOffset = Math.sin((x / w - this.time * 0.3) * Math.PI * 4) * 20;
            const y = h / 2 + audioValue * h / 3 + waveOffset;

            if (x === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();

        // Mirror wave at bottom
        this.ctx.beginPath();
        for (let x = 0; x < w; x += 2) {
            const dataIndex = Math.floor((x / w) * this.dataArray.length);
            const audioValue = (this.dataArray[dataIndex] || 0) / 255;
            const waveOffset = Math.sin((x / w - this.time * 0.3) * Math.PI * 4) * 20;
            const y = h / 2 - audioValue * h / 3 - waveOffset;

            if (x === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
    }

    drawKaleidoscope() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const centerX = w / 2;
        const centerY = h / 2;

        const segments = 8;
        const audioLevel = (this.dataArray[0] || 0) / 255;

        for (let seg = 0; seg < segments; seg++) {
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate((seg / segments) * Math.PI * 2);

            // Draw triangular segment
            this.ctx.fillStyle = `rgba(0, 255, 136, ${0.1 + audioLevel * 0.2})`;
            this.ctx.strokeStyle = `rgba(0, 255, 136, ${0.5 + audioLevel * 0.3})`;
            this.ctx.lineWidth = 2;

            const radius = Math.min(w, h) / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(radius * Math.cos(Math.PI / 4 + this.time * 0.5), radius * Math.sin(Math.PI / 4 + this.time * 0.5));
            this.ctx.lineTo(radius * Math.cos(-Math.PI / 4 + this.time * 0.5), radius * Math.sin(-Math.PI / 4 + this.time * 0.5));
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.restore();
        }
    }

    drawVHS() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        const glitchStrength = (this.dataArray[0] || 0) / 255;

        // Horizontal glitch lines
        for (let i = 0; i < 5; i++) {
            const y = Math.random() * h;
            const glitchOffset = (Math.random() - 0.5) * glitchStrength * 50;
            const glitchHeight = Math.random() * 10 + 2;

            this.ctx.fillStyle = `rgba(255, 0, 255, ${Math.random() * 0.3})`;
            this.ctx.fillRect(glitchOffset, y, w, glitchHeight);
        }

        // Color shift channels
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        this.ctx.fillRect(Math.random() * 20 - 10, 0, w, h);
        this.ctx.globalCompositeOperation = 'screen';
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.fillRect(Math.random() * 20 - 10, 0, w, h);
        this.ctx.globalCompositeOperation = 'source-over';

        // Draw waveform on top
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let x = 0; x < w; x += 2) {
            const dataIndex = Math.floor((x / w) * this.dataArray.length);
            const audioValue = (this.dataArray[dataIndex] || 0) / 255;
            const y = h / 2 + audioValue * h / 4;
            if (x === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
    }

    drawWaveform() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        for (let x = 0; x < w; x += 2) {
            const dataIndex = Math.floor((x / w) * this.dataArray.length);
            const audioValue = (this.dataArray[dataIndex] || 0) / 255;
            const y = h - audioValue * 40 - 20;

            if (x === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
    }

    drawFrequencyBars() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const barWidth = w / this.dataArray.length;

        for (let i = 0; i < this.dataArray.length; i++) {
            const audioValue = this.dataArray[i] / 255;
            const x = i * barWidth;
            const barHeight = audioValue * h / 3;

            this.ctx.fillStyle = `hsl(${(i / this.dataArray.length) * 360}, 100%, 50%)`;
            this.ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
        }
    }
}
