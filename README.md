# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Sơ đồ cấu trúc thư mục
Zalo_2026/
├── app/                  # (Expo Router) Nơi quản lý các màn hình và điều hướng
│   ├── (auth)/           # Nhóm màn hình đăng nhập, đăng ký
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/           # Nhóm màn hình chính có Bottom Tab (Tin nhắn, Danh bạ, Nhật ký...)
│   │   ├── _layout.tsx   # Cấu hình thanh tab dưới cùng
│   │   ├── index.tsx     # Tab Tin nhắn
│   │   ├── contacts.tsx  # Tab Danh bạ
│   │   └── profile.tsx   # Tab Cá nhân
│   ├── chat/             # Nhóm màn hình chi tiết
│   │   └── [id].tsx      # Màn hình chat riêng biệt (Dynamic Route)
│   ├── _layout.tsx       # Root Layout (Root Provider, Stack Navigation)
│   └── modal.tsx         # Các màn hình dạng popup (tạo nhóm, quét QR)
├── src/                  # Nơi chứa toàn bộ logic và component dùng chung
│   ├── api/              # Các cấu hình API, Firebase, hoặc Supabase
│   ├── components/       # Các UI component nhỏ (Atomic Design)
│   │   ├── common/       # Button, Input, Avatar dùng chung
│   │   └── chat/         # MessageBubble, ChatInput, ChatList
│   ├── hooks/            # Các custom hooks (useAuth, useChat, useSocket)
│   ├── store/            # Quản lý trạng thái (Zustand hoặc Redux Toolkit)
│   ├── constants/        # Màu sắc (Zalo Blue), Fonts, Kích thước
│   ├── utils/            # Hàm bổ trợ (định dạng ngày tháng, xử lý chuỗi)
│   └── types/            # Định nghĩa các kiểu TypeScript
├── assets/               # Hình ảnh, icons, fonts
├── app.json              # Cấu hình Expo
└── package.json