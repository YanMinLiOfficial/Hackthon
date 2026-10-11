# Hackthon

无碍共创：无障碍社区 Web MVP，React + TypeScript + Vite。

## 本地启动

需要 Node.js 20.19+ 或 22.12+。已有 lockfile 时执行：

```sh
npm ci
npm run dev
```

## DeepSeek 问答

在 `.env.local` 中配置服务端变量后重启 Vite：

```dotenv
DEEPSEEK_API_KEY=在本机填写密钥
DEEPSEEK_MODEL=deepseek-flash
```

不要使用 `VITE_DEEPSEEK_API_KEY`。密钥仅由本地 Vite/preview 代理读取，不发送给浏览器，也不提交到 Git。

打开 `/ask-ai`，支持自然语言问题与三个预设问题。问答使用当前地点、观察帖和标准示例作为上下文，展示可核对的来源、时间和状态。Key 未配置、网络或服务不可用时，自动回退到明确标注的本地演示回答。

实时问答会将问题及本地地点/帖子/标准文本发送到 DeepSeek；不会发送身份账号、积分、照片或完整轨迹。图片识别仍为模拟。静态托管只有前端，没有此代理，问答将回退到演示模式；真实在线部署需要独立后端代理。

## 验证

### 一键求助（本地模拟）

在“我的 → 身份切换”选择演示身份。侧栏随身份变化：残障人士看到“求助”，志愿者及官方人士看到“响应求助”，路径均为 `/help`。切换“小雨（残障人士）”可确认地点和需求并发送；目标志愿者或官方人士可接单、完成，发起人可取消。通知按模拟位置匹配，最多 3 位、1.5 公里直线范围；不是真实推送或救援服务。共享 store 保存进度，刷新保留，不展示精确坐标。运行 `node tests/help-regressions.mjs` 检查权限与状态边界。

### 本地语音输入

语音输入使用浏览器录音、本机 `faster-whisper` 转写；不依赖浏览器在线语音识别服务。点击麦克风录音，再点击结束，最长 20 秒。识别文字可修改，确认后才执行指令或提交问题，避免 tiny 误识别自动触发操作。首次需授权麦克风。音频只发本机代理，在内存处理、不落盘；确认后的普通问题文字提交 DeepSeek，控制指令不提交。

默认复用本机用户目录下 `.bilibili-mcp/asr/venv/bin/python` 和 `.bilibili-mcp/asr/models`。其他机器需安装兼容 Python + faster-whisper 及本地多语言模型，在 `.env.local` 填写 `LOCAL_ASR_PYTHON` 和 `LOCAL_ASR_MODEL` 后重启。Windows Python 路径通常指向虚拟环境的 `Scripts/python.exe`，不要照抄 macOS 路径。

静态托管不提供本机识别；缺少模型时提示错误，文字输入保留。tiny 模型仅以合成中文语音验证，真实人声、噪声与方言效果尚未验收。测试本机模型：`node tests/local-asr-regressions.mjs`。

```sh
npm run build
node tests/ai-regressions.mjs
```

AI 回归测试使用模拟上游，不消耗 DeepSeek API 额度。
