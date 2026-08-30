/*
 * 中国法律监控 · 历史库清空工具（一次性）
 * 用途：清空后下一次运行「china-law-monitor-v6.js」
 *       会重新触发首跑，把当前列表里的法律/草案一次性推给你。
 * 用法：在 Loon 新建一个 Script，粘贴本文件，手动运行一次，
 *       看到「历史库已清空」通知后删除本脚本，再跑监控脚本即可。
 */
const KEY = "china_law_monitor_v6_1_history";

$persistentStore.write("", KEY);

$notification.post(
    "中国法律监控",
    "历史库已清空，下次运行监控脚本将重新推送当前法律/草案（首跑）",
    ""
);

$done();
