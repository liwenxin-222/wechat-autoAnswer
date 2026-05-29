/**
 * 微信视频/语音电话自动接听模块
 *
 * 接听流程：
 *   1. 检测到来电（通知监听 + 轮询）
 *   2. 判断横幅/全屏，横幅则先点击展开
 *   3. 点击接听按钮
 *      - 如果设置了手动坐标 → 直接用（加随机偏移 ±5px）
 *      - 如果没设置 → 自动检测（控件查找 → 比例计算）
 */

// ======================== 持久化存储 ========================

var storage = storages.create("wechat_auto_answer");

// ======================== 配置 ========================

var answerDelayMin = 2000;
var answerDelayMax = 5000;
var checkInterval = 1000;
var wechatPackage = "com.tencent.mm";
var allowedContacts: string[] = [];
var autoHangupTimeout = 0;

// 手动坐标（0 表示未设置，走自动检测）
var bannerX = 0;
var bannerY = 0;
var floatX = 0;
var floatY = 0;
var answerX = 0;
var answerY = 0;

/** 坐标点击随机偏移范围（像素），模拟人工不精确点击 */
var jitter = 5;

// ======================== 状态 ========================

var isRunning = true;
var hasAnswered = false;
var onStatusChange: ((status: string) => void) | null = null;
var onLog: ((msg: string) => void) | null = null;

// ======================== 日志 ========================

function log(msg: string) {
    console.log(msg);
    if (onLog) { onLog(msg); }
}

function setStatus(status: string) {
    log("状态: " + status);
    if (onStatusChange) { onStatusChange(status); }
}

// ======================== 工具函数 ========================

/** 给坐标加随机偏移，模拟手指不精确点击 */
function addJitter(x: number, y: number): { x: number; y: number } {
    var jx = x + random(-jitter, jitter);
    var jy = y + random(-jitter, jitter);
    // 防止越界
    if (jx < 0) jx = 0;
    if (jy < 0) jy = 0;
    if (jx > device.width) jx = device.width;
    if (jy > device.height) jy = device.height;
    return { x: jx, y: jy };
}

// ======================== 对外接口 ========================

export function setOnStatusChange(cb: (status: string) => void) { onStatusChange = cb; }
export function setOnLog(cb: (msg: string) => void) { onLog = cb; }

export function start() {
    if (isRunning) return;
    isRunning = true;
    hasAnswered = false;
    setStatus("运行中");
}

export function stop() {
    isRunning = false;
    setStatus("已暂停");
}

export function getRunning(): boolean { return isRunning; }

export function updateConfig(opts: {
    answerDelayMin?: number;
    answerDelayMax?: number;
    allowedContacts?: string[];
    autoHangupTimeout?: number;
    bannerX?: number;
    bannerY?: number;
    floatX?: number;
    floatY?: number;
    answerX?: number;
    answerY?: number;
    jitter?: number;
}) {
    if (opts.answerDelayMin !== undefined) { answerDelayMin = opts.answerDelayMin; storage.put("answerDelayMin", answerDelayMin); }
    if (opts.answerDelayMax !== undefined) { answerDelayMax = opts.answerDelayMax; storage.put("answerDelayMax", answerDelayMax); }
    if (opts.autoHangupTimeout !== undefined) { autoHangupTimeout = opts.autoHangupTimeout; storage.put("autoHangupTimeout", autoHangupTimeout); }
    if (opts.bannerX !== undefined) { bannerX = opts.bannerX; storage.put("bannerX", bannerX); }
    if (opts.bannerY !== undefined) { bannerY = opts.bannerY; storage.put("bannerY", bannerY); }
    if (opts.floatX !== undefined) { floatX = opts.floatX; storage.put("floatX", floatX); }
    if (opts.floatY !== undefined) { floatY = opts.floatY; storage.put("floatY", floatY); }
    if (opts.answerX !== undefined) { answerX = opts.answerX; storage.put("answerX", answerX); }
    if (opts.answerY !== undefined) { answerY = opts.answerY; storage.put("answerY", answerY); }
    if (opts.jitter !== undefined) { jitter = opts.jitter; storage.put("jitter", jitter); }
    log("配置已更新并保存");
}

export function getConfig() {
    return {
        answerDelayMin: answerDelayMin,
        answerDelayMax: answerDelayMax,
        allowedContacts: allowedContacts,
        autoHangupTimeout: autoHangupTimeout,
        bannerX: bannerX,
        bannerY: bannerY,
        floatX: floatX,
        floatY: floatY,
        answerX: answerX,
        answerY: answerY,
        jitter: jitter,
    };
}

// ======================== 通知监听 ========================

function isVideoCallNotification(text: string): boolean {
    var keywords = [
        "视频通话", "语音通话", "邀请你视频通话", "邀请你语音通话",
        "视频聊天", "语音聊天",
        "Invited you to a video call", "Invited you to a voice call"
    ];
    for (var i = 0; i < keywords.length; i++) {
        if (text.indexOf(keywords[i]) !== -1) return true;
    }
    return false;
}

function extractContactName(text: string): string {
    var match = text.match(/(.+?)(邀请你|正在|发起)(视频|语音)/);
    if (match && match[1]) return match[1].trim();
    return "";
}

function setupNotificationListener() {
    events.observeNotification();
    events.on("notification", function (notification: any) {
        if (!isRunning) return;
        var pkg = notification.getPackageName();
        if (pkg !== wechatPackage) return;
        var ticker = notification.tickerText;
        if (ticker) {
            var text = ticker.toString();
            log("微信通知: " + text);
            if (isVideoCallNotification(text)) {
                log("检测到来电!");
                handleIncomingCall(text);
            }
        }
    });
    log("通知监听已启动");
}

// ======================== 来电处理 ========================

function handleIncomingCall(notificationText: string) {
    if (hasAnswered) return;

    if (allowedContacts.length > 0) {
        var contactName = extractContactName(notificationText);
        if (contactName && allowedContacts.indexOf(contactName) === -1) {
            log("联系人 " + contactName + " 不在白名单，跳过");
            return;
        }
    }

    hasAnswered = true;
    var delay = random(answerDelayMin, answerDelayMax);
    log("将在 " + (delay / 1000).toFixed(1) + " 秒后接听...");
    sleep(delay);

    if (!isRunning) {
        log("已暂停，取消接听");
        hasAnswered = false;
        return;
    }
    answerCall();
}

// ======================== 自动检测按钮位置 ========================

function dumpAllControls() {
    log("=== dump 控件 ===");
    log("屏幕: " + device.width + "x" + device.height);
    var allNodes = selector().clickable(true).find();
    log("可点击控件: " + allNodes.length);
    for (var i = 0; i < allNodes.length; i++) {
        var node = allNodes[i];
        var bounds = node.bounds();
        log("[" + i + "] text=\"" + node.text() + "\" center=(" +
            bounds.centerX() + "," + bounds.centerY() + ") rect=[" +
            bounds.left + "," + bounds.top + "," + bounds.right + "," + bounds.bottom + "]");
    }
    log("=== dump 结束 ===");
}

/**
 * 自动查找接听按钮坐标（兜底方案）
 */
function autoFindAnswerButton(): { x: number; y: number } {
    dumpAllControls();

    // 文字匹配
    var answerTexts = ["接听", "接受"];
    for (var i = 0; i < answerTexts.length; i++) {
        var btn = text(answerTexts[i]).findOne(1000);
        if (btn) {
            var b = btn.bounds();
            log("自动检测-文字匹配: (" + b.centerX() + ", " + b.centerY() + ")");
            return { x: b.centerX(), y: b.centerY() };
        }
        var descBtn = desc(answerTexts[i]).findOne(500);
        if (descBtn) {
            var db = descBtn.bounds();
            log("自动检测-desc匹配: (" + db.centerX() + ", " + db.centerY() + ")");
            return { x: db.centerX(), y: db.centerY() };
        }
    }

    // 可点击控件查找（右下区域）
    var clickables = selector().clickable(true).find();
    for (var j = 0; j < clickables.length; j++) {
        var node = clickables[j];
        var bounds = node.bounds();
        if (bounds.centerY() > device.height * 0.7 && bounds.centerX() > device.width * 0.55) {
            log("自动检测-右下控件: (" + bounds.centerX() + ", " + bounds.centerY() + ")");
            return { x: bounds.centerX(), y: bounds.centerY() };
        }
    }

    // 比例计算
    var x = Math.floor(device.width * 0.75);
    var y = Math.floor(device.height * 0.88);
    log("自动检测-计算坐标: (" + x + ", " + y + ")");
    return { x: x, y: y };
}

/**
 * 自动查找挂断按钮坐标
 */
function autoFindHangupButton(): { x: number; y: number } {
    var hangupTexts = ["挂断", "结束通话"];
    for (var i = 0; i < hangupTexts.length; i++) {
        var btn = text(hangupTexts[i]).findOne(1000);
        if (btn) { var b = btn.bounds(); return { x: b.centerX(), y: b.centerY() }; }
        var descBtn = desc(hangupTexts[i]).findOne(500);
        if (descBtn) { var db = descBtn.bounds(); return { x: db.centerX(), y: db.centerY() }; }
    }
    var clickables = selector().clickable(true).find();
    for (var j = 0; j < clickables.length; j++) {
        var node = clickables[j];
        var bounds = node.bounds();
        if (bounds.centerY() > device.height * 0.7 && bounds.centerX() < device.width * 0.45) {
            return { x: bounds.centerX(), y: bounds.centerY() };
        }
    }
    return { x: Math.floor(device.width * 0.25), y: Math.floor(device.height * 0.88) };
}

// ======================== 接听操作 ========================

/**
 * 将来电界面展开为全屏
 * 处理三种状态：全屏来电、顶部横幅、右上角小窗
 */
function expandCallUI() {
    // 已经是全屏来电，不需要展开
    if (isFullScreenCallUI()) {
        log("已检测到全屏来电界面");
        return;
    }

    // 尝试1：点击顶部横幅（来电时的顶部通知条）
    log("非全屏来电，尝试点击横幅...");
    if (bannerX !== 0 && bannerY !== 0) {
        // 手动横幅坐标
        var bp = addJitter(bannerX, bannerY);
        log("点击手动横幅坐标: (" + bp.x + ", " + bp.y + ")");
        click(bp.x, bp.y);
    } else {
        // 自动计算横幅位置：屏幕顶部居中
        var bx = Math.floor(device.width / 2);
        var by = Math.floor(device.height * 0.06);
        var bj = addJitter(bx, by);
        log("点击自动横幅: (" + bj.x + ", " + bj.y + ")");
        click(bj.x, bj.y);
    }
    sleep(1500);

    // 点击后检查是否展开了
    if (isFullScreenCallUI()) {
        log("横幅展开成功");
        return;
    }

    // 尝试2：点击右上角小窗（操作手机后横幅会变成右上角小窗）
    log("横幅未展开，尝试点击右上角小窗...");
    if (floatX !== 0 && floatY !== 0) {
        // 手动小窗坐标
        var fp = addJitter(floatX, floatY);
        log("点击手动小窗坐标: (" + fp.x + ", " + fp.y + ")");
        click(fp.x, fp.y);
    } else {
        // 自动计算：右上角
        var wx = Math.floor(device.width * 0.92);
        var wy = Math.floor(device.height * 0.07);
        var wj = addJitter(wx, wy);
        log("点击自动小窗: (" + wj.x + ", " + wj.y + ")");
        click(wj.x, wj.y);
    }
    sleep(1500);

    if (isFullScreenCallUI()) {
        log("小窗展开成功");
    } else {
        log("展开后仍未检测到全屏来电，继续尝试接听");
    }
}

function isFullScreenCallUI(): boolean {
    var keywords = ["视频通话", "语音通话", "邀请你"];
    for (var i = 0; i < keywords.length; i++) {
        var nodes = selector().textContains(keywords[i]).find();
        for (var j = 0; j < nodes.length; j++) {
            var bounds = nodes[j].bounds();
            if (bounds.centerY() > device.height * 0.15 && bounds.centerY() < device.height * 0.7) {
                return true;
            }
        }
    }
    return false;
}

function answerCall() {
    log("开始接听...");
    setStatus("接听中...");

    if (currentPackage() !== wechatPackage) {
        sleep(500);
    }

    // 步骤1：将来电界面展开为全屏
    // 微信来电有三种状态：
    //   1. 全屏来电 → 直接接听
    //   2. 顶部横幅 → 点横幅展开
    //   3. 右上角小窗（操作手机后横幅变成的）→ 点小窗展开
    expandCallUI();

    // 步骤2：点击接听按钮

    // 步骤2：点击接听按钮
    var ax: number;
    var ay: number;

    if (answerX !== 0 && answerY !== 0) {
        // 有手动坐标，直接用（加随机偏移）
        var ap = addJitter(answerX, answerY);
        ax = ap.x;
        ay = ap.y;
        log("手动坐标接听: (" + ax + ", " + ay + ")");
    } else {
        // 没设坐标，走自动检测
        var pos = autoFindAnswerButton();
        var pj = addJitter(pos.x, pos.y);
        ax = pj.x;
        ay = pj.y;
        log("自动检测接听: (" + ax + ", " + ay + ")");
    }

    click(ax, ay);
    sleep(1000);

    log("已点击接听按钮");
    onCallAnswered();
}

// ======================== 通话状态管理 ========================

function onCallAnswered() {
    log("===== 接听成功 =====");
    setStatus("通话中");

    if (autoHangupTimeout > 0) {
        log("将在 " + autoHangupTimeout + " 秒后自动挂断");
        setTimeout(function () { hangupCall(); }, autoHangupTimeout * 1000);
    }
    monitorCallEnd();
}

function monitorCallEnd() {
    var checkEnd = setInterval(function () {
        if (currentPackage() !== wechatPackage) {
            log("通话已结束");
            resetState();
            clearInterval(checkEnd);
            return;
        }
        if (!isInCallScreen()) {
            log("通话界面消失，通话结束");
            resetState();
            clearInterval(checkEnd);
        }
    }, 3000);
}

function isInCallScreen(): boolean {
    return selector().textContains("静音").exists() ||
           selector().textContains("免提").exists() ||
           selector().textContains("摄像头").exists() ||
           text("挂断").exists() ||
           desc("挂断").exists();
}

function hangupCall() {
    log("自动挂断...");
    var pos = autoFindHangupButton();
    var jp = addJitter(pos.x, pos.y);
    log("点击挂断: (" + jp.x + ", " + jp.y + ")");
    click(jp.x, jp.y);
    sleep(500);
    resetState();
}

function resetState() {
    hasAnswered = false;
    setStatus("运行中");
    log("等待下一个来电...");
}

// ======================== 轮询检测 ========================

function startPollingCheck() {
    setInterval(function () {
        if (!isRunning || hasAnswered) return;
        if (currentPackage() !== wechatPackage) return;
        if (isIncomingCallScreen()) {
            log("轮询检测到来电!");
            handleIncomingCall("视频通话");
        }
    }, checkInterval);
}

function isIncomingCallScreen(): boolean {
    var keywords = ["视频通话", "语音通话", "邀请你", "Invited you"];
    for (var i = 0; i < keywords.length; i++) {
        if (selector().textContains(keywords[i]).exists()) return true;
    }
    return false;
}

// ======================== 初始化 ========================

export function init() {
    log("===== 微信自动接听初始化 =====");
    log("屏幕: " + device.width + "x" + device.height);

    // 从持久化存储恢复配置
    answerDelayMin = storage.get("answerDelayMin", 2000);
    answerDelayMax = storage.get("answerDelayMax", 5000);
    autoHangupTimeout = storage.get("autoHangupTimeout", 0);
    bannerX = storage.get("bannerX", 0);
    bannerY = storage.get("bannerY", 0);
    floatX = storage.get("floatX", 0);
    floatY = storage.get("floatY", 0);
    answerX = storage.get("answerX", 0);
    answerY = storage.get("answerY", 0);
    jitter = storage.get("jitter", 5);

    log("延迟: " + (answerDelayMin / 1000) + "-" + (answerDelayMax / 1000) + " 秒");
    log("横幅坐标: " + (bannerX ? "(" + bannerX + "," + bannerY + ")" : "未设置，自动检测"));
    log("小窗坐标: " + (floatX ? "(" + floatX + "," + floatY + ")" : "未设置，自动检测"));
    log("接听坐标: " + (answerX ? "(" + answerX + "," + answerY + ")" : "未设置，自动检测"));
    log("随机偏移: ±" + jitter + "px");

    setupNotificationListener();
    startPollingCheck();
    setStatus("运行中");
}
