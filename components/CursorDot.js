import { useRouter } from 'next/router';
import { useEffect } from 'react';
/**
 * 白点鼠标跟随
 * @returns 
 */
const CursorDot = () => {
    const router = useRouter();
    useEffect(() => {
        // 检查是否为触摸屏，触摸屏不显示自定义光标
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
        if (isTouchDevice) return;

        // 创建小白点元素
        const dot = document.createElement('div');
        dot.classList.add('cursor-dot');
        document.body.appendChild(dot);

        // 鼠标坐标和缓动目标坐标
        let mouse = { x: -100, y: -100 }; // 初始位置在屏幕外
        let dotPos = { x: mouse.x, y: mouse.y };

        // 监听鼠标移动
        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };
        document.addEventListener('mousemove', handleMouseMove);

        // 动画循环：延迟更新小白点位置
        const updateDotPosition = () => {
            const damping = 0.25; // 阻尼系数
            dotPos.x += (mouse.x - dotPos.x) * damping;
            dotPos.y += (mouse.y - dotPos.y) * damping;

            // 更新DOM
            dot.style.left = `${dotPos.x}px`;
            dot.style.top = `${dotPos.y}px`;

            requestAnimationFrame(updateDotPosition);
        };

        // 启动动画
        updateDotPosition();

        // 清理函数
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            if (document.body.contains(dot)) {
                document.body.removeChild(dot);
            }
        };
    }, [router]);

    return (
        <style jsx global>{`
            .cursor-dot {
                position: fixed;
                width: 8px;
                height: 8px;
                background: white;
                border-radius: 50%;
                pointer-events: none;
                transform: translate(-50%, -50%);
                z-index: 9999;
                mix-blend-mode: difference; /* 保持在不同背景下的可见性，白色背景下显黑色 */
            }
        `}</style>
    );
};

export default CursorDot;