<script setup lang="ts">
// placeholder by crrashh1542 on 2026-10-17
</script>

<template>
    <div class="home">
        <div class="bg-grid" aria-hidden="true"></div>
        <div class="bg-blobs" aria-hidden="true">
            <span class="blob-a"></span>
            <span class="blob-b"></span>
            <span class="blob-c"></span>
            <span class="blob-d"></span>
        </div>

        <main>
            <!-- 第一屏 标题 -->
            <div class="sec-first">
                <div class="left">
                    <h1>Let's</h1>
                    <h1>
                        <span class="accent">Build</span>
                        <span> Here</span>
                        <span class="cursor"></span>
                    </h1>
                    <div class="links">
                        <span>
                            <a href="https://github.com/suse-edu-cn" target="_blank" rel="noopener noreferrer">
                                关注 GitHub
                                <i class="pi pi-arrow-up-right"></i>
                            </a>
                        </span>
                        <span>
                            <a
                                href="https://github.com/suse-edu-cn/suse-oaa-app/releases"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                获取青蟹 App
                                <i class="pi pi-arrow-up-right"></i>
                            </a>
                        </span>
                    </div>
                </div>
                <div class="right">
                    <p>欢迎加入四川轻化工大学开放原子开源协会</p>
                </div>
            </div>

            <!-- 第二屏 关于 -->
            <div class="sec-second">
                <div class="sec-title">关于我们</div>
                <div class="card-grid split">
                    <div class="card-aside">
                        <div class="card">
                            <div class="title">实验室</div>
                            <p>
                                自协会创立以来，已有超过 500 位来自不同专业、不同年级的 SUSEer
                                加入协会实验室。在实验室的浓厚研究氛围中，我们怀揣梦想、相互鼓励、不断创造，借助协会实验室为我们提供的设备与条件，用算法追逐梦想，用代码书写未来。
                            </p>
                        </div>
                        <div class="card">
                            <div class="title">青蟹</div>
                            <p>
                                青蟹是开放原子开源协会的设计并制作的协会管理系统，承担协会介绍、SSO
                                单点登录、比赛事项与协同管理中台等多种功能，用以简化协会日常相关事项和流程。我们已将青蟹相关代码开源至
                                GitHub，希望以这种方式回馈开源社区。
                            </p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="title">开放原子开源协会</div>
                        <p>
                            开放原子开源协会由计算机学院主办，前身是2002年建立的大学生网络技术协会。经多年发展和合并，为积极响应国家开源战略，推广开源理念与文化，并在开放原子开源基金会的支持与赞助下正式更名。
                        </p>
                        <p>
                            协会的宗旨是传播计算机文化、开源理念与技术知识，普及计算机实用技能，扶持计算机技术爱好者，开展学术与技术交流。通过组织各类活动，丰富校园生活，为技术爱好者构建一个开放、共享、协作的学习交流平台，积极组织并支持参与各类科技竞赛、开源项目与创新实践活动，为有志于深入学习计算机技术的同学提供实践机会与项目支撑。
                        </p>
                    </div>
                </div>
            </div>

            <!-- 第三屏 组织 -->
            <div class="sec-third">
                <div class="sec-title">协会组织</div>
                <div class="card-grid quad">
                    <div class="card">
                        <div class="title">算法竞赛部</div>
                        <p>
                            算法竞赛部主要负责组织成员参加各类大型算法竞赛，日常负责举办算法周赛，周末组织综合知识讨论并准备竞赛题目，带领会员完成常规算法题并分享解题思路。此外，还协助算法竞赛部部长和其他部门完成相关工作，并引导本部门低年级干事学习。
                        </p>
                    </div>
                    <div class="card">
                        <div class="title">项目实践部</div>
                        <p>
                            项目实践部主要负责真实的项目开发，参与从需求分析到代码落地的全流程。我们学习并跟进前沿技术栈，在项目里培养工程素质，在实践中总结实用知识，同时为较新的部门成员培养项目意识、传授开发经验。
                        </p>
                    </div>
                    <div class="card">
                        <div class="title">组织宣传部</div>
                        <p>
                            组织宣传部主要负责协会活动及竞赛的策划、组织和包括招新换届的工作在内的人员调配，此外需要设计制作或定做与协会活动有关的宣传物料等，并负责运营媒体平台、记录协会相关事宜。
                        </p>
                    </div>
                    <div class="card">
                        <div class="title">理事会 & 秘书处</div>
                        <p>
                            理事会拥有协会的最高管理权，负责协会重大事务讨论，在协会内部拓展活动，增强组织内部凝聚力，定期协调工作、召开会议、汇报工作。
                            秘书处主要负责协会的会议、财务相关工作，此外还需要负责保存、管理协会的重要资料和会员相关信息。
                        </p>
                    </div>
                </div>
            </div>

            <!-- 第四屏 结尾卡片 -->
            <div class="sec-fourth">
                <div class="cta">
                    <h2>加入我们</h2>
                    <p><span>S</span>TAY <span>U</span>NSTOPPABLE, <span>S</span>TAY <span>E</span>XCEPTIONAL.</p>
                    <div>
                        <a
                            class="button"
                            href="https://github.com/suse-edu-cn"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            GitHub @suse-edu-cn
                        </a>
                        &nbsp;
                        <router-link class="button" to="/auth"> 登录青蟹 </router-link>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<style lang="less" scoped>
.home {
    position: relative;
    display: flow-root; // 阻止首屏 margin 向外折叠，否则容器顶边被推离 header，背景上探基准失准
    --header-h: calc(3.75rem + 16px); // header 高度 3.75rem + 上下 padding 各 8px
    --section-display: row;
    --section-justify: flex-start;
    --section-align: center;
    --section-first-height: 52vh;
    --section-first-margin: 10vh;
    --title-font-size: 80px;
    --title-cursor-height: 10px;
    --title-min-width: 600px;

    max-width: calc(1600px + 8em);
    margin: auto;
    color: var(--p-text-color);

    // 网格背景
    .bg-grid {
        position: absolute;
        top: calc(-1 * var(--header-h)); // 上探覆盖整个header
        left: calc(50% - 50vw); // 通栏铺满viewport
        z-index: -1;
        width: 100vw;
        height: calc(var(--header-h) + var(--section-first-margin) * 2 + var(--section-first-height));
        background-image:
            linear-gradient(to bottom, rgba(255, 255, 255, 0) 85%, #fff 99%),
            linear-gradient(to right, rgba(24, 24, 27, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(24, 24, 27, 0.06) 1px, transparent 1px);
        background-size:
            auto,
            60px 60px,
            60px 60px;
        pointer-events: none;
    }

    // 模糊色块
    .bg-blobs {
        position: absolute;
        top: calc(-1 * var(--header-h)); // 上探覆盖整个header
        left: calc(50% - 50vw); // 通栏铺满视口
        z-index: -1;
        width: 100vw;
        height: calc(var(--header-h) + var(--section-first-margin) * 2 + var(--section-first-height));
        overflow: hidden;
        pointer-events: none;

        span {
            position: absolute;
            border-radius: 50%;
            filter: blur(96px);
        }

        .blob-a {
            top: 10%;
            left: 0;
            width: min(640px, 72vw);
            height: min(480px, 56vw);
            background: var(--p-emerald-400);
            opacity: 0.15;
            animation: blob-a-drift 12s ease-in-out -3s infinite;
        }

        .blob-b {
            top: -12%;
            right: 0;
            width: min(480px, 64vw);
            height: min(400px, 52vw);
            background: var(--p-teal-300);
            opacity: 0.25;
            animation: blob-b-drift 12s ease-in-out -9s infinite;
        }

        .blob-c {
            top: 50%;
            left: 33%;
            width: min(440px, 50vw);
            height: min(280px, 35vw);
            background: var(--p-teal-300);
            opacity: 0.15;
            animation: blob-c-drift 12s ease-in-out -14s infinite;
        }

        .blob-d {
            bottom: 2%;
            right: 13%;
            width: min(580px, 70vw);
            height: min(380px, 44vw);
            background: var(--p-emerald-300);
            opacity: 0.2;
            animation: blob-d-drift 12s ease-in-out -6s infinite;
        }

        &::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 55%, #fff 96%);
        }
    }

    // 分节标题
    .sec-title {
        margin: 10px 0 0;
        font-size: 36px;
        font-weight: 800;
        letter-spacing: -1px;
        line-height: 1.2;
        color: var(--p-text-color);
    }

    // 信息卡片
    .card-grid {
        display: grid;
        margin-top: 40px;
        gap: 24px;

        // 侧栏卡片 + 主卡（第二屏）
        &.split {
            grid-template-columns: 1fr 1.15fr;
            grid-template-areas: 'aside main';

            .card-aside {
                grid-area: aside;
                display: flex;
                flex-direction: column;
                gap: 24px;

                .card {
                    flex: 1;
                }
            }

            > .card:last-child {
                grid-area: main;
            }
        }

        // 2*2（第三屏）
        &.quad {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    // 信息卡片
    .card {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        background: #fff;
        border: 1px solid #eceff1;
        border-radius: 20px;
        padding: 18px 27px;
        transition:
            background-color 0.25s ease,
            border-color 0.25s ease,
            box-shadow 0.25s ease;

        &:hover {
            background: var(--p-emerald-900);
            border-color: var(--p-emerald-900);
            box-shadow: 0 20px 44px -24px rgba(6, 78, 59, 0.55);

            .title {
                background: linear-gradient(120deg, var(--p-emerald-50), var(--p-teal-100));
                -webkit-background-clip: text;
                background-clip: text;
            }

            p {
                color: rgba(255, 255, 255, 0.82);
            }
        }

        .title {
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -1px;
            margin-top: 36px;
            background: linear-gradient(120deg, var(--p-emerald-800), var(--p-teal-600));
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }

        p {
            margin: 14px 0 0;
            font-size: 15px;
            font-weight: 400;
            letter-spacing: 0.5px;
            line-height: 1.5;
            color: var(--p-text-muted-color);
            transition: color 0.25s ease;
        }

        .wordmark {
            margin: 0;
            font-size: 64px;
            font-weight: 800;
            letter-spacing: -2px;
            line-height: 1.15;
        }
    }
}

// 第一屏 标题
.sec-first {
    display: flex;
    height: var(--section-first-height);
    margin: var(--section-first-margin) 0;
    padding: 0 18px;
    flex-direction: var(--section-display);
    justify-content: var(--section-justify);
    align-items: var(--section-align);
    gap: 48px;

    .left {
        display: flex;
        width: 55%;
        min-width: var(--title-min-width);
        flex-direction: column;

        h1 {
            font-family:
                'JetBrains Mono Variable', 'JetBrains Mono', source-code-pro, Consolas, 'Courier New', monospace;
            font-weight: 800;
            margin: 0;
            font-size: var(--title-font-size);
            letter-spacing: -3.5px;
        }

        .accent {
            color: var(--p-emerald-600);
        }

        .cursor {
            display: inline-block;
            height: var(--title-cursor-height);
            width: 24px;
            margin-left: 0.15em;
            background-color: var(--p-text-color);
            animation: blink 1s infinite;
        }
    }

    .links {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 2em;

        a {
            line-height: 2;
            padding-left: 0.5em;
            font-weight: 500;
            transition: all 0.2s ease;

            i {
                font-size: 15px;
                transform: translateX(-1px) translateY(1px);
                transition: transform 0.2s;
            }

            &:hover i {
                transform: translateX(1px);
            }
        }
    }

    .right {
        max-width: 380px;

        p {
            margin: 0;
            font-size: 17px;
            font-weight: 400;
            color: var(--p-text-muted-color);
            letter-spacing: 0.5px;
            line-height: 2;
        }
    }
}

// 第二、三屏（关于 / 组织）
.sec-second,
.sec-third {
    margin-top: 3em;
    padding: 0 18px;
}

// 第四屏 结尾
.sec-fourth {
    margin-top: 110px;
    margin-bottom: 110px;
    padding: 0 18px;

    .cta {
        overflow: hidden;
        border-radius: 28px;
        padding: 90px 36px;
        text-align: center;
        background:
            radial-gradient(120% 160% at 85% 0%, rgba(69, 222, 178, 0.35) 0%, transparent 55%),
            linear-gradient(135deg, var(--p-emerald-700), var(--p-teal-500));
        box-shadow: 0 32px 64px -32px rgba(5, 150, 105, 0.5);

        h2 {
            margin: 0;
            font-size: 40px;
            font-weight: 800;
            letter-spacing: -1px;
            color: #fff;
        }

        p {
            margin: 16px auto 0;
            font-size: 16px;
            line-height: 1.8;
            color: rgba(255, 255, 255, 0.85);
            letter-spacing: 2px;

            span {
                font-size: 22px;
                font-weight: 600;
                letter-spacing: 3px;
            }
        }

        .button {
            display: inline-flex;
            margin-top: 24px;
            align-items: center;
            gap: 10px;
            padding: 12px 30px;
            border-radius: 99px;
            background: #fff;
            color: var(--p-emerald-700);
            font-size: 15px;
            font-weight: 600;
            line-height: 1.8;
            box-shadow: 0 12px 28px -12px rgba(0, 0, 0, 0.35);

            i {
                font-size: 18px;
            }
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

// 色块漂移动画
@keyframes blob-a-drift {
    0%,
    100% {
        transform: translate(0, 0);
    }

    30% {
        transform: translate(60px, 40px);
    }

    65% {
        transform: translate(-30px, 70px);
    }
}

@keyframes blob-b-drift {
    0%,
    100% {
        transform: translate(0, 0);
    }

    40% {
        transform: translate(-70px, 30px);
    }

    75% {
        transform: translate(-20px, -40px);
    }
}

@keyframes blob-c-drift {
    0%,
    100% {
        transform: translate(0, 0);
    }

    35% {
        transform: translate(50px, -50px);
    }

    70% {
        transform: translate(-40px, 30px);
    }
}

@keyframes blob-d-drift {
    0%,
    100% {
        transform: translate(0, 0);
    }

    45% {
        transform: translate(-60px, -35px);
    }

    80% {
        transform: translate(30px, -60px);
    }
}

@media (prefers-reduced-motion: reduce) {
    .home .bg-blobs span {
        animation: none;
    }
}

// 平板临界区缩小标题并放开最小宽度，否则会挤压右侧欢迎语
@media screen and (min-width: 1000px) and (max-width: 1199.98px) {
    .home {
        --title-font-size: 64px;
        --title-min-width: 0;
    }
}

@media screen and (max-width: 1000px) {
    .home {
        --section-display: column;
        --section-justify: center;
        --section-align: flex-start;
        --section-first-height: 80vh;
        --title-font-size: clamp(40px, 12vw, 56px);
        --title-cursor-height: 7px;
        --title-min-width: 0;
    }

    .sec-first {
        .left {
            width: 100%;
        }

        .right {
            margin-top: 0;
            max-width: none;
        }
    }

    .sec-title {
        font-size: 36px;
    }

    .card {
        padding: 28px;

        .wordmark {
            font-size: 48px;
        }
    }

    .sec-second .card-grid.split {
        grid-template-columns: 1fr;
        grid-template-areas:
            'main'
            'aside';
    }

    .sec-third .card-grid.quad {
        grid-template-columns: 1fr;
    }

    .sec-fourth .cta {
        padding: 64px 24px;

        h2 {
            font-size: 36px;
        }
    }
}
</style>
