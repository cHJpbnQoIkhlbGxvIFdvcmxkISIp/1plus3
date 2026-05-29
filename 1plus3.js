// ==UserScript==
// @name         1plus3: Thumbnail + 3 Extra Frames (for YouTube)
// @namespace    https://github.com/cHJpbnQoIkhlbGxvIFdvcmxkISIp/1plus3
// @version      0.0.3
// @description  This extension helps you avoid misleading clickbait YouTube thumbnails. 1+3 keeps the main thumbnail and adds three small static frames from the video's start, middle, and end. See what the video really shows and decide if you like it.
// @author       cHJpbnQoIkhlbGxvIFdvcmxkISIp
// @match        https://www.youtube.com/*
// @homepageURL  https://github.com/cHJpbnQoIkhlbGxvIFdvcmxkISIp/1plus3
// @supportURL   https://github.com/cHJpbnQoIkhlbGxvIFdvcmxkISIp/1plus3/issues
// @updateURL    https://raw.githubusercontent.com/cHJpbnQoIkhlbGxvIFdvcmxkISIp/1plus3/main/1plus3.js
// @downloadURL  https://raw.githubusercontent.com/cHJpbnQoIkhlbGxvIFdvcmxkISIp/1plus3/main/1plus3.js
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================
    const CONFIG = {
        initialDelay: 500,
        thumbnails: {
            frameIndexes: [1, 2, 3],
            borderRadius: '0px',
            quality: 'hq',
            lazyLoad: true,
            hoverEffect: true,
            hoverScale: 2.0,
            showOnHover: false,
            fadeInDuration: '1.0s'
        },
        sections: {
            homepage: {
                enabled: true,
                width: '100%',
                justify: 'space-between',
                thumbnailGap: '5px',
                marginTop: '0',
                marginBottom: '2px',
                objectFit: 'cover',
                opacity: 1.0
            },
            channel: {
                enabled: true,
                width: '100%',
                justify: 'space-between',
                thumbnailGap: '5px',
                marginTop: '0',
                marginBottom: '2px',
                objectFit: 'cover',
                opacity: 1.0
            },
            search: {
                enabled: true,
                width: '50%',
                justify: 'flex-start',
                thumbnailGap: '1px',
                marginTop: '0',
                marginBottom: '2px',
                objectFit: 'cover',
                opacity: 1.0
            },
            sidebar: {
                enabled: true,
                width: '100%',
                justify: 'space-between',
                thumbnailGap: '5px',
                marginTop: '0',
                marginBottom: '2px',
                objectFit: 'cover',
                opacity: 1.0
            }
        },
        advanced: {
            debugMode: false,
            processExistingVideos: true,
            observerThrottle: 100,
            fallbackDelay: 250,
            respectReducedMotion: true
        }
    };

    const ATTR_PROCESSED = 'data-hq-processed-id';

    const SELECTORS = {
        homepage: 'ytd-rich-item-renderer, ytd-grid-video-renderer',
        channel: 'ytd-grid-video-renderer',
        search: 'ytd-video-renderer',
        sidebar: 'ytd-compact-video-renderer, yt-lockup-view-model'
    };

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    function getVideoIdFromElement(videoItem) {
        // Try all known link selectors across old and new YouTube layouts.
        // New layout (2024+) uses .ytLockupViewModelContentImage and .ytLockupMetadataViewModelTitle
        // instead of a#thumbnail.
        const selectors = [
            'a#thumbnail',
            'a.yt-lockup-view-model__content-image',
            'a.ytLockupViewModelContentImage',
            'a.ytLockupMetadataViewModelTitle',
        ];
        for (const sel of selectors) {
            const link = videoItem.querySelector(sel);
            if (!link?.href) continue;
            try {
                const url = new URL(link.href, window.location.origin);
                // Only accept links that belong to youtube.com to skip ad URLs
                if (url.hostname !== 'www.youtube.com') continue;
                const id = url.searchParams.get('v');
                if (id) return id;
            } catch (e) {
                // malformed URL — try next selector
            }
        }
        return null;
    }

    function detectSection(videoItem) {
        const tagName = videoItem.tagName;
        if (tagName === 'YTD-VIDEO-RENDERER') return 'search';
        if (tagName === 'YTD-COMPACT-VIDEO-RENDERER' || tagName === 'YT-LOCKUP-VIEW-MODEL') return 'sidebar';
        if (tagName === 'YTD-GRID-VIDEO-RENDERER') {
            if (window.location.pathname.includes('/@') || window.location.pathname.includes('/channel/')) {
                return 'channel';
            }
        }
        if (tagName === 'YTD-RICH-ITEM-RENDERER' || tagName === 'YTD-GRID-VIDEO-RENDERER') return 'homepage';
        return null;
    }

    function createThumbnailsContainer(videoId, sectionConfig) {
        const container = document.createElement('div');
        container.className = 'hq-thumbnails-container';

        const shouldAnimate = CONFIG.thumbnails.fadeInDuration !== '0s' &&
                            (!CONFIG.advanced.respectReducedMotion ||
                             !window.matchMedia('(prefers-reduced-motion: reduce)').matches);

        container.style.cssText = `
            display: flex;
            justify-content: ${sectionConfig.justify};
            margin-top: ${sectionConfig.marginTop};
            margin-bottom: ${sectionConfig.marginBottom};
            width: ${sectionConfig.width};
            height: auto;
            overflow: hidden;
            box-sizing: border-box;
            background-color: transparent;
            opacity: ${CONFIG.thumbnails.showOnHover ? '0' : '1'};
            transition: ${shouldAnimate ? `opacity ${CONFIG.thumbnails.fadeInDuration} ease-in-out` : 'none'};
        `;

        const frameIndexes = CONFIG.thumbnails.frameIndexes;
        const gap = sectionConfig.thumbnailGap;
        const quality = CONFIG.thumbnails.quality;

        frameIndexes.forEach((index, i) => {
            const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/${quality}${index}.jpg`;
            const isLast = i === frameIndexes.length - 1;
            const marginRight = isLast ? '0' : gap;
            const widthPercentage = 100 / frameIndexes.length;

            const img = document.createElement('img');
            img.src = thumbnailUrl;
            img.alt = `Frame Preview ${quality.toUpperCase()}${index}`;
            if (CONFIG.thumbnails.lazyLoad) img.loading = 'lazy';

            const hoverTransform = CONFIG.thumbnails.hoverEffect ? `scale(${CONFIG.thumbnails.hoverScale})` : 'none';

            img.style.cssText = `
                width: calc(${widthPercentage}% - ${isLast ? '0px' : gap});
                height: auto;
                object-fit: ${sectionConfig.objectFit};
                border-radius: ${CONFIG.thumbnails.borderRadius};
                display: block;
                min-width: 0;
                margin-right: ${marginRight};
                opacity: ${sectionConfig.opacity};
                transition: ${CONFIG.thumbnails.hoverEffect ? 'transform 0.2s ease-in-out' : 'none'};
            `;

            if (CONFIG.thumbnails.hoverEffect) {
                img.addEventListener('mouseenter', () => { img.style.transform = hoverTransform; });
                img.addEventListener('mouseleave', () => { img.style.transform = 'scale(1)'; });
            }
            container.appendChild(img);
        });

        return container;
    }

    // ========================================
    // SECTION PROCESSING LOGIC
    // ========================================

    function injectToElement(videoItem, container, selector) {
        const insertionReference = videoItem.querySelector(selector);
        if (insertionReference && insertionReference.parentElement) {
            insertionReference.insertAdjacentElement('beforebegin', container);
            return true;
        }
        return false;
    }

    function handleHoverLogic(videoItem, container, thumbSelector) {
        if (CONFIG.thumbnails.showOnHover) {
            const thumbnail = videoItem.querySelector(thumbSelector);
            if (thumbnail) {
                thumbnail.addEventListener('mouseenter', () => { container.style.opacity = '1'; });
                thumbnail.addEventListener('mouseleave', () => { container.style.opacity = '0'; });
            }
        }
    }

    // ========================================
    // MAIN PROCESSING LOGIC
    // ========================================

    function processVideoItem(videoItem) {
        const videoId = getVideoIdFromElement(videoItem);
        if (!videoId) return;

        // Skip if this element already has thumbnails for this exact video ID
        const lastProcessedId = videoItem.getAttribute(ATTR_PROCESSED);
        if (lastProcessedId === videoId) return;

        const section = detectSection(videoItem);
        if (!section || !CONFIG.sections[section].enabled) return;

        const sectionConfig = CONFIG.sections[section];

        // Remove existing container if video ID changed (SPA navigation)
        const oldContainer = videoItem.querySelector('.hq-thumbnails-container');
        if (oldContainer) oldContainer.remove();

        const container = createThumbnailsContainer(videoId, sectionConfig);
        let success = false;

        if (section === 'homepage' || section === 'channel') {
            success = injectToElement(videoItem, container, 'h3.ytLockupMetadataViewModelHeadingReset, h3.yt-lockup-metadata-view-model__heading-reset, #video-title');
            handleHoverLogic(videoItem, container, 'a#thumbnail');
        } else if (section === 'search') {
            success = injectToElement(videoItem, container, '#title-wrapper');
            handleHoverLogic(videoItem, container, 'a#thumbnail');
        } else if (section === 'sidebar') {
            success = injectToElement(videoItem, container, 'h3.ytLockupMetadataViewModelHeadingReset, h3.yt-lockup-metadata-view-model__heading-reset, h3, #video-title');
            handleHoverLogic(videoItem, container, 'a#thumbnail, a.yt-lockup-view-model__content-image');
        }

        if (success) {
            videoItem.setAttribute(ATTR_PROCESSED, videoId);
        }
    }

    function scanAndProcessVideos() {
        const activeSelectors = Object.entries(CONFIG.sections)
            .filter(([_, config]) => config.enabled)
            .map(([section, _]) => SELECTORS[section])
            .join(', ');

        if (!activeSelectors) return;

        const videoItems = document.querySelectorAll(activeSelectors);
        videoItems.forEach(processVideoItem);
    }

    // Remove stale processed attributes left over from a previous session or
    // restored from bfcache, so all visible items are re-evaluated on init.
    function clearStaleAttributes() {
        document.querySelectorAll(`[${ATTR_PROCESSED}]`).forEach(el => {
            el.removeAttribute(ATTR_PROCESSED);
        });
    }

    // ========================================
    // MUTATION OBSERVER SETUP
    // ========================================

    function attachMutationObserver() {
        const targetNode = document.getElementById('page-manager') || document.body;
        let timeoutId = null;
        const observer = new MutationObserver(() => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(scanAndProcessVideos, CONFIG.advanced.observerThrottle);
        });
        observer.observe(targetNode, { childList: true, subtree: true });
    }

    function setupMutationObserver() {
        // If page-manager already exists (common in old profiles with cached SPA state),
        // attach immediately; otherwise wait for it to appear in the DOM.
        if (document.getElementById('page-manager')) {
            attachMutationObserver();
        } else {
            const waitObserver = new MutationObserver((_, obs) => {
                if (document.getElementById('page-manager')) {
                    obs.disconnect();
                    attachMutationObserver();
                }
            });
            waitObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    // Handle pages restored from bfcache (common in Waterfox/Firefox).
    // The script does not re-execute on bfcache restore, so we must re-scan manually.
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            clearStaleAttributes();
            setTimeout(scanAndProcessVideos, CONFIG.initialDelay);
        }
    });

    // YouTube fires this custom event after every SPA navigation.
    // Listening to it ensures we catch navigations that produce few DOM mutations.
    window.addEventListener('yt-navigate-finish', () => {
        setTimeout(scanAndProcessVideos, CONFIG.advanced.fallbackDelay);
    });

    setTimeout(() => {
        clearStaleAttributes();

        if (CONFIG.advanced.processExistingVideos) scanAndProcessVideos();
        setupMutationObserver();

        if (CONFIG.advanced.fallbackDelay > 0) {
            setTimeout(scanAndProcessVideos, CONFIG.advanced.fallbackDelay);
        }
    }, CONFIG.initialDelay);

})();
