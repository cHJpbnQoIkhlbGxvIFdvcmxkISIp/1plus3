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
        initialDelay: 1100,

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
            transition: ${shouldAnimate ? `opacity ${CONFIG.thumbnails.fadeInDuration} ease-in-out` : 'none
