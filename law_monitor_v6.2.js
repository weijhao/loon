/*
============================================================
中国法律监控 V6.2（V5 原地加固版）
Loon 3.5.0+

加固点（相对 V5）：
1. 并行抓取：Promise.all 替代串行，最坏耗时≈单源超时
2. 协议回退：主 URL 失败自动翻转 http/https 重试
3. 无引号 href 也能解析
4. 短标题误杀修复：长度门槛降到 4，含法律/重点关键词的短名保留
5. 溢出摘要带分类计数

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

    maxHistory: 2000,

    timeout: 30000,

    /*
     * 并行抓取（true = Promise.all；false = 串行）
     */
    parallel: true,

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

            "⚠️ 中国法律监控 V6.2",

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

            "⚠️ 中国法律监控 V6.2",

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

function httpGet(url) {

    return new Promise(
        function(resolve, reject) {

            $httpClient.get(

                {

                    url: url,

                    timeout:
                        CONFIG.timeout,

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

    return html

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
        ) !== -1
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
     * 通过/公布
     */

    if (
        title.indexOf(
            "通过"
        ) !== -1
    ) {

        score += 50;

    }


    if (
        title.indexOf(
            "公布"
        ) !== -1
    ) {

        score += 50;

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
   19.1 通知
========================================================== */

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
        extractLawName(
            item.title
        );


    const deadline =
        extractDeadline(
            item.title
        );


    let body;


    if (
        lawName ||
        deadline
    ) {

        body = "";

        if (lawName) {

            body += lawName;

        }

        if (deadline) {

            body += deadline + " ";

        }

        body += "点击进入原文";

    } else {

        body = item.title;

        if (
            body.length > 100
        ) {

            body =
                body.substring(
                    0,
                    100
                ) +
                "...";

        }

        body += " 点击进入原文";

    }


    $notification.post(

        title,

        body.trim(),

        item.url

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
        "中国法律监控 V6.2 开始"
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


        const links =
            parseLinks(
                html,
                source.name,
                usedUrl
            );


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

                "⚠️ 中国法律监控 V6.2",

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


            $notification.post(

                "中国法律监控 V6.2",

                "首次运行完成，已收录 " +
                allItems.length +
                " 条并入库（后续仅推送新增）。已优先推送评分最高的 " +
                firstRunCount +
                " 条\n" +
                frBreakdown,

                ""

            );

        } else {

            $notification.post(

                "中国法律监控 V6.2",

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

                "⚠️ 中国法律监控 V6.2",

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

            "⚠️ 中国法律监控 V6.2",

            "历史库保存失败，请检查 Loon 持久存储权限",

            ""

        );

    }


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

        console.log(
            "中国法律监控 V6.2 完成"
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
     * 超过上限：带分类计数的汇总通知
     */

    if (
        newItems.length >
        CONFIG.maxNotification
    ) {

        const catCount =
            {};


        for (
            let i = 0;
            i < newItems.length;
            i++
        ) {

            const c =
                getCategory(
                    newItems[i].title
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


        $notification.post(

            "中国法律监控 V6.2",

            "发现 " +
            newItems.length +
            " 条新增，已推送优先级最高的 " +
            CONFIG.maxNotification +
            " 条\n" +
            breakdown,

            ""

        );

    }


    console.log(
        "中国法律监控 V6.2 完成"
    );


    $done();

}


/* ==========================================================
   21. 启动
========================================================== */

main();
