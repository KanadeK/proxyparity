# ProxyParity

> 一份 `NO_PROXY`，五种客户端，不同答案。

[在线分歧报告](https://kanadek.github.io/proxyparity/) ·
[English](README.md) ·
[研究记录](docs/RESEARCH.md) ·
[故障修复](docs/TROUBLESHOOTING.md)

`NO_PROXY` 没有统一标准。同一套环境变量交给 curl、GNU Wget、Python
`urllib`、Go `net/http` 和 Ruby `URI`，可能得到直连、代理、不同代理地址，
甚至 CGI 安全错误。ProxyParity 离线复现这些有上游源码依据的判断，并生成：

- 可直接阅读的终端决策矩阵；
- 适合 CI 和二次处理的稳定 JSON；
- 无脚本、无 CDN、双击即可打开的独立 HTML 事故报告。

它不会发送请求、解析 DNS 或修改系统代理。

## 十秒运行

```console
git clone https://github.com/KanadeK/proxyparity.git
cd proxyparity
npm ci --ignore-scripts
node ./bin/proxyparity.mjs audit ./examples/split-brain.json --output-dir ./build/audit
```

示例会故意产生 6 个分歧，因此默认退出码为 `2`；这表示“有效输入且发现分歧”，
不是程序崩溃。使用 `--fail-on never` 可以在保留报告的同时返回 `0`。

Release 中的 `proxyparity-0.1.0.tgz` 可以直接安装：

```console
npm install --global ./proxyparity-0.1.0.tgz
proxyparity audit ./scenario.json
```

v0.1.0 通过 GitHub Release 分发，没有冒充已经发布到 npm registry。

## 能发现什么

- 大小写代理变量同时存在但值不同；
- 前导点、`*`、CIDR、端口规则在不同客户端中含义不同；
- Go 与 Ruby 自动绕过 loopback，其他客户端仍然走代理；
- Python、Go、Ruby 对 CGI 环境中的 `HTTP_PROXY` 采取不同安全策略；
- 所有客户端都显示 `PROXY`，实际却选中了不同代理服务器。

## 输入示例

```json
{
  "schemaVersion": 1,
  "environment": {
    "http_proxy": "http://lower.proxy.example:8080",
    "HTTP_PROXY": "http://upper.proxy.example:8080",
    "no_proxy": ".svc.cluster.local,10.0.0.0/8",
    "NO_PROXY": "*.corp.example"
  },
  "targets": [
    {
      "url": "https://api.svc.cluster.local/health",
      "resolvedIps": ["10.42.7.18"]
    }
  ]
}
```

工具只接受与代理有关的环境变量键，误贴整份进程环境会立即报错。目标 URL 禁止
携带账号密码；代理 URL 可以用于真实审计，但其 userinfo 在所有输出中都会脱敏。
Ruby 依赖 DNS 的规则使用显式、按顺序提供的 `resolvedIps`，不会偷偷联网。

完整约定见 [docs/SPEC.md](docs/SPEC.md)。

## 验收命令

```console
npm ci --ignore-scripts
npm test
npm run check
```

`npm run check` 不只是静态检查：它会运行测试与覆盖率、构建真实示例报告、生成
`.tgz`、在全新的临时项目中安装该包，再从安装后的 CLI 分别运行“全员一致”和
“多客户端分歧”两套数据。

失败时不要猜，按 [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) 的对应路径
修复。涉及客户端语义的改动必须同时提供官方源码依据和聚焦测试。

## 隐私边界

ProxyParity 不读取当前进程环境、不联网、不改系统设置，报告也不复制输入环境。
安全问题请按 [SECURITY.md](SECURITY.md) 说明私下报告。

许可证：[MIT](LICENSE)。
