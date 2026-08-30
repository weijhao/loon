/*
 * flcaw 诊断脚本（一次性，不写历史库）
 * 目的：把 Loon 实际收到的 flcaw 原始响应打进日志，
 *        以便定位草案列表的真实数据结构 / 数据接口。
 * 用法：在 Loon 里单独运行本脚本，把 console 输出整段贴回。
 * 跑完即可删除，不影响 china-law-monitor-v6.js。
 */
const TARGETS = [
    "http://www.npc.gov.cn/flcaw/",
    "https://www.npc.gov.cn/flcaw/"
];

function probe(url, idx) {
    $httpClient.get(
        { url: url, timeout: 25000 },
        function(err, resp, body) {
            console.log("\n========== 目标 " + idx + " : " + url + " ==========");
            if (err) {
                console.log("请求错误: " + (err.error || err));
                console.log("HTTP状态: " + (resp && resp.status));
                console.log("最终URL: " + (resp && resp.headers && (resp.headers.location || "")));
                maybeDone();
                return;
            }
            const status = resp && resp.status;
            const html = body || "";
            console.log("HTTP状态: " + status);
            console.log("响应长度: " + html.length + " 字节");
            console.log("---- 关键标记 ----");
            console.log("含 <a : " + (html.indexOf("<a ") !== -1));
            console.log("含 草案 : " + (html.indexOf("草案") !== -1));
            console.log("含 征求意见 : " + (html.indexOf("征求意见") !== -1));
            console.log("含 <script : " + (html.indexOf("<script") !== -1));
            console.log("含 lid= : " + (html.indexOf("lid=") !== -1));
            console.log("含 fetch( : " + (html.indexOf("fetch(") !== -1));
            console.log("含 ajax : " + (html.indexOf("ajax") !== -1));
            console.log("含 JSON/数据接口线索(application/json / .json / api/): " +
                (html.indexOf("application/json") !== -1 || html.indexOf(".json") !== -1 || html.indexOf("api/") !== -1));
            console.log("---- 原始响应全文（供人工分析）----");
            console.log(html);
            maybeDone();
        }
    );
}

let pending = TARGETS.length;
function maybeDone() {
    pending -= 1;
    if (pending <= 0) {
        console.log("\n========== flcaw 诊断结束 ==========");
        $done();
    }
}

for (let i = 0; i < TARGETS.length; i++) {
    probe(TARGETS[i], i);
}
