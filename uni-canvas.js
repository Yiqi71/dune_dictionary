import {
    state
} from "./state.js";
import {
    updateRelations, scaleThreshold
} from "./main.js";
import { moveIndicator } from "./menu.js";


const canvas = document.getElementById("universe-canvas");
const ctx = canvas.getContext("2d");

// 初始化尺寸
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function updateGridSizeToFitHeight() {
    state.baseWidth = window.innerWidth / 24;
    state.baseHeight = window.innerHeight / 4;
}

// 限制 Y 方向边界
export function clampOffsetY(offsetY) {
    const gridSize = state.baseHeight * state.currentScale;
    const latCount = 4;
    const totalHeight = gridSize * latCount;
    const minY = -totalHeight + canvas.height; // 南极边缘
    const maxY = 0; // 北极边缘
    return Math.min(Math.max(offsetY, minY), maxY);
}

// 限制 X 方向边界
export function clampOffsetX(offsetX) {
    const gridWidth = state.baseWidth * state.currentScale;
    const lonCount = 24;
    const totalWidth = gridWidth * lonCount;
    const minX = -totalWidth + canvas.width;
    const maxX = 0;
    return Math.min(Math.max(offsetX, minX), maxX);
}

let offsetX = state.panX;
let offsetY = state.panY;
let scale = state.currentScale;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;


// 更新 word-nodes 的位置
export function updateWordNodeTransforms() {
    const scale = state.currentScale;

    const gridWidth = state.baseWidth * scale;
    const gridHeight = state.baseHeight * scale;

    const lonCount = 24;
    const latCount = 4;

    const totalWidth = gridWidth * lonCount;
    const totalHeight = gridHeight * latCount;

    const nodes = document.querySelectorAll(".word-node");

    nodes.forEach(node => {
        const xRatio = +node.dataset.x;
        const yRatio = +node.dataset.y;

        let baseX = xRatio * totalWidth + state.panX;
        let baseY = yRatio * totalHeight + state.panY;

        // 水平方向 wrap
        const centerX = window.innerWidth / 2;
        const wrappedX = baseX + Math.round((centerX - baseX) / totalWidth) * totalWidth;
        const wrappedY = baseY; // 垂直方向不 wrap

        node.style.left = `0px`;
        node.style.top = `0px`;
        node.style.position = 'absolute';
        node.style.transform = `translate(${wrappedX}px, ${wrappedY}px)`;
        node.style.transformOrigin = "top left";
    });
}

// 拖拽事件监听
canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const detailDiv = document.getElementById("word-details");
    detailDiv.classList.add("hidden");
});

canvas.addEventListener("mousemove", (e) => {
    if (isDragging) {
        offsetX += e.clientX - dragStartX;
        offsetY += e.clientY - dragStartY;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        state.panX = clampOffsetX(offsetX);
        state.panY = clampOffsetY(offsetY); // 加边界

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

    const zoomStep = 0.1;
    const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
    const newScale = Math.min(scaleThreshold, Math.max(1, scale + delta));

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    offsetX = mouseX - (mouseX - offsetX) * (newScale / scale);
    offsetY = mouseY - (mouseY - offsetY) * (newScale / scale);

    scale = newScale;

    state.currentScale = scale;
    state.panX = clampOffsetX(offsetX);
    state.panY = clampOffsetY(offsetY); // 加边界

    draw();
    updateWordNodeTransforms();
    updateRelations();
    moveIndicator(state.currentScale);
}, {
    passive: false
});

// 主绘图函数
export function draw() {
    offsetX = clampOffsetX(state.panX);
    offsetY = clampOffsetY(state.panY); // 边界
    scale = state.currentScale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gridWidth = state.baseWidth * scale;
    const gridHeight = state.baseHeight * scale;

    const lonCount = 24;
    const latCount = 4;

    const totalWidth = gridWidth * lonCount;
    const totalHeight = gridHeight * latCount;

    // 水平方向循环，垂直方向固定
    const modOffsetX = ((offsetX % totalWidth) - totalWidth) % totalWidth;

    const offsetsToDraw = [
        [modOffsetX, offsetY],
        [modOffsetX - totalWidth, offsetY],
        [modOffsetX + totalWidth, offsetY]
    ];

    offsetsToDraw.forEach(([ox, oy]) => {
        drawGridAtOffset(ox, oy, gridWidth, gridHeight, lonCount, latCount);
        drawSpecialLatLines(ox, oy, gridHeight, totalWidth);
    });
}

function drawGridAtOffset(offsetX, offsetY, gridWidth, gridHeight, lonCount, latCount) {
    for (let lonIdx = 0; lonIdx <= lonCount; lonIdx++) {
        for (let latIdx = 0; latIdx <= latCount; latIdx++) {
            const x = lonIdx * gridWidth + offsetX - gridWidth;
            const y = latIdx * gridHeight + offsetY - gridHeight;
            ctx.strokeStyle = "#F8EDD0";
            ctx.strokeRect(x, y, gridWidth, gridHeight);
        }
    }
}

function drawSpecialLatLines(offsetX, offsetY, gridHeight, totalWidth) {
    ctx.save();
    const latitudes = [{
            lat: 0,
            color: "#F8EDD0",
            dash: [],
            lineWidth: 2
        },
        {
            lat: 23.5,
            color: "#F8EDD0",
            dash: [5, 5],
            lineWidth: 1
        },
        {
            lat: -23.5,
            color: "#F8EDD0",
            dash: [5, 5],
            lineWidth: 1
        }
    ];

    latitudes.forEach(({
        lat,
        color,
        dash,
        lineWidth
    }) => {
        const latIdx = (90 - lat) / 45;
        const y = latIdx * gridHeight + offsetY;

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(dash);

        ctx.beginPath();
        ctx.moveTo(offsetX, y);
        ctx.lineTo(offsetX + totalWidth, y);
        ctx.stroke();
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


