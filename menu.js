import {
    state
} from "./state.js";

import {
    zoomToWord,
    updateWordFocus,
    scaleThreshold,
    updateWordDetails
} from "./wordFocus.js";
import {
    updateRelations
} from "./relationManager.js";
import {
    draw,
    updateWordNodeTransforms,
    clampOffsetX,
    clampOffsetY,
    updateScaleForNodes
} from "./uni-canvas.js";

const numSteps = 5;
const ticksContainer = document.querySelector('.scale-ticks');
const numbersContainer = document.querySelector('.scale-numbers');

ticksContainer.innerHTML = '';
numbersContainer.innerHTML = '';

for (let i = 0; i < numSteps; i++) {
    const percent = (i / (numSteps - 1)) * 100;

    // 刻度线
    const tick = document.createElement('div');
    tick.style.left = percent + '%';
    ticksContainer.appendChild(tick);

    // 数字
    const num = document.createElement('span');
    num.textContent = (i + 1);
    num.style.left = percent + '%';
    numbersContainer.appendChild(num);
}

const indicator = document.getElementById('indicator');
const container = document.getElementById('scaleContainer');
let isDragging = false;
let containerRect;


// 初始化 indicator 在中间
moveIndicator(scaleThreshold);

indicator.addEventListener('mousedown', startDrag);
window.addEventListener('mouseup', endDrag);
window.addEventListener('mousemove', onDrag);

function startDrag(e) {
    e.preventDefault();
    isDragging = true;
    containerRect = container.getBoundingClientRect();
    state.focusedNodeId=null;
}

function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
}

function onDrag(e) {
    if (!isDragging) return;
    let x = e.clientX - containerRect.left;
    x = Math.max(0, Math.min(containerRect.width, x));
    const percent = x / containerRect.width * 100;
    indicator.style.left = percent + '%';



    let scale = state.currentScale;
    let newScale = percent * 19 / 100 + 1;

    const mouseX = window.innerWidth / 2;
    const mouseY = window.innerHeight / 2;

    let offsetX = state.panX;
    let offsetY = state.panY;

    offsetX = mouseX - (mouseX - offsetX) * (newScale / scale);
    offsetY = mouseY - (mouseY - offsetY) * (newScale / scale);

    state.panX = clampOffsetX(offsetX);
    state.panY = clampOffsetY(offsetY); // 加边界
    state.currentScale = percent * 19 / 100 + 1;

    draw();
    updateWordNodeTransforms();
    updateWordFocus();
    updateRelations();
    updateWordDetails();


    updateScaleForNodes(newScale);
}

function snapToStep() {
    const leftPercent = parseFloat(indicator.style.left);
    const stepPercent = 100 / (numSteps - 1);
    const stepIndex = Math.round(leftPercent / stepPercent);
    const snapPercent = stepIndex * stepPercent;
    indicator.style.left = snapPercent + '%';
}

// 可程序化移动 indicator
export function moveIndicator(value) {
    value = (value-1) * 4 / (scaleThreshold-1)+1;
    if (value < 1) value = 1;
    if (value > 5) value = 5;
    const percent = (value - 1) * 25; // 5 个刻度
    indicator.style.left = percent + '%';
    console.log(value, document.body.dataset.scale);
}


// menu
let dunesIcon = document.getElementById("dunes-icon");
dunesIcon.addEventListener('click', () => {
    zoomToWord(17, scaleThreshold);
    updateWordFocus();
});

window.addEventListener('DOMContentLoaded', () => {
    const shuffleIcon = document.getElementById('shuffle-icon');
    shuffleIcon.addEventListener('click', () => {
        const randomId = window.allWords[Math.floor(Math.random() * window.allWords.length)].id;
        zoomToWord(randomId, scaleThreshold);
        updateWordFocus();
    });
});

let searchIcon = document.getElementById("searchIcon");



// Year filter configuration
export const yearPeriods = [
    { label: '', year: -2000 },
    { label: '1700', year: 1700 },
    { label: '1800', year: 1800 },
    { label: '1850', year: 1850 },
    { label: '1900', year: 1900 },
    { label: '1950', year: 1950 },
    { label: 'Now', year: 2025 }
];

const yearTicksContainer = document.querySelector('.year-ticks');
const yearNumbersContainer = document.querySelector('.year-numbers');
const yearIndicator = document.getElementById('yearIndicator');
const yearContainer = document.getElementById('yearContainer');
const yearSegments = document.querySelectorAll('.year-segment');
const yearNumbers = document.querySelector('.year-numbers');

let isYearDragging = false;
let yearContainerRect;
let currentYearIndex = yearPeriods.length - 1; // Start at 'now' (show all words)

// Initialize year filter ticks and numbers
function initializeYearFilter() {
    yearTicksContainer.innerHTML = '';
    yearNumbersContainer.innerHTML = '';

    for (let i = 0; i < yearPeriods.length; i++) {
        const percent = (i / (yearPeriods.length - 1)) * 100;

        // Vertical tick lines
        const tick = document.createElement('div');
        tick.style.left = percent + '%';
        yearTicksContainer.appendChild(tick);

        // Year labels
        const num = document.createElement('span');
        num.textContent = yearPeriods[i].label;
        num.style.left = percent + '%';
        yearNumbersContainer.appendChild(num);
    }

    // Position indicator at the rightmost position initially (show all)
    moveYearIndicator(yearPeriods.length - 1);
}

// Move year indicator to specific index
function moveYearIndicator(index) {
    if (index < 0) index = 0;
    if (index >= yearPeriods.length) index = yearPeriods.length - 1;
    
    const percent = (index / (yearPeriods.length - 1)) * 100;
    yearIndicator.style.left = percent + '%';
    currentYearIndex = index;
    
    updateYearDisplay();
    filterWordsByYear();
}

// Update visual state of segments and numbers
function updateYearDisplay() {
    // Update segments - fade out segments after current position
    // yearSegments.forEach((segment, index) => {
    //     if (index > currentYearIndex) {
    //         segment.classList.add('faded');
    //     } else {
    //         segment.classList.remove('faded');
    //     }
    // });
    
    // Update year numbers - fade out years after current position
    const yearNumberSpans = yearNumbersContainer.querySelectorAll('span');
    yearNumberSpans.forEach((span, index) => {
        if (index > currentYearIndex) {
            span.classList.add('faded');
        } else {
            span.classList.remove('faded');
        }
    });
}

// Filter words based on selected year period
function filterWordsByYear() {
    const selectedPeriod = yearPeriods[currentYearIndex];
    const cutoffYear = selectedPeriod.year;
    
    document.querySelectorAll('.word-node').forEach(node => {
        const wordId = node.id;
        const word = window.allWords.find(w => w.id == wordId);
        
        if (!word) {
            node.style.display = 'none';
            return;
        }
        
        // Extract year from proposing_time
        const wordYear = parseInt(word.proposing_time);
        
        // Show word if:
        // - No cutoff year (空白 period) - show all
        // - Word year is less than or equal to cutoff year
        // - Word year is invalid/missing and we're not in 空白 period
        if (cutoffYear === null || 
            (!isNaN(wordYear) && wordYear <= cutoffYear) ||
            (isNaN(wordYear) && cutoffYear !== null)) {
            node.style.display = 'block';
            node.style.opacity = node.classList.contains('focused') ? '1' : 
                                 (state.focusedNodeId && !node.classList.contains('focused') ? '0.5' : '1');
        } else {
            node.style.display = 'none';
        }
    });
    
    console.log(`Filtering words up to year: ${cutoffYear || 'all'}`);
}

// Year indicator drag handlers
function startYearDrag(e) {
    e.preventDefault();
    isYearDragging = true;
    yearContainerRect = yearContainer.getBoundingClientRect();
    yearIndicator.classList.add('dragging');
}

function endYearDrag(e) {
    if (!isYearDragging) return;
    isYearDragging = false;
    yearIndicator.classList.remove('dragging');
    
    // Snap to nearest step
    snapYearToStep();
}

function onYearDrag(e) {
    if (!isYearDragging) return;
    
    let x = e.clientX - yearContainerRect.left;
    x = Math.max(0, Math.min(yearContainerRect.width, x));
    const percent = (x / yearContainerRect.width) * 100;
    
    // Calculate which year period this corresponds to
    const floatIndex = (percent / 100) * (yearPeriods.length - 1);
    const nearestIndex = Math.round(floatIndex);
    
    // Update indicator position and filter
    moveYearIndicator(nearestIndex);
}

function snapYearToStep() {
    const leftPercent = parseFloat(yearIndicator.style.left);
    const stepPercent = 100 / (yearPeriods.length - 1);
    const stepIndex = Math.round(leftPercent / stepPercent);
    moveYearIndicator(stepIndex);
}

// Event listeners for year filter
yearIndicator.addEventListener('mousedown', startYearDrag);
window.addEventListener('mouseup', endYearDrag);
window.addEventListener('mousemove', onYearDrag);

// Initialize when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure other elements are ready
    setTimeout(() => {
        initializeYearFilter();
    }, 100);
});

// Export function for external use
export function resetYearFilter() {
    moveYearIndicator(yearPeriods.length - 1);
}