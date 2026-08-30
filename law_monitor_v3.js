/*
============================================================
中国法律监控 V3
Loon 3.5.0 (975)
============================================================

数据源：

1. 全国人大
2. 司法部
3. 中国政府网

功能：

- 新法律
- 法律草案
- 公开征求意见
- 立法审议
- 行政法规
- 司法解释
- 部门规章
- 立法计划
- 重点领域监控
- 自动去重
- 首次运行不刷屏
- 新增内容推送
- 高优先级内容 ⭐
- 单次最多推送 8 条

============================================================
*/


/* ========================================================
   配置
======================================================== */

const CONFIG = {

    /*
     * 全国人大 HTTPS 在你的 Loon 3.5.0 环境中
     * TLS 握手失败，因此使用 HTTP。
     */
    sources: [

        {
            name: "全国人大",
            url: "http://www.npc.gov.cn/"
        },

        {
            name: "司法部",
            url: "https://www.moj.gov.cn/"
        },

        {
            name: "中国政府网",
            url: "https://www.gov.cn/zhengce/index.htm"
        }

    ],

    /*
     * 每次最多推送多少条
     */
    maxNotification: 8,

    /*
     * 最多保存多少条历史
     */
    maxHistory: 1000,

    /*
     * 请求超时
     */
    timeout: 30000

};


/* ========================================================
   Persistent Store
======================================================== */

const STORE_KEY =
    "china_law_monitor_v3_history";


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


/* ========================================================
   HTTP
======================================================== */

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
                        response.status <
                            200 ||
                        response.status >=
                            400
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


/* ========================================================
   HTML 清理
======================================================== */

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


/* ========================================================
   URL 处理
======================================================== */

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

        return href
            .split("#")[0];

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
     * /
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
     * 相对 URL
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


/* ========================================================
   提取链接
======================================================== */

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

        let href =
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
         * 标题过滤
         */

        if (
            title.length < 5
        ) {

            continue;

        }


        if (
            title.length > 200
        ) {

            title =
                title.substring(
                    0,
                    200
                );

        }


        /*
         * 排除导航
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
            "下一页",
            "上一页",
            "网站导航",
            "English"

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


/* ========================================================
   核心关键词
======================================================== */

const CORE_KEYWORDS = [

    "法律草案",
    "修正案草案",
    "修订草案",

    "公开征求意见",
    "征求意见",

    "提请审议",
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

    "立法项目"

];


/* ========================================================
   立法程序
======================================================== */

const PROCEDURE_KEYWORDS = [

    "一审",
    "二审",
    "三审",

    "初次审议",
    "再次审议",

    "继续审议",

    "提请",

    "审议",

    "表决",

    "通过",

    "公布",

    "施行"

];


/* ========================================================
   法律名称
======================================================== */

const LAW_NAME_KEYWORDS = [

    "法律",
    "条例",
    "规定",
    "办法",
    "规则",
    "决定",
    "解释"

];


/* ========================================================
   ⭐ 重点关注领域
======================================================== */

const HIGH_PRIORITY_KEYWORDS = [

    "行政复议",

    "行政诉讼",

    "行政处罚",

    "行政许可",

    "政府信息公开",

    "不动产",

    "不动产登记",

    "房地产",

    "土地",

    "国有土地",

    "集体土地",

    "住房",

    "保障性住房",

    "物业",

    "征收",

    "拆迁",

    "民法典",

    "消费者权益",

    "消费者",

    "合同",

    "劳动",

    "劳动合同",

    "公司",

    "个人信息",

    "数据安全",

    "网络安全"

];


/* ========================================================
   判断法律相关
======================================================== */

function isLawRelated(title) {

    if (!title) {

        return false;

    }


    /*
     * 核心关键词直接通过
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
     * 重点领域直接通过
     */

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


    /*
     * 普通法律名称必须搭配
     * 立法程序关键词。
     */

    let hasLawName =
        false;


    let hasProcedure =
        false;


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

            hasLawName =
                true;

            break;

        }

    }


    for (
        let i = 0;
        i <
        PROCEDURE_KEYWORDS.length;
        i++
    ) {

        if (
            title.indexOf(
                PROCEDURE_KEYWORDS[i]
            ) !== -1
        ) {

            hasProcedure =
                true;

            break;

        }

    }


    return (
        hasLawName &&
        hasProcedure
    );

}


/* ========================================================
   重点判断
======================================================== */

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


/* ========================================================
   评分
======================================================== */

function getScore(title) {

    let score = 0;


    /*
     * 核心词
     */

    for (
        let i = 0;
        i <
        CORE_KEYWORDS.length;
        i++
    ) {

        if (
            title.indexOf(
                CORE_KEYWORDS[i]
            ) !== -1
        ) {

            score += 20;

        }

    }


    /*
     * 重点领域
     */

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

            score += 50;

        }

    }


    /*
     * 程序词
     */

    for (
        let i = 0;
        i <
        PROCEDURE_KEYWORDS.length;
        i++
    ) {

        if (
            title.indexOf(
                PROCEDURE_KEYWORDS[i]
            ) !== -1
        ) {

            score += 5;

        }

    }


    return score;

}


/* ========================================================
   分类
======================================================== */

function getCategory(title) {

    if (
        title.indexOf(
            "公开征求意见"
        ) !== -1
    ) {

        return "🟡 公开征求意见";

    }


    if (
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
            "审议"
        ) !== -1 ||
        title.indexOf(
            "提请"
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
            "条例"
        ) !== -1 ||
        title.indexOf(
            "法律"
        ) !== -1
    ) {

        return "🔴 新法/法规";

    }


    return "🔵 法律动态";

}


/* ========================================================
   唯一 ID
======================================================== */

function makeId(item) {

    /*
     * 使用 URL + 标题
     *
     * 避免同一个 URL 内容更新
     * 时无法再次发现。
     */

    return (
        item.source +
        "|" +
        item.url +
        "|" +
        item.title
    );

}


/* ========================================================
   URL 去重
======================================================== */

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


/* ========================================================
   排序
======================================================== */

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


/* ========================================================
   查找新增
======================================================== */

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


/* ========================================================
   通知
======================================================== */

function sendNotification(item) {

    const high =
        isHighPriority(
            item.title
        );


    const category =
        getCategory(
            item.title
        );


    let notificationTitle;


    if (high) {

        notificationTitle =
            "⭐ " +
            category +
            " · " +
            item.source;

    } else {

        notificationTitle =
            category +
            " · " +
            item.source;

    }


    let body =
        item.title;


    /*
     * Loon 通知正文不要太长
     */

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

        notificationTitle,

        body,

        item.url

    );

}


/* ========================================================
   主程序
======================================================== */

async function main() {

    console.log(
        "======================================"
    );

    console.log(
        "中国法律监控 V3 开始"
    );

    console.log(
        "Loon Version: " +
        ($loon
            ? $loon.version
            : "unknown")
    );

    console.log(
        "======================================"
    );


    let history =
        loadHistory();


    let allItems = [];


    /*
     * ====================================================
     * 检查所有来源
     * ====================================================
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
            source.name +
            " " +
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


            let count =
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

                    count++;

                }

            }


            console.log(
                source.name +
                " 法律相关: " +
                count
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
     * ====================================================
     * 去重
     * ====================================================
     */

    allItems =
        uniqueItems(
            allItems
        );


    /*
     * ====================================================
     * 排序
     * ====================================================
     */

    allItems =
        sortItems(
            allItems
        );


    console.log(
        "法律相关总数: " +
        allItems.length
    );


    /*
     * ====================================================
     * 第一次运行
     * ====================================================
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

            "中国法律监控",

            "首次运行完成，已记录 " +
            allItems.length +
            " 条历史信息",

            ""

        );


        $done();

        return;

    }


    /*
     * ====================================================
     * 查找新增
     * ====================================================
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
     * ====================================================
     * 保存历史
     * ====================================================
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
     * ====================================================
     * 没有更新
     * ====================================================
     */

    if (
        newItems.length === 0
    ) {

        console.log(
            "没有发现新的法律信息"
        );


        console.log(
            "中国法律监控 V3 完成"
        );


        $done();

        return;

    }


    /*
     * ====================================================
     * 推送
     * ====================================================
     */

    const count =
        Math.min(
            newItems.length,
            CONFIG.maxNotification
        );


    for (
        let i = 0;
        i < count;
        i++
    ) {

        sendNotification(
            newItems[i]
        );

    }


    /*
     * 超过最大推送数量
     */

    if (
        newItems.length >
        CONFIG.maxNotification
    ) {

        $notification.post(

            "中国法律监控",

            "发现 " +
            newItems.length +
            " 条新信息，已推送优先级最高的 " +
            CONFIG.maxNotification +
            " 条",

            ""

        );

    }


    console.log(
        "中国法律监控 V3 完成"
    );


    $done();

}


/* ========================================================
   启动
======================================================== */

main();
