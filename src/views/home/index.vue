<script setup lang="ts"></script>

<template>
    <div class="bg-top"></div>
    <main>
        <div class="sec-first">
            <div class="left">
                <h1>Let's</h1>
                <h1>
                    <span style="color: var(--p-emerald-600)">Build Here</span>
                    <span class="cursor"></span>
                </h1>
                <div class="links">
                    <a href="https://github.com/suse-edu-cn" target="_blank" rel="noopener noreferrer">
                        关注 GitHub
                        <i class="pi pi-arrow-up-right"></i>
                    </a>
                </div>
            </div>
            <div class="right">
                <p>欢迎加入四川轻化工大学开放原子开源协会</p>
            </div>
        </div>
    </main>
</template>

<style lang="less" scoped>
.bg-top {
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
    width: 100%;
    height: 480px;
    background: linear-gradient(to bottom, var(--p-emerald-100) 0%, var(--p-emerald-50) 15%, #fff 100%);
}

.links {
    margin-top: 24px;

    a {
        font-size: 18px;
        transition: all 0.2s;

        i {
            font-size: 16px;
            transition: all 0.2s;
            transform: translateY(2px);
        }
    }

    a:hover {
        color: var(--p-emerald-600);

        i {
            transform: translateX(2px);
        }
    }
}

.sec-first {
    display: flex;
    height: 70vh;
    flex-direction: var(--section-display);
    justify-content: var(--section-justify);
    align-items: var(--section-align);
    gap: 40px;

    .left {
        display: flex;
        width: 55%;
        min-width: var(--title-min-width);
        flex-direction: column;

        h1 {
            font-family: 'FiraCode Nerd Font Mono', 'FiraCode Mono', monospace;
            margin: 0;
            font-size: var(--title-font-size);
            font-weight: 600;
            letter-spacing: -2.5px;
            line-height: 1.2;
        }

        .cursor {
            display: inline-block;
            height: var(--title-cursor-height);
            width: 24px;
            margin-left: 0.15em;
            background-color: var(--p-emerald-600);
            animation: blink 1s infinite;
        }
    }

    .right {
        display: flex;
        flex-direction: column;
        font-size: 20px;
        font-weight: 500;
        margin-top: 4em;

        p {
            color: var(--p-text-muted-color);
            margin: 0;
            line-height: 1.5;
        }
    }
}

// 光标动画
@keyframes blink {
    0%,
    49% {
        visibility: visible;
    }

    50%,
    100% {
        visibility: hidden;
    }
}

// 变量
main {
    --section-display: row;
    --section-justify: flex-start;
    --section-align: center;
    --title-font-size: 80px;
    --title-cursor-height: 10px;
    --title-min-width: 600px;
}

@media screen and (max-width: 1000px) {
    main {
        --section-display: column;
        --section-justify: center;
        --section-align: flex-start;
        --title-font-size: 56px;
        --title-cursor-height: 7px;
        --title-min-width: 400px;
    }
}
</style>
