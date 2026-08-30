/*
============================================================
中国法律监控 V6.4（V5/V6 原地加固版）
Loon 3.5.0+

加固点（相对 V5）：
1. flcaw 只抓「正在征求意见」(flag=0)，摒弃 flag=1 已结束的历史草案（曾上百条污染推送、截止日错乱）
2. 新增「全国人大-权威发布」源，精准捕获主席令与最近通过/公布的法律
3. flcaw 草案直接注入《法律名称》（接口返回名无书名号，旧正则提取失败→通知只剩日期）
4. 已公布法律（法/条例/办法/规定…结尾的纯名称）纳入识别、「新法/法规」分类并加权置顶
5. 过期草案（截止日<今日）不推送；并行抓取/协议回退/短标题豁免等 V6 加固全部保留

核心目标：
1. 新发布法律
2. 正在审议法律
3. 法律草案
4. 公开征求意见
5. 行政法规
6. 司法解释
7. 部门规章
8. 立法工作计划
9. 重点关注：
   - 行政复议
   - 行政诉讼
   - 行政处罚
   - 不动产
   - 房地产
   - 土地
   - 征收拆迁
   - 物业
   - 住房
   - 民法典
   - 合同
   - 消费者
   - 公司
   - 劳动
   - 个人信息
   - 数据安全

============================================================
*/


/* ==========================================================
   1. 配置
========================================================== */

const CONFIG = {

    maxNotification: 8,

    /*
     * 首跑是否推送已捕获条目（默认开）：
     * 关掉则恢复"首跑静默建库"旧行为。
     * 用途：换新版本 / 清空历史后，首跑会把当前列表里
     * 的法律 / 草案一次性推给你，而不是静默吞掉。
     */
    notifyOnFirstRun: true,

    /*
     * 0 新增也发汇总通知（默认开）：
     * 默认情况下，后续运行若所有条目都已入库（0 新增），
     * 脚本只打日志、不发任何通知，通知中心会一片空白，
     * 用户容易误以为"没跑 / 出错了"。
     * 打开后：抓到法律信息但 0 新增时，也发一条汇总通知，
     * 正文是分类计数、点击打开本次完整清单（含原文链接）。
     * 若觉得每日都弹太吵，设 false 关闭。
     */
    notifyDigestWhenNoNew: true,

    /*
     * 汇总通知里报告页最多含多少条（默认 40），
     * 超出部分截断为"前 N 条"，避免 data: URL 过长 iOS 打不开。
     */
    digestMaxItems: 40,

    /*
     * 详情页富化（默认开）：
     * 对"法律公布/征求意见/草案/法规"等类目抓取详情页，
     * 补出《法律名称》+ 通过日 + 施行日，让通知不再是干瘪的列表标题。
     * 关闭则只用列表标题（更快、请求更少）。
     */
    enrichDetail: true,

    /*
     * 富化并发数（默认 4），避免短时间大量请求触发政务网频控。
     */
    enrichConcurrency: 4,

    maxHistory: 2000,

    timeout: 30000,

    /*
     * 详情页富化单独超时（默认 6s）。
     * 列表抓取用上面的 timeout（30s），但富化只是"锦上添花"，
     * 个别详情页响应慢不应拖垮整轮脚本（G意见3 #4）。
     */
    enrichTimeout: 6000,

    /*
     * 并行抓取（true = Promise.all；false = 串行）
     */
    parallel: true,

    /*
     * flcaw 调试开关：
     * 打开后把【原始 HTML 响应】整段打印到 Loon 控制台日志
     * （标记 DEBUG_FLCAP_RAW 开始/结束），用于定位抓取问题。
     * 诊断完成后请保持 false，避免日志刷屏。
     */
    debugFlcaw: false,

    /*
     * 是否一并抓取「已结束」的历史草案（flcaw flag=1）。
     * 默认 false：只监控「正在征求意见」(flag=0)。
     * 历史草案常上百条、截止日早已过期，混入会与正在征集的
     * 草案同等对待、挤占推送名额、造成"时空错乱"。
     * 仅在确实需要历史归档时设 true（仍不进单条通知/正在征集看板）。
     */
    flcawIncludeEnded: false,

    /*
     * 主 URL 失败时自动翻转 http/https 重试
     */
    useFallbackScheme: true,

    /*
     * 标题最小长度（含法律/重点关键词的短名不受此限）
     */
    minTitleLen: 4,

    /*
     * 定向栏目（已修复协议与最新路径）
     */

    sources: [

        /*
         * 全国人大 - 权威发布（主席令、新通过/公布的法律集中发布页）
         * 新增源：精准捕获"最近通过的法律"（GH/Q/DP/GR 四份意见一致要求）
         */

        {
            name: "全国人大-权威发布",
            url: "http://www.npc.gov.cn/npc/c2/c12435/"
        },

        /*
         * 全国人大 - 立法 (换用 http 解决 TLS 握手失败)
         */

        {
            name: "全国人大-立法",
            url: "http://www.npc.gov.cn/npc/c2/c183/index.html"
        },

        /*
         * 全国人大 - 立法动态 (换用 http)
         */

        {
            name: "全国人大-立法动态",
            url: "http://www.npc.gov.cn/npc/c2/c183/c199/index.html"
        },

        /*
         * 全国人大 - 法律草案征求意见
         */

        {
            name: "全国人大-法律草案",
            url: "http://www.npc.gov.cn/flcaw/"
        },

        /*
         * 全国人大首页
         */

        {
            name: "全国人大",
            url: "http://www.npc.gov.cn/"
        },

        /*
         * 司法部 - 立法意见征集 (修正 404 网址)
         */

        {
            name: "司法部-立法意见征集",
            url: "https://www.moj.gov.cn/lfyjzj/lflfyjzj/index.html"
        },

        /*
         * 司法部首页
         */

        {
            name: "司法部",
            url: "https://www.moj.gov.cn/"
        },

        /*
         * 中国政府网政策
         */

        {
            name: "中国政府网",
            url: "https://www.gov.cn/zhengce/index.htm"
        }

    ]

};


/* ==========================================================
   2. Persistent Store
========================================================== */

const STORE_KEY =
    "china_law_monitor_v6_1_history";


/*
 * 数据源异常收集（CG 建议：links=0 或抓取失败不应静默当成"无更新"）
 */

/*
 * 异常源分两类，避免"通知风暴"（G 指出）：
 * - NET_FAIL_SOURCES：网络请求真正失败（异常），属真实故障，应弹窗
 * - EMPTY_LINK_SOURCES：HTTP 成功但解析到 0 链接，可能改版/无更新，
 *   仅记日志，不每天弹窗（政务网周末/节假日常无更新）
 */

let NET_FAIL_SOURCES = [];

let EMPTY_LINK_SOURCES = [];


/*
 * 统一的数据源健康告警（首跑与非首跑共用）。
 * 仅两种情况弹窗，避免通知风暴：
 *   1) 有源网络真正失败（真实故障）
 *   2) 全部源都返回 0 链接（疑似集体改版）
 * 个别源 0 链接（政务网常无更新）只记日志，不弹窗。
 */

function emitHealthAlerts() {

    if (
        NET_FAIL_SOURCES.length > 0
    ) {

        $notification.post(

            "⚠️ 中国法律监控 V6.4",

            "以下数据源网络请求失败：" +
            NET_FAIL_SOURCES.join("、"),

            ""

        );

        return;

    }


    if (
        EMPTY_LINK_SOURCES.length ===
        CONFIG.sources.length
    ) {

        $notification.post(

            "⚠️ 中国法律监控 V6.4",

            "疑似解析异常：全部 " +
            CONFIG.sources.length +
            " 个数据源均返回 0 链接，可能站点集体改版",

            ""

        );

    }

}


function loadHistory() {

    try {

        const value =
            $persistentStore.read(
                STORE_KEY
            );

        if (!value) {

            return [];

        }

        const data =
            JSON.parse(value);

        if (!Array.isArray(data)) {

            return [];

        }

        return data;

    } catch (e) {

        console.log(
            "读取历史失败: " + e
        );

        return [];

    }

}


function saveHistory(history) {

    try {

        if (
            history.length >
            CONFIG.maxHistory
        ) {

            history =
                history.slice(
                    history.length -
                    CONFIG.maxHistory
                );

        }

        $persistentStore.write(
            JSON.stringify(history),
            STORE_KEY
        );

        return true;

    } catch (e) {

        console.log(
            "保存历史失败: " + e
        );

        return false;

    }

}


/* ==========================================================
   3. HTTP
========================================================== */

function httpGet(url, timeout) {

    const finalTimeout =
        timeout ||
        CONFIG.timeout;

    return new Promise(
        function(resolve, reject) {

            $httpClient.get(

                {

                    url: url,

                    timeout:
                        finalTimeout,

                    headers: {

                        "User-Agent":
                            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

                        "Accept":
                            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

                        "Accept-Language":
                            "zh-CN,zh;q=0.9,en;q=0.8",

                        /*
                         * Referer：防范政务网 WAF/防盗链 403
                         * （注意：仅能缓解防盗链类拦截，
                         *  无法解决 JS 动态渲染页面的空 HTML 问题）
                         */

                        "Referer":
                            url,

                        "Cache-Control":
                            "no-cache",

                        "Pragma":
                            "no-cache"

                    }

                },

                function(
                    error,
                    response,
                    body
                ) {

                    if (error) {

                        reject(error);

                        return;

                    }

                    if (!response) {

                        reject(
                            "没有收到 HTTP Response"
                        );

                        return;

                    }

                    if (
                        response.status < 200 ||
                        response.status >= 400
                    ) {

                        reject(
                            "HTTP " +
                            response.status
                        );

                        return;

                    }

                    resolve(
                        body || ""
                    );

                }

            );

        }
    );

}


/* ==========================================================
   3.1 协议翻转（http <-> https）
========================================================== */

function schemeFlip(url) {

    if (
        url.indexOf("https://") === 0
    ) {

        return "http://" + url.slice(8);

    }

    if (
        url.indexOf("http://") === 0
    ) {

        return "https://" + url.slice(7);

    }

    return url;

}


/* ==========================================================
   4. HTML → 文本
========================================================== */

function htmlToText(html) {

    if (!html) {

        return "";

    }


    /*
     * 性能（G意见3 #3）：政务静态页常上万行，
     * <head> 里堆满 script/style/link。
     * 先只保留 <body>…</body> 区域再做正则链，
     * 大幅缩减后续多次全文本扫描的量。
     * 取不到 body 时回退原文，行为不变。
     */

    let region = html;

    const bodyMatch =
        html.match(
            /<body[\s\S]*?<\/body>/i
        );

    if (bodyMatch) {

        region = bodyMatch[0];

    }


    return region

        .replace(
            /<script[\s\S]*?<\/script>/gi,
            " "
        )

        .replace(
            /<style[\s\S]*?<\/style>/gi,
            " "
        )

        .replace(
            /<!--[\s\S]*?-->/g,
            " "
        )

        .replace(
            /<[^>]+>/g,
            " "
        )

        .replace(
            /&nbsp;/gi,
            " "
        )

        .replace(
            /&amp;/gi,
            "&"
        )

        .replace(
            /&quot;/gi,
            '"'
        )

        .replace(
            /&#39;/gi,
            "'"
        )

        .replace(
            /&lt;/gi,
            "<"
        )

        .replace(
            /&gt;/gi,
            ">"
        )


        /*
         * 通用数字实体解码（CG 指出）：
         * &#300A; / &#x300A;（书名号）等未被上面的命名实体覆盖，
         * 不解码会导致标题出现实体代码或乱码
         */

        .replace(
            /&#(\d+);/gi,
            function(_, n) {

                return String.fromCharCode(
                    parseInt(n, 10)
                );

            }
        )

        .replace(
            /&#x([0-9a-f]+);/gi,
            function(_, n) {

                return String.fromCharCode(
                    parseInt(n, 16)
                );

            }
        )


        /*
         * 同时清扫普通空白与全角空格 \u3000（G 指出），
         * 避免标题夹带不可见字符影响展示
         */

        .replace(
            /[\s\u3000]+/g,
            " "
        )

        .trim();

}


/* ==========================================================
   5. URL处理
========================================================== */

/*
 * 折叠 . 与 .. 段，得到规范路径。
 * 浏览器会做同样的事，但朴素字符串拼接不会：
 *   base https://x.gov.cn/a/b/index.html  +  href ../c.html
 *   朴素拼接 → https://x.gov.cn/a/b/../c.html（错误）
 *   本函数   → https://x.gov.cn/a/c.html（正确）
 */

function resolveRelativePath(input) {

    const m =
        input.match(
            /^(https?:\/\/[^\/]+)(.*)$/
        );

    const authority =
        m ? m[1] : "";

    const pathOnly =
        m ? (m[2] || "/") : input;


    const parts =
        pathOnly.split("/");

    const stack = [];


    for (
        let i = 0;
        i < parts.length;
        i++
    ) {

        const seg =
            parts[i];


        if (
            seg === "" ||
            seg === "."
        ) {

            continue;

        }


        if (seg === "..") {

            if (
                stack.length > 0 &&
                stack[stack.length - 1] !== ".."
            ) {

                stack.pop();

            } else {

                stack.push("..");

            }

            continue;

        }


        stack.push(seg);

    }


    let out =
        stack.join("/");


    /*
     * authority 存在时路径必须以 / 开头，
     * 否则 "https://x.gov.cn" + "a/c.html"
     * 会错拼成 "https://x.gov.cna/c.html"
     */

    if (
        authority !== "" &&
        out.charAt(0) !== "/"
    ) {

        out = "/" + out;

    }


    return authority + out;

}


function makeAbsoluteUrl(
    href,
    baseUrl
) {

    if (!href) {

        return "";

    }

    href =
        href.trim();


    if (
        href.indexOf(
            "javascript:"
        ) === 0
    ) {

        return "";

    }


    if (
        href.indexOf(
            "mailto:"
        ) === 0
    ) {

        return "";

    }


    /*
     * data: 协议过滤（K意见1 #2）：
     * 站点被篡改时可能在 href 注入 data: 伪协议，
     * 点击通知打开会变成 data: 文本/脚本载体，直接丢弃。
     */
    if (
        href.indexOf(
            "data:"
        ) === 0
    ) {

        return "";

    }


    if (
        href.indexOf("#") === 0
    ) {

        return "";

    }


    /*
     * 完整 URL
     */

    if (
        href.indexOf(
            "http://"
        ) === 0 ||
        href.indexOf(
            "https://"
        ) === 0
    ) {

        return href.split("#")[0];

    }


    /*
     * //
     */

    if (
        href.indexOf("//") === 0
    ) {

        if (
            baseUrl.indexOf(
                "https://"
            ) === 0
        ) {

            return "https:" + href;

        }

        return "http:" + href;

    }


    /*
     * 根路径
     */

    if (
        href.indexOf("/") === 0
    ) {

        const match =
            baseUrl.match(
                /^(https?:\/\/[^\/]+)/
            );

        if (!match) {

            return "";

        }

        return (
            match[1] +
            href
        );

    }


    /*
     * 相对路径：折叠 ../ 与 ./ 得到规范 URL
     */

    const index =
        baseUrl.lastIndexOf("/");


    if (index === -1) {

        return "";

    }


    return resolveRelativePath(
        baseUrl.substring(
            0,
            index + 1
        ) +
        href
    );

}


/* ==========================================================
   6. 提取链接
========================================================== */

function parseLinks(
    html,
    sourceName,
    sourceUrl
) {

    const result = [];


    if (!html) {

        return result;

    }


    /*
     * 支持三种 href 写法：
     *   href="..."  /  href='...'  /  href=xxx（无引号）
     * 第 1/2/3 捕获组为 href，第 4 捕获组为链接文本
     */

    const regex =
        /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))[^>]*>([\s\S]*?)<\/a>/gi;


    let match;


    while (
        (match =
            regex.exec(html)) !== null
    ) {

        const href =
            match[1] ||
            match[2] ||
            match[3];


        let title =
            htmlToText(
                match[4]
            );


        title =
            title
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();


        /*
         * 基本过滤
         * 长度门槛 + 关键词豁免：含法律/重点关键词的短名（合同法/民法典/个保法）保留
         */

        if (
            title.length <
            CONFIG.minTitleLen &&
            !containsAny(
                title,
                LAW_NAME_KEYWORDS
            ) &&
            !containsAny(
                title,
                HIGH_PRIORITY_KEYWORDS
            )
        ) {

            continue;

        }


        if (
            title.length > 180
        ) {

            title =
                title.substring(
                    0,
                    180
                );

        }


        /*
         * 导航过滤
         */

        const ignored = [

            "首页",
            "网站首页",
            "返回首页",
            "登录",
            "注册",
            "搜索",
            "更多",
            "详情",
            "上一页",
            "下一页",
            "网站导航",
            "English",
            "繁体",
            "简体"

        ];


        if (
            ignored.indexOf(
                title
            ) !== -1
        ) {

            continue;

        }


        const url =
            makeAbsoluteUrl(
                href,
                sourceUrl
            );


        if (!url) {

            continue;

        }


        result.push({

            title: title,

            url: url,

            source: sourceName

        });

    }


    return result;

}


/* ==========================================================
   6.1.1 flcaw 纯文本草案行补充解析
   ----------------------------------------------------------
   全国人大法律草案征求意见页（/flcaw/）分两区块：
     ① 正在征求意见 —— 标准 <a> 链接，parseLinks 已能抓；
     ② 历史草案列表 —— 纯文本表格行、无 <a> 标签，
        parseLinks 永远抓不到，是确定性盲区。
   这里从 htmlToText 文本里提取「（草案…）征求意见」行补进来。
   仅对 flcaw 源启用，避免其它页正文误抓。
========================================================== */

function parseFlcawDraftRows(
    html,
    sourceName,
    sourceUrl,
    seenTitles
) {

    const out =
        [];

    if (!html) {

        return out;

    }

    /*
     * 行感知文本化（不复用 htmlToText）：
     * htmlToText 会把所有空白（含 \n）压缩成单空格，
     * 导致表格行合并、纯文本草案行丢失边界，按行提取全部失效。
     * 这里仅在块级标签处断行、保留 \n，便于逐行提取草案。
     */
    const text =
        html
            .replace(
                /<\s*(tr|\/tr|br|\/p|\/div|\/li|\/h[1-6]|thead|\/thead|tbody|\/tbody)[^>]*>/gi,
                "\n"
            )
            .replace(
                /<[^>]+>/g,
                " "
            )
            .replace(
                /&nbsp;/gi,
                " "
            )
            .replace(
                /&amp;/gi,
                "&"
            )
            .replace(
                /&quot;/gi,
                "\""
            )
            .replace(
                /&#39;/gi,
                "'"
            )
            .replace(
                /&lt;/gi,
                "<"
            )
            .replace(
                /&gt;/gi,
                ">"
            )
            .replace(
                /[ \t\u3000]+/g,
                " "
            );

    const lines =
        text.split(
            /\r?\n/
        );

    /*
     * 起止日期：2026-06-26 至 2026-07-25 / 2026年6月26日 至 ...
     * 抓到后拼回标题，既让通知显示期限，
     * 又让 extractDeadline 能从「至 YYYY-MM-DD」提取截止日
     */
    const dateRe =
        /(\d{4}[-年/.]\d{1,2}[-月/.]\d{1,2})\s*(?:至|—|-)\s*(\d{4}[-年/.]\d{1,2}[-月/.]\d{1,2})/;

    for (
        let i = 0;
        i < lines.length;
        i++
    ) {

        const raw =
            lines[i].trim();

        if (
            raw.length < 6 ||
            raw.indexOf("草案") === -1 ||
            raw.indexOf("征求意见") === -1
        ) {

            continue;

        }

        /*
         * 取「征求意见」之前（含）作为法律名称 + 草案标识，
         * 例：检察公益诉讼法（草案二次审议稿）征求意见
         */
        const m =
            raw.match(
                /(.*?征求意见)/
            );

        let title =
            m ? m[1] : raw;

        title =
            title
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        if (
            title.length < 6
        ) {

            continue;

        }

        /*
         * 去重：已被 <a> 解析抓到的行跳过，避免重复推送
         */
        if (
            seenTitles &&
            seenTitles[title]
        ) {

            continue;

        }

        if (seenTitles) {

            seenTitles[title] = true;

        }

        const dm =
            raw.match(dateRe);

        if (dm) {

            title +=
                "（征求意见：" +
                dm[1] +
                " 至 " +
                dm[2] +
                "）";

        }

        /*
         * 纯文本行无 lid，无法构造详情页 URL，
         * 用带 draft= 查询参数的伪 URL 保证每条唯一
         * （normalizeUrl 保留 query，去重不会互相覆盖），
         * 点击落到 flcaw 列表页，用户可定位该草案。
         */
        const sep =
            sourceUrl.indexOf("?") === -1
                ? "?"
                : "&";

        const url =
            sourceUrl +
            sep +
            "draft=" +
            encodeURIComponent(title);

        out.push({

            title: title,

            url: url,

            source: sourceName

        });

    }

    return out;

}


/* ==========================================================
   6.1 关键词包含判断（短标题豁免用）
========================================================== */

function containsAny(text, arr) {

    if (!text) {

        return false;

    }

    for (
        let i = 0;
        i < arr.length;
        i++
    ) {

        if (
            text.indexOf(arr[i]) !== -1
        ) {

            return true;

        }

    }

    return false;

}


/* ==========================================================
   7. 核心法律关键词
========================================================== */

const CORE_KEYWORDS = [

    "法律草案",

    "修正案草案",

    "修订草案",

    /*
     * 用「法草案」替代裸「草案」，避免
     * "项目草案/方案草案"等非立法内容进入监控，
     * 同时保住"《XX法》草案"这类合法草案
     */

    "法草案",

    "公开征求意见",

    "征求意见",

    "征求意见稿",

    "提请审议",

    "提交审议",

    "提请全国人大",

    "审议通过",

    "审议决定",

    "法律通过",

    "法律公布",

    "行政法规",

    "法规草案",

    "司法解释",

    "国务院令",

    "部门规章",

    "立法计划",

    "立法工作计划",

    "立法项目",

    "立法动态",

    "法律案",

    "修法"

];


/* ==========================================================
   8. 审议关键词
========================================================== */

const REVIEW_KEYWORDS = [

    "一审",

    "二审",

    "三审",

    "初次审议",

    "再次审议",

    "继续审议",

    "审议",

    "提请",

    "表决",

    "通过",

    "拟审议",

    "将审议",

    "审议法律案",

    "法律案审议"

];


/* ==========================================================
   9. 法律名称关键词
========================================================== */

const LAW_NAME_KEYWORDS = [

    "法律",

    "条例",

    "规定",

    "办法",

    "规则",

    "决定",

    "解释",

    "法典",

    "法"

];


/* ==========================================================
   10. ⭐重点领域
========================================================== */

const HIGH_PRIORITY_KEYWORDS = [

    /*
     * 行政法
     */

    "行政复议",

    "行政诉讼",

    "行政处罚",

    "行政许可",

    "行政强制",

    "政府信息公开",

    "行政程序",

    "行政机关",

    /*
     * 房地产
     */

    "不动产",

    "不动产登记",

    "房地产",

    "商品房",

    "房屋",

    "住房",

    "保障性住房",

    "物业",

    "物业管理",

    "住宅",

    /*
     * 土地
     */

    "土地",

    "国有土地",

    "集体土地",

    "建设用地",

    "宅基地",

    "土地管理",

    /*
     * 征收拆迁
     */

    "征收",

    "拆迁",

    "房屋征收",

    "补偿",

    /*
     * 民商事
     */

    "民法典",

    "合同",

    "消费者权益",

    "消费者",

    "公司",

    "公司法",

    "企业",

    /*
     * 劳动
     */

    "劳动",

    "劳动合同",

    "就业",

    "社会保险",

    /*
     * 数据互联网
     */

    "个人信息",

    "个人信息保护",

    "数据安全",

    "网络安全",

    "人工智能"

];


/* ==========================================================
   11. 判断是否法律相关
========================================================== */

function isLawRelated(title) {

    if (!title) {

        return false;

    }


    /*
     * 只要出现明确立法程序词
     */

    for (
        let i = 0;
        i < CORE_KEYWORDS.length;
        i++
    ) {

        if (
            title.indexOf(
                CORE_KEYWORDS[i]
            ) !== -1
        ) {

            return true;

        }

    }


    /*
     * 草案语境补全（GR意见1 #2）：
     * 裸"草案"过泛已弃用（易误收"项目草案/方案草案"），
     * 但"《XX法》草案""《XX法（草案）》"等合法立法草案
     * 因书名号/括号把"法"与"草案"隔开，会漏过上面 CORE 词，
     * 故在此限定：含"草案"且带法律名称语境
     * （法/条例/办法/规定/规则/法典/《）即命中。
     */
    if (
        title.indexOf("草案") !== -1 &&
        /法|条例|办法|规定|规则|法典|《/.test(title)
    ) {

        return true;

    }


    /*
     * 法律公布 / 通过（GR补充 · 修复"最近通过的法律不弹"）：
     * 真实标题常为「主席令公布《XX法》」「《XX法》公布施行」
     * 「《XX法》通过」「《XX法》」，不连续含"法律公布"，
     * 原闸门会整类漏掉，故在此补全：
     *   - 主席令：必为法律颁布
     *   - 《XX法/条例/办法/规定/规则/法典》：显式法律名称
     *   - 公布/通过 + 法律名称语境：颁布或表决通过
     */
    if (
        title.indexOf("主席令") !== -1
    ) {

        return true;

    }


    if (
        /《[^》]*?(法|条例|办法|规定|规则|法典)/.test(title)
    ) {

        return true;

    }


    if (
        (
            title.indexOf("公布") !== -1 ||
            title.indexOf("通过") !== -1
        ) &&
        /法|条例|办法|规定|规则|法典|《/.test(title)
    ) {

        return true;

    }


    /*
     * 重点领域 + 法律名称
     */

    let high =
        false;


    let law =
        false;


    for (
        let i = 0;
        i <
        HIGH_PRIORITY_KEYWORDS.length;
        i++
    ) {

        if (
            title.indexOf(
                HIGH_PRIORITY_KEYWORDS[i]
            ) !== -1
        ) {

            high = true;

            break;

        }

    }


    for (
        let i = 0;
        i <
        LAW_NAME_KEYWORDS.length;
        i++
    ) {

        if (
            title.indexOf(
                LAW_NAME_KEYWORDS[i]
            ) !== -1
        ) {

            law = true;

            break;

        }

    }


    if (
        high &&
        law
    ) {

        return true;

    }


    /*
     * 法律名称 + 审议
     */

    let review =
        false;


    for (
        let i = 0;
        i <
        REVIEW_KEYWORDS.length;
        i++
    ) {

        if (
            title.indexOf(
                REVIEW_KEYWORDS[i]
            ) !== -1
        ) {

            review = true;

            break;

        }

    }


    /*
     * 显式法律名称兜底（GH/Q/DP/GR 一致指出）：
     * 权威发布页等会直接列出"中华人民共和国医疗保障法"之类
     * 纯法律名称链接（无《》、无"公布/通过"动词），
     * 原闸门因不含书名号/程序词而漏判，导致"最近通过的法律"抓不到。
     * 这里以"法律名称后缀 + 较长专名 + 非司法机关名"补全。
     * 短词（如"法律声明"）因长度门槛被排除，误收风险小。
     */
    if (
        title.length >= 6 &&
        /(法|法典|条例|办法|规定|规则|决定|解释)$/.test(title) &&
        !/(法院|检察院)/.test(title)
    ) {
        return true;
    }

    return (
        law &&
        review
    );

}


/* ==========================================================
   12. 判断重点
========================================================== */

function isHighPriority(title) {

    if (!title) {

        return false;

    }


    for (
        let i = 0;
        i <
        HIGH_PRIORITY_KEYWORDS.length;
        i++
    ) {

        if (
            title.indexOf(
                HIGH_PRIORITY_KEYWORDS[i]
            ) !== -1
        ) {

            return true;

        }

    }


    return false;

}


/* ==========================================================
   13. 分类
========================================================== */

function getCategory(title) {

    if (
        title.indexOf(
            "公开征求意见"
        ) !== -1 ||
        title.indexOf(
            "征求意见稿"
        ) !== -1 ||
        title.indexOf(
            "征求意见"
        ) !== -1
    ) {

        return "征求意见";

    }


    if (
        title.indexOf(
            "法律草案"
        ) !== -1 ||
        title.indexOf(
            "修订草案"
        ) !== -1 ||
        title.indexOf(
            "修正案草案"
        ) !== -1
    ) {

        return "法律草案";

    }


    /*
     * 裸"草案"且无上面精确词时，归为法律草案（GR意见2 #4）。
     * 此时已通过 isLawRelated 闸门（要求草案+法律语境），
     * 故不会误伤"城乡规划草案""项目草案"等非立法草案。
     */

    if (
        title.indexOf(
            "草案"
        ) !== -1
    ) {

        return "法律草案";

    }


    if (
        title.indexOf(
            "一审"
        ) !== -1 ||
        title.indexOf(
            "二审"
        ) !== -1 ||
        title.indexOf(
            "三审"
        ) !== -1 ||
        title.indexOf(
            "审议"
        ) !== -1
    ) {

        return "立法审议";

    }


    /*
     * 新法律公布（主席令/予以公布/公布施行/法律公布）
     * 注意：不用"正式发布"——该词过泛，会误伤"司法解释正式发布"等
     */

    if (
        title.indexOf(
            "法律公布"
        ) !== -1 ||
        title.indexOf(
            "予以公布"
        ) !== -1 ||
        title.indexOf(
            "公布施行"
        ) !== -1 ||
        title.indexOf(
            "主席令"
        ) !== -1
    ) {

        return "法律公布";

    }


    if (
        title.indexOf(
            "行政法规"
        ) !== -1
    ) {

        return "行政法规";

    }


    if (
        title.indexOf(
            "司法解释"
        ) !== -1
    ) {

        return "司法解释";

    }


    if (
        title.indexOf(
            "国务院令"
        ) !== -1
    ) {

        return "国务院令";

    }


    if (
        title.indexOf(
            "规章"
        ) !== -1
    ) {

        return "部门规章";

    }


    if (
        title.indexOf(
            "法律"
        ) !== -1 ||
        title.indexOf(
            "条例"
        ) !== -1
    ) {

        return "新法/法规";

    }


    /*
     * 显式法律名称（以法/法典/条例/办法/规定/规则/决定/解释结尾）
     * 归为"新法/法规"，让最近通过的法律在通知与状态看板里正确归类
     */
    if (/(法|法典|条例|办法|规定|规则|决定|解释)$/.test(title)) return "新法/法规";


    return "立法动态";

}


/* ==========================================================
   14. 评分
========================================================== */

function getScore(title) {

    let score =
        0;


    /*
     * 征求意见
     */

    if (
        title.indexOf(
            "公开征求意见"
        ) !== -1
    ) {

        score += 100;

    }


    if (
        title.indexOf(
            "征求意见稿"
        ) !== -1
    ) {

        score += 90;

    }


    /*
     * 法律草案
     */

    if (
        title.indexOf(
            "法律草案"
        ) !== -1
    ) {

        score += 90;

    }


    if (
        title.indexOf(
            "草案"
        ) !== -1 &&
        /法|条例|办法|规定|规则|法典|《/.test(title)
    ) {

        score += 60;

    }


    /*
     * 审议
     */

    if (
        title.indexOf(
            "三审"
        ) !== -1
    ) {

        score += 80;

    }


    if (
        title.indexOf(
            "二审"
        ) !== -1
    ) {

        score += 70;

    }


    if (
        title.indexOf(
            "一审"
        ) !== -1
    ) {

        score += 60;

    }


    if (
        title.indexOf(
            "审议"
        ) !== -1
    ) {

        score += 40;

    }


    /*
     * 通过/公布（已生效的法律，用户最关心，权重拉高以确保进首跑 Top-N）
     */

    if (
        title.indexOf(
            "通过"
        ) !== -1
    ) {

        score += 60;

    }


    if (
        title.indexOf(
            "主席令"
        ) !== -1
    ) {

        score += 60;

    }


    if (
        title.indexOf(
            "公布"
        ) !== -1
    ) {

        score += 70;

    }


    /*
     * 已公布 / 新通过的法律（以法律名称后缀结尾）→ 高权重，
     * 确保"最近通过的法律"能进 Top-N 单条通知（GH/Q/DP/GR 一致要求）
     */
    if (
        /(法|法典|条例|办法|规定|规则|决定|解释)$/.test(title)
    ) {
        score += 80;
    }


    /*
     * ⭐重点领域
     */

    if (
        isHighPriority(
            title
        )
    ) {

        score += 100;

    }


    return score;

}


/* ==========================================================
   15. 唯一ID
========================================================== */

function normalizeUrl(url) {

    if (!url) {

        return "";

    }


    /*
     * 归一并去重：
     * - http/https 视为同页（政府站点常 http/https 并存）
     * - 去掉 fragment（# 后）
     * - 去掉结尾多余斜杠
     */

    const cleaned = url
        .replace(
            /^https?:\/\//i,
            "http://"
        )
        .split("#")[0]
        .replace(
            /\/+$/,
            ""
        );


    /*
     * 防御（G意见2 #3）：若 makeAbsoluteUrl 异常返回裸协议
     * （如 "http://"），归一化后得 "http:"，
     * 作为 ID 会与其他失败项互相覆盖、错杀去重。
     * 此类异常 URL 直接判为空，不参与历史库。
     */
    if (
        cleaned === "http:" ||
        cleaned === "http://"
    ) {

        return "";

    }


    return cleaned;

}


/*
 * 唯一 ID 直接等于归一化后的 URL。
 * 理由（CG 指出）：原 source|url|title 在标题微调时会
 * 被当成全新条目重复推送；且运行内按 url 去重、
 * 跨运行按 url+title 去重，两规则不一致。
 * 法律监控场景"同一 URL = 同一条信息"最干净。
 */

function makeId(item) {

    /*
     * 空值防御（G 指出）：
     * 解析失败的链接 url 可能为空，
     * 若不拦截会被统一成 ""，在去重时互相覆盖。
     */

    if (
        !item ||
        !item.url
    ) {

        return "";

    }


    return normalizeUrl(
        item.url
    );

}


/* ==========================================================
   16. URL去重
========================================================== */

function uniqueItems(items) {

    const map = {};

    const result = [];


    for (
        let i = 0;
        i < items.length;
        i++
    ) {

        const item =
            items[i];


        /*
         * 与跨运行去重（getNewItems / 历史库）保持一致，
         * 统一用 makeId(归一化 URL) 作为键，
         * 否则带 # 或协议差异的同页会被判成两条。
         * 空 ID（解析失败链接）直接跳过。
         */

        const id =
            makeId(
                item
            );


        if (
            id &&
            !map[id]
        ) {

            map[id] =
                true;

            result.push(
                item
            );

        }

    }


    return result;

}


/* ==========================================================
   17. 排序
========================================================== */

function sortItems(items) {

    return items.sort(

        function(a, b) {

            return (
                getScore(
                    b.title
                ) -
                getScore(
                    a.title
                )
            );

        }

    );

}


/* ==========================================================
   18. 找新增
========================================================== */

function getNewItems(
    items,
    history
) {

    const map = {};


    for (
        let i = 0;
        i < history.length;
        i++
    ) {

        map[
            history[i]
        ] = true;

    }


    const result = [];


    for (
        let i = 0;
        i < items.length;
        i++
    ) {

        const id =
            makeId(
                items[i]
            );


        if (
            !map[id]
        ) {

            result.push(
                items[i]
            );

        }

    }


    return result;

}


/* ==========================================================
   19. 通知文本提取辅助
========================================================== */

/*
 * 每类一个独立 emoji（用户要求：新法律公布/征求意见等各有不同图标）
 * 键名须与 getCategory 返回的干净分类名一致
 */

const CATEGORY_EMOJI = {

    "征求意见":   "💬",

    "法律草案":   "📝",

    "立法审议":   "🗳️",

    "法律公布":   "📜",

    "行政法规":   "🏛️",

    "司法解释":   "⚖️",

    "国务院令":   "📕",

    "部门规章":   "📋",

    "新法/法规":  "🆕",

    "立法动态":   "🔄"

};


/*
 * 取分类 emoji（未知分类回退 🔔）
 */

function categoryEmoji(name) {

    return CATEGORY_EMOJI[name] || "🔔";

}


/*
 * 分类标签：emoji + 名称（用于通知标题与汇总通知）
 */

function categoryLabel(name) {

    return categoryEmoji(name) + " " + name;

}


/*
 * 取来源简称（"司法部-立法意见征集" → "司法部"）
 */

function sourceShort(source) {

    if (!source) {

        return "";

    }

    return source.split("-")[0].trim();

}


/*
 * 提取书名号内的法规名（《XXX》→ 《XXX》）
 */

function extractLawName(title) {

    if (!title) {

        return "";

    }

    const m =
        title.match(
            /《([^》]+)》/
        );

    return m
        ? "《" + m[1] + "》"
        : "";

}


/*
 * 提取意见截止日期，归一化为 YYYY-MM-DD
 * 优先定位"截止/征询/反馈/期限/至"附近的日期（语义正确），
 * 兜底取标题中第一个合法日期并标为"发布"
 */

function validDate(y, mo, d) {

    const moN =
        parseInt(
            mo,
            10
        );

    const dN =
        parseInt(
            d,
            10
        );

    if (
        moN < 1 ||
        moN > 12 ||
        dN < 1 ||
        dN > 31
    ) {

        return "";

    }

    return y +
        "-" +
        ("0" + mo).slice(-2) +
        "-" +
        ("0" + d).slice(-2);

}


/*
 * 取设备本地今日日期 YYYY-MM-DD（用于过期草案过滤）
 */
function todayYMD() {
    const d = new Date();
    return d.getFullYear() +
        "-" +
        ("0" + (d.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + d.getDate()).slice(-2);
}

function extractDeadline(title) {

    if (!title) {

        return "";

    }

    /*
     * 第一步：在"截止/征询/反馈/期限/至"附近找日期。
     * 避免把发文日期/文号日期误当成截止日期
     * （如"2026年8月1日发布…意见反馈截止2026年8月30日"
     *   应取 08-30 而非 08-01）
     */
    const deadlineRe =
        /(截止|征询|反馈|期限|至)[^0-9]{0,16}(20\d{2})[-年./](\d{1,2})[-月./](\d{1,2})/;

    const dm =
        title.match(
            deadlineRe
        );

    if (dm) {

        const date =
            validDate(
                dm[2],
                dm[3],
                dm[4]
            );

        if (date) {

            return "意见截止：" + date;

        }

    }

    /*
     * 第二步：兜底——标题里第一个合法日期，标为"发布"
     */
    const m =
        title.match(
            /(20\d{2})[-年./](\d{1,2})[-月./](\d{1,2})/
        );

    if (!m) {

        return "";

    }

    const date =
        validDate(
            m[1],
            m[2],
            m[3]
        );

    return date
        ? "发布：" + date
        : "";

}


/* ==========================================================
   19.0 详情页富化 + 运行报告
========================================================== */

/*
 * 提取"通过"日期：详情页常见
 * "《XX法》已于2026年8月28日通过" / "2026年8月28日通过"
 */
function extractPassDate(text) {

    if (!text) return "";

    let m =
        text.match(
            /(20\d{2})[-年./](\d{1,2})[-月./](\d{1,2})[日]?\s*(?:起)?\s*通过/
        );

    if (m) return validDate(m[1], m[2], m[3]);

    m =
        text.match(
            /通过[于在]?(20\d{2})[-年./](\d{1,2})[-月./](\d{1,2})[日]?/
        );

    if (m) return validDate(m[1], m[2], m[3]);

    return "";

}

/*
 * 提取"施行"日期：详情页常见
 * "自2027年1月1日起施行" / "施行日期为2027年1月1日"
 */
function extractEffectiveDate(text) {

    if (!text) return "";

    let m =
        text.match(
            /自(20\d{2})[-年./](\d{1,2})[-月./](\d{1,2})[日]?起施行/
        );

    if (m) return validDate(m[1], m[2], m[3]);

    m =
        text.match(
            /施行[日期]?(?:为)?(20\d{2})[-年./](\d{1,2})[-月./](\d{1,2})[日]?/
        );

    if (m) return validDate(m[1], m[2], m[3]);

    return "";

}

/*
 * 详情页富化：对"法律公布/征求意见/草案/法规"等类目，
 * 抓取详情页补充 法律名称 + 通过日期 + 施行日期 + 截止日期，
 * 让通知标题/汇总不再只有干瘪的列表标题
 * （如"中华人民共和国主席令（第八十号）"→ 补出《医疗保障法》通过/施行日）。
 * 最佳努力：任何失败都回退到列表标题，绝不中断主流程。
 */
async function enrichItem(item) {

    const category =
        getCategory(
            item.title
        );

    const needsDetail =
        /法律公布|征求意见|法律草案|行政法规|司法解释|部门规章|国务院令|新法\/法规/
            .test(category);

    if (!needsDetail || !item.url) return item;

    /*
     * 跳过 flcaw 补解析生成的伪 URL（?draft=…）。
     * 它指向列表页而非详情页，富化只会抓到整页列表 HTML，
     * 从中抽《法名》/日期噪声大、还白占并发配额（GR意见2 #3）。
     */

    if (
        item.url.indexOf(
            "draft="
        ) !== -1
    ) {

        return item;

    }

    try {

        const html =
            await httpGet(
                item.url,
                CONFIG.enrichTimeout
            );

        if (!html) return item;

        const text =
            htmlToText(
                html
            );

        const lawName =
            extractLawName(text) ||
            extractLawName(item.title);

        const passDate =
            extractPassDate(text);

        const effDate =
            extractEffectiveDate(text);

        const deadline =
            extractDeadline(text) ||
            extractDeadline(item.title);

        if (
            lawName ||
            passDate ||
            effDate ||
            deadline
        ) {

            item.lawName = lawName;
            item.passDate = passDate;
            item.effDate = effDate;
            item.deadline = deadline;

        }

    } catch (e) {

        console.log(
            "详情富化失败: " + item.url + " (" + e + ")"
        );

    }

    return item;

}

/*
 * 并发受限地富化一组条目（默认 4 并发，避免触发政务网频控）
 */
async function enrichItems(items) {

    if (
        !CONFIG.enrichDetail ||
        !items ||
        items.length === 0
    ) return;

    const limit =
        CONFIG.enrichConcurrency || 4;

    let idx = 0;

    async function worker() {

        while (idx < items.length) {

            const i = idx++;

            await enrichItem(items[i]);

        }

    }

    const workers = [];

    for (
        let k = 0;
        k < Math.min(limit, items.length);
        k++
    ) {

        workers.push(worker());

    }

    await Promise.all(workers);

}

function escapeHtml(s) {

    return (s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}


/*
 * HTML 属性转义（Q意见2 #2）：
 * 把 URL 拼进 href="…" 前先转义，
 * 防止政务网 URL 中意外出现的双引号截断属性、引发结构破坏或本地 XSS。
 */

function escapeAttr(s) {

    return (s || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

/*
 * 汇总通知正文：每条一行（emoji + 名称/标题 + 关键日期）
 */
function buildSummaryBody(items) {

    return items
        .map(function(it) {

            const emoji =
                categoryEmoji(
                    getCategory(it.title)
                );

            const name =
                it.lawName ||
                extractLawName(it.title) ||
                "";

            const dates = [];

            if (it.passDate) dates.push("通过 " + it.passDate);
            if (it.effDate) dates.push("施行 " + it.effDate);
            if (it.deadline && !it.passDate) dates.push(it.deadline);

            const head =
                name ||
                (it.title || "").slice(0, 48);

            let line = emoji + " " + head;

            if (dates.length) line += "  [" + dates.join(" / ") + "]";

            return line;

        })
        .join("\n");

}


/*
 * 状态看板：从本轮全部条目里筛出"最需关注"的类目
 * （正在征集意见的草案 / 法律草案 / 立法审议 / 最近通过公布的法律），
 * 作为每次运行最后一条汇总通知的正文。
 * 这样即便某条目已入库，用户每次运行都能在通知中心看到
 * "当前正在征集的草案 + 最近通过的法律"这一状态（GR意见3 方案1）。
 */
function buildStatusBoard(items) {

    const WATCH = {

        "征求意见": true,
        "法律草案": true,
        "立法审议": true,
        "法律公布": true,
        "新法/法规": true

    };

    return (items || [])
        .filter(function(it) {

            return WATCH[
                getCategory(it.title)
            ];

        });

}


/*
 * 汇总通知点击打开的真实 URL：
 * 优先跳到 flcaw 草案征集页（正在征集的草案都在那），
 * 否则跳到本轮评分最高条目的真实原文页，
 * 再否则回退国务院政策集。
 * 绝不传 data:/空 URL（否则点击回退成日志）。
 */
function summaryOpenUrl(items) {

    const list =
        items || [];

    for (
        let i = 0;
        i < list.length;
        i++
    ) {

        const c =
            getCategory(
                list[i].title
            );

        if (
            c === "征求意见" ||
            c === "法律草案"
        ) {

            return "http://www.npc.gov.cn/flcaw/";

        }

    }

    const top =
        list[0];

    if (
        top &&
        /^https?:\/\//i.test(top.url || "")
    ) {

        return top.url;

    }

    return "https://www.gov.cn/zhengce/";

}


/*
 * 生成自包含 HTML 报告（data: URL），点击通知即可打开，
 * 列出本次全部新增条目（含原文链接）。无服务器依赖。
 * iOS 对 data: URL 长度敏感（各版本约 2k–几十 k 不等），
 * 故设置保守上限；超限时截断为「前 N 条 + 提示」报告，
 * 而不是跳转到无关的 gov.cn 首页（Q意见2 #1 / GR意见2 #2）。
 */
function buildReportUrl(items) {

    const MAX =
        12000;

    let cap =
        items.length;


    while (cap > 0) {

        let rows = "";

        for (
            let i = 0;
            i < cap;
            i++
        ) {

            const it =
                items[i];

            const emoji =
                categoryEmoji(
                    getCategory(it.title)
                );

            const name =
                it.lawName ||
                extractLawName(it.title) ||
                (it.title || "");

            const dates = [];

            if (it.passDate) dates.push("通过 " + it.passDate);
            if (it.effDate) dates.push("施行 " + it.effDate);
            if (it.deadline && !it.passDate) dates.push(it.deadline);

            const dateStr =
                dates.length
                    ? "（" + dates.join("；") + "）"
                    : "";

            rows +=
                "<li>" + emoji + " <b>" + escapeHtml(name) + "</b>" +
                escapeHtml(dateStr) +
                " <a href=\"" + escapeAttr(it.url) + "\">原文 ↗</a></li>";

        }


        if (items.length > cap) {

            rows +=
                "<li><small>… 仅展示前 " +
                cap +
                " 条，其余 " +
                (items.length - cap) +
                " 条见 Loon 运行日志 …</small></li>";

        }


        const html =
            "<!doctype html><html><head><meta charset='utf-8'>" +
            "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
            "<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;padding:14px;color:#111;line-height:1.6}" +
            "h2{font-size:17px}li{margin:6px 0;font-size:14px}small{color:#888}</style></head><body>" +
            "<h2>⚖️ 中国法律监控 V6.4 · 本次新增 " + items.length + " 条</h2>" +
            "<small>点击各条目「原文 ↗」可跳转官方页面</small><ul>" + rows + "</ul></body></html>";

        const dataUrl =
            "data:text/html;charset=utf-8," + encodeURIComponent(html);

        if (
            dataUrl.length <= MAX ||
            cap === 1
        ) {

            return dataUrl;

        }


        /*
         * 仍超长则减半条目数重试，直到落入上限或只剩 1 条
         */

        cap =
            Math.ceil(
                cap / 2
            );

    }


    return "https://www.gov.cn/";

}


/* ==========================================================
   19.1 通知
========================================================== */

/*
 * 点击打开的真实 URL：
 * Loon 通知第 4 参 attach 为字符串时，即"点击通知打开的 URL"。
 * 仅当 item.url 是真实 http/https 才用它；
 * 否则回退国务院政策集，避免伪 URL / 空 URL 导致点击回退成"运行日志"。
 */
function safeOpenUrl(item) {

    const u =
        (item && item.url) ||
        "";


    if (
        /^https?:\/\//i.test(u)
    ) {

        return u;

    }


    return "https://www.gov.cn/zhengce/";

}


function sendNotification(item) {

    const high =
        isHighPriority(
            item.title
        );


    const category =
        getCategory(
            item.title
        );


    /*
     * 加星规则：
     * - 标题命中重点领域关键词（行政复议/物业/土地…）
     * - 或属于"征求意见 / 法律草案 / 立法审议 / 法律公布"四类（最需行动）
     */

    const starred =
        high ||
        /征求意见|法律草案|立法审议|法律公布/.test(category);


    const title =
        (starred ? "⭐ " : "") +
        categoryLabel(category) +
        " · " +
        sourceShort(item.source);


    const lawName =
        item.lawName ||
        extractLawName(
            item.title
        );


    const passDate =
        item.passDate || "";

    const effDate =
        item.effDate || "";

    const deadline =
        item.deadline ||
        extractDeadline(
            item.title
        );


    const parts = [];

    if (lawName) parts.push(lawName);
    if (passDate) parts.push("通过:" + passDate);
    if (effDate) parts.push("施行:" + effDate);
    if (deadline && !passDate) parts.push(deadline);

    let body;

    if (parts.length > 0) {

        body =
            parts.join("  ") +
            "  点击进入原文";

    } else {

        body = item.title || "";

        if (body.length > 100) {

            body = body.slice(0, 100) + "...";

        }

        body += "  点击进入原文";

    }


    $notification.post(

        title,

        "",

        body.trim(),

        safeOpenUrl(item)

    );

}


/* ==========================================================
   20. 主程序
========================================================== */

/*
 * 串行兼容（parallel=false 时）。
 * 定义为函数声明（hoisted），即便写在 main() 之后也能被引用；
 * 此处前置到 main() 之前，进一步消除任何引擎对调用顺序的疑虑（G意见2 #1）。
 */
async function seqRun(thunks) {

    const out = [];


    for (
        let i = 0;
        i < thunks.length;
        i++
    ) {

        /*
         * 真正串行：每轮才调用 thunk，
         * 上一个请求（含协议回退）完成后才发下一个
         */

        out.push(
            await thunks[i]()
        );

    }


    return out;

}


async function main() {

    console.log(
        "======================================"
    );

    console.log(
        "中国法律监控 V6.4 开始"
    );

    console.log(
        "======================================"
    );


    let history =
        loadHistory();


    let allItems = [];


    /*
     * 每轮重置异常源记录（CG 建议）
     */

    NET_FAIL_SOURCES = [];

    EMPTY_LINK_SOURCES = [];


    /*
     * ======================================================
     * flcaw 法律草案：直接调官方 JSON 接口
     * ------------------------------------------------------
     * 该页是 JS 渲染壳，静态 HTML 里草案列表为空
     * （<tbody id="beingList">/<tbody id="endList"> 由前端
     * userService.GetFlcaXx 注入）。真实数据来自：
     *   GET /flcaw/flca-list?flag=0&type=0&page=1&per_page=100  （正在征求意见）
     *   GET /flcaw/flca-list?flag=1&type=0&page=1&per_page=100  （已结束的征求意见）
     * 来自 list_service.js + api.js（apiBase='/flcaw'）。
     * 返回 { rows:[ { flxxId, flxxmc, ksrq, jsrq, gzrs, gzyj }, ... ] }
     * flxxId 对应详情页 userIndex.html?lid=<flxxId>。
     * ======================================================
     */

    async function fetchFlcawItems(source) {

        const base =
            "http://www.npc.gov.cn/flcaw";

        const items = [];


        const flags = CONFIG.flcawIncludeEnded ? [0, 1] : [0];

        for (
            let f = 0;
            f < flags.length;
            f++
        ) {

            const apiUrl =
                base +
                "/flca-list?flag=" +
                flags[f] +
                "&type=0&page=1&per_page=100";


            try {

                const resp =
                    await httpGet(
                        apiUrl
                    );


                let json;

                try {

                    json =
                        JSON.parse(
                            resp
                        );

                } catch (e) {

                    console.log(
                        "  flcaw 接口(" +
                        flags[f] +
                        ") 响应非 JSON，跳过: " +
                        e
                    );

                    continue;

                }


                const rows =
                    (json && json.rows)
                        ? json.rows
                        : [];


                for (
                    let i = 0;
                    i < rows.length;
                    i++
                ) {

                    const r =
                        rows[i];

                    const flxxId =
                        r.flxxId;

                    const name =
                        (r.flxxmc || "")
                            .toString()
                            .trim();


                    if (
                        !name ||
                        !flxxId
                    ) {

                        continue;

                    }


                    const ksrq =
                        (r.ksrq || "")
                            .toString()
                            .substring(0, 10);

                    const jsrq =
                        (r.jsrq || "")
                            .toString()
                            .substring(0, 10);

                    const isEnd = flags[f] === 1;

                    /*
                     * 已结束的历史草案（flag=1）：
                     * 默认不进单条通知、不进"正在征集"看板；
                     * 即便 flcawIncludeEnded 开启也仅作历史归档，
                     * 不污染日常推送（GH/Q/DP/GR 一致要求）。
                     */
                    if (isEnd) continue;

                    /*
                     * 防御：截止日已过（flag=0 正常不会返回，
                     * 但接口偶发临界值），不推送过期草案
                     */
                    if (jsrq && jsrq < todayYMD()) continue;

                    const dateStr =
                        (ksrq && jsrq)
                            ? "（" +
                              ksrq +
                              " 至 " +
                              jsrq +
                              "）"
                            : "";

                    /*
                     * 接口返回的 flxxmc 无书名号，
                     * 直接注入《法律名称》作为 lawName，
                     * 避免 extractLawName 正则提取失败导致通知只剩日期
                     */
                    const cleanName = "《" + name + "》";

                    const title =
                        cleanName +
                        " 征求意见" +
                        dateStr;

                    const itemUrl =
                        base +
                        "/userIndex.html?lid=" +
                        encodeURIComponent(flxxId);


                    items.push({

                        title: title,
                        url: itemUrl,
                        source: source.name,
                        lawName: cleanName

                    });

                }


                console.log(
                    "  flcaw 接口(" +
                    flags[f] +
                    ") 草案条数: " +
                    rows.length
                );

            } catch (e) {

                console.log(
                    "  flcaw 接口(" +
                    flags[f] +
                    ") 请求失败: " +
                    e
                );

            }

        }


        return items;

    }


    /*
     * ======================================================
     * 单源抓取（含协议回退）
     * ======================================================
     */

    async function fetchSource(source) {

        console.log(
            "检查: " +
            source.name
        );

        console.log(
            "URL: " +
            source.url
        );


        let html;

        let usedUrl;


        try {

            html =
                await httpGet(
                    source.url
                );

            usedUrl =
                source.url;

        } catch (primaryErr) {

            if (
                !CONFIG.useFallbackScheme
            ) {

                throw primaryErr;

            }


            const alt =
                schemeFlip(
                    source.url
                );


            console.log(
                "  主协议失败，回退: " +
                alt +
                " (" +
                primaryErr +
                ")"
            );


            html =
                await httpGet(
                    alt
                );

            usedUrl =
                alt;

        }


        console.log(
            source.name +
            " HTML长度: " +
            html.length
        );


        /*
         * flcaw 调试：把原始 HTML 整段打到日志，
         * 标记 DEBUG_FLCAP_RAW 起止，便于在控制台提取。
         * 仅 debugFlcaw 开启且是 flcaw 源时触发。
         */
        if (
            CONFIG.debugFlcaw &&
            source.url.indexOf("flcaw") !== -1
        ) {

            console.log(
                "=====DEBUG_FLCAP_RAW_START====="
            );

            console.log(html);

            console.log(
                "=====DEBUG_FLCAP_RAW_END====="
            );

        }


        let links =
            parseLinks(
                html,
                source.name,
                usedUrl
            );


        /*
         * flcaw 专用：该页是 JS 渲染壳，静态 HTML 里草案列表为空，
         * parseLinks 只会从 <script> 字符串里抓到垃圾 <a>。
         * 直接调官方 JSON 接口拿到真实草案，整体替换 links。
         */
        if (
            source.url.indexOf("flcaw") !== -1
        ) {

            try {

                links =
                    await fetchFlcawItems(
                        source
                    );

            } catch (e) {

                console.log(
                    "  flcaw JSON 解析失败，回退 HTML 解析: " +
                    e
                );

            }

        }


        console.log(
            source.name +
            " 获取链接: " +
            links.length
        );


        /*
         * 数据源异常（CG 建议）：
         * 成功拿到 HTML 却解析不到任何链接，
         * 多半是站点改版 / JS 渲染 / 被 WAF 拦截，
         * 不应静默当成"无更新"
         */

        if (
            links.length === 0
        ) {

            /*
             * 仅记日志，不弹窗：
             * 政务网周末/节假日常无更新，每天弹窗会成"通知风暴"
             */

            EMPTY_LINK_SOURCES.push(
                source.name
            );

            console.log(
                "ℹ️ " +
                source.name +
                " 未解析到任何链接（可能暂无更新或站点改版）"
            );

        }


        const out = [];


        let lawCount =
            0;


        for (
            let j = 0;
            j < links.length;
            j++
        ) {

            if (
                isLawRelated(
                    links[j].title
                )
            ) {

                out.push(
                    links[j]
                );

                lawCount++;

            }

        }


        console.log(
            source.name +
            " 法律相关: " +
            lawCount
        );


        return out;

    }


    /*
     * ======================================================
     * 并行 / 串行 扫描
     * ======================================================
     */

    /*
     * 关键：这里只构造「未执行的 thunk」，
     * 不在 map 阶段触发任何网络请求。
     * 否则即便 parallel:false，所有请求也会在 map 时
     * 已并发发出，seqRun 只能顺序 await 已并发的 Promise，
     * 串行失效。
     */

    const thunks =
        CONFIG.sources.map(

            function(source) {

                return async function() {

                    try {

                        return await fetchSource(
                            source
                        );

                    } catch (error) {

                        console.log(
                            source.name +
                            " 检查失败: " +
                            error
                        );

                        NET_FAIL_SOURCES.push(
                            source.name
                        );

                        return [];

                    }

                };

            }

        );


    const settled =
        CONFIG.parallel
            ? await Promise.all(
                thunks.map(
                    function(t) {
                        return t();
                    }
                )
            )
            : await seqRun(thunks);


    for (
        let i = 0;
        i < settled.length;
        i++
    ) {

        allItems =
            allItems.concat(
                settled[i]
            );

    }


    /*
     * ======================================================
     * 去重
     * ======================================================
     */

    allItems =
        uniqueItems(
            allItems
        );


    /*
     * ======================================================
     * 排序
     * ======================================================
     */

    allItems =
        sortItems(
            allItems
        );


    console.log(
        "======================================"
    );

    console.log(
        "法律相关总数: " +
        allItems.length
    );


    /*
     * ======================================================
     * 首次运行
     * ======================================================
     */

    if (
        history.length === 0
    ) {

        /*
         * 首跑防护（CG 建议 + K意见1 #3）：
         * 全部源网络失败 或 全部源解析为 0 链接，都视为"本轮不可信"，
         * 不初始化历史库——否则空历史库会在站点恢复后
         * 把所有真条目当"新增"狂推（通知风暴）。
         */
        const allAnomalous =
            (NET_FAIL_SOURCES.length + EMPTY_LINK_SOURCES.length) >=
            CONFIG.sources.length;

        if (
            allAnomalous
        ) {

            console.log(
                "首次运行：全部数据源异常（网络失败或解析为0），不初始化历史库"
            );


            const reason =
                NET_FAIL_SOURCES.length === CONFIG.sources.length
                    ? "全部 " + CONFIG.sources.length + " 个数据源均无法访问"
                    : "全部 " + CONFIG.sources.length + " 个数据源均解析到 0 链接（可能站点集体改版/被拦截）";

            $notification.post(

                "⚠️ 中国法律监控 V6.4",

                "首次运行失败：" + reason + "，未初始化历史库，请检查网络与源配置",

                ""

            );


            $done();

            return;

        }


        const initialHistory =
            [];


        for (
            let i = 0;
            i < allItems.length;
            i++
        ) {

            const id =
                makeId(
                    allItems[i]
                );

            /*
             * 跳过空 ID（解析失败链接），避免污染历史库
             */

            if (id) {

                initialHistory.push(id);

            }

        }


        const saved =
            saveHistory(
                initialHistory
            );


        console.log(
            "首次运行：建立历史数据库"
        );


        /*
         * 首跑也推送已捕获的条目（修复：
         * 旧版首跑静默吞库，换新版本 / 清空历史后，
         * 当前列表里的"最近通过的法律 / 最近征集意见的草案"
         * 全部被入库、不再弹通知）。
         * 仅当本轮并非"全源异常"时才推（全异常已在上方 return）。
         * 可通过 CONFIG.notifyOnFirstRun 关掉此行为。
         */
        if (
            CONFIG.notifyOnFirstRun
        ) {

            const firstRunCount =
                Math.min(
                    allItems.length,
                    CONFIG.maxNotification
                );


            /*
             * 富化前 N 条（高优先级，含主席令/公布类），
             * 让首跑通知与汇总能展示《法律名称》+ 通过/施行日。
             */
            await enrichItems(
                allItems.slice(
                    0,
                    firstRunCount
                )
            );


            for (
                let i = 0;
                i < firstRunCount;
                i++
            ) {

                sendNotification(
                    allItems[i]
                );

            }


            const frCat =
                {};


            for (
                let i = 0;
                i < allItems.length;
                i++
            ) {

                const c =
                    getCategory(
                        allItems[i].title
                    );

                frCat[c] =
                    (frCat[c] || 0) + 1;

            }


            const frBreakdown =
                Object.keys(frCat)
                    .map(function(k) {
                        return categoryLabel(k) + ":" + frCat[k];
                    })
                    .join("  ");


            const frBoard =
                buildStatusBoard(
                    allItems
                );

            const frBoardItems =
                frBoard.length
                    ? frBoard
                    : allItems;

            const frSumBody =
                buildSummaryBody(
                    frBoardItems
                );

            const frOpen =
                summaryOpenUrl(
                    frBoardItems
                );


            $notification.post(

                "📋 中国法律监控 V6.4 · 首跑状态看板 " +
                frBoardItems.length +
                " 条关注中",

                "点击打开官方页面 · 正文为完整清单",

                frSumBody,

                frOpen

            );

        } else {

            $notification.post(

                "中国法律监控 V6.4",

                "首次运行完成，已记录 " +
                initialHistory.length +
                " 条法律信息",

                ""

            );

        }


        /*
         * 首跑也提示部分异常（网络失败 / 全部 0 链接），
         * 全失败的情形已在上方提前 return，不会重复弹窗
         */

        emitHealthAlerts();


        if (!saved) {

            $notification.post(

                "⚠️ 中国法律监控 V6.4",

                "历史库保存失败，请检查 Loon 持久存储权限",

                ""

            );

        }


        $done();

        return;

    }


    /*
     * ======================================================
     * 找新增
     * ======================================================
     */

    const newItems =
        getNewItems(
            allItems,
            history
        );


    console.log(
        "新增: " +
        newItems.length
    );


    /*
     * ======================================================
     * 保存历史
     * ======================================================
     */

    /*
     * 历史写回用 Set 去重（G意见2 #4）：
     * 即便 newItems 内部或历史库存在格式变体，
     * 也只保留唯一 ID，避免历史数组无序膨胀后被截断误切合法 ID。
     */
    const historySet =
        new Set(
            history
        );


    for (
        let i = 0;
        i < newItems.length;
        i++
    ) {

        const id =
            makeId(
                newItems[i]
            );

        if (id) {

            historySet.add(id);

        }

    }


    const saved =
        saveHistory(
            Array.from(historySet)
        );


    if (!saved) {

        $notification.post(

            "⚠️ 中国法律监控 V6.4",

            "历史库保存失败，请检查 Loon 持久存储权限",

            ""

        );

    }


    /*
     * 富化新增条目（详情页补《法律名称》+ 通过/施行日），
     * 让通知与汇总报告更可读。最佳努力，失败回退列表标题。
     */
    await enrichItems(
        newItems
    );


    /*
     * ======================================================
     * 数据源异常报警（CG 建议）
     * 即便没有法律更新，也要提示"有源可能挂了"，
     * 否则 links=0 会被误当成"一切正常"
     * ======================================================
     */

    /*
     * ======================================================
     * 数据源健康告警（CG + G 综合）
     * - 网络真正失败：必弹窗（真实故障）
     * - 全部源都 0 链接：弹窗"疑似解析异常"（系统级改版）
     * - 个别源 0 链接：仅日志，不弹窗（避免每日通知风暴）
     * 首跑分支也会调用本函数（见上方首跑块）。
     * ======================================================
     */

    emitHealthAlerts();


    /*
     * ======================================================
     * 没有新增
     * ======================================================
     */

    if (
        newItems.length === 0
    ) {

        console.log(
            "没有发现新的法律信息"
        );

        /*
         * 0 新增但抓到了法律信息：默认仍发一条汇总通知，
         * 避免通知中心空白、用户误以为没跑。
         * 正文给分类计数，点击打开本次完整清单（含原文链接）。
         * 可用 CONFIG.notifyDigestWhenNoNew 关闭。
         */
        if (
            CONFIG.notifyDigestWhenNoNew &&
            allItems.length > 0
        ) {

            const catCount =
                {};

            for (
                let i = 0;
                i < allItems.length;
                i++
            ) {

                const c =
                    getCategory(
                        allItems[i].title
                    );

                catCount[c] =
                    (catCount[c] || 0) + 1;

            }

            const breakdown =
                Object.keys(catCount)
                    .map(function(k) {

                        return categoryLabel(k) + ":" + catCount[k];

                    })
                    .join("  ");

            const board =
                buildStatusBoard(
                    allItems
                );

            const boardItems =
                board.length
                    ? board
                    : allItems.slice(
                        0,
                        CONFIG.digestMaxItems
                    );

            const sumBody =
                buildSummaryBody(
                    boardItems
                );

            const openUrl =
                summaryOpenUrl(
                    boardItems
                );

            $notification.post(

                "📋 中国法律监控 V6.4 · 状态看板 " +
                boardItems.length +
                " 条关注中（较上次无新增）",

                "点击打开官方页面 · 正文为当前关注清单",

                sumBody,

                openUrl

            );

            console.log(
                "已发送状态看板通知（" +
                boardItems.length +
                " 条关注中）"
            );

        }

        console.log(
            "中国法律监控 V6.4 完成"
        );

        $done();

        return;

    }


    /*
     * ======================================================
     * 推送
     * ======================================================
     */

    const notifyCount =
        Math.min(
            newItems.length,
            CONFIG.maxNotification
        );


    for (
        let i = 0;
        i < notifyCount;
        i++
    ) {

        sendNotification(
            newItems[i]
        );

    }


    /*
     * 汇总通知（最后一条）：正文列出"当前最需关注"的清单
     * （正在征集的草案 + 最近通过公布的法律 + 立法审议），
     * 点击打开真实官方页面（flcaw 草案页 / 评分最高条目的原文 / 国务院政策集），
     * 不再用 data: URL（Loon/iOS 打不开 data:，会回退成运行日志）。
     * 这样"每次运行、最后一条 = 可点击看到完整关注清单"成立（GR意见3 方案1）。
     */
    const board =
        buildStatusBoard(
            allItems
        );

    const boardItems =
        board.length
            ? board
            : allItems.slice(
                0,
                CONFIG.digestMaxItems
            );

    const sumBody =
        buildSummaryBody(
            boardItems
        );

    const openUrl =
        summaryOpenUrl(
            boardItems
        );


    $notification.post(

        "📋 中国法律监控 V6.4 · 状态看板 " +
        boardItems.length +
        " 条关注中（本次新增 " +
        newItems.length +
        " 条）",

        "点击打开官方页面 · 正文为当前关注清单",

        sumBody,

        openUrl

    );


    console.log(
        "中国法律监控 V6.4 完成"
    );


    $done();

}


/* ==========================================================
   21. 启动
========================================================== */

main();
