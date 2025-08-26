import {
    state
} from "./state.js";

import {
    zoomToWord,
    updateWordDetails,
    updateWordFocus
} from "./main.js";

// 浮窗相关变量
let currentFloatingPanel = null;
let isPanelVisible = false;

function filterProposer(name) {
    const focusedWord = window.allWords.find(w => w.id == state.focusedNodeId);
    if (!focusedWord) return [];

    // 先渲染 proposer 相关的词
    const relatedContainer = document.createElement("div");
    relatedContainer.classList = `related-words`;

    relatedContainer.innerHTML = '';
    const relatedWords = window.allWords.filter(
        w => w.proposer === name && w.id !== focusedWord.id
    );
    relatedWords.forEach(w => {
        const link = document.createElement('div');
        link.id = `related-${w.id}`;
        link.textContent = w.term;
        link.style.display = 'block';

        // 点击跳转到这个单词
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetNodeId = link.id.replace('related-', '');
            zoomToWord(targetNodeId, state.currentScale);
            updateWordFocus();

            renderPanelSections();
            updateTabContent("book");
        });

        relatedContainer.appendChild(link);
    });
    return relatedContainer;
}

// 浮窗功能函数
export function showFloatingPanel() {
    const panel = document.getElementById('floating-panel');
    panel.classList.remove('hidden');
    isPanelVisible = true;
    currentFloatingPanel = panel;

    renderPanelSections();

    // 重置 tab 按钮状态
    const tabs = document.querySelectorAll('.panel-tabs button');
    tabs.forEach(btn => btn.classList.remove('active'));
    const entryTab = document.querySelector('.panel-tabs button[data-tab="entry"]');
    if (entryTab) entryTab.classList.add('active');
}

export function hideFloatingPanel() {
    const panel = document.getElementById('floating-panel');
    panel.classList.add('hidden');
    isPanelVisible = false;
    currentFloatingPanel = null;
}

export function renderPanelSections() {
    let currentWord = window.allWords.find(w => w.id == state.focusedNodeId);
    if (!currentWord) return;

    // 上半部分
    const title = document.querySelector('.panel-top');
    title.innerHTML = `
    <p> ${String(currentWord.id).padStart(4, '0')} </p>
    <img src = "${currentWord.concept_image}" alt = "diagrams[0]"></img> 
    <div>
    <div class = "term-main"> ${currentWord.term || '未知单词'} </div>
    <div class = "term-ori"> ${currentWord.termOri || '无'} </div></div>
    `

    // 下半部分
    const briefSec = document.getElementById("section-brief");
    const exampleSec = document.getElementById("section-example");
    const proposerSec = document.getElementById("section-proposers");
    const sourceSec = document.getElementById("section-source");
    const relatedSec = document.getElementById("section-related-works");
    const contributorsSec = document.getElementById("section-contributors");
    const editorsSec = document.getElementById("section-editors");

    briefSec.innerHTML = `<p class="left-title">简要释义</p>
                       <div>
                           <h2>${currentWord.brief_definition || '暂无简要释义'}</h2>
                           <h3>${currentWord.extended_definition || '暂无详细释义'}</h3>
                      </div>`;

    exampleSec.innerHTML = `<p class="left-title">例句</p>
                        <div>
                            <h3>${currentWord.example_sentence || '暂无例句'}</h3>
                            <div id="diagram-container"></div>
                        </div>`;
    const diagramContainer = document.getElementById("diagram-container");
    if (currentWord.diagrams && currentWord.diagrams.length > 0) {
        currentWord.diagrams.forEach(diagram => {
            const block = document.createElement("div");
            block.innerHTML = `
      <img src="${diagram.src}" alt="diagram image">
      <p class="diagram-caption">${diagram.caption}</p>
    `;
            diagramContainer.appendChild(block);
        });
    }

    proposerSec.innerHTML = `<p class="left-title">提出者</p>
                        <div id="proposers-container"> </div>`;
    const proposersContainer = document.getElementById("proposers-container");
    let proposers = currentWord.proposers;
    proposers.forEach((proposer) => {
        const proposerBlock = document.createElement("div");
        proposerBlock.classList="proposer-block";
        proposerBlock.innerHTML = `
        <img alt="proposer's img" src=${proposer.image}></img>
        <div>
            <p class="proposer-name">${proposer.name}</p>
            <p class="proposer-year">${proposer.year}</p>
            <p class="proposer-year">${proposer.role}</p>
        </div>
    `;

        const relatedContainer = filterProposer(proposer.name);
        proposerBlock.appendChild(relatedContainer);
        proposersContainer.appendChild(proposerBlock);
        console.log(proposer.image);
    })

    sourceSec.innerHTML = `<p class="left-title">出处</p>
                        <div>
                            <p>${currentWord.source || '暂无出处'}</p>
                        </div>`;

    relatedSec.innerHTML = `<p class="left-title">相关著作</p>
                        <div id="related-works-container">
                        ${currentWord.related_works.map(work => `<p>${work}</p>`).join('')}
                        </div>`;

    contributorsSec.innerHTML = `<p>${currentWord.contributor}</p>`;

    editorsSec.innerHTML = `<p class="left-title">编辑</p>
                        <div id="editors-container">
                        ${currentWord.editors.map(editor => `<p>${editor}</p>`).join('')}
                        </div>`
    renderScrollMarkers();
}

function renderCommentSection() {
    let currentWord = window.allWords.find(w => w.id == state.focusedNodeId);
    if (!currentWord) return;

    const contentScroll = document.querySelector('.panel-content');
    contentScroll.innerHTML = `
        <section id="section-comment">
            <p>评论</p>
            <div class="comment-list">
                ${currentWord.comments?.map(c => `<p><b>${c.author}：</b>${c.content}</p>`).join('') || '暂无评论'}
            </div>
        </section>
    `;
}

// tab 切换逻辑
function initTabs() {
    const tabs = document.querySelectorAll('.panel-tabs button');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.dataset.tab === 'entry') {
                renderPanelSections();
            } else if (btn.dataset.tab === 'comment') {
                renderCommentSection();
            } else if (btn.dataset.tab === 'top') {
                // 滚动到顶端，但保持entry内容显示
                renderPanelSections(); // 确保显示entry内容
                scrollToTop(); // 然后滚动到顶端
            }
        });
    });
}

// 初始化时调用
initTabs();

// 滚动到最顶端（panel-top位置）
function scrollToTop() {
    const panel = document.getElementById('floating-panel');
    const panelMain = panel.querySelector('.panel-main');

    if (!panelMain) return;

    panelMain.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// 滚动到对应 section
function updateTabContent(tabType = "brief") {
    const panel = document.getElementById('floating-panel');
    const panelMain = panel.querySelector('.panel-main');

    if (!panelMain) return;

    // tabType -> section 的映射
    const sectionMap = {
        comment: "section-comment",
        image: "section-image",
        book: "section-book",
        detail: "section-detail",
        brief: "section-brief"
    };

    const targetId = sectionMap[tabType] || sectionMap["brief"];
    const targetSection = document.getElementById(targetId);

    if (targetSection) {
        targetSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

// 滑轨配置参数
const SCROLL_CONFIG = {
    thumbMargin: 50, // thumb上下边距，可调整参数
    thumbSize: 14 // thumb大小
};

// 修改滚动相关的DOM选择器和逻辑
const panelMain = document.querySelector('.panel-main'); // 改为选择 panel-main
const scrollThumb = document.querySelector('.scroll-thumb');
const scrollTrack = document.querySelector('.scroll-track');

function updateThumbPosition() {
    if (!panelMain) return;

    const contentHeight = panelMain.scrollHeight;
    const visibleHeight = panelMain.clientHeight;
    const scrollTop = panelMain.scrollTop;

    if (contentHeight <= visibleHeight) {
        scrollThumb.style.display = 'none';
        return;
    }

    scrollThumb.style.display = 'block';

    // 计算thumb可活动范围
    const trackHeight = panelMain.clientHeight;
    const thumbActiveRange = trackHeight - (SCROLL_CONFIG.thumbMargin * 2);

    // 计算当前滚动比例
    const scrollRatio = scrollTop / (contentHeight - visibleHeight);

    // 计算thumb位置（在活动范围内）
    const thumbPosition = SCROLL_CONFIG.thumbMargin + (scrollRatio * thumbActiveRange);

    scrollThumb.style.top = `${thumbPosition}px`;
}

// 监听主容器滚动 → 更新圆点位置
if (panelMain) {
    panelMain.addEventListener('scroll', updateThumbPosition);
}

// 拖动功能
let isDragging = false;
let startY, startTop;

scrollThumb.addEventListener('mousedown', (e) => {
    isDragging = true;
    startY = e.clientY;
    startTop = parseFloat(scrollThumb.style.top) || SCROLL_CONFIG.thumbMargin;
    document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging || !panelMain) return;

    const deltaY = e.clientY - startY;
    const trackHeight = panelMain.clientHeight;
    const thumbActiveRange = trackHeight - (SCROLL_CONFIG.thumbMargin * 2);

    // 计算新的thumb位置（限制在活动范围内）
    let newTop = Math.min(
        Math.max(startTop + deltaY, SCROLL_CONFIG.thumbMargin),
        SCROLL_CONFIG.thumbMargin + thumbActiveRange
    );

    scrollThumb.style.top = `${newTop}px`;

    // 根据thumb位置计算内容滚动比例
    const thumbRatio = (newTop - SCROLL_CONFIG.thumbMargin) / thumbActiveRange;
    panelMain.scrollTop = thumbRatio * (panelMain.scrollHeight - panelMain.clientHeight);
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
});

// 初始更新一次位置
setTimeout(() => {
    updateThumbPosition();
}, 100);

function renderScrollMarkers() {
    if (!panelMain) return;

    // 清空旧的 marker
    scrollTrack.querySelectorAll(".scroll-marker").forEach(el => el.remove());

    const sections = [{
            id: "panel-top",
            label: "顶部",
            isTop: true
        }, // 新增顶部marker
        {
            id: "section-brief",
            label: "简要释义"
        },
        {
            id: "section-detail",
            label: "详细释义"
        },
        {
            id: "section-book",
            label: "提出人"
        },
        {
            id: "section-image",
            label: "图片"
        }
    ];

    const contentHeight = panelMain.scrollHeight;
    const visibleHeight = panelMain.clientHeight;
    const trackHeight = panelMain.clientHeight;
    const thumbActiveRange = trackHeight - (SCROLL_CONFIG.thumbMargin * 2);

    // 如果内容不需要滚动，不显示markers
    if (contentHeight <= visibleHeight) return;

    sections.forEach(sec => {
        let markerTop;
        let scrollTarget;

        if (sec.isTop) {
            // 顶部marker固定在thumb活动范围的最上方
            markerTop = SCROLL_CONFIG.thumbMargin;
            scrollTarget = 0; // 滚动到最顶部
        } else {
            const el = document.getElementById(sec.id);
            if (!el) return;

            // 计算section在整个内容中的相对位置
            const sectionTop = el.offsetTop;
            const contentScrollableRange = contentHeight - visibleHeight;

            // 计算滚动比例（当section滚动到顶部时的比例）
            const scrollRatio = Math.min(sectionTop / contentScrollableRange, 1);

            // 映射到thumb活动范围内的位置
            markerTop = SCROLL_CONFIG.thumbMargin + (scrollRatio * thumbActiveRange);
            scrollTarget = sectionTop;
        }

        // 生成 marker
        const marker = document.createElement("div");
        marker.className = "scroll-marker";
        marker.style.top = `${markerTop}px`;

        const tooltip = document.createElement("div");
        tooltip.className = "scroll-tooltip";
        tooltip.textContent = sec.label;
        marker.appendChild(tooltip);

        // 点击marker → 滚动到目标位置并让thumb居中对齐
        marker.addEventListener("click", () => {
            // 滚动到目标位置
            panelMain.scrollTo({
                top: scrollTarget,
                behavior: "smooth"
            });

            // 更新thumb位置使其对齐到marker
            setTimeout(() => {
                scrollThumb.style.top = `${markerTop}px`;
            }, 50); // 延迟一点确保滚动开始后再更新
        });

        scrollTrack.appendChild(marker);
    });
}

// 点击外部关闭浮窗
function initClickOutsideHandler() {
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('floating-panel');
        if (isPanelVisible && !panel.contains(e.target)) {
            hideFloatingPanel();
        }
    });
}

// click detail - scroll to according section
const termDiv = document.getElementById("term");
const commentDiv = document.getElementById("comment");
const proposerDiv = document.getElementById("proposer");
const imageDiv = document.getElementById("image");

// 点击「词条/标题」- 滚动到最顶端
termDiv.addEventListener("click", (e) => {
    e.stopPropagation();
    showFloatingPanel();
    scrollToTop(); // 使用新的滚动到顶端函数
});

// 点击「评论」
commentDiv.addEventListener("click", (e) => {
    e.stopPropagation();
    showFloatingPanel();
    renderCommentSection();
});

// 点击「相关著作 / 提出者」
proposerDiv.addEventListener("click", (e) => {
    e.stopPropagation();
    showFloatingPanel();
    updateTabContent("book");
});

// 点击「图片」
imageDiv.addEventListener("click", (e) => {
    e.stopPropagation();
    showFloatingPanel();
    updateTabContent("image");
});

// 初始化浮窗功能
initClickOutsideHandler();