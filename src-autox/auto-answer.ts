/**
 * 微信视频/语音电话自动接听模块
 *
 * 运行环境：AutoX.js 子线程（由 main.tsx 中 threads.start 启动）
 * 所有耗时操作（通知监听、轮询、接听操作）都在子线程中运行，
 * 不会阻塞 UI 线程。
 *
 * 核心流程：
 *   1. 通知监听：监听微信通知栏消息检测来电
 *   2. 轮询检测：定时检查当前界面是否为来电界面（备用方案）
 *   3. 接听操作：在来电界面查找并点击接听按钮
 */

// ======================== 配置 ========================

/** 接听延迟范围（毫秒），随机取值模拟人工反应 */
var answerDelayMin = 2000;
var answerDelayMax = 5000;

/** 检测间隔（毫秒） */
var checkInterval = 1000;

/** 微信包名 */
var wechatPackage = "com.tencent.mm";

/** 联系人白名单（为空则接听所有人） */
var allowedContacts: string[] = [];

/** 自动挂断超时（秒），0 表示不自动挂断 */
var autoHangupTimeout = 0;

// ======================== 状态 ========================

var isRunning = true;
var hasAnswered = false;
var onStatusChange: ((status: string) => void) | null = null;
var onLog: ((msg: string) => void) | null = null;

// ======================== 日志 ========================

function log(msg: string) {
    console.log(msg);
    if (onLog) {
        onLog(msg);
    }
}

function setStatus(status: string) {
    log("状态变更: " + status);
    if (onStatusChange) {
        onStatusChange(status);
    }
}

// ======================== 对外接口 ========================

export function setOnStatusChange(cb: (status: string) => void) {
    onStatusChange = cb;
}

export function setOnLog(cb: (msg: string) => void) {
    onLog = cb;
}

export function start() {
    if (isRunning) return;
    isRunning = true;
    hasAnswered = false;
    setStatus("运行中");
    log("自动接听已启动");
}

export function stop() {
    isRunning = false;
    setStatus("已暂停");
    log("自动接听已暂停");
}

export function getRunning(): boolean {
    return isRunning;
}

export function updateConfig(opts: {
    answerDelayMin?: number;
    answerDelayMax?: number;
    allowedContacts?: string[];
    autoHangupTimeout?: number;
}) {
    if (opts.answerDelayMin !== undefined) answerDelayMin = opts.answerDelayMin;
    if (opts.answerDelayMax !== undefined) answerDelayMax = opts.answerDelayMax;
    if (opts.allowedContacts !== undefined) allowedContacts = opts.allowedContacts;
    if (opts.autoHangupTimeout !== undefined) autoHangupTimeout = opts.autoHangupTimeout;
    log("配置已更新");
}

export function getConfig() {
    return {
        answerDelayMin: answerDelayMin,
        answerDelayMax: answerDelayMax,
        allowedContacts: allowedContacts,
        autoHangupTimeout: autoHangupTimeout,
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
        if (text.indexOf(keywords[i]) !== -1) {
            return true;
        }
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
            log("收到微信通知: " + text);

            if (isVideoCallNotification(text)) {
                log("检测到微信通话来电!");
                handleIncomingCall(text);
            }
        }
    });
    log("通知监听已启动");
}

// ======================== 来电处理 ========================

function handleIncomingCall(notificationText: string) {
    if (hasAnswered) {
        log("已经在处理一个来电，跳过");
        return;
    }

    // 检查联系人白名单
    if (allowedContacts.length > 0) {
        var contactName = extractContactName(notificationText);
        if (contactName && allowedContacts.indexOf(contactName) === -1) {
            log("联系人 " + contactName + " 不在白名单中，跳过");
            return;
        }
    }

    hasAnswered = true;

    // 随机延迟，模拟人工反应
    var delay = random(answerDelayMin, answerDelayMax);
    log("将在 " + (delay / 1000).toFixed(1) + " 秒后自动接听...");

    sleep(delay);

    if (!isRunning) {
        log("脚本已暂停，取消接听");
        hasAnswered = false;
        return;
    }
    answerCall();
}

// ======================== 接听操作 ========================

function answerCall() {
    log("正在尝试自动接听...");
    setStatus("接听中...");

    // 方式1：直接在微信来电界面查找并点击接听按钮
    if (tryClickAnswer()) {
        log("接听成功!");
        onCallAnswered();
        return;
    }

    log("接听失败，未找到接听按钮");
    hasAnswered = false;
    setStatus("运行中");
}

/**
 * 在当前界面查找接听按钮并点击
 * 微信视频来电界面的特征：
 *   - 全屏来电界面
 *   - 有"视频通话"/"语音通话"等文字
 *   - 有接听按钮（可能是"接听"/"接受"文字或绿色圆形按钮）
 */
function tryClickAnswer(): boolean {
    // 步骤1：查找文字为"接听"或"接受"的控件
    var answerTexts = ["接听", "接受"];
    for (var i = 0; i < answerTexts.length; i++) {
        var btn = text(answerTexts[i]).findOne(3000);
        if (btn) {
            log("找到接听按钮（text: " + answerTexts[i] + "），点击");
            btn.click();
            sleep(1000);
            return true;
        }
    }

    // 步骤2：查找 desc 为"接听"或"接受"的控件
    for (var j = 0; j < answerTexts.length; j++) {
        var descBtn = desc(answerTexts[j]).findOne(2000);
        if (descBtn) {
            log("找到接听按钮（desc: " + answerTexts[j] + "），点击");
            descBtn.click();
            sleep(1000);
            return true;
        }
    }

    // 步骤3：查找包含"接听"/"接受"文字的控件
    var partialTexts = ["接听", "接受"];
    for (var k = 0; k < partialTexts.length; k++) {
        var partialBtn = selector().textContains(partialTexts[k]).findOne(2000);
        if (partialBtn) {
            log("找到包含\"" + partialTexts[k] + "\"的控件，点击");
            partialBtn.click();
            sleep(1000);
            return true;
        }
    }

    // 步骤4：如果检测到来电界面，尝试查找可点击的按钮（适配不同微信版本）
    if (isIncomingCallScreen()) {
        log("检测到来电界面，尝试查找可点击的接听按钮");

        // 查找屏幕下半部分、右侧的可点击控件（接听按钮通常在右下）
        var clickables = className("android.widget.ImageView").clickable(true).find();
        for (var m = 0; m < clickables.length; m++) {
            var node = clickables[m];
            var bounds = node.bounds();
            if (bounds.centerY() > device.height * 0.5 && bounds.centerX() > device.width * 0.5) {
                log("点击右侧可点击控件: (" + bounds.centerX() + ", " + bounds.centerY() + ")");
                node.click();
                sleep(1000);
                return true;
            }
        }

        // 尝试通过 View 查找
        var viewClickables = className("android.view.View").clickable(true).find();
        for (var n = 0; n < viewClickables.length; n++) {
            var vNode = viewClickables[n];
            var vBounds = vNode.bounds();
            if (vBounds.centerY() > device.height * 0.6 && vBounds.centerX() > device.width * 0.5) {
                log("点击右侧 View 控件: (" + vBounds.centerX() + ", " + vBounds.centerY() + ")");
                vNode.click();
                sleep(1000);
                return true;
            }
        }

        // 最后手段：直接点击接听按钮的预估坐标位置
        log("尝试点击预估接听按钮位置");
        var answerX = Math.floor(device.width * 0.75);
        var answerY = Math.floor(device.height * 0.85);
        click(answerX, answerY);
        sleep(1000);
        return true;
    }

    return false;
}

// ======================== 通话状态管理 ========================

function onCallAnswered() {
    log("===== 已成功接听微信通话 =====");
    setStatus("通话中");

    if (autoHangupTimeout > 0) {
        log("将在 " + autoHangupTimeout + " 秒后自动挂断");
        setTimeout(function () {
            hangupCall();
        }, autoHangupTimeout * 1000);
    }

    monitorCallEnd();
}

function monitorCallEnd() {
    var checkEnd = setInterval(function () {
        if (currentPackage() !== wechatPackage) {
            log("检测到通话已结束");
            resetState();
            clearInterval(checkEnd);
            return;
        }
        if (!isInCallScreen()) {
            log("检测到通话界面已消失，通话结束");
            resetState();
            clearInterval(checkEnd);
        }
    }, 3000);
}

function isInCallScreen(): boolean {
    return selector().textContains("静音").exists() ||
           selector().textContains("免提").exists() ||
           text("挂断").exists() ||
           desc("挂断").exists();
}

function hangupCall() {
    log("正在自动挂断...");

    var hangupTexts = ["挂断", "结束通话"];
    for (var i = 0; i < hangupTexts.length; i++) {
        var btn = text(hangupTexts[i]).findOne(2000);
        if (btn) {
            btn.click();
            log("已挂断通话");
            resetState();
            return;
        }
        var descBtn = desc(hangupTexts[i]).findOne(500);
        if (descBtn) {
            descBtn.click();
            log("已挂断通话");
            resetState();
            return;
        }
    }

    // 备用：点击挂断按钮预估位置（通常在底部中间或左下）
    click(device.width * 0.25, device.height * 0.85);
    log("已尝试点击挂断区域");
    resetState();
}

function resetState() {
    hasAnswered = false;
    setStatus("运行中");
    log("状态已重置，等待下一个来电...");
}

// ======================== 轮询检测（备用方案） ========================

function startPollingCheck() {
    setInterval(function () {
        if (!isRunning || hasAnswered) return;
        if (currentPackage() !== wechatPackage) return;

        if (isIncomingCallScreen()) {
            log("轮询检测到微信来电!");
            handleIncomingCall("视频通话");
        }
    }, checkInterval);
}

function isIncomingCallScreen(): boolean {
    var keywords = ["视频通话", "语音通话", "邀请你", "Invited you"];
    for (var i = 0; i < keywords.length; i++) {
        if (selector().textContains(keywords[i]).exists()) {
            return true;
        }
    }
    return false;
}

// ======================== 初始化 ========================

export function init() {
    log("===== 微信自动接听模块初始化 =====");
    log("接听延迟: " + (answerDelayMin / 1000) + "-" + (answerDelayMax / 1000) + " 秒");
    log("联系人白名单: " + (allowedContacts.length > 0 ? allowedContacts.join(", ") : "全部接听"));

    // 启动通知监听
    setupNotificationListener();

    // 同时启动轮询检测作为备用
    startPollingCheck();

    setStatus("运行中");
}
