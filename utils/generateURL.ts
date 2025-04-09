export function constructVercelURL(path: string): string {
    let baseURL =  process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL || 'http://localhost:3000';
    if (typeof window !== 'undefined' && window.origin) {
        baseURL = window.origin;
    }
    if (!baseURL.startsWith('http://') && !baseURL.startsWith('https://')) {
        baseURL = 'https://' + baseURL;
    }
    return baseURL + path;
}