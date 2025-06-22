# 📱 Freebies App – React Native Frontend

A mobile application that allows users to post and find free food. Built with React Native and TypeScript.

## 🧰 Tech Stack

- **React Native** - Mobile app framework
- **TypeScript** - Type safety
- **React Navigation** - Routing and screen transitions
- **Axios** - API calls
- **Zustand** - Global state management
- **react-hook-form** + **zod** - Form management and validation
- **React Native Paper** - UI component library
- **Expo Secure Store** - Secure token storage
- **ESLint + Prettier** - Code linting and formatting

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Studio (for Android development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/freebies-frontend.git
cd freebies-frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Update the `.env` file with your backend API URL:
```
API_URL=http://localhost:8000
```

5. Start the development server:
```bash
npm start
# or
yarn start
```

6. Run on your preferred platform:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan the QR code with Expo Go app on your physical device

## 📁 Project Structure

```
freebies-frontend/
├── assets/                     # Images, fonts, icons
├── components/                 # Reusable UI components
├── constants/                  # App-wide constants
├── hooks/                      # Custom React hooks
├── navigation/                 # React Navigation setup
├── screens/                    # App screens
├── services/                   # API interaction layer
├── state/                      # Zustand state stores
├── types/                      # TypeScript types
└── utils/                      # Helper functions
```

## 🔐 Authentication Flow

- User logs in via `/auth/login` and receives a JWT access token
- JWT is stored securely using `expo-secure-store`
- Axios interceptors add the token to the `Authorization` header
- Global auth state is managed via Zustand

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 