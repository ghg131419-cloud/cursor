# 雅思航图 · IELTS Study

本地优先的雅思 Academic 学习站：听力 / 阅读 / 写作 / 口语 / 词汇，自动保存进度，支持 JSON 导入导出。

## 打开网站

- 本机：`npm run dev` → 只有你自己能打开
- 分享：用仓库根目录 `README.md` 里的公开链接（`localhost` 不能发给别人）

## 开发

```bash
cd ielts-study
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

## 进度

- 存储键：`ielts-study-progress-v1`（浏览器 localStorage）
- 在「进度」页导出 / 导入 JSON；导入会覆盖当前进度

产品决策见 `PRODUCT.md`。
