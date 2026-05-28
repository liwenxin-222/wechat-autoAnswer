ui.layout(
  <frame>
    <webview id="webview" />
  </frame>
);

const webView = ui.webview;
const jsBridge = webView.jsBridge;

declare var __DevIp__: string;
if (typeof __DevIp__ === "string") {
  webView.loadUrl(`http://${__DevIp__}:5173/`);
} else {
  webView.loadLocalFile(files.path("./website"));
}

jsBridge.registerHandler("test", (data: string) => {
  toastLog("你点击了:" + data);
});

jsBridge.registerHandler("exit", (data: string) => {
  exit();
});
