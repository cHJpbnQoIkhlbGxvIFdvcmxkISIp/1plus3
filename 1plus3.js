// ==UserScript==
// @name         1plus3: Thumbnail + 3 Extra Frames (for YouTube)
// @namespace    https://github.com/cHJpbnQoIkhlbGxvIFdvcmxkISIp/1plus3
// @version      0.0.1
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
        // Delay before the initial scan (ms)
        initialDelay: 500,

        // Global thumbnail settings
        thumbnails: {
            frameIndexes: [1, 2, 3],     // Which frames to show: [1,2,3], [0,1,2], or custom
            borderRadius: '0px',         // Corner radius for thumbnails
            quality: 'hq',               // Quality: 'hq' (480x360), 'mq' (320x180), 'sd' (640x480), 'maxres' (1920x1080)
            lazyLoad: true,              // Enable lazy loading (loading="lazy")
            hoverEffect: true,           // Enable zoom effect on hover
            hoverScale: 2.0,             // Zoom scale (1.0 = none, 1.1 = 110%)
            showOnHover: false,          // Show extra thumbnails only when hovering over the main thumbnail
            fadeInDuration: '1.0s'       // Fade-in animation duration
        },

        // Enable/Disable for specific sections
        sections: {
            homepage: {
                enabled: true,
                width: '100%',           // Container width
                justify: 'space-between', // flex options: space-between, flex-start, center, space-around
                thumbnailGap: '5px',     // Gap between thumbnails
                marginTop: '0',
                marginBottom: '2px',
                objectFit: 'cover',      // options: cover, contain, fill
                opacity: 1.0             // Transparency (0.0 - 1.0)
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
                width: '50%',            // Narrower width for search results
                justify: 'flex-start',
                thumbnailGap: '1px',     // Tighter gap
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

        // Advanced options
        advanced: {
            debugMode: false,            // Show logs in the console
            processExistingVideos: true, // Process videos already present on the page
            observerThrottle: 0,         // Mutation observer throttle (ms), 0 = none
            fallbackDelay: 250,          // Additional scan after this delay (ms)
            respectReducedMotion: true   // Respect system 'prefers-reduced-motion' settings
        }
    };

    // ========================================
    // CONSTANTS
    // ========================================
    const ATTR_PROCESSED = 'data-hq-processed';

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
        const thumbnailLink = videoItem.querySelector('a#thumbnail, a.yt-lockup-view-model__content-image');

        if (thumbnailLink && thumbnailLink.href) {
            try {
                const url = new URL(thumbnailLink.href, window.location.origin);
                return url.searchParams.get('v') || url.searchParams.get('list');
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    function detectSection(videoItem) {
        const tagName = videoItem.tagName;

        // Search results
        if (tagName === 'YTD-VIDEO-RENDERER') {
            return 'search';
        }

        // Sidebar / Watch next
        if (tagName === 'YTD-COMPACT-VIDEO-RENDERER' || tagName === 'YT-LOCKUP-VIEW-MODEL') {
            return 'sidebar';
        }

        // Channel page vs Homepage (both use similar tags)
        if (tagName === 'YTD-GRID-VIDEO-RENDERER') {
            // Check if we are on a channel page
            if (window.location.pathname.includes('/@') || window.location.pathname.includes('/channel/')) {
                return 'channel';
            }
        }

        // Homepage
        if (tagName === 'YTD-RICH-ITEM-RENDERER' || tagName === 'YTD-GRID-VIDEO-RENDERER') {
            return 'homepage';
        }

        return null;
    }

    function createThumbnailsContainer(videoId, sectionConfig) {
        const container = document.createElement('div');
        container.className = 'hq-thumbnails-container';

        // Handle fade-in animation logic
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

            // Calculate thumbnail width
            const isLast = i === frameIndexes.length - 1;
            const marginRight = isLast ? '0' : gap;
            const widthPercentage = 100 / frameIndexes.length;

            const img = document.createElement('img');
            img.src = thumbnailUrl;
            img.alt = `Frame Preview ${quality.toUpperCase()}${index}`;

            if (CONFIG.thumbnails.lazyLoad) {
                img.loading = 'lazy';
            }

            const hoverTransform = CONFIG.thumbnails.hoverEffect ?
                `scale(${CONFIG.thumbnails.hoverScale})` : 'none';

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
                img.addEventListener('mouseenter', () => {
                    img.style.transform = hoverTransform;
                });
                img.addEventListener('mouseleave', () => {
                    img.style.transform = 'scale(1)';
                });
            }

            container.appendChild(img);
        });

        if (CONFIG.advanced.debugMode) {
            console.log(`[1plus3] Created container for video: ${videoId}`);
        }

        return container;
    }

    // ========================================
    // SECTION PROCESSING LOGIC
    // ========================================

    function processHomepage(videoItem, sectionConfig) {
        const insertionReference = videoItem.querySelector('h3.yt-lockup-metadata-view-model__heading-reset, #video-title');
        if (!insertionReference) return false;

        const videoId = getVideoIdFromElement(videoItem);
        const container = createThumbnailsContainer(videoId, sectionConfig);

        // Handle hover visibility
        if (CONFIG.thumbnails.showOnHover) {
            const thumbnail = videoItem.querySelector('a#thumbnail');
            if (thumbnail) {
                thumbnail.addEventListener('mouseenter', () => {
                    container.style.opacity = '1';
                });
                thumbnail.addEventListener('mouseleave', () => {
                    container.style.opacity = '0';
                });
            }
        }

        if (insertionReference.parentElement && !insertionReference.parentElement.querySelector('.hq-thumbnails-container')) {
            insertionReference.insertAdjacentElement('beforebegin', container);
            return true;
        }
        return false;
    }

    function processChannel(videoItem, sectionConfig) {
        // Channel pages use the same logic as homepage
        return processHomepage(videoItem, sectionConfig);
    }

    function processSearch(videoItem, sectionConfig) {
        const insertionReference = videoItem.querySelector('#title-wrapper');
        if (!insertionReference) return false;

        const videoId = getVideoIdFromElement(videoItem);
        const container = createThumbnailsContainer(videoId, sectionConfig);

        // Handle hover visibility
        if (CONFIG.thumbnails.showOnHover) {
            const thumbnail = videoItem.querySelector('a#thumbnail');
            if (thumbnail) {
                thumbnail.addEventListener('mouseenter', () => {
                    container.style.opacity = '1';
                });
                thumbnail.addEventListener('mouseleave', () => {
                    container.style.opacity = '0';
                });
            }
        }

        if (insertionReference.parentElement && !insertionReference.parentElement.querySelector('.hq-thumbnails-container')) {
            insertionReference.insertAdjacentElement('beforebegin', container);
            return true;
        }
        return false;
    }

    function processSidebar(videoItem, sectionConfig) {
        let metadataWrapper = videoItem.querySelector('#metadata, .yt-lockup-view-model__metadata');
        if (!metadataWrapper) return false;

        const insertionReference = metadataWrapper.querySelector('h3, #video-title, .yt-lockup-metadata-view-model__heading-reset');
        if (!insertionReference) return false;

        const videoId = getVideoIdFromElement(videoItem);
        const container = createThumbnailsContainer(videoId, sectionConfig);

        // Handle hover visibility
        if (CONFIG.thumbnails.showOnHover) {
            const thumbnail = videoItem.querySelector('a#thumbnail, a.yt-lockup-view-model__content-image');
            if (thumbnail) {
                thumbnail.addEventListener('mouseenter', () => {
                    container.style.opacity = '1';
                });
                thumbnail.addEventListener('mouseleave', () => {
                    container.style.opacity = '0';
                });
            }
        }

        if (insertionReference.parentElement && !insertionReference.parentElement.querySelector('.hq-thumbnails-container')) {
            insertionReference.insertAdjacentElement('beforebegin', container);
            return true;
        }
        return false;
    }

    // ========================================
    // MAIN PROCESSING LOGIC
    // ========================================

    function processVideoItem(videoItem) {
        if (videoItem.hasAttribute(ATTR_PROCESSED)) {
            return;
        }

        const videoId = getVideoIdFromElement(videoItem);
        if (!videoId) return;

        const section = detectSection(videoItem);
        if (!section) return;

        const sectionConfig = CONFIG.sections[section];
        if (!sectionConfig || !sectionConfig.enabled) return;

        let success = false;

        switch(section) {
            case 'homepage':
                success = processHomepage(videoItem, sectionConfig);
                break;
            case 'channel':
                success = processChannel(videoItem, sectionConfig);
                break;
            case 'search':
                success = processSearch(videoItem, sectionConfig);
                break;
            case 'sidebar':
                success = processSidebar(videoItem, sectionConfig);
                break;
        }

        if (success) {
            videoItem.setAttribute(ATTR_PROCESSED, 'true');
        }
    }

    function scanAndProcessVideos() {
        // Collect all selectors from enabled sections
        const activeSelectors = Object.entries(CONFIG.sections)
            .filter(([_, config]) => config.enabled)
            .map(([section, _]) => SELECTORS[section])
            .join(', ');

        if (!activeSelectors) return;

        const videoItems = document.querySelectorAll(
            `${activeSelectors}:not([${ATTR_PROCESSED}])`
        );

        if (CONFIG.advanced.debugMode) {
            console.log(`[1plus3] Found ${videoItems.length} new videos to process`);
        }

        videoItems.forEach(processVideoItem);
    }

    function setupMutationObserver() {
        const targetNode = document.getElementById('page-manager') || document.body;

        let timeoutId = null;
        const observer = new MutationObserver(() => {
            if (CONFIG.advanced.observerThrottle > 0) {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    scanAndProcessVideos();
                }, CONFIG.advanced.observerThrottle);
            } else {
                scanAndProcessVideos();
            }
        });

        observer.observe(targetNode, { childList: true, subtree: true });

        if (CONFIG.advanced.debugMode) {
            console.log('[1plus3] Mutation observer started');
        }
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    if (CONFIG.advanced.debugMode) {
        console.log('[1plus3] Script loaded, waiting for initial delay...');
    }

    setTimeout(() => {
        if (CONFIG.advanced.processExistingVideos) {
            scanAndProcessVideos();
        }
        setupMutationObserver();

        // Fallback scan to ensure coverage
        if (CONFIG.advanced.fallbackDelay > 0) {
            setTimeout(scanAndProcessVideos, CONFIG.advanced.fallbackDelay);
        }

        if (CONFIG.advanced.debugMode) {
            console.log('[1plus3] Initialization complete');
        }
    }, CONFIG.initialDelay);

})();
