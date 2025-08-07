import {
    state
} from "./state.js";


// window.addEventListener("DOMContentLoaded", () => {
// 所有画布代码放在这里

const canvas = document.getElementById("universe-canvas");
const ctx = canvas.getContext("2d");

const wordNodesContainer = document.getElementById("word-nodes-container");

// 初始化尺寸
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 画布状态
let offsetX = state.panX;
let offsetY = state.panY;
let scale = state.currentScale;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;


// 地理常量
const lonStep = 10; // 经度步长
const latStep = 10; // 纬度步长
let baseGridSize = 100; // 初始值，将会被动态计算

function updateGridSizeToFitHeight() {
    const latCount = 180 / latStep;
    baseGridSize = window.innerHeight / latCount;
}

// 更新 word-nodes 的位置
function updateWordNodeTransforms() {
    const nodes = document.querySelectorAll(".word-node");
    nodes.forEach(node => {
        const xRatio = +node.dataset.x; // x ∈ [0,1]
        const yRatio = +node.dataset.y; // y ∈ [0,1]

        const x = xRatio * window.innerWidth * scale + offsetX;
        const y = yRatio * window.innerHeight * scale + offsetY;

        node.style.top = `${y}px`;
        node.style.left = `${x}px`;

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
        state.panY = offsetY;

        // updateViewTransform();
        draw();
        updateWordNodeTransforms();
    }
});

canvas.addEventListener("mouseup", () => isDragging = false);
canvas.addEventListener("mouseleave", () => isDragging = false);

// 缩放事件监听
canvas.addEventListener("wheel", (e) => {
    e.preventDefault();

    const zoomStep = 0.08; // 缩放步长更细
    const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
    const newScale = Math.min(5, Math.max(1, scale + delta));

    // 缩放中心在鼠标指针位置
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // 计算缩放前后，保持视觉中心不变
    offsetX = mouseX - (mouseX - offsetX) * (newScale / scale);
    offsetY = mouseY - (mouseY - offsetY) * (newScale / scale);

    scale = newScale;

    state.currentScale = scale;
    state.panX = offsetX;
    state.panY = offsetY;

    // updateViewTransform();
    draw();
    updateWordNodeTransforms();
}, {
    passive: false
});


// 主绘图函数
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gridSize = baseGridSize * scale;

    // 经度和纬度格子数
    const lonCount = 360 / lonStep;
    const latCount = 180 / latStep;

    // 整个格子的总宽高（逻辑地图大小）
    const totalWidth = gridSize * lonCount;
    const totalHeight = gridSize * latCount;

    // 因为offsetX和offsetY可能很大或很小，做取模运算让偏移在0~地图大小之间循环
    const modOffsetX = ((offsetX % totalWidth) + totalWidth) % totalWidth;
    const modOffsetY = ((offsetY % totalHeight) + totalHeight) % totalHeight;

    // 要绘制的偏移组合（九宫格）
    const offsetsToDraw = [
        [modOffsetX, modOffsetY], // 中间
        [modOffsetX - totalWidth, modOffsetY], // 左边
        [modOffsetX + totalWidth, modOffsetY], // 右边
        [modOffsetX, modOffsetY - totalHeight], // 上边
        [modOffsetX, modOffsetY + totalHeight], // 下边
        [modOffsetX - totalWidth, modOffsetY - totalHeight], // 左上角
        [modOffsetX + totalWidth, modOffsetY - totalHeight], // 右上角
        [modOffsetX - totalWidth, modOffsetY + totalHeight], // 左下角
        [modOffsetX + totalWidth, modOffsetY + totalHeight] // 右下角
    ];

    // 每个位置都调用绘制格子
    offsetsToDraw.forEach(([ox, oy]) => {
        drawGridAtOffset(ox, oy, gridSize, lonCount, latCount);
        drawSpecialLatLines(ox, oy, gridSize, latStep, latCount, totalWidth, totalHeight);
    });
}

// 传入偏移，绘制整个格子网格
function drawGridAtOffset(offsetX, offsetY, gridSize, lonCount, latCount) {
    for (let lonIdx = 0; lonIdx <= lonCount; lonIdx++) {
        for (let latIdx = 0; latIdx <= latCount; latIdx++) {
            // 计算当前格子左上角坐标
            const x = lonIdx * gridSize + offsetX - gridSize; // -gridSize是因为画格线时格子右边界在 lonIdx+1 处
            const y = latIdx * gridSize + offsetY - gridSize;

            // 画格子或格线
            // 这里简单画格子边框
            ctx.strokeStyle = "#ccc";
            ctx.strokeRect(x, y, gridSize, gridSize);
        }
    }
}


// 绘制特殊线
function drawSpecialLatLines(offsetX, offsetY, gridSize, latStep, latCount, totalWidth, totalHeight) {
    ctx.save();

    const latitudes = [{
            lat: 0,
            color: "#555",
            dash: [],
            lineWidth: 2
        }, // 赤道，实线，加粗
        {
            lat: 23.5,
            color: "#555",
            dash: [5, 5],
            lineWidth: 1
        }, // 北回归线，虚线
        {
            lat: -23.5,
            color: "#555",
            dash: [5, 5],
            lineWidth: 1
        }, // 南回归线，虚线
        {
            lat: 66.5,
            color: "#555",
            dash: [5, 5],
            lineWidth: 1
        }, // 北极圈，虚线
        {
            lat: -66.5,
            color: "#555",
            dash: [5, 5],
            lineWidth: 1
        } // 南极圈，虚线
    ];

    latitudes.forEach(({
        lat,
        color,
        dash,
        lineWidth
    }) => {
        const latIdx = (90 - lat) / latStep;
        const y = latIdx * gridSize + offsetY;

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



// 初始化与 resize
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

// 初始化第一次绘制
initialize();


// });