let API_URL = import.meta.env.VITE_API_URL || '/api';

// If it's a relative path, ensure it resolves correctly against the current origin
if (API_URL.startsWith('/')) {
    API_URL = `${window.location.origin}${API_URL}`;
}




export const api = {
    async post(path: string, data: any) {
        const response = await fetch(`${API_URL}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'API Error');
        }
        return result;
    }
};
