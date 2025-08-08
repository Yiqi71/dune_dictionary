import {
    state
} from "./state.js";

import {
    zoomToWord
} from "./main.js";

// 浮窗相关变量
let currentFloatingPanel = null;
let isPanelVisible = false;

function filterProposer() {
    const focusedWord = window.allWords.find(w => w.id == state.focusedNodeId);

    // 先渲染 proposer 相关的词
    const relatedContainer = document.getElementById('related-words');
    if (!relatedContainer) return;
    relatedContainer.innerHTML = '';

    const relatedWords = window.allWords.filter(
        w => w.proposer === focusedWord.proposer && w.id !== focusedWord.id
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
            console.log(targetNodeId);
            zoomToWord(targetNodeId); // 用你现成的 zoomToWord(node) 逻辑
            updateTabContent("book");
        });

        relatedContainer.appendChild(link);
    });
}

// 浮窗功能函数
export function showFloatingPanel(word, node) {
    const panel = document.getElementById('floating-panel');
    const contentScroll = panel.querySelector('.content-scroll');

    // 显示浮窗
    panel.classList.remove('hidden');
    isPanelVisible = true;
    currentFloatingPanel = panel;

    // 重置标签状态
    const tabs = panel.querySelectorAll('.tab-item');
    tabs.forEach(tab => tab.classList.remove('active'));
    tabs[0].classList.add('active');
}

function hideFloatingPanel() {
    const panel = document.getElementById('floating-panel');
    panel.classList.add('hidden');
    isPanelVisible = false;
    currentFloatingPanel = null;
}

// 更新浮窗标签内容
function updateTabContent(tabType) {
    const panel = document.getElementById('floating-panel');
    const contentScroll = panel.querySelector('.content-scroll');

    let currentWord = window.allWords.find(w => w.id == state.focusedNodeId);
    if (!currentWord) return;

    switch (tabType) {
        case 'comment':
            contentScroll.innerHTML = `<h3>图片</h3>
                <img src='${currentWord.diagrams[0]}' alt='${currentWord.term}' style='max-width:100%;border-radius:8px;box-shadow:0 2px 8px #0002;margin-bottom:10px;'><p>${currentWord.term}</p>`;
            break;
        case 'image':
            contentScroll.innerHTML = `<h3>图片</h3>
                <img src='${currentWord.diagrams[0]}' alt='${currentWord.term}' style='max-width:100%;border-radius:8px;box-shadow:0 2px 8px #0002;margin-bottom:10px;'><p>${currentWord.term}</p>`;
            break;
        case 'book':
            contentScroll.innerHTML = `<h3>相关著作</h3>
                <p>${currentWord.proposer ? '提出者：' + currentWord.proposer : '暂无相关著作信息'}</p>
                <p>提出国：${currentWord.proposing_country || '未知'}</p>
                <p>提出时间：${currentWord.proposing_time || '未知'}</p>
                <div id="related-words"></div>`;
            filterProposer();
            break;
        case 'detail':
            contentScroll.innerHTML = `<h3>详细释义</h3>
                <p>${currentWord.extended_definition || '暂无详细释义'}</p>
                <p style='color:#888;font-size:13px;margin-top:10px;'>参考资料：${currentWord.references || '暂无'}</p>`;
            break;
        case 'brief':
            contentScroll.innerHTML = `<h3>简要释义</h3>
                <p>${currentWord.brief_definition || '暂无简要释义'}</p>`;
            break;
        default:
            contentScroll.innerHTML = `<h3>简要释义</h3>
                <p>${currentWord.brief_definition || '暂无简要释义'}</p>`;
    }
}

// 标签切换功能
function initTabSwitching() {
    const panel = document.getElementById('floating-panel');
    const commentTab = panel.querySelector('.panel-tabs.comment-tabs .tab-item');
    const tabs = panel.querySelectorAll('.panel-bottom .tab-item');

    const contentScroll = panel.querySelector('.content-scroll');
    const commentScroll = panel.querySelector('.comment-scroll');

    let currentWord = null;
    const tabOrder = ['comment', 'image', 'book', 'detail', 'brief'];
    let currentTabIndex = 4; // 默认简要释义（最下面）

    showFloatingPanel = function (word, node) {
        currentWord = word;
        currentTabIndex = 4; // 默认简要释义
        updateTabContent(tabOrder[currentTabIndex]);
        updateCommentContent();
        panel.classList.remove('hidden');
        isPanelVisible = true;
        currentFloatingPanel = panel;
        tabs.forEach(tab => tab.classList.remove('active'));
        tabs[currentTabIndex - 1].classList.add('active'); // 减1因为评论不在下半部分
        commentTab.classList.remove('active');
    };

    function updateCommentContent() {
        if (!currentWord) return;
        if (currentWord.comments && currentWord.comments.length > 0) {
            let commentsHtml = '';
            currentWord.comments.forEach(comment => {
                commentsHtml += `
                        <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <div style="font-weight: bold; color: #333; margin-bottom: 5px;">${comment.author}</div>
                            <div style="color: #666; line-height: 1.5;">${comment.content}</div>
                            <div style="font-size: 12px; color: #999; margin-top: 5px;">${comment.date}</div>
                        </div>
                    `;
            });
            commentScroll.innerHTML = commentsHtml;
        } else {
            commentScroll.innerHTML = `<p>暂无评论，欢迎补充！</p>`;
        }
    }


    // 滚轮切换标签（包含评论标签）
    contentScroll.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            // 向上切换，不能穿梭
            if (currentTabIndex > 0) {
                currentTabIndex--;
                updateTabContent(tabOrder[currentTabIndex]);

                // 更新标签高亮状态
                if (currentTabIndex === 0) {
                    // 滚动到评论位置
                    commentTab.classList.add('active');
                    tabs.forEach(tab => tab.classList.remove('active'));
                } else {
                    // 滚动到其他位置
                    commentTab.classList.remove('active');
                    tabs.forEach(tab => tab.classList.remove('active'));
                    tabs[currentTabIndex - 1].classList.add('active'); // 减1因为评论不在下半部分
                }
            }
        } else if (e.deltaY > 0) {
            // 向下切换，不能穿梭
            if (currentTabIndex < tabOrder.length - 1) {
                currentTabIndex++;
                updateTabContent(tabOrder[currentTabIndex]);

                // 更新标签高亮状态
                commentTab.classList.remove('active');
                tabs.forEach(tab => tab.classList.remove('active'));
                tabs[currentTabIndex - 1].classList.add('active'); // 减1因为评论不在下半部分
            }
        }
    });

    // 下半部分标签点击切换
    tabs.forEach((tab, idx) => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            commentTab.classList.remove('active');
            currentTabIndex = idx + 1; // 加1因为评论占用了索引0
            updateTabContent(tabOrder[currentTabIndex]);
        });
    });

    // 评论标签点击
    commentTab.addEventListener('click', () => {
        commentTab.classList.add('active');
        tabs.forEach(tab => tab.classList.remove('active'));
        currentTabIndex = 0;
        updateTabContent(tabOrder[currentTabIndex]);
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

// 初始化浮窗功能
initTabSwitching();
initClickOutsideHandler();