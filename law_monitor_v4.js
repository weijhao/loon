/*
============================================================
中国法律监控 V4
Loon 3.5.0 (975)

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

    maxHistory: 2000,

    timeout: 30000,

    /*
     * 定向栏目
     */

    sources: [

        /*
         * 全国人大 - 立法
         */

        {
            name: "全国人大-立法",
            url: "https://www.npc.gov.cn/npc/c2/c183/index.html"
        },

        /*
         * 全国人大 - 立法动态
         */

        {
            name: "全国人大-立法动态",
            url: "https://www.npc.gov.cn/npc/c2/c183/c199/index.html"
        },

        /*
         * 全国人大首页
         *
         * 作为补充，防止栏目调整后遗漏
         */

        {
            name: "全国人大",
            url: "http://www.npc.gov.cn/"
        },

        /*
         * 司法部 - 立法意见征集
         */

        {
            name: "司法部-立法意见征集",
            url: "https://www.moj.gov.cn/lfyjzj/lfyjzj/"
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
    "china_law_monitor_v4_history";


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

    } catch (e) {

        console.log(
            "保存历史失败: " + e
        );

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
                            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",

                        "Accept":
                            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

                        "Accept-Language":
                            "zh-CN,zh;q=0.9"

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

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}


/* ==========================================================
   5. URL处理
========================================================== */

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
     * 相对路径
     */

    const index =
        baseUrl.lastIndexOf("/");


    if (index === -1) {

        return "";

    }


    return (
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


    const regex =
        /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


    let match;


    while (
        (match =
            regex.exec(html)) !== null
    ) {

        const href =
            match[1];


        let title =
            htmlToText(
                match[2]
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
         */

        if (
            title.length < 5
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
   7. 核心法律关键词
========================================================== */

const CORE_KEYWORDS = [

    "法律草案",

    "修正案草案",

    "修订草案",

    "草案",

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

        return "🟡 征求意见";

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

        return "🟡 法律草案";

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

        return "🟠 立法审议";

    }


    if (
        title.indexOf(
            "行政法规"
        ) !== -1
    ) {

        return "🔴 行政法规";

    }


    if (
        title.indexOf(
            "司法解释"
        ) !== -1
    ) {

        return "🔴 司法解释";

    }


    if (
        title.indexOf(
            "国务院令"
        ) !== -1
    ) {

        return "🔴 国务院法规";

    }


    if (
        title.indexOf(
            "规章"
        ) !== -1
    ) {

        return "🔴 部门规章";

    }


    if (
        title.indexOf(
            "法律"
        ) !== -1 ||
        title.indexOf(
            "条例"
        ) !== -1
    ) {

        return "🔴 新法/法规";

    }


    return "🔵 立法动态";

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

function makeId(item) {

    return (
        item.source +
        "|" +
        item.url +
        "|" +
        item.title
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


        if (
            !map[item.url]
        ) {

            map[item.url] =
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
   19. 通知
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


    let title;


    if (high) {

        title =
            "⭐ " +
            category +
            " · " +
            item.source;

    } else {

        title =
            category +
            " · " +
            item.source;

    }


    let body =
        item.title;


    if (
        body.length > 120
    ) {

        body =
            body.substring(
                0,
                120
            ) +
            "...";

    }


    $notification.post(

        title,

        body,

        item.url

    );

}


/* ==========================================================
   20. 主程序
========================================================== */

async function main() {

    console.log(
        "======================================"
    );

    console.log(
        "中国法律监控 V4 开始"
    );

    console.log(
        "======================================"
    );


    let history =
        loadHistory();


    let allItems = [];


    /*
     * ======================================================
     * 定向扫描
     * ======================================================
     */

    for (
        let i = 0;
        i < CONFIG.sources.length;
        i++
    ) {

        const source =
            CONFIG.sources[i];


        console.log(
            "检查: " +
            source.name
        );


        console.log(
            "URL: " +
            source.url
        );


        try {

            const html =
                await httpGet(
                    source.url
                );


            console.log(
                source.name +
                " HTML长度: " +
                html.length
            );


            const links =
                parseLinks(
                    html,
                    source.name,
                    source.url
                );


            console.log(
                source.name +
                " 获取链接: " +
                links.length
            );


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

                    allItems.push(
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


        } catch (error) {

            console.log(
                source.name +
                " 检查失败: " +
                error
            );

        }

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

        const initialHistory =
            [];


        for (
            let i = 0;
            i < allItems.length;
            i++
        ) {

            initialHistory.push(
                makeId(
                    allItems[i]
                )
            );

        }


        saveHistory(
            initialHistory
        );


        console.log(
            "首次运行：建立历史数据库"
        );


        $notification.post(

            "中国法律监控 V4",

            "首次运行完成，已记录 " +
            allItems.length +
            " 条法律信息",

            ""

        );


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

    const updatedHistory =
        history.slice();


    for (
        let i = 0;
        i < newItems.length;
        i++
    ) {

        updatedHistory.push(
            makeId(
                newItems[i]
            )
        );

    }


    saveHistory(
        updatedHistory
    );


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
            "中国法律监控 V4 完成"
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
     * 超过8条
     */

    if (
        newItems.length >
        CONFIG.maxNotification
    ) {

        $notification.post(

            "中国法律监控 V4",

            "发现 " +
            newItems.length +
            " 条新增法律信息，已推送优先级最高的 " +
            CONFIG.maxNotification +
            " 条",

            ""

        );

    }


    console.log(
        "中国法律监控 V4 完成"
    );


    $done();

}


/* ==========================================================
   21. 启动
========================================================== */

main();
