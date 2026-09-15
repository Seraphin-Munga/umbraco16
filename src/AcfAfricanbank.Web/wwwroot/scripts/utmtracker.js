// Function to get query parameters from the URL
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Capture UTM parameters and store them in session storage
function captureAndStoreUTMParameters() {
    const utmParams = {
        utm_source: getQueryParam('utm_source'),
        utm_medium: getQueryParam('utm_medium'),
        utm_campaign: getQueryParam('utm_campaign'),
        utm_term: getQueryParam('utm_term'),
        utm_content: getQueryParam('utm_content')
    };

    // Store UTM parameters in session storage if utm_source is present
    if (utmParams.utm_source) {
        sessionStorage.setItem('utmParams', JSON.stringify(utmParams));
    }
}

// Attach UTM parameters to all internal links
function attachUTMParametersToLinks() {
    const utmParams = JSON.parse(sessionStorage.getItem('utmParams'));
    if (utmParams) {
        const links = document.querySelectorAll('a[href^="/"]'); // Select internal links
        links.forEach(link => {
            const url = new URL(link.href, window.location.origin);
            Object.keys(utmParams).forEach(param => {
                if (utmParams[param]) {
                    url.searchParams.set(param, utmParams[param]);
                }
            });
            link.href = url.toString();
        });
    }
}

// Clear UTM parameters from session storage at session end
function clearUTMParameters() {
    sessionStorage.removeItem('utmParams');
}

// Set a session timeout (e.g. 30 minutes of inactivity)
function setSessionTimeout() {
    const timeout = 30 * 60 * 1000; // 30 minutes in milliseconds
    let timer = setTimeout(clearUTMParameters, timeout);

    function resetTimer() {
        clearTimeout(timer);
        timer = setTimeout(clearUTMParameters, timeout);
    }

    document.addEventListener('mousemove', resetTimer);
    document.addEventListener('keydown', resetTimer);
}

// Initialize UTM tracking
function initUTMTracking() {
    captureAndStoreUTMParameters();
    attachUTMParametersToLinks();
    setSessionTimeout();
}

// Run the UTM tracking initialization on page load
window.onload = initUTMTracking;
