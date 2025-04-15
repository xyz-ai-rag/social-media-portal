# 📄 PM2 Commands Cheat Sheet

Manage your app with PM2 easily!

---

## 🚀 Start an App

```bash
pm2 start npm --name "social-media-portal" -- run start
```

```bash
pm2 start ecosystem.config.js
```

## 🛑 Stop an App

```bash
pm2 stop social-media-portal
```

## 🔄 Restart an App

```bash
pm2 restart social-media-portal
```

## ❌ Delete an App

```bash
pm2 delete social-media-portal
```

## 👀 View App Status

```bash
pm2 status
```
## 📜 View Logs (Real-Time)

```bash
pm2 logs social-media-portal
```

## 🧹 Clean Up Dead Processes

```bash
pm2 flush
pm2 delete all
```