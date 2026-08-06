# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## API URL: Local vs Deploy (Vercel)

Frontend tự phân biệt môi trường qua `import.meta.env.PROD` (xem `src/utils/api.js`):

| Môi trường | File cấu hình | API dùng |
| --- | --- | --- |
| `npm run dev` (local) | `.env.local` (gitignored) | `VITE_API_URL_LOCAL` → `https://localhost:7169/api` |
| Vercel build (`npm run build`) | `.env.production` (committed) | `VITE_API_URL_DEPLOY` → API đã deploy |

- Khi push lên git, Vercel tự chạy `npm run build` (mode production) → chỉ gọi API deploy.
- Muốn đổi API deploy: sửa `VITE_API_URL_DEPLOY` trong `.env.production` rồi push.
- `vercel.json` chứa SPA rewrite để react-router hoạt động khi refresh/deep-link trên Vercel.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
