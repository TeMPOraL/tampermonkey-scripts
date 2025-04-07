// ==UserScript==
// @name         YouTube A/B Loop
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Set points A and B to loop specific parts of YouTube videos
// @author       TeMPOraL, mostly via Claude 3.7 Sonnet
// @match        https://www.youtube.com/*
// @grant        none
// @source       https://github.com/TeMPOraL/tampermonkey-scripts
// @downloadURL  https://raw.githubusercontent.com/TeMPOraL/tampermonkey-scripts/refs/heads/master/src/youtube-a-b-loop.js
// ==/UserScript==

(function() {
    'use strict';

    // State variables
    let pointA = null;
    let pointB = null;
    let videoId = null;
    let videoPlayer = null;
    let uiContainer = null;
    let loopEnabled = true;
    let checkInterval = null;
    let uiHideTimeout = null;
    const UI_HIDE_DELAY = 3000; // 3 seconds

    // Create UI elements
    function createUI() {
        // Remove existing UI if present
        if (uiContainer) {
            uiContainer.remove();
        }

        uiContainer = document.createElement('div');
        uiContainer.id = 'ab-loop-container';
        uiContainer.style.cssText = `
            position: absolute;
            bottom: 70px;
            left: 10px;
            z-index: 2000;
            background-color: rgba(0, 0, 0, 0.7);
            padding: 8px;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            color: white;
            font-size: 12px;
            font-family: 'YouTube Noto', Roboto, Arial, sans-serif;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        `;

        const buttonRow = document.createElement('div');
        buttonRow.style.cssText = `
            display: flex;
            gap: 8px;
            margin-bottom: 5px;
        `;

        const createButton = (text, action) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.style.cssText = `
                background-color: #065fd4;
                color: white;
                border: none;
                border-radius: 2px;
                padding: 5px 10px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s;
            `;
            button.addEventListener('mouseover', () => {
                button.style.backgroundColor = '#0b57b5';
            });
            button.addEventListener('mouseout', () => {
                button.style.backgroundColor = '#065fd4';
            });
            button.addEventListener('click', action);
            return button;
        };

        const setPointA = createButton('Set A', () => {
            pointA = videoPlayer.currentTime;
            updateDisplay();
            saveSettings();
        });

        const setPointB = createButton('Set B', () => {
            pointB = videoPlayer.currentTime;
            updateDisplay();
            saveSettings();
        });

        const clearPoints = createButton('Clear', () => {
            pointA = null;
            pointB = null;
            updateDisplay();
            saveSettings();
        });

        const toggleLoop = createButton(`Loop: ${loopEnabled ? 'ON' : 'OFF'}`, () => {
            loopEnabled = !loopEnabled;
            toggleLoop.textContent = `Loop: ${loopEnabled ? 'ON' : 'OFF'}`;
            saveSettings();
        });

        buttonRow.appendChild(setPointA);
        buttonRow.appendChild(setPointB);
        buttonRow.appendChild(clearPoints);
        buttonRow.appendChild(toggleLoop);

        const infoDisplay = document.createElement('div');
        infoDisplay.id = 'ab-loop-info';

        uiContainer.appendChild(buttonRow);
        uiContainer.appendChild(infoDisplay);

        updateDisplay();

        return uiContainer;
    }

    // Function to show UI
    function showUI() {
        if (uiContainer) {
            uiContainer.style.opacity = '1';
            uiContainer.style.pointerEvents = 'auto';
        }
        // Reset the hide timeout
        clearTimeout(uiHideTimeout);
        uiHideTimeout = setTimeout(hideUI, UI_HIDE_DELAY);
    }

    // Function to hide UI
    function hideUI() {
        if (uiContainer) {
            uiContainer.style.opacity = '0';
            uiContainer.style.pointerEvents = 'none';
        }
    }

    // Update the info display
    function updateDisplay() {
        const infoDisplay = document.getElementById('ab-loop-info');
        if (!infoDisplay) return;

        const formatTime = (seconds) => {
            if (seconds === null) return '--:--';

            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);

            if (hrs > 0) {
                return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            } else {
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            }
        };

        infoDisplay.textContent = `A: ${formatTime(pointA)} | B: ${formatTime(pointB)}`;
    }

    // Save settings to localStorage
    function saveSettings() {
        if (!videoId) return;

        const settings = {
            pointA,
            pointB,
            loopEnabled
        };

        try {
            const allSettings = JSON.parse(localStorage.getItem('youtube-ab-loop') || '{}');
            allSettings[videoId] = settings;
            localStorage.setItem('youtube-ab-loop', JSON.stringify(allSettings));
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    }

    // Load settings from localStorage
    function loadSettings() {
        if (!videoId) return;

        try {
            const allSettings = JSON.parse(localStorage.getItem('youtube-ab-loop') || '{}');
            const settings = allSettings[videoId];

            if (settings) {
                pointA = settings.pointA;
                pointB = settings.pointB;
                loopEnabled = settings.loopEnabled !== undefined ? settings.loopEnabled : true;

                // If we have a starting point and the loop is enabled, seek to it
                if (pointA !== null && loopEnabled && videoPlayer) {
                    videoPlayer.currentTime = pointA;
                }

                // Update the toggle button text
                const toggleButton = document.querySelector('#ab-loop-container button:nth-child(4)');
                if (toggleButton) {
                    toggleButton.textContent = `Loop: ${loopEnabled ? 'ON' : 'OFF'}`;
                }
                console.log('loop script: settings for video found in local storage');
            }
            else {
                // For when video has not been explicitly set before.
                pointA = null;
                pointB = null;
                loopEnabled = null;
                console.log('loop script: settings for video NOT found in local storeage, resetting');
            }

        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }

    // Check if we should loop the video
    function checkForLoop() {
        if (!videoPlayer || !loopEnabled) return;

        if (pointB !== null && videoPlayer.currentTime >= pointB) {
            if (pointA !== null) {
                videoPlayer.currentTime = pointA;
            } else {
                videoPlayer.currentTime = 0;
            }
        }
    }

    // Extract video ID from URL
    function getVideoIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v');
    }

    // Add UI to the player
    function addUIToPlayer() {
        const playerContainer = document.querySelector('.html5-video-player');
        if (playerContainer && uiContainer && !playerContainer.contains(uiContainer)) {
            playerContainer.appendChild(uiContainer);
        }
    }

    // Initialize everything when a video is loaded
    function initializeOnVideo() {
        // Clear any existing interval
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }

        // Get the current video ID
        const newVideoId = getVideoIdFromUrl();

        // If we're not on a video page, don't do anything
        if (!newVideoId) {
            videoId = null;
            return;
        }

        // If it's a new video, update videoId
        if (newVideoId !== videoId) {
            videoId = newVideoId;
        }

        // Find the video player
        videoPlayer = document.querySelector('video');
        if (!videoPlayer) {
            setTimeout(initializeOnVideo, 500);
            return;
        }

        // Load saved settings first, this way we don't reset points when refreshing
        loadSettings();

        // Create and add our UI
        const ui = createUI();
        const playerContainer = document.querySelector('.html5-video-player');
        if (playerContainer) {
            playerContainer.appendChild(ui);

            // Set up mouse movement tracking
            playerContainer.addEventListener('mousemove', showUI);
            playerContainer.addEventListener('mouseleave', hideUI);
        }

        // Update UI with loaded settings
        updateDisplay();

        // Set up interval to check for looping
        checkInterval = setInterval(checkForLoop, 250);

        // Add listener for timeupdate as a backup for the interval
        videoPlayer.addEventListener('timeupdate', checkForLoop);

        // Also show UI when interacting with video (play/pause)
        videoPlayer.addEventListener('play', showUI);
        videoPlayer.addEventListener('pause', showUI);

        // Make sure UI stays in the player when YouTube updates the DOM
        setInterval(addUIToPlayer, 2000);
    }

    // Check for URL changes (for SPA navigation)
    function monitorUrlChanges() {
        let lastUrl = location.href;

        const observer = new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(initializeOnVideo, 1000); // Give the page time to load the video
            }
        });

        observer.observe(document, { subtree: true, childList: true });

        // Also check periodically (as a fallback)
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(initializeOnVideo, 1000);
            }
        }, 2000);
    }

    // Initialize everything
    function initialize() {
        // Initial setup
        setTimeout(initializeOnVideo, 2000); // Give the page time to load

        // Set up URL change detection
        monitorUrlChanges();

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Only activate if not typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // Alt+A to set point A
            if (e.altKey && e.key === 'a') {
                if (videoPlayer) {
                    pointA = videoPlayer.currentTime;
                    updateDisplay();
                    saveSettings();
                }
            }

            // Alt+B to set point B
            if (e.altKey && e.key === 'b') {
                if (videoPlayer) {
                    pointB = videoPlayer.currentTime;
                    updateDisplay();
                    saveSettings();
                }
            }

            // Alt+L to toggle loop
            if (e.altKey && e.key === 'l') {
                loopEnabled = !loopEnabled;
                const toggleButton = document.querySelector('#ab-loop-container button:nth-child(4)');
                if (toggleButton) {
                    toggleButton.textContent = `Loop: ${loopEnabled ? 'ON' : 'OFF'}`;
                }
                saveSettings();
            }

            // Alt+C to clear points
            if (e.altKey && e.key === 'c') {
                pointA = null;
                pointB = null;
                updateDisplay();
                saveSettings();
            }
        });
    }

    // Start the script
    initialize();
})();
