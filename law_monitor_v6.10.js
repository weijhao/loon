/*
============================================================
中国法律监控 V6.10（V5/V6 原地加固版）
Loon 3.5.0+

加固点（相对 V5）：
1. flcaw 只抓「正在征求意见」(flag=0)，摒弃 flag=1 已结束的历史草案（曾上百条污染推送、截止日错乱）
2. 新增「全国人大-权威发布」源，精准捕获主席令与最近通过/公布的法律
3. flcaw 草案直接注入《法律名称》（接口返回名无书名号，旧正则提取失败→通知只剩日期）
4. 已公布法律（法/条例/办法/规定…结尾的纯名称）纳入识别、「新法/法规」分类并加权置顶
5. 过期草案（截止日<今日）不推送；并行抓取/协议回退/短标题豁免等 V6 加固全部保留

V6.6 加固点（针对 6.5 运行日志 + Q/DP/GR/G 四份意见）：
1. 权威发布页专属解析：直接提取「<a>法名</a>2026-08-28」同行日期作为公布日，
   杜绝详情页富化"日期穿越"（预备役法残留 2010、修改部分法律决定残留 2002）
2. 智能法律名称：决定类（修改/批准《X》的决定）不再被详情页正文《X》覆盖；
   纯文本法律名（中华人民共和国医疗保障法）自动补《》
3. 日期可信度校验：详情页提取的通过/施行日若早于当前年-3年则丢弃，
   公布日以列表旁注日期优先
4. 主席令（第X号）从权威发布源剔除（只留 6 条真实法律/决定）
5. 全局过期征求意见过滤（不限 flcaw 源）
6. 状态看板重构为「立法信息 / 正在征求意见」两区，去除 75 条大杂烩

V6.6 加固点（V6.6 实机回归后收口，针对日志里的"通知形态仍不对"）：
1. 权威发布专属解析加了「0 条则回退通用解析」兜底：
   站点把日期挪进 <span>/兄弟节点时不会整源丢空（V6.6 实测会丢 6 条法律）
2. 状态看板改为「白名单 + 上限」：立法信息只看权威发布源的真实法律/决定
   （+ 其它源的行政法规/国务院令/司法解释），
   不再把法律法规数据库残留的"预备役人员法 2010""修改部分法律的决定 2002"
   这类链接算进"关注 N 条"，标题回到用户要的「立法信息 6 · 征求意见 5」
3. 看板补富化：0 新增的常规运行也会对立法区前 N 条抓一次详情页，
   让看板稳定带"公布日 + 施行日"（V6.6 只有首跑/有新增时才有日期）
4. 修 lawName 被空值覆盖：详情页只补到日期、补不到法名时不再把已有法名清成空
5. 看板征求意见行兜底显示"意见截止：YYYY-MM-DD"（无起止区间时）
6. 详情页富化扫到的《X》需通过"长得像法名"校验，
   防止《全国人民代表大会常务委员会公报》之类导航项抢走法名
7. 主席令过滤兼容半角括号；flcaw 条目标记 preEnriched，不再白抓详情页

V6.7 加固点（V6.6 实机跑通后，用户要求"通知内容也在日志里留一份"）：
1. 新增 emitNotification：每条通知（标题 / 正文 / 点击打开的 URL）
   同步打印一份到 Loon 运行日志，编号「推送通知 [N]」。
   通知中心不便复制、也不好一次看全，打开运行日志即可回看本轮全部推送。
2. 新增 logBoardItemLinks：看板通知之后补一份
   「看板条目 → 原文链接」清单（通知正文是纯文本，挂不了逐条超链接）。
3. 结尾打印「本轮共推送 N 条通知（含状态看板）」。
4. 两个开关：CONFIG.logNotificationCopy / CONFIG.logBoardItemLinks（默认均 true）

V6.8 加固点（针对 6.7 实机日志里 9 处 ==错误== 标记）：
1. 纯主席令过滤：凡标题含"主席令"但不含《法名》的一律丢弃
   （旧正则只认"主席令（第X号）"，漏掉"85号主席令"这种数字在前的写法）；
   带《法名》的（如"签署主席令 公布《XX法》"）照常保留。
2. 栏目导航过滤：标题完全等于"行政法规""部门规章""司法解释"等栏目名的丢弃
   （司法部网站的栏目链接被当成法规抓进了看板）。
3. 汇总型 / 新闻句式过滤（GR 意见 P1）：不含书名号（即解析不出法名）且
   命中下列特征之一 → 丢弃：① "N件/N部"开头；② 以"公开征求意见"收尾；
   ③ 含冒号（新闻标题句式）；④ 超 24 字且含虚词。
   典型："5件法律草案公开征求意见""企业破产法修订草案二审：明确…"。
4. 陈旧条目过滤：从政务 URL 的 /tYYYYMMDD/ 或 /YYYYMM/ 反推发布日期，
   征求意见/草案类早于「今天 - staleConsultMonths（默认 18）个月」的丢弃
   （司法部 2024-12 的征集页至今仍在线，标题里又没有任何日期）。
5. boardIncludeSecondary 默认改为 false：立法信息区只留人大法律与决定，
   不再混入国务院行政法规 / 部门规章 / 司法解释。
6. 看板只收录解析得出名称的条目（itemDisplayName）—— 连名字都没有的条目
   在通知里就是一行孤零零的日期；标题截断补省略号，不再出现"执行程"断句。
7. 看板征求意见区也补富化（截止日常只写在详情页正文里），
   并在富化后再剔一次已过期征集。
8. flcaw 草案名去掉接口自带的多余后缀（"…二次审议稿）征求意见"）

V6.9 新功能：正在征求意见的法案补 NPC Observer 链接
1. 该站（https://npcobserver.com/）是英文独立站，每个法案一个页面，
   含英文摘要与立法时间线。其索引页条目形如
     <a href="…/legislation/enterprise-bankruptcy-law/">Enterprise Bankruptcy Law</a> [企业破产法]
   即「英文条目链接 + 紧随其后的方括号中文名」成对出现，
   据此可直接建立「中文法名 → 条目页」映射，不需要搜索接口。
2. 首页 + /legislation/ 两页合并建表（实测 33 条有效配对，覆盖当前 14 届在办法案）。
3. 匹配顺序：精确 → 去「中华人民共和国」前缀后精确 → 前缀匹配（限键长 ≥4，
   避免"水法"误配到"水污染防治法"）。
4. 看板【正在征求意见】每条下面另起一行附链接；运行日志的看板条目清单里也附一份。
5. 境外站点，单独 12s 超时；抓不到静默降级，看板照常输出，绝不影响主流程。
6. 只在确有征集条目时才去抓，省一次请求。
7. 开关：CONFIG.npcObserverEnabled（总开关）
         CONFIG.npcObserverInSingleNotify（单条通知里也附，默认关）
   —— 该开关在 V6.10 已改名 extraLinksInSingleNotify（同时管 Onpc 与 Cnpc）

V6.10 新功能：正在征求意见的法案补「草案正文 PDF」链接（Cnpc）
1. 全国人大草案页（userIndex.html?lid=XXX）的"电子文档下载"是 JS 运行时拼的：
     userService.GetIdFjxx(id).then(function(response) {
       $('#download').attr('href', './flca/' + response.busiId + '/attachment.pdf');
     });
   静态 HTML 里只有这段 JS、没有真实 href，直接抓页面拿不到链接。
2. 但文件名硬编码为 attachment.pdf，且实测 busiId == lid
   （5 条在征集草案均已验证：HTTP 200 + application/pdf，约 512KB），
   所以可直接由 lid 拼出：
     http://www.npc.gov.cn/flcaw/flca/{lid}/attachment.pdf
   —— 零额外请求，不下载正文。
3. 只有 flcaw 接口来的草案才有 lid；司法部等其它源的征求意见不附 Cnpc。
4. 可选 HEAD 校验（CONFIG.flcawAttachmentVerify，默认关）：
   开着时逐条只取响应头确认是 PDF，失效则不给链接。
5. 看板版式：
     • 《企业破产法（修订草案二次审议稿）》  2026-08-28 至 2026-09-26
         Onpc：https://npcobserver.com/legislation/enterprise-bankruptcy-law/
         Cnpc：http://www.npc.gov.cn/flcaw/flca/…/attachment.pdf

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

    /*
     * 状态看板补富化上限（默认 8，0 = 关闭）：
     * 施行日期只存在于详情页。常规运行 0 新增时 enrichItems 不会跑，
     * 看板「立法信息」就只剩法名没有"公布日 / 施行日"。
     * 这里对看板立法区前 N 条、且本轮尚未富化过的条目补抓一次详情。
     * 已富化过的新增条目自动跳过，不会重复请求。
     */
    enrichBoardTop: 8,

    /*
     * 日志同步推送内容（默认开）：
     * 每条通知（标题 / 正文 / 点击打开的 URL）同步打印一份到 Loon 运行日志。
     * 用途：iPhone 通知中心翻看不便、也不好复制，
     *      打开运行日志就能一次性看到本轮推了什么、链接在哪。
     * 觉得日志太长可设 false。
     */
    logNotificationCopy: true,

    /*
     * 看板条目原文链接（默认开）：
     * 通知正文是纯文本，挂不了每条的超链接，
     * 这里在日志里补一份「看板条目 → 原文链接」清单，
     * 便于一次性复制/查看本轮关注清单的所有原文地址。
     */
    logBoardItemLinks: true,

    /*
     * NPC Observer 补充链接（默认开）：
     * 给每条「正在征求意见」的法案附上 npcobserver.com 上对应的英文条目页
     * （独立站，每个法案一个页面，含英文摘要与立法时间线）。
     * 该站索引页的条目形如
     *   <a href="…/legislation/enterprise-bankruptcy-law/">Enterprise Bankruptcy Law</a> [企业破产法]
     * 据此可直接建立「中文法名 → 条目页」映射，无需搜索接口。
     * 失败静默跳过，绝不影响主流程。
     */
    npcObserverEnabled: true,

    /*
     * 抓哪几页来建立配对表。首页 + 立法页合并后覆盖最广（实测 33 条有效配对）。
     */
    npcObserverUrls: [
        "https://npcobserver.com/",
        "https://npcobserver.com/legislation/"
    ],

    /*
     * 该站是境外站点，单独给一个超时（默认 12s），
     * 慢就跳过，不拖累整轮脚本。
     */
    npcObserverTimeout: 12000,

    /*
     * 草案正文 PDF（Cnpc，默认开）：
     * 全国人大草案征求意见页（userIndex.html?lid=XXX）里的"电子文档下载"
     * 是 JS 运行时拼出来的：'./flca/' + response.busiId + '/attachment.pdf'
     * 静态 HTML 里只有这段 JS、没有真实 href，抓不到链接。
     * 但文件名是硬编码的 attachment.pdf，且实测 busiId == lid，
     * 所以可以直接从 lid 拼出，零额外请求。
     * 5 条在征集草案已实测全部 200 + application/pdf。
     */
    flcawAttachmentLink: true,

    flcawAttachmentUrlTemplate:
        "http://www.npc.gov.cn/flcaw/flca/{lid}/attachment.pdf",

    /*
     * 是否在推送前 HEAD 校验一遍 PDF 确实存在（默认关）。
     * 关着：零请求，极少数无附件的草案会给出失效链接。
     * 开着：每条征集多一次 HEAD 请求（不下载正文，只取响应头）。
     * 需要 Loon 支持 $httpClient.head；不支持时自动按"存在"处理。
     */
    flcawAttachmentVerify: false,

    flcawAttachmentTimeout: 8000,

    /*
     * 单条通知里是否也附 Onpc / Cnpc 两个补充链接（默认关）。
     * iOS 通知正文是纯文本、链接不可点，附上只会让正文变长；
     * 看板正文与运行日志里始终会附。
     * （V6.9 时此开关名为 npcObserverInSingleNotify，V6.10 改名以涵盖两个链接）
     */
    extraLinksInSingleNotify: false,

    /*
     * 陈旧条目过滤：从政务 URL 里的日期（/t20241230_… 或 /202412/）
     * 反推发布日期，早于「今天 - N 个月」的征求意见/草案直接丢弃。
     * 默认 18 个月 —— 既能挡掉 2024 年的僵尸征集，
     * 又不会误杀跨度较长的在征集条目。
     * 设 0 或负数可关闭。
     */
    staleConsultMonths: 18,

    /*
     * 看板「立法信息」区是否并入其它源的行政法规 / 国务院令 /
     * 司法解释 / 部门规章（V6.8 默认改为关）。
     * 关掉后立法区只保留全国人大权威发布的真实法律与决定，
     * 计数更干净（如「立法信息 6 · 征求意见 5」），
     * 但会漏掉国务院/司法部/两高的法规与解释。
     */
    /*
     * 6.7 实机日志验证：开着会把「国务院关于修改和废止部分行政法规的决定」
     * 之类非人大立法混进立法信息区，用户不接受。
     * 想要行政法规/部门规章/司法解释时手动设 true。
     */
    boardIncludeSecondary: false,

    /*
     * 状态看板两区各最多展示多少条。
     * 立法信息按"权威发布白名单优先 + 公布日倒序"取前 N；
     * 征求意见按"有明确截止日的在前 + 截止日升序"取前 N。
     */
    boardPublishedMax: 10,
    boardConsultMax: 10,

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
 * NPC Observer（https://npcobserver.com/）的「中文法名 → 条目页 URL」配对表。
 * 每轮运行按需抓取一次，抓不到就是空表，不影响主流程。
 */
let NPCO_MAP = {};


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

        emitNotification(

            "⚠️ 中国法律监控 V6.10",

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

        emitNotification(

            "⚠️ 中国法律监控 V6.10",

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
   6.0.1 权威发布页专属解析器
   ----------------------------------------------------------
   权威发布页（/npc/c2/c12435/）的每条法律/决定都是
   「<a href="...">法律名称</a>2026-08-28」结构，
   日期紧跟在 </a> 之后（可能夹一个 <span>）。
   直接提取「同行日期」作为公布日写入 item.publishDate，
   可彻底避免去详情页盲猜导致的"日期穿越"（如 2010/2002）。
   同时把纯文本法律名 / 决定类标题直接交给 displayLawName 处理。
========================================================== */

function parseAuthorityLinks(
    html,
    sourceName,
    sourceUrl
) {

    const result = [];

    if (!html) {
        return result;
    }

    /*
     * 匹配 <a ... href="..">标题</a> [最多 3 层包装标签] YYYY-MM-DD
     * （V6.6：原版只允许 1 层标签，站点把日期包进
     *   <span class="date"><i>2026-08-28</i></span> 之类结构时整源会丢空）
     */
    const regex =
        /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>\s*(?:<[^>]*>\s*){0,3}(\d{4}-\d{2}-\d{2})/gi;

    let match;

    while (
        (match = regex.exec(html)) !== null
    ) {

        const href =
            match[1] ||
            match[2];

        let title =
            htmlToText(
                match[3]
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        const pubDate =
            match[4];

        if (title.length < 4) {
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
            source: sourceName,

            /*
             * 列表旁注日期 = 公布日（主席令/公布日期），
             * 富化时优先于详情页扫描到的旧日期
             */
            publishDate: pubDate

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
   10.5 噪声标题识别（V6.8）
   ----------------------------------------------------------
   6.7 实机日志暴露的 4 类假阳性：
     · "85号主席令"                    —— 纯主席令（数字在前、无括号，旧正则漏网）
     · "行政法规" / "部门规章"          —— 站点栏目导航链接，不是法规
     · "5件法律草案公开征求意见"         —— 汇总型新闻，没有具体法名
     · "企业破产法修订草案二审：明确…"   —— 新闻句式，没有具体法名
   共同点：它们都不含书名号，也就解析不出法律名称，
   放进通知和看板只会占名额、显示成一截断句的怪东西。
========================================================== */

/*
 * 纯栏目导航名（整条标题完全等于这些词才命中，避免误伤正文里的词）
 */
const NAV_TITLES = {

    "行政法规": true,
    "部门规章": true,
    "司法解释": true,
    "国务院令": true,
    "法律": true,
    "法律草案": true,
    "征求意见": true,
    "公开征求意见": true,
    "立法动态": true,
    "立法计划": true,
    "立法工作计划": true,
    "政府信息公开": true,
    "地方性法规": true,
    "地方政府规章": true,
    "规范性文件": true,
    "规章": true,
    "法规": true,
    "政策解读": true,
    "最新政策": true,
    "政策文件": true,
    "法律法规": true,
    "法律法规库": true

};

function isNavTitle(title) {

    if (!title) {
        return false;
    }

    return NAV_TITLES[
        title.trim()
    ] === true;

}


/*
 * 纯主席令：标题里只有"主席令"、没有具体法律名称。
 * 主席令只是公布令，不是法律本身；
 * 权威发布页上同一天既有主席令又有对应法律链接，单列纯属噪声。
 * 注意：像"国家主席习近平签署主席令 公布《XX法》"这种带《法名》的
 *       是有效条目，必须保留。
 */
function isBareChairmanOrder(title) {

    if (!title) {
        return false;
    }

    if (title.indexOf("主席令") === -1) {
        return false;
    }

    return !/《[^》]+》/.test(title);

}


/*
 * 汇总型 / 新闻句式标题：不含书名号（解析不出法名），
 * 却长得像新闻稿或一揽子汇总。
 */
function isNewsOrAggregate(title) {

    if (!title) {
        return false;
    }

    const t =
        title.trim();

    /*
     * 一揽子汇总："5件法律草案公开征求意见"、"3部法规…"
     */
    if (/^\d+\s*[件部项条种]/.test(t)) {
        return true;
    }

    /*
     * 带书名号的都是有具体法名的，一律放行
     */
    if (/《[^》]+》/.test(t)) {
        return false;
    }

    /*
     * 无具体法名 + 以"公开征求意见"收尾："XXX公开征求意见"
     */
    if (/公开征求意见\s*$/.test(t)) {
        return true;
    }

    /*
     * 无具体法名 + 含冒号：新闻标题句式
     * "企业破产法修订草案二审：明确破产申请审查期间法院可临时中止…"
     */
    if (/[：:]/.test(t)) {
        return true;
    }

    /*
     * 无具体法名 + 长句 + 含虚词：新闻报道而非法规条目
     */
    if (
        t.length > 24 &&
        /[的了和与及将拟就]/.test(t)
    ) {
        return true;
    }

    return false;

}


/* ==========================================================
   11. 判断是否法律相关
========================================================== */

function isLawRelated(title) {

    if (!title) {

        return false;

    }


    /*
     * V6.8 硬否决：栏目导航 / 纯主席令 / 汇总型·新闻句式
     * 放在最前面，避免后面的关键词规则把它们放行进来
     */
    if (isNavTitle(title)) return false;
    if (isBareChairmanOrder(title)) return false;
    if (isNewsOrAggregate(title)) return false;


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

/*
 * 条目综合权重（V6.6）= 标题评分 + 两条结构性加权：
 *   1) 权威发布白名单（刚通过/公布的法律、修改·批准决定）+150
 *      —— 用户第一优先级，必须压过被"企业/公司/消费者"等重点词
 *         加权的征求意见草案（实测企业破产法草案能拿到 200，
 *         把 6 条刚通过的法律挤到单条通知之外）
 *   2) 有明确公布/通过/施行日期 +40
 *      —— 法律法规数据库里的旧法残留（预备役人员法 2010、
 *         修改部分法律的决定 2002）拿不到近期日期，自然沉底
 */
function itemScore(item) {

    if (!item) {
        return 0;
    }

    let score =
        getScore(item.title);

    if (isAuthoritativePublish(item)) {
        score += 150;
    }

    if (
        item.publishDate ||
        item.passDate ||
        item.effDate
    ) {
        score += 40;
    }

    return score;

}

function sortItems(items) {

    return items.sort(

        function(a, b) {

            return (
                itemScore(b) -
                itemScore(a)
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
 * 智能法律名称（6.5 加固，修复"名称识别错误"）：
 * 1. 决定类「关于修改/批准《X》的决定」→ 保留为「修改/批准《X》的决定」，
 *    不再被详情页正文里的《X》抢走（如"修改《律师法》的决定"误显为《律师法》）
 * 2. 标准书名号：原样返回《X》
 * 3. 纯文本法律名（中华人民共和国医疗保障法 / 农业法 …）自动补《》
 * 标题含"的决定"时，调用方在 enrichItem 里会禁止用详情页《法》覆盖本结果。
 */
function displayLawName(title) {

    if (!title) {
        return "";
    }

    const t =
        title.trim();

    let m =
        t.match(
            /(?:关于)?(修改|修订|批准|废止)(《[^》]+》)(?:的决定|决定)/
        );

    if (m) {
        return m[1] + m[2] + "的决定";
    }

    m =
        t.match(
            /《([^》]+)》/
        );

    if (m) {
        return "《" + m[1] + "》";
    }

    m =
        t.match(
            /^(中华人民共和国)?([\u4e00-\u9fa5]{2,40}?(?:法|法典|条例|办法|规定|规则|决定|解释))$/
        );

    if (m) {
        return "《" + t + "》";
    }

    /*
     * V6.6 兜底：含「的决定」但上面都未命中
     * （标题里夹了半角符号 / 数字等非中文字符时第 3 条正则会失败）
     */
    if (t.indexOf("的决定") !== -1) {
        return "《" + t + "》";
    }

    return "";

}


/*
 * 条目的展示名（V6.8）：富化出的法名优先，其次从标题派生，
 * 再不行才截断标题（截断补省略号，避免出现"执行程"这种断句）。
 * 看板只收录解析得出名称的条目 —— 连名字都没有的噪声条目
 * 在通知里就显示成一行光秃秃的日期，没有任何价值。
 */
function itemDisplayName(item) {

    if (!item) {
        return "";
    }

    const named =
        item.lawName ||
        displayLawName(item.title);

    if (named) {
        return named;
    }

    const t =
        (item.title || "").trim();

    if (!t) {
        return "";
    }

    return t.length > 40
        ? t.slice(0, 40) + "…"
        : t;

}


/*
 * 详情页正文里扫到的《X》必须先"长得像法名"才采信（V6.6）：
 * 政务页正文/导航里常出现《全国人民代表大会常务委员会公报》
 * 《人民日报》之类书名号，直接采信会把法名顶掉。
 */
function looksLikeLawName(name) {

    if (!name) {
        return false;
    }

    const inner =
        name
            .replace(/^《/, "")
            .replace(/》$/, "")
            .trim();

    if (inner.length < 3 || inner.length > 40) {
        return false;
    }

    if (
        /公报|网站|首页|声明|说明|通知|公告|日报|周报|杂志|期刊|简报|索引|目录|问答|解读|答记者问/.test(inner)
    ) {
        return false;
    }

    return /(法|法典|条例|办法|规定|规则|决定|解释|细则|条约|协定|公约)$/.test(inner);

}


/*
 * 权威发布源白名单（GR 意见 P0-2，V6.6）：
 * 只有「真实法律 / 修法决定 / 批准条约的决定 / 整部新法」进【立法信息】区。
 * 其它源里"《预备役人员法》2010-02-26""关于修改部分法律的决定 2002-12-28"
 * 这类法律法规数据库残留链接一律不进看板，
 * 看板计数回到用户要的「立法信息 6 · 征求意见 5」，而不是 75 条大杂烩。
 */
function isAuthoritativePublish(item) {

    if (!item) {
        return false;
    }

    if (
        (item.source || "").indexOf("权威发布") === -1
    ) {
        return false;
    }

    const t =
        (item.title || "").trim();

    if (!t) {
        return false;
    }

    if (t.indexOf("主席令") !== -1) {
        return false;
    }

    /*
     * 修改 / 修订 / 批准 / 废止《X》的决定
     */
    if (
        /(修改|修订|批准|废止|解释)\s*《[^》]+》\s*(?:的)?决定/.test(t)
    ) {
        return true;
    }

    /*
     * 整部新法：中华人民共和国医疗保障法 / 耕地保护和质量提升法 …
     */
    if (
        /^(中华人民共和国)?[\u4e00-\u9fa5]{2,30}(法|法典|条例|办法|规定|规则)$/.test(t)
    ) {
        return true;
    }

    return false;

}


/*
 * 日期可信度校验（6.5 加固，修复"日期穿越"）：
 * 详情页/全文里扫到的通过/施行日，若早于（当前年 - backYears）则视为
 * 误扫到旧法条文里的历史日期，丢弃。默认回看 3 年。
 */
function isRecentYmd(ymd, backYears) {

    if (
        !ymd ||
        !/^\d{4}-\d{2}-\d{2}$/.test(ymd)
    ) {
        return false;
    }

    const y =
        parseInt(
            ymd.slice(0, 4),
            10
        );

    const nowY =
        new Date().getFullYear();

    const back =
        backYears || 3;

    return y >= (nowY - back) && y <= (nowY + 2);

}


/*
 * 取征求意见/草案的结束（截止）日期，用于过期过滤与看板展示：
 * 优先用 flcaw 注入的 endDate，其次从标题「至 YYYY-MM-DD」提取，
 * 再次从 extractDeadline 的"意见截止："提取。
 */
function getConsultEndDate(item) {

    if (item && item.endDate) {
        return item.endDate;
    }

    const t =
        (item && item.title) || "";

    const m =
        t.match(
            /(20\d{2}-\d{2}-\d{2})\s*(?:至|—|-)\s*(20\d{2}-\d{2}-\d{2})/
        );

    if (m) {
        return m[2];
    }

    const d =
        extractDeadline(t);

    if (
        d &&
        d.indexOf("意见截止：") === 0
    ) {
        return d.slice("意见截止：".length);
    }

    return "";

}


/*
 * 是否过期（仅对征求意见 / 法律草案类判断）：
 * 结束日早于今日 → 过期，不推送、不进看板。
 */
function isExpiredConsult(item) {

    const c =
        getCategory(
            (item && item.title) || ""
        );

    if (
        c !== "征求意见" &&
        c !== "法律草案"
    ) {
        return false;
    }

    const end =
        getConsultEndDate(item);

    return !!end && end < todayYMD();

}


/*
 * 看板「正在征求意见」区的日期范围展示：
 * 优先 flcaw 注入的 startDate~endDate，否则从标题「X 至 Y」提取。
 */
function consultRange(item) {

    if (
        item &&
        item.startDate &&
        item.endDate
    ) {
        return item.startDate + " 至 " + item.endDate;
    }

    const t =
        (item && item.title) || "";

    const m =
        t.match(
            /(20\d{2}-\d{2}-\d{2})\s*(?:至|—|-)\s*(20\d{2}-\d{2}-\d{2})/
        );

    if (m) {
        return m[1] + " 至 " + m[2];
    }

    return "";

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

/*
 * 从政务网站 URL 反推发布日期（V6.8）。
 * 站点几乎都把日期编进路径，例如：
 *   /npc/c2/kgfb/202608/t20260828_457237.html  → 2026-08-28
 *   /moj/…/lfyjzj/202412/t20241230_512148.html → 2024-12-30
 *   /gov.cn/zhengce/2026-08/…                  → 2026-08-01
 * 用于把"页面还在、但征集早已结束"的僵尸条目筛掉
 * —— 这类条目标题里往往没有任何日期，靠 extractDeadline 是抓不到的。
 */
function extractDateFromUrl(url) {

    if (!url) {
        return "";
    }

    let m =
        url.match(/\/t(\d{8})/i);

    if (m) {
        return m[1].slice(0, 4) +
            "-" +
            m[1].slice(4, 6) +
            "-" +
            m[1].slice(6, 8);
    }

    m = url.match(
        /\/(\d{4})[-/]?(\d{2})\//
    );

    if (m) {
        return m[1] + "-" + m[2] + "-01";
    }

    return "";

}


/*
 * 陈旧条目：征求意见 / 法律草案类，其页面发布日期
 * 早于「今天 - CONFIG.staleConsultMonths 个月」。
 * 页面没被撤下不等于征集还在进行（司法部 2024-12 的征集页至今仍在线）。
 */
function isStaleItem(item) {

    if (!item) {
        return false;
    }

    const months =
        CONFIG.staleConsultMonths;

    if (!months || months <= 0) {
        return false;
    }

    const c =
        getCategory(
            (item && item.title) || ""
        );

    if (
        c !== "征求意见" &&
        c !== "法律草案"
    ) {
        return false;
    }

    const d =
        extractDateFromUrl(item.url);

    if (!d) {
        return false;
    }

    const limit =
        new Date();

    limit.setMonth(
        limit.getMonth() - months
    );

    const limitYmd =
        limit.getFullYear() +
        "-" +
        ("0" + (limit.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + limit.getDate()).slice(-2);

    return d < limitYmd;

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

    if (m) {
        const d = validDate(m[1], m[2], m[3]);
        return isRecentYmd(d) ? d : "";
    }

    m =
        text.match(
            /通过[于在]?(20\d{2})[-年./](\d{1,2})[-月./](\d{1,2})[日]?/
        );

    if (m) {
        const d = validDate(m[1], m[2], m[3]);
        return isRecentYmd(d) ? d : "";
    }

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

    if (m) {
        const d = validDate(m[1], m[2], m[3]);
        return isRecentYmd(d) ? d : "";
    }

    m =
        text.match(
            /施行[日期]?(?:为)?(20\d{2})[-年./](\d{1,2})[-月./](\d{1,2})[日]?/
        );

    if (m) {
        const d = validDate(m[1], m[2], m[3]);
        return isRecentYmd(d) ? d : "";
    }

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

    /*
     * V6.6：flcaw 接口已自带《法名》+ 起止日，
     * 其 userIndex.html?lid=… 是 JS 渲染壳，抓了也只拿到空壳，
     * 标记 preEnriched 直接跳过，省一次请求也避免噪声。
     */
    if (item.preEnriched) {
        return item;
    }

    /*
     * 标记已富化，供看板补富化（enrichBoardItems）去重
     */
    item.enriched = true;

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

        /*
         * 名称优先用"列表标题派生名" displayLawName：
         * - 决定类（修改/批准《X》的决定）：禁止用详情页正文里的《X》覆盖，
         *   否则"修改《律师法》的决定"会被富化成《律师法》
         * - 纯文本法律名（医疗保障法）：自动补《》
         * - 其它（含《》的草案/法规）：displayLawName 也会正确返回
         */
        const listName =
            displayLawName(
                item.title
            );

        /*
         * V6.6 定名规则（一句话）：
         *   列表标题已经派出法名 → 就用它，绝不让详情页正文的《X》抢走
         *   （"修改《律师法》的决定" 被富化成 《律师法》 就是这么来的）；
         *   列表标题派不出法名（如光秃秃的"主席令（第八十号）"）→
         *   才去详情页找，且必须通过"长得像法名"校验。
         */
        let lawName;

        if (listName) {

            lawName = listName;

        } else {

            const detailName =
                extractLawName(text);

            lawName =
                (
                    looksLikeLawName(detailName)
                        ? detailName
                        : ""
                ) ||
                extractLawName(item.title);

        }

        /*
         * 公布日：优先用权威发布页"列表旁注日期"（item.publishDate），
         * 杜绝详情页"日期穿越"（预备役法页残留 2010、修改部分法律决定残留 2002）。
         * 详情页扫到的通过/施行日再经 isRecentYmd 兜底校验。
         */
        let passDate =
            item.publishDate ||
            extractPassDate(text);

        /*
         * V6.6：不可信日期一律清空。
         * 旧写法 `passDate = item.publishDate || ""` 在 publishDate 本身就是
         * 穿越日期时会把自己原样写回，等于没过滤。
         */
        if (
            passDate &&
            !isRecentYmd(passDate)
        ) {
            passDate = "";
        }

        let effDate =
            extractEffectiveDate(text);

        if (
            effDate &&
            !isRecentYmd(effDate)
        ) {
            effDate = "";
        }

        const deadline =
            extractDeadline(text) ||
            extractDeadline(item.title);

        if (
            lawName ||
            passDate ||
            effDate ||
            deadline
        ) {

            /*
             * V6.6：只补非空值。
             * 旧写法会执行 item.lawName = "" —— 详情页补到日期却补不到法名时，
             * 把列表里已有的法名清成空，通知只剩干瘪的列表标题
             * （实测："中华人民共和国主席令（第八十号）"整条出现在看板里）。
             */
            if (lawName) item.lawName = lawName;
            if (passDate) item.passDate = passDate;
            if (effDate) item.effDate = effDate;
            if (deadline) item.deadline = deadline;

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


/*
 * 看板补富化（V6.6）：
 * 常规运行 0 新增时 newItems 为空 → enrichItems 不跑 →
 * 看板「立法信息」只有法名、没有"公布日 / 施行日"。
 * 这里对看板立法区前 N 条、且本轮没富化过的条目补抓一次详情页。
 * 已富化的新增条目（item.enriched）/ flcaw 条目（preEnriched）自动跳过。
 */
async function enrichBoardItems(board) {

    if (!CONFIG.enrichDetail) return;

    const top =
        CONFIG.enrichBoardTop || 0;

    if (top <= 0) return;

    /*
     * 立法区优先，其次征求意见区（截止日常常只写在详情页正文里）
     */
    const consultTop =
        Math.max(
            3,
            Math.ceil(top / 2)
        );

    const targets = [];

    function pick(list, cap) {

        let n = 0;

        for (
            let i = 0;
            i < list.length &&
            n < cap;
            i++
        ) {

            const it = list[i];

            if (it.enriched || it.preEnriched) {
                continue;
            }

            targets.push(it);
            n++;

        }

    }

    pick(
        (board && board.published) || [],
        top
    );

    pick(
        (board && board.consulting) || [],
        consultTop
    );

    if (targets.length === 0) return;

    console.log(
        "看板补富化: " +
        targets.length +
        " 条"
    );

    await enrichItems(targets);

}


/*
 * 看板富化之后再剔一次过期征集（V6.8）：
 * 入库前的过期过滤发生在富化之前，那时还不知道截止日；
 * 富化从详情页正文里拿到「意见截止：YYYY-MM-DD」后，
 * 才能确认这一条其实早就结束了。
 */
function pruneExpiredConsulting(board) {

    if (!board || !board.consulting) {
        return board;
    }

    const before =
        board.consulting.length;

    board.consulting =
        board.consulting.filter(
            function(it) {
                return !isExpiredConsult(it);
            }
        );

    const dropped =
        before - board.consulting.length;

    if (dropped > 0) {

        console.log(
            "  富化后剔除已过期征集: " +
            dropped +
            " 条"
        );

    }

    return board;

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

/* ==========================================================
   19.0.5 NPC Observer 配对表（V6.9）
   ----------------------------------------------------------
   站点索引页的条目长这样（两种写法都见过）：
     <a href="…/legislation/enterprise-bankruptcy-law/">
       <em>Enterprise Bankruptcy Law</em></a> [企业破产法]
     <em><a href="…/legislation/lawyers-law/">Lawyers Law</a></em> [律师法]
   即「英文条目链接 + 紧随其后的方括号中文名」成对出现，
   据此可直接建立映射，不需要搜索接口。
========================================================== */

async function fetchNpcObserverMap() {

    const map = {};

    const urls =
        CONFIG.npcObserverUrls || [];

    const pairRe =
        /href="(https:\/\/npcobserver\.com\/legislation\/[a-z0-9-]+\/)"[^>]*>(?:<[^>]*>)*\s*([^<]*?)\s*(?:<[^>]*>)*\s*\[([^\]]+)\]/g;

    for (
        let i = 0;
        i < urls.length;
        i++
    ) {

        try {

            const html =
                await httpGet(
                    urls[i],
                    CONFIG.npcObserverTimeout
                );

            if (!html) {
                continue;
            }

            let m;

            /*
             * 正则带 g 标志且跨多次调用复用，必须先归零 lastIndex，
             * 否则第二次调用会从上次的结束位置接着扫，直接漏匹配
             */
            pairRe.lastIndex = 0;

            while (
                (m = pairRe.exec(html)) !== null
            ) {

                const url = m[1];

                const zh =
                    (m[3] || "").trim();

                /*
                 * 脏数据过滤：
                 * - 中文名必须是 2~30 个纯汉字
                 *   （页面上混着 sizes=auto 之类的图片属性，会被同一正则误抓）
                 * - 排除 feed/ 等非条目页
                 */
                if (
                    !/^[\u4e00-\u9fa5]{2,30}$/.test(zh)
                ) {
                    continue;
                }

                if (
                    url.indexOf("/feed/") !== -1
                ) {
                    continue;
                }

                map[zh] = url;

            }

        } catch (e) {

            console.log(
                "  NPC Observer 抓取失败: " +
                urls[i] + " (" + e + ")"
            );

        }

    }

    return map;

}


/*
 * 法名归一：《企业破产法（修订草案二次审议稿）》→ 企业破产法
 * 括号里是审议阶段（二次审议稿/草案/修订草案…），配对表里没有，要去掉。
 */
function npcObserverBaseName(name) {

    if (!name) {
        return "";
    }

    let s =
        name.trim();

    s = s
        .replace(/^《/, "")
        .replace(/》$/, "");

    /*
     * 截断到第一个左括号。
     * 注意别写成 /[（(][^）)]*$/ —— 那个右括号只出现在"排除型"字符类里，
     * 模式里没有字面右括号，要求左括号后到结尾全是"非括号字符"，
     * 而结尾那个 "）" 恰好被排除，结果是永远匹配不上（水法/道交法都漏过）。
     */
    s = s.replace(/[（(].*$/, "");

    s = s.replace(/征求意见\s*$/, "");

    return s.trim();

}


/*
 * 在配对表里找该条目对应的 NPC Observer 页面。
 * 匹配顺序：精确 → 去「中华人民共和国」前缀后精确 → 前缀匹配。
 * 前缀匹配限定键长 ≥4，避免"水法"这类短名误配到"水污染防治法"。
 */
function findNpcObserverUrl(item) {

    if (!item || !NPCO_MAP) {
        return "";
    }

    const keys =
        Object.keys(NPCO_MAP);

    if (keys.length === 0) {
        return "";
    }

    const base =
        npcObserverBaseName(
            itemDisplayName(item)
        );

    if (!base) {
        return "";
    }

    const cands =
        [base];

    const short =
        base.replace(
            /^中华人民共和国/,
            ""
        );

    if (short && short !== base) {
        cands.push(short);
    }

    /*
     * 精确匹配
     */
    for (
        let i = 0;
        i < cands.length;
        i++
    ) {
        if (NPCO_MAP[cands[i]]) {
            return NPCO_MAP[cands[i]];
        }
    }

    /*
     * 前缀匹配
     */
    for (
        let i = 0;
        i < cands.length;
        i++
    ) {
        for (
            let k = 0;
            k < keys.length;
            k++
        ) {
            const key = keys[k];

            if (
                key.length >= 4 &&
                cands[i].indexOf(key) === 0
            ) {
                return NPCO_MAP[key];
            }
        }
    }

    return "";

}


/*
 * 全国人大草案正文 PDF（Cnpc）：
 * 从 flcaw 条目的 lid 直接拼出附件地址，零额外请求。
 * 只有 flcaw 接口来的草案才有 lid（司法部等其它源的征求意见没有）。
 */
function flcawAttachmentUrl(item) {

    if (!CONFIG.flcawAttachmentLink) {
        return "";
    }

    if (!item || !item.flcawLid) {
        return "";
    }

    return (
        CONFIG.flcawAttachmentUrlTemplate ||
        ""
    ).replace(
        "{lid}",
        item.flcawLid
    );

}


/*
 * 可选：HEAD 校验 PDF 是否真的存在。
 * 只取响应头、不下载正文（草案 PDF 常 500KB 以上）。
 * Loon 不支持 $httpClient.head 时一律按"存在"处理，绝不误删链接。
 */
async function verifyAttachmentUrl(url) {

    if (!CONFIG.flcawAttachmentVerify) {
        return true;
    }

    if (
        !url ||
        typeof $httpClient.head !== "function"
    ) {
        return true;
    }

    try {

        return await new Promise(
            function(resolve) {

                $httpClient.head(

                    {
                        url: url,
                        timeout:
                            CONFIG.flcawAttachmentTimeout
                    },

                    function(error, response) {

                        if (error || !response) {
                            resolve(false);
                            return;
                        }

                        const type =
                            (
                                response.headers &&
                                (
                                    response.headers["Content-Type"] ||
                                    response.headers["content-type"]
                                )
                            ) || "";

                        resolve(
                            response.status === 200 &&
                            /pdf/i.test(type)
                        );

                    }

                );

            }
        );

    } catch (e) {

        return true;

    }

}


/*
 * 立法信息区排序：公布日倒序（新的在前），同日按评分
 */
function boardPublishSorter(a, b) {

    const da =
        a.publishDate ||
        a.passDate ||
        "";

    const db =
        b.publishDate ||
        b.passDate ||
        "";

    if (da !== db) {
        return db.localeCompare(da);
    }

    return getScore(b.title) - getScore(a.title);

}


/*
 * 状态看板（V6.6 白名单化）：
 * 返回 { published, consulting } 两区，各自已排好序并截断到上限。
 *
 *   published —— ① 权威发布源白名单（整部新法 / 修改·批准《X》的决定）
 *                ② 其它源的行政法规 / 国务院令 / 司法解释 / 部门规章
 *                「新法/法规」里的法律法规数据库残留链接（预备役人员法 2010、
 *                修改部分法律的决定 2002 之类）不再计入，
 *                立法动态 / 立法审议等新闻类噪声一律不进。
 *   consulting —— 征求意见 / 法律草案（已过期的在 main 里已剔除），
 *                 有明确截止日的排前面、按截止日升序（最紧急在前）。
 */
function buildStatusBoard(items) {

    const published = [];
    const secondary = [];
    const consulting = [];

    const SECONDARY = {

        "法律公布": true,
        "行政法规": true,
        "国务院令": true,
        "司法解释": true,
        "部门规章": true

    };

    (items || []).forEach(function(it) {

        /*
         * V6.8：解析不出名称的条目一律不进看板。
         * 没有法名的条目在通知里就是一行孤零零的日期，
         * 既看不出是什么、又占掉一个名额。
         */
        if (!itemDisplayName(it)) {
            return;
        }

        const c =
            getCategory(it.title);

        if (
            c === "征求意见" ||
            c === "法律草案"
        ) {

            consulting.push(it);
            return;

        }

        if (isAuthoritativePublish(it)) {

            published.push(it);
            return;

        }

        if (SECONDARY[c]) {

            secondary.push(it);

        }

    });

    published.sort(boardPublishSorter);
    secondary.sort(boardPublishSorter);

    /*
     * 征求意见：有明确截止日的（flcaw 接口草案）优先，
     * 截止日近的排前面；没有截止日的按评分排后面。
     */

    const withEnd = [];
    const noEnd = [];

    consulting.forEach(function(it) {

        if (getConsultEndDate(it)) {
            withEnd.push(it);
        } else {
            noEnd.push(it);
        }

    });

    withEnd.sort(function(a, b) {

        return (
            getConsultEndDate(a) ||
            ""
        ).localeCompare(
            getConsultEndDate(b) || ""
        );

    });

    noEnd.sort(function(a, b) {

        return getScore(b.title) - getScore(a.title);

    });

    return {

        published:
            (
                CONFIG.boardIncludeSecondary
                    ? published.concat(secondary)
                    : published
            ).slice(0, CONFIG.boardPublishedMax),

        consulting:
            withEnd
                .concat(noEnd)
                .slice(0, CONFIG.boardConsultMax)

    };

}


/*
 * 汇总通知正文（两区，参照用户目标形态）：
 *   【立法信息】     —— 法名 + 公布日 + 施行日
 *   【正在征求意见】 —— 法名 + 起止区间（无区间则显示意见截止日）
 */
function buildSummaryBody(board) {

    let b =
        board || {
            published: [],
            consulting: []
        };

    /*
     * 兼容：直接传条目数组时（旧调用方式 / 单测），按分类临时拆成两区
     */
    if (Array.isArray(b)) {

        const pub = [];
        const con = [];

        b.forEach(function(it) {

            const c =
                getCategory(it.title);

            if (
                c === "征求意见" ||
                c === "法律草案"
            ) {
                con.push(it);
            } else {
                pub.push(it);
            }

        });

        b = {
            published: pub,
            consulting: con
        };

    }

    const published =
        b.published || [];

    const consulting =
        b.consulting || [];

    const lines = [];

    if (published.length > 0) {

        lines.push("【立法信息】");

        published.forEach(function(it) {

            /*
             * V6.8：统一走 itemDisplayName（法名优先 → 标题派生 → 截断补省略号）
             */
            const name =
                itemDisplayName(it);

            const parts = [];

            const pub =
                it.passDate ||
                it.publishDate ||
                "";

            if (pub) parts.push(pub + "公布");
            if (it.effDate) parts.push(it.effDate + "施行");

            let line =
                "• " + name;

            if (parts.length) {
                line += "  " + parts.join("  ");
            }

            lines.push(line);

        });

        lines.push("");

    }

    if (consulting.length > 0) {

        lines.push("【正在征求意见】");

        consulting.forEach(function(it) {

            const name =
                itemDisplayName(it);

            const range =
                consultRange(it);

            let line =
                "• " + name;

            if (range) {

                line += "  " + range;

            } else if (it.deadline) {

                /*
                 * V6.6 兜底：非 flcaw 源（司法部/中国政府网）的征求意见
                 * 没有起止区间，只解析出"意见截止：YYYY-MM-DD"，
                 * 也要显示出来，否则看板里这一行没有任何时间信息
                 */
                line += "  " + it.deadline;

            }

            lines.push(line);

            /*
             * V6.10：两条补充链接各起一行附在下面
             *   Onpc —— NPC Observer 英文条目页（摘要 + 立法时间线）
             *   Cnpc —— 全国人大草案正文 PDF
             */
            const onpc =
                findNpcObserverUrl(it);

            if (onpc) {
                lines.push("    Onpc：" + onpc);
            }

            if (it.attachmentUrl) {
                lines.push("    Cnpc：" + it.attachmentUrl);
            }

        });

    }

    return lines.join("\n").trim();

}


/*
 * 状态看板通知标题：两区计数，一眼看清
 * "📋 状态看板 · 立法信息 N · 征求意见 M"
 */
function boardTitle(board) {

    const b =
        board || {
            published: [],
            consulting: []
        };

    return "📋 状态看板 · 立法信息 " +
        (b.published || []).length +
        " · 征求意见 " +
        (b.consulting || []).length;

}


/*
 * 汇总通知点击打开的真实 URL：
 * 有正在征集的草案 → flcaw 草案征集页（或该草案原文）；
 * 否则 → 立法信息第一条的原文；再否则 → 权威发布页。
 * 绝不传 data:/空 URL（否则点击回退成运行日志）。
 */
function summaryOpenUrl(board) {

    const b =
        board || {
            published: [],
            consulting: []
        };

    const consulting =
        b.consulting || [];

    if (consulting.length > 0) {

        const first =
            consulting[0];

        /*
         * 司法部 / 中国政府网的征求意见不在 flcaw 页上，
         * 直接打开该条原文更准确
         */
        if (
            first &&
            /^https?:\/\//i.test(first.url || "") &&
            first.url.indexOf("flcaw") === -1
        ) {

            return first.url;

        }

        return "http://www.npc.gov.cn/flcaw/";

    }

    const top =
        (b.published || [])[0];

    if (
        top &&
        /^https?:\/\//i.test(top.url || "")
    ) {

        return top.url;

    }

    return "http://www.npc.gov.cn/npc/c2/c12435/";

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
                itemDisplayName(it);

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
            "<h2>⚖️ 中国法律监控 V6.10 · 本次新增 " + items.length + " 条</h2>" +
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
 * 本轮已推送通知计数（仅用于日志编号）
 */
let NOTIFY_SEQ = 0;


/*
 * 统一出口：发通知 + 同步打印一份到运行日志。
 * Loon 的 $notification.post 只在通知中心留痕，
 * 通知中心里的正文不好复制、也没法一次看全，
 * 这里把「标题 / 正文 / 点击打开的 URL」原样打进 console，
 * 打开运行日志即可完整回看本轮推送。
 */
function emitNotification(title, subtitle, body, openUrl) {

    /*
     * 真正发通知的唯一入口（本函数体内必须保持原样调用，
     * 不可再走 emitNotification，否则无限递归）
     */
    $notification.post(
        title,
        subtitle,
        body,
        openUrl
    );

    if (!CONFIG.logNotificationCopy) return;

    NOTIFY_SEQ++;

    console.log(
        "──────── 推送通知 [" + NOTIFY_SEQ + "] ────────"
    );

    console.log("标题: " + (title || ""));

    if (subtitle) {
        console.log("副标题: " + subtitle);
    }

    if (body) {
        console.log("正文:\n" + body);
    }

    if (
        openUrl &&
        /^https?:\/\//i.test(openUrl)
    ) {
        console.log("打开链接: " + openUrl);
    }

}


/*
 * 看板条目 → 原文链接清单（打进日志）。
 * 通知正文是纯文本，一条通知只能挂一个 URL，
 * 逐条原文地址放这里，便于一次复制/查看。
 */
function logBoardItemLinks(board) {

    if (!CONFIG.logBoardItemLinks) return;

    const b =
        board || {
            published: [],
            consulting: []
        };

    const lines = [];

    (b.published || []).forEach(function(it, i) {

        lines.push(
            "  立法" + (i + 1) + ". " +
            itemDisplayName(it) +
            "\n     " + safeOpenUrl(it)
        );

    });

    (b.consulting || []).forEach(function(it, i) {

        let line =
            "  征求" + (i + 1) + ". " +
            itemDisplayName(it) +
            "\n     " + safeOpenUrl(it);

        const onpc =
            findNpcObserverUrl(it);

        if (onpc) {
            line += "\n     Onpc: " + onpc;
        }

        if (it.attachmentUrl) {
            line += "\n     Cnpc: " + it.attachmentUrl;
        }

        lines.push(line);

    });

    if (lines.length > 0) {

        console.log(
            "──────── 看板条目原文链接 ────────\n" +
            lines.join("\n")
        );

    }

}


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


    let category =
        getCategory(
            item.title
        );


    /*
     * V6.6：权威发布白名单（刚通过/公布的法律与决定）
     * 标成「📜 法律公布」，比笼统的「新法/法规」更贴切，
     * 同时自动命中下方的加星规则（⭐ 标记）
     */
    if (
        isAuthoritativePublish(item)
    ) {
        category = "法律公布";
    }


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
        displayLawName(
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
    if (passDate) parts.push("公布:" + passDate);
    if (effDate) parts.push("施行:" + effDate);
    if (deadline && !passDate) parts.push(deadline);

    /*
     * V6.10：征求意见类可选附 Onpc / Cnpc 两个补充链接。
     * 默认关（CONFIG.extraLinksInSingleNotify=false），
     * 因为 iOS 通知正文里的链接不可点击，附上只会让正文变长；
     * 看板正文与运行日志里始终会附。
     */
    let extraLinks = "";

    if (
        CONFIG.extraLinksInSingleNotify &&
        (
            category === "征求意见" ||
            category === "法律草案"
        )
    ) {

        const onpc =
            findNpcObserverUrl(item);

        if (onpc) {
            extraLinks += "\nOnpc：" + onpc;
        }

        if (item.attachmentUrl) {
            extraLinks += "\nCnpc：" + item.attachmentUrl;
        }

    }

    let body;

    if (parts.length > 0) {

        body =
            parts.join("  ") +
            "  点击进入原文";

        if (extraLinks) {
            body += extraLinks;
        }

    } else {

        body = item.title || "";

        if (body.length > 100) {

            body = body.slice(0, 100) + "...";

        }

        body += "  点击进入原文";

    }


    emitNotification(

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
        "中国法律监控 V6.10 开始"
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
                     * 避免 extractLawName 正则提取失败导致通知只剩日期。
                     *
                     * V6.8：接口返回的草案名末尾常自带"征求意见"
                     * （如"企业破产法（修订草案二次审议稿）征求意见"），
                     * 标题后面还要再拼" 征求意见"，会重复，这里先去掉。
                     */
                    const cleanName =
                        "《" +
                        name.replace(
                            /征求意见\s*$/,
                            ""
                        ) +
                        "》";

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
                        lawName: cleanName,

                        /*
                         * V6.10：留下 lid，供拼接草案正文 PDF（Cnpc）用
                         */
                        flcawLid: flxxId,

                        /*
                         * 注入起止日，供状态看板"正在征求意见"区直接展示窗口，
                         * 无需再富化详情页
                         */
                        startDate: ksrq,
                        endDate: jsrq,

                        /*
                         * V6.6：接口数据已完整（法名 + 起止日），
                         * 标记后 enrichItem 直接跳过，不再白抓 JS 渲染壳
                         */
                        preEnriched: true

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
         * 权威发布页专属解析：提取「<a>法名</a>YYYY-MM-DD」同行日期作为公布日，
         * 直接写入 item.publishDate，富化时优先于详情页扫描到的旧日期，
         * 彻底杜绝"日期穿越"（预备役法残留 2010、修改部分法律决定残留 2002）
         */
        if (
            source.url.indexOf("c12435") !== -1
        ) {

            links =
                parseAuthorityLinks(
                    html,
                    source.name,
                    usedUrl
                );

            console.log(
                source.name +
                " (权威发布专属解析) 获取链接: " +
                links.length
            );

            /*
             * V6.6 兜底：专属解析要求「</a> 后有日期」，
             * 若站点把日期改成其它结构（或整页无日期）会解析成 0 条，
             * 整源丢失。0 条时退回通用 parseLinks，宁可少一个日期
             * 也不能丢掉 6 条刚通过的法律。
             */
            if (links.length === 0) {

                links =
                    parseLinks(
                        html,
                        source.name,
                        usedUrl
                    );

                console.log(
                    source.name +
                    " (专属解析 0 条，回退通用解析) 获取链接: " +
                    links.length
                );

            }

        }


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

            const linkTitle =
                links[j].title;

            /*
             * 6.5：剔除纯"主席令（第X号）"链接。
             * 权威发布页同一天既列主席令（80–85号）又列对应法律/决定链接，
             * 主席令本身只是公布令、且与法律链接重复，单列会噪声化通知与看板。
             * 保留的是 6 条真实法律/决定（医疗保障法、耕地保护…、修改律师法决定等）。
             */
            /*
             * V6.6：兼容半角括号「主席令(第八十号)」
             */
            if (
                /主席令\s*[（(][^）)]*[）)]/.test(linkTitle) ||
                /^中华人民共和国主席令/.test(linkTitle)
            ) {
                continue;
            }

            if (
                isLawRelated(
                    linkTitle
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


    /*
     * 6.5：全局过期征求意见过滤（不限 flcaw 源）。
     * 非 flcaw 源（司法部/立法动态等）也可能抓到"意见截止 2026-07-25"
     * 这类已过期条目，统一在此剔除，避免混入单条通知与状态看板。
     */
    const beforeExpire =
        allItems.length;

    allItems =
        allItems.filter(
            function(it) {
                return !isExpiredConsult(it);
            }
        );

    if (
        beforeExpire !== allItems.length
    ) {
        console.log(
            "  已过滤过期征求意见: " +
            (beforeExpire - allItems.length) +
            " 条"
        );
    }


    /*
     * V6.8：陈旧条目过滤（按 URL 里的发布日期）。
     * 政务网很少撤页面，2024 年的征集页至今仍在，
     * 标题里又往往没有截止日期，只能靠 URL 日期判陈旧。
     */
    const beforeStale =
        allItems.length;

    allItems =
        allItems.filter(
            function(it) {
                return !isStaleItem(it);
            }
        );

    if (
        beforeStale !== allItems.length
    ) {
        console.log(
            "  已过滤陈旧条目(URL日期早于" +
            CONFIG.staleConsultMonths +
            "个月前): " +
            (beforeStale - allItems.length) +
            " 条"
        );
    }


    console.log(
        "======================================"
    );

    console.log(
        "法律相关总数: " +
        allItems.length
    );


    /*
     * ======================================================
     * NPC Observer 配对表（V6.9）
     * ------------------------------------------------------
     * 只在确有「正在征求意见」条目时才去抓，省一次境外请求。
     * 抓不到就是空表，看板照常输出，只是没有补充链接。
     * ======================================================
     */

    NPCO_MAP = {};

    const hasConsult =
        allItems.some(function(it) {

            const c =
                getCategory(it.title);

            return c === "征求意见" ||
                c === "法律草案";

        });

    if (
        CONFIG.npcObserverEnabled &&
        hasConsult
    ) {

        NPCO_MAP =
            await fetchNpcObserverMap();

        console.log(
            "NPC Observer 配对数: " +
            Object.keys(NPCO_MAP).length
        );

    }


    /*
     * ======================================================
     * 草案正文 PDF（Cnpc，V6.10）
     * ------------------------------------------------------
     * 直接由 lid 拼出，默认零请求。
     * 打开 flcawAttachmentVerify 时才逐条 HEAD 校验，
     * 校验失败的条目不附链接（避免出现失效地址）。
     * ======================================================
     */

    if (CONFIG.flcawAttachmentLink) {

        let ok = 0;
        let bad = 0;

        for (
            let i = 0;
            i < allItems.length;
            i++
        ) {

            const it =
                allItems[i];

            const url =
                flcawAttachmentUrl(it);

            if (!url) {
                continue;
            }

            if (
                !(await verifyAttachmentUrl(url))
            ) {

                console.log(
                    "  草案 PDF 不可达，跳过: " +
                    url
                );

                bad++;
                continue;

            }

            it.attachmentUrl = url;
            ok++;

        }

        if (ok > 0 || bad > 0) {

            console.log(
                "草案正文 PDF(Cnpc) 附上: " +
                ok +
                " 条" +
                (bad > 0 ? "，失效 " + bad + " 条" : "")
            );

        }

    }


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

            emitNotification(

                "⚠️ 中国法律监控 V6.10",

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
             * V6.6：先按 itemScore 重排（权威发布白名单 +150、
             * 有日期 +40），再富化前 N 条，富化完再排一次
             * —— 保证"刚通过的法律"稳进首跑 Top-N，
             *   而不是被重点词加权的草案挤掉。
             */
            allItems.sort(function(a, b) {
                return itemScore(b) - itemScore(a);
            });

            /*
             * 富化前 N 条（高优先级，含新法/公布类），
             * 让首跑通知与汇总能展示《法律名称》+ 通过/施行日。
             */
            await enrichItems(
                allItems.slice(
                    0,
                    firstRunCount
                )
            );

            allItems.sort(function(a, b) {
                return itemScore(b) - itemScore(a);
            });


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

            /*
             * V6.6：看板立法区补富化，补足"公布日 + 施行日"
             * （首跑只富化了前 N 条单条通知，看板条目可能不在其中）
             */
            await enrichBoardItems(
                frBoard
            );

            pruneExpiredConsulting(
                frBoard
            );

            const frSumBody =
                buildSummaryBody(
                    frBoard
                );

            const frOpen =
                summaryOpenUrl(
                    frBoard
                );

            emitNotification(

                boardTitle(frBoard) + " · 首跑",

                "点击打开官方页面 · 正文为完整清单",

                frSumBody,

                frOpen

            );

            /*
             * 看板条目原文链接清单跟在本条看板通知之后，
             * 日志读起来是「通知全文 → 逐条原文地址」
             */
            logBoardItemLinks(frBoard);

        } else {

            emitNotification(

                "中国法律监控 V6.10",

                "首次运行完成，已记录 " +
                initialHistory.length +
                " 条法律信息",

                ""

            );

        }


        console.log(
            "本轮共推送 " +
            NOTIFY_SEQ +
            " 条通知（含状态看板）"
        );

        /*
         * 首跑也提示部分异常（网络失败 / 全部 0 链接），
         * 全失败的情形已在上方提前 return，不会重复弹窗
         */

        emitHealthAlerts();


        if (!saved) {

            emitNotification(

                "⚠️ 中国法律监控 V6.10",

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

        emitNotification(

            "⚠️ 中国法律监控 V6.10",

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
     * V6.6：富化后再排一次序。
     * 富化补到"公布/通过/施行"日期的条目加权上浮，
     * 拿不到近期日期的法律法规数据库残留自然沉底，
     * 不会再挤占有限的单条通知名额。
     */
    newItems.sort(function(a, b) {
        return itemScore(b) - itemScore(a);
    });


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

            /*
             * V6.6：0 新增时不跑 enrichItems，
             * 这里补一次，让看板稳定带"公布日 + 施行日"
             */
            await enrichBoardItems(
                board
            );

            pruneExpiredConsulting(
                board
            );

            const sumBody =
                buildSummaryBody(
                    board
                );

            const openUrl =
                summaryOpenUrl(
                    board
                );

            emitNotification(

                boardTitle(board) + "（较上次无新增）",

                "点击打开官方页面 · 正文为当前关注清单",

                sumBody,

                openUrl

            );

            logBoardItemLinks(board);

            console.log(
                "已发送状态看板通知（立法 " +
                board.published.length +
                " 条 / 征求意见 " +
                board.consulting.length +
                " 条）"
            );

        }

        console.log(
            "本轮共推送 " +
            NOTIFY_SEQ +
            " 条通知（含状态看板）"
        );

        console.log(
            "中国法律监控 V6.10 完成"
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

    await enrichBoardItems(
        board
    );

    pruneExpiredConsulting(
        board
    );

    const sumBody =
        buildSummaryBody(
            board
        );

    const openUrl =
        summaryOpenUrl(
            board
        );

    emitNotification(

        boardTitle(board) + "（本次新增 " +
        newItems.length +
        " 条）",

        "点击打开官方页面 · 正文为当前关注清单",

        sumBody,

        openUrl

    );

    logBoardItemLinks(board);


    console.log(
        "本轮共推送 " +
        NOTIFY_SEQ +
        " 条通知（含状态看板）"
    );

    console.log(
        "中国法律监控 V6.10 完成"
    );


    $done();

}


/* ==========================================================
   21. 启动
========================================================== */

main();
