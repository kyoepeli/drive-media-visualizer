// Google Drive Integration
const GOOGLE_DRIVE_API_KEY = 'YOUR_API_KEY_HERE';
const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';

class DriveIntegration {
    constructor() {
        this.isAuthorized = false;
        this.accessToken = null;
        this.files = [];
    }

    async authorize() {
        return new Promise((resolve, reject) => {
            gapi.auth2.init({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
            }).then(() => {
                const auth2 = gapi.auth2.getAuthInstance();
                auth2.signIn().then(() => {
                    this.isAuthorized = true;
                    this.accessToken = auth2.currentUser.get().getAuthResponse().id_token;
                    resolve(true);
                }).catch(reject);
            }).catch(reject);
        });
    }

    async extractLinksFromGooglePage(pageUrl) {
        try {
            // Since we can't directly fetch Google Pages due to CORS,
            // we'll return empty and let the user paste/import links manually
            // In production, use a backend proxy
            return [];
        } catch (error) {
            console.error('Error extracting links:', error);
            return [];
        }
    }

    async getStreamUrl(fileId) {
        if (!this.isAuthorized) throw new Error('Not authorized');
        // Google Drive files can be streamed directly with proper auth
        return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${this.accessToken}`;
    }

    detectFileType(url) {
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
        const videoExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov'];

        const lower = url.toLowerCase();
        if (audioExtensions.some(ext => lower.includes(ext))) return 'audio';
        if (videoExtensions.some(ext => lower.includes(ext))) return 'video';
        return 'unknown';
    }

    async parseGoogleDriveUrl(url) {
        // Extract file ID from various Google Drive URL formats
        let fileId = null;

        // Format: /d/{fileId}/
        const match1 = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match1) fileId = match1[1];

        // Format: id={fileId}
        const match2 = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
        if (match2) fileId = match2[1];

        return fileId;
    }
}
