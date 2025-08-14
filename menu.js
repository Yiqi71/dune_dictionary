import {
    state
} from "./state.js";

import {
    updateRelations
} from "./main.js";

import {
    draw,
    updateWordNodeTransforms,
    clampOffsetX,
    clampOffsetY
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
moveIndicator(1);

indicator.addEventListener('mousedown', startDrag);
window.addEventListener('mouseup', endDrag);
window.addEventListener('mousemove', onDrag);

function startDrag(e) {
    e.preventDefault();
    isDragging = true;
    containerRect = container.getBoundingClientRect();
}

function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    snapToStep();
}

function onDrag(e) {
    if (!isDragging) return;
    let x = e.clientX - containerRect.left;
    x = Math.max(0, Math.min(containerRect.width, x));
    const percent = x / containerRect.width * 100;
    indicator.style.left = percent + '%';



    let scale = state.currentScale;
    let newScale = percent / 25 + 1;

    const mouseX = window.innerWidth / 2;
    const mouseY = window.innerHeight / 2;

    let offsetX = state.panX;
    let offsetY = state.panY;

    offsetX = mouseX - (mouseX - offsetX) * (newScale / scale);
    offsetY = mouseY - (mouseY - offsetY) * (newScale / scale);

    state.panX = clampOffsetX(offsetX);
    state.panY = clampOffsetY(offsetY); // 加边界
    state.currentScale = percent / 25 + 1;

    draw();
    updateWordNodeTransforms();
    updateRelations();
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
    if (value < 1) value = 1;
    if (value > 5) value = 5;
    const percent = (value - 1) * 25; // 5 个刻度
    indicator.style.left = percent + '%';
}