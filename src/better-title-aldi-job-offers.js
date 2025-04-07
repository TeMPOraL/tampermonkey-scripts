// ==UserScript==
// @name         Better title - ALDI job offers
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Fix page title to show the specific job offer title, and make it more useful when browsing through list of opened tabs.
// @author       TeMPOraL
// @match        https://www.aldi-tech-hub.pl/job-details.*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=aldi-tech-hub.pl
// @grant        none
// @tag          jobSearch2024
// @source       https://github.com/TeMPOraL/tampermonkey-scripts
// @downloadURL  https://raw.githubusercontent.com/TeMPOraL/tampermonkey-scripts/refs/heads/master/src/better-title-aldi-job-offers.js
// ==/UserScript==

(function() {
    'use strict';
    document.title = "💼 " + document.querySelector("h1.heading-h1").textContent + " | " + document.title;
})();
