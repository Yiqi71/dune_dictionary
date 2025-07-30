// 渲染函数
function renderWordUniverse(wordsData) {
    const universeView = document.getElementById('universe-view');
    const wordNodesContainer = document.getElementById('word-nodes-container');

    // 清空容器（防止重复加载）
    wordNodesContainer.innerHTML = '';

    // 状态变量
    let currentScale = 1;
    let focusedWord = null;
    const scaleThreshold = 2.5; // 触发详细信息显示的缩放阈值

    // 创建单词节点
    wordsData.forEach(word => {
        const node = document.createElement('div');
        node.className = 'word-node';

        // 基础信息
        node.textContent = word.name;
        node.style.color = word.color;

        // 详细信息（zoom in后显示）
        const detailDiv = document.createElement('div');
        detailDiv.className = 'word-details';

        // 创建随机布局的子元素
        const elements = [{
                tag: 'img',
                content: '',
                attrs: {
                    src: word.image,
                    alt: word.name
                }
            },
            {
                tag: 'p',
                content: word.definition,
                class: 'definition'
            },
            {
                tag: 'p',
                content: `"${word.quote}"`,
                class:'quote'
            },
            {
                tag: 'p',
                content: `${word.originator}`,
                class: 'originator'
            }
        ];

        // 生成不重叠的30度倍数角度位置
        const usedAngles = new Set();
        
        elements.forEach(item => {
            const el = document.createElement(item.tag);
            if (item.content) el.textContent = item.content;
            if (item.attrs) Object.assign(el, item.attrs);
            if (item.class) el.className = item.class;

            // 在30度倍数中选择未使用的位置
            const angleSteps = 12; // 360度除以30度 = 12个位置
            let randomStep;
            let attempts = 0;
            
            do {
                randomStep = Math.floor(Math.random() * angleSteps); // 0-11
                attempts++;
            } while (usedAngles.has(randomStep) && attempts < 20);
            
            usedAngles.add(randomStep);
            const angle = (randomStep / angleSteps) * Math.PI * 2; // 转换为弧度
            const distance = 2; // 距离单词固定为200px
            const x = Math.cos(angle) * distance * 100;
            const y = Math.sin(angle) * distance * 100;

            Object.assign(el.style, {
                position: 'absolute',
                left: `50%`,
                top: `50%`,
                transform: `translate(-50%, -50%) translate(${x}%, ${y}%)`,
                opacity: '0',
                transition: 'all 0.5s ease-out'
            });

            // 延迟淡入
            setTimeout(() => {
                el.style.opacity = '1';
            }, Math.random() * 300); // 随机延迟产生错落效果

            detailDiv.appendChild(el);
        });

        node.appendChild(detailDiv);

        // 定位
        node.style.left = `${word.coordinates.x * 100}%`;
        node.style.top = `${word.coordinates.y * 100}%`;
        node.style.transform = `translate(-50%, -50%) translateZ(${word.coordinates.z * 100}px)`;

        node.addEventListener('click', () => zoomToWord(word));
        wordNodesContainer.appendChild(node);

        console.log('node rendered');
    });

    //   // 返回按钮事件
    //   backButton.addEventListener('click', zoomOut);

    // 滚轮缩放控制
    universeView.addEventListener('wheel', (e) => {
        e.preventDefault();

        // 计算缩放方向和中心点
        const delta = -e.deltaY * 0.01;
        const rect = universeView.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const originX = (mouseX / rect.width) * 100;
        const originY = (mouseY / rect.height) * 100;

        // 应用缩放，限制最大值为scaleThreshold
        currentScale = Math.max(1, Math.min(currentScale + delta, scaleThreshold+0.5));
        universeView.style.transformOrigin = `${originX}% ${originY}%`;
        universeView.style.transform = `scale(${currentScale})`;

        // 检测是否聚焦到某个单词
        updateWordFocus();
        // console.log(currentScale);
    });

    // 更新单词聚焦状态 - 基于视图中心
    function updateWordFocus() {
        // 获取视图中心坐标
        const viewportCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };

        // 清除之前聚焦的单词
        if (focusedWord) {
            focusedWord.classList.remove('focused');
            focusedWord = null;
        }

        // 如果缩放足够大（达到或超过阈值）
        if (currentScale >= scaleThreshold) {
            // 找出距离视图中心最近的单词
            let closestWord = null;
            let minDistance = Infinity;

            document.querySelectorAll('.word-node').forEach(node => {
                const rect = node.getBoundingClientRect();
                const nodeCenter = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };

                // 计算距离
                const distance = Math.sqrt(
                    Math.pow(nodeCenter.x - viewportCenter.x, 2) +
                    Math.pow(nodeCenter.y - viewportCenter.y, 2)
                );

                // 更新最近单词
                if (distance < minDistance) {
                    minDistance = distance;
                    closestWord = node;
                }
            });

            // 聚焦最近的单词
            if (closestWord) {
                closestWord.classList.add('focused');
                focusedWord = closestWord;
            }
        }
    }
}


// 初始化 - 等待DOM加载完成后获取数据
document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应不正常');
            }
            return response.json();
        })
        .then(data => {
            // 调用渲染函数，传入words数组
            renderWordUniverse(data.words);
        })
        .catch(error => {
            console.error('加载数据失败:', error);
            // 可以在这里添加错误处理UI，比如显示错误信息
            document.getElementById('word-nodes-container').innerHTML =
                '<p class="error">加载单词数据失败，请刷新重试</p>';
        });
});