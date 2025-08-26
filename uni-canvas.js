import {
    state
} from "./state.js";
import {
    scaleThreshold
} from "./wordFocus.js";
import {
    updateRelations
} from "./relationManager.js";
import {
    moveIndicator
} from "./menu.js";
import {
    hideFloatingPanel
} from "./detail.js"

const canvas = document.getElementById("universe-canvas");
const ctx = canvas.getContext("2d");

// 初始化尺寸
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function updateGridSizeToFitHeight() {
    state.baseWidth = window.innerWidth / 24;
    state.baseHeight = window.innerHeight;
}

// 限制 Y 方向边界
export function clampOffsetY(offsetY) {
    const totalHeight = state.baseHeight * state.currentScale;
    const minY = -totalHeight + canvas.height; // 南极边缘
    const maxY = 0; // 北极边缘
    return Math.min(Math.max(offsetY, minY), maxY);
}

// 限制 X 方向边界
export function clampOffsetX(offsetX) {
    const totalWidth = state.baseWidth * state.currentScale * 24;
    const minX = -totalWidth + canvas.width;
    const maxX = 0;
    return Math.min(Math.max(offsetX, minX), maxX);
}

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// 更新 word-nodes 的位置
export function updateWordNodeTransforms() {
    const scale = state.currentScale;
    const totalWidth = state.baseWidth * scale * 24;
    const totalHeight = state.baseHeight * scale;

    const nodes = document.querySelectorAll(".word-node");

    nodes.forEach(node => {
        const xRatio = +node.dataset.x;
        const yRatio = +node.dataset.y;

        const baseX = xRatio * totalWidth + state.panX;
        const baseY = yRatio * totalHeight + state.panY;

        node.style.left = `0px`;
        node.style.top = `0px`;
        node.style.position = 'absolute';
        node.style.transform = `translate(${baseX}px, ${baseY}px)`;
    });
}

// 拖拽事件监听
canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const detailDiv = document.getElementById("word-details");
    detailDiv.classList.add("hidden");
    hideFloatingPanel();
});

canvas.addEventListener("mousemove", (e) => {
    if (isDragging) {
        let offsetX = state.panX + (e.clientX - dragStartX);
        let offsetY = state.panY + (e.clientY - dragStartY);

        dragStartX = e.clientX;
        dragStartY = e.clientY;

        state.panX = clampOffsetX(offsetX);
        state.panY = clampOffsetY(offsetY);

        draw();
        updateWordNodeTransforms();
        updateRelations();
    }
});

canvas.addEventListener("mouseup", (e) => {
    isDragging = false;
    updateRelations();
});

canvas.addEventListener("mouseleave", (e) => {
    isDragging = false;
    updateRelations();
});

// 缩放事件监听
canvas.addEventListener("wheel", (e) => {
    e.preventDefault();

    let scale = state.currentScale;
    const zoomStep = 0.2;
    const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
    const newScale = Math.min(scaleThreshold, Math.max(1, scale + delta));

    state.panX = e.clientX - (e.clientX - state.panX) * (newScale / scale);
    state.panY = e.clientY - (e.clientY - state.panY) * (newScale / scale);

    state.currentScale = newScale;
    state.panX = clampOffsetX(state.panX);
    state.panY = clampOffsetY(state.panY);

    draw();
    updateWordNodeTransforms();
    updateRelations();
    moveIndicator(state.currentScale);
    hideFloatingPanel();

    updateScaleForNodes(newScale);
    console.log(state.currentScale);
}, {
    passive: false
});

export function updateScaleForNodes(newScale, scaleThreshold = 20) {
    let snapped;

    if (newScale < 1.5) {
        snapped = 1;
    } else if (newScale < 5) {
        snapped = 2;
    } else if (newScale < 13) {
        snapped = 3;
    } else if (newScale < 19.5) {
        snapped = 4;
    } else {
        snapped = 5;
    }

    document.body.dataset.scale = snapped;
}

// 主绘图函数
export function draw() {
    const offsetX = clampOffsetX(state.panX);
    const offsetY = clampOffsetY(state.panY);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gridWidth = state.baseWidth * state.currentScale;
    const gridHeight = state.baseHeight * state.currentScale;
    const lonCount = 24;

    drawGrid(offsetX, offsetY, gridWidth, gridHeight, lonCount);
    drawSpecialLatLines(offsetX, offsetY, gridHeight, gridWidth * lonCount, gridWidth);
    drawTimezoneLabels(offsetX, offsetY, gridWidth, lonCount);
}

function drawTimezoneLabels(offsetX, offsetY, gridWidth, lonCount) {
    ctx.save();
    ctx.fillStyle = "#F0B549";
    ctx.font = `15px ChillDINGothic`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    for (let lonIdx = 0; lonIdx < lonCount; lonIdx++) {
        const centerX = lonIdx * gridWidth + offsetX + gridWidth / 2;
        const y = offsetY + 25;

        const tz = -11 + lonIdx;
        const label = tz > 0 ? `+${tz}` : `${tz}`;

        ctx.fillText(label, centerX, y);
    }
    ctx.restore();
}

function drawGrid(offsetX, offsetY, gridWidth, gridHeight, lonCount) {
    ctx.strokeStyle = "#F0B549";

    // 绘制垂直线
    for (let lonIdx = 0; lonIdx <= lonCount; lonIdx++) {
        const x = lonIdx * gridWidth + offsetX;
        ctx.beginPath();
        ctx.moveTo(x, offsetY);
        ctx.lineTo(x, offsetY + gridHeight);
        ctx.stroke();
    }

    // 绘制水平线
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(offsetX + gridWidth * lonCount, offsetY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + gridHeight);
    ctx.lineTo(offsetX + gridWidth * lonCount, offsetY + gridHeight);
    ctx.stroke();
}

function drawSpecialLatLines(offsetX, offsetY, gridHeight, totalWidth, gridWidth) {
    ctx.save();
    const latitudes = [{
            lat: 0,
            label: "0°",
            color: "#F0B549",
            dash: [],
            lineWidth: 1
        },
        {
            lat: 23.5,
            label: "23.5°N",
            color: "#F0B549",
            dash: [],
            lineWidth: 1
        },
        {
            lat: -23.5,
            label: "23.5°S",
            color: "#F0B549",
            dash: [],
            lineWidth: 1
        }
    ];

    latitudes.forEach(({
        lat,
        label,
        color,
        dash,
        lineWidth
    }) => {
        const latIdx = (90 - lat) / 180;
        const y = latIdx * gridHeight + offsetY;

        // 绘制纬线（从第二列开始，不覆盖 -11 时区）
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(dash);

        ctx.beginPath();
        ctx.moveTo(offsetX + gridWidth, y);
        ctx.lineTo(offsetX + totalWidth, y);
        ctx.stroke();

        // 绘制标签
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = "14px ChillDINGothic";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
            label,
            offsetX + gridWidth / 2,
            y
        );
    });

    ctx.restore();
}

function initialize() {
    updateGridSizeToFitHeight();
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
    updateWordNodeTransforms();
}

window.addEventListener("resize", initialize);
initialize();