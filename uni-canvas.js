import {
    state
} from "./state.js";
import {
    updateRelations
} from "./main.js";

const canvas = document.getElementById("universe-canvas");
const ctx = canvas.getContext("2d");
const wordNodesContainer = document.getElementById("word-nodes-container");

// 初始化尺寸
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let offsetX = state.panX;
let offsetY = state.panY;
let scale = state.currentScale;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

const lonStep = 15; // 经度步长
const latStep = 90; // 纬度步长

function updateGridSizeToFitHeight() {
    state.baseWidth = window.innerWidth / 24;
    state.baseHeight = window.innerHeight / 4;
    if (window.innerHeight * 2 < window.innerWidth) {
        state.baseGridSize = window.innerWidth / 24;
    } else {
        const latCount = 4;
        state.baseGridSize = window.innerHeight / latCount;
    }
}

// 限制 Y 方向边界
function clampOffsetY(offsetY, scale) {
    const gridSize = state.baseHeight * scale;
    const latCount = 4;
    const totalHeight = gridSize * latCount;
    const minY = -totalHeight + canvas.height; // 南极边缘
    const maxY = 0; // 北极边缘
    return Math.min(Math.max(offsetY, minY), maxY);
}

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

        // Y 不 wrap、不 clamp，直接用
        const wrappedY = baseY;

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
});

canvas.addEventListener("mousemove", (e) => {
    if (isDragging) {
        offsetX += e.clientX - dragStartX;
        offsetY += e.clientY - dragStartY;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        state.panX = offsetX;
        state.panY = clampOffsetY(offsetY, scale); // 加边界

        draw();
        updateWordNodeTransforms();
        updateRelations();
    }
});

canvas.addEventListener("mouseup", () => isDragging = false);
canvas.addEventListener("mouseleave", () => isDragging = false);

// 缩放事件监听
canvas.addEventListener("wheel", (e) => {
    e.preventDefault();

    const zoomStep = 0.1;
    const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
    const newScale = Math.min(4, Math.max(1, scale + delta));

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    offsetX = mouseX - (mouseX - offsetX) * (newScale / scale);
    offsetY = mouseY - (mouseY - offsetY) * (newScale / scale);

    scale = newScale;

    state.currentScale = scale;
    state.panX = offsetX;
    state.panY = clampOffsetY(offsetY, scale); // 加边界

    draw();
    updateWordNodeTransforms();
    updateRelations();
}, {
    passive: false
});

// 主绘图函数
export function draw() {
    offsetX = state.panX;
    offsetY = clampOffsetY(state.panY, state.currentScale); // 边界
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
        drawGridAtOffset(ox, oy, gridWidth, gridHeight,lonCount, latCount);
        drawSpecialLatLines(ox, oy, gridHeight, 10, latCount, totalWidth);
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

function drawSpecialLatLines(offsetX, offsetY, gridHeight, latStep, latCount, totalWidth) {
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

window.addEventListener("resize", () => {
    initialize();
});

initialize();