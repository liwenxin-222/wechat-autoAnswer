/**
 * AutoX.js 主入口 - 微信视频自动接听
 *
 * 注意：UI 模式下，所有耗时操作（无障碍等待、通知监听、自动点击等）
 * 必须在子线程中执行，否则会阻塞 UI 线程导致卡死。
 */

// 先导入模块
import * as autoAnswer from "./auto-answer";

// 设置 UI 布局（必须在最前面）
ui.layout(
  <frame>
    <webview id="webview" />
  </frame>
);

// 获取 webview 和 jsBridge 引用
const webView = ui.webview;
const jsBridge = webView.jsBridge;

// ======================== 加载页面 ========================

declare var __DevIp__: string;
if (typeof __DevIp__ === "string") {
  // 开发模式：加载本地开发服务器
  webView.loadUrl(`http://${__DevIp__}:5173/`);
} else {
  // 生产模式：加载本地打包的网页文件
  webView.loadLocalFile(files.path("./website"));
}

// ======================== 注册 JsBridge 处理器 ========================

// 启动自动接听
jsBridge.registerHandler("start", function (data: string) {
  autoAnswer.start();
});

// 暂停自动接听
jsBridge.registerHandler("stop", function (data: string) {
  autoAnswer.stop();
});

// 获取当前状态
jsBridge.registerHandler("getStatus", function (data: string, callback?: (data: string) => void) {
  if (callback) {
    callback(JSON.stringify({
      running: autoAnswer.getRunning(),
      config: autoAnswer.getConfig()
    }));
  }
});

// 更新配置
jsBridge.registerHandler("updateConfig", function (data: string) {
  try {
    const opts = JSON.parse(data);
    autoAnswer.updateConfig(opts);
  } catch (e) {
    console.error("解析配置失败: " + e);
  }
});

// 退出应用
jsBridge.registerHandler("exit", function (data: string) {
  exit();
});

// ======================== 在子线程中启动自动接听 ========================
// 关键：auto.waitFor() 和通知监听必须放在子线程，
// 否则会阻塞 UI 线程导致界面卡死。

threads.start(function () {
  // 等待无障碍服务就绪（在子线程中等待，不阻塞 UI）
  auto.waitFor();
  // 保持屏幕常亮
  device.keepScreenOn(60 * 60 * 1000);

  // 设置回调，通过 jsBridge 通知 webui
  autoAnswer.setOnStatusChange(function (status: string) {
    jsBridge.callHandler("onStatusChange", status);
  });
  autoAnswer.setOnLog(function (msg: string) {
    jsBridge.callHandler("onLog", msg);
  });

  // 初始化并启动监听（通知监听、轮询检测都在子线程中运行）
  autoAnswer.init();
});
