// Main Application
class MediaVisualizer {
    constructor() {
        this.state = {
            isPlaying: false,
            currentIndex: 0,
            playlist: [],
            enabledItems: new Set(),
            visualAlgorithm: 'rotoZoom',
            showWaveform: true,
            showBars: false,
        };

        this.drive = new DriveIntegration();
        this.visualEngine = new VisualEngine('visualCanvas');
        this.audio = document.getElementById('audioPlayer');
        this.videoContainer = document.getElementById('videoContainer');

        this.initializeUI();
        this.loadSettings();
    }

    initializeUI() {
        // View toggles
        document.getElementById('adminToggle').addEventListener('click', () => this.showAdmin());
        document.getElementById('backBtn').addEventListener('click', () => this.showPlayer());

        // Player controls
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('progressSlider').addEventListener('change', (e) => this.seek(e.target.value / 100));
        document.getElementById('volumeSlider').addEventListener('input', (e) => this.setVolume(e.target.value / 100));

        // Admin controls
        document.getElementById('authorizeBtn').addEventListener('click', () => this.authorize());
        document.getElementById('syncLinksBtn').addEventListener('click', () => this.syncLinks());

        // Algorithm selection
        document.getElementById('visualAlgorithm').addEventListener('change', (e) => {
            this.state.visualAlgorithm = e.target.value;
            this.visualEngine.setAlgorithm(e.target.value);
            this.saveSettings();
        });

        document.getElementById('showWaveform').addEventListener('change', (e) => {
            this.state.showWaveform = e.target.checked;
            this.visualEngine.setShowWaveform(e.target.checked);
            this.saveSettings();
        });

        document.getElementById('showBars').addEventListener('change', (e) => {
            this.state.showBars = e.target.checked;
            this.visualEngine.setShowBars(e.target.checked);
            this.saveSettings();
        });

        // Search
        document.getElementById('searchContent').addEventListener('input', (e) => this.filterContent(e.target.value));

        // Audio events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.next());
        this.audio.addEventListener('play', () => this.onPlay());
        this.audio.addEventListener('pause', () => this.onPause());
    }

    showPlayer() {
        document.getElementById('playerView').classList.add('active');
        document.getElementById('adminView').classList.remove('active');
    }

    showAdmin() {
        document.getElementById('adminView').classList.add('active');
        document.getElementById('playerView').classList.remove('active');
        this.renderContentList();
    }

    async authorize() {
        const btn = document.getElementById('authorizeBtn');
        const status = document.getElementById('authStatus');

        btn.disabled = true;
        status.textContent = 'Authorizing...';
        status.className = '';

        try {
            await this.drive.authorize();
            this.state.isAuthorized = true;
            status.textContent = 'Authorization successful!';
            status.className = 'success';
            this.saveSettings();
        } catch (error) {
            status.textContent = `Authorization failed: ${error.message}`;
            status.className = 'error';
        } finally {
            btn.disabled = false;
        }
    }

    async syncLinks() {
        const btn = document.getElementById('syncLinksBtn');
        const status = document.getElementById('syncStatus');

        btn.disabled = true;
        status.textContent = 'Syncing...';
        status.className = '';

        try {
            // Prompt user to paste links from Google Page
            const input = prompt('Paste links (one per line) from your Google Page:');
            if (!input) return;

            const links = input
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            this.state.playlist = links.map((url, idx) => ({
                id: `item-${idx}`,
                url,
                title: new URL(url).pathname.split('/').pop() || `Media ${idx + 1}`,
                type: this.drive.detectFileType(url),
                enabled: true,
            }));

            this.state.enabledItems = new Set(this.state.playlist.map(item => item.id));
            this.renderPlaylist();
            this.saveSettings();

            status.textContent = `Synced ${links.length} items`;
            status.className = 'success';
        } catch (error) {
            status.textContent = `Sync failed: ${error.message}`;
            status.className = 'error';
        } finally {
            btn.disabled = false;
        }
    }

    togglePlayPause() {
        if (this.state.isPlaying) {
            this.audio.pause();
        } else {
            this.play();
        }
    }

    play() {
        const current = this.getCurrentItem();
        if (!current) {
            alert('No items in playlist');
            return;
        }

        if (current.type === 'audio') {
            this.playAudio(current);
        } else if (current.type === 'video') {
            this.playVideo(current);
        }
    }

    playAudio(item) {
        this.videoContainer.style.display = 'none';
        this.audio.src = item.url;
        this.audio.play();
        this.visualEngine.initAudio(this.audio);
        this.visualEngine.start();
    }

    playVideo(item) {
        this.audio.pause();
        this.videoContainer.style.display = 'block';

        let video = this.videoContainer.querySelector('video');
        if (!video) {
            video = document.createElement('video');
            video.controls = true;
            video.style.width = '100%';
            video.style.height = '100%';
            this.videoContainer.appendChild(video);
        }

        video.src = item.url;
        video.play();
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.videoContainer.querySelector('video')?.pause();
        this.visualEngine.stop();
        document.getElementById('playPauseBtn').textContent = '▶';
    }

    next() {
        this.state.currentIndex++;
        if (this.state.currentIndex >= this.getEnabledItems().length) {
            this.state.currentIndex = 0;
        }
        this.play();
    }

    seek(fraction) {
        if (this.audio.duration) {
            this.audio.currentTime = fraction * this.audio.duration;
        }
    }

    setVolume(volume) {
        this.audio.volume = volume;
    }

    updateProgress() {
        const duration = this.audio.duration || 0;
        const current = this.audio.currentTime || 0;
        const progress = duration > 0 ? (current / duration) * 100 : 0;

        document.querySelector('.progress-fill').style.width = progress + '%';
        document.getElementById('progressSlider').value = progress;
        document.getElementById('currentTime').textContent = this.formatTime(current);
        document.getElementById('duration').textContent = this.formatTime(duration);
    }

    onPlay() {
        this.state.isPlaying = true;
        document.getElementById('playPauseBtn').textContent = '⏸';
    }

    onPause() {
        this.state.isPlaying = false;
        document.getElementById('playPauseBtn').textContent = '▶';
    }

    formatTime(seconds) {
        if (!isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    getCurrentItem() {
        const enabled = this.getEnabledItems();
        return enabled[this.state.currentIndex];
    }

    getEnabledItems() {
        return this.state.playlist.filter(item => this.state.enabledItems.has(item.id));
    }

    renderPlaylist() {
        const container = document.getElementById('playlistItems');
        container.innerHTML = '';

        this.getEnabledItems().forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'playlist-item' + (idx === this.state.currentIndex ? ' active' : '');
            div.textContent = `${item.title} [${item.type.toUpperCase()}]`;
            div.addEventListener('click', () => {
                this.state.currentIndex = idx;
                this.play();
            });
            container.appendChild(div);
        });
    }

    renderContentList() {
        const container = document.getElementById('contentList');
        container.innerHTML = '';

        this.state.playlist.forEach(item => {
            const div = document.createElement('div');
            div.className = 'content-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = this.state.enabledItems.has(item.id);
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.state.enabledItems.add(item.id);
                } else {
                    this.state.enabledItems.delete(item.id);
                }
                this.renderPlaylist();
                this.saveSettings();
            });

            const label = document.createElement('label');
            const infoDiv = document.createElement('div');
            infoDiv.className = 'content-item-info';

            const title = document.createElement('div');
            title.className = 'content-item-title';
            title.textContent = item.title;

            const url = document.createElement('div');
            url.className = 'content-item-url';
            url.textContent = item.url;

            const type = document.createElement('div');
            type.className = 'content-item-type';
            type.textContent = item.type.toUpperCase();

            infoDiv.appendChild(title);
            infoDiv.appendChild(url);
            infoDiv.appendChild(type);
            label.appendChild(infoDiv);

            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });
    }

    filterContent(query) {
        const items = document.querySelectorAll('.content-item');
        const lowerQuery = query.toLowerCase();

        items.forEach(item => {
            const title = item.querySelector('.content-item-title').textContent.toLowerCase();
            const url = item.querySelector('.content-item-url').textContent.toLowerCase();
            const matches = title.includes(lowerQuery) || url.includes(lowerQuery);
            item.style.display = matches ? 'flex' : 'none';
        });
    }

    saveSettings() {
        const settings = {
            playlist: this.state.playlist,
            enabledItems: Array.from(this.state.enabledItems),
            visualAlgorithm: this.state.visualAlgorithm,
            showWaveform: this.state.showWaveform,
            showBars: this.state.showBars,
        };
        localStorage.setItem('visualizerSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('visualizerSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.state.playlist = settings.playlist || [];
                this.state.enabledItems = new Set(settings.enabledItems || []);
                this.state.visualAlgorithm = settings.visualAlgorithm || 'rotoZoom';
                this.state.showWaveform = settings.showWaveform !== false;
                this.state.showBars = settings.showBars || false;

                document.getElementById('visualAlgorithm').value = this.state.visualAlgorithm;
                document.getElementById('showWaveform').checked = this.state.showWaveform;
                document.getElementById('showBars').checked = this.state.showBars;

                this.visualEngine.setAlgorithm(this.state.visualAlgorithm);
                this.visualEngine.setShowWaveform(this.state.showWaveform);
                this.visualEngine.setShowBars(this.state.showBars);

                this.renderPlaylist();
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        }
    }
}

// Initialize app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MediaVisualizer();
});
