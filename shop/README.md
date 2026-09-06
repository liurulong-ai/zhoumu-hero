# 🛍️ 简集 · JIANJI — 购物网站 Demo

简约现代风格的完整购物网站:Express 5 后端 + 原生前端,数据本地 JSON 持久化,无需数据库。

## 运行

```bash
npm install   # 首次运行先装依赖
npm start     # 或 npm run dev(文件变更自动重启)
```

打开 http://localhost:3000

## 功能

- **商品浏览**:16 件种子商品,分类筛选 / 关键词搜索 / 排序(销量、好评、价格)
- **商品详情**:大图、评分销量、库存提示、数量选择、同品类「猜你喜欢」
- **购物车**:右侧抽屉,加减数量、移除,localStorage 持久化
- **下单结算**:收货人 / 手机号 / 地址校验,库存冲突提示
- **订单管理**:我的订单页,订单落盘本地,重启不丢失

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/products?q=&category=&sort=` | 商品列表(搜索 / 筛选 / 排序) |
| GET | `/api/products/:id` | 商品详情 |
| GET | `/api/products/:id/related` | 同品类推荐 |
| POST | `/api/orders` | 下单(校验并扣库存、累计销量) |
| GET | `/api/orders` | 订单列表 |
| GET | `/api/health` | 健康检查 |

## 目录结构

```
shop/
├── server.js          # Express 后端(种子数据 + REST API + 静态托管)
├── data/db.json       # 运行时数据(首次启动自动生成,已 gitignore)
└── public/            # 前端
    ├── index.html
    ├── css/style.css  # 简约现代风格
    └── js/app.js      # 商品 / 购物车 / 结算 / 订单逻辑
```

## 备注

- 重置演示数据:停服后删除 `data/db.json` 再启动
- 切换端口:`PORT=8080 npm start`
- 商品图片用 emoji + 渐变占位,零图片资源;后端商品对象预留了 `image` 扩展位,替换为真实图片 URL 即可
