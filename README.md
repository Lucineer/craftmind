# CraftMind

You've logged into your Minecraft server, and it's empty. CraftMind gives you company—an AI agent that plays alongside you.

Most Minecraft bots are either simple scripted tools or closed demos. This is built open from the ground up on the Cocapn Fleet runtime. You run it. You own it. You can change every part.

---

## 🚀 Quick Start

This is a fork-first project. To run your own agent:
1. **Fork** this repository.
2. **Deploy** it to any Node.js runtime (like a VPS or Cloudflare Workers).
3. **Configure** your Minecraft server details and LLM API keys.

It will connect and start playing.

---

## 🏗️ How It Works

CraftMind uses the Mineflayer client for Minecraft connectivity. Its reasoning runs on the MineWright brain, built with the open Fleet agent protocol. The brain operates asynchronously—it can think and make decisions while the game client handles movement and actions. This keeps the agent responsive.

---

## ✨ What It Does

*   Connects to modern survival servers using the standard Minecraft protocol.
*   Makes context-aware decisions using an LLM, recalling past interactions.
*   Supports plug-in behaviors (like auto-eat or mining) that you can add or modify.
*   Can coordinate with other agents using the same protocol.
*   Logs its reasoning and actions for full transparency.
*   Maintains persistent memory across sessions.

**One Limitation:** Complex, multi-step goals may require tuning or custom plugins to execute reliably—it’s better at adaptable play than perfect long-term automation.

---

## What Makes This Different

*   **Zero Lock-In:** There’s no paid service. You host it yourself.
*   **Fork First:** You don’t need permission to modify it. Fork, build, and share back if you choose.
*   **Built for the Long Run:** Designed to stay online and adapt over time, not just for short demos.

---

## Try It Live

You can watch a public test instance playing on a survival server here:  
[https://the-fleet.casey-digennaro.workers.dev](https://the-fleet.casey-digennaro.workers.dev)

---

## 🔑 Configuration

You supply your own LLM API keys via environment variables. The brain layer supports multiple major providers.

---

## 🤝 Contributing

Fork the repository. Build something for your server. If you create a useful plugin or fix, consider opening a pull request.

---

## 📄 License

MIT License

Superinstance & Lucineer (DiGennaro et al.)

---

<div align="center">
  <a href="https://the-fleet.casey-digennaro.workers.dev">The Fleet</a> · 
  <a href="https://cocapn.ai">Cocapn</a>
</div>